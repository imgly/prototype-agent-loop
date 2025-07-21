# Agent CLI

A JavaScript ES6 agent CLI that connects to the Claude API and implements an agent loop with tools.

## Features

- Complete request/response logging (console + file)
- Two tools: `ping` and `echo`
- Multi-turn conversation support
- Interactive and example modes

## Quick Start with npx

```bash
# Run directly with npx (no installation needed)
npx @imgly/prototype-agent-loop
```

## Usage Example

When prompted, select option 2 for interactive mode and enter:
```
Please run ping localhost and when you received ping response then run echo with the result
```

This will demonstrate:
1. The agent using the `ping` tool to check localhost
2. Processing the ping result
3. Using the `echo` tool to report the result
4. Complete logging of all API interactions

## Setup for Development

1. Clone and install:
```bash
git clone https://github.com/imgly/prototype-agent-loop.git
cd prototype-agent-loop
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

3. Run locally:
```bash
npm start
# or
node agent-cli.js
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