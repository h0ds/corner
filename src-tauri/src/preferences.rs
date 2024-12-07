use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct Preferences {
    pub name: Option<String>,
    pub profile_picture: Option<String>,
    pub theme: Option<String>,
}

impl Preferences {
    pub fn load(app_handle: &AppHandle) -> Self {
        let path = get_preferences_path(app_handle);
        if let Ok(contents) = fs::read_to_string(path) {
            serde_json::from_str(&contents).unwrap_or_default()
        } else {
            Self::default()
        }
    }

    pub fn save(&self, app_handle: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
        let path = get_preferences_path(app_handle);
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let json = serde_json::to_string_pretty(self)?;
        fs::write(path, json)?;
        Ok(())
    }
}

fn get_preferences_path(app_handle: &AppHandle) -> PathBuf {
    let mut path = app_handle.path().app_data().expect("Failed to get app data dir");
    path.push("preferences.json");
    path
}

#[tauri::command]
pub async fn get_preferences(app_handle: AppHandle) -> Result<Preferences, String> {
    Ok(Preferences::load(&app_handle))
}

#[tauri::command]
pub async fn set_preferences(app_handle: AppHandle, preferences: Preferences) -> Result<(), String> {
    preferences
        .save(&app_handle)
        .map_err(|e| format!("Failed to save preferences: {}", e))
}
