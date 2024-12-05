use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use std::io;
use base64::{Engine as _, engine::general_purpose};
use chrono;

#[derive(Debug, Serialize, Deserialize)]
pub struct ProfileSettings {
    name: String,
    username: String,
    avatar: String,
}

impl Default for ProfileSettings {
    fn default() -> Self {
        Self {
            name: String::new(),
            username: String::new(),
            avatar: String::new(),
        }
    }
}

pub fn get_profile_path(app_handle: &AppHandle) -> PathBuf {
    let app_dir = app_handle
        .path_resolver()
        .app_data_dir()
        .expect("failed to get app data dir");
    app_dir.join("profile.json")
}

pub fn get_images_path(app_handle: &AppHandle) -> PathBuf {
    let app_dir = app_handle
        .path_resolver()
        .app_data_dir()
        .expect("failed to get app data dir");
    app_dir.join("images")
}

#[tauri::command]
pub async fn load_profile_settings(app_handle: AppHandle) -> Result<ProfileSettings, String> {
    let profile_path = get_profile_path(&app_handle);
    
    if !profile_path.exists() {
        return Ok(ProfileSettings::default());
    }

    fs::read_to_string(profile_path)
        .map_err(|e| e.to_string())
        .and_then(|content| serde_json::from_str(&content).map_err(|e| e.to_string()))
}

#[tauri::command]
pub async fn save_profile_settings(
    app_handle: AppHandle,
    settings: ProfileSettings,
) -> Result<(), String> {
    let profile_path = get_profile_path(&app_handle);

    // Create parent directories if they don't exist
    if let Some(parent) = profile_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(profile_path, content).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn select_image(app_handle: AppHandle) -> Result<String, String> {
    // Open file dialog
    let file_path = rfd::FileDialog::new()
        .add_filter("Image", &["png", "jpg", "jpeg", "gif"])
        .pick_file()
        .ok_or_else(|| "No file selected".to_string())?;

    // Create images directory if it doesn't exist
    let images_dir = get_images_path(&app_handle);
    fs::create_dir_all(&images_dir).map_err(|e| e.to_string())?;

    // Read the image file
    let image_data = fs::read(&file_path).map_err(|e| e.to_string())?;

    // Generate a unique filename
    let extension = file_path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("jpg");
    let filename = format!("avatar_{}.{}", chrono::Utc::now().timestamp(), extension);
    let new_path = images_dir.join(&filename);

    // Copy the image to our app directory
    fs::write(&new_path, &image_data).map_err(|e| e.to_string())?;

    // Convert image to base64
    let base64 = general_purpose::STANDARD.encode(&image_data);
    let data_url = format!("data:image/{};base64,{}", extension, base64);

    Ok(data_url)
}

// Helper function to convert file path to base64 data URL
pub fn file_to_base64(path: &std::path::Path) -> io::Result<String> {
    let image_data = fs::read(path)?;
    let extension = path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("jpg");
    let base64 = general_purpose::STANDARD.encode(&image_data);
    Ok(format!("data:image/{};base64,{}", extension, base64))
}
