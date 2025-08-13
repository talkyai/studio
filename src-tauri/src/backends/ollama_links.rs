// Centralized links for Ollama binary distributions (Windows zips).
// Source: https://github.com/ollama/ollama/releases
// Tip: use the "latest" indirection to avoid hardcoding version in the app code.

const LATEST_BASE: &str = "https://github.com/ollama/ollama/releases/latest/download";

/// Returns URL for a specific Ollama asset name using latest/download.
/// Examples of asset names:
/// - ollama-windows-amd64.zip
/// - ollama-windows-amd64-rocm.zip
/// - ollama-windows-arm64.zip
/// - Ollama.dmg
/// - OllamaSetup.exe
/// - ollama-linux-amd64.tgz
/// - ollama-linux-amd64-rocm.tgz
/// - ollama-linux-arm64.tgz
/// - ollama-linux-arm64-jetpack5.tgz
/// - ollama-linux-arm64-jetpack6.tgz
pub fn asset_url(asset_name: &str) -> String {
    println!("[ollama_links.asset_url] asset='{}'", asset_name);
    format!("{}/{}", LATEST_BASE, asset_name)
}

/// Convenience helpers for common targets
pub fn win_x64_zip() -> String { asset_url("ollama-windows-amd64.zip") }
pub fn win_x64_rocm_zip() -> String { asset_url("ollama-windows-amd64-rocm.zip") }
pub fn win_arm64_zip() -> String { asset_url("ollama-windows-arm64.zip") }
pub fn win_setup_exe() -> String { asset_url("OllamaSetup.exe") }
pub fn mac_dmg() -> String { asset_url("Ollama.dmg") }
pub fn linux_amd64_tgz() -> String { asset_url("ollama-linux-amd64.tgz") }
pub fn linux_amd64_rocm_tgz() -> String { asset_url("ollama-linux-amd64-rocm.tgz") }
pub fn linux_arm64_tgz() -> String { asset_url("ollama-linux-arm64.tgz") }
pub fn linux_arm64_jetpack5_tgz() -> String { asset_url("ollama-linux-arm64-jetpack5.tgz") }
pub fn linux_arm64_jetpack6_tgz() -> String { asset_url("ollama-linux-arm64-jetpack6.tgz") }
