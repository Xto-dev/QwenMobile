/**
 * Типы данных для приложения чата с Ollama
 */

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking?: string; // Размышления модели (для Qwen)
  timestamp: number;
}

export interface ChatState {
  messages: Message[];
  loading: boolean;
  error: string | null;
  isTyping: boolean;
}

export interface OllamaChatRequest {
  model: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  stream: boolean;
  thinking?: boolean; // Включить режим размышлений (для моделей как Qwen)
  think?: boolean; // Включить режим размышлений (для моделей как Qwen)
  options?: {
    // Параметры ограничения thinking для моделей вроде Qwen
    num_keep?: number;
    seed?: number;
    top_k?: number;
    top_p?: number;
    tfs_z?: number;
    typical_p?: number;
    repeat_last_n?: number;
    temperature?: number;
    repeat_penalty?: number;
    presence_penalty?: number;
    frequency_penalty?: number;
    mirostat?: number;
    mirostat_tau?: number;
    mirostat_eta?: number;
    penalize_newline?: boolean;
    stop?: string[];
  };
  // Специфичные параметры для thinking
  num_predict?: number; // Макс токенов для вывода
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
    thinking?: string;
  };
  done: boolean;
}
