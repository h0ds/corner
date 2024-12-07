mod models;
mod ai;
mod profile;
mod plugin;

use models::CompletionRequest;
use tauri::{Manager, State};
use plugin::PreferencesState;

#[tauri::command]
async fn verify_api_key(provider: String, key: String) -> Result<bool, String> {
    ai::verify_api_key(&provider, &key)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn generate_completion(request: CompletionRequest) -> Result<String, String> {
    ai::generate_completion(request)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_api_keys() -> Result<String, String> {
    Ok("".to_string())
}

#[tauri::command]
async fn set_api_keys(_keys: String) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
async fn load_preferences(state: State<'_, PreferencesState>) -> Result<plugin::Preferences, String> {
    println!("Loading preferences");
    state.load()
}

#[tauri::command]
async fn save_preferences(
    state: State<'_, PreferencesState>,
    preferences: plugin::Preferences,
) -> Result<(), String> {
    println!("Saving preferences: {:?}", preferences);
    state.save(&preferences)
}

#[tokio::main]
async fn main() {
    tauri::Builder::default()
        .plugin(tauri::plugins::shell::init())
        .invoke_handler(tauri::generate_handler![
            generate_completion,
            verify_api_key,
            get_api_keys,
            set_api_keys,
            profile::load_profile_settings,
            profile::save_profile_settings,
            profile::select_image,
            load_preferences,
            save_preferences,
        ])
        .setup(|app| {
            println!("Application setup");
            app.manage(PreferencesState::new());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
