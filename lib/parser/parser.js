const logger = require('../diagnostics/logger');

/**
 * Parse .agent file content into AST-like JSON structure
 */
class AgentParser {
  parse(content) {
    logger.debug('Parsing agent file content');
    
    const lines = content.split('\n').map(line => line.trim());
    const ast = {
      id: null,
      version: null,
      trigger: null,
      secrets: {},
      vars: {},
      steps: [],
      output: null,
    };

    let currentStep = null;
    let inPrompt = false;
    let promptLines = [];
    let promptIndent = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (!line || line.startsWith('#')) continue;

      if (line.startsWith('@agent')) {
        const match = line.match(/@agent\s+(\S+)\s+v(\d+)/);
        if (!match) {
          throw new Error(`Invalid @agent declaration at line ${i + 1}: ${line}`);
        }
        ast.id = match[1];
        ast.version = parseInt(match[2]);
      }
      
      else if (line.startsWith('trigger')) {
        const parts = line.split(/\s+/);
        ast.trigger = {
          type: parts[1],
          method: parts[2] || null,
          path: parts[3] || null,
        };
      }
      
      else if (line.startsWith('secret')) {
        const match = line.match(/secret\s+(\w+)=env:(\w+)/);
        if (!match) {
          throw new Error(`Invalid secret declaration at line ${i + 1}: ${line}`);
        }
        ast.secrets[match[1]] = { type: 'env', value: match[2] };
      }
      
      else if (line.startsWith('var')) {
        const match = line.match(/var\s+(\w+)\s*=\s*(.+)/);
        if (!match) {
          throw new Error(`Invalid var declaration at line ${i + 1}: ${line}`);
        }
        ast.vars[match[1]] = this.parseVarValue(match[2]);
      }
      
      else if (line.startsWith('step')) {
        if (currentStep) {
          ast.steps.push(currentStep);
        }
        const match = line.match(/step\s+(\w+):/);
        if (!match) {
          throw new Error(`Invalid step declaration at line ${i + 1}: ${line}`);
        }
        currentStep = {
          id: match[1],
          retries: 0,
          timeout_ms: 60000,
        };
      }
      
      else if (line.startsWith('output')) {
        const match = line.match(/output\s+(.+)/);
        if (!match) {
          throw new Error(`Invalid output declaration at line ${i + 1}: ${line}`);
        }
        ast.output = match[1];
      }
      
      else if (line === '@end') {
        if (currentStep) {
          ast.steps.push(currentStep);
          currentStep = null;
        }
        break;
      }
      
      else if (currentStep) {
        if (line.includes('"""')) {
          if (inPrompt) {
            // End of prompt
            currentStep.prompt = promptLines.join('\n').trim();
            inPrompt = false;
            promptLines = [];
          } else {
            // Start of prompt
            inPrompt = true;
            promptIndent = line.substring(0, line.indexOf('"""'));
          }
        } else if (inPrompt) {
          // Inside prompt block
          let promptLine = line;
          if (line.startsWith(promptIndent)) {
            promptLine = line.substring(promptIndent.length);
          }
          promptLines.push(promptLine);
        } else {
          // Regular step property
          this.parseStepProperty(currentStep, line, i + 1);
        }
      }
    }

    this.validateRequiredFields(ast);
    this.cleanupAST(ast);
    return ast;
  }

  parseVarValue(value) {
    value = value.trim();
    
    if (value.startsWith('input.')) {
      return { type: 'input', path: value.substring(6) };
    } else if (value.startsWith('env.')) {
      return { type: 'env', path: value.substring(4) };
    } else {
      return { type: 'literal', value: value };
    }
  }

  parseStepProperty(step, line, lineNumber) {
    // Handle both formats: "key: value" and "key value"
    let key, value;
    
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      // Format: "key: value"
      key = line.substring(0, colonIndex).trim();
      value = line.substring(colonIndex + 1).trim();
    } else {
      // Format: "key value" (space-separated)
      const spaceIndex = line.indexOf(' ');
      if (spaceIndex === -1) {
        throw new Error(`Invalid step property at line ${lineNumber}: ${line}`);
      }
      key = line.substring(0, spaceIndex).trim();
      value = line.substring(spaceIndex + 1).trim();
    }

    switch (key) {
    case 'kind':
      if (!['llm', 'http', 'function'].includes(value)) {
        throw new Error(`Invalid step kind '${value}' at line ${lineNumber}`);
      }
      step.kind = value;
      break;
    case 'model':
      step.model = value;
      break;
    case 'provider':
      step.provider = value;
      break;
    case 'when':
      step.when = value;
      break;
    case 'retries':
      step.retries = parseInt(value);
      break;
    case 'timeout_ms':
      step.timeout_ms = parseInt(value);
      break;
    case 'save':
      step.save = value;
      break;
    case 'action':
      step.action = value;
      break;
    case 'url':
      step.url = value;
      break;
    case 'headers':
      try {
        step.headers = JSON.parse(value);
      } catch (e) {
        throw new Error(`Invalid JSON for headers at line ${lineNumber}: ${value}`);
      }
      break;
    case 'body':
      try {
        step.body = JSON.parse(value);
      } catch (e) {
        throw new Error(`Invalid JSON for body at line ${lineNumber}: ${value}`);
      }
      break;
    default:
      logger.warn(`Unknown step property '${key}' at line ${lineNumber}`);
    }
  }

  validateRequiredFields(ast) {
    if (!ast.id) {
      throw new Error('Missing required field: @agent id');
    }
    if (!ast.version) {
      throw new Error('Missing required field: version');
    }
    if (!ast.trigger) {
      throw new Error('Missing required field: trigger');
    }
    if (!ast.output) {
      throw new Error('Missing required field: output');
    }
    if (ast.steps.length === 0) {
      throw new Error('At least one step is required');
    }
  }

  cleanupAST(ast) {
    // Remove null/undefined fields from steps
    for (const step of ast.steps) {
      Object.keys(step).forEach(key => {
        if (step[key] === null || step[key] === undefined) {
          delete step[key];
        }
        // Remove empty objects/arrays
        if (typeof step[key] === 'object' && step[key] !== null) {
          if (Array.isArray(step[key]) && step[key].length === 0) {
            delete step[key];
          } else if (!Array.isArray(step[key]) && Object.keys(step[key]).length === 0) {
            delete step[key];
          }
        }
      });
    }
  }
}

module.exports = new AgentParser();
