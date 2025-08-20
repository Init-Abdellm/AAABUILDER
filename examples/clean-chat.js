#!/usr/bin/env node

/**
 * Clean interactive chat - hides technical output, shows only conversation
 */

const fs = require('fs');
const parser = require('../lib/parser/parser');
const orchestrator = require('../lib/core/orchestrator');
const readline = require('readline');

// Suppress console output from the agent execution
const originalConsole = console;
const silentConsole = {
  log: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {}
};

// Simple function to execute agent silently
async function runAgentSilently(agentFile, input) {
  // Temporarily suppress output
  global.console = silentConsole;
  
  try {
    const content = fs.readFileSync(agentFile, 'utf8');
    const ast = parser.parse(content);
    const result = await orchestrator.execute(ast, input);
    return result;
  } finally {
    // Restore console
    global.console = originalConsole;
  }
}

// Chat session with memory
class CleanChatSession {
  constructor(agentFile) {
    this.agentFile = agentFile;
    this.history = [];
  }

  formatHistory() {
    if (this.history.length === 0) return "This is the start of our conversation.";
    return this.history.map(msg => `${msg.role}: ${msg.text}`).join('\n');
  }

  async sendMessage(userMessage) {
    // Add user message to history
    this.history.push({ role: 'User', text: userMessage });

    // Send to agent with full history (silently)
    const response = await runAgentSilently(this.agentFile, {
      message: userMessage,
      conversation_history: this.formatHistory()
    });

    // Add bot response to history
    this.history.push({ role: 'Assistant', text: response });
    
    return response;
  }
}

// Clean chat interface
async function startCleanChat() {
  console.clear();
  
  console.log('💬 Chat with AI Assistant');
  console.log('═'.repeat(40));
  console.log('Type naturally and press Enter. Type "exit" to quit.');
  console.log('═'.repeat(40));
  console.log();

  const chat = new CleanChatSession('./examples/chatbot.agent');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Bot greeting
  console.log('🤖 Assistant: Hello! I\'m your AI assistant. How can I help you today?');
  console.log();

  while (true) {
    try {
      // Get user input
      const userMessage = await new Promise(resolve => {
        rl.question('💬 You: ', resolve);
      });

      // Handle exit
      if (userMessage.toLowerCase().trim() === 'exit') {
        console.log('\n🤖 Assistant: Goodbye! Have a wonderful day! 👋');
        break;
      }

      // Skip empty messages
      if (!userMessage.trim()) {
        continue;
      }

      // Show thinking
      process.stdout.write('\n🤖 Assistant: ');
      let dots = 0;
      const thinkingInterval = setInterval(() => {
        process.stdout.write('.');
        dots++;
        if (dots > 3) {
          process.stdout.write('\r🤖 Assistant: ');
          dots = 0;
        }
      }, 400);

      // Get response
      const response = await chat.sendMessage(userMessage);
      
      // Show response
      clearInterval(thinkingInterval);
      process.stdout.write('\r🤖 Assistant: ' + response + '\n\n');

    } catch (error) {
      console.error('\n❌ Sorry, I encountered an error. Please try again.\n');
    }
  }

  rl.close();
}

// Bubble chat interface
async function startBubbleChat() {
  console.clear();
  
  console.log('📱 Bubble Chat Interface');
  console.log('═'.repeat(30));
  console.log();

  const chat = new CleanChatSession('./examples/chatbot.agent');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Function to show chat bubble
  function showMessage(sender, message, isUser = false) {
    const maxWidth = 45;
    const words = message.split(' ');
    const lines = [];
    let currentLine = '';
    
    // Wrap text
    for (const word of words) {
      if ((currentLine + word).length > maxWidth - 4) {
        if (currentLine) lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        currentLine += word + ' ';
      }
    }
    if (currentLine) lines.push(currentLine.trim());

    console.log();
    
    if (isUser) {
      // User bubble (right side)
      const padding = ' '.repeat(Math.max(0, 50 - Math.max(...lines.map(l => l.length)) - 8));
      console.log(`${padding}┌─ You ─┐`);
      lines.forEach(line => {
        console.log(`${padding}│ ${line.padEnd(Math.max(...lines.map(l => l.length)))} │`);
      });
      console.log(`${padding}└${'─'.repeat(Math.max(...lines.map(l => l.length)) + 2)}┘`);
    } else {
      // Bot bubble (left side)
      console.log(`┌─ 🤖 Assistant ─┐`);
      lines.forEach(line => {
        console.log(`│ ${line.padEnd(Math.max(...lines.map(l => l.length)))} │`);
      });
      console.log(`└${'─'.repeat(Math.max(...lines.map(l => l.length)) + 2)}┘`);
    }
  }

  // Initial greeting
  showMessage('Assistant', 'Hi! I\'m your AI assistant. What would you like to chat about?');

  while (true) {
    try {
      console.log();
      const userMessage = await new Promise(resolve => {
        rl.question('💬 Type your message: ', resolve);
      });

      if (userMessage.toLowerCase().trim() === 'exit') {
        showMessage('Assistant', 'Thanks for chatting! Goodbye! 👋');
        break;
      }

      if (!userMessage.trim()) continue;

      // Show user message
      showMessage('You', userMessage, true);

      // Show typing
      console.log('\n🤖 Typing...');
      
      // Get response
      const response = await chat.sendMessage(userMessage);
      
      // Clear typing and show response
      process.stdout.write('\r' + ' '.repeat(15) + '\r');
      showMessage('Assistant', response);

    } catch (error) {
      showMessage('Assistant', 'Sorry, I had a technical issue. Please try again.');
    }
  }

  rl.close();
}

// Main function
async function main() {
  const style = process.argv[2] || 'clean';

  switch (style) {
    case 'clean':
      await startCleanChat();
      break;
    case 'bubble':
      await startBubbleChat();
      break;
    default:
      console.log('Usage: node clean-chat.js [clean|bubble]');
      console.log('  clean  - Clean chat interface (default)');
      console.log('  bubble - Bubble-style chat interface');
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { CleanChatSession, startCleanChat, startBubbleChat };