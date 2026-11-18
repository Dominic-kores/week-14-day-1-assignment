
import "dotenv/config";
import OpenAI from "openai";

// Initialise OpenAI SDK.
const client = new OpenAI();

const PROMPT =
  "Write a 5-step guide to deploying a Node.js app on Railway.";

async function streamOpenAI() {
  console.log("\n=== OPENAI STREAMING ===\n");
  console.log("Prompt:", PROMPT);
  console.log("\nAI Response:\n");

  const startTime = Date.now();

  let firstTokenTime = null;
  let outputTokens = null;

  try {
    // Start an OpenAI chat completion stream.
    const stream = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: PROMPT,
        },
      ],
      max_tokens: 1024,
      stream: true,

      // Request a final usage summary.
      stream_options: {
        include_usage: true,
      },
    });

    // Iterate over streaming response chunks.
    for await (const chunk of stream) {
      // The final usage chunk may contain no choices.
      if (chunk.usage) {
        outputTokens = chunk.usage.completion_tokens;
      }

      const content =
        chunk.choices[0]?.delta?.content ?? "";

      // Ignore empty chunks when measuring first text.
      if (!content) continue;

      if (firstTokenTime === null) {
        firstTokenTime = Date.now();
      }

      // Print streamed content directly.
      process.stdout.write(content);
    }

    const endTime = Date.now();

    const timeToFirstToken =
      firstTokenTime === null
        ? "N/A"
        : `${firstTokenTime - startTime}ms`;

    console.log("\n\n--- Stream complete ---");
    console.log("Time to first token:", timeToFirstToken);
    console.log("Total time:", `${endTime - startTime}ms`);
    console.log(
      "Output tokens:",
      outputTokens ?? "Not available"
    );
  } catch (error) {
    console.error("\nOpenAI streaming failed:");
    console.error(error.message);
    process.exitCode = 1;
  }
}

streamOpenAI();
