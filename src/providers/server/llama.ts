import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

function formatCurlProgress(line: string): { pretty: string; pct: number } | null {
  // curl progress columns:
  // % Total, Total, % Received, Received, % Xferd, Xferd, Avg Dload, Avg Upload, Time Total, Time Spent, Time Left, Current Speed
  // Example:
  // 63 3263M 63 2063M 0 0 27.8M 0 0:01:57 0:01:14 0:00:43 24.4M
  const parts = line.trim().split(/\s+/);
  if (parts.length === 12 && /^\d{1,3}$/.test(parts[0]) && /^(?:\d+(?:\.\d+)?)([KMG]?|B)$/.test(parts[1] || '')) {
    const pctTotal = parseInt(parts[0], 10);
    const totalSize = parts[1];
    const pctRecv = parseInt(parts[2], 10);
    const recvSize = parts[3];
    const timeLeft = parts[10];
    const curSpeed = parts[11];
    const pretty = `Downloaded ${pctRecv}% (${recvSize} из ${totalSize}), speed ${curSpeed}/s, left ${timeLeft}`;
    // Prefer received percent; fallback to total percent if NaN
    const pct = Number.isFinite(pctRecv) ? pctRecv : (Number.isFinite(pctTotal) ? pctTotal : 0);
    return { pretty, pct };
  }
  return null;
}

export async function startLlamaServer(set: any, get: any): Promise<void> {
  const { modelRepo } = get();
  // llama.cpp: use only HF repo reference (may include ":<file>" suffix)
  let modelPath: string = '';
  const repoRef = (modelRepo || '').trim();

  if (repoRef) {
    // Internal indicator understood by backend
    modelPath = `hf:${repoRef}`;
  } else {
    // Default to a public HF model if none provided
    const defaultRepo = 'bartowski/Llama-3.2-3B-Instruct-GGUF:Q8_0';
    modelPath = `hf:${defaultRepo}`;
    set({
      downloadStatus: {
        progress: 0,
        status: 'downloading',
        message: `Use default model: ${defaultRepo}`,
      },
    });
  }

  // Prevent concurrent starts
  if (get().isStartingServer) {
    return;
  }
  set({ isStartingServer: true });

  // Start llama.cpp server
  let unlisten: null | (() => void) = null;
  try {
    set({
      downloadStatus: { progress: 0, status: 'downloading', message: 'Starting...' },
    });

    // Listen to server logs to display download progress/errors
    let failed = false;
    unlisten = await listen<{ line: string }>('llamacpp_server_log', (event) => {
      const line = event.payload?.line || '';
      if (!line) return;

      // Try to format curl progress lines nicely; otherwise show raw line
      const formatted = formatCurlProgress(line);
      if (formatted && !failed) {
        set({ downloadStatus: { progress: Math.min(99, Math.max(0, formatted.pct)), status: 'downloading', message: formatted.pretty } });
      } else {
        set({ downloadStatus: { ...get().downloadStatus, status: 'downloading', progress: get().downloadStatus.progress ?? 0, message: line } });
      }

      const lower = line.toLowerCase();
      if (lower.includes('error: model is private') || lower.includes('provide a valid hf token') || lower.includes('unauthorized')) {
        const friendly = 'error: model is private or does not exist; if you are accessing a gated model, please provide a valid HF token';
        const msgs = get().messages || [];
        set({
          messages: [...msgs, { text: friendly, sender: 'ai' }],
          isServerReady: false,
          downloadStatus: { progress: 0, status: 'error', message: friendly },
        });
        failed = true;
      }

      // Parse percent hints from other styles as fallback
      if (!formatted) {
        const percMatch = line.match(/\b(\d{1,3})\s*%/);
        let pct: number | null = null;
        if (percMatch) {
          pct = Math.min(99, Math.max(0, parseInt(percMatch[1], 10)));
        } else {
          const leading = line.match(/^\s*(\d{1,3})\s/);
          if (leading) {
            pct = Math.min(99, Math.max(0, parseInt(leading[1], 10)));
          }
        }
        if (pct !== null && !failed) {
          set({ downloadStatus: { progress: pct, status: 'downloading', message: line } });
        }
      }
    });

    const variant = get().serverVariant || 'cpu';
    const port = get().serverPort || 8080;
    await invoke('start_llamacpp_server', { modelPath, variant, port });

    // Wait until server becomes healthy, but allow long downloads (up to ~10 minutes)
    let healthy = false;
    for (let i = 0; i < 300 && !failed; i++) { // 300 * 2s = ~10 minutes
      await new Promise((res) => setTimeout(res, 2000));
      try {
        const port = get().serverPort || 8080;
        const resp = await fetch(`http://127.0.0.1:${port}/health`, { method: 'GET' });
        healthy = resp.ok;
      } catch {
        try {
          const port = get().serverPort || 8080;
          const resp2 = await fetch(`http://127.0.0.1:${port}/v1/models`, { method: 'GET' });
          healthy = resp2.ok;
        } catch {
          healthy = false;
        }
      }
      if (healthy) break;
    }

    if (!healthy) {
      if (!failed) {
        // If HF path was used and not explicitly failed, assume generic timeout
        const generic = modelPath.startsWith('hf:')
          ? 'Model loading is taking too long or was interrupted. Please check your internet connection and model access (HF token for gated models).'
          : 'Failed to start the local server. Please check the model and logs.';
        const msgs = get().messages || [];
        set({
          messages: [...msgs, { text: generic, sender: 'ai' }],
          isServerReady: false,
          downloadStatus: { progress: 0, status: 'error', message: generic },
        });
      }
      return;
    }

    set({
      isServerReady: true,
      downloadStatus: { progress: 100, status: 'completed', message: 'Server successfully started' },
    });
  } catch (error) {
    const errText = (error instanceof Error) ? error.message : String(error);
    const errMsg = `Ошибка запуска сервера: ${errText}`;
    const msgs = get().messages || [];
    set({
      messages: [...msgs, { text: errMsg, sender: 'ai' }],
      downloadStatus: {
        progress: 0,
        status: 'error',
        message: errMsg,
      },
    });
    throw error;
  } finally {
    if (unlisten) {
      try { unlisten(); } catch {}
    }
    set({ isStartingServer: false });
  }
}

export async function stopLlamaServer(set: any): Promise<void> {
  try {
    await invoke('stop_llamacpp_server');
  } catch (e) {
    console.warn('stop_llamacpp_server failed', e);
  } finally {
    set({ isServerReady: false, downloadStatus: { progress: 0, status: 'idle', message: '' } });
  }
}
