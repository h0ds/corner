use crate::config;
use base64::{engine::general_purpose::STANDARD, Engine};
use tauri::AppHandle;

#[tauri::command]
pub async fn text_to_speech(text: String, app_handle: AppHandle) -> Result<String, String> {
    let stored_keys = config::load_stored_keys(&app_handle)?;
    let api_key = stored_keys["elevenlabs"]
        .as_str()
        .ok_or("ElevenLabs API key not found")?;

    let client = reqwest::Client::new();
    let voice_id = "21m00Tcm4TlvDq8ikWAM"; // Default voice ID

    let request_body = serde_json::json!({
        "text": text,
        "model_id": "eleven_monolingual_v1",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.5
        }
    });

    let response = client
        .post(format!(
            "https://api.elevenlabs.io/v1/text-to-speech/{}/stream",
            voice_id
        ))
        .header("xi-api-key", api_key)
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!(
            "ElevenLabs API error: {}",
            response.text().await.unwrap_or_default()
        ));
    }

    let audio_data = response.bytes().await.map_err(|e| e.to_string())?;
    Ok(STANDARD.encode(audio_data))
}
