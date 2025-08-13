use crate::utils::get_models_dir;

#[tauri::command]
pub fn model_exists(app: tauri::AppHandle, file_name: String) -> Result<bool, String> {
    println!("[llama_cpp.model_exists] file_name='{}'", file_name);
    let models_dir = get_models_dir(&app)?;
    let target = models_dir.join(file_name);
    Ok(target.exists())
}

#[tauri::command]
pub fn resolve_model_path(app: tauri::AppHandle, file_name: String) -> Result<String, String> {
    println!("[llama_cpp.resolve_model_path] file_name='{}'", file_name);
    let models_dir = get_models_dir(&app)?;
    let target = models_dir.join(file_name);
    Ok(target.to_string_lossy().to_string())
}

#[tauri::command]
pub fn list_models(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    println!("[llama_cpp.list_models] Listing models...");
    use std::fs;
    let models_dir = get_models_dir(&app)?;

    fs::create_dir_all(&models_dir)
        .map_err(|e| format!("Ошибка создания директории моделей: {}", e))?;

    let mut files: Vec<String> = Vec::new();
    for entry in fs::read_dir(&models_dir).map_err(|e| format!("Ошибка чтения директории моделей: {}", e))? {
        let entry = entry.map_err(|e| format!("Ошибка чтения элемента директории: {}", e))?;
        let path = entry.path();
        if path.is_file() {
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                files.push(name.to_string());
            }
        }
    }
    files.sort();
    Ok(files)
}
