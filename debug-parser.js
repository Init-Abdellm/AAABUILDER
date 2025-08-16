const fs = require('fs');
const path = require('path');

// Configurable file path - can be changed via command line argument
const agentFile = process.argv[2] || './my-new-project/agents/chat.agent';

try {
  // Check if file exists
  if (!fs.existsSync(agentFile)) {
    console.error(`Error: File not found: ${agentFile}`);
    console.log('Usage: node debug-parser.js [path-to-agent-file]');
    process.exit(1);
  }

  const content = fs.readFileSync(agentFile, 'utf8');
  const lines = content.split('\n');

  console.log(`=== Debug Agent File Structure: ${path.basename(agentFile)} ===`);
  lines.forEach((line, i) => {
    if (line.includes('outputs') || line.includes('prompt') || line.includes('step') || line.includes('type:')) {
      console.log(`${i+1}: '${line}'`);
    }
  });

  console.log('\n=== Full Content ===');
  console.log(content);

} catch (error) {
  console.error('Error reading or parsing file:', error.message);
  process.exit(1);
}
