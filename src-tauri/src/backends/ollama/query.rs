use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage { pub role: String, pub content: String }

fn merge_json(a: &mut Value, b: &Value) {
    match (a, b) {
        (Value::Object(a_map), Value::Object(b_map)) => {
            for (k, v) in b_map {
                if k == "options" {
                    // deep-merge options specifically
                    let entry = a_map.entry(k.clone()).or_insert(Value::Object(serde_json::Map::new()));
                    merge_json(entry, v);
                } else {
                    let entry = a_map.entry(k.clone()).or_insert(Value::Null);
                    if entry.is_object() && v.is_object() {
                        merge_json(entry, v);
                    } else {
                        *entry = v.clone();
                    }
                }
            }
        }
        _ => {}
    }
}

#[tauri::command]
pub async fn query_ollama(
    base_url: String,
    model: String,
    prompt: String,
    messages: Option<Vec<ChatMessage>>,
    temperature: Option<f32>,
    top_k: Option<i32>,
    top_p: Option<f32>,
    max_tokens: Option<i32>,
    advanced_params: Option<Value>,
) -> Result<String, String> {
    let msg_len = messages.as_ref().map(|m| m.len()).unwrap_or(0);
    println!("[ollama.query_ollama] base_url='{}', model='{}', prompt_len={}, messages_len={}", base_url, model, prompt.len(), msg_len);
    let base = if base_url.trim().is_empty() {
        "http://127.0.0.1:11434".to_string()
    } else {
        base_url.trim_end_matches('/').to_string()
    };
    let url = format!("{}/api/chat", base);

    let temp = temperature.unwrap_or(0.8);
    let tk = top_k.unwrap_or(40);
    let tp = top_p.unwrap_or(0.95);
    let n_pred = max_tokens.unwrap_or(-1);

    let msgs_val = if let Some(list) = messages {
        serde_json::to_value(list).unwrap_or_else(|_| json!([{"role":"user","content":prompt}]))
    } else {
        json!([{"role":"user","content":prompt}])
    };

    let mut body = json!({
        "model": model,
        "messages": msgs_val,
        "stream": false,
        "options": {
            "temperature": temp,
            "top_k": tk,
            "top_p": tp,
            "num_predict": n_pred
        }
    });

    if let Some(extra) = advanced_params {
        merge_json(&mut body, &extra);
    }

    let client = reqwest::Client::new();
    let resp = client
        .post(url)
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    resp.text().await.map_err(|e| e.to_string())
}
