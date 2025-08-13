import { invoke } from '@tauri-apps/api/core';

export type LlamaChatResult = { content: string; meta?: any; raw?: string };
export type LlamaChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type LlamaGenParams = {
  prompt: string;
  port: number;
  temperature?: number;
  top_k?: number;
  top_p?: number;
  min_p?: number;
  max_tokens?: number;
  repeat_last_n?: number;
  messages?: LlamaChatMessage[];
};

export async function chatLlama(params: LlamaGenParams): Promise<LlamaChatResult> {
  const raw = await invoke<string>('query_llamacpp', params as any);
  try {
    const data = JSON.parse(raw);
    // OpenAI-style chat completion
    const content = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? raw;
    const meta = {
      model: data?.model,
      id: data?.id,
      system_fingerprint: data?.system_fingerprint,
      usage: data?.usage,
      timings: data?.timings,
    };
    return { content: String(content), meta, raw };
  } catch {
    // Not JSON: return as-is
    return { content: String(raw), raw };
  }
}
