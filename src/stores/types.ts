export type ChatMode = 'deepseek' | 'openai' | 'local' | 'ollama';
export type Message = { text: string; sender: 'user' | 'ai'; meta?: any };
export type ModelSource = 'huggingface' | 'github' | 'gitlab' | 'direct';
export type DownloadStatus = {
  progress: number;
  status: 'idle' | 'downloading' | 'extracting' | 'completed' | 'error';
  message: string;
};
export type ProgressPayload = {
  progress: number;
  message: string;
};
