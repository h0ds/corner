// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use tauri::State;
use std::sync::Mutex;
use dotenv::dotenv;
use std::env;
use reqwest;
use serde_json;

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
    content: String,
    role: String,
    // Add other fields from Claude's response if needed
}

struct AnthropicState {
    api_key: Mutex<String>,
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
    let api_key = state.api_key.lock().unwrap().clone();

    if api_key.is_empty() {
        return Ok(ApiResponse {
            content: None,
            error: Some("API key not configured".to_string()),
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
        Ok(chat_response) => Ok(ApiResponse {
            content: Some(chat_response.content),
            error: None,
        }),
        Err(e) => Ok(ApiResponse {
            content: None,
            error: Some(format!("Failed to parse response: {}", e)),
        }),
    }
}

fn main() {
    dotenv().ok(); // Load .env file
    
    let api_key = env::var("ANTHROPIC_API_KEY")
        .expect("ANTHROPIC_API_KEY must be set in environment");

    tauri::Builder::default()
        .manage(AnthropicState {
            api_key: Mutex::new(api_key),
        })
        .invoke_handler(tauri::generate_handler![send_message])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
