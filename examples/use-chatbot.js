#!/usr/bin/env node

/**
 * Practical example: Using a .agent file as a chatbot in a JavaScript application
 * The .agent file contains all the logic - we just provide user input
 */

const fs = require('fs');
const parser = require('../lib/parser/parser');
const orchestrator = require('../lib/core/orchestrator');
const readline = require('readline');

// Simple function to execute any .agent file
async function runAgent(agentFile, input) {
    const content = fs.readFileSync(agentFile, 'utf8');
    const ast = parser.parse(content);
    return await orchestrator.execute(ast, input);
}

// Interactive chatbot using the hello.agent file
async function startChatbot() {
    console.log('🤖 Chatbot powered by .agent file');
    console.log('─'.repeat(40));
    console.log('Type "exit" to quit\n');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    while (true) {
        try {
            // Get user input
            const userInput = await new Promise(resolve => {
                rl.question('You: ', resolve);
            });

            if (userInput.toLowerCase() === 'exit') {
                console.log('👋 Goodbye!');
                break;
            }

            // Execute the agent with user input
            console.log('🤖 Thinking...');
            const response = await runAgent('./examples/hello.agent', {
                name: userInput
            });

            console.log(`Bot: ${response}\n`);

        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    }

    rl.close();
}

// Example: Using agent in a web server
function createWebServer() {
    const http = require('http');
    const url = require('url');

    const server = http.createServer(async (req, res) => {
        if (req.method === 'POST' && req.url === '/chat') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const input = JSON.parse(body);

                    // Execute the agent
                    const result = await runAgent('./examples/hello.agent', input);

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ response: result }));

                } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                }
            });
        } else {
            res.writeHead(404);
            res.end('Not found');
        }
    });

    return server;
}

// Example: Using agent for batch processing
async function batchProcess() {
    console.log('📦 Batch processing with .agent file');
    console.log('─'.repeat(35));

    const users = ['Alice', 'Bob', 'Charlie', 'Diana'];
    const results = [];

    for (const user of users) {
        console.log(`Processing ${user}...`);
        const result = await runAgent('./examples/hello.agent', { name: user });
        results.push({ user, result });
    }

    console.log('\n📊 Batch Results:');
    results.forEach(({ user, result }) => {
        console.log(`${user}: ${result.substring(0, 50)}...`);
    });

    return results;
}

// Main function to demonstrate different usage patterns
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'chat';

    switch (command) {
        case 'chat':
            await startChatbot();
            break;

        case 'server':
            const server = createWebServer();
            server.listen(3000, () => {
                console.log('🌐 Web server running on http://localhost:3000');
                console.log('POST to /chat with JSON: {"name": "Your Name"}');
            });
            break;

        case 'batch':
            await batchProcess();
            break;

        case 'test':
            console.log('🧪 Quick test');
            const result = await runAgent('./examples/hello.agent', { name: 'Test User' });
            console.log('Result:', result);
            break;

        default:
            console.log('Usage: node use-chatbot.js [chat|server|batch|test]');
            console.log('  chat   - Interactive chatbot');
            console.log('  server - Start web server');
            console.log('  batch  - Batch processing example');
            console.log('  test   - Quick test');
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { runAgent, createWebServer, batchProcess };