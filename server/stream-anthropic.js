
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

// Create an Anthropic client.
// The SDK reads ANTHROPIC_API_KEY from the environment.
const client = new Anthropic();

const PROMPT =
  "Write a 5-step guide to deploying a Node.js app on Railway.";

async function streamAnthropic() {
  console.log("\n=== ANTHROPIC STREAMING ===\n");
  console.log("Prompt:", PROMPT);
  console.log("\nAI Response:\n");

  // Record when the request begins.
  const startTime = Date.now();

  // We haven't received any text yet.
  let firstTokenTime = null;

  try {
    // Start an Anthropic streaming request.
    const stream = client.messages.stream({
      model: "claude-haiku-5-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: PROMPT,
        },
      ],
    });

    // Listen for text deltas as they arrive.
    stream.on("text", (text) => {
      // Record the first non-empty text event.
      if (firstTokenTime === null && text.length > 0) {
        firstTokenTime = Date.now();
      }

      // Print text without adding a newline.
      process.stdout.write(text);
    });

    // Wait until Anthropic finishes generating.
    const finalMessage = await stream.finalMessage();

    // Record when the final response arrives.
    const endTime = Date.now();

    const timeToFirstToken =
      firstTokenTime === null
        ? "N/A"
        : `${firstTokenTime - startTime}ms`;

    const totalTime = endTime - startTime;

    console.log("\n\n--- Stream complete ---");
    console.log("Time to first token:", timeToFirstToken);
    console.log("Total time:", `${totalTime}ms`);
    console.log(
      "Output tokens:",
      finalMessage.usage.output_tokens
    );
  } catch (error) {
    console.error("\nAnthropic streaming failed:");
    console.error(error.message);
    process.exitCode = 1;
  }
}

// Execute the function.
streamAnthropic();
