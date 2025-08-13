#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod utils;
mod download;
mod api;
mod db;
mod backends;
mod context;
mod system;

use tauri::Manager;
use tauri::Emitter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn main() {
    println!("[main] Starting Tauri application setup...");
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            api::query_deepseek,
            api::query_openai,
            backends::llama_cpp::query::query_llamacpp,
            download::download_llama_binaries,
            download::download_server_binaries,
            backends::llama_cpp::server::start_llamacpp_server,
            backends::llama_cpp::server::stop_llamacpp_server,
            backends::llama_cpp::download::download_model_file,
            backends::llama_cpp::models::model_exists,
            backends::llama_cpp::models::resolve_model_path,
            backends::llama_cpp::models::list_models,
            db::load_settings,
            db::save_settings,
            db::save_prompt,
            db::list_prompts,
            db::list_projects,
            db::save_project,
            db::delete_project,
            db::save_project_prompt,
            db::list_project_prompts,
            backends::ollama::query::query_ollama,
            backends::ollama::models::list_ollama_models,
            backends::ollama::server::start_ollama_server,
            backends::ollama::models::pull_ollama_model,
            download::check_binary_installed,
            context::scan_context_folder,
            system::get_system_usage
        ])
        .setup(|app| {
            println!("[main.setup] Ensuring directories and initializing DB...");
            backends::llama_cpp::ensure_dirs_setup(app)?;
            let handle = app.handle();
            db::init_db(&handle)?;
            // Initialize and manage a shared System instance for system monitoring
            use sysinfo::{System, CpuRefreshKind, MemoryRefreshKind, RefreshKind};
            let sys = System::new_with_specifics(
                RefreshKind::new()
                    .with_cpu(CpuRefreshKind::everything())
                    .with_memory(MemoryRefreshKind::everything()),
            );
            app.manage(crate::system::SystemState(std::sync::Mutex::new(sys)));
            println!("[main.setup] Setup completed successfully.");

            #[cfg(debug_assertions)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    println!("[main.setup] Opening devtools (debug mode)...");
                    window.open_devtools();
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Failed to launch Tauri");
    println!("[main] Tauri application terminated.");
}