use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use serde_json;
use dirs;

pub fn get_config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = dirs::config_dir()
        .ok_or("Failed to get config directory")?
        .join("corner");
    
    fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    Ok(app_dir.join("config.json"))
}

pub fn load_stored_keys(app: &AppHandle) -> Result<serde_json::Value, String> {
    let config_path = get_config_path(app)?;
    if !config_path.exists() {
        return Ok(serde_json::json!({}));
    }

    let content = fs::read_to_string(config_path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

pub fn save_keys(app: &AppHandle, keys: &serde_json::Value) -> Result<(), String> {
    let config_path = get_config_path(app)?;
    fs::write(
        config_path,
        serde_json::to_string_pretty(keys).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_stored_api_keys(app_handle: AppHandle) -> Result<serde_json::Value, String> {
    load_stored_keys(&app_handle)
}

#[tauri::command]
pub fn store_api_key(app_handle: AppHandle, request: serde_json::Value) -> Result<(), String> {
    let provider = request["provider"]
        .as_str()
        .ok_or("Provider not specified")?;
    let key = request["key"]
        .as_str()
        .ok_or("API key not specified")?;

    let mut stored_keys = load_stored_keys(&app_handle)?;
    let stored_obj = stored_keys.as_object_mut().ok_or("Invalid stored keys format")?;
    stored_obj.insert(provider.to_string(), serde_json::Value::String(key.to_string()));

    save_keys(&app_handle, &stored_keys)
}
