import { EnhancedAgentParser, AgentAST } from '../parser/enhanced-parser';
import { ProviderRouter, ProviderValidator } from '../providers';
import { AgentDebugger, StepExecutionResult } from '../debug/AgentDebugger';

/**
 * Test Case
 */
export interface TestCase {
  name: string;
  description?: string;
  input: Record<string, any>;
  expectedOutput?: any;
  expectedSteps?: string[];
  timeout?: number;
  shouldFail?: boolean;
  tags?: string[];
}

/**
 * Test Result
 */
export interface TestResult {
  testCase: TestCase;
  passed: boolean;
  duration: number;
  output?: any;
  error?: string;
  stepResults?: StepExecutionResult[];
  assertions?: AssertionResult[];
}

/**
 * Assertion Result
 */
export interface AssertionResult {
  type: string;
  passed: boolean;
  message: string;
  expected?: any;
  actual?: any;
}

/**
 * Test Suite
 */
export interface TestSuite {
  name: string;
  description?: string;
  agentContent: string;
  testCases: TestCase[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

/**
 * Test Suite Result
 */
export interface TestSuiteResult {
  suite: TestSuite;
  passed: boolean;
  duration: number;
  testResults: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
}

/**
 * Mock Provider for Testing
 */
export class MockProvider {
  private responses: Map<string, any> = new Map();
  private callLog: Array<{ model: string; input: any; timestamp: Date }> = [];

  /**
   * Set mock response for a model
   */
  setMockResponse(model: string, response: any): void {
    this.responses.set(model, response);
  }

  /**
   * Get mock response for a model
   */
  getMockResponse(model: string, input: any): any {
    this.callLog.push({ model, input, timestamp: new Date() });
    return this.responses.get(model) || { content: `Mock response for ${model}` };
  }

  /**
   * Get call log
   */
  getCallLog(): Array<{ model: string; input: any; timestamp: Date }> {
    return [...this.callLog];
  }

  /**
   * Clear call log
   */
  clearCallLog(): void {
    this.callLog = [];
  }

  /**
   * Clear all mock responses
   */
  clearMockResponses(): void {
    this.responses.clear();
  }
}

/**
 * Agent Tester
 * Comprehensive testing utilities for agent files
 */
export class AgentTester {
  private parser: EnhancedAgentParser;
  private debugger: AgentDebugger;
  private mockProvider: MockProvider;
  private providerRouter: ProviderRouter | undefined;

  constructor(providerRouter?: ProviderRouter) {
    this.parser = new EnhancedAgentParser();
    this.debugger = new AgentDebugger(providerRouter);
    this.mockProvider = new MockProvider();
    this.providerRouter = providerRouter;
  }

  /**
   * Run a single test case
   */
  async runTestCase(agentContent: string, testCase: TestCase): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🧪 Running test: ${testCase.name}`);
      
      // Start debug session
      const sessionId = await this.debugger.startDebugSession(agentContent, testCase.input);
      
      // Execute all steps
      const stepResults = await this.debugger.continue(sessionId);
      
      // Get final session state
      const session = this.debugger.getSessionState(sessionId);
      if (!session) {
        throw new Error('Debug session not found');
      }

      const duration = Date.now() - startTime;
      
      // Check if test should fail
      if (testCase.shouldFail && session.status !== 'error') {
        return {
          testCase,
          passed: false,
          duration,
          error: 'Expected test to fail but it succeeded',
          stepResults
        };
      }

      if (!testCase.shouldFail && session.status === 'error') {
        const lastError = stepResults.find(r => r.error)?.error || 'Unknown error';
        return {
          testCase,
          passed: false,
          duration,
          error: lastError,
          stepResults
        };
      }

      // Run assertions
      const assertions = await this.runAssertions(testCase, session, stepResults);
      const passed = assertions.every(a => a.passed);

      // Clean up
      this.debugger.stopSession(sessionId);

      return {
        testCase,
        passed,
        duration,
        output: session.variables,
        stepResults,
        assertions
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        testCase,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Run a test suite
   */
  async runTestSuite(suite: TestSuite): Promise<TestSuiteResult> {
    const startTime = Date.now();
    
    console.log(`\n🧪 Running test suite: ${suite.name}`);
    console.log(`   Description: ${suite.description || 'No description'}`);
    console.log(`   Test cases: ${suite.testCases.length}`);

    // Setup
    if (suite.setup) {
      try {
        await suite.setup();
        console.log('✅ Setup completed');
      } catch (error) {
        console.error('❌ Setup failed:', error);
      }
    }

    const testResults: TestResult[] = [];
    
    // Run each test case
    for (const testCase of suite.testCases) {
      const result = await this.runTestCase(suite.agentContent, testCase);
      testResults.push(result);
      
      if (result.passed) {
        console.log(`  ✅ ${testCase.name} (${result.duration}ms)`);
      } else {
        console.log(`  ❌ ${testCase.name} (${result.duration}ms)`);
        if (result.error) {
          console.log(`     Error: ${result.error}`);
        }
      }
    }

    // Teardown
    if (suite.teardown) {
      try {
        await suite.teardown();
        console.log('✅ Teardown completed');
      } catch (error) {
        console.error('❌ Teardown failed:', error);
      }
    }

    const duration = Date.now() - startTime;
    const summary = {
      total: testResults.length,
      passed: testResults.filter(r => r.passed).length,
      failed: testResults.filter(r => !r.passed).length,
      skipped: 0
    };

    const passed = summary.failed === 0;

    console.log(`\n📊 Test suite results:`);
    console.log(`   Total: ${summary.total}`);
    console.log(`   Passed: ${summary.passed}`);
    console.log(`   Failed: ${summary.failed}`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`);

    return {
      suite,
      passed,
      duration,
      testResults,
      summary
    };
  }

  /**
   * Validate agent syntax and structure
   */
  async validateAgent(agentContent: string): Promise<{
    valid: boolean;
    parseErrors: any[];
    validationErrors: string[];
    warnings: string[];
    recommendations: string[];
  }> {
    const result = {
      valid: true,
      parseErrors: [] as any[],
      validationErrors: [] as string[],
      warnings: [] as string[],
      recommendations: [] as string[]
    };

    // Parse the agent
    const parseResult = this.parser.parse(agentContent);
    if (!parseResult.ast) {
      result.valid = false;
      result.parseErrors = parseResult.validation.errors;
      return result;
    }

    result.warnings = parseResult.validation.warnings.map(w => w.message);

    // Validate against providers if available
    if (this.providerRouter) {
      const validator = new ProviderValidator(this.providerRouter);
      const validation = await validator.validateAgent(parseResult.ast);
      
      if (!validation.valid) {
        result.valid = false;
        result.validationErrors = validation.errors;
      }
      
      result.warnings.push(...validation.warnings);
    }

    // Add recommendations
    result.recommendations = this.generateRecommendations(parseResult.ast);

    return result;
  }

  /**
   * Generate test cases from agent structure
   */
  generateTestCases(agentContent: string): TestCase[] {
    const parseResult = this.parser.parse(agentContent);
    if (!parseResult.ast) {
      return [];
    }

    const testCases: TestCase[] = [];
    const ast = parseResult.ast;

    // Generate basic test case
    const basicInput: Record<string, any> = {};
    for (const [varName, varConfig] of Object.entries(ast.vars)) {
      if (varConfig.required) {
        basicInput[varConfig.from || varName] = this.generateMockValue(varConfig.type);
      }
    }

    testCases.push({
      name: 'Basic execution test',
      description: 'Tests basic agent execution with required inputs',
      input: basicInput,
      tags: ['basic', 'smoke']
    });

    // Generate edge case tests
    if (Object.keys(basicInput).length > 0) {
      testCases.push({
        name: 'Empty input test',
        description: 'Tests agent behavior with empty input',
        input: {},
        shouldFail: true,
        tags: ['edge-case', 'validation']
      });

      testCases.push({
        name: 'Invalid input test',
        description: 'Tests agent behavior with invalid input types',
        input: Object.fromEntries(
          Object.entries(basicInput).map(([key]) => [key, null])
        ),
        shouldFail: true,
        tags: ['edge-case', 'validation']
      });
    }

    // Generate step-specific tests
    for (const step of ast.steps) {
      if (step.when) {
        testCases.push({
          name: `Conditional step test: ${step.id}`,
          description: `Tests conditional execution of step ${step.id}`,
          input: basicInput,
          expectedSteps: [step.id],
          tags: ['conditional', step.id]
        });
      }
    }

    return testCases;
  }

  /**
   * Create performance benchmark
   */
  async benchmarkAgent(agentContent: string, iterations: number = 10): Promise<{
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    successRate: number;
    results: TestResult[];
  }> {
    console.log(`⏱️ Benchmarking agent (${iterations} iterations)...`);

    const testCase: TestCase = {
      name: 'Benchmark test',
      description: 'Performance benchmark test',
      input: this.generateBasicInput(agentContent)
    };

    const results: TestResult[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const result = await this.runTestCase(agentContent, testCase);
      results.push(result);
      
      if ((i + 1) % Math.max(1, Math.floor(iterations / 10)) === 0) {
        console.log(`   Progress: ${i + 1}/${iterations}`);
      }
    }

    const durations = results.map(r => r.duration);
    const successfulResults = results.filter(r => r.passed);

    const benchmark = {
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      successRate: successfulResults.length / results.length,
      results
    };

    console.log(`📊 Benchmark results:`);
    console.log(`   Average duration: ${benchmark.averageDuration.toFixed(2)}ms`);
    console.log(`   Min duration: ${benchmark.minDuration}ms`);
    console.log(`   Max duration: ${benchmark.maxDuration}ms`);
    console.log(`   Success rate: ${(benchmark.successRate * 100).toFixed(1)}%`);

    return benchmark;
  }

  /**
   * Set up mock responses for testing
   */
  setupMockProvider(model: string, response: any): void {
    this.mockProvider.setMockResponse(model, response);
  }

  /**
   * Get mock provider call log
   */
  getMockProviderLog(): Array<{ model: string; input: any; timestamp: Date }> {
    return this.mockProvider.getCallLog();
  }

  /**
   * Clear mock provider state
   */
  clearMockProvider(): void {
    this.mockProvider.clearCallLog();
    this.mockProvider.clearMockResponses();
  }

  // Private helper methods

  private async runAssertions(
    testCase: TestCase, 
    session: any, 
    stepResults: StepExecutionResult[]
  ): Promise<AssertionResult[]> {
    const assertions: AssertionResult[] = [];

    // Check expected output
    if (testCase.expectedOutput !== undefined) {
      const outputAssertion = this.assertOutput(testCase.expectedOutput, session.variables);
      assertions.push(outputAssertion);
    }

    // Check expected steps
    if (testCase.expectedSteps) {
      const stepsAssertion = this.assertSteps(testCase.expectedSteps, stepResults);
      assertions.push(stepsAssertion);
    }

    return assertions;
  }

  private assertOutput(expected: any, actual: any): AssertionResult {
    try {
      const passed = JSON.stringify(expected) === JSON.stringify(actual);
      return {
        type: 'output',
        passed,
        message: passed ? 'Output matches expected' : 'Output does not match expected',
        expected,
        actual
      };
    } catch (error) {
      return {
        type: 'output',
        passed: false,
        message: 'Failed to compare output',
        expected,
        actual
      };
    }
  }

  private assertSteps(expectedSteps: string[], stepResults: StepExecutionResult[]): AssertionResult {
    const actualSteps = stepResults
      .filter(r => r.status === 'completed')
      .map(r => r.stepId);
    
    const passed = expectedSteps.every(step => actualSteps.includes(step));
    
    return {
      type: 'steps',
      passed,
      message: passed ? 'All expected steps executed' : 'Some expected steps were not executed',
      expected: expectedSteps,
      actual: actualSteps
    };
  }

  private generateRecommendations(ast: AgentAST): string[] {
    const recommendations: string[] = [];

    // Check for missing descriptions
    if (!ast.description) {
      recommendations.push('Add a description to explain what this agent does');
    }

    // Check for error handling
    const hasErrorHandling = ast.steps.some(step => step.retries && step.retries > 0);
    if (!hasErrorHandling) {
      recommendations.push('Consider adding retry logic to critical steps');
    }

    // Check for variable validation
    const hasRequiredVars = Object.values(ast.vars).some(v => v.required);
    if (hasRequiredVars) {
      recommendations.push('Consider adding input validation for required variables');
    }

    // Check for step dependencies
    for (const step of ast.steps) {
      if (step.when) {
        const referencedVars = step.when.match(/\{([^}]+)\}/g);
        if (referencedVars) {
          for (const varRef of referencedVars) {
            const varName = varRef.slice(1, -1);
            if (!ast.vars[varName] && !ast.steps.some(s => s.save === varName)) {
              recommendations.push(`Step "${step.id}" references undefined variable: ${varName}`);
            }
          }
        }
      }
    }

    return recommendations;
  }

  private generateMockValue(type: string): any {
    switch (type) {
      case 'string':
        return 'test-string';
      case 'number':
        return 42;
      case 'boolean':
        return true;
      case 'array':
        return ['test', 'array'];
      case 'object':
        return { test: 'object' };
      default:
        return 'test-value';
    }
  }

  private generateBasicInput(agentContent: string): Record<string, any> {
    const parseResult = this.parser.parse(agentContent);
    if (!parseResult.ast) {
      return {};
    }

    const input: Record<string, any> = {};
    for (const [_varName, varConfig] of Object.entries(parseResult.ast.vars)) {
      if (varConfig.required && varConfig.from) {
        input[varConfig.from] = this.generateMockValue(varConfig.type);
      }
    }

    return input;
  }
}