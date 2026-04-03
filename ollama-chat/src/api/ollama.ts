import { OllamaChatRequest, OllamaChatResponse, Message } from '../types';

// Базовый URL Ollama API
// Для физического устройства: http://<YOUR_IP>:11434
export const OLLAMA_BASE_URL = 'http://localhost:11434';

// Модель по умолчанию
export const DEFAULT_MODEL = 'qwen3-vl:2b';


export async function streamChatCompletion(
  messages: Message[],
  onToken: (token: string) => void,
  onThinking?: (thinking: string) => void
): Promise<void> {
  const requestBody: OllamaChatRequest = {
    model: DEFAULT_MODEL,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    stream: true,
    options: {
      temperature: 1,
    },
  };

  console.log('📤 Sending request to Ollama with:', {
    model: requestBody.model,
    messagesCount: requestBody.messages.length,
    hasOptions: !!requestBody.options,
  });

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

  if (response.body && response.body.getReader) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const parsed: OllamaChatResponse = JSON.parse(line);

            console.log('📦 Parsed:', {
              hasThinking: !!parsed.message?.thinking,
              thinkingLength: parsed.message?.thinking?.length || 0,
              hasContent: !!parsed.message?.content,
              contentLength: parsed.message?.content?.length || 0,
              done: parsed.done,
            });

            if (parsed.message?.thinking && onThinking) {
              console.log('📝 Calling onThinking with:', parsed.message.thinking.substring(0, 50));
              onThinking(parsed.message.thinking);
            }

            if (parsed.message?.content) {
              console.log('💬 Calling onToken with:', parsed.message.content);
              onToken(parsed.message.content);
            }

            if (parsed.done === true) {
              console.log('✅ Generation complete');
              reader.releaseLock();
              return;
            }
          } catch (e) {
            console.warn('Failed to parse line:', e);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } else {
    // Fallback для React Native (получаем весь ответ сразу)
    const responseText = await response.text();

    if (!responseText) {
      throw new Error('Response text is empty');
    }

    const lines = responseText.split('\n').filter((line) => line.trim() !== '');

    for (const line of lines) {
      try {
        const parsed: OllamaChatResponse = JSON.parse(line);

        console.log('📦 Parsed (fallback):', {
          hasThinking: !!parsed.message?.thinking,
          thinkingLength: parsed.message?.thinking?.length || 0,
          hasContent: !!parsed.message?.content,
          contentLength: parsed.message?.content?.length || 0,
          done: parsed.done,
        });

        // Обрабатываем размышления модели
        if (parsed.message?.thinking && onThinking) {
          console.log('📝 Calling onThinking (fallback):', parsed.message.thinking.substring(0, 50));
          onThinking(parsed.message.thinking);
        }

        // Обрабатываем контент сообщения
        if (parsed.message?.content) {
          console.log('💬 Calling onToken (fallback):', parsed.message.content);
          onToken(parsed.message.content);
        }

        // Завершаем цикл когда модель закончила генерировать
        if (parsed.done === true) {
          console.log('✅ Generation complete (fallback)');
          break;
        }
      } catch (e) {
        console.warn('Failed to parse line:', e);
      }
    }
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
