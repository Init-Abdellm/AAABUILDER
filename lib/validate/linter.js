const logger = require('../diagnostics/logger');

class AgentLinter {
  constructor() {
    this.rules = [
      this.checkSecretLiterals,
      this.checkLLMModelMissing,
      this.checkLLMSaveMissing,
      this.checkHTTPUrlMissing,
      this.checkStepsRequired,
      this.checkOutputRequired,
      this.checkUnusedVariables,
      this.checkProviderMissing,
      this.checkRetryDefaults,
      this.checkTimeoutDefaults,
    ];
  }

  lint(ast) {
    logger.debug('Linting agent AST');
    
    const issues = [];

    for (const rule of this.rules) {
      try {
        const ruleIssues = rule.call(this, ast);
        issues.push(...ruleIssues);
      } catch (error) {
        logger.warn(`Linter rule failed: ${error.message}`);
      }
    }

    return issues;
  }

  checkSecretLiterals(ast) {
    const issues = [];
    
    for (const [secretName, secret] of Object.entries(ast.secrets)) {
      if (secret.type === 'env' && this.looksLikeApiKey(secret.value)) {
        issues.push({
          rule: 'secret-literal',
          severity: 'error',
          message: `Secret '${secretName}' appears to contain a literal API key. Use env:VAR_NAME instead.`,
          location: `secrets.${secretName}`,
        });
      }
    }

    return issues;
  }

  checkLLMModelMissing(ast) {
    const issues = [];
    
    for (const step of ast.steps) {
      if (step.kind === 'llm' && !step.model) {
        issues.push({
          rule: 'llm-model-missing',
          severity: 'error',
          message: `LLM step '${step.id}' is missing required 'model' field`,
          location: `steps.${step.id}.model`,
        });
      }
    }

    return issues;
  }

  checkLLMSaveMissing(ast) {
    const issues = [];
    
    for (const step of ast.steps) {
      if (step.kind === 'llm' && !step.save) {
        issues.push({
          rule: 'llm-save-missing',
          severity: 'warning',
          message: `LLM step '${step.id}' should specify 'save' to store the result`,
          location: `steps.${step.id}.save`,
        });
      }
    }

    return issues;
  }

  checkHTTPUrlMissing(ast) {
    const issues = [];
    
    for (const step of ast.steps) {
      if (step.kind === 'http' && !step.url) {
        issues.push({
          rule: 'http-url-missing',
          severity: 'error',
          message: `HTTP step '${step.id}' is missing required 'url' field`,
          location: `steps.${step.id}.url`,
        });
      }
    }

    return issues;
  }

  checkStepsRequired(ast) {
    const issues = [];
    
    if (!ast.steps || ast.steps.length === 0) {
      issues.push({
        rule: 'steps-required',
        severity: 'error',
        message: 'At least one step is required',
        location: 'steps',
      });
    }

    return issues;
  }

  checkOutputRequired(ast) {
    const issues = [];
    
    if (!ast.output) {
      issues.push({
        rule: 'output-required',
        severity: 'error',
        message: 'Output field is required',
        location: 'output',
      });
    }

    return issues;
  }

  checkUnusedVariables(ast) {
    const issues = [];
    
    for (const [varName, _varDef] of Object.entries(ast.vars)) {
      const isUsed = this.isVariableUsed(ast, varName);
      if (!isUsed) {
        issues.push({
          rule: 'unused-variable',
          severity: 'warning',
          message: `Variable '${varName}' is defined but never used`,
          location: `vars.${varName}`,
        });
      }
    }

    return issues;
  }

  checkProviderMissing(ast) {
    const issues = [];
    
    for (const step of ast.steps) {
      if (step.kind === 'llm' && !step.provider) {
        issues.push({
          rule: 'provider-missing',
          severity: 'warning',
          message: `LLM step '${step.id}' should specify a provider (openai, huggingface, gemini, ollama, llama)`,
          location: `steps.${step.id}.provider`,
        });
      }
    }

    return issues;
  }

  checkRetryDefaults(ast) {
    const issues = [];
    
    for (const step of ast.steps) {
      if (step.retries === undefined || step.retries === null) {
        issues.push({
          rule: 'retry-defaults',
          severity: 'info',
          message: `Step '${step.id}' should specify retries (default: 0)`,
          location: `steps.${step.id}.retries`,
        });
      }
    }

    return issues;
  }

  checkTimeoutDefaults(ast) {
    const issues = [];
    
    for (const step of ast.steps) {
      if (step.timeout_ms === undefined || step.timeout_ms === null) {
        issues.push({
          rule: 'timeout-defaults',
          severity: 'info',
          message: `Step '${step.id}' should specify timeout_ms (default: 60000)`,
          location: `steps.${step.id}.timeout_ms`,
        });
      }
    }

    return issues;
  }

  looksLikeApiKey(value) {
    // Common patterns for API keys
    const patterns = [
      /^sk-[a-zA-Z0-9]{40,}$/, // OpenAI
      /^hf_[a-zA-Z0-9]{40,}$/, // Hugging Face
      /^AIza[a-zA-Z0-9_-]{35}$/, // Google
      /^[a-zA-Z0-9_-]{32,}$/, // Generic long string
    ];

    return patterns.some(pattern => pattern.test(value));
  }

  isVariableUsed(ast, varName) {
    // Check if used in output
    if (ast.output === varName) {
      return true;
    }

    // Check if used in step conditions
    for (const step of ast.steps) {
      if (step.when === varName) {
        return true;
      }

      // Check if used in prompts
      if (step.prompt && step.prompt.includes(`{${varName}}`)) {
        return true;
      }

      // Check if used in URLs
      if (step.url && step.url.includes(`{${varName}}`)) {
        return true;
      }

      // Check if used in body
      if (step.body && typeof step.body === 'object') {
        const bodyStr = JSON.stringify(step.body);
        if (bodyStr.includes(`{${varName}}`)) {
          return true;
        }
      }
    }

    return false;
  }
}

module.exports = new AgentLinter();
