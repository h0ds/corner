use base64;
use mime_guess;
use std::path::PathBuf;
use tokio::fs;

pub async fn read_file_content(path: String) -> Result<String, String> {
    println!("Raw input path: {}", path);

    // Handle escaped spaces in path
    let unescaped_path = path.replace(r"\ ", " ");
    let path = PathBuf::from(unescaped_path);

    println!("Attempting to read file: {}", path.display());

    // Try multiple base directories
    let mut tried_paths = Vec::new();

    // 1. Try current directory
    let current_dir_path = std::env::current_dir().unwrap_or_default().join(&path);
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
    Err(format!(
        "File not found. Tried the following paths:\n{}",
        tried_paths
            .iter()
            .map(|p| format!("- {}", p.display()))
            .collect::<Vec<_>>()
            .join("\n")
    ))
}

async fn read_and_encode_file(path: &PathBuf) -> Result<String, String> {
    match fs::read(&path).await {
        Ok(bytes) => {
            let file_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");

            // Detect if it's a binary file that needs base64 encoding
            if is_binary_file(file_name) {
                let base64 = base64::encode(&bytes);
                let mime_type = get_mime_type(file_name);
                Ok(format!("data:{};base64,{}", mime_type, base64))
            } else {
                // Try to convert to UTF-8 string
                String::from_utf8(bytes)
                    .map_err(|e| format!("Failed to decode file content: {}", e))
            }
        }
        Err(e) => {
            println!("Error reading file: {:?}", e);
            println!("File exists: {}", path.exists());
            println!("Is file: {}", path.is_file());
            println!("Parent exists: {:?}", path.parent().map(|p| p.exists()));
            Err(format!(
                "Failed to read file: {} (path: {})",
                e,
                path.display()
            ))
        }
    }
}

fn is_binary_file(file_name: &str) -> bool {
    is_image_file(file_name) || is_pdf_file(file_name) || is_epub_file(file_name)
}

fn get_mime_type(file_name: &str) -> String {
    if let Some(mime_type) = mime_guess::from_path(file_name).first() {
        mime_type.essence_str().to_string()
    } else {
        // Fallback mime types based on extension
        let ext = file_name.rsplit('.').next().unwrap_or("").to_lowercase();
        match ext.as_str() {
            "pdf" => "application/pdf".to_string(),
            "epub" => "application/epub+zip".to_string(),
            "jpg" | "jpeg" => "image/jpeg".to_string(),
            "png" => "image/png".to_string(),
            "gif" => "image/gif".to_string(),
            "webp" => "image/webp".to_string(),
            "svg" => "image/svg+xml".to_string(),
            "bmp" => "image/bmp".to_string(),
            _ => "application/octet-stream".to_string(),
        }
    }
}

fn is_image_file(file_name: &str) -> bool {
    let ext = file_name.rsplit('.').next().unwrap_or("").to_lowercase();
    matches!(
        ext.as_str(),
        "jpg" | "jpeg" | "png" | "gif" | "webp" | "svg" | "bmp"
    )
}

fn is_pdf_file(file_name: &str) -> bool {
    file_name.to_lowercase().ends_with(".pdf")
}

fn is_epub_file(file_name: &str) -> bool {
    file_name.to_lowercase().ends_with(".epub")
}
