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
            api::chat::verify_api_key,
            api::speech::text_to_speech,
            config::get_stored_api_keys,
            config::store_api_key,
            config::set_api_keys,
        ])
        .setup(|app| {
            // Initialize cache directory
            cache::init_cache_dir()?;

            // Get app handle for API key initialization
            let app_handle = app.handle();

            // Load stored API keys
            if let Ok(stored_keys) = config::load_stored_keys(&app_handle) {
                let api_keys = app.state::<ApiKeys>();
                
                // Initialize each provider's key if it exists in storage
                if let Some(key) = stored_keys["anthropic"].as_str() {
                    api_keys.set_key("anthropic", key.to_string());
                }
                if let Some(key) = stored_keys["perplexity"].as_str() {
                    api_keys.set_key("perplexity", key.to_string());
                }
                if let Some(key) = stored_keys["openai"].as_str() {
                    api_keys.set_key("openai", key.to_string());
                }
                if let Some(key) = stored_keys["xai"].as_str() {
                    api_keys.set_key("xai", key.to_string());
                }
                if let Some(key) = stored_keys["google"].as_str() {
                    api_keys.set_key("google", key.to_string());
                }
                if let Some(key) = stored_keys["elevenlabs"].as_str() {
                    api_keys.set_key("elevenlabs", key.to_string());
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
