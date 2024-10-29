// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use tauri::State;
use std::sync::Mutex;
use dotenv::dotenv;
use std::env;
use reqwest;
use serde_json;
use std::fs;

#[derive(Serialize, Deserialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Serialize, Deserialize)]
struct ChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
    max_tokens: Option<u32>,
    temperature: Option<f32>,
}

#[derive(Serialize, Deserialize)]
struct ChatResponse {
    id: String,
    content: Vec<ChatResponseContent>,
    model: String,
    role: String,
}

#[derive(Serialize, Deserialize)]
struct ChatResponseContent {
    text: String,
    #[serde(rename = "type")]
    content_type: String,
}

struct ApiKeys {
    anthropic: Mutex<Option<String>>,
    perplexity: Mutex<Option<String>>,
}

#[derive(Serialize)]
struct ApiResponse {
    content: Option<String>,
    error: Option<String>,
}

#[derive(Deserialize)]
struct VerifyRequest {
    key: String,
    provider: String,
}

#[derive(Deserialize)]
struct SendMessageRequest {
    message: String,
    model: String,
    provider: String,
    file_content: Option<String>,  // Base64 encoded file content
    file_name: Option<String>,
}

#[tauri::command]
async fn send_message(
    request: SendMessageRequest,
    state: State<'_, ApiKeys>,
) -> Result<ApiResponse, String> {
    let client = reqwest::Client::new();
    
    // Prepare the message content
    let message_with_file = if let (Some(content), Some(name)) = (request.file_content, request.file_name) {
        format!("{}\n\nAttached file '{}' content:\n{}", 
            request.message,
            name,
            content
        )
    } else {
        request.message
    };

    match request.provider.as_str() {
        "anthropic" => {
            let api_key = {
                let state_key = state.anthropic.lock().unwrap();
                match state_key.clone() {
                    Some(key) if !key.is_empty() => key,
                    _ => env::var("ANTHROPIC_API_KEY").unwrap_or_default()
                }
            };

            if api_key.is_empty() {
                return Ok(ApiResponse {
                    content: None,
                    error: Some("Anthropic API key not configured".to_string()),
                });
            }

            let response = client
                .post("https://api.anthropic.com/v1/messages")
                .header("x-api-key", api_key)
                .header("anthropic-version", "2023-06-01")
                .json(&serde_json::json!({
                    "model": request.model,
                    "messages": [{
                        "role": "user",
                        "content": message_with_file
                    }],
                    "max_tokens": 1024
                }))
                .send()
                .await
                .map_err(|e| e.to_string())?;

            // Parse and return the response
            if response.status().is_success() {
                let json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
                Ok(ApiResponse {
                    content: Some(json["content"][0]["text"].as_str().unwrap_or_default().to_string()),
                    error: None,
                })
            } else {
                Ok(ApiResponse {
                    content: None,
                    error: Some(format!("API error: {}", response.status())),
                })
            }
        },
        "perplexity" => {
            let api_key = {
                let state_key = state.perplexity.lock().unwrap();
                match state_key.clone() {
                    Some(key) if !key.is_empty() => key,
                    _ => env::var("PERPLEXITY_API_KEY").unwrap_or_default()
                }
            };

            if api_key.is_empty() {
                return Ok(ApiResponse {
                    content: None,
                    error: Some("Perplexity API key not configured".to_string()),
                });
            }

            let response = client
                .post("https://api.perplexity.ai/chat/completions")
                .header("Authorization", format!("Bearer {}", api_key))
                .json(&serde_json::json!({
                    "model": request.model,
                    "messages": [{
                        "role": "user",
                        "content": message_with_file
                    }],
                    "max_tokens": 1024
                }))
                .send()
                .await
                .map_err(|e| e.to_string())?;

            // Parse and return the response
            if response.status().is_success() {
                let json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
                Ok(ApiResponse {
                    content: Some(json["choices"][0]["message"]["content"].as_str().unwrap_or_default().to_string()),
                    error: None,
                })
            } else {
                Ok(ApiResponse {
                    content: None,
                    error: Some(format!("API error: {}", response.status())),
                })
            }
        },
        _ => Ok(ApiResponse {
            content: None,
            error: Some("Invalid provider specified".to_string()),
        }),
    }
}

#[tauri::command]
fn get_api_keys(state: State<ApiKeys>) -> Result<serde_json::Value, String> {
    let anthropic = state.anthropic.lock().unwrap();
    let perplexity = state.perplexity.lock().unwrap();
    
    Ok(serde_json::json!({
        "anthropic": anthropic.clone().unwrap_or_default(),
        "perplexity": perplexity.clone().unwrap_or_default(),
    }))
}

#[tauri::command]
fn set_api_keys(
    anthropic: Option<String>,
    perplexity: Option<String>,
    state: State<ApiKeys>
) -> Result<(), String> {
    if let Some(key) = anthropic {
        *state.anthropic.lock().unwrap() = Some(key);
    }
    if let Some(key) = perplexity {
        *state.perplexity.lock().unwrap() = Some(key);
    }
    Ok(())
}

#[tauri::command]
async fn verify_api_key(request: VerifyRequest) -> Result<ApiResponse, String> {
    let client = reqwest::Client::new();
    
    match request.provider.as_str() {
        "anthropic" => {
            let response = client
                .post("https://api.anthropic.com/v1/messages")
                .header("x-api-key", request.key)
                .header("anthropic-version", "2023-06-01")
                .json(&serde_json::json!({
                    "model": "claude-3-sonnet-20240229",
                    "messages": [{
                        "role": "user",
                        "content": "Test connection"
                    }],
                    "max_tokens": 10
                }))
                .send()
                .await
                .map_err(|e| e.to_string())?;

            if !response.status().is_success() {
                return Ok(ApiResponse {
                    content: None,
                    error: Some("Invalid Anthropic API key".to_string()),
                });
            }
        },
        "perplexity" => {
            let response = client
                .post("https://api.perplexity.ai/chat/completions")
                .header("Authorization", format!("Bearer {}", request.key))
                .json(&serde_json::json!({
                    "model": "mixtral-8x7b-instruct",
                    "messages": [{
                        "role": "user",
                        "content": "Test connection"
                    }],
                    "max_tokens": 10
                }))
                .send()
                .await
                .map_err(|e| e.to_string())?;

            if !response.status().is_success() {
                return Ok(ApiResponse {
                    content: None,
                    error: Some("Invalid Perplexity API key".to_string()),
                });
            }
        },
        _ => return Ok(ApiResponse {
            content: None,
            error: Some("Invalid provider specified".to_string()),
        }),
    }

    Ok(ApiResponse {
        content: Some("API key is valid".to_string()),
        error: None,
    })
}

fn main() {
    dotenv().ok();
    
    let anthropic_key = env::var("ANTHROPIC_API_KEY").ok();
    let perplexity_key = env::var("PERPLEXITY_API_KEY").ok();

    tauri::Builder::default()
        .manage(ApiKeys {
            anthropic: Mutex::new(None),
            perplexity: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            send_message,
            get_api_keys,
            set_api_keys,
            verify_api_key
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
