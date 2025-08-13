use std::process::Command;
use std::fs;
use tauri::{Manager, Emitter};
use crate::utils::{get_runtime_dir, find_first_with_names};

#[tauri::command]
pub fn start_llamacpp_server(app: tauri::AppHandle, model_path: String, variant: String, port: u16) -> Result<(), String> {
    println!("[llama_cpp.start_server] Starting with model_path='{}', variant='{}'", model_path, variant);
    // Resolve base runtime dir for selected variant
    let base_dir = get_runtime_dir(&app, "llama-cpp", &variant)?;
    println!("[llama_cpp.start_server] base_dir='{}'", base_dir.display());

    // Find llama-server.exe under the variant directory
    let server_path = find_first_with_names(&base_dir.as_path(), &["llama-server.exe"], 8)
        .ok_or_else(|| format!("Не найден llama-server.exe в {}", base_dir.display()))?;
    println!("[llama_cpp.start_server] server_path='{}'", server_path.display());

    // Guard: prevent launching ARM binaries on non-ARM hosts
    let host_arch = std::env::consts::ARCH;
    if variant == "cpu_arm" && host_arch != "aarch64" {
        return Err(format!(
            "Вариант 'CPU only (ARM)' поддерживается только на Windows ARM64 (aarch64). Текущая архитектура: {}. Пожалуйста, выберите вариант 'CPU'.",
            host_arch
        ));
    }

    // Choose -ngl depending on selected variant: CPU builds must use 0 to avoid GPU offload
    let ngl_val: &str = match variant.as_str() {
        "cpu" | "cpu_arm" => "0",
        _ => "99",
    };

    // Detect HF reference: we use a special prefix "hf:" coming from the frontend
    let is_hf = model_path.starts_with("hf:");

    use std::process::Stdio;
    let mut cmd = Command::new(server_path);
    cmd.current_dir(&base_dir);
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    if is_hf {
        let hf_ref = model_path.trim_start_matches("hf:");
        println!("[llama_cpp.start_server] Launching llama-server with -hf='{}' -ngl={} on port {}", hf_ref, ngl_val, port);
        cmd.args(&[
            "-hf",
            hf_ref,
            "-c",
            "2048",
            "-ngl",
            ngl_val,
            "--host",
            "127.0.0.1",
            "--port",
            &port.to_string(),
        ]);
    } else {
        // Validate local model path exists when using -m
        if !std::path::Path::new(&model_path).exists() {
            return Err(format!("Файл модели не найден: {}", model_path));
        }
        println!("[llama_cpp.start_server] Launching llama-server with -m on port {} (-ngl={})", port, ngl_val);
        cmd.args(&[
            "-m",
            &model_path,
            "-c",
            "2048",
            "-ngl",
            ngl_val,
            "--host",
            "127.0.0.1",
            "--port",
            &port.to_string(),
        ]);
    }

    let mut child = cmd.spawn().map_err(|e| format!("Ошибка запуска сервера: {}", e))?;

    // Save PID to a global pid file to enable stopping later
    if let Ok(app_dir) = app.path().app_data_dir() {
        let pid_file = app_dir.join("runtime/llama-cpp/llama-server.pid");
        if let Some(parent) = pid_file.parent() { let _ = fs::create_dir_all(parent); }
        let _ = std::fs::write(&pid_file, format!("{}", child.id()));
        println!("[llama_cpp.start_server] wrote pid file: {}", pid_file.display());
    }

    // Stream logs to frontend via events
    let app_handle = app.clone();
    if let Some(stdout) = child.stdout.take() {
        std::thread::spawn(move || {
            use std::io::Read;
            let mut reader = stdout;
            let mut buf = [0u8; 4096];
            let mut line_buf: Vec<u8> = Vec::with_capacity(8192);
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => { // EOF; flush remaining
                        if !line_buf.is_empty() {
                            if let Ok(s) = String::from_utf8(line_buf.clone()) {
                                let _ = app_handle.emit("llamacpp_server_log", serde_json::json!({"line": s}));
                            }
                            line_buf.clear();
                        }
                        break;
                    }
                    Ok(n) => {
                        for &b in &buf[..n] {
                            if b == b'\n' || b == b'\r' {
                                if !line_buf.is_empty() {
                                    if let Ok(s) = String::from_utf8(line_buf.clone()) {
                                        let _ = app_handle.emit("llamacpp_server_log", serde_json::json!({"line": s}));
                                    }
                                    line_buf.clear();
                                }
                            } else {
                                line_buf.push(b);
                                // Avoid unbounded growth if no delimiters appear
                                if line_buf.len() > 32 * 1024 {
                                    if let Ok(s) = String::from_utf8(line_buf.clone()) {
                                        let _ = app_handle.emit("llamacpp_server_log", serde_json::json!({"line": s}));
                                    }
                                    line_buf.clear();
                                }
                            }
                        }
                    }
                    Err(_) => break,
                }
            }
        });
    }
    let app_handle_err = app.clone();
    if let Some(stderr) = child.stderr.take() {
        std::thread::spawn(move || {
            use std::io::Read;
            let mut reader = stderr;
            let mut buf = [0u8; 4096];
            let mut line_buf: Vec<u8> = Vec::with_capacity(8192);
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => {
                        if !line_buf.is_empty() {
                            if let Ok(s) = String::from_utf8(line_buf.clone()) {
                                let _ = app_handle_err.emit("llamacpp_server_log", serde_json::json!({"line": s}));
                            }
                            line_buf.clear();
                        }
                        break;
                    }
                    Ok(n) => {
                        for &b in &buf[..n] {
                            if b == b'\n' || b == b'\r' {
                                if !line_buf.is_empty() {
                                    if let Ok(s) = String::from_utf8(line_buf.clone()) {
                                        let _ = app_handle_err.emit("llamacpp_server_log", serde_json::json!({"line": s}));
                                    }
                                    line_buf.clear();
                                }
                            } else {
                                line_buf.push(b);
                                if line_buf.len() > 32 * 1024 {
                                    if let Ok(s) = String::from_utf8(line_buf.clone()) {
                                        let _ = app_handle_err.emit("llamacpp_server_log", serde_json::json!({"line": s}));
                                    }
                                    line_buf.clear();
                                }
                            }
                        }
                    }
                    Err(_) => break,
                }
            }
        });
    }

    Ok(())
}

#[tauri::command]
pub fn stop_llamacpp_server(app: tauri::AppHandle) -> Result<(), String> {
    // Read pid file and attempt to kill the process (Windows)
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Не удалось получить app data dir: {}", e))?;
    let pid_file = app_dir.join("runtime/llama-cpp/llama-server.pid");
    if !pid_file.exists() {
        return Ok(()); // nothing to stop
    }
    let pid_str = std::fs::read_to_string(&pid_file).map_err(|e| e.to_string())?;
    let pid_str = pid_str.trim();
    if pid_str.is_empty() {
        let _ = std::fs::remove_file(&pid_file);
        return Ok(());
    }
    println!("[llama_cpp.stop_server] Stopping PID {}", pid_str);
    // Use taskkill to kill the process tree
    let status = Command::new("taskkill")
        .args(["/PID", pid_str, "/T", "/F"])
        .status()
        .map_err(|e| format!("Ошибка taskkill: {}", e))?;
    if !status.success() {
        println!("[llama_cpp.stop_server] taskkill exited with status {:?}", status.code());
    }
    let _ = std::fs::remove_file(&pid_file);
    Ok(())
}