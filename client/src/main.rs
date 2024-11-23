#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod api;
mod cache;
mod config;
mod keyboard_shortcuts;
mod models;
mod utils;

use api::ApiKeys;
use dotenv::dotenv;
use std::sync::Mutex;
use tauri::Manager;

fn main() {
    dotenv().ok();

    tauri::Builder::default()
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
            cache::init_cache_dir()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}