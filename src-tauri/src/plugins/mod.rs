use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use tauri::{Manager, Emitter};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FrontendMeta {
    pub entry: Option<String>,
    #[serde(default)]
    pub permissions: Vec<String>,
    // Arbitrary UI placement configuration from metadata.json
    #[serde(default)]
    pub ui: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct BackendMeta {
    pub entry: Option<String>,
    #[serde(default)]
    pub permissions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PluginMetadata {
    pub id: String,
    pub name: String,
    pub version: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub author: String,
    #[serde(default)]
    pub icon: Option<String>,
    // Optional plugin type: "action" (requires user action) or "background" (always active)
    #[serde(default)]
    pub plugin_type: Option<String>,
    #[serde(default)]
    pub frontend: Option<FrontendMeta>,
    #[serde(default)]
    pub backend: Option<BackendMeta>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Plugin {
    pub meta: PluginMetadata,
    pub enabled: bool,
}

#[derive(Debug)]
pub struct PluginManager {
    plugins_dir: PathBuf,
    pub plugins: HashMap<String, Plugin>,
    enabled_map: HashMap<String, bool>,
}

impl PluginManager {
    pub fn new(plugins_dir: impl AsRef<Path>) -> Result<Self, String> {
        let dir = plugins_dir.as_ref().to_path_buf();
        if !dir.exists() {
            fs::create_dir_all(&dir).map_err(|e| format!("create plugins dir failed: {}", e))?;
        }
        let enabled_map = Self::load_enabled_map(&dir)?;
        Ok(Self { plugins_dir: dir, plugins: HashMap::new(), enabled_map })
    }

    pub fn delete_plugin(&mut self, plugin_id: &str) -> Result<(), String> {

        self.enabled_map.remove(plugin_id);
        self.save_enabled_map()?;

        self.plugins.remove(plugin_id);

        let plugin_dir = self.plugins_dir.join(plugin_id);
        if plugin_dir.exists() {
            fs::remove_dir_all(&plugin_dir)
                .map_err(|e| format!("Failed to remove plugin directory: {}", e))?;
        }

        Ok(())
    }

    pub fn load_builtin_plugins(&mut self, app: &tauri::AppHandle) -> Result<(), String> {
        // Built-in plugins are packaged under resources/plugins
        let builtin_plugins_dir = app
            .path()
            .resource_dir()
            .map_err(|e| e.to_string())?
            .join("plugins");

        if !builtin_plugins_dir.exists() {
            return Ok(());
        }

        let entries = fs::read_dir(&builtin_plugins_dir)
            .map_err(|e| format!("Failed to read builtin plugins dir: {}", e))?;

        for entry in entries {
            let entry = entry.map_err(|e| e.to_string())?;
            if entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false) {
                let plugin_name = entry.file_name();
                let dest_path = self.plugins_dir.join(&plugin_name);

                if !dest_path.exists() {
                    copy_dir_all(&entry.path(), &dest_path)
                        .map_err(|e| format!("Failed to copy builtin plugin: {}", e))?;
                }

                self.load_plugin(&dest_path)?;
            }
        }

        Ok(())
    }


    fn enabled_file(dir: &Path) -> PathBuf { dir.join(".enabled.json") }

    fn load_enabled_map(dir: &Path) -> Result<HashMap<String, bool>, String> {
        let path = Self::enabled_file(dir);
        if !path.exists() { return Ok(HashMap::new()); }
        let s = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        let map: HashMap<String, bool> = serde_json::from_str(&s).map_err(|e| e.to_string())?;
        Ok(map)
    }

    fn save_enabled_map(&self) -> Result<(), String> {
        let path = Self::enabled_file(&self.plugins_dir);
        let data = serde_json::to_vec_pretty(&self.enabled_map).map_err(|e| e.to_string())?;
        fs::write(path, data).map_err(|e| e.to_string())
    }

    pub fn load_all(&mut self) -> Result<(), String> {
        let entries = fs::read_dir(&self.plugins_dir).map_err(|e| format!("Failed to read plugins dir: {}", e))?;
        for entry in entries {
            let entry = entry.map_err(|e| e.to_string())?;
            if entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false) {
                let _ = self.load_plugin(&entry.path());
            }
        }
        Ok(())
    }

    fn load_plugin(&mut self, path: &Path) -> Result<(), String> {
        let meta_path = path.join("metadata.json");
        if !meta_path.exists() { return Err("metadata.json not found".into()); }
        let meta: PluginMetadata = serde_json::from_str(
            &fs::read_to_string(&meta_path).map_err(|e| format!("Failed to read metadata: {}", e))?
        ).map_err(|e| format!("Failed to parse metadata: {}", e))?;
        let enabled = *self.enabled_map.get(&meta.id).unwrap_or(&true);
        self.plugins.insert(meta.id.clone(), Plugin { meta, enabled });
        Ok(())
    }

    pub fn toggle(&mut self, plugin_id: &str, enable: bool) -> Result<(), String> {
        self.enabled_map.insert(plugin_id.to_string(), enable);
        if let Some(p) = self.plugins.get_mut(plugin_id) { p.enabled = enable; }
        self.save_enabled_map()
    }

    pub fn install_from_zip(&mut self, zip_path: &Path) -> Result<(), String> {
        if !zip_path.exists() { return Err("zip not found".into()); }
        // Read zip
        let file = fs::File::open(zip_path).map_err(|e| format!("Failed to open zip: {}", e))?;
        let mut archive = zip::ZipArchive::new(file).map_err(|e| format!("Failed to read zip: {}", e))?;

        // Extract to temp dir
        let temp_dir = tempfile::tempdir().map_err(|e| e.to_string())?;
        for i in 0..archive.len() {
            let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
            let outpath = temp_dir.path().join(file.mangled_name());
            if file.name().ends_with('/') {
                fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
            } else {
                if let Some(p) = outpath.parent() { fs::create_dir_all(p).map_err(|e| e.to_string())?; }
                let mut outfile = fs::File::create(&outpath).map_err(|e| e.to_string())?;
                let mut buf = Vec::new();
                file.read_to_end(&mut buf).map_err(|e| e.to_string())?;
                outfile.write_all(&buf).map_err(|e| e.to_string())?;
            }
        }

        // Find metadata.json (support if archive contains top-level folder)
        let meta_path_direct = temp_dir.path().join("metadata.json");
        let meta_path_nested = {
            let mut m = None;
            if let Ok(rd) = fs::read_dir(temp_dir.path()) {
                for e in rd.flatten() {
                    if e.file_type().map(|ft| ft.is_dir()).unwrap_or(false) {
                        let cand = e.path().join("metadata.json");
                        if cand.exists() { m = Some(cand); break; }
                    }
                }
            }
            m
        };
        let meta_path = if meta_path_direct.exists() { meta_path_direct } else { meta_path_nested.ok_or("metadata.json not found in zip")? };
        let meta: PluginMetadata = serde_json::from_str(&fs::read_to_string(&meta_path).map_err(|e| e.to_string())?)
            .map_err(|e| format!("Failed to parse metadata: {}", e))?;

        // Determine plugin base dir (directory containing metadata.json)
        let plugin_src_dir = meta_path.parent().unwrap().to_path_buf();
        let plugin_dest_dir = self.plugins_dir.join(&meta.id);
        if plugin_dest_dir.exists() { fs::remove_dir_all(&plugin_dest_dir).map_err(|e| e.to_string())?; }
        // Move directory
        if let Err(e) = fs::rename(&plugin_src_dir, &plugin_dest_dir) {
            // cross-device fallback: copy recursively
            copy_dir_all(&plugin_src_dir, &plugin_dest_dir).map_err(|e2| format!("move/copy plugin failed: {} | {}", e, e2))?;
        }
        self.load_plugin(&plugin_dest_dir)
    }
}

fn copy_dir_all(src: &Path, dst: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(&entry.path(), &dst.join(entry.file_name()))?;
        } else {
            fs::copy(&entry.path(), &dst.join(entry.file_name()))?;
        }
    }
    Ok(())
}

// Tauri commands layer
#[tauri::command]
pub async fn plugins_get_plugins_list(app: tauri::AppHandle) -> Result<Vec<Plugin>, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?.join("plugins");
    let mut manager = PluginManager::new(dir)?;
    manager.load_all()?;
    Ok(manager.plugins.values().cloned().collect())
}

#[tauri::command]
pub async fn plugins_install_plugin(app: tauri::AppHandle, zip_path: String) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?.join("plugins");
    let mut manager = PluginManager::new(dir)?;
    manager.install_from_zip(Path::new(&zip_path))?;
    let _ = app.emit("plugins_changed", serde_json::json!({"action":"install"}));
    Ok(())
}

#[tauri::command]
pub async fn plugins_toggle_plugin(app: tauri::AppHandle, plugin_id: String, enable: bool) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?.join("plugins");
    let mut manager = PluginManager::new(dir)?;
    manager.load_all()?;
    manager.toggle(&plugin_id, enable)?;
    let _ = app.emit("plugins_changed", serde_json::json!({"action":"toggle","plugin_id":plugin_id,"enable":enable}));
    Ok(())
}

#[tauri::command]
pub async fn plugins_delete_plugin(app: tauri::AppHandle, plugin_id: String) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?.join("plugins");
    let mut manager = PluginManager::new(dir)?;
    manager.load_all()?;
    manager.delete_plugin(&plugin_id)?;
    let _ = app.emit("plugins_changed", serde_json::json!({"action":"delete","plugin_id":plugin_id}));
    Ok(())
}

#[tauri::command]
pub async fn plugins_get_frontend_code(
    app: tauri::AppHandle,
    plugin_id: String,
    entry: Option<String>,
) -> Result<String, String> {
    let entry_rel = entry.unwrap_or_else(|| "frontend/main.js".to_string());

    // Allow only JS module files and disallow traversal
    let lower = entry_rel.to_ascii_lowercase();
    if !(lower.ends_with(".js") || lower.ends_with(".mjs")) {
        return Err("only .js or .mjs entries are allowed".into());
    }
    if entry_rel.contains("..") { // basic traversal guard
        return Err("invalid entry path".into());
    }

    // appDataDir/plugins/{id}/{entry}
    let app_data_path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("plugins")
        .join(&plugin_id)
        .join(&entry_rel);

    if app_data_path.exists() {
        return fs::read_to_string(&app_data_path)
            .map_err(|e| format!("read {} failed: {}", app_data_path.display(), e));
    }

    Err(format!(
        "frontend entry not found for plugin '{}' at '{}' (checked appDataDir only)",
        plugin_id, entry_rel
    ))
}
