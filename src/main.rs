#[tauri::command]
async fn send_message(
    request: SendMessageRequest,
    app_handle: AppHandle,
    state: State<'_, ApiKeys>,
) -> Result<ApiResponse, String> {
    let client = reqwest::Client::new();

    println!("Sending message to {} model: {}", request.provider, request.model);
    println!("Message content: {}", request.message);

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
                println!("No Anthropic API key found");
                return Ok(ApiResponse {
                    content: None,
                    error: Some("Anthropic API key not configured. Please add your API key in settings.".to_string()),
                    citations: None,
                });
            }

            println!("Anthropic API key found, length: {}", api_key.len());

            let request_body = serde_json::json!({
                "contents": [{
                    "parts": [{
                        "text": request.message
                    }]
                }]
            });

            println!("\n=== Anthropic API Request ===");
            println!("URL: {}", url.replace(&api_key, "[REDACTED]"));
            println!("Request body: {}", serde_json::to_string_pretty(&request_body).unwrap());

            let url = format!(
                "https://api.anthropic.com/v1/complete?key={key}",
                key = api_key
            );

            let response = client
                .post(&url)
                .header("Content-Type", "application/json")
                .json(&request_body)
                .send()
                .await
                .map_err(|e| {
                    println!("\n=== Anthropic API Error ===");
                    println!("Request error: {:?}", e);
                    e.to_string()
                })?;

            let status = response.status();
            println!("\n=== Anthropic API Response ===");
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
                        println!("Anthropic API JSON parse error: {:?}", e);
                        e.to_string()
                    })?;

                // Check for error in the response
                if let Some(error) = json.get("error") {
                    println!("Anthropic API error in response: {:?}", error);
                    let error_message = error["message"].as_str()
                        .unwrap_or("Unknown error occurred");
                    return Ok(ApiResponse {
                        content: None,
                        error: Some(error_message.to_string()),
                        citations: None,
                    });
                }

                // Extract content from the response
                let content = json["candidates"][0]["content"]["parts"][0]["text"]
                    .as_str()
                    .ok_or_else(|| {
                        println!("Failed to extract text from Anthropic API response");
                        "Failed to extract text from response".to_string()
                    })?;

                println!("Successfully extracted content from Anthropic API response");

                Ok(ApiResponse {
                    content: Some(content.to_string()),
                    error: None,
                    citations: None,
                })
            } else {
                if status.as_u16() == 401 || status.as_u16() == 403 {
                    println!("Anthropic API authentication error: {}", status);
                    Ok(ApiResponse {
                        content: None,
                        error: Some("Anthropic API key is invalid. Please check your API key in settings.".to_string()),
                        citations: None,
                    })
                } else {
                    println!("Anthropic API error response: {} - {}", status, response_text);
                    // Try to parse error message from response
                    if let Ok(error_json) = serde_json::from_str::<serde_json::Value>(&response_text) {
                        if let Some(error_msg) = error_json["error"]["message"].as_str() {
                            return Ok(ApiResponse {
                                content: None,
                                error: Some(format!("Anthropic API error: {}", error_msg)),
                                citations: None,
                            });
                        }
                    }
                    
                    Ok(ApiResponse {
                        content: None,
                        error: Some(format!("API error (Status: {}): {}", status, response_text)),
                        citations: None,
                    })
                }
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
                println!("No Perplexity API key found");
                return Ok(ApiResponse {
                    content: None,
                    error: Some("Perplexity API key not configured. Please add your API key in settings.".to_string()),
                    citations: None,
                });
            }

            println!("Perplexity API key found, length: {}", api_key.len());

            let request_body = serde_json::json!({
                "contents": [{
                    "parts": [{
                        "text": request.message
                    }]
                }]
            });

            println!("\n=== Perplexity API Request ===");
            println!("URL: {}", url.replace(&api_key, "[REDACTED]"));
            println!("Request body: {}", serde_json::to_string_pretty(&request_body).unwrap());

            let url = format!(
                "https://api.perplexity.ai/v1/generate?key={key}",
                key = api_key
            );

            let response = client
                .post(&url)
                .header("Content-Type", "application/json")
                .json(&request_body)
                .send()
                .await
                .map_err(|e| {
                    println!("\n=== Perplexity API Error ===");
                    println!("Request error: {:?}", e);
                    e.to_string()
                })?;

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
                let json: serde_json::Value = serde_json::from_str(&response_text)
                    .map_err(|e| e.to_string())?;

                // Extract citations from the response
                let citations = if let Some(citations_array) = json["citations"].as_array() {
                    Some(citations_array
                        .iter()
                        .enumerate()
                        .map(|(i, url)| Citation {
                            url: url.as_str().unwrap_or_default().to_string(),
                            title: None,
                        })
                        .collect::<Vec<Citation>>())
                } else {
                    None
                };

                // Extract content from choices
                let content = json["choices"][0]["message"]["content"]
                    .as_str()
                    .map(|s| s.to_string());

                println!("Perplexity Response: {}", json);
                println!("Extracted citations: {:?}", citations);
                println!("Extracted content: {:?}", content);

                Ok(ApiResponse {
                    content,
                    error: None,
                    citations,
                })
            } else {
                if status.as_u16() == 401 || status.as_u16() == 403 {
                    println!("Perplexity API authentication error: {}", status);
                    Ok(ApiResponse {
                        content: None,
                        error: Some("Perplexity API key is invalid. Please check your API key in settings.".to_string()),
                        citations: None,
                    })
                } else {
                    println!("Perplexity API error response: {} - {}", status, response_text);
                    // Try to parse error message from response
                    if let Ok(error_json) = serde_json::from_str::<serde_json::Value>(&response_text) {
                        if let Some(error_msg) = error_json["error"]["message"].as_str() {
                            return Ok(ApiResponse {
                                content: None,
                                error: Some(format!("Perplexity API error: {}", error_msg)),
                                citations: None,
                            });
                        }
                    }
                    
                    Ok(ApiResponse {
                        content: None,
                        error: Some(format!("API error (Status: {}): {}", status, response_text)),
                        citations: None,
                    })
                }
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
                println!("No OpenAI API key found");
                return Ok(ApiResponse {
                    content: None,
                    error: Some("OpenAI API key not configured. Please add your API key in settings.".to_string()),
                    citations: None,
                });
            }

            println!("OpenAI API key found, length: {}", api_key.len());

            let request_body = serde_json::json!({
                "contents": [{
                    "parts": [{
                        "text": request.message
                    }]
                }]
            });

            println!("\n=== OpenAI API Request ===");
            println!("URL: {}", url.replace(&api_key, "[REDACTED]"));
            println!("Request body: {}", serde_json::to_string_pretty(&request_body).unwrap());

            let url = format!(
                "https://api.openai.com/v1/chat/completions?key={key}",
                key = api_key
            );

            let response = client
                .post(&url)
                .header("Content-Type", "application/json")
                .json(&request_body)
                .send()
                .await
                .map_err(|e| {
                    println!("\n=== OpenAI API Error ===");
                    println!("Request error: {:?}", e);
                    e.to_string()
                })?;

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
                    .map_err(|e| {
                        println!("OpenAI API JSON parse error: {:?}", e);
                        e.to_string()
                    })?;

                // Check for error in the response
                if let Some(error) = json.get("error") {
                    println!("OpenAI API error in response: {:?}", error);
                    let error_message = error["message"].as_str()
                        .unwrap_or("Unknown error occurred");
                    return Ok(ApiResponse {
                        content: None,
                        error: Some(error_message.to_string()),
                        citations: None,
                    });
                }

                // Extract content from the response
                let content = json["choices"][0]["message"]["content"]
                    .as_str()
                    .ok_or_else(|| {
                        println!("Failed to extract text from OpenAI API response");
                        "Failed to extract text from response".to_string()
                    })?;

                println!("Successfully extracted content from OpenAI API response");

                Ok(ApiResponse {
                    content: Some(content.to_string()),
                    error: None,
                    citations: None,
                })
            } else {
                if status.as_u16() == 401 || status.as_u16() == 403 {
                    println!("OpenAI API authentication error: {}", status);
                    Ok(ApiResponse {
                        content: None,
                        error: Some("OpenAI API key is invalid. Please check your API key in settings.".to_string()),
                        citations: None,
                    })
                } else {
                    println!("OpenAI API error response: {} - {}", status, response_text);
                    // Try to parse error message from response
                    if let Ok(error_json) = serde_json::from_str::<serde_json::Value>(&response_text) {
                        if let Some(error_msg) = error_json["error"]["message"].as_str() {
                            return Ok(ApiResponse {
                                content: None,
                                error: Some(format!("OpenAI API error: {}", error_msg)),
                                citations: None,
                            });
                        }
                    }
                    
                    Ok(ApiResponse {
                        content: None,
                        error: Some(format!("API error (Status: {}): {}", status, response_text)),
                        citations: None,
                    })
                }
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
                println!("No xAI API key found");
                return Ok(ApiResponse {
                    content: None,
                    error: Some("xAI API key not configured. Please add your API key in settings.".to_string()),
                    citations: None,
                });
            }

            println!("xAI API key found, length: {}", api_key.len());

            let request_body = serde_json::json!({
                "contents": [{
                    "parts": [{
                        "text": request.message
                    }]
                }]
            });

            println!("\n=== xAI API Request ===");
            println!("URL: {}", url.replace(&api_key, "[REDACTED]"));
            println!("Request body: {}", serde_json::to_string_pretty(&request_body).unwrap());

            let url = format!(
                "https://api.xai.com/v1/generate?key={key}",
                key = api_key
            );

            let response = client
                .post(&url)
                .header("Content-Type", "application/json")
                .json(&request_body)
                .send()
                .await
                .map_err(|e| {
                    println!("\n=== xAI API Error ===");
                    println!("Request error: {:?}", e);
                    e.to_string()
                })?;

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
                    .map_err(|e| {
                        println!("xAI API JSON parse error: {:?}", e);
                        e.to_string()
                    })?;

                // Check for error in the response
                if let Some(error) = json.get("error") {
                    println!("xAI API error in response: {:?}", error);
                    let error_message = error["message"].as_str()
                        .unwrap_or("Unknown error occurred");
                    return Ok(ApiResponse {
                        content: None,
                        error: Some(error_message.to_string()),
                        citations: None,
                    });
                }

                // Extract content from the response
                let content = json["candidates"][0]["content"]["parts"][0]["text"]
                    .as_str()
                    .ok_or_else(|| {
                        println!("Failed to extract text from xAI API response");
                        "Failed to extract text from response".to_string()
                    })?;

                println!("Successfully extracted content from xAI API response");

                Ok(ApiResponse {
                    content: Some(content.to_string()),
                    error: None,
                    citations: None,
                })
            } else {
                if status.as_u16() == 401 || status.as_u16() == 403 {
                    println!("xAI API authentication error: {}", status);
                    Ok(ApiResponse {
                        content: None,
                        error: Some("xAI API key is invalid. Please check your API key in settings.".to_string()),
                        citations: None,
                    })
                } else {
                    println!("xAI API error response: {} - {}", status, response_text);
                    // Try to parse error message from response
                    if let Ok(error_json) = serde_json::from_str::<serde_json::Value>(&response_text) {
                        if let Some(error_msg) = error_json["error"]["message"].as_str() {
                            return Ok(ApiResponse {
                                content: None,
                                error: Some(format!("xAI API error: {}", error_msg)),
                                citations: None,
                            });
                        }
                    }
                    
                    Ok(ApiResponse {
                        content: None,
                        error: Some(format!("API error (Status: {}): {}", status, response_text)),
                        citations: None,
                    })
                }
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
                });
            }

            println!("Google API key found, length: {}", api_key.len());

            let request_body = serde_json::json!({
                "contents": [{
                    "parts": [{
                        "text": request.message
                    }]
                }]
            });

            println!("\n=== Google API Request ===");
            println!("URL: {}", url.replace(&api_key, "[REDACTED]"));
            println!("Request body: {}", serde_json::to_string_pretty(&request_body).unwrap());

            let url = format!(
                "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}",
                model = request.model,
                key = api_key
            );

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
                })
            } else {
                if status.as_u16() == 401 || status.as_u16() == 403 {
                    println!("Google API authentication error: {}", status);
                    Ok(ApiResponse {
                        content: None,
                        error: Some("Google API key is invalid. Please check your API key in settings.".to_string()),
                        citations: None,
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
                            });
                        }
                    }
                    
                    Ok(ApiResponse {
                        content: None,
                        error: Some(format!("API error (Status: {}): {}", status, response_text)),
                        citations: None,
                    })
                }
            }
        }

        provider => {
            println!("\n=== Unknown Provider ===");
            println!("Provider: {}", provider);
            return Ok(ApiResponse {
                content: None,
                error: Some(format!("Unknown provider: {}", provider)),
                citations: None,
            });
        }
    }
} 