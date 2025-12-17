'use client';

import { useChat } from 'ai/react';
import { useRef, useEffect } from 'react';

import { APP_CONFIG, MESSAGES, UI_CONFIG } from '@/lib/constants';
import styles from './Chat.module.css';

/**
 * Chat component with streaming AI responses
 * Supports both demo mode and OpenAI integration
 */
export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: UI_CONFIG.scrollBehavior });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className={styles.chatContainer} role="main" aria-label="Chat interface">
      <header className={styles.header}>
        <h1>{APP_CONFIG.name}</h1>
        <p>Powered by Vercel AI SDK</p>
      </header>

      <div
        className={styles.messagesContainer}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Chat messages"
      >
        {messages.length === 0 && (
          <div className={styles.emptyState} role="status">
            <div className={styles.emptyIcon} aria-hidden="true">
              💬
            </div>
            <h2>{MESSAGES.emptyState.title}</h2>
            <p>{MESSAGES.emptyState.description}</p>
          </div>
        )}

        {messages.map((message) => (
          <article
            key={message.id}
            className={`${styles.message} ${
              message.role === 'user' ? styles.userMessage : styles.assistantMessage
            }`}
            aria-label={`${message.role === 'user' ? 'User' : 'Assistant'} message`}
          >
            <div className={styles.messageRole} aria-hidden="true">
              {message.role === 'user' ? '👤 You' : '🤖 Assistant'}
            </div>
            <div className={styles.messageContent}>{message.content}</div>
          </article>
        ))}

        {isLoading && (
          <article
            className={`${styles.message} ${styles.assistantMessage}`}
            aria-label="Assistant is typing"
            role="status"
          >
            <div className={styles.messageRole} aria-hidden="true">
              🤖 Assistant
            </div>
            <div className={styles.messageContent}>
              <div className={styles.loadingDots} aria-label="Loading">
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
              </div>
            </div>
          </article>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className={styles.inputForm} aria-label="Message input form">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder={MESSAGES.placeholders.input}
          className={styles.input}
          disabled={isLoading}
          maxLength={UI_CONFIG.maxInputLength}
          aria-label="Message input"
          aria-disabled={isLoading}
          autoComplete="off"
        />
        <button
          type="submit"
          className={styles.sendButton}
          disabled={isLoading || !input.trim()}
          aria-label="Send message"
          aria-disabled={isLoading || !input.trim()}
        >
          <span aria-hidden="true">{isLoading ? '...' : '→'}</span>
        </button>
      </form>
    </div>
  );
}
