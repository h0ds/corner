use crate::api::ApiKeys;
use crate::models::{ApiResponse, SendMessageRequest};
use reqwest;
use std::env;
use tauri::{AppHandle, State};

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
        "openai" => {
            let stored_keys = crate::config::load_stored_keys(&app_handle)?;
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

            let request_body = serde_json::json!({
                "model": request.model,
                "messages": [{
                    "role": "user",
                    "content": message
                }],
                "max_tokens": 1024
            });

            let response = client
                .post("https://api.openai.com/v1/chat/completions")
                .header("Authorization", format!("Bearer {}", api_key))
                .header("Content-Type", "application/json")
                .json(&request_body)
                .send()
                .await
                .map_err(|e| e.to_string())?;

            let status = response.status();
            let response_text = response.text().await.map_err(|e| e.to_string())?;

            if status.is_success() {
                let json: serde_json::Value = serde_json::from_str(&response_text).map_err(|e| e.to_string())?;
                Ok(ApiResponse {
                    content: Some(json["choices"][0]["message"]["content"].as_str().unwrap_or_default().to_string()),
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
        },
        "perplexity" => {
            let stored_keys = crate::config::load_stored_keys(&app_handle)?;
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

            let request_body = serde_json::json!({
                "model": request.model,
                "messages": [{
                    "role": "user",
                    "content": message
                }]
            });

            let response = client
                .post("https://api.perplexity.ai/chat/completions")
                .header("Authorization", format!("Bearer {}", api_key))
                .header("Content-Type", "application/json")
                .json(&request_body)
                .send()
                .await
                .map_err(|e| e.to_string())?;

            let status = response.status();
            let response_text = response.text().await.map_err(|e| e.to_string())?;

            if status.is_success() {
                let json: serde_json::Value = serde_json::from_str(&response_text).map_err(|e| e.to_string())?;
                Ok(ApiResponse {
                    content: Some(json["choices"][0]["message"]["content"].as_str().unwrap_or_default().to_string()),
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
        },
        "google" => {
            let stored_keys = crate::config::load_stored_keys(&app_handle)?;
            let api_key = if let Some(key) = stored_keys["google"].as_str() {
                key.to_string()
            } else {
                let state_key = state.google.lock().unwrap();
                match state_key.clone() {
                    Some(key) if !key.is_empty() => key,
                    _ => env::var("GOOGLE_API_KEY").unwrap_or_default(),
                }
            };

            if api_key.is_empty() {
                return Ok(ApiResponse {
                    content: None,
                    error: Some("Google API key not configured. Please add your API key in settings.".to_string()),
                    citations: None,
                    images: None,
                    related_questions: None,
                });
            }

            let request_body = serde_json::json!({
                "contents": [{
                    "parts": [{
                        "text": message
                    }]
                }],
                "model": request.model,
                "generation_config": {
                    "max_output_tokens": 1024
                }
            });

            let response = client
                .post(format!(
                    "https://generativelanguage.googleapis.com/v1/models/{}/generateContent?key={}",
                    request.model, api_key
                ))
                .header("Content-Type", "application/json")
                .json(&request_body)
                .send()
                .await
                .map_err(|e| e.to_string())?;

            let status = response.status();
            let response_text = response.text().await.map_err(|e| e.to_string())?;

            if status.is_success() {
                let json: serde_json::Value = serde_json::from_str(&response_text).map_err(|e| e.to_string())?;
                Ok(ApiResponse {
                    content: Some(json["candidates"][0]["content"]["parts"][0]["text"].as_str().unwrap_or_default().to_string()),
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
        },
        "xai" => {
            let stored_keys = crate::config::load_stored_keys(&app_handle)?;
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
                    "content": message
                }],
                "model": request.model,
                "max_tokens": 1024
            });

            let response = client
                .post("https://api.grok.x.ai/v1/chat/completions")
                .header("Authorization", format!("Bearer {}", api_key))
                .header("Content-Type", "application/json")
                .json(&request_body)
                .send()
                .await
                .map_err(|e| e.to_string())?;

            let status = response.status();
            let response_text = response.text().await.map_err(|e| e.to_string())?;

            if status.is_success() {
                let json: serde_json::Value = serde_json::from_str(&response_text).map_err(|e| e.to_string())?;
                Ok(ApiResponse {
                    content: Some(json["choices"][0]["message"]["content"].as_str().unwrap_or_default().to_string()),
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
        },
        "elevenlabs" => {
            let stored_keys = crate::config::load_stored_keys(&app_handle)?;
            let api_key = if let Some(key) = stored_keys["elevenlabs"].as_str() {
                key.to_string()
            } else {
                let state_key = state.elevenlabs.lock().unwrap();
                match state_key.clone() {
                    Some(key) if !key.is_empty() => key,
                    _ => env::var("ELEVENLABS_API_KEY").unwrap_or_default(),
                }
            };

            if api_key.is_empty() {
                return Ok(ApiResponse {
                    content: None,
                    error: Some("ElevenLabs API key not configured. Please add your API key in settings.".to_string()),
                    citations: None,
                    images: None,
                    related_questions: None,
                });
            }

            // Placeholder for ElevenLabs implementation
            Ok(ApiResponse {
                content: Some("Text-to-speech conversion not yet implemented".to_string()),
                error: None,
                citations: None,
                images: None,
                related_questions: None,
            })
        },
        _ => Ok(ApiResponse {
            content: None,
            error: Some(format!("Unsupported provider: {}", request.provider)),
            citations: None,
            images: None,
            related_questions: None,
        }),
    }
}

#[tauri::command]
pub async fn verify_api_key(request: serde_json::Value) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let key = request["key"].as_str().ok_or("API key not provided")?;
    let provider = request["provider"].as_str().ok_or("Provider not specified")?;

    match provider {
        "anthropic" => {
            let response = client
                .post("https://api.anthropic.com/v1/messages")
                .header("x-api-key", key)
                .header("anthropic-version", "2023-06-01")
                .header("content-type", "application/json")
                .json(&serde_json::json!({
                    "model": "claude-3-opus-20240229",
                    "messages": [{
                        "role": "user",
                        "content": "Test message for API key verification"
                    }],
                    "max_tokens": 1
                }))
                .send()
                .await
                .map_err(|e| e.to_string())?;

            if response.status().is_success() {
                Ok(serde_json::json!({}))
            } else {
                let error = response.text().await.map_err(|e| e.to_string())?;
                Ok(serde_json::json!({ "error": error }))
            }
        },
        "perplexity" => {
            let response = client
                .post("https://api.perplexity.ai/chat/completions")
                .header("Authorization", format!("Bearer {}", key))
                .json(&serde_json::json!({
                    "model": "sonar-small-chat",
                    "messages": [{
                        "role": "user",
                        "content": "Test message for API key verification"
                    }],
                    "max_tokens": 1
                }))
                .send()
                .await
                .map_err(|e| e.to_string())?;

            if response.status().is_success() {
                Ok(serde_json::json!({}))
            } else {
                let error = response.text().await.map_err(|e| e.to_string())?;
                Ok(serde_json::json!({ "error": error }))
            }
        },
        "openai" => {
            let response = client
                .post("https://api.openai.com/v1/chat/completions")
                .header("Authorization", format!("Bearer {}", key))
                .json(&serde_json::json!({
                    "model": "gpt-4",
                    "messages": [{
                        "role": "user",
                        "content": "Test message for API key verification"
                    }],
                    "max_tokens": 1
                }))
                .send()
                .await
                .map_err(|e| e.to_string())?;

            if response.status().is_success() {
                Ok(serde_json::json!({}))
            } else {
                let error = response.text().await.map_err(|e| e.to_string())?;
                Ok(serde_json::json!({ "error": error }))
            }
        },
        "xai" => {
            let response = client
                .post("https://api.x.ai/v1/chat/completions")
                .header("Authorization", format!("Bearer {}", key))
                .json(&serde_json::json!({
                    "messages": [{
                        "role": "user",
                        "content": "Test message for API key verification"
                    }],
                    "max_tokens": 1
                }))
                .send()
                .await
                .map_err(|e| e.to_string())?;

            if response.status().is_success() {
                Ok(serde_json::json!({}))
            } else {
                let error = response.text().await.map_err(|e| e.to_string())?;
                Ok(serde_json::json!({ "error": error }))
            }
        },
        "google" => {
            let response = client
                .post("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent")
                .query(&[("key", key)])
                .json(&serde_json::json!({
                    "contents": [{
                        "parts": [{
                            "text": "Test message for API key verification"
                        }]
                    }]
                }))
                .send()
                .await
                .map_err(|e| e.to_string())?;

            if response.status().is_success() {
                Ok(serde_json::json!({}))
            } else {
                let error = response.text().await.map_err(|e| e.to_string())?;
                Ok(serde_json::json!({ "error": error }))
            }
        },
        "elevenlabs" => {
            let response = client
                .get("https://api.elevenlabs.io/v1/voices")
                .header("xi-api-key", key)
                .send()
                .await
                .map_err(|e| e.to_string())?;

            if response.status().is_success() {
                Ok(serde_json::json!({}))
            } else {
                let error = response.text().await.map_err(|e| e.to_string())?;
                Ok(serde_json::json!({ "error": error }))
            }
        },
        _ => Ok(serde_json::json!({ "error": "Unsupported provider" }))
    }
}
