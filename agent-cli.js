#!/usr/bin/env node

import Anthropic from '@anthropic-ai/sdk';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

// Get API key from 1Password
let apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  try {
    console.log('🔑 Fetching API key from 1Password...');
    apiKey = execSync('op item get hicmxg576nxzxpfz55jckerk3y --field credential --reveal', {
      encoding: 'utf8'
    }).trim();
    console.log('✅ API key retrieved successfully\n');
  } catch (error) {
    console.error('❌ Failed to get API key from 1Password:', error.message);
    console.error('   Make sure you are signed in to 1Password CLI (op signin)\n');
    process.exit(1);
  }
}

// Initialize the Anthropic client
const anthropic = new Anthropic({
  apiKey: apiKey,
});

// Create logs directory
const logsDir = path.join(process.cwd(), 'logs');
await fs.mkdir(logsDir, { recursive: true });

// Create log file with timestamp
const logFile = path.join(logsDir, `agent-session-${new Date().toISOString().replace(/:/g, '-')}.log`);

// Logging function
async function log(data) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    ...data
  };
  
  // Console output
  console.log(`[${timestamp}]`, JSON.stringify(data, null, 2));
  
  // File output
  await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
}

// Tool definitions
const tools = [
  {
    name: 'ping',
    description: 'Ping a host and return the result',
    input_schema: {
      type: 'object',
      properties: {
        host: {
          type: 'string',
          description: 'The host to ping'
        }
      },
      required: ['host']
    }
  },
  {
    name: 'echo',
    description: 'Echo back the provided message',
    input_schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'The message to echo back'
        }
      },
      required: ['message']
    }
  }
];

// Tool implementations
const toolImplementations = {
  ping: async ({ host }) => {
    // Simulate ping result
    const latency = Math.floor(Math.random() * 100) + 1;
    const success = Math.random() > 0.1;
    
    if (success) {
      return `PING ${host}: 64 bytes received, time=${latency}ms`;
    } else {
      return `PING ${host}: Request timeout`;
    }
  },
  
  echo: async ({ message }) => {
    return `Echo: ${message}`;
  }
};

// Agent loop function
async function runAgentLoop(initialPrompt) {
  const messages = [
    {
      role: 'user',
      content: initialPrompt
    }
  ];

  await log({
    type: 'session_start',
    initial_prompt: initialPrompt
  });

  console.log('\n🤖 Starting agent loop...\n');
  console.log(`📄 Logging to: ${logFile}\n`);

  let turnNumber = 0;

  while (true) {
    turnNumber++;
    
    try {
      // Log the request
      await log({
        type: 'api_request',
        turn: turnNumber,
        request: {
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          messages: messages,
          tools: tools
        }
      });

      // Make API call to Claude
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: messages,
        tools: tools,
      });

      // Log the full response
      await log({
        type: 'api_response',
        turn: turnNumber,
        response: {
          id: response.id,
          type: response.type,
          role: response.role,
          content: response.content,
          model: response.model,
          stop_reason: response.stop_reason,
          stop_sequence: response.stop_sequence,
          usage: response.usage
        }
      });

      // Add assistant's response to messages
      messages.push({
        role: 'assistant',
        content: response.content
      });

      // Display assistant's text response
      const textContent = response.content.find(block => block.type === 'text');
      if (textContent) {
        console.log('\n🤖 Assistant:', textContent.text);
      }

      // Check if there are tool calls
      const toolCalls = response.content.filter(block => block.type === 'tool_use');
      
      if (toolCalls.length === 0) {
        // No more tool calls, end the loop
        await log({
          type: 'session_end',
          reason: 'no_more_tool_calls',
          total_turns: turnNumber
        });
        break;
      }

      // Process tool calls
      const toolResults = [];
      for (const toolCall of toolCalls) {
        console.log(`\n🔧 Calling tool: ${toolCall.name}`);
        console.log('   Input:', JSON.stringify(toolCall.input));
        
        await log({
          type: 'tool_call',
          turn: turnNumber,
          tool: {
            id: toolCall.id,
            name: toolCall.name,
            input: toolCall.input
          }
        });
        
        const startTime = Date.now();
        const result = await toolImplementations[toolCall.name](toolCall.input);
        const duration = Date.now() - startTime;
        
        console.log('   Output:', result);
        
        await log({
          type: 'tool_result',
          turn: turnNumber,
          tool: {
            id: toolCall.id,
            name: toolCall.name,
            output: result,
            duration_ms: duration
          }
        });
        
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolCall.id,
          content: result
        });
      }

      // Add tool results to messages
      messages.push({
        role: 'user',
        content: toolResults
      });

    } catch (error) {
      await log({
        type: 'error',
        turn: turnNumber,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      });
      
      console.error('\n❌ Error in agent loop:', error.message);
      break;
    }
  }

  console.log('\n✅ Agent loop completed\n');
  console.log(`📄 Full session log saved to: ${logFile}\n`);
}

// Main CLI function
async function main() {
  console.log('🚀 Agent CLI with Claude API\n');
  
  // API key check is now done at the top of the file

  // Example prompt that forces multi-turn interaction
  const examplePrompt = `
I need you to help me check the connectivity to multiple servers and then echo back a status report.

Please:
1. First, ping "google.com" to check if we have internet connectivity
2. Then ping "internal.server.local" to check our internal network
3. Based on the results, echo back a status message that summarizes the network state
4. If google.com is reachable but internal server is not, ping "192.168.1.1" to check the local gateway
5. Finally, echo back your final diagnosis of the network situation

Make sure to use the tools step by step and provide clear feedback after each step.
`;

  // Create readline interface for interactive mode
  const rl = readline.createInterface({ input, output });

  console.log('Choose mode:');
  console.log('1. Run example (multi-turn interaction demo)');
  console.log('2. Interactive mode (enter your own prompt)');
  
  const choice = await rl.question('\nEnter choice (1 or 2): ');

  if (choice === '1') {
    console.log('\n📝 Running example prompt...\n');
    console.log('Prompt:', examplePrompt);
    await runAgentLoop(examplePrompt);
  } else {
    const userPrompt = await rl.question('\nEnter your prompt: ');
    await runAgentLoop(userPrompt);
  }

  rl.close();
}

// Run the CLI
main().catch(console.error);