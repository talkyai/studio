use std::path::{Path, PathBuf};
use tauri::Manager;

#[derive(Clone, serde::Serialize)]
pub struct ProgressPayload {
    pub progress: u32,
    pub message: String,
}

/// Returns the application data parent directory used across the app.
pub fn get_app_dir(app: &tauri::AppHandle) -> PathBuf {
    println!("[utils.get_app_dir] Resolving application directory...");
    app.path()
        .app_data_dir()
        .expect("Failed to get app data dir")
        .parent()
        .expect("Failed to get parent dir")
        .to_path_buf()
}

/// Returns the application data directory (not parent) as Result for unified error handling.
pub fn get_app_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Не удалось получить app data dir: {}", e))
}

/// Returns path to models directory under app data.
pub fn get_models_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = get_app_data_dir(app)?;
    Ok(dir.join("models"))
}

/// Returns path to runtime/{server}/{variant}/ directory under app data.
pub fn get_runtime_dir(app: &tauri::AppHandle, server: &str, variant: &str) -> Result<PathBuf, String> {
    let dir = get_app_data_dir(app)?;
    Ok(dir.join(format!("runtime/{}/{}/", server, variant)))
}

/// Recursively find first path with any of provided file names up to given depth.
pub fn find_first_with_names(dir: &Path, names: &[&str], depth: u8) -> Option<PathBuf> {
    if depth == 0 || !dir.exists() { return None; }
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_file() {
                if let Some(fname) = p.file_name().and_then(|s| s.to_str()) {
                    if names.iter().any(|n| n.eq_ignore_ascii_case(fname)) {
                        return Some(p);
                    }
                }
            } else if p.is_dir() {
                if let Some(found) = find_first_with_names(&p, names, depth - 1) { return Some(found); }
            }
        }
    }
    None
}

/// Formats a byte size into a human-readable string.
pub fn format_size(bytes: u64) -> String {
    println!("[utils.format_size] Formatting {} bytes", bytes);
    if bytes < 1024 {
        format!("{} B", bytes)
    } else if bytes < 1024 * 1024 {
        format!("{:.1} KB", bytes as f64 / 1024.0)
    } else {
        format!("{:.1} MB", bytes as f64 / (1024.0 * 1024.0))
    }
}
