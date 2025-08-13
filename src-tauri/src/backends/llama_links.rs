const DEFAULT_TAG: &str = "b6134";

pub fn win_zip_url_with_tag(tag: &str, variant: &str) -> Result<String, String> {
    println!("[llama_links.win_zip_url_with_tag] tag='{}', variant='{}'", tag, variant);
    let base_url = format!("https://github.com/ggml-org/llama.cpp/releases/download/{}", tag);
    match variant {
        "cpu" => Ok(format!("{}/llama-{}-bin-win-cpu-x64.zip", base_url, tag)),
        "cpu_arm" => Ok(format!("{}/llama-{}-bin-win-cpu-arm64.zip", base_url, tag)),
        "cuda_12" => Ok(format!("{}/llama-{}-bin-win-cuda-12.4-x64.zip", base_url, tag)),
        "hip_radeon" => Ok(format!("{}/llama-{}-bin-win-hip-radeon-x64.zip", base_url, tag)),
        "vulkan" => Ok(format!("{}/llama-{}-bin-win-vulkan-x64.zip", base_url, tag)),
        _ => Err("Invalid variant".to_string()),
    }
}

pub fn win_zip_url(variant: &str) -> Result<String, String> {
    println!("[llama_links.win_zip_url] variant='{}'", variant);
    win_zip_url_with_tag(DEFAULT_TAG, variant)
}

pub fn mac_zip_url_with_tag(tag: &str, variant: &str) -> Result<String, String> {
    println!("[llama_links.mac_zip_url_with_tag] tag='{}', variant='{}'", tag, variant);
    let base_url = format!("https://github.com/ggml-org/llama.cpp/releases/download/{}", tag);
    // macOS builds are typically universal zips
    match variant {
        "cpu" | "cpu_arm" | "vulkan" => Ok(format!("{}/llama-{}-bin-macos-universal.zip", base_url, tag)),
        _ => Ok(format!("{}/llama-{}-bin-macos-universal.zip", base_url, tag)),
    }
}

pub fn mac_zip_url(variant: &str) -> Result<String, String> {
    println!("[llama_links.mac_zip_url] variant='{}'", variant);
    mac_zip_url_with_tag(DEFAULT_TAG, variant)
}

pub fn linux_tgz_url_with_tag(tag: &str, variant: &str) -> Result<String, String> {
    println!("[llama_links.linux_tgz_url_with_tag] tag='{}', variant='{}'", tag, variant);
    let base_url = format!("https://github.com/ggml-org/llama.cpp/releases/download/{}", tag);
    match variant {
        "cpu" => Ok(format!("{}/llama-{}-bin-linux-x64.tar.gz", base_url, tag)),
        "cuda_12" => Ok(format!("{}/llama-{}-bin-linux-cuda-12.4-x64.tar.gz", base_url, tag)),
        "vulkan" => Ok(format!("{}/llama-{}-bin-linux-vulkan-x64.tar.gz", base_url, tag)),
        // HIP/ROCm naming varies; this may need adjustment in future
        "hip_radeon" => Ok(format!("{}/llama-{}-bin-linux-rocm-x64.tar.gz", base_url, tag)),
        _ => Err("Invalid variant".to_string()),
    }
}

pub fn linux_tgz_url(variant: &str) -> Result<String, String> {
    println!("[llama_links.linux_tgz_url] variant='{}'", variant);
    linux_tgz_url_with_tag(DEFAULT_TAG, variant)
}
