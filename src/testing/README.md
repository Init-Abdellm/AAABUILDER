# Agent Testing Tools

Comprehensive testing framework for AAABuilder agents with automated test generation, performance benchmarking, and mock providers.

## Features

- **Automated test generation** - Generate test cases from agent structure
- **Test suites** - Organize and run multiple test cases
- **Mock providers** - Consistent testing environment
- **Performance benchmarking** - Measure agent performance
- **Assertion framework** - Validate outputs and behavior
- **Agent validation** - Check syntax and provider compatibility

## Quick Start

```typescript
import { AgentTester } from '../testing/AgentTester';
import { createProviderRouter } from '../providers';

// Initialize tester with provider system
const providerRouter = await createProviderRouter();
const tester = new AgentTester(providerRouter);

// Run a simple test
const testCase = {
  name: 'Basic test',
  input: { message: 'Hello' },
  expectedOutput: { response: 'Hello back!' }
};

const result = await tester.runTestCase(agentContent, testCase);
console.log(`Test ${result.passed ? 'passed' : 'failed'}`);
```

## API Reference

### AgentTester

#### Methods

- `runTestCase(agentContent, testCase)` - Run a single test case
- `runTestSuite(testSuite)` - Run a complete test suite
- `validateAgent(agentContent)` - Validate agent structure
- `generateTestCases(agentContent)` - Generate test cases automatically
- `benchmarkAgent(agentContent, iterations)` - Performance benchmark
- `setupMockProvider(model, response)` - Configure mock responses
- `getMockProviderLog()` - Get provider call history
- `clearMockProvider()` - Reset mock provider state

### Test Case

```typescript
interface TestCase {
  name: string;
  description?: string;
  input: Record<string, any>;
  expectedOutput?: any;
  expectedSteps?: string[];
  timeout?: number;
  shouldFail?: boolean;
  tags?: string[];
}
```

### Test Suite

```typescript
interface TestSuite {
  name: string;
  description?: string;
  agentContent: string;
  testCases: TestCase[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}
```

### Test Result

```typescript
interface TestResult {
  testCase: TestCase;
  passed: boolean;
  duration: number;
  output?: any;
  error?: string;
  stepResults?: StepExecutionResult[];
  assertions?: AssertionResult[];
}
```

## Examples

### Basic Testing

```typescript
const tester = new AgentTester();

const agentContent = `
@agent calculator v1
vars:
  a: { type: input, required: true }
  b: { type: input, required: true }
steps:
  - id: add
    kind: function
    operation: add
    input: "{a}, {b}"
    save: result
outputs:
  sum: "{result}"
@end
`;

const testCase = {
  name: 'Addition test',
  input: { a: 5, b: 3 },
  expectedOutput: { sum: 8 }
};

const result = await tester.runTestCase(agentContent, testCase);
```

### Test Suite

```typescript
const testSuite = {
  name: 'Calculator Tests',
  description: 'Test calculator agent functionality',
  agentContent,
  testCases: [
    {
      name: 'Basic addition',
      input: { a: 2, b: 3 },
      expectedOutput: { sum: 5 }
    },
    {
      name: 'Negative numbers',
      input: { a: -1, b: 1 },
      expectedOutput: { sum: 0 }
    },
    {
      name: 'Zero addition',
      input: { a: 0, b: 5 },
      expectedOutput: { sum: 5 }
    }
  ],
  setup: async () => {
    console.log('Setting up calculator tests...');
  },
  teardown: async () => {
    console.log('Cleaning up calculator tests...');
  }
};

const suiteResult = await tester.runTestSuite(testSuite);
console.log(`Suite: ${suiteResult.passed ? 'PASSED' : 'FAILED'}`);
console.log(`Tests: ${suiteResult.summary.passed}/${suiteResult.summary.total}`);
```

### Mock Providers

```typescript
// Setup mock responses
tester.setupMockProvider('gpt-4o', {
  content: 'Mock LLM response for testing'
});

tester.setupMockProvider('whisper-1', {
  transcription: 'Mock transcription result'
});

// Run tests with mocks
const result = await tester.runTestCase(agentContent, testCase);

// Check what was called
const callLog = tester.getMockProviderLog();
console.log(`Provider calls: ${callLog.length}`);

// Clear mocks
tester.clearMockProvider();
```

### Automated Test Generation

```typescript
// Generate test cases from agent structure
const generatedTests = tester.generateTestCases(agentContent);

console.log(`Generated ${generatedTests.length} test cases:`);
generatedTests.forEach(test => {
  console.log(`- ${test.name}: ${test.description}`);
});

// Run generated tests
for (const testCase of generatedTests) {
  const result = await tester.runTestCase(agentContent, testCase);
  console.log(`${testCase.name}: ${result.passed ? 'PASS' : 'FAIL'}`);
}
```

### Performance Benchmarking

```typescript
// Benchmark agent performance
const benchmark = await tester.benchmarkAgent(agentContent, 10);

console.log('Performance Results:');
console.log(`Average: ${benchmark.averageDuration.toFixed(2)}ms`);
console.log(`Min: ${benchmark.minDuration}ms`);
console.log(`Max: ${benchmark.maxDuration}ms`);
console.log(`Success Rate: ${(benchmark.successRate * 100).toFixed(1)}%`);

// Analyze results
if (benchmark.averageDuration > 1000) {
  console.warn('Agent performance is slow, consider optimization');
}

if (benchmark.successRate < 0.95) {
  console.warn('Agent reliability is low, check error handling');
}
```

### Agent Validation

```typescript
// Validate agent structure and providers
const validation = await tester.validateAgent(agentContent);

if (validation.valid) {
  console.log('✅ Agent is valid');
} else {
  console.log('❌ Agent validation failed');
  
  validation.parseErrors.forEach(error => {
    console.log(`Parse error: ${error.message}`);
  });
  
  validation.validationErrors.forEach(error => {
    console.log(`Validation error: ${error}`);
  });
}

// Show recommendations
validation.recommendations.forEach(rec => {
  console.log(`💡 ${rec}`);
});
```

### Error Testing

```typescript
const errorTests = [
  {
    name: 'Missing required input',
    input: {}, // Missing required fields
    shouldFail: true
  },
  {
    name: 'Invalid input type',
    input: { number_field: 'not a number' },
    shouldFail: true
  },
  {
    name: 'Provider timeout',
    input: { message: 'test' },
    timeout: 100, // Very short timeout
    shouldFail: true
  }
];

for (const testCase of errorTests) {
  const result = await tester.runTestCase(agentContent, testCase);
  
  if (testCase.shouldFail && !result.passed) {
    console.log(`✅ ${testCase.name} failed as expected`);
  } else if (testCase.shouldFail && result.passed) {
    console.log(`❌ ${testCase.name} should have failed but passed`);
  }
}
```

## Integration with CI/CD

### Jest Integration

```typescript
// tests/agent.test.ts
import { AgentTester } from '../src/testing/AgentTester';

describe('Calculator Agent', () => {
  let tester: AgentTester;
  
  beforeEach(() => {
    tester = new AgentTester();
  });
  
  afterEach(() => {
    tester.clearMockProvider();
  });
  
  test('should add two numbers', async () => {
    const result = await tester.runTestCase(agentContent, {
      name: 'Addition test',
      input: { a: 2, b: 3 },
      expectedOutput: { sum: 5 }
    });
    
    expect(result.passed).toBe(true);
  });
});
```

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Agent Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test
      - run: npm run demo:debug
```

## CLI Usage

Run tests from command line:

```bash
# Run debugging demo with tests
npm run demo:debug

# Interactive playground with testing
npm run playground
```

Playground commands:
- `test` - Run basic test
- `test generate` - Generate test cases
- `validate` - Validate agent structure
- `benchmark` - Run performance benchmark

## Best Practices

### Test Organization

1. **Group related tests** - Use test suites for organization
2. **Use descriptive names** - Clear test case names and descriptions
3. **Tag tests** - Use tags for filtering and organization
4. **Setup/teardown** - Clean test environment

### Test Data

1. **Use realistic data** - Test with real-world inputs
2. **Edge cases** - Test boundary conditions
3. **Error scenarios** - Test failure modes
4. **Performance data** - Test with large inputs

### Mock Management

1. **Consistent mocks** - Use same mock responses across tests
2. **Clear mocks** - Reset between tests
3. **Log analysis** - Check provider call patterns
4. **Realistic responses** - Mock responses should match real providers

### Assertions

1. **Multiple assertions** - Test different aspects
2. **Specific expectations** - Precise expected outputs
3. **Step validation** - Check intermediate steps
4. **Error validation** - Verify error handling

## Troubleshooting

### Common Issues

1. **Test timeouts** - Increase timeout for slow operations
2. **Mock not working** - Check mock setup and model names
3. **Assertion failures** - Verify expected vs actual output format
4. **Provider errors** - Check provider availability and configuration

### Debug Failed Tests

```typescript
// When a test fails, use debugger for investigation
if (!result.passed) {
  console.log('Test failed, starting debug session...');
  
  const debugger = new AgentDebugger();
  const sessionId = await debugger.startDebugSession(
    agentContent, 
    testCase.input
  );
  
  // Step through to find the issue
  await debugger.continue(sessionId);
  const trace = debugger.getExecutionTrace(sessionId);
  console.log('Execution trace:', trace);
}
```