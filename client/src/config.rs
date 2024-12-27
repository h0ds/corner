use dirs;
use serde::{Deserialize, Serialize};
use serde_json;
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;

pub fn get_config_path(_app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = match dirs::config_dir() {
        Some(dir) => dir.join("Corner"),
        None => {
            println!("Failed to get config directory");
            return Err("Failed to get config directory".to_string());
        }
    };

    println!("Config directory: {:?}", app_dir);
    match fs::create_dir_all(&app_dir) {
        Ok(_) => {
            println!("Created config directory");
            Ok(app_dir.join("config.json"))
        }
        Err(e) => {
            println!("Failed to create config directory: {}", e);
            Err(e.to_string())
        }
    }
}

pub fn load_stored_keys(app: &AppHandle) -> Result<serde_json::Value, String> {
    let config_path = get_config_path(app)?;
    if !config_path.exists() {
        return Ok(serde_json::json!({}));
    }

    let content = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

pub fn save_keys(app: &AppHandle, keys: &serde_json::Value) -> Result<(), String> {
    let config_path = get_config_path(app)?;
    println!("Saving keys to: {:?}", config_path);

    let content = match serde_json::to_string_pretty(keys) {
        Ok(c) => c,
        Err(e) => {
            println!("Failed to serialize keys: {}", e);
            return Err(e.to_string());
        }
    };

    println!("Writing config content: {}", content);
    match fs::write(&config_path, content) {
        Ok(_) => {
            println!("Successfully wrote config file");
            Ok(())
        }
        Err(e) => {
            println!("Failed to write config file: {}", e);
            Err(e.to_string())
        }
    }
}

#[derive(Deserialize)]
pub struct SetApiKeysRequest {
    pub anthropic: String,
    pub perplexity: String,
    pub openai: String,
    pub xai: String,
    pub google: String,
    pub elevenlabs: String,
}

#[derive(Deserialize)]
pub struct StoreApiKeyRequest {
    pub provider: String,
    pub key: String,
}

#[derive(Debug, Serialize)]
pub struct StoredApiKeys {
    pub anthropic: Option<String>,
    pub perplexity: Option<String>,
    pub openai: Option<String>,
    pub xai: Option<String>,
    pub google: Option<String>,
    pub elevenlabs: Option<String>,
}

#[tauri::command]
pub fn get_stored_api_keys(app_handle: AppHandle) -> Result<StoredApiKeys, String> {
    let stored_json = load_stored_keys(&app_handle)?;

    let stored_keys = StoredApiKeys {
        anthropic: stored_json
            .get("anthropic")
            .and_then(|v| v.as_str())
            .map(String::from),
        perplexity: stored_json
            .get("perplexity")
            .and_then(|v| v.as_str())
            .map(String::from),
        openai: stored_json
            .get("openai")
            .and_then(|v| v.as_str())
            .map(String::from),
        xai: stored_json
            .get("xai")
            .and_then(|v| v.as_str())
            .map(String::from),
        google: stored_json
            .get("google")
            .and_then(|v| v.as_str())
            .map(String::from),
        elevenlabs: stored_json
            .get("elevenlabs")
            .and_then(|v| v.as_str())
            .map(String::from),
    };

    Ok(stored_keys)
}

#[tauri::command]
pub fn store_api_key(app_handle: AppHandle, request: StoreApiKeyRequest) -> Result<(), String> {
    let provider = request.provider;
    let key = request.key;

    let mut stored_keys = load_stored_keys(&app_handle)?;
    let stored_obj = stored_keys
        .as_object_mut()
        .ok_or("Invalid stored keys format")?;
    stored_obj.insert(provider, serde_json::Value::String(key));

    save_keys(&app_handle, &stored_keys)
}

#[tauri::command]
pub fn set_api_keys(app_handle: AppHandle, request: SetApiKeysRequest) -> Result<(), String> {
    println!("Received API keys request");
    let mut stored_keys = match load_stored_keys(&app_handle) {
        Ok(keys) => keys,
        Err(e) => {
            println!("Failed to load stored keys: {}", e);
            return Err(e);
        }
    };

    let stored_obj = match stored_keys.as_object_mut() {
        Some(obj) => obj,
        None => {
            println!("Invalid stored keys format");
            return Err("Invalid stored keys format".to_string());
        }
    };

    let providers = [
        ("anthropic", &request.anthropic),
        ("perplexity", &request.perplexity),
        ("openai", &request.openai),
        ("xai", &request.xai),
        ("google", &request.google),
        ("elevenlabs", &request.elevenlabs),
    ];

    for (provider, key) in providers.iter() {
        if !key.is_empty() {
            println!("Saving key for {}: {}", provider, "*".repeat(key.len()));
            stored_obj.insert(
                provider.to_string(),
                serde_json::Value::String(key.to_string()),
            );
        } else {
            println!("Removing key for {}", provider);
            stored_obj.remove(*provider);
        }
    }

    match save_keys(&app_handle, &stored_keys) {
        Ok(_) => {
            println!("Successfully saved API keys");
            Ok(())
        }
        Err(e) => {
            println!("Failed to save API keys: {}", e);
            Err(e)
        }
    }
}

pub struct ConfigState {
    initialized: bool,
}

impl ConfigState {
    pub fn new() -> Self {
        ConfigState { initialized: false }
    }
}

#[tauri::command]
pub async fn get_config(app_handle: AppHandle) -> Result<serde_json::Value, String> {
    load_stored_keys(&app_handle)
}

#[tauri::command]
pub async fn set_config(app_handle: AppHandle, config: serde_json::Value) -> Result<(), String> {
    save_keys(&app_handle, &config)
}
