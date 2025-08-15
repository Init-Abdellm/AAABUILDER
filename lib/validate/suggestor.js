const logger = require('../diagnostics/logger');

class AgentSuggestor {
  generateSuggestions(issues) {
    logger.debug('Generating suggestions for issues');
    
    const suggestions = [];

    for (const issue of issues) {
      const suggestion = this.createSuggestion(issue);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    return suggestions;
  }

  createSuggestion(issue) {
    switch (issue.rule) {
      case 'secret-literal':
        return {
          rule: issue.rule,
          message: issue.message,
          action: `Replace the literal value with env:${issue.location.split('.')[1]}_KEY`,
          autoFixable: false
        };

      case 'llm-model-missing':
        return {
          rule: issue.rule,
          message: issue.message,
          action: 'Add a model field, e.g., "model: gpt-4o"',
          autoFixable: true,
          fix: {
            field: 'model',
            value: 'gpt-4o'
          }
        };

      case 'llm-save-missing':
        return {
          rule: issue.rule,
          message: issue.message,
          action: `Add a save field to store the result, e.g., "save: ${this.getStepIdFromLocation(issue.location)}_result"`,
          autoFixable: true,
          fix: {
            field: 'save',
            value: `${this.getStepIdFromLocation(issue.location)}_result`
          }
        };

      case 'provider-missing':
        return {
          rule: issue.rule,
          message: issue.message,
          action: 'Add a provider field, e.g., "provider: openai"',
          autoFixable: true,
          fix: {
            field: 'provider',
            value: 'openai'
          }
        };

      case 'http-url-missing':
        return {
          rule: issue.rule,
          message: issue.message,
          action: 'Add a url field with the target endpoint',
          autoFixable: false
        };

      case 'retry-defaults':
        return {
          rule: issue.rule,
          message: issue.message,
          action: 'Add retries field, e.g., "retries: 3"',
          autoFixable: true,
          fix: {
            field: 'retries',
            value: 3
          }
        };

      case 'timeout-defaults':
        return {
          rule: issue.rule,
          message: issue.message,
          action: 'Add timeout_ms field, e.g., "timeout_ms: 60000"',
          autoFixable: true,
          fix: {
            field: 'timeout_ms',
            value: 60000
          }
        };

      case 'unused-variable':
        return {
          rule: issue.rule,
          message: issue.message,
          action: 'Remove the unused variable or use it in a step',
          autoFixable: false
        };

      case 'steps-required':
        return {
          rule: issue.rule,
          message: issue.message,
          action: 'Add at least one step to the agent',
          autoFixable: false
        };

      case 'output-required':
        return {
          rule: issue.rule,
          message: issue.message,
          action: 'Add an output field referencing a variable or step result',
          autoFixable: false
        };

      default:
        return {
          rule: issue.rule,
          message: issue.message,
          action: 'Manual review required',
          autoFixable: false
        };
    }
  }

  getStepIdFromLocation(location) {
    // Extract step ID from location like "steps.stepId.field"
    const parts = location.split('.');
    return parts[1] || 'step';
  }
}

module.exports = new AgentSuggestor();
