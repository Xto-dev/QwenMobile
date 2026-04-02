import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Message } from '../types';
import { streamChatCompletion, checkOllamaAvailability } from '../api/ollama';

/**
 * Экран чата с поддержкой streaming от Ollama API
 * 
 * Функции:
 * - Список сообщений с автопрокруткой
 * - Поле ввода с кнопкой отправки
 * - Индикатор "печатает..."
 * - Блокировка отправки во время генерации
 * - Обработка ошибок
 */

const generateId = () => Math.random().toString(36).substring(2, 15);

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [ollamaAvailable, setOllamaAvailable] = useState<boolean | null>(null);

  const flatListRef = useRef<FlatList>(null);

  // Проверка доступности Ollama при загрузке
  useEffect(() => {
    checkOllamaAvailability().then((available) => {
      setOllamaAvailable(available);
      if (!available) {
        setError(
          'Ollama недоступен. Убедитесь, что сервер запущен и URL настроен правильно.'
        );
      }
    });
  }, []);

  // Автопрокрутка к новому сообщению
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: inputText.trim(),
      timestamp: Date.now(),
    };

    // Добавляем сообщение пользователя
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);
    setError(null);
    setIsTyping(true);

    // Создаём placeholder для ответа ассистента
    const assistantMessageId = generateId();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      },
    ]);

    try {
      // Формируем историю сообщений для API
      const apiMessages = [...messages, userMessage];

      let accumulatedContent = '';

      // Streaming запрос к Ollama
      await streamChatCompletion(apiMessages, (token) => {
        accumulatedContent += token;
        
        // Обновляем сообщение ассистента по мере получения токенов
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: accumulatedContent }
              : msg
          )
        );
      });

      setIsTyping(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(errorMessage);
      setIsTyping(false);
      
      // Удаляем пустое сообщение ассистента при ошибке
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== assistantMessageId || msg.content !== '')
      );
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    
    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}
        >
          <Text style={styles.messageRole}>
            {isUser ? 'Вы' : 'Qwen'}
          </Text>
          <Text style={styles.messageText}>{item.content}</Text>
          <Text style={styles.messageTime}>
            {new Date(item.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  const renderTypingIndicator = () => (
    <View style={styles.typingContainer}>
      <ActivityIndicator size="small" color="#666" />
      <Text style={styles.typingText}>Qwen печатает...</Text>
    </View>
  );

  const renderError = () => {
    if (!error) return null;
    
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <TouchableOpacity onPress={() => setError(null)}>
          <Text style={styles.dismissError}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Заголовок */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Чат с Qwen</Text>
          <View style={styles.statusIndicator}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: ollamaAvailable ? '#4CAF50' : '#F44336' },
              ]}
            />
            <Text style={styles.statusText}>
              {ollamaAvailable === null
                ? 'Проверка...'
                : ollamaAvailable
                ? 'Ollama подключён'
                : 'Ollama недоступен'}
            </Text>
          </View>
        </View>

        {/* Ошибка */}
        {renderError()}

        {/* Список сообщений */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Начните чат с Qwen 2.5 7B!
              </Text>
              <Text style={styles.emptySubtext}>
                Убедитесь, что Ollama запущен и модель установлена
              </Text>
            </View>
          }
        />

        {/* Индикатор набора текста */}
        {isTyping && renderTypingIndicator()}

        {/* Поле ввода */}
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, loading && styles.inputDisabled]}
            placeholder="Введите сообщение..."
            placeholderTextColor="#999"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
            editable={!loading}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || loading) && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>➤</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffebee',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    flex: 1,
  },
  dismissError: {
    color: '#c62828',
    fontSize: 18,
    marginLeft: 8,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  assistantMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageRole: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    opacity: 0.8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 6,
    opacity: 0.6,
    alignSelf: 'flex-end',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingLeft: 16,
  },
  typingText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
