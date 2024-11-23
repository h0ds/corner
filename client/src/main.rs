#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod api;
mod cache;
mod config;
mod keyboard_shortcuts;
mod models;
mod utils;

use dotenv::dotenv;
use tauri::Manager;
use crate::api::ApiKeys;
use std::sync::Mutex;

fn main() {
    dotenv().ok();

    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .manage(ApiKeys {
            anthropic: Mutex::new(None),
            perplexity: Mutex::new(None),
            openai: Mutex::new(None),
            xai: Mutex::new(None),
            google: Mutex::new(None),
            elevenlabs: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            api::chat::send_message,
            api::speech::text_to_speech,
            config::get_stored_api_keys,
            config::store_api_key,
        ])
        .setup(|app| {
            // Initialize cache directory
            cache::init_cache_dir()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
