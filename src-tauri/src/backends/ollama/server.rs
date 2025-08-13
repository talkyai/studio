use std::process::Command;
use std::path::PathBuf;

#[tauri::command]
pub fn start_ollama_server(app: tauri::AppHandle) -> Result<(), String> {
    println!("[ollama.server.start] Starting 'ollama serve'...");

    // Try to locate bundled/installed binary first
    let variant = match crate::db::load_settings(app.clone()) {
        Ok(s) => s.server_variant.unwrap_or_else(|| "cpu".to_string()),
        Err(_) => "cpu".to_string(),
    };

    let runtime_dir = match crate::utils::get_runtime_dir(&app, &"ollama".to_string(), &variant) {
        Ok(p) => p,
        Err(e) => {
            println!("[ollama.server.start] get_runtime_dir error: {}", e);
            PathBuf::new()
        }
    };

    // Common windows executable file names
    let candidates = ["ollama.exe", "ollama-windows-amd64.exe", "ollama-windows-arm64.exe"]; 
    let mut used_path: Option<PathBuf> = None;
    if runtime_dir.exists() {
        if let Some(path) = crate::utils::find_first_with_names(&runtime_dir.as_path(), &candidates, 5) {
            used_path = Some(path);
        }
    }

    let mut cmd = if let Some(bin) = used_path {
        println!("[ollama.server.start] Using bundled binary: {}", bin.display());
        let mut c = Command::new(bin);
        // Set current dir to the runtime directory so DLLs are found
        if let Some(dir) = runtime_dir.as_path().to_owned().canonicalize().ok() {
            c.current_dir(dir);
        }
        c
    } else {
        println!("[ollama.server.start] Using PATH executable: ollama");
        Command::new("ollama")
    };

    cmd.arg("serve")
        .spawn()
        .map_err(|e| format!("Ошибка запуска Ollama: {}. Убедитесь, что Ollama установлен и доступен в PATH или установите через 'Установка сервера'.", e))?;

    Ok(())
}
