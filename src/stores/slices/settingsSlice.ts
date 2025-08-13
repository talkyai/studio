import { invoke } from '@tauri-apps/api/core';
import { ChatMode, ModelSource } from '../types';

export interface SettingsSlice {
  // Persistence helpers
  loadSettings: () => Promise<void>;
  persistSettings: () => Promise<void>;

  // API provider settings
  apiKey: string;
  apiBase: string; // for OpenAI-compatible providers (LocalAI, LM Studio, FastChat, Jan, rLLM, TensorRT-LLM)
  apiModel: string; // e.g., gpt-4o-mini
  deepseekUrl: string; // full endpoint url for DeepSeek
  deepseekModel: string; // e.g., deepseek-chat

  // Ollama
  ollamaBase: string;
  ollamaModel: string;
  ollamaParamsJson: string;
  setOllamaParamsJson: (v: string) => void;


  // Local model settings
  modelRepo: string;
  modelSource: ModelSource;
  serverPort: number;
  // Generation controls (llama.cpp)
  temperature: number;
  topK: number;
  topP: number;
  minP: number;
  maxTokens: number;
  repeatLastN: number;
  pasteToFileLength: number; // 0 = disable converting long paste to file
  parsePdfAsImage: boolean;
  contextFolder: string;

  // Mode and UI state
  mode: ChatMode;
  activeTab: 'chat' | 'settings';
  // Selected server binary variant (cpu, cuda_12, etc.)
  serverVariant: string;
  // Selected target OS for server installation (windows, macos, linux)
  serverOS: 'windows' | 'macos' | 'linux';

  // Setters
  setApiKey: (key: string) => void;
  setApiBase: (base: string) => void;
  setApiModel: (model: string) => void;
  setDeepseekUrl: (url: string) => void;
  setDeepseekModel: (model: string) => void;
  setOllamaBase: (v: string) => void;
  setOllamaModel: (v: string) => void;
  setModelRepo: (repo: string) => void;
  setModelSource: (source: ModelSource) => void;
  setMode: (mode: ChatMode) => void;
  setActiveTab: (tab: 'chat' | 'settings') => void;
  setServerVariant: (v: string) => void;
  setServerOS: (os: 'windows' | 'macos' | 'linux') => void;
  setServerPort: (port: number) => void;
  setTemperature: (v: number) => void;
  setTopK: (v: number) => void;
  setTopP: (v: number) => void;
  setMinP: (v: number) => void;
  setMaxTokens: (v: number) => void;
  setRepeatLastN: (v: number) => void;
  setPasteToFileLength: (v: number) => void;
  setParsePdfAsImage: (v: boolean) => void;
  setContextFolder: (v: string) => void;

  detectModelSource: (url: string) => ModelSource;
}

export const createSettingsSlice = (
  set: any,
  get: any
): SettingsSlice => ({
  loadSettings: async () => {
    try {
      const s = await invoke<any>('load_settings');
      set({
        mode: (s.mode as any) || 'deepseek',
        apiKey: s.api_key || '',
        apiBase: s.api_base || 'https://api.openai.com/v1',
        apiModel: s.api_model || 'gpt-4o-mini',
        deepseekUrl: s.deepseek_url || 'https://api.deepseek.com/chat/completions',
        deepseekModel: s.deepseek_model || 'deepseek-chat',
        // Ollama
        ollamaBase: s.ollama_base || 'http://127.0.0.1:11434',
        ollamaModel: s.ollama_model || 'llama3',
        ollamaParamsJson: typeof s.ollama_params_json === 'string' ? s.ollama_params_json : '',
        // Local model
        modelRepo: s.model_repo || 'bartowski/Llama-3.2-3B-Instruct-GGUF:Q8_0',
        serverPort: typeof s.server_port === 'number' ? s.server_port : 8080,
        serverVariant: s.server_variant || 'cpu',
        serverOS: 'windows',
        // Generation controls
        temperature: typeof s.temperature === 'number' ? s.temperature : 0.8,
        topK: typeof s.top_k === 'number' ? s.top_k : 40,
        topP: typeof s.top_p === 'number' ? s.top_p : 0.95,
        minP: typeof s.min_p === 'number' ? s.min_p : 0.05,
        maxTokens: typeof s.max_tokens === 'number' ? s.max_tokens : -1,
        repeatLastN: typeof s.repeat_last_n === 'number' ? s.repeat_last_n : 64,
        pasteToFileLength: typeof s.paste_to_file_length === 'number' ? s.paste_to_file_length : 2500,
        parsePdfAsImage: typeof s.parse_pdf_as_image === 'boolean' ? s.parse_pdf_as_image : !!(s.parse_pdf_as_image === 1),
        contextFolder: typeof s.context_folder === 'string' ? s.context_folder : '',
      });
    } catch (e) {
      console.warn('load_settings failed', e);
    }
  },
  persistSettings: async () => {
    const s = get();
    try {
      await invoke('save_settings', {
        settings: {
          mode: s.mode,
          api_key: s.apiKey,
          api_base: s.apiBase,
          api_model: s.apiModel,
          deepseek_url: s.deepseekUrl,
          deepseek_model: s.deepseekModel,
          // Ollama
          ollama_base: s.ollamaBase,
          ollama_model: s.ollamaModel,
          ollama_params_json: s.ollamaParamsJson, 
          // Local
          model_repo: s.modelRepo,
          server_port: s.serverPort,
          server_variant: s.serverVariant,
          // Generation controls
          temperature: s.temperature,
          top_k: s.topK,
          top_p: s.topP,
          min_p: s.minP,
          max_tokens: s.maxTokens,
          repeat_last_n: s.repeatLastN,
          // Extra UI prefs
          paste_to_file_length: s.pasteToFileLength,
          parse_pdf_as_image: s.parsePdfAsImage,
          context_folder: s.contextFolder,
          // Theme (keep existing behavior)
          theme: 'light',
        },
      });
    } catch (e) {
      console.warn('save_settings failed', e);
    }
  },

  // API defaults
  apiKey: '',
  apiBase: 'https://api.openai.com/v1',
  apiModel: 'gpt-4o-mini',
  deepseekUrl: 'https://api.deepseek.com/chat/completions',
  deepseekModel: 'deepseek-chat',
  ollamaBase: 'http://127.0.0.1:11434',
  ollamaModel: 'llama3',
  ollamaParamsJson: '',

  // Local defaults
  modelRepo: 'bartowski/Llama-3.2-3B-Instruct-GGUF:Q8_0',
  modelSource: 'huggingface',
  serverPort: 8080,
  temperature: 0.8,
  topK: 40,
  topP: 0.95,
  minP: 0.05,
  maxTokens: -1,
  repeatLastN: 64,
  pasteToFileLength: 2500,
  parsePdfAsImage: false,
  contextFolder: '',

  mode: 'deepseek',
  activeTab: 'chat',
  serverVariant: 'cpu',
  serverOS: 'windows',

  setApiKey: (key) => {
    set({ apiKey: key });
    get().persistSettings();
  },
  setApiBase: (base) => {
    set({ apiBase: base });
    get().persistSettings();
  },
  setApiModel: (model) => {
    set({ apiModel: model });
    get().persistSettings();
  },
  setDeepseekUrl: (url) => {
    set({ deepseekUrl: url });
    get().persistSettings();
  },
  setDeepseekModel: (model) => {
    set({ deepseekModel: model });
    get().persistSettings();
  },
  setOllamaBase: (v) => set({ ollamaBase: v }),
  setOllamaModel: (v) => set({ ollamaModel: v }),
  setOllamaParamsJson: (v) => { set({ ollamaParamsJson: v }); get().persistSettings(); }, 

  setModelRepo: (repo) => {
    const source = get().detectModelSource(repo);
    set({ modelRepo: repo, modelSource: source });
    get().persistSettings();
  },
  setModelSource: (source) => set({ modelSource: source }),
  setMode: (mode) => {
    set({ mode });
    // Reset binary status when switching provider and re-check installed binaries for the selected one
    set({ binaryDownloadStatus: { progress: 0, status: 'idle', message: '' } });
    try { get().checkBinary(); } catch {}
    get().persistSettings();
  },
  setActiveTab: (tab) => set({ activeTab: tab }),
  setServerVariant: (v) => set({ serverVariant: v }),
  setServerOS: (os) => set({ serverOS: os }),
  setServerPort: (port) => set({ serverPort: port }),

  setTemperature: (v) => { set({ temperature: v }); get().persistSettings(); },
  setTopK: (v) => { set({ topK: v }); get().persistSettings(); },
  setTopP: (v) => { set({ topP: v }); get().persistSettings(); },
  setMinP: (v) => { set({ minP: v }); get().persistSettings(); },
  setMaxTokens: (v) => { set({ maxTokens: v }); get().persistSettings(); },
  setRepeatLastN: (v) => { set({ repeatLastN: v }); get().persistSettings(); },
  setPasteToFileLength: (v) => { set({ pasteToFileLength: v }); get().persistSettings(); },
  setParsePdfAsImage: (v) => { set({ parsePdfAsImage: v }); get().persistSettings(); },
  setContextFolder: (v) => { set({ contextFolder: v }); get().persistSettings(); },

  detectModelSource: (url: string): ModelSource => {
    if (url.includes('huggingface.co')) return 'huggingface';
    if (url.includes('github.com')) return 'github';
    if (url.includes('gitlab.com')) return 'gitlab';
    return 'direct';
  },
});