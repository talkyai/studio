use std::fs::{self, File};
use std::io::Write;
use tauri::{Manager, Emitter};
use futures::StreamExt;
use crate::utils::{format_size, get_models_dir, ProgressPayload};

#[tauri::command]
pub async fn download_model_file(
    app: tauri::AppHandle,
    url: String,
    file_name: String,
    window: tauri::Window,
) -> Result<String, String> {
    println!("[llama_cpp.download_model_file] url='{}', file_name='{}'", url, file_name);

    // Resolve models dir and target path
    let models_dir = get_models_dir(&app)?;
    println!("[llama_cpp.download_model_file] models_dir='{}'", models_dir.display());
    fs::create_dir_all(&models_dir)
        .map_err(|e| format!("Ошибка создания директории моделей: {}", e))?;
    let target_path = models_dir.join(&file_name);
    println!("[llama_cpp.download_model_file] target_path='{}'", target_path.display());

    window
        .emit(
            "model_download_progress",
            ProgressPayload { progress: 0, message: "Starting model download...".into() },
        )
        .unwrap();

    // Build HTTP client
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0")
        .build()
        .map_err(|e| format!("Ошибка создания HTTP клиента: {}", e))?;

    println!("[llama_cpp.download_model_file] sending GET request");
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Ошибка запроса: {}", e))?;

    println!("[llama_cpp.download_model_file] HTTP status={}", response.status());
    if !response.status().is_success() {
        return Err(format!("HTTP ошибка: {}", response.status()));
    }

    let total_size = response.content_length().unwrap_or(0);
    println!("[llama_cpp.download_model_file] content_length={}", total_size);

    // Write to a temporary .part file to avoid partial file confusion
    let temp_path = target_path.with_extension("part");
    let mut file = File::create(&temp_path)
        .map_err(|e| format!("Ошибка создания файла: {}", e))?;

    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();
    let mut last_logged_mb: u64 = 0;

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| format!("Ошибка чтения данных: {}", e))?;
        file.write_all(&chunk)
            .map_err(|e| format!("Ошибка записи: {}", e))?;
        downloaded += chunk.len() as u64;

        // Log every ~5MB additionally for diagnostics
        let cur_mb = downloaded / (1024 * 1024);
        if cur_mb >= last_logged_mb + 5 {
            println!("[llama_cpp.download_model_file] downloaded {}", format_size(downloaded));
            last_logged_mb = cur_mb;
        }

        // Progress calculation
        let progress = if total_size > 0 {
            (downloaded as f64 / total_size as f64 * 100.0) as u32
        } else {
            ((downloaded / (5 * 1024 * 1024)).min(95) as u32)
        };

        window
            .emit(
                "model_download_progress",
                ProgressPayload {
                    progress: progress.min(99),
                    message: if total_size > 0 {
                        format!("Скачано {} из {}", format_size(downloaded), format_size(total_size))
                    } else {
                        format!("Скачано {} (размер неизвестен)", format_size(downloaded))
                    },
                },
            )
            .unwrap();
    }

    // Close and rename temp to final
    drop(file);
    match fs::rename(&temp_path, &target_path) {
        Ok(_) => {}
        Err(e) => {
            println!("[llama_cpp.download_model_file] rename failed: {}. Trying copy+remove...", e);
            // Fallback on cross-device move issues
            fs::copy(&temp_path, &target_path)
                .map_err(|e| format!("Ошибка копирования файла: {}", e))?;
            let _ = fs::remove_file(&temp_path);
        }
    }

    window
        .emit(
            "model_download_progress",
            ProgressPayload { progress: 100, message: "Модель успешно скачана".into() },
        )
        .unwrap();

    println!(
        "[llama_cpp.download_model_file] Completed. Saved to {}",
        target_path.display()
    );
    Ok(target_path.to_string_lossy().to_string())
}
