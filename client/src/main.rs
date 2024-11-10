// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use dotenv::dotenv;
use percent_encoding;
use reqwest;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use serde::{Deserialize, Serialize};
use serde_json;
use std::env;
use std::fs;
use std::path::Path;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::AppHandle;
use tauri::Manager;
use tauri::State;

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

#[derive(Serialize, Deserialize)]
struct PerplexityResponse {
    choices: Vec<PerplexityChoice>,
}

#[derive(Serialize, Deserialize)]
struct PerplexityChoice {
    message: PerplexityMessage,
}

#[derive(Serialize, Deserialize)]
struct PerplexityMessage {
    content: String,
    #[serde(default)]
    citations: Vec<PerplexityCitation>,
}

#[derive(Serialize, Deserialize)]
struct PerplexityCitation {
    text: String,
    url: String,
}

struct ApiKeys {
    anthropic: Mutex<Option<String>>,
    perplexity: Mutex<Option<String>>,
    openai: Mutex<Option<String>>,
    xai: Mutex<Option<String>>,
    google: Mutex<Option<String>>,
}

#[derive(Serialize)]
struct ApiResponse {
    content: Option<String>,
    error: Option<String>,
    citations: Option<Vec<Citation>>,
    images: Option<Vec<String>>,
    related_questions: Option<Vec<String>>,
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

#[derive(Serialize, Deserialize)]
struct Citation {
    url: String,
    title: Option<String>,
}

#[tauri::command]
async fn send_message(
    request: SendMessageRequest,
    app_handle: AppHandle,
    state: State<'_, ApiKeys>,
) -> Result<ApiResponse, String> {
    let client = reqwest::Client::new();

    let message_with_file = if let (Some(content), Some(name)) =
        (request.file_content.clone(), request.file_name.clone())
    {
        format!(
            "{}\n\nAttached file '{}' content:\n{}",
            request.message, name, content
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
                    _ => env::var("ANTHROPIC_API_KEY").unwrap_or_default(),
                }
            };

            if api_key.is_empty() {
                return Ok(ApiResponse {
                    content: None,
                    error: Some("Anthropic API key not configured. Please add your API key in settings.".to_string()),
                    citations: None,
                    images: None,
                    related_questions: None,
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

            println!(
                "Request body: {}",
                serde_json::to_string_pretty(&request_body).unwrap()
            );

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
            let response_text = response.text().await.map_err(|e| {
                println!("Error reading response body: {:?}", e);
                e.to_string()
            })?;
            println!("Response body: {}", response_text);

            if status.is_success() {
                let json: serde_json::Value =
                    serde_json::from_str(&response_text).map_err(|e| {
                        println!("Error parsing JSON response: {:?}", e);
                        e.to_string()
                    })?;

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
                if status.as_u16() == 401 {
                    return Ok(ApiResponse {
                        content: None,
                        error: Some("Anthropic API key is missing or invalid. Please check your API key in settings.".to_string()),
                        citations: None,
                        images: None,
                        related_questions: None,
                    });
                }
                Ok(ApiResponse {
                    content: None,
                    error: Some(format!("API error (Status: {}): {}", status, response_text)),
                    citations: None,
                    images: None,
                    related_questions: None,
                })
            }
        }
        "perplexity" => {
            let stored_keys = load_stored_keys(&app_handle)?;
            let api_key = if let Some(key) = stored_keys["perplexity"].as_str() {
                key.to_string()
            } else {
                let state_key = state.perplexity.lock().unwrap();
                match state_key.clone() {
                    Some(key) if !key.is_empty() => key,
                    _ => env::var("PERPLEXITY_API_KEY").unwrap_or_default(),
                }
            };

            if api_key.is_empty() {
                return Ok(ApiResponse {
                    content: None,
                    error: Some("Perplexity API key not configured. Please add your API key in settings.".to_string()),
                    citations: None,
                    images: None,
                    related_questions: None,
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
                "return_images": true,
                "return_related_questions": true,
                "search_recency_filter": "month",
                "top_k": 0,
                "stream": false,
                "presence_penalty": 0,
                "frequency_penalty": 1
            });

            println!(
                "Request body: {}",
                serde_json::to_string_pretty(&request_body).unwrap()
            );
            let response = client
                .post("https://api.perplexity.ai/chat/completions")
                .header("Authorization", format!("Bearer {}", api_key))
                .header("Content-Type", "application/json")
                .json(&request_body)
                .send()
                .await
                .map_err(|e| e.to_string())?;

            let status = response.status();
            println!("\n=== Perplexity API Response ===");
            println!("Status: {}", status);
            println!("Headers: {:#?}", response.headers());

            let response_text = response.text().await.map_err(|e| {
                println!("Failed to read response body: {:?}", e);
                e.to_string()
            })?;
    
            println!("Response body: {}", response_text);
    
            if status.is_success() {
                let perplexity_response: PerplexityResponse = serde_json::from_str(&response_text)
                    .map_err(|e| e.to_string())?;

                let message = &perplexity_response.choices[0].message;
                let mut content = message.content.clone();

                // Add citations if present
                if !message.citations.is_empty() {
                    content.push_str("\n\nSources:\n");
                    for (i, citation) in message.citations.iter().enumerate() {
                        content.push_str(&format!("{}. {} ({})\n", i + 1, citation.text, citation.url));
                    }
                }

                Ok(ApiResponse {
                    content: Some(content),
                    error: None,
                    citations: None,
                    images: None,
                    related_questions: None,
                })
            } else {
                if status.as_u16() == 401 {
                    return Ok(ApiResponse {
                        content: None,
                        error: Some("Perplexity API key is missing or invalid. Please check your API key in settings.".to_string()),
                        citations: None,
                        images: None,
                        related_questions: None,
                    });
                }
                Ok(ApiResponse {
                    content: None,
                    error: Some(format!("Perplexity API error: {}", response_text)),
                    citations: None,
                    images: None,
                    related_questions: None,
                })
            }
        }
        "openai" => {
            let stored_keys = load_stored_keys(&app_handle)?;
            let api_key = if let Some(key) = stored_keys["openai"].as_str() {
                key.to_string()
            } else {
                let state_key = state.openai.lock().unwrap();
                match state_key.clone() {
                    Some(key) if !key.is_empty() => key,
                    _ => env::var("OPENAI_API_KEY").unwrap_or_default(),
                }
            };

            if api_key.is_empty() {
                return Ok(ApiResponse {
                    content: None,
                    error: Some("OpenAI API key not configured. Please add your API key in settings.".to_string()),
                    citations: None,
                    images: None,
                    related_questions: None,
                });
            }

            println!("Sending message to OpenAI API...");
            let request_body = serde_json::json!({
                "model": request.model,
                "messages": [{
                    "role": "user",
                    "content": message_with_file
                }],
                "temperature": 0.7
            });

            let mut headers = HeaderMap::new();
            headers.insert(
                AUTHORIZATION,
                HeaderValue::from_str(&format!("Bearer {}", api_key)).map_err(|e| e.to_string())?,
            );

            let response = client
                .post("https://api.openai.com/v1/chat/completions")
                .headers(headers)
                .json(&request_body)
                .send()
                .await
                .map_err(|e| e.to_string())?;

            let status = response.status();
            println!("\n=== OpenAI API Response ===");
            println!("Status: {}", status);
            println!("Headers: {:#?}", response.headers());

            let response_text = response.text().await.map_err(|e| {
                println!("Failed to read response body: {:?}", e);
                e.to_string()
            })?;

            println!("Response body: {}", response_text);

            if status.is_success() {
                let json: serde_json::Value = serde_json::from_str(&response_text)
                    .map_err(|e| e.to_string())?;
                Ok(ApiResponse {
                    content: Some(
                        json["choices"][0]["message"]["content"]
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
                if status.as_u16() == 401 {
                    return Ok(ApiResponse {
                        content: None,
                        error: Some("OpenAI API key is missing or invalid. Please check your API key in settings.".to_string()),
                        citations: None,
                        images: None,
                        related_questions: None,
                    });
                }
                Ok(ApiResponse {
                    content: None,
                    error: Some(format!("OpenAI API error: {}", response_text)),
                    citations: None,
                    images: None,
                    related_questions: None,
                })
            }
        }
        "xai" => {
            let stored_keys = load_stored_keys(&app_handle)?;
            let api_key = if let Some(key) = stored_keys["xai"].as_str() {
                key.to_string()
            } else {
                let state_key = state.xai.lock().unwrap();
                match state_key.clone() {
                    Some(key) if !key.is_empty() => key,
                    _ => env::var("XAI_API_KEY").unwrap_or_default(),
                }
            };

            if api_key.is_empty() {
                return Ok(ApiResponse {
                    content: None,
                    error: Some("xAI API key not configured. Please add your API key in settings.".to_string()),
                    citations: None,
                    images: None,
                    related_questions: None,
                });
            }

            let request_body = serde_json::json!({
                "messages": [{
                    "role": "user",
                    "content": message_with_file
                }],
                "model": request.model,
                "stream": false,
                "temperature": 0.7
            });

            let response = client
                .post("https://api.x.ai/v1/chat/completions")
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {}", api_key))
                .json(&request_body)
                .send()
                .await
                .map_err(|e| e.to_string())?;

            let status = response.status();
            println!("\n=== xAI API Response ===");
            println!("Status: {}", status);
            println!("Headers: {:#?}", response.headers());

            let response_text = response.text().await.map_err(|e| {
                println!("Failed to read response body: {:?}", e);
                e.to_string()
            })?;

            println!("Response body: {}", response_text);

            if status.is_success() {
                let json: serde_json::Value = serde_json::from_str(&response_text)
                    .map_err(|e| e.to_string())?;
                Ok(ApiResponse {
                    content: Some(
                        json["choices"][0]["message"]["content"]
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
                if status.as_u16() == 401 {
                    return Ok(ApiResponse {
                        content: None,
                        error: Some("xAI API key is missing or invalid. Please check your API key in settings.".to_string()),
                        citations: None,
                        images: None,
                        related_questions: None,
                    });
                }
                Ok(ApiResponse {
                    content: None,
                    error: Some(format!("xAI API error: {}", response_text)),
                    citations: None,
                    images: None,
                    related_questions: None,
                })
            }
        }
        "google" => {
            let stored_keys = load_stored_keys(&app_handle)?;
            let api_key = if let Some(key) = stored_keys["google"].as_str() {
                println!("Using stored Google API key");
                key.to_string()
            } else {
                println!("No stored key, checking state");
                let state_key = state.google.lock().unwrap();
                match state_key.clone() {
                    Some(key) if !key.is_empty() => {
                        println!("Using state Google API key");
                        key
                    },
                    _ => {
                        println!("Falling back to env Google API key");
                        env::var("GOOGLE_API_KEY").unwrap_or_default()
                    }
                }
            };

            if api_key.is_empty() {
                println!("No Google API key found");
                return Ok(ApiResponse {
                    content: None,
                    error: Some("Google API key not configured. Please add your API key in settings.".to_string()),
                    citations: None,
                    images: None,
                    related_questions: None,
                });
            }

            println!("Google API key found, length: {}", api_key.len());

            let request_body = serde_json::json!({
                "contents": [{
                    "parts": [{
                        "text": message_with_file
                    }]
                }]
            });

            let url = format!(
                "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}",
                model = request.model,
                key = api_key
            );

            println!("\n=== Google API Request ===");
            println!("URL: {}", url.replace(&api_key, "[REDACTED]"));
            println!("Request body: {}", serde_json::to_string_pretty(&request_body).unwrap());

            let response = client
                .post(&url)
                .header("Content-Type", "application/json")
                .json(&request_body)
                .send()
                .await
                .map_err(|e| {
                    println!("\n=== Google API Error ===");
                    println!("Request error: {:?}", e);
                    e.to_string()
                })?;

            let status = response.status();
            println!("\n=== Google API Response ===");
            println!("Status: {}", status);
            println!("Headers: {:#?}", response.headers());

            let response_text = response.text().await.map_err(|e| {
                println!("Failed to read response body: {:?}", e);
                e.to_string()
            })?;

            println!("Response body: {}", response_text);

            if status.is_success() {
                let json: serde_json::Value = serde_json::from_str(&response_text)
                    .map_err(|e| {
                        println!("Google API JSON parse error: {:?}", e);
                        e.to_string()
                    })?;

                // Check for error in the response
                if let Some(error) = json.get("error") {
                    println!("Google API error in response: {:?}", error);
                    let error_message = error["message"].as_str()
                        .unwrap_or("Unknown error occurred");
                    return Ok(ApiResponse {
                        content: None,
                        error: Some(error_message.to_string()),
                        citations: None,
                        images: None,
                        related_questions: None,
                    });
                }

                // Extract content from the response
                let content = json["candidates"][0]["content"]["parts"][0]["text"]
                    .as_str()
                    .ok_or_else(|| {
                        println!("Failed to extract text from Google API response");
                        "Failed to extract text from response".to_string()
                    })?;

                println!("Successfully extracted content from Google API response");

                Ok(ApiResponse {
                    content: Some(content.to_string()),
                    error: None,
                    citations: None,
                    images: None,
                    related_questions: None,
                })
            } else {
                if status.as_u16() == 401 || status.as_u16() == 403 {
                    println!("Google API authentication error: {}", status);
                    Ok(ApiResponse {
                        content: None,
                        error: Some("Google API key is invalid. Please check your API key in settings.".to_string()),
                        citations: None,
                        images: None,
                        related_questions: None,
                    })
                } else {
                    println!("Google API error response: {} - {}", status, response_text);
                    // Try to parse error message from response
                    if let Ok(error_json) = serde_json::from_str::<serde_json::Value>(&response_text) {
                        if let Some(error_msg) = error_json["error"]["message"].as_str() {
                            return Ok(ApiResponse {
                                content: None,
                                error: Some(format!("Google API error: {}", error_msg)),
                                citations: None,
                                images: None,
                                related_questions: None,
                            });
                        }
                    }
                    
                    Ok(ApiResponse {
                        content: None,
                        error: Some(format!("API error (Status: {}): {}", status, response_text)),
                        citations: None,
                        images: None,
                        related_questions: None,
                    })
                }
            }
        }
        _ => Ok(ApiResponse {
            content: None,
            error: Some("Invalid provider specified".to_string()),
            citations: None,
            images: None,
            related_questions: None,
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
    openai: Option<String>,
    xai: Option<String>,
    google: Option<String>,
) -> Result<(), String> {
    // Create a JSON object with the new keys
    let mut keys = serde_json::json!({
        "anthropic": null,
        "perplexity": null,
        "openai": null,
        "xai": null,
        "google": null
    });

    // Use ref to avoid moving the values
    if let Some(ref key) = anthropic {
        keys["anthropic"] = serde_json::Value::String(key.clone());
    }
    if let Some(ref key) = perplexity {
        keys["perplexity"] = serde_json::Value::String(key.clone());
    }
    if let Some(ref key) = openai {
        keys["openai"] = serde_json::Value::String(key.clone());
    }
    if let Some(ref key) = xai {
        keys["xai"] = serde_json::Value::String(key.clone());
    }
    if let Some(ref key) = google {
        keys["google"] = serde_json::Value::String(key.clone());
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
    if let Some(key) = openai {
        *state.openai.lock().unwrap() = Some(key);
    }
    if let Some(key) = xai {
        *state.xai.lock().unwrap() = Some(key);
    }
    if let Some(key) = google {
        *state.google.lock().unwrap() = Some(key);
    }

    Ok(())
}

#[tauri::command]
async fn verify_api_key(request: VerifyRequest) -> Result<ApiResponse, String> {
    let client = reqwest::Client::new();
    let mut headers = HeaderMap::new();

    match request.provider.as_str() {
        "anthropic" => {
            headers.insert(
                AUTHORIZATION,
                HeaderValue::from_str(&format!("Bearer {}", request.key))
                    .map_err(|e| format!("Invalid API key format: {}", e))?,
            );

            let response = client
                .post("https://api.anthropic.com/v1/messages")
                .headers(headers)
                .json(&serde_json::json!({
                    "model": "claude-3-opus-20240229",
                    "max_tokens": 1,
                    "messages": [{"role": "user", "content": "Hi"}]
                }))
                .send()
                .await
                .map_err(|e| format!("Failed to send request: {}", e))?;

            // Clone status and headers before consuming the body
            let status = response.status();
            let headers = response.headers().clone();

            // Log response info
            println!("API Response from Anthropic:");
            println!("Status: {}", status);
            println!("Headers: {:?}", headers);

            // Get response body
            let body = response
                .text()
                .await
                .map_err(|e| format!("Failed to read response body: {}", e))?;
            println!("Body: {}", body);

            if status.is_success() {
                Ok(ApiResponse {
                    content: Some("API key verified successfully".to_string()),
                    error: None,
                    citations: None,
                    images: None,
                    related_questions: None,
                })
            } else {
                Ok(ApiResponse {
                    content: None,
                    error: Some(body),
                    citations: None,
                    images: None,
                    related_questions: None,
                })
            }
        }
        "perplexity" => {
            headers.insert(
                AUTHORIZATION,
                HeaderValue::from_str(&format!("Bearer {}", request.key))
                    .map_err(|e| format!("Invalid API key format: {}", e))?,
            );

            let response = client
                .post("https://api.perplexity.ai/chat/completions")
                .headers(headers)
                .json(&serde_json::json!({
                    "model": "llama-3.1-sonar-small-128k-online",
                    "messages": [{"role": "user", "content": "Hi"}]
                }))
                .send()
                .await
                .map_err(|e| format!("Failed to send request: {}", e))?;

            // Clone status and headers before consuming the body
            let status = response.status();
            let headers = response.headers().clone();

            // Log response info
            println!("API Response from Perplexity:");
            println!("Status: {}", status);
            println!("Headers: {:?}", headers);

            // Get response body
            let body = response
                .text()
                .await
                .map_err(|e| format!("Failed to read response body: {}", e))?;
            println!("Body: {}", body);

            if status.is_success() {
                Ok(ApiResponse {
                    content: Some("API key verified successfully".to_string()),
                    error: None,
                    citations: None,
                    images: None,
                    related_questions: None,
                })
            } else {
                Ok(ApiResponse {
                    content: None,
                    error: Some(body),
                    citations: None,
                    images: None,
                    related_questions: None,
                })
            }
        }
        "openai" => {
            headers.insert(
                AUTHORIZATION,
                HeaderValue::from_str(&format!("Bearer {}", request.key))
                    .map_err(|e| format!("Invalid API key format: {}", e))?,
            );

            let response = client
                .post("https://api.openai.com/v1/chat/completions")
                .headers(headers)
                .json(&serde_json::json!({
                    "model": "gpt-3.5-turbo",
                    "messages": [{"role": "user", "content": "Hi"}]
                }))
                .send()
                .await
                .map_err(|e| format!("Failed to send request: {}", e))?;

            // Clone status and headers before consuming the body
            let status = response.status();
            let headers = response.headers().clone();

            // Log response info
            println!("API Response from OpenAI:");
            println!("Status: {}", status);
            println!("Headers: {:?}", headers);

            // Get response body
            let body = response
                .text()
                .await
                .map_err(|e| format!("Failed to read response body: {}", e))?;
            println!("Body: {}", body);

            if status.is_success() {
                Ok(ApiResponse {
                    content: Some("API key verified successfully".to_string()),
                    error: None,
                    citations: None,
                    images: None,
                    related_questions: None,
                })
            } else {
                Ok(ApiResponse {
                    content: None,
                    error: Some(body),
                    citations: None,
                    images: None,
                    related_questions: None,
                })
            }
        }
        "google" => {
            let url = format!(
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={}",
                request.key
            );

            let response = client
                .post(&url)
                .header("Content-Type", "application/json")
                .json(&serde_json::json!({
                    "contents": [{
                        "parts": [{
                            "text": "Hi"
                        }]
                    }]
                }))
                .send()
                .await
                .map_err(|e| format!("Failed to send request: {}", e))?;

            // Clone status and headers before consuming the body
            let status = response.status();
            let headers = response.headers().clone();

            // Log response info
            println!("API Response from Google:");
            println!("Status: {}", status);
            println!("Headers: {:?}", headers);

            // Get response body
            let body = response
                .text()
                .await
                .map_err(|e| format!("Failed to read response body: {}", e))?;
            println!("Body: {}", body);

            // Parse the response body to check for specific error messages
            if let Ok(error_json) = serde_json::from_str::<serde_json::Value>(&body) {
                if let Some(error) = error_json.get("error") {
                    let error_message = error["message"].as_str().unwrap_or("Unknown error");
                    let error_code = error["code"].as_i64().unwrap_or(0);
                    
                    // Check for specific error conditions
                    if error_code == 400 && error_message.contains("API key not valid") {
                        return Ok(ApiResponse {
                            content: None,
                            error: Some("Invalid Google API key. Please check your API key in settings.".to_string()),
                            citations: None,
                            images: None,
                            related_questions: None,
                        });
                    }
                    
                    return Ok(ApiResponse {
                        content: None,
                        error: Some(format!("Google API error: {}", error_message)),
                        citations: None,
                        images: None,
                        related_questions: None,
                    });
                }
            }

            if status.is_success() {
                Ok(ApiResponse {
                    content: Some("API key verified successfully".to_string()),
                    error: None,
                    citations: None,
                    images: None,
                    related_questions: None,
                })
            } else {
                Ok(ApiResponse {
                    content: None,
                    error: Some(format!("Unexpected error (Status: {})", status)),
                    citations: None,
                    images: None,
                    related_questions: None,
                })
            }
        },
        _ => Err(format!("Unsupported provider: {}", request.provider)),
    }
}

#[tauri::command]
async fn handle_file_drop(path: String) -> Result<String, String> {
    println!("Received file path: {}", path);

    // Clean the path
    let clean_path = if path.starts_with("file://") {
        path.strip_prefix("file://").unwrap_or(&path)
    } else {
        &path
    };

    // URL decode the path
    let decoded_path = percent_encoding::percent_decode_str(clean_path)
        .decode_utf8()
        .map_err(|e| format!("Failed to decode path: {}", e))?;

    println!("Cleaned and decoded path: {}", decoded_path);

    // Create Path from cleaned string
    let path = Path::new(decoded_path.as_ref());

    // If the path doesn't exist, try to find it in common directories
    let file_path = if !path.exists() {
        let file_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| "Invalid file name".to_string())?;

        get_real_path(decoded_path.to_string(), Some(file_name.to_string()))?
    } else {
        decoded_path.to_string()
    };

    println!("Final path to read: {}", file_path);

    // Check if the file is a PDF by extension
    let is_pdf = file_path.to_lowercase().ends_with(".pdf");

    if is_pdf {
        println!("Handling PDF file");
        // For PDFs, read as binary and convert to base64
        match fs::read(&file_path) {
            Ok(bytes) => {
                println!("Successfully read PDF file as binary");
                Ok(format!(
                    "data:application/pdf;base64,{}",
                    STANDARD.encode(&bytes)
                ))
            }
            Err(e) => {
                println!("Failed to read PDF file: {:?}", e);
                Err(format!("Failed to read PDF file: {}", e))
            }
        }
    } else {
        // For non-PDF files, try text first, then fallback to binary
        match fs::read_to_string(&file_path) {
            Ok(content) => {
                println!("Successfully read file as text");
                Ok(content)
            }
            Err(e) => {
                println!("Error reading as text: {:?}", e);
                // Try reading as binary
                match fs::read(&file_path) {
                    Ok(bytes) => {
                        match String::from_utf8(bytes.clone()) {
                            Ok(content) => {
                                println!("Successfully converted binary to UTF-8");
                                Ok(content)
                            }
                            Err(_) => {
                                println!("Converting binary to base64");
                                // Determine MIME type based on file extension
                                let mime_type = match Path::new(&file_path)
                                    .extension()
                                    .and_then(|ext| ext.to_str())
                                    .map(|ext| ext.to_lowercase())
                                {
                                    Some(ext) => match ext.as_str() {
                                        "png" => "image/png",
                                        "jpg" | "jpeg" => "image/jpeg",
                                        "gif" => "image/gif",
                                        "webp" => "image/webp",
                                        "svg" => "image/svg+xml",
                                        "pdf" => "application/pdf",
                                        _ => "application/octet-stream",
                                    },
                                    None => "application/octet-stream",
                                };
                                Ok(format!(
                                    "data:{};base64,{}",
                                    mime_type,
                                    STANDARD.encode(&bytes)
                                ))
                            }
                        }
                    }
                    Err(e) => {
                        println!("Failed to read file as binary: {:?}", e);
                        Err(format!("Failed to read file: {}", e))
                    }
                }
            }
        }
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
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse config file: {}", e))
    } else {
        Ok(serde_json::json!({
            "anthropic": null,
            "perplexity": null,
            "openai": null
        }))
    }
}

fn save_keys(app: &AppHandle, keys: &serde_json::Value) -> Result<(), String> {
    let config_path = get_config_path(app)?;
    let content = serde_json::to_string_pretty(keys)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
    fs::write(&config_path, content).map_err(|e| format!("Failed to write config file: {}", e))
}

#[tauri::command]
fn get_stored_api_keys(app_handle: AppHandle) -> Result<serde_json::Value, String> {
    load_stored_keys(&app_handle)
}

#[tauri::command]
async fn store_api_key(app_handle: AppHandle, request: serde_json::Value) -> Result<(), String> {
    let provider = request["provider"]
        .as_str()
        .ok_or("Missing provider".to_string())?;
    let key = request["key"].as_str().ok_or("Missing key".to_string())?;

    let mut keys = load_stored_keys(&app_handle)?;
    keys[provider] = serde_json::Value::String(key.to_string());
    save_keys(&app_handle, &keys)?;

    Ok(())
}

#[tauri::command]
fn get_real_path(path: String, file_name: Option<String>) -> Result<String, String> {
    println!("Attempting to resolve path: {}", path);
    println!("File name: {:?}", file_name);

    // Try to get the current working directory
    let cwd = env::current_dir().map_err(|e| format!("Failed to get current directory: {}", e))?;
    println!("Current working directory: {:?}", cwd);

    // Try different locations to find the file
    let possible_paths = vec![
        // Try the exact path first
        Path::new(&path).to_path_buf(),
        // Try in current directory
        cwd.join(&path),
        // Try in Downloads directory
        dirs::download_dir()
            .unwrap_or_default()
            .join(file_name.as_ref().unwrap_or(&path)),
        // Try in Documents directory
        dirs::document_dir()
            .unwrap_or_default()
            .join(file_name.as_ref().unwrap_or(&path)),
        // Try in Desktop directory
        dirs::desktop_dir()
            .unwrap_or_default()
            .join(file_name.as_ref().unwrap_or(&path)),
    ];

    // Try each path
    for try_path in possible_paths {
        println!("Trying path: {:?}", try_path);
        if try_path.exists() {
            println!("Found file at: {:?}", try_path);
            return try_path
                .to_str()
                .ok_or_else(|| "Failed to convert path to string".to_string())
                .map(String::from);
        }
    }

    Err(format!(
        "Could not find file in any expected location: {}",
        path
    ))
}

#[tauri::command]
async fn init_cache_dir() -> Result<(), String> {
    let cache_dir = get_cache_dir()?;
    fs::create_dir_all(&cache_dir)
        .map_err(|e| format!("Failed to create cache directory: {}", e))?;
    println!("Cache directory initialized at: {:?}", cache_dir);
    Ok(())
}

#[tauri::command]
async fn cache_file(
    file_id: String,
    file_name: String,
    content: String,
    metadata: String,
) -> Result<(), String> {
    let cache_dir = get_cache_dir()?;

    // Create metadata file path with file name in metadata
    let meta_path = cache_dir.join(format!("{}.meta.json", file_id));
    println!("Writing metadata for '{}' to: {:?}", file_name, meta_path);

    // Write metadata
    fs::write(&meta_path, metadata).map_err(|e| format!("Failed to write metadata: {}", e))?;

    // Create content file path
    let content_path = cache_dir.join(format!("{}.content", file_id));
    println!("Writing content for '{}' to: {:?}", file_name, content_path);

    // Write content
    fs::write(&content_path, content).map_err(|e| format!("Failed to write content: {}", e))?;

    println!(
        "File '{}' cached successfully with ID: {}",
        file_name, file_id
    );
    Ok(())
}

#[tauri::command]
async fn load_cached_file(file_id: String) -> Result<serde_json::Value, String> {
    let cache_dir = get_cache_dir()?;

    // Read metadata
    let meta_path = cache_dir.join(format!("{}.meta.json", file_id));
    let metadata =
        fs::read_to_string(&meta_path).map_err(|e| format!("Failed to read metadata: {}", e))?;

    // Read content
    let content_path = cache_dir.join(format!("{}.content", file_id));
    let content =
        fs::read_to_string(&content_path).map_err(|e| format!("Failed to read content: {}", e))?;

    Ok(serde_json::json!({
        "metadata": metadata,
        "content": content
    }))
}

#[tauri::command]
async fn delete_cached_file(file_id: String) -> Result<(), String> {
    let cache_dir = get_cache_dir()?;

    // Delete metadata file
    let meta_path = cache_dir.join(format!("{}.meta.json", file_id));
    if meta_path.exists() {
        fs::remove_file(&meta_path)
            .map_err(|e| format!("Failed to delete metadata file: {}", e))?;
    }

    // Delete content file
    let content_path = cache_dir.join(format!("{}.content", file_id));
    if content_path.exists() {
        fs::remove_file(&content_path)
            .map_err(|e| format!("Failed to delete content file: {}", e))?;
    }

    println!("Successfully deleted cached file: {}", file_id);
    Ok(())
}

fn get_cache_dir() -> Result<PathBuf, String> {
    let app_cache = dirs::cache_dir()
        .ok_or_else(|| "Failed to get cache directory".to_string())?
        .join("lex")
        .join("cache");

    Ok(app_cache)
}

fn main() {
    dotenv().ok();

    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_upload::init())
        .manage(ApiKeys {
            anthropic: Mutex::new(None),
            perplexity: Mutex::new(None),
            openai: Mutex::new(None),
            xai: Mutex::new(None),
            google: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            send_message,
            get_api_keys,
            set_api_keys,
            verify_api_key,
            handle_file_drop,
            get_stored_api_keys,
            store_api_key,
            get_real_path,
            init_cache_dir,
            cache_file,
            load_cached_file,
            delete_cached_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
