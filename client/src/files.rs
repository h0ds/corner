use tokio::fs;
use std::path::PathBuf;
use std::io;
use base64;
use mime_guess;

#[tauri::command]
pub async fn read_file_content(path: String) -> Result<String, String> {
    println!("Raw input path: {}", path);
    
    // Handle escaped spaces in path
    let unescaped_path = path.replace(r"\ ", " ");
    let path = PathBuf::from(unescaped_path);
    
    println!("Attempting to read file: {}", path.display());
    println!("Path exists: {}", path.exists());
    println!("Is absolute: {}", path.is_absolute());
    println!("Parent: {:?}", path.parent());
    println!("Current dir: {:?}", std::env::current_dir().unwrap_or_default());
    
    // Try to get the absolute path
    let absolute_path = if path.is_absolute() {
        path.clone()
    } else {
        // Try multiple base directories
        let mut tried_paths = Vec::new();
        
        // 1. Try current directory
        let current_dir_path = std::env::current_dir()
            .unwrap_or_default()
            .join(&path);
        tried_paths.push(current_dir_path.clone());
        if current_dir_path.exists() {
            return read_and_encode_file(&current_dir_path).await;
        }
        
        // 2. Try parent directory
        if let Some(parent) = std::env::current_dir().unwrap_or_default().parent() {
            let parent_path = parent.join(&path);
            tried_paths.push(parent_path.clone());
            if parent_path.exists() {
                return read_and_encode_file(&parent_path).await;
            }
        }
        
        // 3. Try absolute path as is
        if path.exists() {
            return read_and_encode_file(&path).await;
        }
        
        // If none of the paths work, return an error with all attempted paths
        return Err(format!(
            "File not found. Tried the following paths:\n{}",
            tried_paths.iter()
                .map(|p| format!("- {}", p.display()))
                .collect::<Vec<_>>()
                .join("\n")
        ));
    };
    
    read_and_encode_file(&absolute_path).await
}

async fn read_and_encode_file(path: &PathBuf) -> Result<String, String> {
    // Read the file content
    match fs::read(&path).await {
        Ok(bytes) => {
            // Check if it's an image or PDF
            let file_name = path.file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("");
                
            if is_image_file(file_name) || is_pdf_file(file_name) {
                // Convert to base64
                let base64 = base64::encode(&bytes);
                let mime_type = mime_guess::from_path(&path)
                    .first_or_octet_stream()
                    .essence_str()
                    .to_string();
                Ok(format!("data:{};base64,{}", mime_type, base64))
            } else {
                // Try to convert to UTF-8 string
                String::from_utf8(bytes)
                    .map_err(|e| format!("Failed to decode file content: {}", e))
            }
        },
        Err(e) => {
            println!("Error reading file: {:?}", e);
            println!("File exists: {}", path.exists());
            println!("Is file: {}", path.is_file());
            println!("Canonicalized path: {:?}", path.canonicalize().ok());
            println!("Parent exists: {:?}", path.parent().map(|p| p.exists()));
            Err(format!("Failed to read file: {} (path: {})", e, path.display()))
        }
    }
}

fn is_image_file(file_name: &str) -> bool {
    let ext = file_name.rsplit('.').next().unwrap_or("").to_lowercase();
    matches!(ext.as_str(), "jpg" | "jpeg" | "png" | "gif" | "webp" | "svg" | "bmp")
}

fn is_pdf_file(file_name: &str) -> bool {
    file_name.to_lowercase().ends_with(".pdf")
}
