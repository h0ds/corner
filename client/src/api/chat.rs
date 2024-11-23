use crate::models::{ApiResponse, SendMessageRequest};
use crate::api::ApiKeys;
use reqwest;
use tauri::{AppHandle, State};
use std::env;

#[tauri::command]
pub async fn send_message(
    request: SendMessageRequest,
    app_handle: AppHandle,
    state: State<'_, ApiKeys>,
) -> Result<ApiResponse, String> {
    let client = reqwest::Client::new();
    let message = request.message.clone();

    match request.provider.as_str() {
        "anthropic" => {
            let stored_keys = crate::config::load_stored_keys(&app_handle)?;
            let api_key = if let Some(key) = stored_keys["anthropic"].as_str() {
                key.to_string()
            } else {
                let state_key = state.anthropic.lock().unwrap();
                match state_key.clone() {
                    Some(key) if !key.is_empty() => key,
                    _ => env::var("ANTHROPIC_API_KEY").unwrap_or_default(),
                }
            };

            if api_key.is_empty() {
                return Ok(ApiResponse {
                    content: None,
                    error: Some(
                        "Anthropic API key not configured. Please add your API key in settings."
                            .to_string(),
                    ),
                    citations: None,
                    images: None,
                    related_questions: None,
                });
            }

            let request_body = serde_json::json!({
                "model": request.model,
                "messages": [{
                    "role": "user",
                    "content": message
                }],
                "max_tokens": 1024,
                "system": "You are a helpful AI assistant."
            });

            let response = client
                .post("https://api.anthropic.com/v1/messages")
                .header("x-api-key", api_key)
                .header("anthropic-version", "2023-06-01")
                .header("content-type", "application/json")
                .json(&request_body)
                .send()
                .await
                .map_err(|e| e.to_string())?;

            let status = response.status();
            let response_text = response.text().await.map_err(|e| e.to_string())?;

            if status.is_success() {
                let json: serde_json::Value =
                    serde_json::from_str(&response_text).map_err(|e| e.to_string())?;

                Ok(ApiResponse {
                    content: Some(
                        json["content"][0]["text"]
                            .as_str()
                            .unwrap_or_default()
                            .to_string(),
                    ),
                    error: None,
                    citations: None,
                    images: None,
                    related_questions: None,
                })
            } else {
                Ok(ApiResponse {
                    content: None,
                    error: Some(format!("API Error: {}", response_text)),
                    citations: None,
                    images: None,
                    related_questions: None,
                })
            }
        }
        // Add other provider implementations here
        _ => Ok(ApiResponse {
            content: None,
            error: Some("Unsupported provider".to_string()),
            citations: None,
            images: None,
            related_questions: None,
        }),
    }
}
