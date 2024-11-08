#[tauri::command]
async fn verify_api_key(request: VerifyRequest) -> Result<ApiResponse, String> {
    let client = reqwest::Client::new();

    match request.provider.as_str() {
        // ... other providers remain the same ...

        "google" => {
            // Google's API requires the key as a query parameter
            let url = format!(
                "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key={}",
                request.key
            );

            let response = client
                .post(&url)
                .header("Content-Type", "application/json")
                .json(&serde_json::json!({
                    "contents": [{
                        "role": "user",
                        "parts": [{
                            "text": "Hi"
                        }]
                    }],
                    "safetySettings": [],
                    "generationConfig": {
                        "maxOutputTokens": 1
                    }
                }))
                .send()
                .await
                .map_err(|e| format!("Failed to send request: {}", e))?;

            let status = response.status();
            let body = response
                .text()
                .await
                .map_err(|e| format!("Failed to read response body: {}", e))?;

            println!("Google API Response:");
            println!("Status: {}", status);
            println!("Body: {}", body);

            if status.is_success() {
                Ok(ApiResponse {
                    content: Some("API key verified successfully".to_string()),
                    error: None,
                })
            } else {
                let error_message = if status.as_u16() == 401 {
                    "Invalid API key".to_string()
                } else {
                    format!("Google API error ({}): {}", status, body)
                };

                Ok(ApiResponse {
                    content: None,
                    error: Some(error_message),
                })
            }
        }

        _ => Ok(ApiResponse {
            content: None,
            error: Some(format!("Unsupported provider: {}", request.provider)),
        }),
    }
} 