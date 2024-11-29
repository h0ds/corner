use tokio::fs;
use std::path::PathBuf;
use std::io;

#[tauri::command]
pub async fn read_file_content(path: String) -> Result<String, String> {
    println!("Raw input path: {}", path);
    
    // Convert the path string to a PathBuf
    let path = PathBuf::from(path);
    
    println!("Attempting to read file: {}", path.display());
    
    // Read the file content
    match fs::read_to_string(&path).await {
        Ok(content) => Ok(content),
        Err(e) => {
            println!("Error reading file: {:?}", e);
            println!("Current directory: {:?}", std::env::current_dir().unwrap_or_default());
            println!("File exists: {}", path.exists());
            println!("Is file: {}", path.is_file());
            Err(format!("Failed to read file: {}", e))
        }
    }
}
