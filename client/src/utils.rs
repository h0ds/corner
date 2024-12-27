use std::path::Path;

pub fn get_real_path(path: String, file_name: Option<String>) -> Result<String, String> {
    let path = Path::new(&path);
    let mut real_path = path.to_path_buf();

    if let Some(name) = file_name {
        real_path = real_path.join(name);
    }

    real_path
        .to_str()
        .ok_or_else(|| "Invalid path".to_string())
        .map(|s| s.to_string())
}
