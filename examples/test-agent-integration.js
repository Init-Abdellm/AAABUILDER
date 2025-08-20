#!/usr/bin/env node

/**
 * Simple test to verify .agent files can be executed from JavaScript
 * The .agent file handles all its own logic - we just provide input and get output
 */

const fs = require('fs');
const parser = require('../lib/parser/parser');
const orchestrator = require('../lib/core/orchestrator');

// Simple helper function to execute any .agent file
async function executeAgent(agentFile, inputData = {}) {
  const content = fs.readFileSync(agentFile, 'utf8');
  const ast = parser.parse(content);
  return await orchestrator.execute(ast, inputData);
}

async function testAgentIntegration() {
  console.log('🧪 Testing .agent file execution from JavaScript');
  console.log('─'.repeat(50));
  
  try {
    // Test 1: Execute the multi-provider agent
    console.log('\n📋 Test 1: Execute multi-provider agent');
    const result1 = await executeAgent('./examples/multi-provider.agent', {
      topic: 'JavaScript Integration',
      max_length: 100
    });
    console.log('✅ Success:', typeof result1 === 'string' ? result1.substring(0, 100) + '...' : result1);
    
    // Test 2: Execute hello agent
    console.log('\n📋 Test 2: Execute hello agent');
    const result2 = await executeAgent('./examples/hello.agent', {
      name: 'Developer'
    });
    console.log('✅ Success:', typeof result2 === 'string' ? result2.substring(0, 100) + '...' : result2);
    
    // Test 3: Multiple executions
    console.log('\n📋 Test 3: Multiple executions');
    const results = [];
    for (let i = 1; i <= 3; i++) {
      const result = await executeAgent('./examples/hello.agent', {
        name: `User${i}`
      });
      results.push(result);
      console.log(`✅ Execution ${i}/3 completed`);
    }
    
    console.log('\n🎉 All tests passed!');
    console.log('🚀 .agent files work perfectly from JavaScript');
    
    // Show simple usage example
    console.log('\n📚 Simple Usage Example:');
    console.log(`
const { executeAgent } = require('./test-agent-integration');

// Execute any .agent file with input data
const result = await executeAgent('./my-agent.agent', {
  // Only provide the input data the agent expects
  topic: 'My Topic',
  name: 'John'
});

console.log('Result:', result);
    `);
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Run test if called directly
if (require.main === module) {
  testAgentIntegration()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { executeAgent, testAgentIntegration };