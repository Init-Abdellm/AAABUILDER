// Logger import removed as it's not used in this file

export interface ParseError {
  message: string;
  line: number;
  column: number;
  context: string;
  suggestion?: string | undefined;
}

export interface ValidationResult {
  valid: boolean;
  errors: ParseError[];
  warnings: ParseError[];
}

export interface AgentAST {
  id: string;
  version: number;
  description?: string;
  trigger: TriggerConfig;
  secrets: Record<string, SecretConfig>;
  vars: Record<string, VariableConfig>;
  steps: StepConfig[];
  outputs: Record<string, string>;
}

export interface TriggerConfig {
  type: string;
  method?: string;
  path?: string;
}

export interface SecretConfig {
  type: string;
  value: string;
}

export interface VariableConfig {
  type: string;
  from: string;
  required?: boolean;
  default?: any;
}

export interface StepConfig {
  id: string;
  kind?: string;
  provider?: string;
  model?: string;
  prompt?: string;
  input?: string;
  operation?: string;
  when?: string;
  save?: string;
  retries?: number;
  timeout_ms?: number;
  [key: string]: any;
}

/**
 * Enhanced tokenizer that handles complex model names and quoted strings
 */
class Tokenizer {
  private content: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];

  constructor(content: string) {
    this.content = content;
  }

  tokenize(): Token[] {
    this.tokens = [];
    this.position = 0;
    this.line = 1;
    this.column = 1;

    while (this.position < this.content.length) {
      this.skipWhitespace();
      
      if (this.position >= this.content.length) break;

      const char = this.content[this.position];
      
      // Handle comments
      if (char === '#') {
        this.skipComment();
        continue;
      }

      // Handle newlines
      if (char === '\n') {
        this.addToken('NEWLINE', '\n');
        this.advance();
        this.line++;
        this.column = 1;
        continue;
      }

      // Handle quoted strings
      if (char === '"' || char === "'") {
        this.tokenizeQuotedString(char);
        continue;
      }

      // Handle special characters
      if (char === ':') {
        this.addToken('COLON', ':');
        this.advance();
        continue;
      }

      if (char === '-') {
        this.addToken('DASH', '-');
        this.advance();
        continue;
      }

      if (char === '|') {
        this.addToken('PIPE', '|');
        this.advance();
        continue;
      }

      if (char === '{') {
        this.addToken('LBRACE', '{');
        this.advance();
        continue;
      }

      if (char === '}') {
        this.addToken('RBRACE', '}');
        this.advance();
        continue;
      }

      // Handle identifiers and complex model names
      if (this.isIdentifierStart(char)) {
        this.tokenizeIdentifier();
        continue;
      }

      // Handle numbers
      if (this.isDigit(char)) {
        this.tokenizeNumber();
        continue;
      }

      // Unknown character
      throw this.createError(`Unexpected character: ${char}`);
    }

    this.addToken('EOF', '');
    return this.tokens;
  }

  private skipWhitespace(): void {
    while (this.position < this.content.length) {
      const char = this.content[this.position];
      if (char === ' ' || char === '\t' || char === '\r') {
        this.advance();
      } else {
        break;
      }
    }
  }

  private skipComment(): void {
    while (this.position < this.content.length && this.content[this.position] !== '\n') {
      this.advance();
    }
  }

  private tokenizeQuotedString(quote: string): void {
    this.advance(); // Skip opening quote

    let value = '';
    let escaped = false;

    while (this.position < this.content.length) {
      const char = this.content[this.position];

      if (escaped) {
        // Handle escape sequences
        switch (char) {
          case 'n':
            value += '\n';
            break;
          case 't':
            value += '\t';
            break;
          case 'r':
            value += '\r';
            break;
          case '\\':
            value += '\\';
            break;
          case '"':
            value += '"';
            break;
          case "'":
            value += "'";
            break;
          default:
            value += char;
        }
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        this.advance(); // Skip closing quote
        this.addToken('STRING', value);
        return;
      } else if (char === '\n') {
        this.line++;
        this.column = 1;
        value += char;
      } else {
        value += char;
      }

      this.advance();
    }

    throw this.createError(`Unterminated string literal starting at line ${this.line}`);
  }

  private tokenizeIdentifier(): void {
    let value = '';

    while (this.position < this.content.length) {
      const char = this.content[this.position];
      
      // Allow complex model names with colons, slashes, dots, and hyphens
      if (this.isIdentifierChar(char) || char === ':' || char === '/' || char === '.' || char === '-') {
        value += char;
        this.advance();
      } else {
        break;
      }
    }

    // Check for keywords
    const tokenType = this.getKeywordType(value) || 'IDENTIFIER';
    this.addToken(tokenType, value);
  }

  private tokenizeNumber(): void {
    let value = '';

    while (this.position < this.content.length && this.isDigit(this.content[this.position])) {
      value += this.content[this.position];
      this.advance();
    }

    // Handle decimal numbers
    if (this.position < this.content.length && this.content[this.position] === '.') {
      value += '.';
      this.advance();

      while (this.position < this.content.length && this.isDigit(this.content[this.position])) {
        value += this.content[this.position];
        this.advance();
      }
    }

    this.addToken('NUMBER', value);
  }

  private isIdentifierStart(char: string | undefined): boolean {
    return char ? /[a-zA-Z_@]/.test(char) : false;
  }

  private isIdentifierChar(char: string | undefined): boolean {
    return char ? /[a-zA-Z0-9_]/.test(char) : false;
  }

  private isDigit(char: string | undefined): boolean {
    return char ? /[0-9]/.test(char) : false;
  }

  private getKeywordType(value: string): string | null {
    const keywords: Record<string, string> = {
      '@agent': 'AGENT_START',
      '@end': 'AGENT_END',
      'description': 'DESCRIPTION',
      'trigger': 'TRIGGER',
      'secrets': 'SECRETS',
      'vars': 'VARS',
      'variables': 'VARS',
      'steps': 'STEPS',
      'outputs': 'OUTPUTS',
      'type': 'TYPE',
      'method': 'METHOD',
      'path': 'PATH',
      'name': 'NAME',
      'value': 'VALUE',
      'from': 'FROM',
      'required': 'REQUIRED',
      'default': 'DEFAULT',
      'id': 'ID',
      'kind': 'KIND',
      'provider': 'PROVIDER',
      'model': 'MODEL',
      'prompt': 'PROMPT',
      'input': 'INPUT',
      'operation': 'OPERATION',
      'when': 'WHEN',
      'save': 'SAVE',
      'retries': 'RETRIES',
      'timeout_ms': 'TIMEOUT_MS',
      'true': 'BOOLEAN',
      'false': 'BOOLEAN',
    };

    return keywords[value] || null;
  }

  private addToken(type: string, value: string): void {
    this.tokens.push({
      type,
      value,
      line: this.line,
      column: this.column - value.length,
    });
  }

  private advance(): void {
    this.position++;
    this.column++;
  }

  private createError(message: string): ParseError {
    const context = this.getContext();
    return {
      message,
      line: this.line,
      column: this.column,
      context,
      suggestion: this.getSuggestion(message),
    };
  }

  private getContext(): string {
    const lineStart = this.content.lastIndexOf('\n', this.position - 1) + 1;
    const lineEnd = this.content.indexOf('\n', this.position);
    const endPos = lineEnd === -1 ? this.content.length : lineEnd;
    
    return this.content.substring(lineStart, endPos);
  }

  private getSuggestion(message: string): string | undefined {
    if (message.includes('Unexpected character')) {
      return 'Check for typos or missing quotes around string values';
    }
    if (message.includes('Unterminated string')) {
      return 'Make sure to close all quoted strings with matching quotes';
    }
    return undefined;
  }
}

interface Token {
  type: string;
  value: string;
  line: number;
  column: number;
}

/**
 * Enhanced parser with robust error handling and recovery
 */
export class EnhancedAgentParser {
  private tokens: Token[] = [];
  private current: number = 0;
  private errors: ParseError[] = [];
  private warnings: ParseError[] = [];

  parse(content: string): { ast: AgentAST | null; validation: ValidationResult } {
    try {
      // Reset state
      this.current = 0;
      this.errors = [];
      this.warnings = [];

      // Tokenize
      const tokenizer = new Tokenizer(content);
      this.tokens = tokenizer.tokenize();

      // Parse AST
      const ast = this.parseAgent();

      // Validate
      const validation = this.validate(ast);

      return {
        ast: validation.valid ? ast : null,
        validation,
      };
    } catch (error) {
      if (error instanceof Error) {
        this.errors.push({
          message: error.message,
          line: 1,
          column: 1,
          context: content.split('\n')[0] || '',
        });
      }

      return {
        ast: null,
        validation: {
          valid: false,
          errors: this.errors,
          warnings: this.warnings,
        },
      };
    }
  }

  private parseAgent(): AgentAST {
    const ast: Partial<AgentAST> = {
      secrets: {},
      vars: {},
      steps: [],
      outputs: {},
    };

    // Parse @agent declaration
    this.expectToken('AGENT_START');
    const idToken = this.expectToken('IDENTIFIER');
    ast.id = idToken.value;

    const versionToken = this.expectToken('IDENTIFIER');
    if (!versionToken.value.startsWith('v')) {
      this.addError('Version must start with "v"', versionToken);
    }
    ast.version = parseInt(versionToken.value.substring(1));

    this.skipNewlines();

    // Parse sections
    while (!this.isAtEnd() && !this.check('AGENT_END')) {
      if (this.check('DESCRIPTION')) {
        ast.description = this.parseDescription();
      } else if (this.check('TRIGGER')) {
        ast.trigger = this.parseTrigger();
      } else if (this.check('SECRETS')) {
        Object.assign(ast.secrets!, this.parseSecrets());
      } else if (this.check('VARS')) {
        Object.assign(ast.vars!, this.parseVars());
      } else if (this.check('STEPS')) {
        ast.steps!.push(...this.parseSteps());
      } else if (this.check('OUTPUTS')) {
        Object.assign(ast.outputs!, this.parseOutputs());
      } else {
        this.addError(`Unexpected token: ${this.peek().value}`, this.peek());
        this.advance(); // Skip unknown token
      }

      this.skipNewlines();
    }

    this.expectToken('AGENT_END');

    // Validate required fields
    if (!ast.id) {
      this.addError('Missing agent ID', this.tokens[0] || { type: 'EOF', value: '', line: 1, column: 1 });
    }
    if (!ast.trigger) {
      this.addError('Missing trigger configuration', this.tokens[0] || { type: 'EOF', value: '', line: 1, column: 1 });
    }

    return ast as AgentAST;
  }

  private parseDescription(): string {
    this.expectToken('DESCRIPTION');
    this.expectToken('COLON');
    
    const descToken = this.advance();
    if (descToken.type === 'STRING') {
      return descToken.value;
    } else {
      // Handle unquoted description
      let description = descToken.value;
      while (!this.isAtEnd() && !this.check('NEWLINE') && !this.check('TRIGGER') && !this.check('SECRETS')) {
        description += ' ' + this.advance().value;
      }
      return description.trim();
    }
  }

  private parseTrigger(): TriggerConfig {
    this.expectToken('TRIGGER');
    this.expectToken('COLON');
    this.skipNewlines();

    const trigger: Partial<TriggerConfig> = {};

    while (!this.isAtEnd() && !this.checkAny(['SECRETS', 'VARS', 'STEPS', 'OUTPUTS', 'AGENT_END'])) {
      if (this.check('TYPE')) {
        this.advance();
        this.expectToken('COLON');
        trigger.type = this.expectToken('IDENTIFIER').value;
      } else if (this.check('METHOD')) {
        this.advance();
        this.expectToken('COLON');
        trigger.method = this.expectToken('IDENTIFIER').value;
      } else if (this.check('PATH')) {
        this.advance();
        this.expectToken('COLON');
        const pathToken = this.advance();
        trigger.path = pathToken.value;
      } else {
        this.advance(); // Skip unknown property
      }
      this.skipNewlines();
    }

    return trigger as TriggerConfig;
  }

  private parseSecrets(): Record<string, SecretConfig> {
    this.expectToken('SECRETS');
    this.expectToken('COLON');
    this.skipNewlines();

    const secrets: Record<string, SecretConfig> = {};

    while (!this.isAtEnd() && this.check('DASH')) {
      this.advance(); // Skip dash
      
      if (this.check('NAME')) {
        this.advance();
        this.expectToken('COLON');
        const nameToken = this.expectToken('IDENTIFIER');
        const secretName = nameToken.value;

        this.skipNewlines();

        const secret: Partial<SecretConfig> = {};

        // Parse secret properties
        while (!this.isAtEnd() && !this.check('DASH') && !this.checkAny(['VARS', 'STEPS', 'OUTPUTS', 'AGENT_END'])) {
          if (this.check('TYPE')) {
            this.advance();
            this.expectToken('COLON');
            secret.type = this.expectToken('IDENTIFIER').value;
          } else if (this.check('VALUE')) {
            this.advance();
            this.expectToken('COLON');
            secret.value = this.expectToken('IDENTIFIER').value;
          } else {
            this.advance(); // Skip unknown property
          }
          this.skipNewlines();
        }

        secrets[secretName] = secret as SecretConfig;
      } else {
        this.addError('Expected "name" property for secret', this.peek());
        this.advance();
      }
    }

    return secrets;
  }

  private parseVars(): Record<string, VariableConfig> {
    this.expectToken('VARS');
    this.expectToken('COLON');
    this.skipNewlines();

    const vars: Record<string, VariableConfig> = {};

    while (!this.isAtEnd() && !this.checkAny(['STEPS', 'OUTPUTS', 'AGENT_END'])) {
      if (this.check('IDENTIFIER')) {
        const varName = this.advance().value;
        this.expectToken('COLON');
        this.skipNewlines();

        const variable: Partial<VariableConfig> = {};

        // Parse variable properties
        while (!this.isAtEnd() && !this.check('IDENTIFIER') && !this.checkAny(['STEPS', 'OUTPUTS', 'AGENT_END'])) {
          if (this.check('TYPE')) {
            this.advance();
            this.expectToken('COLON');
            variable.type = this.expectToken('IDENTIFIER').value;
          } else if (this.check('FROM')) {
            this.advance();
            this.expectToken('COLON');
            variable.from = this.expectToken('IDENTIFIER').value;
          } else if (this.check('REQUIRED')) {
            this.advance();
            this.expectToken('COLON');
            variable.required = this.expectToken('BOOLEAN').value === 'true';
          } else if (this.check('DEFAULT')) {
            this.advance();
            this.expectToken('COLON');
            const defaultToken = this.advance();
            variable.default = defaultToken.type === 'STRING' ? defaultToken.value : defaultToken.value;
          } else {
            this.advance(); // Skip unknown property
          }
          this.skipNewlines();
        }

        vars[varName] = variable as VariableConfig;
      } else {
        this.advance(); // Skip unknown token
      }
    }

    return vars;
  }

  private parseSteps(): StepConfig[] {
    this.expectToken('STEPS');
    this.expectToken('COLON');
    this.skipNewlines();

    const steps: StepConfig[] = [];

    while (!this.isAtEnd() && this.check('DASH')) {
      this.advance(); // Skip dash
      
      if (this.check('ID')) {
        this.advance();
        this.expectToken('COLON');
        const stepId = this.expectToken('IDENTIFIER').value;

        this.skipNewlines();

        const step: Partial<StepConfig> = { id: stepId };

        // Parse step properties
        while (!this.isAtEnd() && !this.check('DASH') && !this.checkAny(['OUTPUTS', 'AGENT_END'])) {
          if (this.check('KIND') || this.check('TYPE')) {
            this.advance();
            this.expectToken('COLON');
            step.kind = this.expectToken('IDENTIFIER').value;
          } else if (this.check('PROVIDER')) {
            this.advance();
            this.expectToken('COLON');
            step.provider = this.expectToken('IDENTIFIER').value;
          } else if (this.check('MODEL')) {
            this.advance();
            this.expectToken('COLON');
            // Handle complex model names with colons
            step.model = this.parseModelName();
          } else if (this.check('PROMPT')) {
            this.advance();
            this.expectToken('COLON');
            step.prompt = this.parsePrompt();
          } else if (this.check('INPUT')) {
            this.advance();
            this.expectToken('COLON');
            step.input = this.parseValue();
          } else if (this.check('OPERATION')) {
            this.advance();
            this.expectToken('COLON');
            step.operation = this.expectToken('IDENTIFIER').value;
          } else if (this.check('WHEN')) {
            this.advance();
            this.expectToken('COLON');
            step.when = this.parseValue();
          } else if (this.check('SAVE')) {
            this.advance();
            this.expectToken('COLON');
            step.save = this.expectToken('IDENTIFIER').value;
          } else if (this.check('RETRIES')) {
            this.advance();
            this.expectToken('COLON');
            step.retries = parseInt(this.expectToken('NUMBER').value);
          } else if (this.check('TIMEOUT_MS')) {
            this.advance();
            this.expectToken('COLON');
            step.timeout_ms = parseInt(this.expectToken('NUMBER').value);
          } else {
            // Handle unknown properties
            const propToken = this.advance();
            if (this.check('COLON')) {
              this.advance();
              const valueToken = this.advance();
              step[propToken.value] = valueToken.value;
            }
          }
          this.skipNewlines();
        }

        steps.push(step as StepConfig);
      } else {
        this.addError('Expected "id" property for step', this.peek());
        this.advance();
      }
    }

    return steps;
  }

  private parseModelName(): string {
    // Handle complex model names like "qwen2.5-coder:1.5b" or "microsoft/DialoGPT-large"
    let modelName = '';
    
    while (!this.isAtEnd() && !this.check('NEWLINE') && !this.checkAny(['PROMPT', 'INPUT', 'OPERATION', 'WHEN', 'SAVE'])) {
      const token = this.advance();
      if (token.type === 'STRING') {
        return token.value;
      }
      modelName += token.value;
    }

    return modelName.trim();
  }

  private parsePrompt(): string {
    if (this.check('PIPE')) {
      this.advance(); // Skip pipe
      this.skipNewlines();
      
      // Multi-line prompt
      let prompt = '';
      while (!this.isAtEnd() && !this.check('DASH') && !this.checkAny(['INPUT', 'OPERATION', 'WHEN', 'SAVE', 'OUTPUTS', 'AGENT_END'])) {
        const token = this.advance();
        if (token.type === 'NEWLINE') {
          prompt += '\n';
        } else {
          prompt += token.value + ' ';
        }
      }
      return prompt.trim();
    } else {
      // Single line prompt
      return this.parseValue();
    }
  }

  private parseValue(): string {
    const token = this.advance();
    if (token.type === 'STRING') {
      return token.value;
    }
    
    // Handle template strings with braces
    let value = token.value;
    while (!this.isAtEnd() && !this.check('NEWLINE')) {
      if (this.checkAny(['PROMPT', 'INPUT', 'OPERATION', 'WHEN', 'SAVE', 'OUTPUTS', 'AGENT_END', 'DASH'])) {
        break;
      }
      value += this.advance().value;
    }
    
    return value.trim();
  }

  private parseOutputs(): Record<string, string> {
    this.expectToken('OUTPUTS');
    this.expectToken('COLON');
    this.skipNewlines();

    const outputs: Record<string, string> = {};

    while (!this.isAtEnd() && !this.check('AGENT_END')) {
      if (this.check('IDENTIFIER')) {
        const key = this.advance().value;
        this.expectToken('COLON');
        const value = this.parseValue();
        outputs[key] = value;
      } else {
        this.advance(); // Skip unknown token
      }
      this.skipNewlines();
    }

    return outputs;
  }

  private validate(ast: AgentAST | null): ValidationResult {
    const errors: ParseError[] = [...this.errors];
    const warnings: ParseError[] = [...this.warnings];

    if (!ast) {
      return { valid: false, errors, warnings };
    }

    // Additional validation logic
    if (!ast.id) {
      errors.push({
        message: 'Agent ID is required',
        line: 1,
        column: 1,
        context: '@agent',
      });
    }

    if (!ast.trigger) {
      errors.push({
        message: 'Trigger configuration is required',
        line: 1,
        column: 1,
        context: 'trigger:',
      });
    }

    if (ast.steps.length === 0) {
      warnings.push({
        message: 'No steps defined - agent will not perform any actions',
        line: 1,
        column: 1,
        context: 'steps:',
      });
    }

    // Validate step references
    for (const step of ast.steps) {
      if (step.save) {
        // Check if saved variable is used in other steps
        const isUsed = ast.steps.some(s => 
          s.prompt?.includes(`{${step.save}}`) ||
          s.input?.includes(`{${step.save}}`) ||
          s.when?.includes(`{${step.save}}`)
        ) || Object.values(ast.outputs).some(output => output.includes(`{${step.save}}`));

        if (!isUsed) {
          warnings.push({
            message: `Variable "${step.save}" is saved but never used`,
            line: 1,
            column: 1,
            context: `save: ${step.save}`,
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Helper methods
  private peek(): Token {
    return this.tokens[this.current] || { type: 'EOF', value: '', line: 0, column: 0 };
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private previous(): Token {
    return this.tokens[this.current - 1] || { type: 'EOF', value: '', line: 0, column: 0 };
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private check(type: string): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private checkAny(types: string[]): boolean {
    return types.some(type => this.check(type));
  }

  private expectToken(type: string): Token {
    if (this.check(type)) {
      return this.advance();
    }

    const current = this.peek();
    this.addError(`Expected ${type} but got ${current.type}`, current);
    return current;
  }

  private skipNewlines(): void {
    while (this.check('NEWLINE')) {
      this.advance();
    }
  }

  private addError(message: string, token: Token): void {
    const suggestion = this.getSuggestionForError(message);
    this.errors.push({
      message,
      line: token.line,
      column: token.column,
      context: this.getTokenContext(token),
      ...(suggestion && { suggestion }),
    });
  }

  private getTokenContext(token: Token): string {
    // Find the line containing this token
    const lines = this.tokens
      .filter(t => t.line === token.line)
      .map(t => t.value)
      .join(' ');
    return lines || token.value;
  }

  private getSuggestionForError(message: string): string | undefined {
    if (message.includes('Expected')) {
      return 'Check the syntax and ensure all required fields are present';
    }
    if (message.includes('Unexpected token')) {
      return 'Verify the agent file format and check for typos';
    }
    return undefined;
  }
}