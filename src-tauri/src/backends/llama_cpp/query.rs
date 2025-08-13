use serde_json::{json, Value};

#[tauri::command]
pub async fn query_llamacpp(
    app: tauri::AppHandle,
    prompt: String,
    port: u16,
    temperature: Option<f32>,
    top_k: Option<i32>,
    top_p: Option<f32>,
    min_p: Option<f32>,
    max_tokens: Option<i32>,
    repeat_last_n: Option<i32>,
    messages: Option<Value>,
) -> Result<String, String> {
    println!("[llama_cpp.query_llamacpp] called with prompt_len={}", prompt.len());
    // Read selected model from DB settings
    let model = match crate::db::load_settings(app.clone()) {
        Ok(s) => {
            let m = s.model_repo.trim();
            if m.is_empty() { "local-model".to_string() } else { m.to_string() }
        }
        Err(_) => "local-model".to_string(),
    };

    let temp = temperature.unwrap_or(0.8);
    let tk = top_k.unwrap_or(40);
    let tp = top_p.unwrap_or(0.95);
    let mp = min_p.unwrap_or(0.05);
    let n_pred = max_tokens.unwrap_or(-1);
    let rep_last_n = repeat_last_n.unwrap_or(64);

    // If messages provided, use them; else construct single-turn from prompt
    let msgs = if let Some(v) = messages { v } else { json!([{ "role": "user", "content": prompt }]) };

    let client = reqwest::Client::new();
    let response = client
        .post(&format!("http://127.0.0.1:{}/v1/chat/completions", port))
        .json(&json!({
            "model": model,
            "messages": msgs,
            "temperature": temp,
            "top_k": tk,
            "top_p": tp,
            "min_p": mp,
            "max_tokens": n_pred,
            "repeat_last_n": rep_last_n
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    response.text().await.map_err(|e| e.to_string())
}
