#!/usr/bin/env node

/**
 * Continuous conversation system with memory/context
 * Maintains chat history for contextual responses
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

// Conversation manager class
class ConversationManager {
  constructor(agentFile) {
    this.agentFile = agentFile;
    this.conversationHistory = [];
    this.maxHistoryLength = 10; // Keep last 10 exchanges
  }

  // Add message to conversation history
  addToHistory(role, message) {
    this.conversationHistory.push({
      role: role,
      message: message,
      timestamp: new Date().toISOString()
    });

    // Keep only recent history to avoid token limits
    if (this.conversationHistory.length > this.maxHistoryLength * 2) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength * 2);
    }
  }

  // Format conversation history for the agent
  formatHistory() {
    if (this.conversationHistory.length === 0) {
      return "This is the start of the conversation.";
    }

    return this.conversationHistory
      .map(entry => `${entry.role}: ${entry.message}`)
      .join('\n');
  }

  // Send message and get response
  async sendMessage(userMessage) {
    // Add user message to history
    this.addToHistory('User', userMessage);

    // Prepare input for agent
    const input = {
      message: userMessage,
      conversation_history: this.formatHistory()
    };

    try {
      // Get response from agent
      const response = await runAgent(this.agentFile, input);
      
      // Add bot response to history
      this.addToHistory('Assistant', response);
      
      return response;
    } catch (error) {
      const errorMsg = `Sorry, I encountered an error: ${error.message}`;
      this.addToHistory('Assistant', errorMsg);
      return errorMsg;
    }
  }

  // Get conversation summary
  getSummary() {
    return {
      totalMessages: this.conversationHistory.length,
      userMessages: this.conversationHistory.filter(m => m.role === 'User').length,
      assistantMessages: this.conversationHistory.filter(m => m.role === 'Assistant').length,
      conversationStarted: this.conversationHistory[0]?.timestamp,
      lastMessage: this.conversationHistory[this.conversationHistory.length - 1]?.timestamp
    };
  }

  // Save conversation to file
  saveConversation(filename) {
    const data = {
      summary: this.getSummary(),
      history: this.conversationHistory
    };
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`💾 Conversation saved to ${filename}`);
  }

  // Load conversation from file
  loadConversation(filename) {
    if (fs.existsSync(filename)) {
      const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
      this.conversationHistory = data.history || [];
      console.log(`📂 Conversation loaded from ${filename}`);
      console.log(`📊 Loaded ${this.conversationHistory.length} messages`);
    }
  }
}

// Interactive chat interface
async function startInteractiveChat() {
  console.log('🤖 Continuous Conversation Chatbot');
  console.log('═'.repeat(40));
  console.log('Commands:');
  console.log('  /save <filename> - Save conversation');
  console.log('  /load <filename> - Load conversation');
  console.log('  /history - Show conversation history');
  console.log('  /summary - Show conversation summary');
  console.log('  /clear - Clear conversation history');
  console.log('  /exit - Exit chat');
  console.log('═'.repeat(40));
  console.log();

  const conversation = new ConversationManager('./examples/chatbot.agent');
  
  // Try to load previous conversation
  conversation.loadConversation('chat-history.json');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  while (true) {
    try {
      const userInput = await new Promise(resolve => {
        rl.question('You: ', resolve);
      });

      // Handle commands
      if (userInput.startsWith('/')) {
        const [command, ...args] = userInput.slice(1).split(' ');
        
        switch (command) {
          case 'exit':
            console.log('👋 Goodbye! Conversation saved automatically.');
            conversation.saveConversation('chat-history.json');
            rl.close();
            return;

          case 'save':
            const saveFile = args[0] || 'chat-history.json';
            conversation.saveConversation(saveFile);
            continue;

          case 'load':
            const loadFile = args[0] || 'chat-history.json';
            conversation.loadConversation(loadFile);
            continue;

          case 'history':
            console.log('\n📜 Conversation History:');
            console.log('─'.repeat(30));
            conversation.conversationHistory.forEach((entry, i) => {
              console.log(`${i + 1}. ${entry.role}: ${entry.message.substring(0, 100)}${entry.message.length > 100 ? '...' : ''}`);
            });
            console.log();
            continue;

          case 'summary':
            const summary = conversation.getSummary();
            console.log('\n📊 Conversation Summary:');
            console.log('─'.repeat(25));
            console.log(`Total Messages: ${summary.totalMessages}`);
            console.log(`Your Messages: ${summary.userMessages}`);
            console.log(`Bot Messages: ${summary.assistantMessages}`);
            console.log(`Started: ${summary.conversationStarted || 'N/A'}`);
            console.log(`Last Message: ${summary.lastMessage || 'N/A'}`);
            console.log();
            continue;

          case 'clear':
            conversation.conversationHistory = [];
            console.log('🗑️  Conversation history cleared.');
            continue;

          default:
            console.log(`❓ Unknown command: /${command}`);
            continue;
        }
      }

      // Regular message
      if (userInput.trim()) {
        console.log('🤖 Thinking...');
        const response = await conversation.sendMessage(userInput);
        console.log(`Bot: ${response}\n`);
      }

    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }
}

// Web server with conversation sessions
function createConversationServer() {
  const http = require('http');
  const url = require('url');
  
  // Store conversations by session ID
  const sessions = new Map();

  const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === 'POST' && req.url === '/chat') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const { message, sessionId = 'default' } = JSON.parse(body);

          // Get or create conversation for this session
          if (!sessions.has(sessionId)) {
            sessions.set(sessionId, new ConversationManager('./examples/chatbot.agent'));
          }
          
          const conversation = sessions.get(sessionId);
          const response = await conversation.sendMessage(message);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            response,
            sessionId,
            messageCount: conversation.conversationHistory.length
          }));

        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    } 
    else if (req.method === 'GET' && req.url === '/sessions') {
      // List active sessions
      const sessionList = Array.from(sessions.keys()).map(sessionId => ({
        sessionId,
        messageCount: sessions.get(sessionId).conversationHistory.length,
        summary: sessions.get(sessionId).getSummary()
      }));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ sessions: sessionList }));
    }
    else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  return server;
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'chat';

  switch (command) {
    case 'chat':
      await startInteractiveChat();
      break;

    case 'server':
      const port = args[1] || 3000;
      const server = createConversationServer();
      server.listen(port, () => {
        console.log(`🌐 Conversation server running on http://localhost:${port}`);
        console.log('Endpoints:');
        console.log(`  POST /chat - Send message (JSON: {"message": "hi", "sessionId": "user123"})`);
        console.log(`  GET /sessions - List active sessions`);
        console.log('\nExample curl:');
        console.log(`curl -X POST http://localhost:${port}/chat \\`);
        console.log(`  -H "Content-Type: application/json" \\`);
        console.log(`  -d '{"message": "Hello!", "sessionId": "test"}'`);
      });
      break;

    case 'test':
      console.log('🧪 Testing continuous conversation...');
      const testConv = new ConversationManager('./examples/chatbot.agent');
      
      const messages = [
        "Hi, my name is John",
        "What's my name?",
        "I like programming in JavaScript",
        "What programming language did I mention?"
      ];

      for (const msg of messages) {
        console.log(`\nUser: ${msg}`);
        const response = await testConv.sendMessage(msg);
        console.log(`Bot: ${response}`);
      }

      console.log('\n📊 Final Summary:', testConv.getSummary());
      break;

    default:
      console.log('Usage: node continuous-chat.js [chat|server|test]');
      console.log('  chat   - Interactive chat with memory');
      console.log('  server - Start web server with sessions');
      console.log('  test   - Test conversation memory');
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ConversationManager, createConversationServer };