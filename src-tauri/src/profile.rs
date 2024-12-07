use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use std::io;
use base64::{Engine as _, engine::general_purpose};
use chrono;
use uuid::Uuid;
use image;

#[derive(Debug, Serialize, Deserialize)]
pub struct ProfileSettings {
    name: String,
    avatar: String,
}

impl Default for ProfileSettings {
    fn default() -> Self {
        Self {
            name: String::new(),
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

    let profile = fs::read_to_string(profile_path)
        .map_err(|e| e.to_string())
        .and_then(|content| serde_json::from_str(&content).map_err(|e| e.to_string()))?;

    Ok(profile)
}

#[tauri::command]
pub async fn save_profile_settings(
    app_handle: AppHandle,
    settings: ProfileSettings,
) -> Result<(), String> {
    let profile_path = get_profile_path(&app_handle);

    // Ensure parent directory exists
    if let Some(parent) = profile_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    // Save profile settings
    let json = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(profile_path, json).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn select_image(app_handle: AppHandle) -> Result<String, String> {
    // Create dialog for selecting an image
    let file_path = tauri::api::dialog::blocking::FileDialogBuilder::new()
        .add_filter("Image", &["png", "jpeg", "jpg"])
        .pick_file()
        .ok_or_else(|| "No file selected".to_string())?;

    // Create images directory if it doesn't exist
    let images_dir = get_images_path(&app_handle);
    fs::create_dir_all(&images_dir).map_err(|e| e.to_string())?;

    // Generate unique filename
    let extension = file_path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("jpg");
    let filename = format!("{}.{}", Uuid::new_v4(), extension);
    let target_path = images_dir.join(&filename);

    // Read and resize image
    let img = image::open(&file_path).map_err(|e| e.to_string())?;
    let resized = img.resize(256, 256, image::imageops::FilterType::Lanczos3);
    
    // Save resized image
    resized.save(&target_path).map_err(|e| e.to_string())?;

    // Convert to base64 for preview
    file_to_base64(&target_path).map_err(|e| e.to_string())
}

// Helper function to convert file path to base64 data URL
fn file_to_base64(path: &std::path::Path) -> io::Result<String> {
    let contents = fs::read(path)?;
    let b64 = general_purpose::STANDARD.encode(&contents);
    
    let mime_type = match path.extension().and_then(|ext| ext.to_str()) {
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        _ => "image/jpeg", // default
    };
    
    Ok(format!("data:{};base64,{}", mime_type, b64))
}
