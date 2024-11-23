use serde_json;
use std::fs;
use std::path::PathBuf;

pub fn init_cache_dir() -> Result<(), String> {
    let cache_dir = get_cache_dir()?;
    fs::create_dir_all(&cache_dir).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn cache_file(
    file_id: String,
    file_name: String,
    content: String,
    metadata: String,
) -> Result<(), String> {
    let cache_dir = get_cache_dir()?;
    let file_path = cache_dir.join(format!("{}.json", file_id));

    let cache_data = serde_json::json!({
        "file_name": file_name,
        "content": content,
        "metadata": metadata
    });

    fs::write(
        file_path,
        serde_json::to_string_pretty(&cache_data).unwrap(),
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

pub fn load_cached_file(file_id: String) -> Result<serde_json::Value, String> {
    let cache_dir = get_cache_dir()?;
    let file_path = cache_dir.join(format!("{}.json", file_id));

    let content = fs::read_to_string(file_path).map_err(|e| e.to_string())?;
    let json: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    Ok(json)
}

pub fn delete_cached_file(file_id: String) -> Result<(), String> {
    let cache_dir = get_cache_dir()?;
    let file_path = cache_dir.join(format!("{}.json", file_id));

    if file_path.exists() {
        fs::remove_file(file_path).map_err(|e| e.to_string())?;
    }

    Ok(())
}

pub fn get_cache_dir() -> Result<PathBuf, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    Ok(home_dir.join(".corner").join("cache"))
}
