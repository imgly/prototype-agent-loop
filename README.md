# Agent CLI

A JavaScript ES6 agent CLI that connects to the Claude API and implements an agent loop with tools.

## Features

- Complete request/response logging (console + file)
- Two tools: `ping` and `echo`
- Multi-turn conversation support
- Interactive and example modes

## Setup

1. Install dependencies:
```bash
npm install
```

2. API Key Setup (choose one):
   - **Option A**: Set environment variable:
     ```bash
     export ANTHROPIC_API_KEY=your-api-key
     ```
   - **Option B**: Use 1Password CLI (automatic):
     - Make sure you're signed in: `op signin`
     - The CLI will automatically fetch the key

3. Run the CLI:
```bash
npm start
```

## Logging

All requests and responses are logged to:
- Console (with timestamps)
- Log files in `./logs/` directory

Each session creates a new log file with complete API request/response data, tool calls, and results.

## Example Usage

The CLI includes an example prompt that demonstrates multi-turn interaction:
1. Pings multiple servers
2. Makes decisions based on results
3. Provides status summaries

This forces the LLM to use tools across multiple turns to complete the task.