use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct Preferences {
    pub name: Option<String>,
    pub profile_picture: Option<String>,
    pub theme: Option<String>,
}

#[derive(Default)]
pub struct PreferencesState {
    preferences_path: PathBuf,
}

impl PreferencesState {
    pub fn new() -> Self {
        let mut path = tauri::api::path::app_data_dir(&tauri::Config::default()).unwrap();
        path.push("preferences.json");
        println!("Initializing preferences at: {:?}", path);
        Self {
            preferences_path: path,
        }
    }

    pub fn load(&self) -> Result<Preferences, String> {
        println!("Loading preferences from: {:?}", self.preferences_path);
        if !self.preferences_path.exists() {
            println!("No preferences file found, returning default");
            return Ok(Preferences::default());
        }

        match fs::read_to_string(&self.preferences_path) {
            Ok(content) => {
                println!("Read preferences content: {}", content);
                serde_json::from_str(&content).map_err(|e| {
                    format!("Failed to parse preferences: {}", e)
                })
            }
            Err(e) => {
                println!("Error reading preferences file: {}", e);
                Err(format!("Failed to read preferences file: {}", e))
            }
        }
    }

    pub fn save(&self, preferences: &Preferences) -> Result<(), String> {
        println!("Saving preferences: {:?}", preferences);
        
        // Ensure the directory exists
        if let Some(parent) = self.preferences_path.parent() {
            if !parent.exists() {
                println!("Creating preferences directory: {:?}", parent);
                fs::create_dir_all(parent).map_err(|e| {
                    format!("Failed to create preferences directory: {}", e)
                })?;
            }
        }

        // Serialize preferences to JSON
        let json = serde_json::to_string_pretty(preferences)
            .map_err(|e| format!("Failed to serialize preferences: {}", e))?;

        println!("Writing preferences to: {:?}", self.preferences_path);
        println!("Content: {}", json);

        // Write to file
        fs::write(&self.preferences_path, json)
            .map_err(|e| format!("Failed to write preferences file: {}", e))?;

        println!("Successfully saved preferences");
        Ok(())
    }
}

#[tauri::command]
pub async fn get_preferences(state: State<'_, PreferencesState>) -> Result<Preferences, String> {
    println!("Getting preferences");
    state.load()
}

#[tauri::command]
pub async fn set_preferences(
    state: State<'_, PreferencesState>,
    preferences: Preferences,
) -> Result<(), String> {
    println!("Setting preferences: {:?}", preferences);
    state.save(&preferences)
}
