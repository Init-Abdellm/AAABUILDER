# Contributing to AAABuilder

Thank you for your interest in contributing to AAABuilder! This document provides comprehensive guidelines and information for contributors working with our advanced AI/ML development framework.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Architecture](#project-architecture)
- [Development Tools](#development-tools)
- [Code Style](#code-style)
- [Testing](#testing)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Code of Conduct](#code-of-conduct)

## Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- TypeScript 5.3+ (recommended)
- Git

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/AAABuilder.git
   cd AAABuilder
   ```

## Development Setup

### Install Dependencies

```bash
npm install
```

### Build the Project

```bash
npm run build
```

### Start Development Server

```bash
npm run dev
```

### Run Tests

```bash
npm test
```

### Linting and Formatting

```bash
# Check for linting issues
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Format code
npm run format

# Type checking
npm run type-check
```

## Project Architecture

### Directory Structure

```
AAABuilder/
├── src/                          # TypeScript source code
│   ├── providers/                # Unified provider system
│   │   ├── ProviderRouter.ts        # Central router
│   │   ├── ModelRegistry.ts         # Provider registry
│   │   ├── ModelOptimizer.ts        # Optimization framework
│   │   ├── AudioProviders.ts        # Audio processing
│   │   ├── Traditional ML/          # Scikit-learn, XGBoost, etc.
│   │   ├── Computer Vision/         # YOLO, ResNet, etc.
│   │   └── Audio Processing/        # Whisper, emotion detection
│   ├── debug/                    # Debugging tools
│   │   └── AgentDebugger.ts         # Step-by-step debugging
│   ├── testing/                  # Testing framework
│   │   └── AgentTester.ts           # Automated testing
│   ├── scaffolding/             # Project scaffolding
│   │   └── ProjectScaffolder.ts     # Template system
│   ├── documentation/            # Auto-documentation
│   │   └── DocumentationGenerator.ts
│   ├── playground/               # Interactive development
│   │   └── AgentPlayground.ts       # Real-time environment
│   └── security/                 # Security types
│       └── types.ts                 # Auth & authorization
├── lib/                          # Compiled JavaScript
├── bin/                          # CLI executables
├── examples/                     # Example agents
├── templates/                    # Project templates
└── plugins/                      # Plugin system
```

### Key Components

- **Provider System**: Unified interface for all AI/ML model types
- **Debugging Framework**: Step-by-step debugging with breakpoints
- **Testing Framework**: Automated test generation and benchmarking
- **Scaffolding**: Interactive project creation with templates
- **Documentation**: Auto-generation of comprehensive docs
- **Playground**: Real-time development environment
- **Security**: Enterprise-grade authentication and authorization

## Development Tools

### Interactive Playground

Start the interactive development environment:

```bash
npm run playground
```

Available commands:
- `load <file>` - Load agent file
- `debug <file>` - Start debugging session
- `test <file>` - Run tests
- `validate <file>` - Validate agent
- `docs <file>` - Generate documentation
- `help` - Show available commands

### Project Scaffolding

Create new projects with templates:

```bash
# Interactive project creation
npm run create

# Create from specific template
npm run create:interactive

# List available templates
npm run templates
```

### Auto-Documentation

Generate comprehensive documentation:

```bash
# Generate markdown documentation
npm run docs

# Generate HTML documentation
npm run docs:html

# Generate OpenAPI specification
npm run docs:openapi

# Watch mode for development
npm run docs:watch

# Validate documentation
npm run docs:validate
```

### Debugging Tools

Use the debugging framework for step-by-step execution:

```typescript
import { AgentDebugger } from './src/debug';

const debugger = new AgentDebugger(providerRouter);

// Start debug session
const sessionId = await debugger.startDebugSession(agentContent, inputData);

// Set breakpoints
debugger.setBreakpoint(sessionId, 'step-id');

// Step through execution
const result = await debugger.stepNext(sessionId);

// Inspect variables
const variables = debugger.getSessionState(sessionId)?.variables;
```

### Testing Framework

Use the comprehensive testing framework:

```typescript
import { AgentTester } from './src/testing';

const tester = new AgentTester(providerRouter);

// Run test suite
const testSuite = {
  name: 'My Agent Tests',
  agentContent: agentFile,
  testCases: [
    {
      name: 'Basic functionality',
      input: { message: 'Hello' },
      expectedOutput: { response: 'Hello back!' },
      timeout: 5000
    }
  ]
};

const results = await tester.runTestSuite(testSuite);

// Performance benchmarking
const benchmark = await tester.benchmarkAgent(agentContent, {
  iterations: 100,
  concurrency: 10
});
```

## Code Style

### TypeScript Guidelines

- Use TypeScript for all new code
- Prefer `const` over `let` when possible
- Use explicit return types for public functions
- Avoid `any` type - use proper typing instead
- Use interfaces for object shapes
- Prefer arrow functions for callbacks
- Use async/await over Promises
- Use proper error handling with try/catch

### JavaScript Guidelines

- Use ES6+ features
- Use `const` and `let` appropriately
- Use template literals for string interpolation
- Use destructuring for object and array assignments
- Use arrow functions for callbacks
- Use async/await for asynchronous operations

### Naming Conventions

- **Files**: Use kebab-case for file names (e.g., `agent-debugger.ts`)
- **Classes**: Use PascalCase (e.g., `AgentDebugger`)
- **Functions/Variables**: Use camelCase (e.g., `startDebugSession`)
- **Constants**: Use UPPER_SNAKE_CASE (e.g., `MAX_RETRY_ATTEMPTS`)
- **Interfaces**: Use PascalCase with descriptive names (e.g., `DebugSessionConfig`)

### Code Organization

- Group related functionality in modules
- Use barrel exports (index.ts) for clean imports
- Keep functions small and focused
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Use proper error handling and logging

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test suites
npm test -- --testNamePattern="Provider"
npm test -- --testPathPattern="debug"

# Generate coverage report
npm run test:coverage

# Run tests with verbose output
npm test -- --verbose
```

### Writing Tests

- Write tests for all new functionality
- Use descriptive test names
- Test both success and error cases
- Mock external dependencies
- Use proper assertions
- Group related tests in describe blocks

### Test Structure

```typescript
describe('AgentDebugger', () => {
  let debugger: AgentDebugger;
  let providerRouter: ProviderRouter;

  beforeEach(async () => {
    providerRouter = await createProviderRouter();
    debugger = new AgentDebugger(providerRouter);
  });

  afterEach(async () => {
    await providerRouter.shutdown();
  });

  describe('startDebugSession', () => {
    it('should create a new debug session', async () => {
      const sessionId = await debugger.startDebugSession(agentContent, inputData);
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
    });

    it('should throw error for invalid agent content', async () => {
      await expect(
        debugger.startDebugSession('invalid content', {})
      ).rejects.toThrow('Invalid agent content');
    });
  });
});
```

### Performance Testing

```typescript
describe('Performance Tests', () => {
  it('should handle large agent files efficiently', async () => {
    const largeAgentContent = generateLargeAgentContent();
    const startTime = Date.now();
    
    const result = await debugger.startDebugSession(largeAgentContent, {});
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(1000); // Should complete within 1 second
    expect(result).toBeDefined();
  });
});
```

## Documentation

### Code Documentation

- Add JSDoc comments for all public functions and classes
- Include parameter types and return types
- Provide usage examples for complex functions
- Document error conditions and exceptions

```typescript
/**
 * Starts a new debug session for an agent
 * @param agentContent - The agent file content to debug
 * @param inputData - Input data for the agent execution
 * @returns Promise resolving to the session ID
 * @throws {Error} If agent content is invalid or provider system is unavailable
 * @example
 * ```typescript
 * const sessionId = await debugger.startDebugSession(agentContent, { message: 'Hello' });
 * console.log(`Debug session started: ${sessionId}`);
 * ```
 */
async startDebugSession(agentContent: string, inputData: any): Promise<string> {
  // Implementation...
}
```

### README Updates

- Update README.md when adding new features
- Include usage examples for new functionality
- Update the feature comparison table
- Add new examples to the Examples section
- Update API reference when interfaces change

### API Documentation

- Keep API reference up to date
- Document all public interfaces and types
- Include configuration options and examples
- Document breaking changes clearly

## Pull Request Process

### Before Submitting

1. **Fork and clone** the repository
2. **Create a feature branch** from main:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Install dependencies** and ensure everything works:
   ```bash
   npm install
   npm run build
   npm test
   ```
4. **Make your changes** following the code style guidelines
5. **Add tests** for new functionality
6. **Update documentation** as needed
7. **Run all checks**:
   ```bash
   npm run lint
   npm run type-check
   npm test
   npm run build
   ```

### Commit Guidelines

Use conventional commit messages:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(debug): add breakpoint support to AgentDebugger

fix(providers): resolve memory leak in ModelRegistry

docs(readme): update installation instructions

test(testing): add performance benchmarks for large agents
```

### Pull Request Template

When creating a pull request, include:

1. **Description**: What does this PR do?
2. **Type of change**: Bug fix, feature, documentation, etc.
3. **Testing**: How was this tested?
4. **Breaking changes**: Any breaking changes?
5. **Checklist**: Ensure all items are completed

### Review Process

1. **Self-review**: Review your own code before submitting
2. **Tests pass**: Ensure all tests pass
3. **Code coverage**: Maintain or improve test coverage
4. **Documentation**: Update relevant documentation
5. **Squash commits**: Clean up commit history if needed

## Issue Reporting

### Bug Reports

When reporting bugs, include:

1. **Environment**: OS, Node.js version, npm version
2. **Steps to reproduce**: Clear, step-by-step instructions
3. **Expected behavior**: What should happen
4. **Actual behavior**: What actually happens
5. **Error messages**: Full error messages and stack traces
6. **Screenshots**: If applicable
7. **Additional context**: Any relevant information

### Feature Requests

When requesting features, include:

1. **Problem description**: What problem does this solve?
2. **Proposed solution**: How should this work?
3. **Use cases**: Real-world scenarios where this would be useful
4. **Alternatives considered**: Other approaches you've considered
5. **Implementation ideas**: Any thoughts on how to implement this

### Issue Templates

Use the provided issue templates for:
- Bug reports
- Feature requests
- Documentation improvements
- Security vulnerabilities

## Code of Conduct

### Our Standards

We are committed to providing a welcoming and inclusive environment for all contributors. We expect all participants to:

- Be respectful and considerate of others
- Use inclusive language
- Be collaborative and constructive
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior

The following behaviors are considered unacceptable:

- Harassment, discrimination, or bullying
- Trolling, insulting, or derogatory comments
- Publishing others' private information without permission
- Other conduct that could reasonably be considered inappropriate

### Enforcement

Violations of the Code of Conduct may result in:
- Warning
- Temporary ban from the project
- Permanent ban from the project

### Reporting

If you experience or witness unacceptable behavior, please report it to the project maintainers.

## Getting Help

### Questions and Support

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Documentation**: Check the README and inline documentation
- **Examples**: Review the examples directory for usage patterns

### Development Resources

- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Node.js Documentation**: https://nodejs.org/docs/
- **Jest Testing Framework**: https://jestjs.io/docs/getting-started
- **ESLint Rules**: https://eslint.org/docs/rules/

### Community

- **Contributors**: See the contributors list on GitHub
- **Releases**: Check the releases page for latest updates
- **Changelog**: Review changes in the commit history

---

Thank you for contributing to AAABuilder! Your contributions help make this framework better for everyone in the AI/ML community.
