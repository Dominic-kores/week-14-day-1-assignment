
import "dotenv/config";

import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";

const app = express();

const PORT = process.env.PORT || 3001;

// Allow requests from the React development server.
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  })
);

// Parse JSON request bodies.
app.use(express.json({ limit: "32kb" }));

// Initialise Anthropic only on the server.
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Model specified in the assignment.
const MODEL = "claude-haiku-5-5";

// Validate and normalise incoming chat messages.
function validateMessages(messages) {
  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.length > 30
  ) {
    throw new Error(
      "Messages must be a non-empty array of up to 30 items."
    );
  }

  return messages.map((message) => {
    if (
      !message ||
      !["user", "assistant"].includes(message.role) ||
      typeof message.content !== "string" ||
      !message.content.trim() ||
      message.content.length > 12000
    ) {
      throw new Error("Invalid chat message.");
    }

    return {
      role: message.role,
      content: message.content,
    };
  });
}

// Small helper to send correctly formatted SSE events.
function sendSSE(res, payload) {
  if (res.destroyed || res.writableEnded) return;

  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

// Basic health check.
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "AI Streaming API is running",
  });
});

// =======================================
// STREAMING CHAT ENDPOINT
// POST /api/chat/stream
// =======================================
app.post("/api/chat/stream", async (req, res) => {
  let messages;

  // Validate before sending SSE headers.
  try {
    messages = validateMessages(req.body?.messages);
  } catch (error) {
    return res.status(400).json({
      error: error.message,
    });
  }

  // Abort upstream generation if the browser disconnects.
  const controller = new AbortController();

  let clientDisconnected = false;

  // The response's close event identifies a disconnected client
  // if the response has not completed normally.
  res.on("close", () => {
    if (!res.writableEnded) {
      clientDisconnected = true;
      controller.abort();
    }
  });

  // SSE response headers.
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  // Send headers before streaming any text.
  res.flushHeaders();

  // Optional initial SSE comment to establish the stream.
  res.write(": connected\n\n");

  try {
    // Create a Claude streaming request.
    const stream = anthropic.messages.stream(
      {
        model: MODEL,
        max_tokens: 1024,
        messages,
      },
      {
        signal: controller.signal,
      }
    );

    // Each text event is sent to React immediately.
    stream.on("text", (text) => {
      if (!clientDisconnected && !controller.signal.aborted) {
        sendSSE(res, {
          type: "text",
          text,
        });
      }
    });

    // Wait for the complete message and token usage.
    const finalMessage = await stream.finalMessage();

    if (clientDisconnected) return;

    // Send final usage statistics.
    sendSSE(res, {
      type: "done",
      usage: finalMessage.usage,
    });

    // Mark the stream as finished.
    if (!res.writableEnded) {
      res.write("data: [DONE]\n\n");
      res.end();
    }
  } catch (error) {
    if (clientDisconnected || controller.signal.aborted) {
      return;
    }

    console.error("Streaming error:", error.message);

    // Headers have already been sent, so report errors as SSE.
    sendSSE(res, {
      type: "error",
      error: "Stream interrupted",
    });

    res.end();
  }
});

// =======================================
// NON-STREAMING CHAT ENDPOINT
// POST /api/chat
// =======================================
app.post("/api/chat", async (req, res) => {
  let messages;

  try {
    messages = validateMessages(req.body?.messages);
  } catch (error) {
    return res.status(400).json({
      error: error.message,
    });
  }

  try {
    // Wait for Claude to generate the complete response.
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages,
    });

    // Extract text from the response content blocks.
    const content = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    return res.json({
      content,
      usage: response.usage,
    });
  } catch (error) {
    console.error("Chat error:", error.message);

    return res.status(502).json({
      error: "Failed to generate AI response.",
    });
  }
});

// Handle malformed JSON.
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({
      error: "Invalid JSON request body.",
    });
  }

  next(error);
});

// Start the server.
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log("Streaming: POST /api/chat/stream");
  console.log("Standard:  POST /api/chat");
});
