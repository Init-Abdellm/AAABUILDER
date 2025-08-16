import { AgentDebugger } from '../src/debug/AgentDebugger';
import { AgentTester, TestSuite } from '../src/testing/AgentTester';
import { createProviderRouter } from '../src/providers';

/**
 * Example: Advanced Debugging and Testing Tools Demo
 * Shows how to use the debugging and testing utilities
 */
async function demonstrateDebuggingTools() {
  console.log('🐛 Agent Debugging Tools Demo');
  console.log('==============================');

  // Sample agent for testing
  const agentContent = `
@agent test-chatbot v1
description: "A simple chatbot for testing debugging tools"

trigger:
  type: http
  method: POST
  path: /chat

vars:
  message:
    type: input
    from: body
    required: true
  
  user_id:
    type: input
    from: headers
    required: false
    default: "anonymous"

steps:
  - id: validate_input
    kind: function
    operation: validate
    input: "{message}"
    save: validation_result

  - id: generate_response
    kind: llm
    provider: openai
    model: gpt-4o
    prompt: "You are a helpful assistant. Respond to: {message}"
    when: "{validation_result.valid}"
    save: ai_response

  - id: log_interaction
    kind: function
    operation: log
    input: |
      User: {user_id}
      Message: {message}
      Response: {ai_response}
    save: log_result

outputs:
  response: "{ai_response}"
  user: "{user_id}"
  logged: "{log_result}"
@end
`;

  try {
    // Initialize provider system
    console.log('\n🚀 Initializing provider system...');
    const providerRouter = await createProviderRouter({
      scikitLearn: { enabled: true },
      whisper: { enabled: true }
    });

    // Create debugger
    const agentDebugger = new AgentDebugger(providerRouter);

    // 1. Start debug session
    console.log('\n🔍 Starting debug session...');
    const sessionId = await agentDebugger.startDebugSession(agentContent, {
      body: { message: 'Hello, how are you?' },
      headers: { user_id: 'user123' }
    });

    // 2. Set breakpoint
    console.log('\n🔴 Setting breakpoint on generate_response step...');
    agentDebugger.setBreakpoint(sessionId, 'generate_response');

    // 3. Execute until breakpoint
    console.log('\n▶️  Executing until breakpoint...');
    await agentDebugger.continue(sessionId);

    // 4. Inspect variables at breakpoint
    console.log('\n📊 Variables at breakpoint:');
    const session = agentDebugger.getSessionState(sessionId);
    if (session) {
      for (const [name, value] of Object.entries(session.variables)) {
        console.log(`  ${name}: ${JSON.stringify(value)}`);
      }
    }

    // 5. Modify variable
    console.log('\n📝 Modifying message variable...');
    agentDebugger.setVariable(sessionId, 'message', 'Modified message for testing');

    // 6. Continue execution
    console.log('\n▶️  Continuing execution...');
    await agentDebugger.continue(sessionId);

    // 7. Get execution trace
    console.log('\n📋 Execution trace:');
    const { trace } = agentDebugger.getExecutionTrace(sessionId);
    trace.forEach(line => console.log(`  ${line}`));

    // Clean up
    agentDebugger.stopSession(sessionId);

    console.log('\n✅ Debugging demo completed!');

  } catch (error) {
    console.error('❌ Debugging demo failed:', error);
  }
}

/**
 * Example: Comprehensive Testing Tools Demo
 */
async function demonstrateTestingTools() {
  console.log('\n\n🧪 Agent Testing Tools Demo');
  console.log('============================');

  // Sample agent for testing
  const agentContent = `
@agent calculator v1
description: "A simple calculator agent for testing"

trigger:
  type: http
  method: POST
  path: /calculate

vars:
  operation:
    type: input
    from: body
    required: true
  
  a:
    type: input
    from: body
    required: true
  
  b:
    type: input
    from: body
    required: true

steps:
  - id: validate_numbers
    kind: function
    operation: validate_numbers
    input: "{a}, {b}"
    save: validation

  - id: perform_calculation
    kind: function
    operation: calculate
    input: "{operation}, {a}, {b}"
    when: "{validation.valid}"
    save: result

  - id: format_result
    kind: function
    operation: format
    input: "{result}"
    save: formatted_result

outputs:
  result: "{formatted_result}"
  operation: "{operation}"
@end
`;

  try {
    // Initialize provider system
    const providerRouter = await createProviderRouter();
    const tester = new AgentTester(providerRouter);

    // 1. Validate agent structure
    console.log('\n🔍 Validating agent structure...');
    const validation = await tester.validateAgent(agentContent);
    
    if (validation.valid) {
      console.log('✅ Agent structure is valid');
    } else {
      console.log('❌ Agent structure has issues');
      validation.validationErrors.forEach(error => {
        console.log(`  - ${error}`);
      });
    }

    if (validation.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      validation.warnings.forEach(warning => {
        console.log(`  - ${warning}`);
      });
    }

    // 2. Generate test cases
    console.log('\n🎯 Generating test cases...');
    const generatedTests = tester.generateTestCases(agentContent);
    console.log(`Generated ${generatedTests.length} test cases:`);
    generatedTests.forEach((test, index) => {
      console.log(`  ${index + 1}. ${test.name} - ${test.description}`);
    });

    // 3. Create comprehensive test suite
    console.log('\n📋 Creating test suite...');
    const testSuite: TestSuite = {
      name: 'Calculator Agent Tests',
      description: 'Comprehensive tests for calculator agent',
      agentContent,
      testCases: [
        {
          name: 'Basic addition',
          description: 'Test basic addition operation',
          input: { operation: 'add', a: 5, b: 3 },
          expectedOutput: { result: '8', operation: 'add' },
          tags: ['basic', 'addition']
        },
        {
          name: 'Division by zero',
          description: 'Test division by zero handling',
          input: { operation: 'divide', a: 10, b: 0 },
          shouldFail: true,
          tags: ['edge-case', 'error-handling']
        },
        {
          name: 'Invalid operation',
          description: 'Test invalid operation handling',
          input: { operation: 'invalid', a: 1, b: 2 },
          shouldFail: true,
          tags: ['validation', 'error-handling']
        },
        {
          name: 'Large numbers',
          description: 'Test with large numbers',
          input: { operation: 'multiply', a: 999999, b: 999999 },
          tags: ['edge-case', 'performance']
        },
        {
          name: 'Negative numbers',
          description: 'Test with negative numbers',
          input: { operation: 'subtract', a: -5, b: -3 },
          expectedOutput: { result: '-2', operation: 'subtract' },
          tags: ['negative-numbers']
        }
      ],
      setup: async () => {
        console.log('🔧 Setting up test environment...');
        // Setup mock responses
        tester.setupMockProvider('gpt-4o', {
          content: 'Mock calculation result'
        });
      },
      teardown: async () => {
        console.log('🧹 Cleaning up test environment...');
        tester.clearMockProvider();
      }
    };

    // 4. Run test suite
    console.log('\n🏃 Running test suite...');
    const suiteResult = await tester.runTestSuite(testSuite);

    // 5. Display detailed results
    console.log('\n📊 Detailed Test Results:');
    console.log('=========================');
    
    suiteResult.testResults.forEach((result, index) => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.testCase.name} (${result.duration}ms)`);
      
      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error}`);
      }
      
      if (result.assertions) {
        result.assertions.forEach(assertion => {
          const assertStatus = assertion.passed ? '  ✓' : '  ✗';
          console.log(`${assertStatus} ${assertion.message}`);
        });
      }
    });

    // 6. Performance benchmark
    console.log('\n⏱️  Running performance benchmark...');
    const benchmark = await tester.benchmarkAgent(agentContent, 5);
    
    console.log('📈 Benchmark Results:');
    console.log(`   Average: ${benchmark.averageDuration.toFixed(2)}ms`);
    console.log(`   Min: ${benchmark.minDuration}ms`);
    console.log(`   Max: ${benchmark.maxDuration}ms`);
    console.log(`   Success Rate: ${(benchmark.successRate * 100).toFixed(1)}%`);

    // 7. Mock provider analysis
    console.log('\n🔍 Mock Provider Analysis:');
    const mockLog = tester.getMockProviderLog();
    console.log(`Total provider calls: ${mockLog.length}`);
    
    const modelCalls = mockLog.reduce((acc, call) => {
      acc[call.model] = (acc[call.model] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('Calls by model:');
    for (const [model, count] of Object.entries(modelCalls)) {
      console.log(`  ${model}: ${count} calls`);
    }

    console.log('\n✅ Testing demo completed!');

  } catch (error) {
    console.error('❌ Testing demo failed:', error);
  }
}

/**
 * Example: Interactive Testing Session
 */
async function demonstrateInteractiveTesting() {
  console.log('\n\n🎮 Interactive Testing Demo');
  console.log('============================');

  const agentContent = `
@agent interactive-test v1
description: "Agent for interactive testing demo"

vars:
  user_input:
    type: input
    from: body
    required: true

steps:
  - id: process_input
    kind: llm
    provider: openai
    model: gpt-4o
    prompt: "Process: {user_input}"
    save: result

outputs:
  response: "{result}"
@end
`;

  try {
    const tester = new AgentTester();

    // Simulate interactive testing session
    const testInputs = [
      'Hello world',
      'What is 2+2?',
      'Tell me a joke',
      'Explain quantum physics',
      ''  // Empty input to test validation
    ];

    console.log('🔄 Running interactive test session...');
    
    for (let i = 0; i < testInputs.length; i++) {
      const input = testInputs[i];
      console.log(`\n📝 Test ${i + 1}: "${input}"`);
      
      const testCase = {
        name: `Interactive test ${i + 1}`,
        description: `Test with input: "${input}"`,
        input: { user_input: input },
        shouldFail: input === '' // Empty input should fail
      };

      const result = await tester.runTestCase(agentContent, testCase);
      
      if (result.passed) {
        console.log(`   ✅ Passed (${result.duration}ms)`);
        if (result.output) {
          console.log(`   Output: ${JSON.stringify(result.output).substring(0, 100)}...`);
        }
      } else {
        console.log(`   ❌ Failed (${result.duration}ms)`);
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
      }
    }

    console.log('\n✅ Interactive testing demo completed!');

  } catch (error) {
    console.error('❌ Interactive testing demo failed:', error);
  }
}

// Run all demos
async function main() {
  try {
    await demonstrateDebuggingTools();
    await demonstrateTestingTools();
    await demonstrateInteractiveTesting();
    
    console.log('\n🎉 All debugging and testing demos completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   - Try the interactive playground: npm run playground');
    console.log('   - Create your own test suites for your agents');
    console.log('   - Use the debugger to step through complex agent logic');
    console.log('   - Set up automated testing in your CI/CD pipeline');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

if (require.main === module) {
  main();
}

export { 
  demonstrateDebuggingTools, 
  demonstrateTestingTools, 
  demonstrateInteractiveTesting 
};