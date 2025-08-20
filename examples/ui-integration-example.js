#!/usr/bin/env node

/**
 * Practical UI Integration Example
 * Shows how to build a complete multimodal UI application using .agent files
 */

const fs = require('fs');
const parser = require('../lib/parser/parser');
const orchestrator = require('../lib/core/orchestrator');
const http = require('http');
const url = require('url');
const path = require('path');

// Helper function to execute agent
async function runAgent(agentFile, input) {
  const content = fs.readFileSync(agentFile, 'utf8');
  const ast = parser.parse(content);
  return await orchestrator.execute(ast, input);
}

// Multimodal AI Application Server
class MultimodalAIServer {
  constructor(port = 3000) {
    this.port = port;
    this.sessions = new Map(); // Store user sessions
  }

  // Handle different types of AI requests
  async handleAIRequest(operation, data, sessionId = 'default') {
    try {
      let result;
      
      switch (operation) {
        case 'chat':
          // Text-based conversation
          result = await runAgent('./examples/chatbot.agent', {
            message: data.message,
            conversation_history: this.getSessionHistory(sessionId)
          });
          this.addToSession(sessionId, 'user', data.message);
          this.addToSession(sessionId, 'assistant', result);
          break;

        case 'vision':
          // Image analysis
          result = await runAgent('./examples/smart-camera.agent', {
            image: data.image,
            type: data.analysisType || 'all',
            question: data.question
          });
          break;

        case 'voice':
          // Voice processing
          result = await runAgent('./examples/voice-assistant.agent', {
            audio: data.audio,
            text: data.text,
            command: data.command,
            context: this.getSessionHistory(sessionId)
          });
          break;

        case 'multimodal':
          // Combined processing
          result = await runAgent('./examples/multimodal-assistant.agent', {
            operation: 'multimodal',
            text: data.text,
            image: data.image,
            audio: data.audio,
            history: this.getSessionHistory(sessionId)
          });
          break;

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      return {
        success: true,
        result: result,
        sessionId: sessionId,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        sessionId: sessionId,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Session management
  getSessionHistory(sessionId) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, []);
    }
    return this.sessions.get(sessionId)
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
  }

  addToSession(sessionId, role, content) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, []);
    }
    this.sessions.get(sessionId).push({
      role: role,
      content: content,
      timestamp: new Date().toISOString()
    });
  }

  // Create HTTP server
  createServer() {
    return http.createServer(async (req, res) => {
      // Enable CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      const parsedUrl = url.parse(req.url, true);
      const pathname = parsedUrl.pathname;

      try {
        if (req.method === 'GET' && pathname === '/') {
          // Serve demo HTML page
          this.serveDemoPage(res);
        }
        else if (req.method === 'POST' && pathname === '/api/ai') {
          // Handle AI requests
          await this.handleAPIRequest(req, res);
        }
        else if (req.method === 'GET' && pathname === '/api/sessions') {
          // List active sessions
          this.listSessions(res);
        }
        else if (req.method === 'GET' && pathname === '/api/capabilities') {
          // Show available capabilities
          this.showCapabilities(res);
        }
        else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not found' }));
        }
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  }

  // Handle API requests
  async handleAPIRequest(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { operation, sessionId, ...requestData } = data;

        console.log(`🤖 Processing ${operation} request for session ${sessionId || 'default'}`);
        
        const result = await this.handleAIRequest(operation, requestData, sessionId);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request: ' + error.message }));
      }
    });
  }

  // List active sessions
  listSessions(res) {
    const sessionList = Array.from(this.sessions.entries()).map(([id, history]) => ({
      sessionId: id,
      messageCount: history.length,
      lastActivity: history[history.length - 1]?.timestamp || null
    }));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ sessions: sessionList }));
  }

  // Show available capabilities
  showCapabilities(res) {
    const capabilities = {
      chat: {
        description: 'Text-based conversation with memory',
        endpoint: '/api/ai',
        method: 'POST',
        example: {
          operation: 'chat',
          message: 'Hello, how are you?',
          sessionId: 'user123'
        }
      },
      vision: {
        description: 'Image analysis and OCR',
        endpoint: '/api/ai',
        method: 'POST',
        example: {
          operation: 'vision',
          image: 'base64_image_data',
          analysisType: 'all',
          question: 'What do you see in this image?'
        }
      },
      voice: {
        description: 'Speech-to-text and text-to-speech',
        endpoint: '/api/ai',
        method: 'POST',
        example: {
          operation: 'voice',
          audio: 'base64_audio_data',
          command: 'process'
        }
      },
      multimodal: {
        description: 'Combined text, image, and audio processing',
        endpoint: '/api/ai',
        method: 'POST',
        example: {
          operation: 'multimodal',
          text: 'Analyze this',
          image: 'base64_image_data',
          audio: 'base64_audio_data'
        }
      }
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ capabilities }));
  }

  // Serve demo HTML page
  serveDemoPage(res) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Multimodal AI Assistant</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .container { background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 10px 0; }
        .chat-container { height: 400px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; background: white; }
        .message { margin: 10px 0; padding: 10px; border-radius: 5px; }
        .user { background: #007bff; color: white; text-align: right; }
        .assistant { background: #e9ecef; }
        input, textarea, select { width: 100%; padding: 10px; margin: 5px 0; border: 1px solid #ddd; border-radius: 5px; }
        button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
        button:hover { background: #0056b3; }
        .capability { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #007bff; }
    </style>
</head>
<body>
    <h1>🤖 Multimodal AI Assistant</h1>
    <p>Powered by .agent files - Experience the full power of AI in your browser!</p>

    <div class="container">
        <h2>💬 Chat Assistant</h2>
        <div id="chatContainer" class="chat-container"></div>
        <input type="text" id="messageInput" placeholder="Type your message..." onkeypress="if(event.key==='Enter') sendMessage()">
        <button onclick="sendMessage()">Send</button>
    </div>

    <div class="container">
        <h2>👁️ Vision Analysis</h2>
        <input type="file" id="imageInput" accept="image/*">
        <select id="analysisType">
            <option value="all">Complete Analysis</option>
            <option value="classify">Classification Only</option>
            <option value="detect">Object Detection</option>
            <option value="ocr">Text Extraction (OCR)</option>
        </select>
        <input type="text" id="imageQuestion" placeholder="Ask a question about the image...">
        <button onclick="analyzeImage()">Analyze Image</button>
        <div id="visionResult"></div>
    </div>

    <div class="container">
        <h2>🎵 Voice Assistant</h2>
        <button onclick="startRecording()" id="recordBtn">🎤 Start Recording</button>
        <button onclick="stopRecording()" id="stopBtn" disabled>⏹️ Stop Recording</button>
        <div id="voiceResult"></div>
    </div>

    <div class="container">
        <h2>🚀 Available Capabilities</h2>
        <div class="capability">
            <h3>🧠 Large Language Models</h3>
            <p>Conversational AI, text generation, reasoning, and analysis</p>
        </div>
        <div class="capability">
            <h3>👁️ Computer Vision</h3>
            <p>Image classification, object detection, OCR, and visual analysis</p>
        </div>
        <div class="capability">
            <h3>🎵 Audio Processing</h3>
            <p>Speech-to-text, text-to-speech, and voice command processing</p>
        </div>
        <div class="capability">
            <h3>🔗 API Integration</h3>
            <p>External service integration and data processing</p>
        </div>
    </div>

    <script>
        const sessionId = 'demo-' + Math.random().toString(36).substr(2, 9);
        let mediaRecorder;
        let audioChunks = [];

        // Chat functionality
        async function sendMessage() {
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            if (!message) return;

            addMessageToChat('user', message);
            input.value = '';

            try {
                const response = await fetch('/api/ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        operation: 'chat',
                        message: message,
                        sessionId: sessionId
                    })
                });

                const result = await response.json();
                if (result.success) {
                    addMessageToChat('assistant', result.result);
                } else {
                    addMessageToChat('assistant', 'Error: ' + result.error);
                }
            } catch (error) {
                addMessageToChat('assistant', 'Connection error: ' + error.message);
            }
        }

        function addMessageToChat(role, message) {
            const container = document.getElementById('chatContainer');
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ' + role;
            messageDiv.textContent = message;
            container.appendChild(messageDiv);
            container.scrollTop = container.scrollHeight;
        }

        // Vision functionality
        async function analyzeImage() {
            const fileInput = document.getElementById('imageInput');
            const analysisType = document.getElementById('analysisType').value;
            const question = document.getElementById('imageQuestion').value;
            
            if (!fileInput.files[0]) {
                alert('Please select an image first');
                return;
            }

            const file = fileInput.files[0];
            const base64 = await fileToBase64(file);

            try {
                const response = await fetch('/api/ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        operation: 'vision',
                        image: base64,
                        analysisType: analysisType,
                        question: question
                    })
                });

                const result = await response.json();
                const resultDiv = document.getElementById('visionResult');
                
                if (result.success) {
                    resultDiv.innerHTML = '<h4>Analysis Result:</h4><p>' + result.result + '</p>';
                } else {
                    resultDiv.innerHTML = '<h4>Error:</h4><p>' + result.error + '</p>';
                }
            } catch (error) {
                document.getElementById('visionResult').innerHTML = '<h4>Error:</h4><p>' + error.message + '</p>';
            }
        }

        function fileToBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
            });
        }

        // Voice functionality
        async function startRecording() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = event => {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                    const base64 = await blobToBase64(audioBlob);
                    
                    try {
                        const response = await fetch('/api/ai', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                operation: 'voice',
                                audio: base64,
                                command: 'process'
                            })
                        });

                        const result = await response.json();
                        const resultDiv = document.getElementById('voiceResult');
                        
                        if (result.success) {
                            resultDiv.innerHTML = '<h4>Voice Processing Result:</h4><p>' + result.result + '</p>';
                        } else {
                            resultDiv.innerHTML = '<h4>Error:</h4><p>' + result.error + '</p>';
                        }
                    } catch (error) {
                        document.getElementById('voiceResult').innerHTML = '<h4>Error:</h4><p>' + error.message + '</p>';
                    }
                };

                mediaRecorder.start();
                document.getElementById('recordBtn').disabled = true;
                document.getElementById('stopBtn').disabled = false;
            } catch (error) {
                alert('Microphone access denied: ' + error.message);
            }
        }

        function stopRecording() {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                document.getElementById('recordBtn').disabled = false;
                document.getElementById('stopBtn').disabled = true;
            }
        }

        function blobToBase64(blob) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
            });
        }

        // Initialize chat
        addMessageToChat('assistant', 'Hello! I\\'m your multimodal AI assistant. I can help with text, images, and voice. How can I assist you today?');
    </script>
</body>
</html>
    `;

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  // Start the server
  start() {
    const server = this.createServer();
    server.listen(this.port, () => {
      console.log('🚀 Multimodal AI Server Started');
      console.log('═'.repeat(40));
      console.log(`🌐 Web Interface: http://localhost:${this.port}`);
      console.log(`📡 API Endpoint: http://localhost:${this.port}/api/ai`);
      console.log(`📊 Capabilities: http://localhost:${this.port}/api/capabilities`);
      console.log(`👥 Sessions: http://localhost:${this.port}/api/sessions`);
      console.log();
      console.log('🎯 Available Operations:');
      console.log('  • chat - Text conversation with memory');
      console.log('  • vision - Image analysis and OCR');
      console.log('  • voice - Speech processing');
      console.log('  • multimodal - Combined processing');
      console.log();
      console.log('💡 Try the web interface for a complete demo!');
    });

    return server;
  }
}

// CLI interface
async function main() {
  const command = process.argv[2] || 'server';

  switch (command) {
    case 'server':
      const port = process.argv[3] || 3000;
      const server = new MultimodalAIServer(port);
      server.start();
      break;

    case 'test':
      console.log('🧪 Testing multimodal capabilities...');
      
      // Test chat
      console.log('\n💬 Testing Chat:');
      const chatResult = await runAgent('./examples/chatbot.agent', {
        message: 'Hello, I am testing the system',
        conversation_history: 'This is the start of our conversation.'
      });
      console.log('Chat Response:', chatResult);

      break;

    default:
      console.log('Usage: node ui-integration-example.js [server|test] [port]');
      console.log('  server - Start multimodal AI server (default)');
      console.log('  test   - Test agent capabilities');
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { MultimodalAIServer };