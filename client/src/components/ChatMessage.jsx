
import { memo } from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Prism as SyntaxHighlighter } from
  "react-syntax-highlighter";

import { oneDark } from
  "react-syntax-highlighter/dist/esm/styles/prism";

import TypingIndicator from "./TypingIndicator";

// Renders Markdown and syntax-highlighted code.
function MarkdownContent({ content }) {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Replace default preformatted code rendering.
          pre({ children }) {
            return <>{children}</>;
          },

          code({ className, children, ...props }) {
            const match =
              /language-([\w+-]+)/.exec(className || "");

            const code = String(children).replace(/\n$/, "");

            // Render fenced code blocks with Prism.
            if (match) {
              return (
                <div className="code-block">
                  <div className="code-header">
                    <span>{match[1]}</span>
                    <button
                      type="button"
                      onClick={() =>
                        navigator.clipboard.writeText(code)
                      }
                    >
                      Copy
                    </button>
                  </div>

                  <SyntaxHighlighter
                    language={match[1]}
                    style={oneDark}
                    PreTag="div"
                    customStyle={{
                      margin: 0,
                      borderRadius: "0 0 12px 12px",
                      padding: "16px",
                    }}
                  >
                    {code}
                  </SyntaxHighlighter>
                </div>
              );
            }

            // Plain inline code or an unfinished code fence.
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },

          // Open external links safely.
          a({ children, ...props }) {
            return (
              <a
                {...props}
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// memo helps avoid unnecessary renders of unchanged bubbles.
function ChatMessage({ message, isLast, isStreaming }) {
  const isUser = message.role === "user";

  const isCurrentStream =
    !isUser && isLast && isStreaming;

  const showTyping =
    isCurrentStream && !message.content;

  return (
    <div
      className={`message-row ${
        isUser ? "user-row" : "assistant-row"
      }`}
    >
      <div
        className={`avatar ${
          isUser ? "user-avatar" : "ai-avatar"
        }`}
      >
        {isUser ? "U" : "AI"}
      </div>

      <div className="message-body">
        <span className="message-name">
          {isUser ? "You" : "AI Assistant"}
        </span>

        <div
          className={`message-bubble ${
            isUser ? "user-bubble" : "ai-bubble"
          }`}
        >
          {showTyping ? (
            <TypingIndicator />
          ) : isUser ? (
            <span className="user-text">
              {message.content}
            </span>
          ) : (
            <>
              <MarkdownContent content={message.content} />

              {isCurrentStream && (
                <span
                  className="streaming-cursor"
                  aria-hidden="true"
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(ChatMessage);
