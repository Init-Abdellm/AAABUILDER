import { EnhancedAgentParser, AgentAST } from '../parser/enhanced-parser';
import { ProviderRouter } from '../providers';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Documentation Format
 */
export type DocumentationFormat = 'markdown' | 'html' | 'json' | 'openapi';

/**
 * Documentation Options
 */
export interface DocumentationOptions {
  format: DocumentationFormat;
  outputDir: string;
  includeExamples?: boolean;
  includeProviders?: boolean;
  includeTests?: boolean;
  includeDeployment?: boolean;
  theme?: 'default' | 'minimal' | 'detailed';
  title?: string;
  description?: string;
  version?: string;
}

/**
 * Agent Documentation
 */
export interface AgentDocumentation {
  agent: AgentAST;
  metadata: {
    filePath: string;
    lastModified: Date;
    size: number;
  };
  api: {
    endpoint: string;
    method: string;
    requestSchema: any;
    responseSchema: any;
    examples: any[];
  };
  steps: StepDocumentation[];
  providers: string[];
  variables: VariableDocumentation[];
  testing: {
    testCases: number;
    coverage: string;
    lastRun?: Date;
  };
}

/**
 * Step Documentation
 */
export interface StepDocumentation {
  id: string;
  type: string;
  description: string;
  provider?: string;
  model?: string;
  inputs: string[];
  outputs: string[];
  conditions?: string;
  errorHandling: {
    retries: number;
    timeout: number;
  };
}

/**
 * Variable Documentation
 */
export interface VariableDocumentation {
  name: string;
  type: string;
  source: string;
  required: boolean;
  default?: any;
  description?: string;
  validation?: string[];
}

/**
 * Documentation Generator
 * Automatically generates comprehensive documentation for AAABuilder agents
 */
export class DocumentationGenerator {
  private parser: EnhancedAgentParser;
  private providerRouter: ProviderRouter | undefined;

  constructor(providerRouter?: ProviderRouter) {
    this.parser = new EnhancedAgentParser();
    this.providerRouter = providerRouter;
  }

  /**
   * Generate documentation for a single agent
   */
  async generateAgentDocumentation(
    agentFilePath: string, 
    _options: Partial<DocumentationOptions> = {}
  ): Promise<AgentDocumentation> {
    const agentContent = await fs.readFile(agentFilePath, 'utf-8');
    const parseResult = this.parser.parse(agentContent);
    
    if (!parseResult.ast) {
      throw new Error(`Failed to parse agent file: ${agentFilePath}`);
    }

    const stats = await fs.stat(agentFilePath);
    
    const documentation: AgentDocumentation = {
      agent: parseResult.ast,
      metadata: {
        filePath: agentFilePath,
        lastModified: stats.mtime,
        size: stats.size
      },
      api: this.generateAPIDocumentation(parseResult.ast),
      steps: this.generateStepsDocumentation(parseResult.ast.steps || []),
      providers: this.extractProviders(parseResult.ast),
      variables: this.generateVariablesDocumentation(parseResult.ast.vars || {}),
      testing: await this.generateTestingDocumentation(agentFilePath)
    };

    return documentation;
  }

  /**
   * Generate documentation for multiple agents
   */
  async generateProjectDocumentation(
    agentDir: string,
    options: DocumentationOptions
  ): Promise<void> {
    console.log(`📚 Generating documentation for project: ${agentDir}`);
    
    // Find all agent files
    const agentFiles = await this.findAgentFiles(agentDir);
    console.log(`Found ${agentFiles.length} agent files`);

    // Generate documentation for each agent
    const agentDocs: AgentDocumentation[] = [];
    for (const agentFile of agentFiles) {
      try {
        const doc = await this.generateAgentDocumentation(agentFile, options);
        agentDocs.push(doc);
        console.log(`  ✅ ${path.basename(agentFile)}`);
      } catch (error) {
        console.error(`  ❌ ${path.basename(agentFile)}: ${error instanceof Error ? error.message : error}`);
      }
    }

    // Create output directory
    await fs.mkdir(options.outputDir, { recursive: true });

    // Generate documentation based on format
    switch (options.format) {
      case 'markdown':
        await this.generateMarkdownDocumentation(agentDocs, options);
        break;
      case 'html':
        await this.generateHTMLDocumentation(agentDocs, options);
        break;
      case 'json':
        await this.generateJSONDocumentation(agentDocs, options);
        break;
      case 'openapi':
        await this.generateOpenAPIDocumentation(agentDocs, options);
        break;
      default:
        throw new Error(`Unsupported documentation format: ${options.format}`);
    }

    console.log(`📖 Documentation generated in: ${options.outputDir}`);
  }

  /**
   * Generate API documentation from agent AST
   */
  private generateAPIDocumentation(ast: AgentAST): AgentDocumentation['api'] {
    const trigger = ast.trigger;
    
    return {
      endpoint: trigger?.path || `/${ast.id}`,
      method: trigger?.method || 'POST',
      requestSchema: this.generateRequestSchema(ast),
      responseSchema: this.generateResponseSchema(ast),
      examples: this.generateAPIExamples(ast)
    };
  }

  /**
   * Generate request schema from agent variables
   */
  private generateRequestSchema(ast: AgentAST): any {
    const schema: any = {
      type: 'object',
      properties: {},
      required: []
    };

    const vars = ast.vars || {};
    for (const [varName, varConfig] of Object.entries(vars)) {
      if (varConfig.type === 'input') {
        const propertyName = varConfig.from || varName;
        
        schema.properties[propertyName] = {
          type: this.mapVariableType(varConfig.type),
          description: `Input variable: ${varName}`
        };

        if (varConfig.required) {
          schema.required.push(propertyName);
        }

        if (varConfig.default !== undefined) {
          schema.properties[propertyName].default = varConfig.default;
        }
      }
    }

    return schema;
  }

  /**
   * Generate response schema from agent outputs
   */
  private generateResponseSchema(ast: AgentAST): any {
    const schema: any = {
      type: 'object',
      properties: {}
    };

    const outputs = ast.outputs || {};
    for (const [outputName, outputValue] of Object.entries(outputs)) {
      schema.properties[outputName] = {
        type: 'string', // Most outputs are strings or can be serialized as strings
        description: `Output: ${outputValue}`
      };
    }

    return schema;
  }

  /**
   * Generate API examples
   */
  private generateAPIExamples(ast: AgentAST): any[] {
    const examples: any[] = [];

    // Basic example
    const basicExample: any = {
      name: 'Basic Request',
      request: {},
      response: {}
    };

    // Generate sample request
    const vars = ast.vars || {};
    for (const [varName, varConfig] of Object.entries(vars)) {
      if (varConfig.type === 'input' && varConfig.required) {
        const propertyName = varConfig.from || varName;
        basicExample.request[propertyName] = this.generateSampleValue(varConfig.type, varName);
      }
    }

    // Generate sample response
    const outputs = ast.outputs || {};
    for (const [outputName] of Object.entries(outputs)) {
      basicExample.response[outputName] = `Sample ${outputName} value`;
    }

    examples.push(basicExample);

    return examples;
  }

  /**
   * Generate steps documentation
   */
  private generateStepsDocumentation(steps: any[] = []): StepDocumentation[] {
    return steps.map(step => ({
      id: step.id,
      type: step.kind || 'unknown',
      description: this.generateStepDescription(step),
      provider: step.provider,
      model: step.model,
      inputs: this.extractStepInputs(step),
      outputs: step.save ? [step.save] : [],
      conditions: step.when,
      errorHandling: {
        retries: step.retries || 0,
        timeout: step.timeout_ms || 60000
      }
    }));
  }

  /**
   * Generate step description
   */
  private generateStepDescription(step: any): string {
    const descriptions: Record<string, string> = {
      'llm': `Language model processing using ${step.model || 'default model'}`,
      'http': `HTTP request to ${step.url || 'external service'}`,
      'function': `Function execution: ${step.operation || step.function || 'custom function'}`,
      'vision': `Computer vision processing using ${step.model || 'vision model'}`,
      'audio': `Audio processing using ${step.model || 'audio model'}`,
      'asr': `Speech-to-text conversion using ${step.model || 'ASR model'}`,
      'tts': `Text-to-speech synthesis using ${step.model || 'TTS model'}`,
      'ml': `Machine learning inference using ${step.model || 'ML model'}`
    };

    const baseDescription = descriptions[step.kind] || `${step.kind || 'Unknown'} step`;
    
    if (step.when) {
      return `${baseDescription} (conditional: ${step.when})`;
    }

    return baseDescription;
  }

  /**
   * Extract step inputs
   */
  private extractStepInputs(step: any): string[] {
    const inputs: string[] = [];

    if (step.prompt) {
      const variables = step.prompt.match(/\{([^}]+)\}/g);
      if (variables) {
        inputs.push(...variables.map((v: string) => v.slice(1, -1)));
      }
    }

    if (step.input) {
      const variables = step.input.match(/\{([^}]+)\}/g);
      if (variables) {
        inputs.push(...variables.map((v: string) => v.slice(1, -1)));
      }
    }

    return [...new Set(inputs)]; // Remove duplicates
  }

  /**
   * Extract providers used in agent
   */
  private extractProviders(ast: AgentAST): string[] {
    const providers = new Set<string>();
    const steps = (ast as any).steps || [];
    for (const step of steps) {
      if (step && step.provider) {
        providers.add(step.provider);
      }
    }
    return Array.from(providers);
  }

  /**
   * Generate variables documentation
   */
  private generateVariablesDocumentation(vars: Record<string, any>): VariableDocumentation[] {
    return Object.entries(vars).map(([name, config]) => ({
      name,
      type: (config as any).type || 'string',
      source: (config as any).from || 'unknown',
      required: Boolean((config as any).required),
      default: (config as any).default,
      description: this.generateVariableDescription(name, config),
    }));
  }

  /**
   * Generate variable description
   */
  private generateVariableDescription(_name: string, config: any): string {
    const sourceDescriptions: Record<string, string> = {
      input: 'User input parameter',
      env: 'Environment variable',
      literal: 'Static value',
      computed: 'Computed value',
    };

    const baseDesc = sourceDescriptions[config?.type] || 'Variable';
    if (config?.from) {
      return `${baseDesc} from ${config.from}`;
    }
    return baseDesc;
  }

  /**
   * Generate testing documentation
   */
  private async generateTestingDocumentation(
    agentFilePath: string
  ): Promise<AgentDocumentation['testing']> {
    const agentDir = path.dirname(agentFilePath);
    const agentName = path.basename(agentFilePath, '.agent');

    const possibleTestPaths = [
      path.join(agentDir, '..', 'tests', `${agentName}.test.ts`),
      path.join(agentDir, '..', 'tests', `${agentName}.test.js`),
      path.join(agentDir, '__tests__', `${agentName}.test.ts`),
      path.join(agentDir, '__tests__', `${agentName}.test.js`),
    ];

    let testCases = 0;
    let lastRun: Date | undefined;

    for (const testPath of possibleTestPaths) {
      try {
        const testContent = await fs.readFile(testPath, 'utf-8');
        const testMatches = testContent.match(/test\(|it\(/g);
        testCases += testMatches ? testMatches.length : 0;

        const stats = await fs.stat(testPath);
        if (!lastRun || stats.mtime > lastRun) {
          lastRun = stats.mtime;
        }
      } catch (_error) {
        // ignore
      }
    }

    const testing: AgentDocumentation['testing'] = {
      testCases,
      coverage: testCases > 0 ? 'Available' : 'None',
    };
    if (lastRun) testing.lastRun = lastRun;
    return testing;
  }

  /**
   * Generate Markdown documentation
   */
  private async generateMarkdownDocumentation(
    agentDocs: AgentDocumentation[],
    options: DocumentationOptions
  ): Promise<void> {
    const indexContent = this.generateMarkdownIndex(agentDocs, options);
    await fs.writeFile(path.join(options.outputDir, 'README.md'), indexContent);

    for (const doc of agentDocs) {
      const agentContent = this.generateMarkdownAgent(doc, options);
      const fileName = `${doc.agent.id}.md`;
      await fs.writeFile(path.join(options.outputDir, fileName), agentContent);
    }

    if (options.includeExamples) {
      const apiContent = this.generateMarkdownAPI(agentDocs, options);
      await fs.writeFile(path.join(options.outputDir, 'API.md'), apiContent);
    }

    console.log('  Generated Markdown documentation');
  }

  /**
   * Generate Markdown index
   */
  private generateMarkdownIndex(
    agentDocs: AgentDocumentation[],
    options: DocumentationOptions
  ): string {
    const title = options.title || 'AAABuilder Project Documentation';
    const description = options.description || 'Auto-generated documentation for AAABuilder agents';

    let content = `# ${title}\n\n${description}\n\n`;
    content += `Generated on: ${new Date().toISOString()}\n\n`;
    if (options.version) content += `Version: ${options.version}\n\n`;

    content += `## Agents\n\n`;
    content += `This project contains ${agentDocs.length} agent(s):\n\n`;

    for (const doc of agentDocs) {
      content += `### [${doc.agent.id}](${doc.agent.id}.md)\n\n`;
      content += `${doc.agent.description || 'No description available'}\n\n`;
      content += `- **Endpoint**: \`${doc.api.method} ${doc.api.endpoint}\`\n`;
      content += `- **Steps**: ${doc.steps.length}\n`;
      content += `- **Providers**: ${doc.providers.join(', ') || 'None'}\n`;
      content += `- **Variables**: ${doc.variables.length}\n`;
      content += `- **Tests**: ${doc.testing.testCases}\n\n`;
    }

    if (options.includeProviders && this.providerRouter) {
      content += `## Available Providers\n\n`;
    }

    content += `## Quick Start\n\n`;
    content += `1. Install dependencies: \`npm install\`\n`;
    content += `2. Start the server: \`npm start\`\n`;
    content += `3. Test the agents: \`npm test\`\n\n`;

    content += `## API Reference\n\n`;
    content += `See [API.md](API.md) for detailed API documentation.\n\n`;
    return content;
  }

  /**
   * Generate Markdown for individual agent
   */
  private generateMarkdownAgent(
    doc: AgentDocumentation,
    options: DocumentationOptions
  ): string {
    let content = `# ${doc.agent.id}\n\n`;
    if (doc.agent.description) content += `${doc.agent.description}\n\n`;
    content += `## API Endpoint\n\n`;
    content += `\`\`\`\n${doc.api.method} ${doc.api.endpoint}\`\`\`\n\n`;

    if (doc.variables.length > 0) {
      content += `## Input Variables\n\n`;
      content += `| Name | Type | Source | Required | Default | Description |\n`;
      content += `|------|------|--------|----------|---------|-------------|\n`;
      for (const variable of doc.variables) {
        const required = variable.required ? '✅' : '❌';
        const defaultValue =
          variable.default !== undefined ? `\`${JSON.stringify(variable.default)}\`` : '-';
        content += `| ${variable.name} | ${variable.type} | ${variable.source} | ${required} | ${defaultValue} | ${variable.description || ''} |\n`;
      }
      content += `\n`;
    }

    content += `## Processing Steps\n\n`;
    for (const [i, step] of doc.steps.entries()) {
      if (!step) continue;
      content += `### ${i + 1}. ${step.id}\n\n`;
      content += `**Type**: ${step.type}\n\n`;
      content += `**Description**: ${step.description}\n\n`;
      if (step.provider) content += `**Provider**: ${step.provider}\n\n`;
      if (step.model) content += `**Model**: ${step.model}\n\n`;
      if (step.inputs && step.inputs.length > 0) {
        content += `**Inputs**: ${step.inputs.map((i) => `\`{${i}}\``).join(', ')}\n\n`;
      }
      if (step.outputs && step.outputs.length > 0) {
        content += `**Outputs**: ${step.outputs.map((o) => `\`${o}\``).join(', ')}\n\n`;
      }
      if (step.conditions) {
        content += `**Condition**: \`${step.conditions}\`\n\n`;
      }
      content += `**Error Handling**:\n`;
      content += `- Retries: ${step.errorHandling.retries}\n`;
      content += `- Timeout: ${step.errorHandling.timeout}ms\n\n`;
    }

    if (options.includeExamples && doc.api.examples.length > 0) {
      content += `## Examples\n\n`;
      for (const example of doc.api.examples) {
        content += `### ${example.name}\n\n`;
        content += `**Request**:\n\`\`\`json\n${JSON.stringify(example.request, null, 2)}\n\`\`\`\n\n`;
        content += `**Response**:\n\`\`\`json\n${JSON.stringify(example.response, null, 2)}\n\`\`\`\n\n`;
      }
    }

    if (options.includeTests && doc.testing.testCases > 0) {
      content += `## Testing\n\n`;
      content += `- **Test Cases**: ${doc.testing.testCases}\n`;
      content += `- **Coverage**: ${doc.testing.coverage}\n`;
      if (doc.testing.lastRun) content += `- **Last Run**: ${doc.testing.lastRun.toISOString()}\n`;
      content += `\n`;
    }

    content += `## Metadata\n\n`;
    content += `- **File**: ${doc.metadata.filePath}\n`;
    content += `- **Size**: ${doc.metadata.size} bytes\n`;
    content += `- **Last Modified**: ${doc.metadata.lastModified.toISOString()}\n`;
    return content;
  }

  /**
   * Generate API reference in Markdown
   */
  private generateMarkdownAPI(
    agentDocs: AgentDocumentation[],
    _options: DocumentationOptions
  ): string {
    let content = `# API Reference\n\n`;
    content += `This document provides detailed API information for all agents.\n\n`;
    for (const doc of agentDocs) {
      content += `## ${doc.agent.id}\n\n`;
      content += `${doc.agent.description || 'No description available'}\n\n`;
      content += `**Endpoint**: \`${doc.api.method} ${doc.api.endpoint}\`\n\n`;
      content += `### Request Schema\n\n`;
      content += `\`\`\`json\n${JSON.stringify(doc.api.requestSchema, null, 2)}\n\`\`\`\n\n`;
      content += `### Response Schema\n\n`;
      content += `\`\`\`json\n${JSON.stringify(doc.api.responseSchema, null, 2)}\n\`\`\`\n\n`;
      if (doc.api.examples.length > 0) {
        content += `### Examples\n\n`;
        for (const example of doc.api.examples) {
          content += `#### ${example.name}\n\n`;
          content += `**cURL**:\n\`\`\`bash\n`;
          content += `curl -X ${doc.api.method} http://localhost:5000${doc.api.endpoint} \\\n`;
          content += `  -H \"Content-Type: application/json\" \\\n`;
          content += `  -d '${JSON.stringify(example.request)}'\n`;
          content += `\`\`\`\n\n`;
          content += `**Response**:\n\`\`\`json\n${JSON.stringify(example.response, null, 2)}\n\`\`\`\n\n`;
        }
      }
    }
    return content;
  }

  /**
   * Generate HTML documentation
   */
  private async generateHTMLDocumentation(
    agentDocs: AgentDocumentation[],
    options: DocumentationOptions
  ): Promise<void> {
    const title = options.title || 'AAABuilder Documentation';
    const html = `<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\" />\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n<title>${title}</title>\n<style>\n body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 2rem; line-height: 1.5; }\n code, pre { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; }\n pre { padding: 12px; overflow: auto; }\n .card { border: 1px solid #eee; border-radius: 8px; padding: 16px; margin: 16px 0; }\n .muted { color: #666; }\n h1,h2,h3 { margin-top: 1.4em; }\n</style>\n</head>\n<body>\n<h1>${title}</h1>\n<p class=\"muted\">Generated on ${new Date().toISOString()}</p>\n${agentDocs
      .map((doc) => {
        const summary = `\n    <div class=\"card\">\n      <h2>${doc.agent.id}</h2>\n      <p>${doc.agent.description || ''}</p>\n      <p><strong>Endpoint:</strong> <code>${doc.api.method} ${doc.api.endpoint}</code></p>\n      <p><strong>Steps:</strong> ${doc.steps.length} | <strong>Providers:</strong> ${
          doc.providers.join(', ') || 'None'
        } | <strong>Variables:</strong> ${doc.variables.length}</p>\n    </div>`;
        return summary;
      })
      .join('\n')}\n</body>\n</html>`;
    await fs.writeFile(path.join(options.outputDir, 'index.html'), html, 'utf-8');
    console.log('  Generated HTML documentation');
  }

  /**
   * Generate JSON documentation
   */
  private async generateJSONDocumentation(
    agentDocs: AgentDocumentation[],
    options: DocumentationOptions
  ): Promise<void> {
    const out = {
      generatedAt: new Date().toISOString(),
      agents: agentDocs,
    };
    await fs.writeFile(
      path.join(options.outputDir, 'documentation.json'),
      JSON.stringify(out, null, 2),
      'utf-8'
    );
    console.log('  Generated JSON documentation');
  }

  /**
   * Generate OpenAPI documentation
   */
  private async generateOpenAPIDocumentation(
    agentDocs: AgentDocumentation[],
    options: DocumentationOptions
  ): Promise<void> {
    const openApiDoc: any = {
      openapi: '3.0.0',
      info: {
        title: options.title || 'AAABuilder API',
        description: options.description || 'Auto-generated API documentation',
        version: options.version || '1.0.0',
      },
      servers: [
        { url: 'http://localhost:5000', description: 'Development server' },
      ],
      paths: {},
    };

    for (const doc of agentDocs) {
      const endpointPath = doc.api.endpoint;
      const method = doc.api.method.toLowerCase();
      (openApiDoc.paths as any)[endpointPath] = {
        [method]: {
          summary: doc.agent.description || `Execute ${doc.agent.id} agent`,
          description: `Process request through the ${doc.agent.id} agent`,
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: doc.api.requestSchema },
            },
          },
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': { schema: doc.api.responseSchema },
              },
            },
            '400': { description: 'Bad request' },
            '500': { description: 'Internal server error' },
          },
        },
      };
    }

    await fs.writeFile(
      path.join(options.outputDir, 'openapi.json'),
      JSON.stringify(openApiDoc, null, 2)
    );
    console.log('  🔌 Generated OpenAPI documentation');
  }

  // Helper methods
  private async findAgentFiles(directory: string): Promise<string[]> {
    const agentFiles: string[] = [];
    try {
      const items = await fs.readdir(directory, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(directory, item.name);
        if (item.isDirectory()) {
          const subFiles = await this.findAgentFiles(fullPath);
          agentFiles.push(...subFiles);
        } else if (item.name.endsWith('.agent')) {
          agentFiles.push(fullPath);
        }
      }
    } catch (_error) {
      // ignore
    }
    return agentFiles;
  }

  private mapVariableType(type: string): string {
    const typeMap: Record<string, string> = {
      input: 'string',
      env: 'string',
      literal: 'string',
      computed: 'string',
      number: 'number',
      boolean: 'boolean',
      array: 'array',
      object: 'object',
    };
    return typeMap[type] || 'string';
  }

  private generateSampleValue(type: string, name: string): any {
    const sampleValues: Record<string, any> = {
      string: `Sample ${name}`,
      number: 42,
      boolean: true,
      array: ['item1', 'item2'],
      object: { key: 'value' },
    };
    return sampleValues[type] || `Sample ${name}`;
  }
}