import { invoke } from '@tauri-apps/api/core';
import { ChatMode } from '../types';

export type Project = {
  id: number;
  name: string;
  work_mode: ChatMode | string;
  provider: 'openai' | 'deepseek' | 'ollama' | 'llama' | string;
  server: string;
  model: string;
  meta?: string | null;
  created_at: string;
};

export interface ProjectsSlice {
  projects: Project[];
  activeProjectId?: number | null;
  loadProjects: (workMode?: ChatMode) => Promise<void>;
  saveCurrentAsProject: (name: string) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
  activateProject: (id: number) => Promise<void>;
}

export const createProjectsSlice = (set: any, get: any): ProjectsSlice => ({
  projects: [],
  activeProjectId: null,
  loadProjects: async (workMode?: ChatMode) => {
    try {
      const rows = await invoke<Project[]>('list_projects', { work_mode: workMode });
      set({ projects: rows });
    } catch (e) {
      console.warn('list_projects failed', e);
    }
  },
  saveCurrentAsProject: async (name: string) => {
    const s = get();
    const mode: ChatMode = s.mode;

    // Map current settings to provider/server/model according to mode
    let provider: Project['provider'] = 'openai';
    let server = '';
    let model = '';
    switch (mode) {
      case 'openai':
        provider = 'openai';
        server = s.apiBase;
        model = s.apiModel;
        break;
      case 'deepseek':
        provider = 'deepseek';
        server = s.deepseekUrl;
        model = s.deepseekModel;
        break;
      case 'ollama':
        provider = 'ollama';
        server = s.ollamaBase;
        model = s.ollamaModel;
        break;
      case 'local':
        provider = 'llama';
        server = `llama.cpp:${s.serverVariant}:${s.serverPort}`;
        model = s.modelRepo;
        break;
      default:
        provider = String(mode) as any;
        server = s.apiBase || s.deepseekUrl || s.ollamaBase || '';
        model = s.apiModel || s.deepseekModel || s.ollamaModel || s.modelRepo || '';
    }

    const payload = {
      name,
      work_mode: mode,
      provider,
      server,
      model,
      meta: undefined as string | undefined,
    };

    try {
      const newId = await invoke<number>('save_project', { project: payload });
      await get().loadProjects();
      // Mark newly saved project as active immediately (without auto-starting servers)
      set({ activeProjectId: Number(newId) });
    } catch (e) {
      console.warn('save_project failed', e);
      throw e;
    }
  },
  deleteProject: async (id: number) => {
    try {
      await invoke('delete_project', { id });
      set({ projects: get().projects.filter((p: Project) => p.id !== id) });
    } catch (e) {
      console.warn('delete_project failed', e);
    }
  },
  activateProject: async (id: number) => {
    // ensure we have project
    let p = get().projects.find((x: Project) => x.id === id);
    if (!p) {
      await get().loadProjects();
      p = get().projects.find((x: Project) => x.id === id);
      if (!p) throw new Error('Project not found');
    }

    const prevMode: ChatMode = get().mode;
    const wasReady: boolean = !!get().isServerReady;

    // Stop llama server if it was running
    try {
      if (prevMode === 'local' && wasReady) {
        await get().stopLlamaServer();
      }
    } catch {}

    // Map project back to settings
    const setMode = get().setMode;
    const setApiBase = get().setApiBase;
    const setApiModel = get().setApiModel;
    const setDeepseekUrl = get().setDeepseekUrl;
    const setDeepseekModel = get().setDeepseekModel;
    const setOllamaBase = get().setOllamaBase;
    const setOllamaModel = get().setOllamaModel;
    const setModelRepo = get().setModelRepo;
    const setServerVariant = get().setServerVariant;
    const setServerPort = get().setServerPort;
    const persistSettings = get().persistSettings;

    const wm = (p.work_mode as ChatMode);
    if (wm === 'openai') {
      setApiBase(p.server);
      setApiModel(p.model);
    } else if (wm === 'deepseek') {
      setDeepseekUrl(p.server);
      setDeepseekModel(p.model);
    } else if (wm === 'ollama') {
      setOllamaBase(p.server);
      setOllamaModel(p.model);
    } else if (wm === 'local') {
      // server string format: llama.cpp:{variant}:{port}
      let variant = 'cpu';
      let port = 8080;
      const m = /^llama\.cpp:([^:]+):(\d+)$/.exec(p.server || '');
      if (m) {
        variant = m[1];
        port = parseInt(m[2], 10);
      }
      setServerVariant(variant);
      setServerPort(port);
      setModelRepo(p.model);
    }
    setMode(wm);

    try { await persistSettings(); } catch {}

    // Start relevant server if needed
    try {
      if (wm === 'local') {
        await get().checkBinary();
        await get().startLlamaServer();
      } else if (wm === 'ollama') {
        await get().checkBinary();
        await get().startOllamaServer();
      } else {
        // remote providers: mark not ready
        set({ isServerReady: false });
      }
    } catch (e) {
      console.warn('start server after activate failed', e);
    }

    // Load project prompts into chat messages (as user messages only)
    try {
      const rows = await invoke<any[]>('list_project_prompts', { project_id: p.id });
      const msgs = (rows || []).map(r => ({ text: r.content, sender: 'user' as const }));
      set({ messages: msgs, activeProjectId: p.id });
    } catch (e) {
      set({ activeProjectId: p.id, messages: [] });
    }
  },
});
