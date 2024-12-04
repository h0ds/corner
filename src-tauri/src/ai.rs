use crate::models::*;
use reqwest::Client;
use anyhow::{Result, anyhow};
use serde_json;

pub async fn verify_api_key(provider: &str, key: &str) -> Result<bool> {
    match provider {
        "gemini" => {
            let client = Client::new();
            let test_request = GeminiRequest {
                contents: vec![GeminiContent {
                    role: "user".to_string(),
                    parts: vec![GeminiPart { text: "test".to_string() }],
                }],
                generation_config: Some(GeminiConfig {
                    temperature: Some(0.7),
                    top_k: Some(40),
                    top_p: Some(0.8),
                    max_output_tokens: Some(2048),
                }),
                safety_settings: Some(vec![
                    GeminiSafetySetting {
                        category: "HARM_CATEGORY_HARASSMENT".to_string(),
                        threshold: "BLOCK_MEDIUM_AND_ABOVE".to_string(),
                    },
                    GeminiSafetySetting {
                        category: "HARM_CATEGORY_HATE_SPEECH".to_string(),
                        threshold: "BLOCK_MEDIUM_AND_ABOVE".to_string(),
                    },
                    GeminiSafetySetting {
                        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT".to_string(),
                        threshold: "BLOCK_MEDIUM_AND_ABOVE".to_string(),
                    },
                    GeminiSafetySetting {
                        category: "HARM_CATEGORY_DANGEROUS_CONTENT".to_string(),
                        threshold: "BLOCK_MEDIUM_AND_ABOVE".to_string(),
                    },
                ]),
            };

            let url = format!(
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={}",
                key
            );

            println!("Verifying Gemini API key...");
            println!("Request URL: {}", url.replace(key, "[REDACTED]"));
            println!("Request body: {}", serde_json::to_string_pretty(&test_request).unwrap());

            let response = client
                .post(&url)
                .json(&test_request)
                .send()
                .await?;

            let status = response.status();
            if status.is_success() {
                println!("Gemini API key is valid");
                Ok(true)
            } else {
                let error = response.text().await?;
                println!("Gemini API key verification failed ({}): {}", status, error);
                Ok(false)
            }
        },
        // Add other providers here
        _ => Err(anyhow!("Unsupported provider: {}", provider))
    }
}

pub async fn generate_gemini_completion(api_key: &str, messages: Vec<Message>) -> Result<String> {
    println!("Starting Gemini completion with {} messages", messages.len());
    let client = Client::new();
    
    // Convert messages to Gemini format
    let contents = messages.iter().map(|msg| GeminiContent {
        role: if msg.role == "user" { "user".to_string() } else { "model".to_string() },
        parts: vec![GeminiPart { text: msg.content.clone() }],
    }).collect();

    let request = GeminiRequest {
        contents,
        generation_config: Some(GeminiConfig {
            temperature: Some(0.7),
            top_k: Some(40),
            top_p: Some(0.8),
            max_output_tokens: Some(2048),
        }),
        safety_settings: Some(vec![
            GeminiSafetySetting {
                category: "HARM_CATEGORY_HARASSMENT".to_string(),
                threshold: "BLOCK_MEDIUM_AND_ABOVE".to_string(),
            },
            GeminiSafetySetting {
                category: "HARM_CATEGORY_HATE_SPEECH".to_string(),
                threshold: "BLOCK_MEDIUM_AND_ABOVE".to_string(),
            },
            GeminiSafetySetting {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT".to_string(),
                threshold: "BLOCK_MEDIUM_AND_ABOVE".to_string(),
            },
            GeminiSafetySetting {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT".to_string(),
                threshold: "BLOCK_MEDIUM_AND_ABOVE".to_string(),
            },
        ]),
    };

    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={}",
        api_key
    );
    println!("Sending request to URL: {}", url.replace(api_key, "[REDACTED]"));
    println!("Request body: {}", serde_json::to_string_pretty(&request).unwrap());

    let response = client
        .post(&url)
        .json(&request)
        .send()
        .await?;

    if !response.status().is_success() {
        let error = response.text().await?;
        println!("Gemini API error: {}", error);
        return Err(anyhow!("Gemini API error: {}", error));
    }

    println!("Parsing Gemini response...");
    let gemini_response: GeminiResponse = response.json().await?;
    
    // Check if we have any candidates
    let candidate = gemini_response.candidates.first()
        .ok_or_else(|| anyhow!("No response candidates from Gemini API"))?;
    
    // Get the first part's text from the candidate's content
    candidate.content.parts.first()
        .map(|part| part.text.clone())
        .ok_or_else(|| anyhow!("Invalid response format from Gemini API"))
}

pub async fn generate_grok_completion(api_key: &str, messages: Vec<Message>) -> Result<String> {
    println!("Starting Grok completion with {} messages", messages.len());
    let client = Client::new();
    
    let request = GrokRequest {
        model: "grok-1".to_string(),
        messages,
        stream: false,
    };

    let url = "https://api.x.ai/v1/chat/completions";
    println!("Sending request to URL: {}", url);
    println!("Request body: {}", serde_json::to_string_pretty(&request).unwrap());

    let response = client
        .post(url)
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&request)
        .send()
        .await?;

    if !response.status().is_success() {
        let error = response.text().await?;
        println!("Grok API error: {}", error);
        return Err(anyhow!("Grok API error: {}", error));
    }

    println!("Parsing Grok response...");
    let grok_response: GrokResponse = response.json().await?;
    
    grok_response
        .choices
        .first()
        .map(|choice| choice.message.content.clone())
        .ok_or_else(|| anyhow!("Invalid response format from Grok API"))
}

pub async fn generate_completion(request: CompletionRequest) -> Result<String> {
    println!("Starting completion with provider {}", request.provider);
    let api_key = match request.provider.as_str() {
        "gemini" => std::env::var("GEMINI_API_KEY")
            .map_err(|_| anyhow!("Gemini API key not configured"))?,
        "grok" => std::env::var("GROK_API_KEY")
            .map_err(|_| anyhow!("Grok API key not configured"))?,
        _ => return Err(anyhow!("Unsupported AI provider")),
    };

    if !verify_api_key(request.provider, &api_key).await? {
        return Err(anyhow!("Invalid API key for provider {}", request.provider));
    }

    match request.provider.as_str() {
        "gemini" => {
            println!("Using Gemini provider");
            generate_gemini_completion(&api_key, request.messages).await
        }
        "grok" => {
            println!("Using Grok provider");
            generate_grok_completion(&api_key, request.messages).await
        }
        _ => Err(anyhow!("Unsupported AI provider")),
    }
}
