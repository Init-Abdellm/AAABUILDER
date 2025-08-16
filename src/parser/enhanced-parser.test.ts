import { EnhancedAgentParser } from './enhanced-parser';

describe('EnhancedAgentParser', () => {
  let parser: EnhancedAgentParser;

  beforeEach(() => {
    parser = new EnhancedAgentParser();
  });

  describe('Complex Model Names', () => {
    test('should parse model names with colons', () => {
      const content = `
@agent test-agent v1
description: "Test agent"
trigger:
  type: http
  method: POST
  path: /test

steps:
  - id: step1
    kind: llm
    provider: ollama
    model: qwen2.5-coder:1.5b
    prompt: "Test prompt"
    save: result

outputs:
  response: "{result}"
@end`;

      const { ast, validation } = parser.parse(content);
      
      expect(validation.valid).toBe(true);
      expect(ast).not.toBeNull();
      expect(ast!.steps[0].model).toBe('qwen2.5-coder:1.5b');
    });

    test('should parse model names with slashes', () => {
      const content = `
@agent test-agent v1
description: "Test agent"
trigger:
  type: http

steps:
  - id: step1
    kind: llm
    provider: huggingface
    model: microsoft/DialoGPT-large
    prompt: "Test prompt"
    save: result

outputs:
  response: "{result}"
@end`;

      const { ast, validation } = parser.parse(content);
      
      expect(validation.valid).toBe(true);
      expect(ast!.steps[0].model).toBe('microsoft/DialoGPT-large');
    });

    test('should parse quoted model names with special characters', () => {
      const content = `
@agent test-agent v1
description: "Test agent"
trigger:
  type: http

steps:
  - id: step1
    kind: llm
    provider: custom
    model: "my-model:v2.0-beta"
    prompt: "Test prompt"
    save: result

outputs:
  response: "{result}"
@end`;

      const { ast, validation } = parser.parse(content);
      
      expect(validation.valid).toBe(true);
      expect(ast!.steps[0].model).toBe('my-model:v2.0-beta');
    });

    test('should handle model names with dots and hyphens', () => {
      const content = `
@agent test-agent v1
description: "Test agent"
trigger:
  type: http

steps:
  - id: step1
    kind: llm
    provider: openai
    model: gpt-4o-mini-2024-07-18
    prompt: "Test prompt"
    save: result

outputs:
  response: "{result}"
@end`;

      const { ast, validation } = parser.parse(content);
      
      expect(validation.valid).toBe(true);
      expect(ast!.steps[0].model).toBe('gpt-4o-mini-2024-07-18');
    });
  });

  describe('Quoted Strings and Escape Sequences', () => {
    test('should parse quoted descriptions with escape sequences', () => {
      const content = `
@agent test-agent v1
description: "Test agent with \\"quotes\\" and \\n newlines"
trigger:
  type: http

steps:
  - id: step1
    kind: llm
    model: gpt-4o
    prompt: "Test prompt"
    save: result

outputs:
  response: "{result}"
@end`;

      const { ast, validation } = parser.parse(content);
      
      expect(validation.valid).toBe(true);
      expect(ast!.description).toBe('Test agent with "quotes" and \n newlines');
    });

    test('should parse single-quoted strings', () => {
      const content = `
@agent test-agent v1
description: 'Test agent with single quotes'
trigger:
  type: http

steps:
  - id: step1
    kind: llm
    model: gpt-4o
    prompt: 'Test prompt with \\'escaped\\' quotes'
    save: result

outputs:
  response: "{result}"
@end`;

      const { ast, validation } = parser.parse(content);
      
      expect(validation.valid).toBe(true);
      expect(ast!.description).toBe('Test agent with single quotes');
      expect(ast!.steps[0].prompt).toBe("Test prompt with 'escaped' quotes");
    });

    test('should handle multi-line strings in prompts', () => {
      const content = `
@agent test-agent v1
description: "Test agent"
trigger:
  type: http

steps:
  - id: step1
    kind: llm
    model: gpt-4o
    prompt: |
      This is a multi-line prompt
      with multiple lines
      and proper formatting
    save: result

outputs:
  response: "{result}"
@end`;

      const { ast, validation } = parser.parse(content);
      
      expect(validation.valid).toBe(true);
      expect(ast!.steps[0].prompt).toContain('This is a multi-line prompt');
      expect(ast!.steps[0].prompt).toContain('with multiple lines');
    });
  });

  describe('Error Handling and Reporting', () => {
    test('should provide detailed error messages with line numbers', () => {
      const content = `
@agent test-agent v1
description: "Test agent"
trigger:
  type: http

steps:
  - id: step1
    kind: llm
    model: gpt-4o
    prompt: "Unterminated string
    save: result

outputs:
  response: "{result}"
@end`;

      const { ast, validation } = parser.parse(content);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0].line).toBeGreaterThan(0);
      expect(validation.errors[0].message).toContain('Unterminated');
    });

    test('should provide suggestions for common errors', () => {
      const content = `
@agent test-agent v1
description: "Test agent"
trigger:
  type: http

steps:
  - id: step1
    kind: llm
    model: gpt-4o
    prompt: "Test prompt"
    save: result

outputs
  response: "{result}"
@end`;

      const { ast, validation } = parser.parse(content);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.suggestion)).toBe(true);
    });

    test('should handle missing required fields', () => {
      const content = `
@agent test-agent v1
description: "Test agent"

steps:
  - id: step1
    kind: llm
    model: gpt-4o
    prompt: "Test prompt"
    save: result

outputs:
  response: "{result}"
@end`;

      const { ast, validation } = parser.parse(content);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('Trigger'))).toBe(true);
    });

    test('should provide context for errors', () => {
      const content = `
@agent test-agent v1
description: "Test agent"
trigger:
  type: http

steps:
  - id: step1
    kind: invalid_kind
    model: gpt-4o
    prompt: "Test prompt"
    save: result

outputs:
  response: "{result}"
@end`;

      const { ast, validation } = parser.parse(content);
      
      expect(validation.valid).toBe(true); // Parser should accept unknown kinds
      expect(ast!.steps[0].kind).toBe('invalid_kind');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty sections', () => {
      const content = `
@agent test-agent v1
description: "Test agent"
trigger:
  type: http

secrets:

vars:

steps:
  - id: step1
    kind: llm
    model: gpt-4o
    prompt: "Test prompt"
    save: result

outputs:
  response: "{result}"
@end`;

      const { ast, validation } = parser.parse(content);
      
      expect(validation.valid).toBe(true);
      expect(Object.keys(ast!.secrets)).toHaveLength(0);
      expect(Object.keys(ast!.vars)).toHaveLength(0);
    });

    test('should handle comments', () => {
      const content = `
# This is a comment
@agent test-agent v1
description: "Test agent" # Another comment
trigger:
  type: http # HTTP trigger

steps:
  - id: step1 # Step comment
    kind: llm
    model: gpt-4o
    prompt: "Test prompt"
    save: result

outputs:
  response: "{result}"
@end`;

      const { ast, validation } = parser.parse(content);
      
      expect(validation.valid).toBe(true);
      expect(ast!.id).toBe('test-agent');
    });

    test('should handle whitespace variations', () => {
      const content = `
@agent   test-agent   v1
description:   "Test agent"
trigger:
    type:   http
    method:   POST
    path:   /test

steps:
    -   id:   step1
        kind:   llm
        model:   gpt-4o
        prompt:   "Test prompt"
        save:   result

outputs:
    response:   "{result}"
@end`;

      const { ast, validation } = parser.parse(content);
      
      expect(validation.valid).toBe(true);
      expect(ast!.id).toBe('test-agent');
      expect(ast!.trigger.type).toBe('http');
      expect(ast!.trigger.method).toBe('POST');
    });
  });

  describe('Validation and Warnings', () => {
    test('should warn about unused variables', () => {
      const content = `
@agent test-agent v1
description: "Test agent"
trigger:
  type: http

steps:
  - id: step1
    kind: llm
    model: gpt-4o
    prompt: "Test prompt"
    save: unused_result

  - id: step2
    kind: llm
    model: gpt-4o
    prompt: "Another prompt"
    save: used_result

outputs:
  response: "{used_result}"
@end`;

      const { ast, validation } = parser.parse(content);
      
      expect(validation.valid).toBe(true);
      expect(validation.warnings.some(w => w.message.includes('unused_result'))).toBe(true);
    });

    test('should warn about agents with no steps', () => {
      const content = `
@agent test-agent v1
description: "Test agent"
trigger:
  type: http

steps:

outputs:
  response: "static response"
@end`;

      const { ast, validation } = parser.parse(content);
      
      expect(validation.valid).toBe(true);
      expect(validation.warnings.some(w => w.message.includes('No steps'))).toBe(true);
    });
  });

  describe('Complex Agent Files', () => {
    test('should parse complete agent with all features', () => {
      const content = `
@agent complex-agent v1
description: "A complex agent with all features"
trigger:
  type: http
  method: POST
  path: /complex

secrets:
  - name: OPENAI_KEY
    type: env
    value: OPENAI_API_KEY
  - name: CUSTOM_KEY
    type: env
    value: CUSTOM_API_KEY

vars:
  input_text:
    type: string
    from: input
    required: true
  model_choice:
    type: string
    from: input
    default: "gpt-4o"
  temperature:
    type: number
    from: input
    default: 0.7

steps:
  - id: preprocess
    kind: function
    operation: clean_text
    input: "{input_text}"
    save: cleaned_text

  - id: analyze
    kind: llm
    provider: openai
    model: "{model_choice}"
    prompt: |
      Analyze the following text:
      {cleaned_text}
      
      Provide insights about:
      1. Sentiment
      2. Key topics
      3. Summary
    save: analysis

  - id: postprocess
    kind: function
    operation: format_response
    input: "{analysis}"
    when: "{analysis} != null"
    retries: 3
    timeout_ms: 30000
    save: formatted_result

outputs:
  result: "{formatted_result}"
  raw_analysis: "{analysis}"
@end`;

      const { ast, validation } = parser.parse(content);
      
      expect(validation.valid).toBe(true);
      expect(ast!.id).toBe('complex-agent');
      expect(ast!.description).toBe('A complex agent with all features');
      expect(Object.keys(ast!.secrets)).toHaveLength(2);
      expect(Object.keys(ast!.vars)).toHaveLength(3);
      expect(ast!.steps).toHaveLength(3);
      expect(Object.keys(ast!.outputs)).toHaveLength(2);
      
      // Check complex model name handling
      expect(ast!.steps[1].model).toBe('{model_choice}');
      
      // Check multi-line prompt
      expect(ast!.steps[1].prompt).toContain('Analyze the following text');
      expect(ast!.steps[1].prompt).toContain('1. Sentiment');
      
      // Check conditional execution
      expect(ast!.steps[2].when).toBe('{analysis} != null');
      
      // Check retry configuration
      expect(ast!.steps[2].retries).toBe(3);
      expect(ast!.steps[2].timeout_ms).toBe(30000);
    });
  });
});