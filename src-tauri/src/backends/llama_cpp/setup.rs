use std::fs;
use tauri::Manager;

pub fn ensure_dirs_setup(app: &tauri::App) -> Result<(), String> {
    println!("[llama_cpp.ensure_dirs_setup] Ensuring directories synchronously...");
    let model_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    fs::create_dir_all(&model_dir).map_err(|e| e.to_string())?;

    let bin_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("runtime/llama-cpp/bin");
    fs::create_dir_all(&bin_dir).map_err(|e| e.to_string())?;

    Ok(())
}
