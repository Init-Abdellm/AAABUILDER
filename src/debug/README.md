# Agent Debugging Tools

Advanced debugging capabilities for AAABuilder agents with step-by-step execution, variable inspection, and breakpoint support.

## Features

- **Step-by-step debugging** - Execute agents one step at a time
- **Variable inspection** - View and modify variables during execution
- **Breakpoints** - Pause execution at specific steps
- **Execution tracing** - Detailed logs of agent execution
- **Provider integration** - Works with real or mock providers
- **Error handling** - Graceful handling of step failures

## Quick Start

```typescript
import { AgentDebugger } from '../debug/AgentDebugger';
import { createProviderRouter } from '../providers';

// Initialize debugger with provider system
const providerRouter = await createProviderRouter();
const debugger = new AgentDebugger(providerRouter);

// Start debug session
const sessionId = await debugger.startDebugSession(agentContent, inputData);

// Set breakpoint
debugger.setBreakpoint(sessionId, 'step-id');

// Execute until breakpoint
await debugger.continue(sessionId);

// Inspect variables
const variables = debugger.getSessionState(sessionId)?.variables;

// Step through execution
const result = await debugger.stepNext(sessionId);
```

## API Reference

### AgentDebugger

#### Methods

- `startDebugSession(agentContent, input)` - Start a new debug session
- `stepNext(sessionId)` - Execute the next step
- `continue(sessionId)` - Continue execution until completion or breakpoint
- `setBreakpoint(sessionId, stepId)` - Set a breakpoint on a step
- `removeBreakpoint(sessionId, stepId)` - Remove a breakpoint
- `getVariable(sessionId, name)` - Get variable value
- `setVariable(sessionId, name, value)` - Set variable value
- `getExecutionTrace(sessionId)` - Get detailed execution trace
- `stopSession(sessionId)` - Stop debug session

### Debug Session

```typescript
interface DebugSession {
  sessionId: string;
  agentId: string;
  ast: AgentAST;
  currentStep: number;
  variables: Record<string, any>;
  stepResults: StepExecutionResult[];
  breakpoints: Set<string>;
  status: 'running' | 'paused' | 'completed' | 'error';
  startTime: Date;
  endTime?: Date;
}
```

### Step Execution Result

```typescript
interface StepExecutionResult {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  input?: any;
  output?: any;
  error?: string;
  variables?: Record<string, any>;
  metadata?: Record<string, any>;
}
```

## Examples

### Basic Debugging

```typescript
const debugger = new AgentDebugger();

// Start session
const sessionId = await debugger.startDebugSession(`
@agent test v1
vars:
  message:
    type: input
    required: true
steps:
  - id: process
    kind: llm
    prompt: "Process: {message}"
    save: result
outputs:
  response: "{result}"
@end
`, { message: 'Hello world' });

// Execute step by step
while (true) {
  const result = await debugger.stepNext(sessionId);
  if (!result) break; // Execution completed
  
  console.log(`Step: ${result.stepId}, Status: ${result.status}`);
}
```

### Breakpoint Debugging

```typescript
// Set breakpoint before critical step
debugger.setBreakpoint(sessionId, 'critical-step');

// Execute until breakpoint
await debugger.continue(sessionId);

// Inspect state at breakpoint
const session = debugger.getSessionState(sessionId);
console.log('Variables:', session?.variables);

// Modify variable if needed
debugger.setVariable(sessionId, 'debug_mode', true);

// Continue execution
await debugger.continue(sessionId);
```

### Error Handling

```typescript
const result = await debugger.stepNext(sessionId);

if (result?.status === 'failed') {
  console.error(`Step failed: ${result.error}`);
  
  // Get execution trace for debugging
  const { trace } = debugger.getExecutionTrace(sessionId);
  console.log('Execution trace:', trace);
  
  // Optionally modify variables and retry
  debugger.setVariable(sessionId, 'retry_count', 0);
}
```

## Integration with Testing

The debugger integrates seamlessly with the testing framework:

```typescript
import { AgentTester } from '../testing/AgentTester';

const tester = new AgentTester(providerRouter);

// Use debugger for detailed test analysis
const testCase = {
  name: 'Debug test',
  input: { message: 'test' }
};

const result = await tester.runTestCase(agentContent, testCase);

// If test fails, use debugger to investigate
if (!result.passed) {
  const sessionId = await debugger.startDebugSession(agentContent, testCase.input);
  // Step through to find the issue
}
```

## CLI Usage

Use the interactive playground for debugging:

```bash
npm run playground
```

Commands in playground:
- `debug` - Start debug session
- `step` - Execute next step
- `continue` - Continue execution
- `vars` - Show variables
- `breakpoint <step-id>` - Set breakpoint

## Best Practices

1. **Use meaningful step IDs** - Makes debugging easier
2. **Set breakpoints strategically** - Before complex operations
3. **Inspect variables regularly** - Catch issues early
4. **Use execution traces** - For post-mortem analysis
5. **Combine with testing** - Debug failing tests
6. **Mock providers for testing** - Consistent debugging environment

## Troubleshooting

### Common Issues

1. **Session not found** - Check session ID is correct
2. **Step execution fails** - Check provider availability
3. **Variable not found** - Verify variable names and scope
4. **Breakpoint not hit** - Ensure step ID exists and is reachable

### Debug Tips

- Use `getExecutionTrace()` for comprehensive debugging
- Set multiple breakpoints to narrow down issues
- Modify variables to test different scenarios
- Check step conditions with `when` clauses
- Verify provider responses in mock mode