const logger = require('../diagnostics/logger');
const _linter = require('./linter');
const _suggestor = require('./suggestor');

class AgentCorrector {
  correct(ast) {
    logger.debug('Correcting agent AST');
    
    const correctedAst = JSON.parse(JSON.stringify(ast)); // Deep clone
    const changes = [];

    // Apply automatic fixes
    this.applyDefaultProvider(correctedAst, changes);
    this.applyDefaultSave(correctedAst, changes);
    this.applyDefaultRetries(correctedAst, changes);
    this.applyDefaultTimeout(correctedAst, changes);
    this.applyDefaultHTTPHeaders(correctedAst, changes);
    this.applyDefaultHTTPAction(correctedAst, changes);

    return {
      ast: correctedAst,
      changes: changes,
    };
  }

  applyDefaultProvider(ast, changes) {
    for (const step of ast.steps) {
      if (step.kind === 'llm' && !step.provider) {
        step.provider = 'openai';
        changes.push(`Added default provider 'openai' to step '${step.id}'`);
      }
    }
  }

  applyDefaultSave(ast, changes) {
    for (const step of ast.steps) {
      if (step.kind === 'llm' && !step.save) {
        step.save = `${step.id}_result`;
        changes.push(`Added default save '${step.save}' to step '${step.id}'`);
      }
    }
  }

  applyDefaultRetries(ast, changes) {
    for (const step of ast.steps) {
      if (step.retries === undefined || step.retries === null) {
        step.retries = 3;
        changes.push(`Added default retries '3' to step '${step.id}'`);
      }
    }
  }

  applyDefaultTimeout(ast, changes) {
    for (const step of ast.steps) {
      if (step.timeout_ms === undefined || step.timeout_ms === null) {
        step.timeout_ms = 60000;
        changes.push(`Added default timeout_ms '60000' to step '${step.id}'`);
      }
    }
  }

  applyDefaultHTTPHeaders(ast, changes) {
    for (const step of ast.steps) {
      if (step.kind === 'http' && (!step.headers || Object.keys(step.headers).length === 0)) {
        step.headers = { 'Content-Type': 'application/json' };
        changes.push(`Added default JSON headers to step '${step.id}'`);
      }
    }
  }

  applyDefaultHTTPAction(ast, changes) {
    for (const step of ast.steps) {
      if (step.kind === 'http' && !step.action) {
        step.action = 'POST';
        changes.push(`Added default action 'POST' to step '${step.id}'`);
      }
    }
  }

  serialize(ast) {
    logger.debug('Serializing corrected AST back to .agent format');
    
    let content = `@agent ${ast.id} v${ast.version}\n`;
    
    // Trigger
    if (ast.trigger) {
      content += `trigger ${ast.trigger.type}`;
      if (ast.trigger.method) content += ` ${ast.trigger.method}`;
      if (ast.trigger.path) content += ` ${ast.trigger.path}`;
      content += '\n';
    }

    // Secrets
    for (const [name, secret] of Object.entries(ast.secrets)) {
      content += `secret ${name}=env:${secret.value}\n`;
    }

    // Variables
    for (const [name, variable] of Object.entries(ast.vars)) {
      if (variable.type === 'input') {
        content += `var ${name} = input.${variable.path}\n`;
      } else if (variable.type === 'env') {
        content += `var ${name} = env.${variable.path}\n`;
      } else {
        content += `var ${name} = ${variable.value}\n`;
      }
    }

    content += '\n';

    // Steps
    for (const step of ast.steps) {
      content += `step ${step.id}:\n`;
      content += `  kind ${step.kind}\n`;
      
      if (step.model) content += `  model ${step.model}\n`;
      if (step.provider) content += `  provider ${step.provider}\n`;
      if (step.when) content += `  when ${step.when}\n`;
      if (step.retries !== undefined) content += `  retries ${step.retries}\n`;
      if (step.timeout_ms !== undefined) content += `  timeout_ms ${step.timeout_ms}\n`;
      
      if (step.prompt) {
        content += '  prompt """\n';
        const promptLines = step.prompt.split('\n');
        for (const line of promptLines) {
          content += `    ${line}\n`;
        }
        content += '  """\n';
      }
      
      if (step.save) content += `  save ${step.save}\n`;
      if (step.action) content += `  action ${step.action}\n`;
      if (step.url) content += `  url ${step.url}\n`;
      
      if (step.headers && Object.keys(step.headers).length > 0) {
        content += `  headers ${JSON.stringify(step.headers)}\n`;
      }
      
      if (step.body) {
        content += `  body ${JSON.stringify(step.body)}\n`;
      }

      content += '\n';
    }

    // Output
    content += `output ${ast.output}\n`;
    content += '@end\n';

    return content;
  }
}

module.exports = new AgentCorrector();
