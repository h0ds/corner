use tauri::{
    plugin::{Builder, TauriPlugin, PluginApi},
    Runtime, Window, State, Manager,
};
use serde::Serialize;
use std::sync::{Arc, Mutex};

use crate::speech::WhisperAppState;

#[tauri::command]
async fn start_recording<R: Runtime>(
    window: Window<R>,
    state: State<'_, WhisperAppState>,
) -> Result<(), String> {
    crate::speech::start_recording(window, state).await
}

#[tauri::command]
async fn stop_recording<R: Runtime>(
    window: Window<R>,
    state: State<'_, WhisperAppState>,
) -> Result<(), String> {
    crate::speech::stop_recording(window, state).await
}

#[tauri::command]
async fn download_whisper_model<R: Runtime>(
    window: Window<R>,
) -> Result<(), String> {
    crate::speech::download_whisper_model(window).await
}

#[tauri::command]
async fn check_whisper_model() -> Result<bool, String> {
    crate::speech::check_whisper_model().await
}

#[tauri::command]
async fn get_whisper_model_size() -> Result<u64, String> {
    crate::speech::get_whisper_model_size().await
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("speech")
        .invoke_handler(tauri::generate_handler![
            start_recording,
            stop_recording,
            download_whisper_model,
            check_whisper_model,
            get_whisper_model_size,
        ])
        .setup(|app, _api: PluginApi<R, ()>| {
            app.manage(WhisperAppState::new().unwrap());
            Ok(())
        })
        .build()
}
