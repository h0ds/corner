// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use tauri::State;
use std::sync::Mutex;
use dotenv::dotenv;
use std::env;
use reqwest;
use std::path::PathBuf;

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

fn main() {
    // Get the path to the project root (parent of src-tauri)
    let current_dir = env::current_dir().expect("Failed to get current directory");
    let root_dir = current_dir.parent().expect("Failed to get project root");
    
    // Load .env from project root
    dotenv::from_path(root_dir.join(".env"))
        .expect("Failed to load .env file");

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
