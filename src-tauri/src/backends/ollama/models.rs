use tauri::Emitter;

#[derive(Debug, serde::Deserialize, serde::Serialize, Clone)]
pub struct OllamaTag { pub name: String }
#[derive(Debug, serde::Deserialize, serde::Serialize, Clone)]
pub struct OllamaTagsResp { pub models: Vec<OllamaTag> }

#[tauri::command]
pub async fn list_ollama_models(base_url: String) -> Result<Vec<String>, String> {
    let base = if base_url.trim().is_empty() {
        "http://127.0.0.1:11434".to_string()
    } else {
        base_url.trim_end_matches('/').to_string()
    };
    let url = format!("{}/api/tags", base);
    let client = reqwest::Client::new();
    let resp = client.get(url).send().await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("HTTP {}", resp.status()));
    }
    let tags: OllamaTagsResp = resp.json().await.map_err(|e| e.to_string())?;
    Ok(tags.models.into_iter().map(|m| m.name).collect())
}

use crate::utils::format_size;

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct PullProgressPayload {
    pub progress: u32,
    pub message: String,
}

#[tauri::command]
pub async fn pull_ollama_model(
    base_url: String,
    model: String,
    window: tauri::Window,
) -> Result<(), String> {
    let base = if base_url.trim().is_empty() {
        "http://127.0.0.1:11434".to_string()
    } else {
        base_url.trim_end_matches('/').to_string()
    };
    let url = format!("{}/api/pull", base);

    let body = serde_json::json!({
        "model": model,
        "stream": true
    });

    let client = reqwest::Client::new();
    let resp = client
        .post(url)
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(format!("HTTP {}", resp.status()));
    }

    let mut stream = resp.bytes_stream();
    use futures::StreamExt;
    use std::time::{Duration, Instant};

    let mut last_emit = Instant::now();
    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| e.to_string())?;
        let text = String::from_utf8_lossy(&chunk);
        for line in text.lines() {
            let line_trim = line.trim();
            if line_trim.is_empty() { continue; }
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(line_trim) {
                let status = v.get("status").and_then(|s| s.as_str()).unwrap_or("");
                let total = v.get("total").and_then(|t| t.as_u64()).unwrap_or(0);
                let completed = v.get("completed").and_then(|c| c.as_u64()).unwrap_or(0);
                let digest = v.get("digest").and_then(|d| d.as_str()).unwrap_or("");
                let digest_short = if !digest.is_empty() {
                    let s = if digest.len() > 12 { &digest[..12] } else { digest };
                    format!(" {}", s)
                } else { String::new() };
                let pct = if total > 0 { ((completed as f64 / total as f64) * 99.0) as u32 } else { 0 };
                let status_ru = match status {
                    "pulling" | "downloading" => "Загрузка",
                    "verifying" => "Проверяем",
                    "writing" => "Записываем",
                    "success" => "Готово",
                    other => other,
                };
                let msg = if total > 0 {
                    format!("{}{}: {} из {}", status_ru, digest_short, format_size(completed), format_size(total))
                } else if !status.is_empty() {
                    format!("{}{}", status_ru, digest_short)
                } else {
                    String::new()
                };

                if last_emit.elapsed() >= Duration::from_millis(100) || status == "success" {
                    let _ = window.emit(
                        "ollama_pull_progress",
                        PullProgressPayload { progress: pct.min(99), message: msg },
                    );
                    last_emit = Instant::now();
                }
                if status == "success" {
                    let _ = window.emit(
                        "ollama_pull_progress",
                        PullProgressPayload { progress: 100, message: "Модель загружена".into() },
                    );
                    return Ok(());
                }
            }
        }
    }

    Err("Поток загрузки модели завершился без статуса успеха".into())
}
