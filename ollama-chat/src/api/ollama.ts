/**
 * API клиент для общения с локальным Ollama сервером
 * 
 * ВАЖНО: Настройка доступа к Ollama
 * 
 * 1. Для Android эмулятора используйте http://10.0.2.2:11434
 *    (10.0.2.2 - это специальный адрес, который указывает на localhost хоста)
 * 
 * 2. Для физического устройства используйте IP вашего компьютера в локальной сети
 *    Например: http://192.168.1.100:11434
 * 
 * 3. Запустите Ollama с переменной окружения OLLAMA_HOST=0.0.0.0:11434
 *    чтобы разрешить подключения извне:
 *    ```bash
 *    OLLAMA_HOST=0.0.0.0:11434 ollama serve
 *    ```
 * 
 * 4. Убедитесь, что модель установлена:
 *    ```bash
 *    ollama pull qwen2.5:7b
 *    ```
 * 
 * Примечание: CORS не является проблемой в React Native, так как fetch
 * выполняется на уровне ОС, а не в браузере.
 */

import { OllamaChatRequest, OllamaChatResponse, Message } from './types';

// Базовый URL Ollama API
// Для Android эмулятора: http://10.0.2.2:11434
// Для iOS симулятора: http://localhost:11434
// Для физического устройства: http://<YOUR_IP>:11434
export const OLLAMA_BASE_URL = 'http://10.0.2.2:11434';

// Модель по умолчанию
export const DEFAULT_MODEL = 'qwen2.5:7b';

/**
 * Отправляет запрос к Ollama API с поддержкой streaming
 * @param messages - Массив сообщений для отправки
 * @param onToken - Callback для обработки каждого нового токена
 * @returns Promise, который разрешается когда генерация завершена
 */
export async function streamChatCompletion(
  messages: Message[],
  onToken: (token: string) => void
): Promise<void> {
  const requestBody: OllamaChatRequest = {
    model: DEFAULT_MODEL,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    stream: true,
  };

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  // Читаем поток данных через ReadableStream
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      // Декодируем chunk и парсим JSON
      const chunk = decoder.decode(value, { stream: true });
      
      // Ollama возвращает несколько JSON объектов в одном chunk
      // Разделяем их по новой строке
      const lines = chunk.split('\n').filter((line) => line.trim() !== '');

      for (const line of lines) {
        try {
          const parsed: OllamaChatResponse = JSON.parse(line);
          
          if (parsed.message?.content) {
            onToken(parsed.message.content);
          }
        } catch (e) {
          // Игнорируем некорректные JSON (может быть частичный ответ)
          console.warn('Failed to parse chunk:', e);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Проверка доступности Ollama API
 */
export async function checkOllamaAvailability(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}
