use serde::Serialize;
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize)]
pub struct ScanResult {
    pub content: String,
}

fn is_skip_dir(name: &str) -> bool {
    matches!(
        name,
        "node_modules"
            | "dist"
            | "build"
            | "out"
            | "target"
            | ".git"
            | ".next"
            | ".turbo"
            | "vendor"
            | ".idea"
            | ".vscode"
    )
}

fn is_text_ext(ext: &str) -> bool {
    matches!(
        ext,
        "txt" | "md" | "markdown" | "json" | "jsonc" | "yml" | "yaml" | "toml" | "ini" | "cfg" | "conf"
            | "js" | "ts" | "tsx" | "jsx" | "mjs" | "cjs" | "c" | "cc" | "cpp" | "h" | "hpp" | "hh" | "cs" | "java" | "kt" | "kts" | "go" | "rs" | "py" | "rb" | "php" | "swift"
            | "sql" | "html" | "xml" | "svg" | "css" | "scss" | "less" | "sh" | "bash" | "bat" | "ps1" | "gradle" | "properties" | "gitignore" | "gitattributes" | "env" | "dockerfile" | "makefile" | "cmake"
    )
}

fn rel_path(root: &Path, path: &Path) -> String {
    let rp = path.strip_prefix(root).unwrap_or(path);
    let s = rp.to_string_lossy().replace('\u{5c}', "/");
    s
}

#[tauri::command]
pub fn scan_context_folder(
    path: String,
    file_size_limit: Option<u64>,
    total_size_limit: Option<u64>,
    max_files: Option<usize>,
) -> Result<String, String> {
    let root = PathBuf::from(path);
    if !root.exists() || !root.is_dir() {
        return Ok(String::new());
    }
    let file_limit = file_size_limit.unwrap_or(256 * 1024);
    let total_limit = total_size_limit.unwrap_or(1024 * 1024);
    let max_files = max_files.unwrap_or(200);

    let mut queue = vec![root.clone()];
    let mut entries: Vec<PathBuf> = Vec::new();

    while let Some(dir) = queue.pop() {
        let Ok(rd) = fs::read_dir(&dir) else { continue };
        for ent in rd.flatten() {
            let p = ent.path();
            if p.is_dir() {
                if let Some(name) = p.file_name().and_then(|s| s.to_str()) {
                    if is_skip_dir(name) { continue; }
                }
                queue.push(p);
            } else if p.is_file() {
                entries.push(p);
            }
        }
    }

    // Filter by extension and sort for stability
    entries.retain(|p| {
        let mut ok = false;
        if let Some(ext) = p.extension().and_then(|s| s.to_str()) {
            ok = is_text_ext(&ext.to_lowercase());
        } else {
            // Files without extension: consider as text only if small
            ok = true;
        }
        ok
    });
    entries.sort();

    let mut out = String::new();
    out.push_str("### Context from folder\n\n");

    let mut total: u64 = 0;
    let mut used_files = 0usize;

    for p in entries {
        if used_files >= max_files { break; }
        let Ok(meta) = fs::metadata(&p) else { continue };
        if meta.len() > file_limit { continue; }
        if total + meta.len() > total_limit { break; }

        // Read file
        let mut f = match fs::File::open(&p) { Ok(f) => f, Err(_) => continue };
        let mut buf = String::new();
        // Try to read as UTF-8; if invalid, skip
        if f.read_to_string(&mut buf).is_err() { continue; }

        total += buf.len() as u64;
        used_files += 1;

        let rel = rel_path(&root, &p);
        let ext = p.extension().and_then(|s| s.to_str()).unwrap_or("text").to_lowercase();
        out.push_str(&format!("[{}]\n```{}\n", rel, ext));
        if buf.len() as u64 > file_limit {
            let cut = &buf[..file_limit as usize];
            out.push_str(cut);
            out.push_str("\n... [trimmed]\n");
        } else {
            out.push_str(&buf);
            if !buf.ends_with('\n') { out.push('\n'); }
        }
        out.push_str("```\n\n");
    }

    Ok(out)
}
