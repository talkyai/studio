import { useEffect, useMemo, useRef, useState } from 'react';
import { Chip, Stack, Tooltip } from '@mui/material';
import MemoryIcon from '@mui/icons-material/Memory';
import SpeedIcon from '@mui/icons-material/Speed';
import { useTranslation } from 'react-i18next';

interface GpuUsage {
  name: string;
  gpu_percent?: number | null;
  vram_used?: number | null; // bytes
  vram_total?: number | null; // bytes
}

interface SystemUsage {
  cpu_percent: number;
  mem_used: number; // bytes
  mem_total: number; // bytes
  gpus: GpuUsage[];
}

function formatBytes(n?: number | null) {
  if (n == null) return 'N/A';
  const units = ['B','KB','MB','GB','TB'];
  let i = 0; let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i >= 2 ? 1 : 0)} ${units[i]}`;
}

export function SystemMonitor() {
  const [data, setData] = useState<SystemUsage | null>(null);
  const timerRef = useRef<number | null>(null);
  const { t } = useTranslation();

  const fetchUsage = async () => {
    try {
      // dynamic import to keep code-splitting similar to the rest of app
      const { invoke } = await import('@tauri-apps/api/core');
      const d = await invoke<SystemUsage>('get_system_usage');
      setData(d);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchUsage();
    timerRef.current = window.setInterval(fetchUsage, 2000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const memPct = useMemo(() => {
    if (!data) return null;
    if (!data.mem_total) return null;
    const p = (data.mem_used / data.mem_total) * 100;
    return Math.min(100, Math.max(0, p));
  }, [data]);

  return (
    <Tooltip title={t('monitor.tooltip') || 'Мониторинг использования RAM/CPU'}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mr: 1 }}>
        <Chip size="small" icon={<SpeedIcon />} label={`CPU ${data ? data.cpu_percent.toFixed(0) : '--'}%`} />
        <Chip size="small" icon={<MemoryIcon />} label={`RAM ${memPct != null ? memPct.toFixed(0) : '--'}%`} title={data ? `${formatBytes(data.mem_used)} / ${formatBytes(data.mem_total)}` : undefined} />
      </Stack>
    </Tooltip>
  );
}
