// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use tauri::State;
use std::sync::Mutex;
use dotenv::dotenv;
use std::env;
use reqwest;

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

struct AnthropicState {
    api_key: Mutex<Option<String>>,
}

#[derive(Serialize)]
struct ApiResponse {
    content: Option<String>,
    error: Option<String>,
}

#[tauri::command]
async fn send_message(
    message: String,
    state: State<'_, AnthropicState>,
) -> Result<ApiResponse, String> {
    let client = reqwest::Client::new();
    
    // Try UI-set key first, fall back to env var
    let api_key = {
        let state_key = state.api_key.lock().unwrap();
        match state_key.clone() {
            Some(key) if !key.is_empty() => key,
            _ => env::var("ANTHROPIC_API_KEY")
                .unwrap_or_default()
        }
    };

    if api_key.is_empty() {
        return Ok(ApiResponse {
            content: None,
            error: Some("API key not configured. Please set it in preferences.".to_string()),
        });
    }

    let chat_request = ChatRequest {
        model: "claude-3-sonnet-20240229".to_string(),
        messages: vec![ChatMessage {
            role: "user".to_string(),
            content: message,
        }],
        max_tokens: Some(1024),
        temperature: Some(0.7),
    };

    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key.as_str())
        .header("anthropic-version", "2023-06-01")
        .json(&chat_request)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Ok(ApiResponse {
            content: None,
            error: Some(format!("API error: {}", response.status())),
        });
    }

    match response.json::<ChatResponse>().await {
        Ok(chat_response) => {
            // Extract the text content from the first content item
            let content = chat_response.content
                .first()
                .and_then(|content| {
                    if content.content_type == "text" {
                        Some(content.text.clone())
                    } else {
                        None
                    }
                })
                .unwrap_or_default();
            
            Ok(ApiResponse {
                content: Some(content),
                error: None,
            })
        },
        Err(e) => Ok(ApiResponse {
            content: None,
            error: Some(format!("Failed to parse response: {}", e)),
        }),
    }
}

#[tauri::command]
fn get_api_key(state: State<AnthropicState>) -> Result<String, String> {
    let api_key = state.api_key.lock().unwrap();
    Ok(api_key.clone().unwrap_or_default())
}

#[tauri::command]
fn set_api_key(api_key: String, state: State<AnthropicState>) -> Result<(), String> {
    let mut current_key = state.api_key.lock().unwrap();
    *current_key = Some(api_key);
    Ok(())
}

fn main() {
    dotenv().ok(); // Still load .env but don't require it
    
    tauri::Builder::default()
        .manage(AnthropicState {
            api_key: Mutex::new(None), // Start with no key set
        })
        .invoke_handler(tauri::generate_handler![
            send_message,
            get_api_key,
            set_api_key
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
