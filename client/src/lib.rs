mod api;
mod cache;
mod config;
mod keyboard_shortcuts;
mod models;
mod speech;
mod utils;
mod plugins;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(api::ApiState::new())
        .manage(cache::CacheState::new())
        .manage(config::ConfigState::new())
        .manage(speech::WhisperAppState::new().unwrap())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_upload::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(plugins::speech::init())
        .invoke_handler(tauri::generate_handler![
            api::get_completion,
            api::get_chat_completion,
            api::get_embeddings,
            api::get_models,
            cache::get_cache,
            cache::set_cache,
            config::get_config,
            config::set_config,
            keyboard_shortcuts::register_shortcut,
            keyboard_shortcuts::unregister_shortcut,
            speech::start_recording,
            speech::stop_recording,
            speech::download_whisper_model,
            speech::check_whisper_model,
            speech::get_whisper_model_size,
            speech::delete_whisper_model,
            greet
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
