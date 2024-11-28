use std::sync::{Arc, Mutex};
use tauri::{State, Window, Emitter, Runtime, Manager};
use whisper_rs::{WhisperContext, SamplingStrategy};
use serde::Serialize;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Sample, SampleFormat};
use std::path::PathBuf;
use reqwest::Client;
use futures_util::StreamExt;
use tokio::io::AsyncWriteExt;
use std::time::{Duration, Instant};
use tokio::time::sleep;
use regex::Regex;
use once_cell::sync::Lazy;
use std::os::unix::fs::PermissionsExt;

// Using ggml-base.en.bin from whisper.cpp models
const MODEL_URL: &str = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin";
const MODEL_FILENAME: &str = "ggml-base.en.bin";
const CHUNK_DURATION: Duration = Duration::from_secs(3); // Process every 3 seconds

static NOISE_PATTERNS: Lazy<Vec<Regex>> = Lazy::new(|| {
    vec![
        // Square bracket patterns
        Regex::new(r"\[.*?\]").unwrap(),
        // Parentheses patterns
        Regex::new(r"\(.*?\)").unwrap(),
        // Common transcription artifacts
        Regex::new(r"♪.*?♪").unwrap(),
        Regex::new(r"\*.*?\*").unwrap(),
        // Extra whitespace
        Regex::new(r"\s+").unwrap(),
    ]
});

#[derive(Serialize, Clone)]
pub struct TranscriptionPayload {
    pub text: String,
    pub is_final: bool,
}

#[derive(Serialize, Clone)]
pub struct ProgressPayload {
    pub progress: f32,
}

fn audio_error_fn(err: cpal::StreamError) {
    eprintln!("Error in audio stream: {}", err);
}

#[derive(Clone)]
pub struct WhisperAppState {
    context: Arc<Mutex<Option<WhisperContext>>>,
    recording: Arc<Mutex<bool>>,
    samples: Arc<Mutex<Vec<f32>>>,
    stream: Arc<Mutex<Option<cpal::Stream>>>,
    last_process_time: Arc<Mutex<Instant>>,
}

// Implement Send and Sync for WhisperAppState
unsafe impl Send for WhisperAppState {}
unsafe impl Sync for WhisperAppState {}

impl WhisperAppState {
    pub fn new() -> Result<Self, String> {
        Ok(Self {
            context: Arc::new(Mutex::new(None)),
            recording: Arc::new(Mutex::new(false)),
            samples: Arc::new(Mutex::new(Vec::new())),
            stream: Arc::new(Mutex::new(None)),
            last_process_time: Arc::new(Mutex::new(Instant::now())),
        })
    }

    async fn process_audio_chunk<R: Runtime>(&self, window: Window<R>, sample_rate: u32) -> Result<(), String> {
        let mut samples = self.samples.lock().map_err(|e| e.to_string())?;
        if samples.is_empty() {
            println!("No samples to process");
            return Ok(());
        }

        println!("Processing {} samples ({:.2} seconds) at {}Hz", 
            samples.len(), 
            samples.len() as f32 / sample_rate as f32,
            sample_rate);

        // Take the samples and leave an empty vec
        let current_samples = std::mem::take(&mut *samples);

        // Convert samples to 16kHz if needed
        let resampled: Vec<f32> = if sample_rate != 16000 {
            println!("Resampling from {}Hz to 16000Hz (input: {} samples)", 
                sample_rate, current_samples.len());
            let resampled = current_samples.iter()
                .step_by(sample_rate as usize / 16000)
                .copied()
                .collect::<Vec<f32>>();
            println!("After resampling: {} samples ({:.2} seconds)", 
                resampled.len(),
                resampled.len() as f32 / 16000.0);
            resampled
        } else {
            current_samples
        };

        // Normalize audio samples
        let max_abs = resampled.iter()
            .map(|&x| x.abs())
            .fold(0.0f32, f32::max);
        
        let normalized = if max_abs > 0.0 {
            println!("Normalizing audio (max amplitude: {:.2})", max_abs);
            resampled.iter()
                .map(|&x| x / max_abs)
                .collect()
        } else {
            println!("Audio is silent (max amplitude: 0.0)");
            resampled
        };

        let mut context = self.context.lock().map_err(|e| e.to_string())?;
        if context.is_none() {
            println!("Loading Whisper model...");
            let model_path = PathBuf::from(dirs::cache_dir().unwrap_or_else(|| PathBuf::from(".")))
                .join("corner")
                .join("models")
                .join(MODEL_FILENAME);

            *context = Some(WhisperContext::new(&model_path.to_string_lossy())
                .map_err(|e| format!("Failed to load Whisper model: {}", e))?);
            println!("Whisper model loaded successfully");
        }

        let context = context.as_ref().unwrap();
        let mut whisper_state = context.create_state().map_err(|e| e.to_string())?;
        
        let mut params = whisper_rs::FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
        params.set_language(Some("en"));
        params.set_print_progress(false);
        params.set_print_timestamps(false);
        params.set_print_special(false);

        println!("Running Whisper inference...");
        whisper_state.full(params, &normalized).map_err(|e| e.to_string())?;

        let num_segments = whisper_state.full_n_segments().map_err(|e| e.to_string())?;
        println!("Got {} segments", num_segments);
        let mut result = String::new();

        for i in 0..num_segments {
            println!("Processing segment {}", i);
            match whisper_state.full_get_segment_text(i) {
                Ok(segment_text) => {
                    println!("Raw segment text: '{}'", segment_text);
                    let text = clean_segment_text(&segment_text);
                    println!("Cleaned segment text: '{}'", text);
                    if !text.is_empty() {
                        result.push_str(&text);
                        result.push(' ');
                    } else {
                        println!("Skipping empty segment");
                    }
                }
                Err(e) => {
                    println!("Error getting segment text: {}", e);
                }
            }
        }

        if !result.is_empty() {
            println!("Emitting transcription: '{}'", result.trim());
            window.emit("transcription", TranscriptionPayload { 
                text: result.trim().to_string(),
                is_final: false,
            }).map_err(|e| format!("Failed to emit transcription: {:?}", e))?;
        } else {
            println!("No transcription to emit (all segments were empty)");
        }

        Ok(())
    }
}

fn clean_segment_text(text: &str) -> String {
    let mut cleaned = text.trim().to_string();
    
    // Apply all noise patterns
    for pattern in NOISE_PATTERNS.iter() {
        cleaned = pattern.replace_all(&cleaned, " ").to_string();
    }
    
    // Clean up any remaining whitespace
    cleaned = cleaned.trim().to_string();
    cleaned = cleaned.replace("  ", " ");
    
    cleaned
}

#[tauri::command]
pub async fn download_whisper_model<R: Runtime>(window: Window<R>) -> Result<(), String> {
    println!("Starting Whisper model download");
    let model_path = PathBuf::from(dirs::cache_dir().unwrap_or_else(|| PathBuf::from(".")))
        .join("corner")
        .join("models")
        .join(MODEL_FILENAME);

    println!("Model will be downloaded to: {:?}", model_path);

    tokio::fs::create_dir_all(model_path.parent().unwrap()).await
        .map_err(|e| format!("Failed to create model directory: {}", e))?;
    
    if model_path.exists() {
        println!("Removing existing model file");
        std::fs::remove_file(&model_path).map_err(|e| format!("Failed to remove existing model: {}", e))?;
    }

    println!("Downloading model from {}", MODEL_URL);
    let client = Client::new();
    let response = client
        .get(MODEL_URL)
        .send()
        .await
        .map_err(|e| format!("Failed to start download: {}", e))?;

    let total_size = response.content_length().unwrap_or(0);
    let mut downloaded = 0;
    let mut file = tokio::fs::File::create(&model_path).await
        .map_err(|e| format!("Failed to create model file: {}", e))?;

    println!("Starting download of {} bytes", total_size);
    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Download error: {}", e))?;
        downloaded += chunk.len() as u64;
        file.write_all(&chunk).await.map_err(|e| format!("Failed to write chunk: {}", e))?;
        
        let progress = (downloaded as f32 / total_size as f32) * 100.0;
        window.emit("whisper-download-progress", ProgressPayload { progress })
            .unwrap_or_else(|e| eprintln!("Failed to emit progress: {:?}", e));
    }

    file.flush().await.map_err(|e| format!("Failed to flush file: {}", e))?;
    println!("Download complete, verifying model...");

    // Verify the model can be loaded
    match WhisperContext::new(&model_path.to_string_lossy()) {
        Ok(_) => {
            println!("Model verified successfully");
            Ok(())
        },
        Err(e) => {
            // If model fails to load, delete it and return error
            let _ = std::fs::remove_file(&model_path);
            Err(format!("Failed to load downloaded model: {}", e))
        }
    }
}

#[tauri::command]
pub async fn start_recording<R: Runtime>(window: Window<R>, state: State<'_, WhisperAppState>) -> Result<(), String> {
    let host = cpal::default_host();
    println!("Using audio host: {}", host.id().name());
    
    let device = host.default_input_device()
        .ok_or_else(|| "No input device found".to_string())?;
    println!("Using input device: {}", device.name().map_err(|e| e.to_string())?);

    let config = device.default_input_config()
        .map_err(|e| e.to_string())?;
    println!("Input config: {:?}", config);

    {
        let mut recording = state.recording.lock().map_err(|e| e.to_string())?;
        *recording = true;
        println!("Recording state set to true");
    }

    let samples = Arc::clone(&state.samples);
    let recording_flag = Arc::clone(&state.recording);
    let last_process_time = Arc::clone(&state.last_process_time);
    let state_clone = state.inner().clone();
    let window_clone = window.clone();
    let sample_rate = config.sample_rate().0;

    // Clone Arcs for audio stream handlers before tokio::spawn
    let samples_stream = Arc::clone(&samples);
    let recording_stream = Arc::clone(&recording_flag);

    // Spawn a background task to process audio chunks
    tokio::spawn(async move {
        while *recording_flag.lock().unwrap() {
            let now = Instant::now();
            let should_process = {
                let mut last_time = last_process_time.lock().unwrap();
                if now.duration_since(*last_time) >= CHUNK_DURATION {
                    *last_time = now;
                    true
                } else {
                    false
                }
            }; // MutexGuard is dropped here

            if should_process {
                if let Err(e) = state_clone.process_audio_chunk(window_clone.clone(), sample_rate).await {
                    eprintln!("Error processing audio chunk: {}", e);
                }
            }
            sleep(Duration::from_millis(100)).await;
        }
    });

    println!("Building input stream with format: {:?}", config.sample_format());
    let stream = match config.sample_format() {
        SampleFormat::F32 => {
            println!("Using F32 format");
            let samples_clone = Arc::clone(&samples_stream);
            let recording_clone = Arc::clone(&recording_stream);
            device.build_input_stream(
                &config.into(),
                move |data: &[f32], _: &_| {
                    if *recording_clone.lock().unwrap() {
                        println!("Received {} F32 samples", data.len());
                        samples_clone.lock().unwrap().extend_from_slice(data);
                    }
                },
                audio_error_fn,
                None
            )
        },
        SampleFormat::I16 => {
            println!("Using I16 format");
            let samples_clone = Arc::clone(&samples_stream);
            let recording_clone = Arc::clone(&recording_stream);
            device.build_input_stream(
                &config.into(),
                move |data: &[i16], _: &_| {
                    if *recording_clone.lock().unwrap() {
                        println!("Received {} I16 samples", data.len());
                        let float_samples: Vec<f32> = data.iter()
                            .map(|&s| s.to_float_sample())
                            .collect();
                        samples_clone.lock().unwrap().extend(float_samples);
                    }
                },
                audio_error_fn,
                None
            )
        },
        SampleFormat::U16 => {
            println!("Using U16 format");
            let samples_clone = Arc::clone(&samples_stream);
            let recording_clone = Arc::clone(&recording_stream);
            device.build_input_stream(
                &config.into(),
                move |data: &[u16], _: &_| {
                    if *recording_clone.lock().unwrap() {
                        println!("Received {} U16 samples", data.len());
                        let float_samples: Vec<f32> = data.iter()
                            .map(|&s| s.to_float_sample())
                            .collect();
                        samples_clone.lock().unwrap().extend(float_samples);
                    }
                },
                audio_error_fn,
                None
            )
        },
        _ => return Err("Unsupported sample format".to_string()),
    }.map_err(|e| e.to_string())?;

    println!("Starting audio stream");
    stream.play().map_err(|e| e.to_string())?;

    // Store the stream in our state
    {
        let mut state_stream = state.stream.lock().map_err(|e| e.to_string())?;
        *state_stream = Some(stream);
        println!("Stream stored in state");
    }

    println!("Recording started successfully");
    Ok(())
}

#[tauri::command]
pub async fn stop_recording<R: Runtime>(window: Window<R>, state: State<'_, WhisperAppState>) -> Result<(), String> {
    println!("Stopping recording...");
    {
        let mut recording = state.recording.lock().map_err(|e| e.to_string())?;
        *recording = false;
        println!("Recording state set to false");
    }

    // Process any remaining audio
    let sample_rate = {
        let host = cpal::default_host();
        let device = host.default_input_device()
            .ok_or_else(|| "No input device found".to_string())?;
        let config = device.default_input_config()
            .map_err(|e| e.to_string())?;
        config.sample_rate().0
    };

    state.process_audio_chunk(window.clone(), sample_rate).await?;

    // Send final transcription
    window.emit("transcription", TranscriptionPayload { 
        text: String::new(),
        is_final: true,
    }).map_err(|e| format!("Failed to emit final transcription: {:?}", e))?;

    // Drop the stream to ensure it's cleaned up
    {
        let mut stream = state.stream.lock().map_err(|e| e.to_string())?;
        *stream = None;
        println!("Stream dropped");
    }

    println!("Recording stopped successfully");
    Ok(())
}

#[tauri::command]
pub async fn check_whisper_model() -> Result<bool, String> {
    let model_path = PathBuf::from(dirs::cache_dir().unwrap_or_else(|| PathBuf::from(".")))
        .join("corner")
        .join("models")
        .join(MODEL_FILENAME);
    
    println!("Checking for model at: {:?}", model_path);
    
    if !model_path.exists() {
        println!("Model file does not exist");
        return Ok(false);
    }

    println!("Model file exists, verifying...");
    // Try to load the model to verify it's valid
    match WhisperContext::new(&model_path.to_string_lossy()) {
        Ok(_) => {
            println!("Model verified successfully");
            Ok(true)
        },
        Err(e) => {
            println!("Failed to verify model: {}", e);
            // If model fails to load, delete it
            let _ = std::fs::remove_file(&model_path);
            Ok(false)
        }
    }
}

#[tauri::command]
pub async fn get_whisper_model_size() -> Result<u64, String> {
    let model_path = PathBuf::from(dirs::cache_dir().unwrap_or_else(|| PathBuf::from(".")))
        .join("corner")
        .join("models")
        .join(MODEL_FILENAME);
    
    println!("Checking model size at path: {:?}", model_path);
    
    if !model_path.exists() {
        println!("Model file does not exist");
        return Ok(0);
    }

    match std::fs::metadata(&model_path) {
        Ok(metadata) => {
            let size = metadata.len();
            println!("Model size: {} bytes ({:.2} MB)", size, size as f64 / (1024.0 * 1024.0));
            Ok(size)
        },
        Err(e) => {
            println!("Error getting model size: {}", e);
            Err(format!("Failed to get model size: {}", e))
        }
    }
}

#[tauri::command]
pub async fn delete_whisper_model() -> Result<(), String> {
    let model_path = PathBuf::from(dirs::cache_dir().unwrap_or_else(|| PathBuf::from(".")))
        .join("corner")
        .join("models")
        .join(MODEL_FILENAME);
    
    println!("Attempting to delete whisper model at: {:?}", model_path);
    
    if model_path.exists() {
        println!("Model file exists, attempting to set permissions...");
        // First try to make the file writable
        std::fs::set_permissions(&model_path, std::fs::Permissions::from_mode(0o644))
            .map_err(|e| format!("Failed to set file permissions: {}", e))?;
            
        println!("Permissions set successfully, attempting to delete...");
        // Then try to delete it
        std::fs::remove_file(&model_path)
            .map_err(|e| format!("Failed to delete model: {}", e))?;
            
        println!("Successfully deleted whisper model");
    } else {
        println!("Whisper model file not found at: {:?}", model_path);
    }
    Ok(())
}
