const logger = require('../diagnostics/logger');

class TemplateRenderer {
  async render(template, context) {
    if (typeof template !== 'string') {
      return template;
    }

    logger.debug(`Rendering template: ${template.substring(0, 50)}...`);

    // Handle simple variable references (not in braces)
    if (!template.includes('{') && !template.includes('}')) {
      // If no template variables, return the string as-is
      return template;
    }

    // Handle template with {var} placeholders
    const rendered = template.replace(/\{([^}]+)\}/g, (match, varName) => {
      const value = this.resolveVariable(varName.trim(), context);
      return value !== undefined ? String(value) : match;
    });

    logger.debug(`Rendered result: ${rendered.substring(0, 50)}...`);
    return rendered;
  }

  async renderObject(obj, context) {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return await this.render(obj, context);
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }

    if (Array.isArray(obj)) {
      const rendered = [];
      for (const item of obj) {
        rendered.push(await this.renderObject(item, context));
      }
      return rendered;
    }

    if (typeof obj === 'object') {
      const rendered = {};
      for (const [key, value] of Object.entries(obj)) {
        const renderedKey = await this.render(key, context);
        const renderedValue = await this.renderObject(value, context);
        rendered[renderedKey] = renderedValue;
      }
      return rendered;
    }

    return obj;
  }

  resolveVariable(varName, context) {
    logger.debug(`Resolving variable: ${varName}`);

    // Resolution order: state → vars → input
    
    // Check state (step results)
    if (context.state && context.state[varName] !== undefined) {
      return context.state[varName];
    }

    // Check vars (defined variables)
    if (context.vars && context.vars[varName] !== undefined) {
      return context.vars[varName];
    }

    // Check input with dot notation
    if (varName.startsWith('input.')) {
      const inputPath = varName.substring(6);
      return this.getNestedValue(context.input, inputPath);
    }

    // Check direct input
    if (context.input && context.input[varName] !== undefined) {
      return context.input[varName];
    }

    // Check environment variables
    if (varName.startsWith('env.')) {
      const envVar = varName.substring(4);
      return process.env[envVar];
    }

    logger.debug(`Variable '${varName}' not found in context`);
    return undefined;
  }

  getNestedValue(obj, path) {
    if (!obj || !path) {
      return undefined;
    }

    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
}

module.exports = new TemplateRenderer();
