use serde_json::json;

#[tauri::command]
pub async fn query_deepseek(api_key: String, base_url: String, model: String, prompt: String) -> Result<String, String> {
    println!("[api.query_deepseek] called with base_url='{}', model='{}', prompt_len={} (api_key hidden)", base_url, model, prompt.len());
    let url = if base_url.trim().is_empty() {
        "https://api.deepseek.com/chat/completions".to_string()
    } else {
        base_url.trim().to_string()
    };

    let mdl = if model.trim().is_empty() { "deepseek-chat".to_string() } else { model };

    let client = reqwest::Client::new();
    let mut req = client.post(&url);
    if !api_key.trim().is_empty() {
        req = req.header("Authorization", format!("Bearer {}", api_key));
    }

    let response = req
        .json(&json!({
            "model": mdl,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    response.text().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn query_openai(api_key: String, base_url: String, model: String, prompt: String) -> Result<String, String> {
    println!("[api.query_openai] called with base_url='{}', model='{}', prompt_len={} (api_key hidden)", base_url, model, prompt.len());
    let base = base_url.trim_end_matches('/').to_string();
    let url = format!("{}/chat/completions", base);

    let client = reqwest::Client::new();
    let mut req = client.post(&url);
    if !api_key.trim().is_empty() {
        req = req.header("Authorization", format!("Bearer {}", api_key));
    }
    let response = req
        .json(&json!({
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    response.text().await.map_err(|e| e.to_string())
}

