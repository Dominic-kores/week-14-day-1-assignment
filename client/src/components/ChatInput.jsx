
import { useState } from "react";

export default function ChatInput({
  onSend,
  onStop,
  isStreaming,
}) {
  const [input, setInput] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    const text = input.trim();

    if (!text || isStreaming) return;

    onSend(text);

    // Clear the input after submitting.
    setInput("");
  }

  return (
    <form
      className="chat-input-form"
      onSubmit={handleSubmit}
    >
      <div className="input-container">
        <input
          type="text"
          value={input}
          onChange={(event) =>
            setInput(event.target.value)
          }
          placeholder="Ask the AI anything..."
          disabled={isStreaming}
          aria-label="Chat message"
        />

        {isStreaming ? (
          <button
            type="button"
            className="stop-button"
            onClick={onStop}
          >
            ■ Stop
          </button>
        ) : (
          <button
            type="submit"
            className="send-button"
            disabled={!input.trim()}
          >
            Send ↑
          </button>
        )}
      </div>

      <p className="input-hint">
        Press Enter to send.
        AI responses are streamed in real time.
      </p>
    </form>
  );
}
