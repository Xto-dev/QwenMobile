# Ollama Chat - Мобильное приложение на Expo

Приложение чата для общения с локальной LLM моделью Qwen 2.5 через Ollama API.

## 📁 Структура проекта

```
ollama-chat/
├── App.tsx                 # Точка входа приложения
├── app.json                # Конфигурация Expo
├── package.json            # Зависимости и скрипты
├── tsconfig.json           # Конфигурация TypeScript
├── index.ts                # Entry point для React Native
├── .env.example            # Пример переменных окружения
├── assets/                 # Иконки и изображения
│   ├── adaptive-icon.png
│   ├── favicon.png
│   ├── icon.png
│   └── splash-icon.png
└── src/
    ├── types.ts            # TypeScript типы
    ├── api/
    │   └── ollama.ts       # API клиент для Ollama
    └── screens/
        └── ChatScreen.tsx  # Экран чата
```

## 🚀 Быстрый старт

### Шаг 1: Установка Ollama

**Linux/macOS:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**
Скачайте установщик с https://ollama.com/download

### Шаг 2: Загрузка модели

```bash
ollama pull qwen2.5:7b
```

### Шаг 3: Настройка доступа к Ollama

По умолчанию Ollama слушает только localhost. Для доступа с эмулятора/устройства:

**Linux/macOS:**
```bash
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

**Windows (PowerShell):**
```powershell
$env:OLLAMA_HOST="0.0.0.0:11434"; ollama serve
```

**Windows (cmd):**
```cmd
set OLLAMA_HOST=0.0.0.0:11434 && ollama serve
```

### Шаг 4: Установка зависимостей приложения

```bash
cd ollama-chat
npm install
```

### Шаг 5: Запуск приложения

```bash
# Запустить сервер разработки
npx expo start

# Или сразу для конкретной платформы:
npx expo start --android    # Android эмулятор
npx expo start --ios        # iOS симулятор (только macOS)
npx expo start --web        # Веб (требует дополнительной настройки)
```

## ⚙️ Настройка подключения

### Для Android эмулятора (по умолчанию)

Используется адрес `http://10.0.2.2:11434` - это специальный alias для localhost хоста.

Ничего менять не нужно, настройка по умолчанию работает.

### Для iOS симулятора

В файле `src/api/ollama.ts` измените:
```typescript
export const OLLAMA_BASE_URL = 'http://localhost:11434';
```

### Для физического устройства

1. Узнайте IP вашего компьютера в локальной сети:
   - **Linux/macOS:** `ifconfig | grep "inet "`
   - **Windows:** `ipconfig`

2. В файле `src/api/ollama.ts` измените:
   ```typescript
   export const OLLAMA_BASE_URL = 'http://192.168.1.XXX:11434';
   ```

3. Убедитесь, что брандмауэр разрешает подключения на порт 11434

## 🔧 Переменные окружения

Скопируйте `.env.example` в `.env` при необходимости:

```bash
cp .env.example .env
```

> **Примечание:** В текущей версии URL задаётся напрямую в коде (`src/api/ollama.ts`). 
> Для использования `.env` установите `expo-constants` и `dotenv`.

## 📱 Функции приложения

- ✅ **Список сообщений** с использованием FlatList
- ✅ **Поле ввода** с поддержкой multiline
- ✅ **Кнопка отправки** с индикатором загрузки
- ✅ **Индикатор "печатает..."** во время генерации ответа
- ✅ **Автопрокрутка** к новому сообщению
- ✅ **Streaming ответов** - текст появляется по мере генерации
- ✅ **Статус подключения** к Ollama в заголовке
- ✅ **Обработка ошибок** с возможностью закрытия уведомления
- ✅ **Блокировка отправки** во время генерации
- ✅ **Сохранение истории** в памяти (в рамках сессии)

## 🛠 Технические детали

### API формат запроса

```json
{
  "model": "qwen2.5:7b",
  "messages": [
    {"role": "user", "content": "Привет!"},
    {"role": "assistant", "content": "Здравствуйте! Чем могу помочь?"}
  ],
  "stream": true
}
```

### Streaming реализация

Используется `ReadableStream` для чтения потока токенов:

```typescript
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value, { stream: true });
  const lines = chunk.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const parsed = JSON.parse(line);
    onToken(parsed.message.content);
  }
}
```

### CORS

**CORS не является проблемой** в React Native, так как `fetch` выполняется на уровне ОС, а не в браузере. Никаких дополнительных настроек CORS не требуется.

## 🐛 Решение проблем

### "Ollama недоступен"

1. Проверьте, что Ollama запущен: `ollama list`
2. Проверьте доступность API: `curl http://localhost:11434/api/tags`
3. Для эмулятора убедитесь, что OLLAMA_HOST=0.0.0.0:11434

### Модель не отвечает

1. Убедитесь, что модель загружена: `ollama list | grep qwen`
2. Если нет - загрузите: `ollama pull qwen2.5:7b`

### Приложение не запускается

1. Очистите кэш: `npx expo start -c`
2. Перезапустите Metro bundler
3. Проверьте версию Node.js (требуется 18+)

### Пустые ответы от модели

1. Проверьте логи Ollama
2. Убедитесь, что достаточно RAM (минимум 8GB для 7B модели)
3. Попробуйте меньшую модель: `ollama pull qwen2.5:1.5b`

## 📝 Лицензия

MIT
