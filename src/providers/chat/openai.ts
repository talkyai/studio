import { invoke } from '@tauri-apps/api/core';

export async function chatOpenAI(params: { apiKey: string; baseUrl: string; model: string; prompt: string; }): Promise<string> {
  const { apiKey, baseUrl, model, prompt } = params;
  return await invoke<string>('query_openai', { apiKey, baseUrl, model, prompt });
}
