import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

export interface TranscriptionResult {
  text: string;
}

export interface ProgressPayload {
  progress: number;
}

export async function checkWhisperModel(): Promise<boolean> {
  return invoke<boolean>('check_whisper_model');
}

export async function downloadWhisperModel(): Promise<void> {
  return invoke<void>('download_whisper_model');
}

export async function startRecording(): Promise<void> {
  return invoke<void>('start_recording');
}

export async function stopRecording(): Promise<void> {
  return invoke<void>('stop_recording');
}

export async function onTranscriptionProgress(
  callback: (result: TranscriptionResult) => void
): Promise<UnlistenFn> {
  console.log('Setting up transcription listener');
  return listen<TranscriptionResult>('transcription', (event) => {
    console.log('Received transcription event:', event);
    callback(event.payload);
  });
}

export async function onDownloadProgress(
  callback: (progress: ProgressPayload) => void
): Promise<UnlistenFn> {
  return listen<ProgressPayload>('whisper-download-progress', (event) => {
    callback(event.payload);
  });
}
