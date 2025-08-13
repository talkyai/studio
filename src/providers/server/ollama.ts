import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export async function startOllamaServer(set: any, get: any): Promise<void> {
  if (get().isStartingServer) return;

  try {
    if (!get().hasBinary) {
      set({
        isServerReady: false,
        downloadStatus: { progress: 0, status: 'error', message: 'Ollama не установлен. Установите сервер на вкладке "Установка сервера".' },
      });
      return;
    }

    set({ isStartingServer: true });
    set({ downloadStatus: { progress: 0, status: 'downloading', message: 'Запуск Ollama...' } });

    await invoke('start_ollama_server');

    const base: string = (get().ollamaBase || 'http://127.0.0.1:11434').replace(/\/$/, '');
    let ready = false;
    for (let i = 0; i < 30; i++) {
      try {
        const resp = await fetch(`${base}/api/tags`, { method: 'GET' });
        if (resp.ok) { ready = true; break; }
      } catch {}
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (ready) {
      try {
        const model: string = (get().ollamaModel || '').trim();
        let hasModel = false;
        if (model) {
          const resp = await fetch(`${base}/api/tags`, { method: 'GET' });
          if (resp.ok) {
            const data = await resp.json();
            const names = Array.isArray(data?.models) ? data.models.map((m: any) => m.name) : [];
            hasModel = names.includes(model);
          }
        }

        if (!hasModel && model) {
          set({ downloadStatus: { progress: 0, status: 'downloading', message: 'Загружаем модель…' } });
          const unlisten = await listen<{ progress: number; message: string }>('ollama_pull_progress', (event) => {
            const p = Math.max(0, Math.min(100, Math.round(event.payload.progress || 0)));
            set({ downloadStatus: { progress: p, status: p < 100 ? 'downloading' : 'completed', message: event.payload.message || '—' } });
          });
          try {
            await invoke('pull_ollama_model', { baseUrl: base, model });
          } catch (e) {
            set({ downloadStatus: { progress: 0, status: 'error', message: `Ошибка загрузки модели: ${String((e as any)?.message || e)}` } });
            throw e;
          } finally {
            unlisten();
          }
        }
      } catch {}

      set({
        isServerReady: true,
        downloadStatus: { progress: 100, status: 'completed', message: 'Ollama запущен' },
      });
    } else {
      set({
        isServerReady: false,
        downloadStatus: { progress: 0, status: 'error', message: 'Не удалось подтвердить запуск Ollama. Проверьте логи/порт.' },
      });
    }
  } catch (error) {
    set({
      isServerReady: false,
      downloadStatus: { progress: 0, status: 'error', message: `Ошибка запуска Ollama: ${String((error as any)?.message || error)}` },
    });
    throw error;
  } finally {
    set({ isStartingServer: false });
  }
}
