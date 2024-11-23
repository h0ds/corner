use std::path::{Path, PathBuf};
use percent_encoding;

pub fn get_real_path(path: String, file_name: Option<String>) -> Result<String, String> {
    let path = if cfg!(target_os = "windows") {
        path.replace("\\\\?\\", "")
    } else {
        path
    };

    let path_buf = PathBuf::from(&path);
    let absolute_path = if path_buf.is_absolute() {
        path_buf
    } else {
        std::env::current_dir()
            .map_err(|e| e.to_string())?
            .join(path_buf)
    };

    let canonical_path = absolute_path
        .canonicalize()
        .map_err(|e| e.to_string())?;

    let path_str = canonical_path
        .to_str()
        .ok_or("Failed to convert path to string")?;

    if let Some(name) = file_name {
        let parent = Path::new(path_str)
            .parent()
            .ok_or("Failed to get parent directory")?;
        let new_path = parent.join(name);
        Ok(new_path
            .to_str()
            .ok_or("Failed to convert new path to string")?
            .to_string())
    } else {
        Ok(path_str.to_string())
    }
}
