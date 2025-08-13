import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { DownloadStatus, ProgressPayload } from '../types';

export interface ServerSlice {
  // Server/binaries
  hasBinary: boolean;
  isServerReady: boolean;
  isStartingServer: boolean;
  downloadStatus: DownloadStatus;
  binaryDownloadStatus: {
    progress: number;
    status: 'idle' | 'downloading' | 'completed' | 'error';
    message: string;
  };

  // Generic wrappers (backward compatible)
  checkBinary: () => Promise<void>;
  downloadBinary: (variant: string, server?: 'llama-cpp' | 'ollama') => Promise<void>;
  startLocalServer: () => Promise<void>;
  listAvailableModels: () => Promise<string[]>;

  // Server-specific helpers (new)
  checkServerBinary: (server: 'llama-cpp' | 'ollama') => Promise<void>;
  downloadServerBinary: (variant: string, server: 'llama-cpp' | 'ollama') => Promise<void>;
  startLlamaServer: () => Promise<void>;
  startOllamaServer: () => Promise<void>;
  stopLlamaServer: () => Promise<void>;
}

export const createServerSlice = (set: any, get: any): ServerSlice => ({
  hasBinary: false,
  isServerReady: false,
  isStartingServer: false,
  downloadStatus: { progress: 0, status: 'idle', message: '' },
  binaryDownloadStatus: { progress: 0, status: 'idle', message: '' },

  checkServerBinary: async (server: 'llama-cpp' | 'ollama') => {
    let hasBinary = false;
    try {
      const variant = get().serverVariant || 'cpu';
      hasBinary = await invoke<boolean>('check_binary_installed', { server, variant });
    } catch (e) {
      console.warn('check_binary_installed failed', e);
    }
    set({ hasBinary });

    const cur = get().binaryDownloadStatus;
    if (cur.status !== 'downloading') {
      if (hasBinary) {
        set({ binaryDownloadStatus: { progress: 100, status: 'completed', message: 'Server installed' } });
      } else {
        set({ binaryDownloadStatus: { progress: 0, status: 'idle', message: '' } });
      }
    }
  },

  checkBinary: async () => {
    const { mode } = get();
    // Determine which server to check based on current mode
    let server: 'llama-cpp' | 'ollama' | null = null;
    if (mode === 'local') server = 'llama-cpp';
    else if (mode === 'ollama') server = 'ollama';

    if (!server) {
      set({ hasBinary: false });
      // Reset status for API providers
      const cur = get().binaryDownloadStatus;
      if (cur.status !== 'downloading') {
        set({ binaryDownloadStatus: { progress: 0, status: 'idle', message: '' } });
      }
      return;
    }

    await get().checkServerBinary(server);
  },

  downloadServerBinary: async (variant: string, server: 'llama-cpp' | 'ollama') => {
    set({
      binaryDownloadStatus: {
        progress: 0,
        status: 'downloading',
        message: 'Preparing...',
      },
    });

    const unlisten = await listen<ProgressPayload>('binary_download_progress', (event) => {
      set({
        binaryDownloadStatus: {
          progress: event.payload.progress,
          status: 'downloading',
          message: event.payload.message,
        },
      });
    });

    try {
      await invoke('download_server_binaries', { server, variant, os_override: get().serverOS });
      set({
        hasBinary: true,
        binaryDownloadStatus: {
          progress: 100,
          status: 'completed',
          message: 'Server successfully installed',
        },
      });
      try { await get().checkServerBinary(server); } catch {}
    } catch (error) {
      set({
        binaryDownloadStatus: {
          progress: 0,
          status: 'error',
          message: `Error: ${error}`,
        },
      });
    } finally {
      unlisten();
    }
  },

  downloadBinary: async (variant: string, server: 'llama-cpp' | 'ollama' = 'llama-cpp') => {
    await get().downloadServerBinary(variant, server);
  },

  // Server-specific starters
  startLlamaServer: async () => {
    const { startLlamaServer } = await import('../../providers/server/llama');
    return await startLlamaServer(set, get);
  },

  startOllamaServer: async () => {
    const { startOllamaServer } = await import('../../providers/server/ollama');
    return await startOllamaServer(set, get);
  },

  stopLlamaServer: async () => {
    const { stopLlamaServer } = await import('../../providers/server/llama');
    return await stopLlamaServer(set);
  },

  startLocalServer: async () => {
    const { mode } = get();
    if (mode === 'local') {
      return await get().startLlamaServer();
    }
    if (mode === 'ollama') {
      return await get().startOllamaServer();
    }
  },

  listAvailableModels: async () => {
    return await invoke<string[]>('list_models');
  },
});