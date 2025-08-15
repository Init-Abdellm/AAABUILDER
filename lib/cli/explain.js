const logger = require('../diagnostics/logger');
const chalk = require('chalk');

class AgentExplainer {
  explainAgent(ast) {
    logger.debug(`Explaining agent: ${ast.id}`);
    
    let explanation = '';
    
    // Header
    explanation += chalk.blue.bold(`Agent: ${ast.id} (v${ast.version})\n`);
    explanation += '='.repeat(50) + '\n\n';

    // Trigger
    explanation += chalk.yellow.bold('Trigger:\n');
    if (ast.trigger) {
      explanation += `  Type: ${ast.trigger.type}\n`;
      if (ast.trigger.method) {
        explanation += `  Method: ${ast.trigger.method}\n`;
      }
      if (ast.trigger.path) {
        explanation += `  Path: ${ast.trigger.path}\n`;
      }
    }
    explanation += '\n';

    // Secrets
    if (Object.keys(ast.secrets).length > 0) {
      explanation += chalk.yellow.bold('Secrets:\n');
      for (const [alias, config] of Object.entries(ast.secrets)) {
        explanation += `  ${alias} → ${config.type}:${config.value}\n`;
      }
      explanation += '\n';
    }

    // Variables
    if (Object.keys(ast.vars).length > 0) {
      explanation += chalk.yellow.bold('Variables:\n');
      for (const [name, varDef] of Object.entries(ast.vars)) {
        if (varDef.type === 'input') {
          explanation += `  ${name} = input.${varDef.path}\n`;
        } else if (varDef.type === 'env') {
          explanation += `  ${name} = env.${varDef.path}\n`;
        } else {
          explanation += `  ${name} = ${varDef.value}\n`;
        }
      }
      explanation += '\n';
    }

    // Execution Flow
    explanation += chalk.yellow.bold('Execution Flow:\n');
    
    for (let i = 0; i < ast.steps.length; i++) {
      const step = ast.steps[i];
      explanation += `${i + 1}. ${chalk.cyan(step.id)} (${step.kind})\n`;
      
      if (step.when) {
        explanation += `   Condition: Execute only if '${step.when}' is truthy\n`;
      }
      
      if (step.kind === 'llm') {
        explanation += `   Model: ${step.model || 'not specified'}\n`;
        explanation += `   Provider: ${step.provider || 'not specified'}\n`;
        if (step.prompt) {
          const promptPreview = step.prompt.substring(0, 100);
          explanation += `   Prompt: "${promptPreview}${step.prompt.length > 100 ? '...' : ''}"\n`;
        }
      } else if (step.kind === 'http') {
        explanation += `   Action: ${step.action || 'GET'}\n`;
        explanation += `   URL: ${step.url || 'not specified'}\n`;
        if (step.headers && Object.keys(step.headers).length > 0) {
          explanation += `   Headers: ${JSON.stringify(step.headers)}\n`;
        }
      }
      
      if (step.save) {
        explanation += `   Saves result to: ${step.save}\n`;
      }
      
      explanation += `   Retries: ${step.retries || 0}\n`;
      explanation += `   Timeout: ${step.timeout_ms || 60000}ms\n`;
      explanation += '\n';
    }

    // Output
    explanation += chalk.yellow.bold('Output:\n');
    explanation += `  Returns: ${ast.output}\n\n`;

    // Dependencies
    const dependencies = this.analyzeDependencies(ast);
    if (dependencies.length > 0) {
      explanation += chalk.yellow.bold('Variable Dependencies:\n');
      dependencies.forEach(dep => {
        explanation += `  ${dep.variable} → used in ${dep.usedIn.join(', ')}\n`;
      });
      explanation += '\n';
    }

    // Summary
    explanation += chalk.green.bold('Summary:\n');
    explanation += `  • ${ast.steps.length} step(s)\n`;
    explanation += `  • ${Object.keys(ast.vars).length} variable(s)\n`;
    explanation += `  • ${Object.keys(ast.secrets).length} secret(s)\n`;
    
    const llmSteps = ast.steps.filter(s => s.kind === 'llm').length;
    const httpSteps = ast.steps.filter(s => s.kind === 'http').length;
    const functionSteps = ast.steps.filter(s => s.kind === 'function').length;
    
    if (llmSteps > 0) explanation += `  • ${llmSteps} LLM call(s)\n`;
    if (httpSteps > 0) explanation += `  • ${httpSteps} HTTP request(s)\n`;
    if (functionSteps > 0) explanation += `  • ${functionSteps} function call(s)\n`;

    return explanation;
  }

  analyzeDependencies(ast) {
    const dependencies = [];
    const allVariables = new Set([
      ...Object.keys(ast.vars),
      ...ast.steps.filter(s => s.save).map(s => s.save),
    ]);

    for (const variable of allVariables) {
      const usedIn = [];

      // Check output
      if (ast.output === variable) {
        usedIn.push('output');
      }

      // Check step conditions and content
      for (const step of ast.steps) {
        if (step.when === variable) {
          usedIn.push(`${step.id} (condition)`);
        }

        if (step.prompt && step.prompt.includes(`{${variable}}`)) {
          usedIn.push(`${step.id} (prompt)`);
        }

        if (step.url && step.url.includes(`{${variable}}`)) {
          usedIn.push(`${step.id} (url)`);
        }

        if (step.body && typeof step.body === 'object') {
          const bodyStr = JSON.stringify(step.body);
          if (bodyStr.includes(`{${variable}}`)) {
            usedIn.push(`${step.id} (body)`);
          }
        }
      }

      if (usedIn.length > 0) {
        dependencies.push({ variable, usedIn });
      }
    }

    return dependencies;
  }
}

module.exports = new AgentExplainer();