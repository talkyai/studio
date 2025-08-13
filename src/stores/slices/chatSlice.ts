import { invoke } from '@tauri-apps/api/core';
import { Message } from '../types';
import { chatDeepseek, chatOpenAI, chatOllama, chatLlama } from '../../providers/chat';

export interface ChatSlice {
  messages: Message[];
  sendMessage: (text: string) => Promise<void>;
}

export const createChatSlice = (set: any, get: any): ChatSlice => ({
  messages: [],

  sendMessage: async (text: string) => {
    const { mode, apiKey, apiBase, apiModel, deepseekUrl, deepseekModel, isServerReady, ollamaBase, ollamaModel, activeProjectId, contextFolder } = get();

    set({ messages: [...get().messages, { text, sender: 'user' }] });

    // Resolve auto-context from folder (if configured)
    let folderContext = '';
    try {
      const folder = String(contextFolder || '').trim();
      if (folder) {
        folderContext = await invoke<string>('scan_context_folder', {
          path: folder,
          file_size_limit: 256 * 1024,
          total_size_limit: 1024 * 1024,
          max_files: 200,
        } as any);
      }
    } catch (e) {
      console.warn('scan_context_folder failed', e);
    }

    // Save prompt to DB (non-blocking); prefer per-project if active
    try {
      if (activeProjectId) {
        await invoke('save_project_prompt', { project_id: activeProjectId, content: text });
      } else {
        await invoke('save_prompt', { content: text });
      }
    } catch {}

    try {
      let aiResponse: string;
      const promptToSend = folderContext ? `${folderContext}\n\n${text}` : text;

      if (mode === 'deepseek') {
        aiResponse = await chatDeepseek({
          apiKey,
          baseUrl: deepseekUrl,
          model: deepseekModel,
          prompt: promptToSend,
        });
      } else if (mode === 'openai') {
        aiResponse = await chatOpenAI({
          apiKey,
          baseUrl: apiBase,
          model: apiModel,
          prompt: promptToSend,
        });
      } else if (mode === 'ollama') {
        // Build chat history for Ollama: map previous messages to roles (limit last 20)
        const allMsgs = get().messages;
        const history = allMsgs.slice(-20).map((m: Message) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        }));
        const historyWithCtx = folderContext ? ([{ role: 'system', content: folderContext } as any, ...history]) : history;
        let advancedParams: any = undefined;
        try {
          const raw = String(get().ollamaParamsJson || '').trim();
          if (raw) advancedParams = JSON.parse(raw);
        } catch (e) { /* ignore invalid json at runtime */ }
        const res = await chatOllama({
          baseUrl: ollamaBase,
          model: ollamaModel,
          messages: historyWithCtx,
          temperature: get().temperature,
          top_k: get().topK,
          top_p: get().topP,
          max_tokens: get().maxTokens,
          advancedParams,
        });
        set({ messages: [...get().messages, { text: res.content, sender: 'ai', meta: res.meta }] });
        return;
      } else {
        if (!isServerReady) {
          throw new Error('Сервер не запущен');
        }
        // Build chat history for llama.cpp (limit last 20)
        const allMsgs = get().messages;
        const history = allMsgs.slice(-20).map((m: Message) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        }));
        const historyWithCtx = folderContext ? ([{ role: 'system', content: folderContext } as any, ...history]) : history;
        const res = await chatLlama({
          prompt: text,
          port: get().serverPort || 8080,
          temperature: get().temperature,
          top_k: get().topK,
          top_p: get().topP,
          min_p: get().minP,
          max_tokens: get().maxTokens,
          repeat_last_n: get().repeatLastN,
          messages: historyWithCtx,
        });
        // Push formatted content and metadata for llama.cpp
        set({ messages: [...get().messages, { text: res.content, sender: 'ai', meta: res.meta }] });
        return;
      }

      set({ messages: [...get().messages, { text: aiResponse, sender: 'ai' }] });
    } catch (error) {
      console.error('Error:', error);
      set({
        messages: [
          ...get().messages,
          { text: 'Ошибка: ' + (error as Error).message, sender: 'ai' },
        ],
      });
    }
  },
});