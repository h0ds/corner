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
            println!("Starting OpenAI API request...");
            let stored_keys = crate::config::load_stored_keys(&app_handle)?;
            let api_key = if let Some(key) = stored_keys["openai"].as_str() {
                println!("Using stored API key");
                key.to_string()
            } else {
                let state_key = state.openai.lock().unwrap();
                match state_key.clone() {
                    Some(key) if !key.is_empty() => {
                        println!("Using state API key");
                        key
                    },
                    _ => {
                        println!("Falling back to env API key");
                        env::var("OPENAI_API_KEY").unwrap_or_default()
                    },
                }
            };

            if api_key.is_empty() {
                println!("No OpenAI API key found");
                return Ok(ApiResponse {
                    content: None,
                    error: Some("OpenAI API key not configured. Please add your API key in settings.".to_string()),
                    citations: None,
                    images: None,
                    related_questions: None,
                });
            }

            println!("Preparing request with model: {}", request.model);
            let request_body = serde_json::json!({
                "model": request.model,
                "messages": [{
                    "role": "user",
                    "content": message
                }],
                "temperature": 0.7,
                "stream": false
            });

            println!("Sending request to OpenAI API...");
            let response = client
                .post("https://api.openai.com/v1/chat/completions")
                .header("Authorization", format!("Bearer {}", api_key))
                .header("Content-Type", "application/json")
                .header("OpenAI-Beta", "assistants=v1")
                .json(&request_body)
                .send()
                .await;

            match response {
                Ok(resp) => {
                    let status = resp.status();
                    println!("Received response with status: {}", status);
                    
                    let response_text = resp.text().await.map_err(|e| {
                        println!("Failed to read response text: {}", e);
                        e.to_string()
                    })?;
                    println!("Response text: {}", response_text);

                    if status.is_success() {
                        let json: serde_json::Value = serde_json::from_str(&response_text).map_err(|e| {
                            println!("Failed to parse JSON response: {}", e);
                            e.to_string()
                        })?;
                        println!("Successfully parsed response JSON");
                        
                        Ok(ApiResponse {
                            content: Some(json["choices"][0]["message"]["content"].as_str().unwrap_or_default().to_string()),
                            error: None,
                            citations: None,
                            images: None,
                            related_questions: None,
                        })
                    } else {
                        let error_json: serde_json::Value = serde_json::from_str(&response_text).unwrap_or_default();
                        let error_message = error_json["error"]["message"]
                            .as_str()
                            .unwrap_or("Unknown error occurred")
                            .to_string();
                        
                        println!("API error: {}", error_message);
                        Ok(ApiResponse {
                            content: None,
                            error: Some(format!("OpenAI API Error: {}", error_message)),
                            citations: None,
                            images: None,
                            related_questions: None,
                        })
                    }
                },
                Err(e) => {
                    println!("Failed to send request: {}", e);
                    Ok(ApiResponse {
                        content: None,
                        error: Some(format!("Failed to send request to OpenAI API: {}", e)),
                        citations: None,
                        images: None,
                        related_questions: None,
                    })
                }
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
                .await;

            match response {
                Ok(mut resp) => {
                    let status = resp.status();
                    let response_text = resp.text().await.map_err(|e| e.to_string())?;

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
                Err(e) => {
                    Ok(ApiResponse {
                        content: None,
                        error: Some(format!("Failed to send request to Perplexity API: {}", e)),
                        citations: None,
                        images: None,
                        related_questions: None,
                    })
                }
            }
        },
        "google" => {
            println!("Starting Gemini API request processing");
            
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

            println!("API Key present: {}", !api_key.is_empty());

            if api_key.is_empty() {
                return Ok(ApiResponse {
                    content: None,
                    error: Some("Google API key not configured. Please add your API key in settings.".to_string()),
                    citations: None,
                    images: None,
                    related_questions: None,
                });
            }

            // Basic request structure following Gemini API docs
            let request_body = serde_json::json!({
                "contents": [{
                    "role": "user",
                    "parts": [{
                        "text": message
                    }]
                }],
                "generationConfig": {
                    "temperature": 0.7,
                    "topP": 0.8,
                    "topK": 40,
                    "maxOutputTokens": 2048
                },
                "safetySettings": [
                    {
                        "category": "HARM_CATEGORY_HARASSMENT",
                        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        "category": "HARM_CATEGORY_HATE_SPEECH",
                        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                    }
                ]
            });

            println!("Request model: {}", request.model);
            println!("Request body: {}", serde_json::to_string_pretty(&request_body).unwrap());

            let url = format!(
                "https://generativelanguage.googleapis.com/v1/models/{}/generateContent?key={}",
                request.model, api_key
            );
            println!("Request URL: {}", url.replace(&api_key, "API_KEY_HIDDEN"));

            let response = client
                .post(&url)
                .header("Content-Type", "application/json")
                .json(&request_body)
                .send()
                .await;

            match response {
                Ok(mut resp) => {
                    let status = resp.status();
                    println!("Response status: {}", status);
                    let response_text = resp.text().await.map_err(|e| e.to_string())?;
                    println!("Raw response: {}", response_text);

                    if status.is_success() {
                        match serde_json::from_str::<serde_json::Value>(&response_text) {
                            Ok(json) => {
                                println!("Successfully parsed JSON response");
                                
                                // Check for error field first
                                if json.get("error").is_some() {
                                    let error_msg = json["error"]["message"].as_str().unwrap_or("Unknown error");
                                    println!("Found error in response: {}", error_msg);
                                    
                                    // Handle rate limit error specifically
                                    if error_msg.contains("rate limit exceeded") || error_msg.contains("resource exhausted") {
                                        return Ok(ApiResponse {
                                            content: None,
                                            error: Some("Rate limit exceeded for Gemini API. Please try again in about an hour.".to_string()),
                                            citations: None,
                                            images: None,
                                            related_questions: None,
                                        });
                                    }
                                    
                                    return Ok(ApiResponse {
                                        content: None,
                                        error: Some(format!("API Error: {}", error_msg)),
                                        citations: None,
                                        images: None,
                                        related_questions: None,
                                    });
                                }

                                // Try to get the response text
                                if let Some(candidates) = json.get("candidates") {
                                    println!("Found candidates in response");
                                    if let Some(first) = candidates.get(0) {
                                        println!("Processing first candidate");
                                        if let Some(content) = first.get("content") {
                                            println!("Found content in candidate");
                                            if let Some(parts) = content.get("parts") {
                                                println!("Found parts in content");
                                                if let Some(first_part) = parts.get(0) {
                                                    println!("Processing first part");
                                                    if let Some(text) = first_part.get("text") {
                                                        if let Some(text_str) = text.as_str() {
                                                            println!("Successfully extracted response text");
                                                            return Ok(ApiResponse {
                                                                content: Some(text_str.to_string()),
                                                                error: None,
                                                                citations: None,
                                                                images: None,
                                                                related_questions: None,
                                                            });
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                println!("Could not find expected response structure");
                                Ok(ApiResponse {
                                    content: None,
                                    error: Some("Could not parse Gemini response structure".to_string()),
                                    citations: None,
                                    images: None,
                                    related_questions: None,
                                })
                            },
                            Err(e) => {
                                println!("Failed to parse JSON response: {}", e);
                                Ok(ApiResponse {
                                    content: None,
                                    error: Some(format!("Failed to parse Gemini response: {}", e)),
                                    citations: None,
                                    images: None,
                                    related_questions: None,
                                })
                            }
                        }
                    } else {
                        println!("Request failed with status: {}", status);
                        
                        // Try to parse error response
                        match serde_json::from_str::<serde_json::Value>(&response_text) {
                            Ok(error_json) => {
                                if let Some(error) = error_json.get("error") {
                                    let error_msg = error["message"].as_str().unwrap_or("Unknown error");
                                    
                                    // Handle rate limit error specifically
                                    if error_msg.contains("rate limit exceeded") || error_msg.contains("resource exhausted") {
                                        return Ok(ApiResponse {
                                            content: None,
                                            error: Some("Rate limit exceeded for Gemini API. Please try again in about an hour.".to_string()),
                                            citations: None,
                                            images: None,
                                            related_questions: None,
                                        });
                                    }
                                    
                                    return Ok(ApiResponse {
                                        content: None,
                                        error: Some(format!("Gemini API Error: {}", error_msg)),
                                        citations: None,
                                        images: None,
                                        related_questions: None,
                                    });
                                }
                            },
                            Err(_) => {}
                        }

                        Ok(ApiResponse {
                            content: None,
                            error: Some(format!("Gemini API request failed with status {}: {}", status, response_text)),
                            citations: None,
                            images: None,
                            related_questions: None,
                        })
                    }
                },
                Err(e) => {
                    println!("Request failed: {}", e);
                    Ok(ApiResponse {
                        content: None,
                        error: Some(format!("Failed to send request to Gemini API: {}", e)),
                        citations: None,
                        images: None,
                        related_questions: None,
                    })
                }
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
                .await;

            match response {
                Ok(resp) => {
                    let status = resp.status();
                    let response_text = resp.text().await.map_err(|e| e.to_string())?;

                    if status.is_success() {
                        let json: serde_json::Value = serde_json::from_str(&response_text).map_err(|e| e.to_string())?;
                        
                        // Check for rate limit error in success response
                        if let Some(error) = json["error"].as_object() {
                            if error["type"].as_str() == Some("rate_limit_exceeded") {
                                return Ok(ApiResponse {
                                    content: None,
                                    error: Some("Rate limit exceeded for Grok. Please try again later.".to_string()),
                                    citations: None,
                                    images: None,
                                    related_questions: None,
                                });
                            }
                        }
                        
                        Ok(ApiResponse {
                            content: Some(json["choices"][0]["message"]["content"].as_str().unwrap_or_default().to_string()),
                            error: None,
                            citations: None,
                            images: None,
                            related_questions: None,
                        })
                    } else {
                        let error_json: Result<serde_json::Value, _> = serde_json::from_str(&response_text);
                        
                        if let Ok(error_value) = error_json {
                            if let Some(error) = error_value["error"].as_object() {
                                if error["type"].as_str() == Some("rate_limit_exceeded") {
                                    return Ok(ApiResponse {
                                        content: None,
                                        error: Some("Rate limit exceeded for Grok. Please try again later.".to_string()),
                                        citations: None,
                                        images: None,
                                        related_questions: None,
                                    });
                                }
                            }
                        }
                        
                        Ok(ApiResponse {
                            content: None,
                            error: Some(format!("API Error: {}", response_text)),
                            citations: None,
                            images: None,
                            related_questions: None,
                        })
                    }
                },
                Err(e) => {
                    Ok(ApiResponse {
                        content: None,
                        error: Some(format!("Failed to send request to Grok API: {}", e)),
                        citations: None,
                        images: None,
                        related_questions: None,
                    })
                }
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
pub async fn verify_api_key(provider: &str, key: &str) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();

    match provider {
        "anthropic" => {
            let response = client
                .get("https://api.anthropic.com/v1/models")
                .header("x-api-key", key)
                .header("anthropic-version", "2023-06-01")
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
                .await;

            match response {
                Ok(resp) => {
                    if resp.status().is_success() {
                        Ok(serde_json::json!({}))
                    } else {
                        let error = resp.text().await.map_err(|e| e.to_string())?;
                        Ok(serde_json::json!({ "error": error }))
                    }
                },
                Err(e) => {
                    Ok(serde_json::json!({ "error": e.to_string() }))
                }
            }
        },
        "google" => {
            let response = client
                .post(format!(
                    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={}",
                    key
                ))
                .header("Content-Type", "application/json")
                .json(&serde_json::json!({
                    "contents": [{
                        "parts":[{
                            "text": "Test message for API key verification"
                        }]
                    }]
                }))
                .send()
                .await;

            match response {
                Ok(resp) => {
                    if resp.status().is_success() {
                        Ok(serde_json::json!({}))
                    } else {
                        let error = resp.text().await.map_err(|e| e.to_string())?;
                        Ok(serde_json::json!({ "error": error }))
                    }
                },
                Err(e) => {
                    Ok(serde_json::json!({ "error": e.to_string() }))
                }
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
