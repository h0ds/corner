use std::sync::{Arc, Mutex};
use tauri::State;
use reqwest::Client;
use serde_json::{json, Value};
use anyhow::Result;

const OPENAI_API_BASE: &str = "https://api.openai.com/v1";

#[derive(Default)]
pub struct ApiKeys {
    pub anthropic: Arc<Mutex<Option<String>>>,
    pub perplexity: Arc<Mutex<Option<String>>>,
    pub openai: Arc<Mutex<Option<String>>>,
    pub xai: Arc<Mutex<Option<String>>>,
    pub google: Arc<Mutex<Option<String>>>,
    pub elevenlabs: Arc<Mutex<Option<String>>>,
}

impl ApiKeys {
    pub fn set_key(&self, provider: &str, key: String) {
        let mutex = match provider {
            "anthropic" => &self.anthropic,
            "perplexity" => &self.perplexity,
            "openai" => &self.openai,
            "xai" => &self.xai,
            "google" => &self.google,
            "elevenlabs" => &self.elevenlabs,
            _ => return,
        };
        if let Ok(mut guard) = mutex.lock() {
            *guard = Some(key);
        }
    }

    fn get_key(&self, provider: &str) -> Option<String> {
        let mutex = match provider {
            "anthropic" => &self.anthropic,
            "perplexity" => &self.perplexity,
            "openai" => &self.openai,
            "xai" => &self.xai,
            "google" => &self.google,
            "elevenlabs" => &self.elevenlabs,
            _ => return None,
        };
        mutex.lock().ok()?.clone()
    }
}

pub struct ApiState {
    pub keys: ApiKeys,
    client: Arc<Client>,
}

impl ApiState {
    pub fn new() -> Self {
        Self {
            keys: ApiKeys::default(),
            client: Arc::new(Client::new()),
        }
    }

    async fn make_request(&self, endpoint: &str, body: Value, api_key: &str) -> Result<Value, String> {
        let response = self.client
            .post(&format!("{}{}", OPENAI_API_BASE, endpoint))
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !response.status().is_success() {
            let error = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(format!("API request failed: {}", error));
        }

        response.json::<Value>()
            .await
            .map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn get_completion(prompt: String, state: State<'_, ApiState>) -> Result<String, String> {
    let api_key = state.keys.get_key("openai")
        .ok_or_else(|| "OpenAI API key not found".to_string())?;

    let body = json!({
        "model": "gpt-3.5-turbo-instruct",
        "prompt": prompt,
        "max_tokens": 1000,
        "temperature": 0.7
    });

    let response = state.make_request("/completions", body, &api_key).await?;
    
    response["choices"][0]["text"]
        .as_str()
        .map(|s| s.trim().to_string())
        .ok_or_else(|| "Invalid response format".to_string())
}

#[tauri::command]
pub async fn get_chat_completion(messages: Vec<Value>, state: State<'_, ApiState>) -> Result<String, String> {
    let api_key = state.keys.get_key("openai")
        .ok_or_else(|| "OpenAI API key not found".to_string())?;

    let body = json!({
        "model": "gpt-3.5-turbo",
        "messages": messages,
        "temperature": 0.7
    });

    let response = state.make_request("/chat/completions", body, &api_key).await?;
    
    response["choices"][0]["message"]["content"]
        .as_str()
        .map(|s| s.trim().to_string())
        .ok_or_else(|| "Invalid response format".to_string())
}

#[tauri::command]
pub async fn get_embeddings(text: String, state: State<'_, ApiState>) -> Result<Vec<f32>, String> {
    let api_key = state.keys.get_key("openai")
        .ok_or_else(|| "OpenAI API key not found".to_string())?;

    let body = json!({
        "model": "text-embedding-ada-002",
        "input": text
    });

    let response = state.make_request("/embeddings", body, &api_key).await?;
    
    response["data"][0]["embedding"]
        .as_array()
        .ok_or_else(|| "Invalid response format".to_string())?
        .iter()
        .map(|v| v.as_f64().ok_or_else(|| "Invalid embedding value".to_string()).map(|f| f as f32))
        .collect::<Result<Vec<f32>, String>>()
}

#[tauri::command]
pub async fn get_models(state: State<'_, ApiState>) -> Result<Vec<String>, String> {
    let api_key = state.keys.get_key("openai")
        .ok_or_else(|| "OpenAI API key not found".to_string())?;

    let response = state.make_request("/models", json!({}), &api_key).await?;
    
    let models = response["data"]
        .as_array()
        .ok_or_else(|| "Invalid response format".to_string())?
        .iter()
        .filter_map(|model| model["id"].as_str().map(String::from))
        .filter(|id| id.contains("gpt") || id.contains("text-embedding"))
        .collect::<Vec<String>>();

    if models.is_empty() {
        Err("No compatible models found".to_string())
    } else {
        Ok(models)
    }
}

pub mod chat;
pub mod speech;
