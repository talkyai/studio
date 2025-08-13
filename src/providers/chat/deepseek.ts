import { invoke } from '@tauri-apps/api/core';

export async function chatDeepseek(params: { apiKey: string; baseUrl: string; model: string; prompt: string; }): Promise<string> {
  const { apiKey, baseUrl, model, prompt } = params;
  return await invoke<string>('query_deepseek', { apiKey, baseUrl, model, prompt });
}
