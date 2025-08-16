const { spawn } = require('child_process');

// Test if Ollama is responding to a simple prompt
async function testOllama() {
  console.log('Testing Ollama integration...');
  
  const ollama = spawn('ollama', ['run', 'qwen2.5-coder:1.5b', 'Hello! Can you tell me a short joke?']);
  
  let output = '';
  let error = '';
  
  ollama.stdout.on('data', (data) => {
    output += data.toString();
  });
  
  ollama.stderr.on('data', (data) => {
    error += data.toString();
  });
  
  ollama.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Ollama is working correctly!');
      console.log('Response:', output.trim());
    } else {
      console.log('❌ Ollama test failed');
      console.log('Error:', error);
    }
  });
  
  ollama.on('error', (err) => {
    console.log('❌ Failed to start Ollama:', err.message);
  });
}

testOllama();
