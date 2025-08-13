import { invoke } from '@tauri-apps/api/core';

export type OllamaChatResult = { content: string; meta?: any; raw?: string };
export type OllamaChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export async function chatOllama(params: { baseUrl: string; model: string; prompt?: string; messages?: OllamaChatMessage[]; temperature?: number; top_k?: number; top_p?: number; max_tokens?: number; advancedParams?: any }): Promise<OllamaChatResult> {
  const { baseUrl, model, prompt, messages, temperature, top_k, top_p, max_tokens, advancedParams } = params as any;

  const modelName = String(model || '').toLowerCase();
  const isEmbeddingsOnly = /(embed|embedding)/i.test(modelName);
  if (isEmbeddingsOnly) {
    const msg = `Вы выбрали модель, которая не поддерживает чат (embeddings-only).
Модель: ${model}

Такие модели предназначены только для генерации эмбеддингов через /api/embeddings.
Пример (REST):
curl http://localhost:11434/api/embeddings -d '{"model":"nomic-embed-text","prompt":"The sky is blue because of Rayleigh scattering"}'
Пример (JS с библиотекой ollama):
ollama.embeddings({ model: 'nomic-embed-text', prompt: 'The sky is blue because of rayleigh scattering' })

Выберите чат-модель (например, llama3, qwen, mistral и т.п.) чтобы продолжить диалог.`;
    return { content: msg, meta: { model, note: 'embeddings_only' } };
  }

  const raw = await invoke<string>('query_ollama', { baseUrl, model, prompt: prompt ?? '', messages: messages ?? null, temperature, top_k, top_p, max_tokens, advancedParams });
  try {
    const data = JSON.parse(raw);
    const content = data?.message?.content ?? data?.response ?? raw;
    const meta = {
      model: data?.model,
      total_duration: data?.total_duration,
      load_duration: data?.load_duration,
      prompt_eval_count: data?.prompt_eval_count,
      prompt_eval_duration: data?.prompt_eval_duration,
      eval_count: data?.eval_count,
      eval_duration: data?.eval_duration,
    };
    return { content: String(content), meta, raw };
  } catch {
    return { content: String(raw), raw };
  }
}
