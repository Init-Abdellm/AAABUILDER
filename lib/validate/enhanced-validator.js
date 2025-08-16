const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const enhancedSchema = require('./enhanced-schema.json');
const logger = require('../diagnostics/logger');

class EnhancedAgentValidator {
  constructor() {
    // Configure AJV with better error handling and no strict mode warnings
    this.ajv = new Ajv({ 
      allErrors: true,
      verbose: true,
      strict: false, // Disable strict mode to avoid union type warnings
      strictSchema: false,
      strictTypes: false,
      strictTuples: false,
      allowUnionTypes: true,
      discriminator: true,
    });
    
    addFormats(this.ajv);
    
    // Add custom formats for complex model names
    this.ajv.addFormat('model-name', {
      type: 'string',
      validate: function(data) {
        // Allow complex model names with colons, slashes, dots, hyphens
        return /^[a-zA-Z0-9][a-zA-Z0-9_\-.:/*]*$/.test(data);
      },
    });
    
    // Add custom format for template strings
    this.ajv.addFormat('template', {
      type: 'string',
      validate: function(data) {
        // Allow template strings with {variable} syntax
        return typeof data === 'string';
      },
    });
    
    this.validateSchema = this.ajv.compile(enhancedSchema);
  }

  validate(ast) {
    logger.debug('Validating agent AST with enhanced validator');
    
    // Normalize AST for validation
    const normalizedAst = this.normalizeAst(ast);
    
    const valid = this.validateSchema(normalizedAst);
    
    const errors = [];
    const warnings = [];
    
    if (!valid && this.validateSchema.errors) {
      // Process schema validation errors
      for (const error of this.validateSchema.errors) {
        const formattedError = this.formatSchemaError(error);
        if (formattedError.severity === 'warning') {
          warnings.push(formattedError);
        } else {
          errors.push(formattedError);
        }
      }
    }

    // Additional semantic validation
    const semanticResults = this.performSemanticValidation(normalizedAst);
    errors.push(...semanticResults.errors);
    warnings.push(...semanticResults.warnings);

    return {
      valid: errors.length === 0,
      errors: errors,
      warnings: warnings,
    };
  }

  normalizeAst(ast) {
    // Create a normalized copy of the AST
    const normalized = JSON.parse(JSON.stringify(ast));
    
    // Ensure required fields exist
    if (!normalized.secrets) normalized.secrets = {};
    if (!normalized.vars) normalized.vars = {};
    if (!normalized.steps) normalized.steps = [];
    if (!normalized.outputs && !normalized.output) normalized.outputs = {};
    
    // Handle legacy output field
    if (normalized.output && !normalized.outputs) {
      normalized.outputs = { result: normalized.output };
    }
    
    // Normalize steps
    for (const step of normalized.steps) {
      // Set default values
      if (!step.retries) step.retries = 0;
      if (!step.timeout_ms) step.timeout_ms = 60000;
      
      // Normalize step kind
      if (!step.kind && step.type) {
        step.kind = step.type;
        delete step.type;
      }
      
      // Handle legacy action field for HTTP steps
      if (step.kind === 'http' && step.action && !step.method) {
        step.method = step.action;
        delete step.action;
      }
    }
    
    return normalized;
  }

  formatSchemaError(error) {
    const path = error.instancePath || error.schemaPath || 'root';
    let message = error.message;
    let severity = 'error';
    let suggestion = null;

    // Customize error messages based on error type
    switch (error.keyword) {
    case 'required':
      message = `Missing required field: ${error.params.missingProperty}`;
      suggestion = `Add the required field '${error.params.missingProperty}' to your agent configuration`;
      break;
        
    case 'enum':
      message = `Invalid value '${error.data}' for ${path}. Allowed values: ${error.params.allowedValues.join(', ')}`;
      suggestion = `Use one of the allowed values: ${error.params.allowedValues.join(', ')}`;
      break;
        
    case 'pattern':
      message = `Invalid format for ${path}: '${error.data}'`;
      if (path.includes('id')) {
        suggestion = 'IDs must start with a letter and contain only letters, numbers, underscores, and hyphens';
      } else if (path.includes('path')) {
        suggestion = 'Paths must start with a forward slash (/)';
      }
      break;
        
    case 'type':
      message = `Expected ${error.params.type} but got ${typeof error.data} for ${path}`;
      suggestion = `Convert the value to ${error.params.type}`;
      break;
        
    case 'minimum':
      message = `Value ${error.data} is below minimum ${error.params.limit} for ${path}`;
      suggestion = `Use a value >= ${error.params.limit}`;
      break;
        
    case 'maximum':
      message = `Value ${error.data} exceeds maximum ${error.params.limit} for ${path}`;
      suggestion = `Use a value <= ${error.params.limit}`;
      break;
        
    case 'minItems':
      message = `Array ${path} must have at least ${error.params.limit} items`;
      severity = 'warning'; // Steps array can be empty for some use cases
      break;
        
    case 'additionalProperties':
      message = `Unknown property '${error.params.additionalProperty}' in ${path}`;
      severity = 'warning'; // Allow additional properties but warn
      suggestion = 'Check for typos in property names';
      break;
        
    case 'if':
    case 'then':
    case 'else':
      // These are usually from conditional schema validation
      message = `Configuration error in ${path}: ${error.message}`;
      break;
        
    default:
      message = `Validation error in ${path}: ${error.message}`;
    }

    return {
      message,
      path,
      severity,
      suggestion,
      keyword: error.keyword,
      data: error.data,
    };
  }

  performSemanticValidation(ast) {
    const errors = [];
    const warnings = [];

    // Check output references
    if (ast.outputs) {
      for (const [outputName, outputValue] of Object.entries(ast.outputs)) {
        const variables = this.extractVariables(outputValue);
        for (const variable of variables) {
          if (!this.checkVariableReference(ast, variable)) {
            errors.push({
              message: `Output '${outputName}' references undefined variable '${variable}'`,
              path: `outputs.${outputName}`,
              suggestion: `Define the variable '${variable}' in vars section or ensure a step saves to '${variable}'`,
            });
          }
        }
      }
    }

    // Check legacy output
    if (ast.output) {
      const variables = this.extractVariables(ast.output);
      for (const variable of variables) {
        if (!this.checkVariableReference(ast, variable)) {
          errors.push({
            message: `Output references undefined variable '${variable}'`,
            path: 'output',
            suggestion: `Define the variable '${variable}' in vars section or ensure a step saves to '${variable}'`,
          });
        }
      }
    }

    // Check step dependencies and references
    for (let i = 0; i < ast.steps.length; i++) {
      const step = ast.steps[i];
      const stepPath = `steps[${i}]`;

      // Check conditional expressions
      if (step.when) {
        const variables = this.extractVariables(step.when);
        for (const variable of variables) {
          if (!this.checkVariableReference(ast, variable, i)) {
            errors.push({
              message: `Step '${step.id}' condition references undefined variable '${variable}'`,
              path: `${stepPath}.when`,
              suggestion: `Define '${variable}' in vars section or ensure it's saved by a previous step`,
            });
          }
        }
      }

      // Check prompt variables for LLM steps
      if (step.kind === 'llm' && step.prompt) {
        const variables = this.extractVariables(step.prompt);
        for (const variable of variables) {
          if (!this.checkVariableReference(ast, variable, i)) {
            warnings.push({
              message: `Step '${step.id}' prompt references variable '${variable}' that may not be available`,
              path: `${stepPath}.prompt`,
              suggestion: `Ensure '${variable}' is defined in vars or saved by a previous step`,
            });
          }
        }
      }

      // Check input variables
      if (step.input) {
        const variables = this.extractVariables(step.input);
        for (const variable of variables) {
          if (!this.checkVariableReference(ast, variable, i)) {
            warnings.push({
              message: `Step '${step.id}' input references variable '${variable}' that may not be available`,
              path: `${stepPath}.input`,
              suggestion: `Ensure '${variable}' is defined in vars or saved by a previous step`,
            });
          }
        }
      }

      // Check for unused step results
      if (step.save) {
        const isUsed = this.checkVariableUsage(ast, step.save, i + 1);
        if (!isUsed) {
          warnings.push({
            message: `Step '${step.id}' saves to '${step.save}' but it's never used`,
            path: `${stepPath}.save`,
            suggestion: `Remove the save field or use '${step.save}' in subsequent steps or outputs`,
          });
        }
      }

      // Validate step-specific requirements
      this.validateStepSpecific(step, stepPath, errors, warnings);
    }

    // Check for duplicate step IDs
    const stepIds = ast.steps.map(step => step.id);
    const duplicateIds = stepIds.filter((id, index) => stepIds.indexOf(id) !== index);
    for (const duplicateId of [...new Set(duplicateIds)]) {
      errors.push({
        message: `Duplicate step ID '${duplicateId}'`,
        path: 'steps',
        suggestion: 'Ensure all step IDs are unique',
      });
    }

    return { errors, warnings };
  }

  validateStepSpecific(step, stepPath, errors, _warnings) {
    switch (step.kind) {
    case 'llm':
      if (!step.model) {
        errors.push({
          message: `LLM step '${step.id}' missing required model field`,
          path: `${stepPath}.model`,
          suggestion: 'Specify a model name like "gpt-4o" or "claude-3-sonnet"',
        });
      }
      if (!step.prompt) {
        errors.push({
          message: `LLM step '${step.id}' missing required prompt field`,
          path: `${stepPath}.prompt`,
          suggestion: 'Add a prompt template for the LLM to process',
        });
      }
      break;

    case 'http':
      if (!step.url) {
        errors.push({
          message: `HTTP step '${step.id}' missing required url field`,
          path: `${stepPath}.url`,
          suggestion: 'Specify the HTTP endpoint URL',
        });
      }
      break;

    case 'function':
      if (!step.function) {
        errors.push({
          message: `Function step '${step.id}' missing required function field`,
          path: `${stepPath}.function`,
          suggestion: 'Specify the function name to execute',
        });
      }
      break;

    case 'vision':
      if (!step.model) {
        errors.push({
          message: `Vision step '${step.id}' missing required model field`,
          path: `${stepPath}.model`,
          suggestion: 'Specify a vision model like "gpt-4o-vision"',
        });
      }
      if (!step.input) {
        errors.push({
          message: `Vision step '${step.id}' missing required input field`,
          path: `${stepPath}.input`,
          suggestion: 'Specify the image input reference',
        });
      }
      break;

    case 'vectordb':
      if (!step.operation) {
        errors.push({
          message: `Vector DB step '${step.id}' missing required operation field`,
          path: `${stepPath}.operation`,
          suggestion: 'Specify the vector database operation (create, insert, search, etc.)',
        });
      }
      if (!step.backend) {
        errors.push({
          message: `Vector DB step '${step.id}' missing required backend field`,
          path: `${stepPath}.backend`,
          suggestion: 'Specify the vector database backend (pinecone, weaviate, etc.)',
        });
      }
      break;
    }
  }

  checkVariableReference(ast, variable, beforeStepIndex = Infinity) {
    // Check if it's a defined variable
    if (ast.vars && ast.vars[variable]) {
      return true;
    }

    // Check if it's a step result from a previous step
    for (let i = 0; i < Math.min(beforeStepIndex, ast.steps.length); i++) {
      const step = ast.steps[i];
      if (step.save === variable) {
        return true;
      }
    }

    // Check if it's a secret
    if (ast.secrets && ast.secrets[variable]) {
      return true;
    }

    // Check if it starts with 'input.' (runtime input)
    if (variable.startsWith('input.')) {
      return true;
    }

    // Check if it's a common system variable
    const systemVars = ['timestamp', 'uuid', 'user_id', 'session_id'];
    if (systemVars.includes(variable)) {
      return true;
    }

    return false;
  }

  checkVariableUsage(ast, variable, fromStepIndex = 0) {
    // Check if used in subsequent steps
    for (let i = fromStepIndex; i < ast.steps.length; i++) {
      const step = ast.steps[i];
      
      if (step.when && this.extractVariables(step.when).includes(variable)) {
        return true;
      }
      if (step.prompt && this.extractVariables(step.prompt).includes(variable)) {
        return true;
      }
      if (step.input && this.extractVariables(step.input).includes(variable)) {
        return true;
      }
      if (step.url && this.extractVariables(step.url).includes(variable)) {
        return true;
      }
      if (step.body && typeof step.body === 'string' && this.extractVariables(step.body).includes(variable)) {
        return true;
      }
    }

    // Check if used in outputs
    if (ast.outputs) {
      for (const outputValue of Object.values(ast.outputs)) {
        if (this.extractVariables(outputValue).includes(variable)) {
          return true;
        }
      }
    }

    if (ast.output && this.extractVariables(ast.output).includes(variable)) {
      return true;
    }

    return false;
  }

  extractVariables(text) {
    if (typeof text !== 'string') {
      return [];
    }

    const regex = /\{([^}]+)\}/g;
    const variables = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      variables.push(match[1].trim());
    }

    return variables;
  }

  // Schema versioning and migration support
  migrateSchema(ast, fromVersion = 1, toVersion = 2) {
    const migrated = JSON.parse(JSON.stringify(ast));

    if (fromVersion === 1 && toVersion === 2) {
      // Migrate from v1 to v2 schema
      
      // Convert single output to outputs object
      if (migrated.output && !migrated.outputs) {
        migrated.outputs = { result: migrated.output };
        delete migrated.output;
      }

      // Convert step action to method for HTTP steps
      for (const step of migrated.steps) {
        if (step.kind === 'http' && step.action && !step.method) {
          step.method = step.action;
          delete step.action;
        }
      }

      // Add version metadata
      migrated._schemaVersion = 2;
    }

    return migrated;
  }

  getSchemaVersion() {
    return enhancedSchema.$id || '2.0';
  }
}

module.exports = new EnhancedAgentValidator();