/**
 * Типы данных для приложения чата с Ollama
 */

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
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
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}
