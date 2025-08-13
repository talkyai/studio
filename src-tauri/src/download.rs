use std::fs::{self, File, OpenOptions};
use std::io::{self, BufReader, Write, BufWriter};
use std::path::PathBuf;
use std::time::{Duration, Instant};
use futures::StreamExt;
use zip::ZipArchive;
use crate::utils::{format_size, get_app_dir, get_models_dir, ProgressPayload};
use tauri::{Emitter, Manager};
use tokio::time::sleep;

#[tauri::command]
pub async fn download_server_binaries(
    app: tauri::AppHandle,
    server: String,
    variant: String,
    os_override: Option<String>,
    window: tauri::Window,
) -> Result<String, String> {
    println!("[download.download_server_binaries] server='{}', variant='{}'", server, variant);
    // Detect current OS/arch (allow override)
    let os_detected = std::env::consts::OS; // "windows", "macos", "linux"
    let arch = std::env::consts::ARCH; // "x86_64", "aarch64", ...
    let os = os_override
        .as_deref()
        .map(|s| s.to_lowercase())
        .map(|s| match s.as_str() {
            "windows" | "win" | "win32" => "windows".to_string(),
            "macos" | "mac" | "darwin" | "osx" => "macos".to_string(),
            "linux" => "linux".to_string(),
            other => other.to_string(),
        })
        .unwrap_or_else(|| os_detected.to_string());

    // Resolve download URL per server and platform
    let url = match server.as_str() {
        "llama-cpp" => {
            use crate::backends::llama_links as LL;
            match os.as_str() {
                "windows" => LL::win_zip_url(variant.as_str())?,
                "macos" => LL::mac_zip_url(variant.as_str())?,
                "linux" => LL::linux_tgz_url(variant.as_str())?,
                _ => return Err("Platform is not supported".to_string()),
            }
        }
        "ollama" => {
            use crate::backends::ollama::links as L;
            match os.as_str() {
                "windows" => match variant.as_str() {
                    "cpu" => L::win_x64_zip(),
                    "cpu_arm" => L::win_arm64_zip(),
                    "hip_radeon" => L::win_x64_rocm_zip(),
                    _ => L::win_x64_zip(),
                },
                "linux" => {
                    // Select linux asset by arch/variant
                    match (arch, variant.as_str()) {
                        ("aarch64", _) => L::linux_arm64_tgz(),
                        ("x86_64", "hip_radeon") => L::linux_amd64_rocm_tgz(),
                        ("x86_64", _) => L::linux_amd64_tgz(),
                        _ => L::linux_amd64_tgz(),
                    }
                }
                "macos" => {
                    // For mac, provide DMG installer
                    L::mac_dmg()
                }
                _ => return Err("Platform is not supported".to_string()),
            }
        }
        _ => return Err("Unknown server".to_string()),
    };

    println!("Starting download from: {}", url);

    // Emit initial progress
    window
        .emit(
            "binary_download_progress",
            ProgressPayload {
                progress: 0,
                message: "Starting download... ".into(),
            },
        )
        .unwrap();
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    //let app_dir = get_app_dir(&app);
    // Install into variant-specific directory: runtime/{server}/{variant}/
    let target_dir = app_dir.join(format!("runtime/{}/{}/", server, variant));
    // Choose temp file extension based on URL
    let temp_ext = if url.ends_with(".zip") { ".zip" } else if url.ends_with(".tgz") || url.ends_with(".tar.gz") { ".tgz" } else if url.ends_with(".dmg") { ".dmg" } else { ".bin" };
    let temp_path = app_dir.join(format!("{}_{}_temp{}", server, variant, temp_ext));

    // Build a robust HTTP client
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0")
        .connect_timeout(Duration::from_secs(20))
        .timeout(Duration::from_secs(600)) // overall per-request timeout
        .tcp_keepalive(Duration::from_secs(30))
        .pool_idle_timeout(Duration::from_secs(30))
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|e| format!("HTTP client creation error: {}", e))?;

    // Retry loop with resume support for robustness on large downloads / flaky networks
    let mut attempt: u32 = 0;
    let mut last_err: Option<String> = None;
    let mut total_size: u64 = 0; // total file size if known

    loop {
        attempt += 1;

        // Determine how many bytes we already have (resume)
        let mut existing_size: u64 = 0;
        if let Ok(md) = fs::metadata(&temp_path) {
            existing_size = md.len();
        }

        // Build request, add Range if we have partial file
        let mut req = client.get(&url);
        if existing_size > 0 {
            req = req.header(reqwest::header::RANGE, format!("bytes={}-", existing_size));
        }

        let response = match req.send().await {
            Ok(r) => r,
            Err(e) => {
                last_err = Some(format!("Request error: {}", e));
                if attempt < 3 { sleep(Duration::from_secs(2)).await; continue; } else { return Err(last_err.unwrap()); }
            }
        };

        if !(response.status().is_success() || response.status() == reqwest::StatusCode::PARTIAL_CONTENT) {
            let msg = format!("HTTP error: {}", response.status());
            if attempt < 3 { sleep(Duration::from_secs(2)).await; continue; } else { return Err(msg); }
        }

        // Calculate total size
        total_size = if response.status() == reqwest::StatusCode::PARTIAL_CONTENT {
            // Parse Content-Range: bytes start-end/total
            if let Some(range) = response.headers().get(reqwest::header::CONTENT_RANGE) {
                if let Ok(s) = range.to_str() {
                    if let Some((_unit, rest)) = s.split_once(' ') { // e.g. "bytes 100-999/1234"
                        if let Some((_span, total)) = rest.split_once('/') {
                            total.parse::<u64>().unwrap_or(0)
                        } else { 0 }
                    } else { 0 }
                } else { 0 }
            } else { 0 }
        } else {
            response.content_length().unwrap_or(0)
        };

        // Open file for append if we are resuming, else create/truncate
        let file = if existing_size > 0 && response.status() == reqwest::StatusCode::PARTIAL_CONTENT {
            OpenOptions::new().create(true).append(true).open(&temp_path)
                .map_err(|e| format!("Error opening file for append: {}", e))?
        } else {
            // If server ignored Range (status 200), start fresh
            File::create(&temp_path)
                .map_err(|e| format!("Error creating temp file: {}", e))?
        };
        let mut writer = BufWriter::new(file);

        let mut downloaded_new: u64 = 0; // bytes downloaded in this session
        let mut stream = response.bytes_stream();
        let mut last_emit = Instant::now();
        let mut last_emitted_bytes: u64 = 0;

        let mut stream_failed: Option<String> = None;

        while let Some(item) = stream.next().await {
            let chunk = match item {
                Ok(c) => c,
                Err(e) => { stream_failed = Some(format!("Data read error: {}", e)); break; }
            };
            if let Err(e) = writer.write_all(&chunk) { stream_failed = Some(format!("Write error: {}", e)); break; }
            downloaded_new += chunk.len() as u64;

            // Throttle progress updates: emit at most every ~800ms or every +8MiB
            let now = Instant::now();
            let bytes_since = downloaded_new.saturating_sub(last_emitted_bytes);
            if now.duration_since(last_emit) >= Duration::from_millis(30) || bytes_since >= 8 * 1024 * 1024 {
                let total_downloaded = existing_size + downloaded_new;
                let pct = if total_size > 0 {
                    ((total_downloaded as f64 / total_size as f64) * 50.0) as u32
                } else { 25u32.min(49) };
                let msg = if total_size > 0 {
                    format!("Downloaded {} of {} ", format_size(total_downloaded), format_size(total_size))
                } else { format!("Downloaded {} ", format_size(total_downloaded)) };
                let _ = window.emit("binary_download_progress", ProgressPayload { progress: pct, message: msg });
                last_emit = now;
                last_emitted_bytes = downloaded_new;
            }
        }

        // Ensure buffer is flushed
        if let Err(e) = writer.flush() { return Err(format!("Write error (flush): {}", e)); }

        if let Some(err) = stream_failed {
            // Keep partial file for resume on next attempt
            last_err = Some(err);
            if attempt < 3 { sleep(Duration::from_secs(2)).await; continue; } else { return Err(last_err.unwrap()); }
        }

        // Validate size if known
        if total_size > 0 {
            let final_len = fs::metadata(&temp_path).map(|m| m.len()).unwrap_or(existing_size + downloaded_new);
            if final_len < total_size {
                let msg = format!("Downloaded {} of {}, attempting to resume...", format_size(final_len), format_size(total_size));
                last_err = Some(msg);
                if attempt < 3 { sleep(Duration::from_secs(2)).await; continue; } else { return Err(last_err.unwrap()); }
            }
        }

        // Success download; exit retry loop
        break;
    }

    fs::create_dir_all(&target_dir)
        .map_err(|e| format!("Ошибка создания папки: {}", e))?;

    window
        .emit(
            "binary_download_progress",
            ProgressPayload {
                progress: 50,
                message: "Extracting archive...".into(),
            },
        )
        .unwrap();

    // Extract or store depending on extension
    if temp_ext == ".zip" {
        let zip_file = File::open(&temp_path)
            .map_err(|e| format!("Error opening ZIP: {}", e))?;
        let mut archive = ZipArchive::new(BufReader::new(zip_file))
            .map_err(|e| format!("ZIP error: {}", e))?;
        let total_files = archive.len();
        for i in 0..total_files {
            let outpath: PathBuf = {
                let mut file = match archive.by_index(i) {
                    Ok(file) => file,
                    Err(e) => { println!("Archive entry error {}: {}", i, e); continue; }
                };
                let outpath = target_dir.join(file.name());
                if file.name().ends_with('/') {
                    let _ = fs::create_dir_all(&outpath);
                    continue;
                }
                if let Some(p) = outpath.parent() { let _ = fs::create_dir_all(p); }
                let mut outfile = File::create(&outpath).unwrap_or_else(|e| {
                    panic!("Error creating file {}: {}", outpath.display(), e);
                });
                let _ = io::copy(&mut file, &mut outfile);
                outpath
            };
            let _ = outpath;
            let progress = 50 + (i as f64 / total_files as f64 * 50.0) as u32;
            let _ = window.emit("binary_download_progress", ProgressPayload { progress, message: format!("Unpacking {}/{}", i + 1, total_files) });
        }
        let _ = fs::remove_file(&temp_path);
    } else if temp_ext == ".tgz" { 
        use flate2::read::GzDecoder;
        let tar_gz = File::open(&temp_path).map_err(|e| format!("Error opening TGZ: {}", e))?;
        let dec = GzDecoder::new(tar_gz);
        let mut archive = tar::Archive::new(dec);
        // tar::Archive doesn't easily expose total entries without reading twice; just extract
        archive.unpack(&target_dir).map_err(|e| format!("TGZ extraction error: {}", e))?;
        let _ = fs::remove_file(&temp_path);
        let _ = window.emit("binary_download_progress", ProgressPayload { progress: 100, message: "Extraction completed".into() });
    } else if temp_ext == ".dmg" {
        // For macOS, keep the installer in the target directory
        let file_name = url.split('/').last().unwrap_or("installer.dmg");
        let dest = target_dir.join(file_name);
        // Move or copy the downloaded DMG
        let _ = fs::rename(&temp_path, &dest).or_else(|_| {
            fs::copy(&temp_path, &dest).map(|_| ()).map_err(|e| e)
        });
        let _ = window.emit("binary_download_progress", ProgressPayload { progress: 100, message: "DMG file saved".into() });
    } else {
        // Unknown format: leave as-is
        let _ = window.emit("binary_download_progress", ProgressPayload { progress: 100, message: "Download completed".into() });
    }

    println!("[download.download_server_binaries] Completed successfully for server='{}'", server);
        Ok("Binaries installed successfully".to_string())
}

#[tauri::command]
pub async fn download_llama_binaries(
    app: tauri::AppHandle,
    variant: String,
    window: tauri::Window,
) -> Result<String, String> {
    println!("[download.download_llama_binaries] variant='{}'", variant);
    download_server_binaries(app, "llama-cpp".to_string(), variant, None, window).await
}




#[tauri::command]
pub fn check_binary_installed(app: tauri::AppHandle, server: String, variant: String) -> Result<bool, String> {
    println!("[download.check_binary_installed] server='{}', variant='{}'", server, variant);
    let base_dir = crate::utils::get_runtime_dir(&app, &server, &variant)?;

    use crate::utils::find_first_with_names;

    let os = std::env::consts::OS;
    match server.as_str() {
        "llama-cpp" => {
            let candidates: &[&str] = if os == "windows" { &["llama-server.exe"] } else { &["llama-server"] };
            Ok(find_first_with_names(&base_dir.as_path(), candidates, 5).is_some())
        }
        "ollama" => {
            if os == "windows" {
                let candidates = ["ollama.exe", "ollama-windows-amd64.exe", "ollama-windows-arm64.exe"]; 
                Ok(find_first_with_names(&base_dir.as_path(), &candidates, 5).is_some())
            } else if os == "linux" {
                let candidates = ["ollama"]; 
                Ok(find_first_with_names(&base_dir.as_path(), &candidates, 5).is_some())
            } else if os == "macos" {
                // treat presence of the DMG as installed artifact for now
                let dmg = base_dir.join("Ollama.dmg");
                Ok(dmg.exists() || find_first_with_names(&base_dir.as_path(), &["ollama"], 5).is_some())
            } else {
                Ok(false)
            }
        }
        _ => Err("Unknown server".to_string()),
    }
}
