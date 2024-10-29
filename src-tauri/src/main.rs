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
use std::path::PathBuf;
use tauri::Manager;
use tauri::AppHandle;

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
    file_content: Option<String>,
    file_name: Option<String>,
}

#[tauri::command]
async fn send_message(
    request: SendMessageRequest,
    app_handle: AppHandle,
    state: State<'_, ApiKeys>,
) -> Result<ApiResponse, String> {
    let client = reqwest::Client::new();
    
    let message_with_file = if let (Some(content), Some(name)) = (request.file_content.clone(), request.file_name.clone()) {
        format!("{}\n\nAttached file '{}' content:\n{}", 
            request.message,
            name,
            content
        )
    } else {
        request.message.clone()
    };

    match request.provider.as_str() {
        "anthropic" => {
            let stored_keys = load_stored_keys(&app_handle)?;
            let api_key = if let Some(key) = stored_keys["anthropic"].as_str() {
                key.to_string()
            } else {
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

            println!("Sending message to Anthropic API...");
            let request_body = serde_json::json!({
                "model": request.model,
                "messages": [{
                    "role": "user",
                    "content": message_with_file
                }],
                "max_tokens": 1024,
                "system": "You are a helpful AI assistant."
            });
            
            println!("Request body: {}", serde_json::to_string_pretty(&request_body).unwrap());

            let response = client
                .post("https://api.anthropic.com/v1/messages")
                .header("x-api-key", api_key)
                .header("anthropic-version", "2023-06-01")
                .header("content-type", "application/json")
                .json(&request_body)
                .send()
                .await
                .map_err(|e| e.to_string())?;

            println!("Anthropic API Response:");
            println!("Status: {}", response.status());
            println!("Headers: {:#?}", response.headers());

            let status = response.status();

            if status.is_success() {
                let response_text = response.text().await.map_err(|e| {
                    println!("Error reading success response body: {:?}", e);
                    e.to_string()
                })?;
                println!("Anthropic API success response body: {}", response_text);

                let json: serde_json::Value = serde_json::from_str(&response_text).map_err(|e| {
                    println!("Error parsing JSON response: {:?}", e);
                    e.to_string()
                })?;

                Ok(ApiResponse {
                    content: Some(json["content"][0]["text"].as_str().unwrap_or_default().to_string()),
                    error: None,
                })
            } else {
                let error_text = response.text().await.map_err(|e| {
                    println!("Error reading error response body: {:?}", e);
                    e.to_string()
                })?;
                println!("Anthropic API error response body: {}", error_text);
                
                Ok(ApiResponse {
                    content: None,
                    error: Some(format!("API error (Status: {}): {}", status, error_text)),
                })
            }
        },
        "perplexity" => {
            let stored_keys = load_stored_keys(&app_handle)?;
            let api_key = if let Some(key) = stored_keys["perplexity"].as_str() {
                key.to_string()
            } else {
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

            println!("Sending message to Perplexity API...");
            let request_body = serde_json::json!({
                "model": request.model,
                "messages": [
                    {
                        "role": "system",
                        "content": "Be precise and concise."
                    },
                    {
                        "role": "user",
                        "content": message_with_file
                    }
                ],
                "max_tokens": 1024,
                "temperature": 0.2,
                "top_p": 0.9,
                "return_citations": true,
                "search_domain_filter": ["perplexity.ai"],
                "return_images": false,
                "return_related_questions": false,
                "search_recency_filter": "month",
                "top_k": 0,
                "stream": false,
                "presence_penalty": 0,
                "frequency_penalty": 1
            });

            println!("Request body: {}", serde_json::to_string_pretty(&request_body).unwrap());

            let response = client
                .post("https://api.perplexity.ai/chat/completions")
                .header("Authorization", format!("Bearer {}", api_key))
                .header("Content-Type", "application/json")
                .json(&request_body)
                .send()
                .await
                .map_err(|e| e.to_string())?;

            if response.status().is_success() {
                let json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
                Ok(ApiResponse {
                    content: Some(json["choices"][0]["message"]["content"].as_str().unwrap_or_default().to_string()),
                    error: None,
                })
            } else {
                let error_text = response.text().await.map_err(|e| e.to_string())?;
                Ok(ApiResponse {
                    content: None,
                    error: Some(format!("Perplexity API error: {}", error_text)),
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
fn get_api_keys(app_handle: AppHandle) -> Result<serde_json::Value, String> {
    // Load from file storage first
    let stored_keys = load_stored_keys(&app_handle)?;
    
    // Return the stored keys
    Ok(stored_keys)
}

#[tauri::command]
fn set_api_keys(
    app_handle: AppHandle,
    anthropic: Option<String>,
    perplexity: Option<String>,
) -> Result<(), String> {
    // Create a JSON object with the new keys
    let mut keys = serde_json::json!({
        "anthropic": null,
        "perplexity": null
    });

    // Use ref to avoid moving the values
    if let Some(ref key) = anthropic {
        keys["anthropic"] = serde_json::Value::String(key.clone());
    }
    if let Some(ref key) = perplexity {
        keys["perplexity"] = serde_json::Value::String(key.clone());
    }

    // Save to file storage
    save_keys(&app_handle, &keys)?;

    // Update in-memory state
    let state = app_handle.state::<ApiKeys>();
    if let Some(key) = anthropic {
        *state.anthropic.lock().unwrap() = Some(key);
    }
    if let Some(key) = perplexity {
        *state.perplexity.lock().unwrap() = Some(key);
    }

    Ok(())
}

#[tauri::command]
async fn verify_api_key(app_handle: AppHandle, request: VerifyRequest) -> Result<ApiResponse, String> {
    let client = reqwest::Client::new();
    
    let result = match request.provider.as_str() {
        "anthropic" => {
            println!("\n=== Anthropic API Key Verification ===");
            println!("Key prefix: {}...", &request.key[..10]);
            
            let request_body = serde_json::json!({
                "model": "claude-3-haiku-20240307",
                "messages": [{
                    "role": "user",
                    "content": "Hi"
                }],
                "max_tokens": 1024
            });
            
            println!("\nRequest Details:");
            println!("URL: https://api.anthropic.com/v1/messages");
            println!("Headers:");
            println!("  x-api-key: {}...", &request.key[..10]);
            println!("  anthropic-version: 2023-06-01");
            println!("  content-type: application/json");
            println!("\nRequest Body:");
            println!("{}", serde_json::to_string_pretty(&request_body).unwrap());

            let response = client
                .post("https://api.anthropic.com/v1/messages")
                .header("x-api-key", &request.key)
                .header("anthropic-version", "2023-06-01")
                .header("content-type", "application/json")
                .json(&request_body)
                .send()
                .await
                .map_err(|e| {
                    println!("\nNetwork Error:");
                    println!("Type: {}", e.to_string());
                    if let Some(status) = e.status() {
                        println!("Status: {}", status);
                    }
                    if let Some(url) = e.url() {
                        println!("URL: {}", url);
                    }
                    e.to_string()
                })?;

            println!("\nResponse Details:");
            println!("Status: {} ({})", response.status(), response.status().as_u16());
            println!("Headers:");
            for (key, value) in response.headers().iter() {
                println!("  {}: {}", key, value.to_str().unwrap_or("Unable to read header value"));
            }

            let status = response.status();
            let status_code = status.as_u16();
            let response_text = response.text().await.map_err(|e| {
                println!("\nError Reading Response Body: {}", e);
                e.to_string()
            })?;

            println!("\nResponse Body:");
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&response_text) {
                println!("{}", serde_json::to_string_pretty(&json).unwrap());
            } else {
                println!("{}", response_text);
            }

            if !status.is_success() {
                let error_message = match status_code {
                    401 => "Invalid API key (Authentication failed)",
                    403 => "API key doesn't have permission to access this resource",
                    404 => "Endpoint not found (Check API version)",
                    429 => "Rate limit exceeded",
                    500..=599 => "Anthropic server error",
                    _ => "Unknown error"
                };

                return Ok(ApiResponse {
                    content: None,
                    error: Some(format!(
                        "Anthropic API Key Verification Failed\n\nStatus: {} ({})\nError: {}\n\nDetails: {}", 
                        status,
                        status_code,
                        error_message,
                        response_text
                    )),
                });
            }

            println!("\n=== End of Verification ===\n");
            
            // Store the key if verification succeeds
            let mut keys = load_stored_keys(&app_handle)?;
            keys[request.provider.as_str()] = serde_json::Value::String(request.key.clone());
            save_keys(&app_handle, &keys)?;

            Ok(ApiResponse {
                content: Some("API key is valid".to_string()),
                error: None,
            })
        },
        "perplexity" => {
            println!("\n=== Perplexity API Key Verification ===");
            println!("Key prefix: {}...", &request.key[..10]);
            
            let request_body = serde_json::json!({
                "model": "llama-3.1-sonar-small-128k-online",
                "messages": [
                    {
                        "role": "system",
                        "content": "Be precise and concise."
                    },
                    {
                        "role": "user",
                        "content": "Hi"
                    }
                ],
                "max_tokens": 1,
                "temperature": 0.2,
                "top_p": 0.9,
                "return_citations": true,
                "search_domain_filter": ["perplexity.ai"],
                "return_images": false,
                "return_related_questions": false,
                "search_recency_filter": "month",
                "top_k": 0,
                "stream": false,
                "presence_penalty": 0,
                "frequency_penalty": 1
            });
            
            println!("\nRequest Details:");
            println!("URL: https://api.perplexity.ai/chat/completions");
            println!("Headers:");
            println!("  Authorization: Bearer {}...", &request.key[..10]);
            println!("  Content-Type: application/json");
            println!("\nRequest Body:");
            println!("{}", serde_json::to_string_pretty(&request_body).unwrap());

            let response = client
                .post("https://api.perplexity.ai/chat/completions")
                .header("Authorization", format!("Bearer {}", request.key))
                .header("Content-Type", "application/json")
                .json(&request_body)
                .send()
                .await
                .map_err(|e| {
                    println!("\nNetwork Error:");
                    println!("Type: {}", e.to_string());
                    if let Some(status) = e.status() {
                        println!("Status: {}", status);
                    }
                    if let Some(url) = e.url() {
                        println!("URL: {}", url);
                    }
                    e.to_string()
                })?;

            println!("\nResponse Details:");
            println!("Status: {} ({})", response.status(), response.status().as_u16());
            println!("Headers:");
            for (key, value) in response.headers().iter() {
                println!("  {}: {}", key, value.to_str().unwrap_or("Unable to read header value"));
            }

            let status = response.status();
            let response_text = response.text().await.map_err(|e| e.to_string())?;

            if !status.is_success() {
                // Try to parse as JSON first
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&response_text) {
                    println!("\nError Response (JSON): {}", serde_json::to_string_pretty(&json).unwrap());
                    return Ok(ApiResponse {
                        content: None,
                        error: Some(format!("Perplexity API Error: {}", json["error"]["message"].as_str().unwrap_or("Unknown error"))),
                    });
                } else {
                    // If not JSON, clean up HTML response
                    let error_message = match status.as_u16() {
                        401 => "Invalid API key (Authentication failed)",
                        403 => "API key doesn't have permission",
                        429 => "Rate limit exceeded",
                        500..=599 => "Server error",
                        _ => "Unknown error"
                    };
                    println!("\nError Response (non-JSON): {}", response_text);
                    return Ok(ApiResponse {
                        content: None,
                        error: Some(format!("Perplexity API Error: {} (Status {})", error_message, status)),
                    });
                }
            }

            println!("\nSuccess Response: {}", response_text);
            println!("\n=== End of Verification ===\n");
            
            // Store the key if verification succeeds
            let mut keys = load_stored_keys(&app_handle)?;
            keys[request.provider.as_str()] = serde_json::Value::String(request.key.clone());
            save_keys(&app_handle, &keys)?;

            Ok(ApiResponse {
                content: Some("API key is valid".to_string()),
                error: None,
            })
        },
        _ => Ok(ApiResponse {
            content: None,
            error: Some("Invalid provider specified".to_string()),
        }),
    };

    result
}

#[tauri::command]
async fn handle_file_drop(path: String) -> Result<String, String> {
    match fs::read_to_string(&path) {
        Ok(content) => Ok(content),
        Err(e) => Err(format!("Failed to read file: {}", e))
    }
}

fn get_config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .app_handle()
        .path()
        .app_config_dir()
        .map_err(|_| "Failed to get config directory".to_string())?;
    
    fs::create_dir_all(&app_dir)
        .map_err(|e| format!("Failed to create config directory: {}", e))?;
    
    Ok(app_dir.join("api_keys.json"))
}

fn load_stored_keys(app: &AppHandle) -> Result<serde_json::Value, String> {
    let config_path = get_config_path(app)?;
    if config_path.exists() {
        let content = fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read config file: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse config file: {}", e))
    } else {
        Ok(serde_json::json!({
            "anthropic": null,
            "perplexity": null
        }))
    }
}

fn save_keys(app: &AppHandle, keys: &serde_json::Value) -> Result<(), String> {
    let config_path = get_config_path(app)?;
    let content = serde_json::to_string_pretty(keys)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
    fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write config file: {}", e))
}

#[tauri::command]
fn get_stored_api_keys(app_handle: AppHandle) -> Result<serde_json::Value, String> {
    load_stored_keys(&app_handle)
}

#[tauri::command]
async fn store_api_key(app_handle: AppHandle, request: serde_json::Value) -> Result<(), String> {
    let provider = request["provider"].as_str()
        .ok_or("Missing provider".to_string())?;
    let key = request["key"].as_str()
        .ok_or("Missing key".to_string())?;

    let mut keys = load_stored_keys(&app_handle)?;
    keys[provider] = serde_json::Value::String(key.to_string());
    save_keys(&app_handle, &keys)?;

    Ok(())
}

fn main() {
    dotenv().ok();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .manage(ApiKeys {
            anthropic: Mutex::new(None),
            perplexity: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            send_message,
            get_api_keys,
            set_api_keys,
            verify_api_key,
            handle_file_drop,
            get_stored_api_keys,
            store_api_key
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
