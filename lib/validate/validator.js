const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const schema = require('./schema.json');
const logger = require('../diagnostics/logger');

class AgentValidator {
  constructor() {
    this.ajv = new Ajv({ allErrors: true });
    addFormats(this.ajv);
    this.validateSchema = this.ajv.compile(schema);
  }

  validate(ast) {
    logger.debug('Validating agent AST');
    
    const valid = this.validateSchema(ast);
    
    if (!valid) {
      const errors = this.validateSchema.errors.map(error => {
        const path = error.instancePath || 'root';
        return `${path}: ${error.message}`;
      });
      
      return {
        valid: false,
        errors: errors
      };
    }

    // Additional semantic validation
    const semanticErrors = this.performSemanticValidation(ast);
    
    if (semanticErrors.length > 0) {
      return {
        valid: false,
        errors: semanticErrors
      };
    }

    return {
      valid: true,
      errors: []
    };
  }

  performSemanticValidation(ast) {
    const errors = [];

    // Check that output references exist
    if (ast.output) {
      const outputExists = this.checkOutputReference(ast, ast.output);
      if (!outputExists) {
        errors.push(`Output '${ast.output}' references non-existent variable or step result`);
      }
    }

    // Check step dependencies
    for (const step of ast.steps) {
      if (step.when) {
        const whenExists = this.checkVariableReference(ast, step.when);
        if (!whenExists) {
          errors.push(`Step '${step.id}' when condition '${step.when}' references non-existent variable`);
        }
      }

      // Check prompt variables for LLM steps
      if (step.kind === 'llm' && step.prompt) {
        const variables = this.extractVariables(step.prompt);
        for (const variable of variables) {
          const varExists = this.checkVariableReference(ast, variable);
          if (!varExists) {
            errors.push(`Step '${step.id}' prompt references non-existent variable '${variable}'`);
          }
        }
      }

      // Check URL variables for HTTP steps
      if (step.kind === 'http' && step.url) {
        const variables = this.extractVariables(step.url);
        for (const variable of variables) {
          const varExists = this.checkVariableReference(ast, variable);
          if (!varExists) {
            errors.push(`Step '${step.id}' URL references non-existent variable '${variable}'`);
          }
        }
      }

      // Check body variables for HTTP steps
      if (step.kind === 'http' && step.body && typeof step.body === 'object') {
        const bodyStr = JSON.stringify(step.body);
        const variables = this.extractVariables(bodyStr);
        for (const variable of variables) {
          const varExists = this.checkVariableReference(ast, variable);
          if (!varExists) {
            errors.push(`Step '${step.id}' body references non-existent variable '${variable}'`);
          }
        }
      }
    }

    return errors;
  }

  checkOutputReference(ast, output) {
    // Check if it's a variable
    if (ast.vars[output]) {
      return true;
    }

    // Check if it's a step result
    const stepWithSave = ast.steps.find(step => step.save === output);
    if (stepWithSave) {
      return true;
    }

    return false;
  }

  checkVariableReference(ast, variable) {
    // Check if it's a defined variable
    if (ast.vars[variable]) {
      return true;
    }

    // Check if it's a step result (assuming it will be available at runtime)
    const stepWithSave = ast.steps.find(step => step.save === variable);
    if (stepWithSave) {
      return true;
    }

    // Check if it starts with 'input.' (runtime input)
    if (variable.startsWith('input.')) {
      return true;
    }

    return false;
  }

  extractVariables(text) {
    const regex = /\{([^}]+)\}/g;
    const variables = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      variables.push(match[1]);
    }

    return variables;
  }
}

module.exports = new AgentValidator();
