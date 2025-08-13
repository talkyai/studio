use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingsPayload {
    // Core provider selection
    pub mode: String,
    // OpenAI-compatible
    pub api_key: String,
    pub api_base: String,
    pub api_model: String,
    // DeepSeek
    pub deepseek_url: String,
    pub deepseek_model: String,
    // Ollama
    pub ollama_base: Option<String>,
    pub ollama_model: Option<String>,
    pub ollama_params_json: Option<String>,
    // Local model
    pub model_repo: String,
    pub model_file: Option<String>,
    pub server_port: Option<i64>,
    pub server_variant: Option<String>,
    // Generation controls
    pub temperature: Option<f32>,
    pub top_k: Option<i64>,
    pub top_p: Option<f32>,
    pub min_p: Option<f32>,
    pub max_tokens: Option<i64>,
    pub repeat_last_n: Option<i64>,
    // UI/UX extra
    pub paste_to_file_length: Option<i64>,
    pub parse_pdf_as_image: Option<bool>,
    pub context_folder: Option<String>,
    // Theme
    pub theme: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptRow {
    pub id: i64,
    pub content: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectPromptRow {
    pub id: i64,
    pub project_id: i64,
    pub content: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectRow {
    pub id: i64,
    pub name: String,
    pub work_mode: String,
    pub provider: String,
    pub server: String,
    pub model: String,
    pub meta: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectInput {
    pub name: String,
    pub work_mode: String,
    pub provider: String,
    pub server: String,
    pub model: String,
    pub meta: Option<String>,
}

fn db_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    println!("[db.db_path] Resolving DB path...");
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir error: {}", e))?;
    Ok(dir.join("app.db"))
}

fn ensure_conn(app: &tauri::AppHandle) -> Result<rusqlite::Connection, String> {
    println!("[db.ensure_conn] Opening SQLite connection...");
    let path = db_path(app)?;
    if let Some(parent) = path.parent() { std::fs::create_dir_all(parent).map_err(|e| e.to_string())?; }
    let conn = rusqlite::Connection::open(path).map_err(|e| e.to_string())?;
    Ok(conn)
}

pub fn init_db(app: &tauri::AppHandle) -> Result<(), String> {
    println!("[db.init_db] Initializing database schema...");
    let conn = ensure_conn(app)?;
    conn.execute_batch(
        r#"
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            mode TEXT NOT NULL DEFAULT 'deepseek',
            api_key TEXT NOT NULL DEFAULT '',
            api_base TEXT NOT NULL DEFAULT 'https://api.openai.com/v1',
            api_model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
            deepseek_url TEXT NOT NULL DEFAULT 'https://api.deepseek.com/chat/completions',
            deepseek_model TEXT NOT NULL DEFAULT 'deepseek-chat',
            model_repo TEXT NOT NULL DEFAULT 'bartowski/Llama-3.2-3B-Instruct-GGUF:Q8_0',
            model_file TEXT NOT NULL DEFAULT 'bartowski/Llama-3.2-3B-Instruct-GGUF_Q8_0.gguf',
            theme TEXT NOT NULL DEFAULT 'light'
        );
        CREATE TABLE IF NOT EXISTS prompts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            work_mode TEXT NOT NULL,
            provider TEXT NOT NULL,
            server TEXT NOT NULL,
            model TEXT NOT NULL,
            meta TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS project_prompts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
        "#,
    )
    .map_err(|e| e.to_string())?;

    // Ensure one row exists
    conn.execute("INSERT INTO settings (id) VALUES (1) ON CONFLICT(id) DO NOTHING", [])
        .map_err(|e| e.to_string())?;

    // Migrate: add new columns if they do not exist
    migrate_settings_table(&conn)?;

    Ok(())
}

fn column_exists(conn: &rusqlite::Connection, table: &str, col: &str) -> Result<bool, String> {
    let mut stmt = conn
        .prepare("SELECT 1 FROM pragma_table_info(?) WHERE name = ?")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt
        .query(rusqlite::params![table, col])
        .map_err(|e| e.to_string())?;
    Ok(rows.next().map_err(|e| e.to_string())?.is_some())
}

fn migrate_settings_table(conn: &rusqlite::Connection) -> Result<(), String> {
    // Helper to add column if missing
    let add_col = |sql: &str| -> Result<(), String> {
        conn.execute(sql, []).map(|_| ()).or_else(|_| Ok(()))
    };

    // Check/add columns
    if !column_exists(conn, "settings", "ollama_base")? {
        add_col("ALTER TABLE settings ADD COLUMN ollama_base TEXT NOT NULL DEFAULT 'http://127.0.0.1:11434'")?;
    }
    if !column_exists(conn, "settings", "ollama_model")? {
        add_col("ALTER TABLE settings ADD COLUMN ollama_model TEXT NOT NULL DEFAULT 'llama3'")?;
    }
    if !column_exists(conn, "settings", "server_port")? {
        add_col("ALTER TABLE settings ADD COLUMN server_port INTEGER NOT NULL DEFAULT 8080")?;
    }
    if !column_exists(conn, "settings", "server_variant")? {
        add_col("ALTER TABLE settings ADD COLUMN server_variant TEXT NOT NULL DEFAULT 'cpu'")?;
    }
    if !column_exists(conn, "settings", "temperature")? {
        add_col("ALTER TABLE settings ADD COLUMN temperature REAL NOT NULL DEFAULT 0.8")?;
    }
    if !column_exists(conn, "settings", "top_k")? {
        add_col("ALTER TABLE settings ADD COLUMN top_k INTEGER NOT NULL DEFAULT 40")?;
    }
    if !column_exists(conn, "settings", "top_p")? {
        add_col("ALTER TABLE settings ADD COLUMN top_p REAL NOT NULL DEFAULT 0.95")?;
    }
    if !column_exists(conn, "settings", "min_p")? {
        add_col("ALTER TABLE settings ADD COLUMN min_p REAL NOT NULL DEFAULT 0.05")?;
    }
    if !column_exists(conn, "settings", "max_tokens")? {
        add_col("ALTER TABLE settings ADD COLUMN max_tokens INTEGER NOT NULL DEFAULT -1")?;
    }
    if !column_exists(conn, "settings", "repeat_last_n")? {
        add_col("ALTER TABLE settings ADD COLUMN repeat_last_n INTEGER NOT NULL DEFAULT 64")?;
    }
    if !column_exists(conn, "settings", "paste_to_file_length")? {
        add_col("ALTER TABLE settings ADD COLUMN paste_to_file_length INTEGER NOT NULL DEFAULT 2500")?;
    }
    if !column_exists(conn, "settings", "parse_pdf_as_image")? {
        add_col("ALTER TABLE settings ADD COLUMN parse_pdf_as_image INTEGER NOT NULL DEFAULT 0")?;
    }
    if !column_exists(conn, "settings", "context_folder")? {
        add_col("ALTER TABLE settings ADD COLUMN context_folder TEXT NOT NULL DEFAULT ''")?;
    }
    if !column_exists(conn, "settings", "ollama_params_json")? {
        add_col("ALTER TABLE settings ADD COLUMN ollama_params_json TEXT NOT NULL DEFAULT ''")?;
    }
    Ok(())
}

#[tauri::command]
pub fn load_settings(app: tauri::AppHandle) -> Result<SettingsPayload, String> {
    println!("[db.load_settings] Loading settings...");
    let conn = ensure_conn(&app)?;
    let mut stmt = conn
        .prepare(
            r#"SELECT 
                mode, api_key, api_base, api_model,
                deepseek_url, deepseek_model,
                ollama_base, ollama_model, ollama_params_json,
                model_repo, model_file,
                server_port, server_variant,
                temperature, top_k, top_p, min_p, max_tokens, repeat_last_n,
                paste_to_file_length, parse_pdf_as_image,
                context_folder,
                theme
            FROM settings WHERE id = 1"#, 
        )
        .map_err(|e| e.to_string())?;
    let row = stmt
        .query_row([], |r| {
            Ok(SettingsPayload {
                mode: r.get(0)?,
                api_key: r.get(1)?,
                api_base: r.get(2)?,
                api_model: r.get(3)?,
                deepseek_url: r.get(4)?,
                deepseek_model: r.get(5)?,
                ollama_base: r.get(6).ok(),
                ollama_model: r.get(7).ok(),
                ollama_params_json: r.get(8).ok(),
                model_repo: r.get(9)?,
                model_file: r.get(10).ok(),
                server_port: r.get(11).ok(),
                server_variant: r.get(12).ok(),
                temperature: r.get(13).ok(),
                top_k: r.get(14).ok(),
                top_p: r.get(15).ok(),
                min_p: r.get(16).ok(),
                max_tokens: r.get(17).ok(),
                repeat_last_n: r.get(18).ok(),
                paste_to_file_length: r.get(19).ok(),
                parse_pdf_as_image: r.get::<_, i64>(20).ok().map(|v| v != 0),
                context_folder: r.get(21).ok(),
                theme: r.get(22)?,
            })
        })
        .map_err(|e| e.to_string())?;
    Ok(row)
}

#[tauri::command]
pub fn save_settings(app: tauri::AppHandle, settings: SettingsPayload) -> Result<(), String> {
    println!("[db.save_settings] Saving settings (mode='{}', model_file={:?})", settings.mode, settings.model_file);
    let conn = ensure_conn(&app)?;
    conn.execute(
        "UPDATE settings SET \
            mode=?, api_key=?, api_base=?, api_model=?, \
            deepseek_url=?, deepseek_model=?, \
            ollama_base=COALESCE(?, ollama_base), ollama_model=COALESCE(?, ollama_model), ollama_params_json=COALESCE(?, ollama_params_json), \
            model_repo=?, model_file=COALESCE(?, model_file), \
            server_port=COALESCE(?, server_port), server_variant=COALESCE(?, server_variant), \
            temperature=COALESCE(?, temperature), top_k=COALESCE(?, top_k), top_p=COALESCE(?, top_p), min_p=COALESCE(?, min_p), max_tokens=COALESCE(?, max_tokens), repeat_last_n=COALESCE(?, repeat_last_n), \
            paste_to_file_length=COALESCE(?, paste_to_file_length), parse_pdf_as_image=COALESCE(?, parse_pdf_as_image), \
            context_folder=COALESCE(?, context_folder), \
            theme=? \
         WHERE id=1",
        rusqlite::params![
            settings.mode,
            settings.api_key,
            settings.api_base,
            settings.api_model,
            settings.deepseek_url,
            settings.deepseek_model,
            settings.ollama_base,
            settings.ollama_model,
            settings.ollama_params_json,
            settings.model_repo,
            settings.model_file,
            settings.server_port,
            settings.server_variant,
            settings.temperature,
            settings.top_k,
            settings.top_p,
            settings.min_p,
            settings.max_tokens,
            settings.repeat_last_n,
            settings.paste_to_file_length,
            settings.parse_pdf_as_image.map(|b| if b {1} else {0}),
            settings.context_folder,
            settings.theme,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn save_prompt(app: tauri::AppHandle, content: String) -> Result<(), String> {
    println!("[db.save_prompt] Inserting prompt (len={})", content.len());
    let conn = ensure_conn(&app)?;
    conn.execute(
        "INSERT INTO prompts (content) VALUES (?)",
        rusqlite::params![content],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn list_prompts(app: tauri::AppHandle, limit: Option<i64>) -> Result<Vec<PromptRow>, String> {
    println!("[db.list_prompts] Listing prompts (limit={:?})", limit);
    let conn = ensure_conn(&app)?;
    let q = if limit.unwrap_or(0) > 0 {
        "SELECT id, content, created_at FROM prompts ORDER BY id DESC LIMIT ?"
    } else {
        "SELECT id, content, created_at FROM prompts ORDER BY id DESC"
    };
    let mut stmt = conn.prepare(q).map_err(|e| e.to_string())?;
    let mut rows = if limit.unwrap_or(0) > 0 {
        stmt.query(rusqlite::params![limit.unwrap()]).map_err(|e| e.to_string())?
    } else {
        stmt.query([]).map_err(|e| e.to_string())?
    };
    let mut out = Vec::new();
    while let Some(r) = rows.next().map_err(|e| e.to_string())? {
        out.push(PromptRow {
            id: r.get(0).map_err(|e| e.to_string())?,
            content: r.get(1).map_err(|e| e.to_string())?,
            created_at: r.get(2).map_err(|e| e.to_string())?,
        });
    }
    Ok(out)
}

#[tauri::command]
pub fn save_project_prompt(app: tauri::AppHandle, project_id: i64, content: String) -> Result<(), String> {
    println!("[db.save_project_prompt] project_id={}, len={}", project_id, content.len());
    let conn = ensure_conn(&app)?;
    conn.execute(
        "INSERT INTO project_prompts (project_id, content) VALUES (?, ?)",
        rusqlite::params![project_id, content],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn list_project_prompts(app: tauri::AppHandle, project_id: i64, limit: Option<i64>) -> Result<Vec<ProjectPromptRow>, String> {
    println!("[db.list_project_prompts] project_id={}, limit={:?}", project_id, limit);
    let conn = ensure_conn(&app)?;
    let q = if limit.unwrap_or(0) > 0 {
        "SELECT id, project_id, content, created_at FROM project_prompts WHERE project_id = ? ORDER BY id ASC LIMIT ?"
    } else {
        "SELECT id, project_id, content, created_at FROM project_prompts WHERE project_id = ? ORDER BY id ASC"
    };
    let mut stmt = conn.prepare(q).map_err(|e| e.to_string())?;
    let mut rows = if limit.unwrap_or(0) > 0 {
        stmt.query(rusqlite::params![project_id, limit.unwrap()]).map_err(|e| e.to_string())?
    } else {
        stmt.query(rusqlite::params![project_id]).map_err(|e| e.to_string())?
    };
    let mut out = Vec::new();
    while let Some(r) = rows.next().map_err(|e| e.to_string())? {
        out.push(ProjectPromptRow {
            id: r.get(0).map_err(|e| e.to_string())?,
            project_id: r.get(1).map_err(|e| e.to_string())?,
            content: r.get(2).map_err(|e| e.to_string())?,
            created_at: r.get(3).map_err(|e| e.to_string())?,
        });
    }
    Ok(out)
}

#[tauri::command]
pub fn list_projects(app: tauri::AppHandle, work_mode: Option<String>) -> Result<Vec<ProjectRow>, String> {
    println!("[db.list_projects] Listing projects (work_mode={:?})", work_mode);
    let conn = ensure_conn(&app)?;
    let q = if work_mode.is_some() {
        "SELECT id, name, work_mode, provider, server, model, meta, created_at FROM projects WHERE work_mode = ? ORDER BY created_at DESC"
    } else {
        "SELECT id, name, work_mode, provider, server, model, meta, created_at FROM projects ORDER BY created_at DESC"
    };
    let mut stmt = conn.prepare(q).map_err(|e| e.to_string())?;
    let mut rows = if let Some(wm) = work_mode {
        stmt.query(rusqlite::params![wm]).map_err(|e| e.to_string())?
    } else {
        stmt.query([]).map_err(|e| e.to_string())?
    };
    let mut out = Vec::new();
    while let Some(r) = rows.next().map_err(|e| e.to_string())? {
        out.push(ProjectRow {
            id: r.get(0).map_err(|e| e.to_string())?,
            name: r.get(1).map_err(|e| e.to_string())?,
            work_mode: r.get(2).map_err(|e| e.to_string())?,
            provider: r.get(3).map_err(|e| e.to_string())?,
            server: r.get(4).map_err(|e| e.to_string())?,
            model: r.get(5).map_err(|e| e.to_string())?,
            meta: r.get(6).ok(),
            created_at: r.get(7).map_err(|e| e.to_string())?,
        });
    }
    Ok(out)
}

#[tauri::command]
pub fn save_project(app: tauri::AppHandle, project: ProjectInput) -> Result<i64, String> {
    println!("[db.save_project] Saving project '{}' (mode={}, provider={}, server={}, model={})", project.name, project.work_mode, project.provider, project.server, project.model);
    if project.name.trim().is_empty() { return Err("Project name cannot be empty".to_string()); }
    let conn = ensure_conn(&app)?;
    conn.execute(
        "INSERT INTO projects (name, work_mode, provider, server, model, meta) VALUES (?, ?, ?, ?, ?, ?)",
        rusqlite::params![project.name, project.work_mode, project.provider, project.server, project.model, project.meta],
    ).map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn delete_project(app: tauri::AppHandle, id: i64) -> Result<(), String> {
    println!("[db.delete_project] Deleting project id={} ", id);
    let conn = ensure_conn(&app)?;
    conn.execute("DELETE FROM projects WHERE id = ?", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
