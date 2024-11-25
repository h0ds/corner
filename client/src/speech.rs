use std::sync::{Arc, Mutex};
use tauri::{Window, State, Emitter};
use whisper_rs::{WhisperContext, SamplingStrategy};
use serde::Serialize;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Sample, SampleFormat};
use std::fs::File;
use std::path::PathBuf;
use reqwest::Client;
use futures_util::StreamExt;
use tokio::io::AsyncWriteExt;
use hound::WavReader;

// Using ggml-base.en.bin from whisper.cpp models
const MODEL_URL: &str = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin";

#[derive(Clone)]
pub struct WhisperAppState {
    context: Arc<Mutex<Option<WhisperContext>>>,
    recording: Arc<Mutex<bool>>,
    samples: Arc<Mutex<Vec<f32>>>,
}

impl WhisperAppState {
    pub fn new() -> Result<Self, String> {
        Ok(Self {
            context: Arc::new(Mutex::new(None)),
            recording: Arc::new(Mutex::new(false)),
            samples: Arc::new(Mutex::new(Vec::new())),
        })
    }
}

#[derive(Serialize, Clone)]
struct ProgressPayload {
    progress: f32,
}

#[derive(Serialize, Clone)]
struct TranscriptionPayload {
    text: String,
}

#[tauri::command]
pub async fn download_whisper_model(window: Window) -> Result<(), String> {
    let model_path = PathBuf::from(dirs::cache_dir().unwrap_or_else(|| PathBuf::from(".")))
        .join("corner")
        .join("models")
        .join("whisper-base.bin");

    tokio::fs::create_dir_all(model_path.parent().unwrap()).await
        .map_err(|e| e.to_string())?;
    
    if model_path.exists() {
        std::fs::remove_file(&model_path).map_err(|e| e.to_string())?;
    }

    let client = Client::new();
    let response = client
        .get(MODEL_URL)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let total_size = response.content_length().unwrap_or(0);
    let mut downloaded = 0;
    let mut file = tokio::fs::File::create(&model_path).await
        .map_err(|e| e.to_string())?;

    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;
        file.write_all(&chunk).await.map_err(|e| e.to_string())?;
        
        let progress = (downloaded as f32 / total_size as f32) * 100.0;
        window.emit("whisper-download-progress", ProgressPayload { progress })
            .unwrap_or_else(|e| eprintln!("Failed to emit progress: {:?}", e));
    }

    file.flush().await.map_err(|e| e.to_string())?;

    // Verify the model can be loaded
    match WhisperContext::new(&model_path.to_string_lossy()) {
        Ok(_) => Ok(()),
        Err(e) => {
            // If model fails to load, delete it and return error
            let _ = std::fs::remove_file(&model_path);
            Err(format!("Failed to load downloaded model: {}", e))
        }
    }
}

#[tauri::command]
pub async fn check_whisper_model() -> Result<bool, String> {
    let model_path = PathBuf::from(dirs::cache_dir().unwrap_or_else(|| PathBuf::from(".")))
        .join("corner")
        .join("models")
        .join("whisper-base.bin");
    
    if !model_path.exists() {
        return Ok(false);
    }

    // Try to load the model to verify it's valid
    match WhisperContext::new(&model_path.to_string_lossy()) {
        Ok(_) => Ok(true),
        Err(_) => {
            // If model fails to load, delete it
            let _ = std::fs::remove_file(&model_path);
            Ok(false)
        }
    }
}

#[tauri::command]
pub async fn start_recording(window: Window, state: State<'_, WhisperAppState>) -> Result<(), String> {
    let host = cpal::default_host();
    let device = host.default_input_device()
        .ok_or_else(|| "No input device found".to_string())?;

    let config = device.default_input_config()
        .map_err(|e| e.to_string())?;

    {
        let mut recording = state.recording.lock().map_err(|e| e.to_string())?;
        *recording = true;
    }

    let samples = Arc::clone(&state.samples);
    let recording = Arc::clone(&state.recording);

    let err_fn = move |err| {
        eprintln!("Error in audio stream: {}", err);
    };

    let stream = match config.sample_format() {
        SampleFormat::F32 => device.build_input_stream(
            &config.into(),
            move |data: &[f32], _: &_| {
                if *recording.lock().unwrap() {
                    samples.lock().unwrap().extend_from_slice(data);
                }
            },
            err_fn,
            None
        ),
        SampleFormat::I16 => device.build_input_stream(
            &config.into(),
            move |data: &[i16], _: &_| {
                if *recording.lock().unwrap() {
                    let float_samples: Vec<f32> = data.iter()
                        .map(|&s| s.to_float_sample())
                        .collect();
                    samples.lock().unwrap().extend(float_samples);
                }
            },
            err_fn,
            None
        ),
        SampleFormat::U16 => device.build_input_stream(
            &config.into(),
            move |data: &[u16], _: &_| {
                if *recording.lock().unwrap() {
                    let float_samples: Vec<f32> = data.iter()
                        .map(|&s| s.to_float_sample())
                        .collect();
                    samples.lock().unwrap().extend(float_samples);
                }
            },
            err_fn,
            None
        ),
        _ => return Err("Unsupported sample format".to_string()),
    }.map_err(|e| e.to_string())?;

    stream.play().map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn stop_recording(window: Window, state: State<'_, WhisperAppState>) -> Result<(), String> {
    {
        let mut recording = state.recording.lock().map_err(|e| e.to_string())?;
        *recording = false;
    }

    let samples = {
        let mut samples = state.samples.lock().map_err(|e| e.to_string())?;
        std::mem::take(&mut *samples)
    };

    // Convert samples to audio file
    let temp_path = std::env::temp_dir().join("recording.wav");
    let spec = hound::WavSpec {
        channels: 1,
        sample_rate: 16000,
        bits_per_sample: 32,
        sample_format: hound::SampleFormat::Float,
    };

    let mut writer = hound::WavWriter::create(&temp_path, spec)
        .map_err(|e| e.to_string())?;

    for sample in samples {
        writer.write_sample(sample).map_err(|e| e.to_string())?;
    }
    writer.finalize().map_err(|e| e.to_string())?;

    // Load Whisper model if not already loaded
    let model_path = PathBuf::from(dirs::cache_dir().unwrap_or_else(|| PathBuf::from(".")))
        .join("corner")
        .join("models")
        .join("whisper-base.bin");

    let mut context = state.context.lock().map_err(|e| e.to_string())?;
    
    if context.is_none() {
        *context = Some(WhisperContext::new(&model_path.to_string_lossy())
            .map_err(|e| e.to_string())?);
    }

    let context = context.as_ref().unwrap();
    
    // Process audio with Whisper
    let mut state = context.create_state().map_err(|e| e.to_string())?;
    let mut params = whisper_rs::FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
    params.set_language(Some("en"));
    params.set_print_progress(false);
    params.set_print_timestamps(false);
    
    // Read the WAV file back as samples
    let reader = WavReader::open(&temp_path).map_err(|e| e.to_string())?;
    let audio_samples: Vec<f32> = reader.into_samples::<f32>()
        .filter_map(Result::ok)
        .collect();
    
    state.full(params, &audio_samples).map_err(|e| e.to_string())?;

    // Get all segments
    let num_segments = state.full_n_segments().map_err(|e| e.to_string())?;
    let mut result = String::new();
    
    for i in 0..num_segments {
        if let Ok(segment_text) = state.full_get_segment_text(i) {
            result.push_str(&segment_text);
            result.push(' ');
        }
    }
    
    window.emit("transcription", TranscriptionPayload { text: result.trim().to_string() })
        .unwrap_or_else(|e| eprintln!("Failed to emit transcription: {:?}", e));

    Ok(())
}
