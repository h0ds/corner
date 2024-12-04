mod models;
mod ai;

use models::CompletionRequest;
use tauri::State;

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

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            generate_completion,
            verify_api_key,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
