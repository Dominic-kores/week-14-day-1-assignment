
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

// Create a unique identifier for chat messages.
function createId() {
  return crypto.randomUUID();
}

// Read an SSE event block and extract its data.
function parseSSEBlock(block) {
  // Allow both LF and CRLF line endings.
  const lines = block.split(/\r?\n/);

  const dataLines = lines
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart());

  // Ignore comments and events without data.
  if (dataLines.length === 0) return null;

  return dataLines.join("\n");
}

export default function useStreamingChat() {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [usage, setUsage] = useState(null);

  // Track the current request so it can be cancelled.
  const controllerRef = useRef(null);

  // Prevent multiple simultaneous requests.
  const activeRef = useRef(false);

  // Track lifecycle changes.
  const mountedRef = useRef(true);

  // Cleanup when the component unmounts.
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  // Stop the current stream.
  const stopStreaming = useCallback(() => {
    controllerRef.current?.abort();

    // Keep the partially received assistant message.
    activeRef.current = false;
    controllerRef.current = null;

    if (mountedRef.current) {
      setIsStreaming(false);
    }
  }, []);

  // Send a new message and read the response as a stream.
  const sendMessage = useCallback(
    async (userText) => {
      const text = userText.trim();

      // Ignore empty input and duplicate submissions.
      if (!text || activeRef.current) return;

      activeRef.current = true;

      const controller = new AbortController();
      controllerRef.current = controller;

      // Build the conversation to send to Claude.
      // A pending empty assistant message is not included.
      const previousMessages = messages
        .filter((message) => message.content.trim())
        .map((message) => ({
          role: message.role,
          content: message.content,
        }));

      const requestMessages = [
        ...previousMessages,
        {
          role: "user",
          content: text,
        },
      ];

      const userMessage = {
        id: createId(),
        role: "user",
        content: text,
      };

      const assistantId = createId();

      const assistantMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
      };

      // Immediately display the user and assistant bubbles.
      setMessages((current) => [
        ...current,
        userMessage,
        assistantMessage,
      ]);

      setIsStreaming(true);
      setError(null);
      setUsage(null);

      let reader = null;
      let completed = false;

      try {
        // POST the conversation to the SSE endpoint.
        const response = await fetch(
          `${API_URL}/api/chat/stream`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "text/event-stream",
            },
            body: JSON.stringify({
              messages: requestMessages,
            }),
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));

          throw new Error(
            body.error || `Request failed (${response.status})`
          );
        }

        if (!response.body) {
          throw new Error("ReadableStream is unavailable.");
        }

        // Acquire the browser's response stream reader.
        reader = response.body.getReader();

        // Convert binary bytes into UTF-8 characters.
        const decoder = new TextDecoder();

        // SSE boundaries may be split across network chunks.
        let buffer = "";

        // Process a complete SSE payload.
        function handleEvent(data) {
          if (controller.signal.aborted) return;

          if (data === null || data === "") return;

          if (data === "[DONE]") {
            completed = true;
            return;
          }

          let event;

          try {
            event = JSON.parse(data);
          } catch {
            throw new Error("Invalid SSE JSON received.");
          }

          if (event.type === "text") {
            const delta = event.text || "";

            // Append the delta to the SAME assistant message.
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId
                  ? {
                      ...message,
                      content: message.content + delta,
                    }
                  : message
              )
            );
          }

          if (event.type === "done") {
            setUsage(event.usage || null);
          }

          if (event.type === "error") {
            throw new Error(
              event.error || "The AI stream was interrupted."
            );
          }
        }

        // Keep reading until the response completes.
        while (!completed) {
          const { value, done } = await reader.read();

          if (controller.signal.aborted) break;

          // Flush decoder's remaining buffered bytes.
          if (done) {
            buffer += decoder.decode();
          } else {
            buffer += decoder.decode(value, {
              stream: true,
            });
          }

          // Normalise CRLF boundaries before splitting events.
          buffer = buffer.replace(/\r\n/g, "\n");

          // Process every complete SSE block in the buffer.
          let boundary = buffer.indexOf("\n\n");

          while (boundary !== -1) {
            const block = buffer.slice(0, boundary);

            // Keep any incomplete event for the next read.
            buffer = buffer.slice(boundary + 2);

            const data = parseSSEBlock(block);
            handleEvent(data);

            if (completed) break;

            boundary = buffer.indexOf("\n\n");
          }

          if (done) {
            // A final event without a trailing blank line.
            if (!completed && buffer.trim()) {
              handleEvent(parseSSEBlock(buffer));
            }

            break;
          }
        }

        if (
          !completed &&
          !controller.signal.aborted
        ) {
          throw new Error(
            "Connection ended before the stream completed."
          );
        }
      } catch (err) {
        // Stopping the request is an expected user action.
        if (controller.signal.aborted) return;

        if (mountedRef.current) {
          setError(err.message);

          // Display a helpful message if no text was received.
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId &&
              !message.content
                ? {
                    ...message,
                    content:
                      "Unable to generate a response. Please try again.",
                  }
                : message
            )
          );
        }
      } finally {
        // Release the reader when possible.
        try {
          await reader?.cancel();
        } catch {
          // Stream may already be closed.
        }

        // Only the active request may reset shared state.
        if (controllerRef.current === controller) {
          controllerRef.current = null;
          activeRef.current = false;

          if (mountedRef.current) {
            setIsStreaming(false);
          }
        }
      }
    },
    [messages]
  );

  // Clear chat when no streaming request is active.
  const clearChat = useCallback(() => {
    if (activeRef.current) return;

    setMessages([]);
    setError(null);
    setUsage(null);
  }, []);

  return {
    messages,
    isStreaming,
    error,
    usage,
    sendMessage,
    stopStreaming,
    clearChat,
  };
}
