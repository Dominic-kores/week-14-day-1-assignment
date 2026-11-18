
import { useEffect, useRef } from "react";

import useStreamingChat from "./hooks/useStreamingChat";
import ChatInput from "./components/ChatInput";
import ChatMessage from "./components/ChatMessage";

import "./App.css";

export default function App() {
  const {
    messages,
    isStreaming,
    error,
    usage,
    sendMessage,
    stopStreaming,
    clearChat,
  } = useStreamingChat();

  // Invisible element positioned at the bottom of the chat.
  const bottomRef = useRef(null);

  // Auto-scroll when messages or tokens change.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: isStreaming ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, isStreaming]);

  const hasMessages = messages.length > 0;

  return (
    <div className="app-layout">
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">✦</div>

          <div>
            <h2>StreamLab AI</h2>
            <span>AI Streaming Workspace</span>
          </div>
        </div>

        <button
          className="new-chat-button"
          onClick={clearChat}
          disabled={isStreaming}
        >
          + New Conversation
        </button>

        <div className="sidebar-section">
          <p className="sidebar-label">WORKSPACE</p>

          <div className="sidebar-link active">
            <span>◉</span> AI Chat
          </div>

          <div className="sidebar-link">
            <span>⚡</span> Live Streaming
          </div>

          <div className="sidebar-link">
            <span>◈</span> Anthropic Claude
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="status-indicator">
            <span className="status-dot" />
            Claude API Backend
          </div>
          <p>Week 14 · Day 1 Assignment</p>
        </div>
      </aside>

      {/* Chat content */}
      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>AI Streaming Chat</h1>
            <p>Real-time responses powered by Claude</p>
          </div>

          <span
            className={`stream-status ${
              isStreaming ? "generating" : ""
            }`}
          >
            <span className="status-dot" />
            {isStreaming ? "Generating" : "Ready"}
          </span>
        </header>

        <div className="chat-area">
          {!hasMessages ? (
            <div className="welcome-screen">
              <div className="welcome-icon">✦</div>

              <h2>What can I help you with?</h2>

              <p>
                Experience real-time AI responses as
                they are generated, one chunk at a time.
              </p>

              <div className="suggestion-grid">
                <button
                  onClick={() =>
                    sendMessage(
                      "Explain how M-Pesa works in three sentences."
                    )
                  }
                >
                  <span>💳</span>
                  Explain M-Pesa
                </button>

                <button
                  onClick={() =>
                    sendMessage(
                      "Write a JavaScript function to reverse a string, with comments."
                    )
                  }
                >
                  <span>💻</span>
                  Generate JavaScript
                </button>

                <button
                  onClick={() =>
                    sendMessage(
                      "Explain how AI streaming works in Node.js."
                    )
                  }
                >
                  <span>⚡</span>
                  Learn about streaming
                </button>
              </div>
            </div>
          ) : (
            <div className="messages-container">
              {messages.map((message, index) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isLast={index === messages.length - 1}
                  isStreaming={isStreaming}
                />
              ))}

              {usage && !isStreaming && (
                <div className="usage-info">
                  Input tokens: {usage.input_tokens}
                  {" · "}
                  Output tokens: {usage.output_tokens}
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}

        <div className="input-section">
          <ChatInput
            onSend={sendMessage}
            onStop={stopStreaming}
            isStreaming={isStreaming}
          />
        </div>
      </main>
    </div>
  );
}
