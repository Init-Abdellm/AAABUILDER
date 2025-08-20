#!/usr/bin/env node

/**
 * Real-time interactive chat with .agent file
 * You type messages, the bot responds - like a real chatbot
 */

const fs = require('fs');
const parser = require('../lib/parser/parser');
const orchestrator = require('../lib/core/orchestrator');
const readline = require('readline');

// Simple function to execute agent
async function runAgent(agentFile, input) {
  const content = fs.readFileSync(agentFile, 'utf8');
  const ast = parser.parse(content);
  return await orchestrator.execute(ast, input);
}

// Chat session with memory
class ChatSession {
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

    // Send to agent with full history
    const response = await runAgent(this.agentFile, {
      message: userMessage,
      conversation_history: this.formatHistory()
    });

    // Add bot response to history
    this.history.push({ role: 'Assistant', text: response });
    
    return response;
  }
}

// Interactive chat interface
async function startChat() {
  console.clear();
  console.log('🤖 Interactive Chatbot');
  console.log('═'.repeat(50));
  console.log('💬 Start chatting! Type "exit" to quit');
  console.log('═'.repeat(50));
  console.log();

  const chat = new ChatSession('./examples/chatbot.agent');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Bot starts the conversation
  console.log('🤖 Bot: Hello! I\'m your AI assistant. How can I help you today?');
  console.log();

  while (true) {
    try {
      // Get user input
      const userMessage = await new Promise(resolve => {
        rl.question('💬 You: ', resolve);
      });

      // Check for exit
      if (userMessage.toLowerCase().trim() === 'exit') {
        console.log('\n🤖 Bot: Goodbye! Have a great day! 👋');
        break;
      }

      // Skip empty messages
      if (!userMessage.trim()) {
        continue;
      }

      // Show thinking indicator
      process.stdout.write('\n🤖 Bot: ');
      const thinkingInterval = setInterval(() => {
        process.stdout.write('.');
      }, 500);

      // Get bot response
      const response = await chat.sendMessage(userMessage);
      
      // Clear thinking indicator and show response
      clearInterval(thinkingInterval);
      process.stdout.write('\r🤖 Bot: ' + response + '\n\n');

    } catch (error) {
      console.error('\n❌ Error:', error.message);
      console.log('🤖 Bot: Sorry, I encountered an error. Please try again.\n');
    }
  }

  rl.close();
}

// Chat with better UI formatting
async function startPrettyChat() {
  console.clear();
  
  // Pretty header
  console.log('┌─────────────────────────────────────────────────┐');
  console.log('│                🤖 AI Chatbot                   │');
  console.log('│            Powered by .agent files             │');
  console.log('└─────────────────────────────────────────────────┘');
  console.log();
  console.log('💡 Tips:');
  console.log('   • Type naturally, like talking to a friend');
  console.log('   • The bot remembers our conversation');
  console.log('   • Type "exit" to quit');
  console.log();
  console.log('─'.repeat(50));
  console.log();

  const chat = new ChatSession('./examples/chatbot.agent');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Bot greeting
  console.log('🤖 Assistant: Hello! I\'m your AI assistant. What would you like to talk about?');
  console.log();

  let messageCount = 0;

  while (true) {
    try {
      // Prompt for user input
      const userMessage = await new Promise(resolve => {
        rl.question(`👤 You: `, resolve);
      });

      // Handle exit
      if (userMessage.toLowerCase().trim() === 'exit') {
        console.log();
        console.log('🤖 Assistant: Thank you for chatting with me! Goodbye! 👋');
        console.log();
        console.log(`📊 Chat Summary: ${messageCount} messages exchanged`);
        break;
      }

      // Skip empty messages
      if (!userMessage.trim()) {
        continue;
      }

      messageCount++;

      // Show typing indicator
      process.stdout.write('\n🤖 Assistant: ');
      let dots = 0;
      const typingInterval = setInterval(() => {
        process.stdout.write('.');
        dots++;
        if (dots > 3) {
          process.stdout.write('\r🤖 Assistant: ');
          dots = 0;
        }
      }, 300);

      // Get response
      const response = await chat.sendMessage(userMessage);
      
      // Clear typing indicator and show response
      clearInterval(typingInterval);
      process.stdout.write('\r🤖 Assistant: ' + response);
      console.log('\n');

    } catch (error) {
      console.error('❌ Error:', error.message);
      console.log('🤖 Assistant: I apologize, but I encountered an error. Please try again.\n');
    }
  }

  rl.close();
}

// Bubble-style chat (simulates chat app UI)
async function startBubbleChat() {
  console.clear();
  
  console.log('📱 Chat App Style Interface');
  console.log('═'.repeat(40));
  console.log();

  const chat = new ChatSession('./examples/chatbot.agent');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Function to display message bubble
  function showBubble(sender, message, isUser = false) {
    const maxWidth = 50;
    const lines = [];
    
    // Split message into lines that fit
    const words = message.split(' ');
    let currentLine = '';
    
    for (const word of words) {
      if ((currentLine + word).length > maxWidth - 4) {
        if (currentLine) lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        currentLine += word + ' ';
      }
    }
    if (currentLine) lines.push(currentLine.trim());

    // Display bubble
    if (isUser) {
      // User bubble (right aligned)
      console.log();
      lines.forEach((line, i) => {
        const padding = ' '.repeat(Math.max(0, 60 - line.length - 4));
        if (i === 0) {
          console.log(`${padding}┌─ 👤 You ─${'─'.repeat(Math.max(0, line.length - 5))}┐`);
        }
        console.log(`${padding}│ ${line.padEnd(Math.max(line.length, 8))} │`);
        if (i === lines.length - 1) {
          console.log(`${padding}└${'─'.repeat(line.length + 2)}┘`);
        }
      });
    } else {
      // Bot bubble (left aligned)
      console.log();
      lines.forEach((line, i) => {
        if (i === 0) {
          console.log(`┌─ 🤖 Assistant ─${'─'.repeat(Math.max(0, line.length - 10))}┐`);
        }
        console.log(`│ ${line.padEnd(Math.max(line.length, 15))} │`);
        if (i === lines.length - 1) {
          console.log(`└${'─'.repeat(line.length + 2)}┘`);
        }
      });
    }
  }

  // Initial bot message
  showBubble('Assistant', 'Hi there! I\'m your AI assistant. How can I help you today?', false);

  while (true) {
    try {
      console.log();
      const userMessage = await new Promise(resolve => {
        rl.question('Type your message: ', resolve);
      });

      if (userMessage.toLowerCase().trim() === 'exit') {
        showBubble('Assistant', 'Goodbye! Thanks for chatting with me! 👋', false);
        break;
      }

      if (!userMessage.trim()) continue;

      // Show user message
      showBubble('You', userMessage, true);

      // Show typing indicator
      console.log('\n🤖 Assistant is typing...');
      
      // Get response
      const response = await chat.sendMessage(userMessage);
      
      // Clear typing line and show response
      process.stdout.write('\r' + ' '.repeat(30) + '\r');
      showBubble('Assistant', response, false);

    } catch (error) {
      showBubble('Assistant', `Sorry, I encountered an error: ${error.message}`, false);
    }
  }

  rl.close();
}

// Main function
async function main() {
  const style = process.argv[2] || 'pretty';

  switch (style) {
    case 'simple':
      await startChat();
      break;
    case 'pretty':
      await startPrettyChat();
      break;
    case 'bubble':
      await startBubbleChat();
      break;
    default:
      console.log('Usage: node interactive-chat.js [simple|pretty|bubble]');
      console.log('  simple - Basic chat interface');
      console.log('  pretty - Enhanced chat interface (default)');
      console.log('  bubble - Chat bubble style interface');
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ChatSession, startChat, startPrettyChat, startBubbleChat };