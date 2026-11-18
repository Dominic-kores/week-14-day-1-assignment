
# StreamLab AI – Real-Time AI Streaming Chat

## Overview

StreamLab AI is a full-stack application that demonstrates
real-time AI response streaming using Anthropic, OpenAI,
Node.js, Express, Server-Sent Events, and React.

Instead of waiting for an entire AI response, the user
sees text appearing incrementally as it is generated.

## Technologies

### Backend
- Node.js
- Express.js
- Anthropic SDK
- OpenAI SDK
- Server-Sent Events (SSE)
- dotenv and CORS

### Frontend
- React.js
- Vite
- CSS
- Fetch API and ReadableStream
- React Markdown
- Remark GFM
- React Syntax Highlighter

## Features

- Anthropic terminal streaming
- OpenAI terminal streaming
- Time-to-first-token measurements
- Total generation time measurements
- Output token usage reporting
- Express SSE streaming endpoint
- Non-streaming endpoint
- Live AI chat interface
- User and assistant message bubbles
- Animated typing indicator
- Streaming cursor
- Stop generation with AbortController
- Automatic scrolling
- Markdown rendering
- Syntax-highlighted code blocks
- Responsive design

## Project Structure

server/
  index.js
  stream-anthropic.js
  stream-openai.js

client/
  src/
    components/
    hooks/
    App.jsx
    App.css
    index.css

## Installation

Clone the repository and enter the project directory.

### Backend

cd server
npm install

Create a .env file containing:

ANTHROPIC_API_KEY=your_key
OPENAI_API_KEY=your_key
PORT=3001
CLIENT_ORIGIN=http://localhost:5173

Start the server:

npm run dev

### Frontend

Open another terminal:

cd client
npm install
npm run dev

Create client/.env:

VITE_API_URL=http://localhost:3001

Open http://localhost:5173

## Running the Streaming Scripts

From the server directory:

Anthropic:

npm run anthropic

OpenAI:

npm run openai

## API Endpoints

GET /api/health
Checks backend availability.

POST /api/chat/stream
Streams AI-generated text using SSE.

POST /api/chat
Returns a complete AI response as JSON.

Example request:

{
  "messages": [
    {
      "role": "user",
      "content": "Explain how M-Pesa works."
    }
  ]
}

## How Streaming Works

1. React sends the user's message to Express.
2. Express starts an Anthropic streaming request.
3. Anthropic returns incremental text deltas.
4. Express forwards each delta as an SSE event.
5. React uses ReadableStream to read the response.
6. Completed SSE messages are parsed.
7. React updates the assistant message incrementally.
8. The user can cancel the stream using AbortController.

## Testing

Verify that:

- Both CLI scripts stream successfully.
- Both scripts display timing measurements.
- The streaming endpoint returns SSE events.
- The non-streaming endpoint returns JSON.
- The typing indicator appears before text arrives.
- Assistant responses appear incrementally.
- Stop cancels generation.
- Partial text remains visible after stopping.
- Markdown and code blocks render correctly.

## Security

- API keys are stored in server-side environment variables.
- Secrets are not committed to Git.
- Request messages are validated.
- Public deployments should use authentication,
  rate limiting, and usage limits.

## Learning Outcomes

This project demonstrates:

- Working with streaming LLM APIs
- Measuring response performance
- Building SSE endpoints using Express
- Parsing streamed network data safely
- Managing streaming state using React hooks
- Cancelling requests with AbortController
- Rendering AI-generated Markdown



## Author

Dominic Kores

Full-Stack Software & AI Engineer


