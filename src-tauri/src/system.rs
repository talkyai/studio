use serde::Serialize;
use std::sync::Mutex;
use sysinfo::{CpuRefreshKind, MemoryRefreshKind, RefreshKind, System};

#[derive(Serialize, Default)]
pub struct GpuUsage {
    pub name: String,
    pub gpu_percent: Option<f32>,
    pub vram_used: Option<u64>,
    pub vram_total: Option<u64>,
}

#[derive(Serialize, Default)]
pub struct SystemUsage {
    pub cpu_percent: f32,
    pub mem_used: u64,
    pub mem_total: u64,
    pub gpus: Vec<GpuUsage>,
}

pub struct SystemState(pub Mutex<System>);

#[tauri::command]
pub fn get_system_usage(state: tauri::State<SystemState>) -> Result<SystemUsage, String> {
    let mut sys = state.0.lock().map_err(|_| "lock poisoned")?;
    // Refresh CPU and memory. For CPU %, sysinfo needs multiple refreshes over time; keeping the
    // same System instance across calls makes the percentage meaningful between calls.
    sys.refresh_specifics(
        RefreshKind::new()
            .with_cpu(CpuRefreshKind::everything())
            .with_memory(MemoryRefreshKind::everything()),
    );

    // Global CPU percent.
    let cpu_percent = sys.global_cpu_info().cpu_usage();

    // Memory in bytes (sysinfo 0.30 returns in bytes).
    let mem_total = sys.total_memory();
    let mem_used = sys.used_memory();

    // GPU/VRAM: not available cross-platform via sysinfo. Leave empty; UI will show N/A.
    let gpus: Vec<GpuUsage> = Vec::new();

    Ok(SystemUsage {
        cpu_percent,
        mem_used,
        mem_total,
        gpus,
    })
}
