import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Project Template
 */
export interface ProjectTemplate {
  name: string;
  description: string;
  category: 'basic' | 'advanced' | 'specialized';
  files: TemplateFile[];
  dependencies?: string[];
  scripts?: Record<string, string>;
  envVars?: string[];
  instructions?: string[];
}

/**
 * Template File
 */
export interface TemplateFile {
  path: string;
  content: string;
  executable?: boolean;
}

/**
 * Scaffolding Options
 */
export interface ScaffoldingOptions {
  projectName: string;
  template: string;
  outputDir: string;
  overwrite?: boolean;
  installDependencies?: boolean;
  initGit?: boolean;
  variables?: Record<string, string>;
}

/**
 * Project Scaffolder
 * Creates new AAABuilder projects from templates
 */
export class ProjectScaffolder {
  private templates: Map<string, ProjectTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  /**
   * Register a project template
   */
  registerTemplate(template: ProjectTemplate): void {
    this.templates.set(template.name, template);
  }

  /**
   * Get available templates
   */
  getTemplates(): ProjectTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get template by name
   */
  getTemplate(name: string): ProjectTemplate | undefined {
    return this.templates.get(name);
  }

  /**
   * Create a new project from template
   */
  async createProject(options: ScaffoldingOptions): Promise<void> {
    const template = this.templates.get(options.template);
    if (!template) {
      throw new Error(`Template not found: ${options.template}`);
    }

    console.log(`🏗️  Creating project: ${options.projectName}`);
    console.log(`   Template: ${template.name}`);
    console.log(`   Output: ${options.outputDir}`);

    // Create output directory
    await this.ensureDirectory(options.outputDir);

    // Check if directory is empty (unless overwrite is enabled)
    if (!options.overwrite) {
      const files = await fs.readdir(options.outputDir);
      if (files.length > 0) {
        throw new Error(`Directory is not empty: ${options.outputDir}. Use --overwrite to force.`);
      }
    }

    // Process template variables
    const projectName = options.projectName || '';
    const variables: any = {
      PROJECT_NAME: projectName,
      PROJECT_NAME_KEBAB: this.toKebabCase(projectName),
      PROJECT_NAME_PASCAL: this.toPascalCase(projectName),
      PROJECT_NAME_SNAKE: this.toSnakeCase(projectName),
      CURRENT_YEAR: new Date().getFullYear().toString(),
      CURRENT_DATE: new Date().toISOString().split('T')[0]
    };
    
    // Add user variables, ensuring all values are strings
    const userVars = options.variables || {};
    for (const key in userVars) {
      if (userVars.hasOwnProperty(key) && userVars[key]) {
        variables[key] = userVars[key];
      }
    }
    
    // Ensure CURRENT_DATE is always a string
    if (!variables.CURRENT_DATE) {
      variables.CURRENT_DATE = new Date().toISOString().split('T')[0];
    }

    // Create files from template
    for (const file of template.files) {
      const filePath = path.join(options.outputDir, this.processTemplate(file.path, variables));
      const fileContent = this.processTemplate(file.content, variables);

      await this.ensureDirectory(path.dirname(filePath));
      await fs.writeFile(filePath, fileContent, 'utf-8');

      if (file.executable) {
        await fs.chmod(filePath, 0o755);
      }

      console.log(`   Created: ${path.relative(options.outputDir, filePath)}`);
    }

    // Create package.json with dependencies
    if (template.dependencies || template.scripts) {
      await this.createPackageJson(options.outputDir, template, variables);
    }

    // Create .env.example with required environment variables
    if (template.envVars && template.envVars.length > 0) {
      await this.createEnvExample(options.outputDir, template.envVars);
    }

    // Initialize git repository
    if (options.initGit) {
      await this.initGitRepository(options.outputDir);
    }

    // Install dependencies
    if (options.installDependencies && template.dependencies) {
      await this.installDependencies(options.outputDir);
    }

    // Show completion message with instructions
    console.log(`\n✅ Project created successfully!`);
    console.log(`\n📁 Project location: ${options.outputDir}`);
    
    if (template.instructions) {
      console.log(`\n📋 Next steps:`);
      template.instructions.forEach((instruction, index) => {
        console.log(`   ${index + 1}. ${this.processTemplate(instruction, variables)}`);
      });
    }
  }

  /**
   * Initialize default templates
   */
  private initializeDefaultTemplates(): void {
    // Basic Chatbot Template
    this.registerTemplate({
      name: 'basic-chatbot',
      description: 'Simple chatbot with OpenAI integration',
      category: 'basic',
      files: [
        {
          path: 'agents/{{PROJECT_NAME_KEBAB}}.agent',
          content: `@agent {{PROJECT_NAME_KEBAB}} v1
description: "{{PROJECT_NAME}} - A simple chatbot agent"

trigger:
  type: http
  method: POST
  path: /{{PROJECT_NAME_KEBAB}}

secrets:
  - name: OPENAI_API_KEY
    type: env
    value: OPENAI_API_KEY

vars:
  message:
    type: input
    from: body
    required: true

  user_id:
    type: input
    from: headers
    required: false
    default: "anonymous"

steps:
  - id: chat_response
    kind: llm
    provider: openai
    model: gpt-4o
    prompt: |
      You are a helpful assistant for {{PROJECT_NAME}}.
      
      User message: {message}
      
      Please provide a helpful and friendly response.
    save: response

outputs:
  response: "{response}"
  user_id: "{user_id}"
@end`
        },
        {
          path: 'README.md',
          content: `# {{PROJECT_NAME}}

A simple chatbot built with AAABuilder.

## Setup

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Copy environment variables:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

3. Add your OpenAI API key to \`.env\`:
   \`\`\`
   OPENAI_API_KEY=your_api_key_here
   \`\`\`

4. Start the server:
   \`\`\`bash
   npm start
   \`\`\`

## Usage

Send a POST request to \`http://localhost:5000/{{PROJECT_NAME_KEBAB}}\`:

\`\`\`bash
curl -X POST http://localhost:5000/{{PROJECT_NAME_KEBAB}} \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello, how are you?"}'
\`\`\`

## Development

- \`npm run dev\` - Start development server with hot reload
- \`npm run test\` - Run tests
- \`npm run playground\` - Open interactive playground

## Project Structure

- \`agents/\` - Agent definition files
- \`tests/\` - Test files
- \`.env\` - Environment variables
- \`package.json\` - Project configuration

Created with AAABuilder on {{CURRENT_DATE}}.`
        },
        {
          path: 'tests/{{PROJECT_NAME_KEBAB}}.test.ts',
          content: `import { AgentTester } from 'aaab/testing';
import * as fs from 'fs';
import * as path from 'path';

describe('{{PROJECT_NAME}} Agent', () => {
  let tester: AgentTester;
  let agentContent: string;

  beforeAll(async () => {
    // Load agent file
    const agentPath = path.join(__dirname, '../agents/{{PROJECT_NAME_KEBAB}}.agent');
    agentContent = await fs.promises.readFile(agentPath, 'utf-8');
    
    // Initialize tester
    tester = new AgentTester();
    
    // Setup mock OpenAI responses
    tester.setupMockProvider('gpt-4o', {
      content: 'Hello! I\\'m a helpful assistant. How can I help you today?'
    });
  });

  afterEach(() => {
    tester.clearMockProvider();
  });

  test('should respond to basic message', async () => {
    const testCase = {
      name: 'Basic chat test',
      input: {
        message: 'Hello, how are you?'
      }
    };

    const result = await tester.runTestCase(agentContent, testCase);
    
    expect(result.passed).toBe(true);
    expect(result.output?.response).toBeDefined();
    expect(result.output?.user_id).toBe('anonymous');
  });

  test('should handle user identification', async () => {
    const testCase = {
      name: 'User ID test',
      input: {
        message: 'Hello',
        user_id: 'user123'
      }
    };

    const result = await tester.runTestCase(agentContent, testCase);
    
    expect(result.passed).toBe(true);
    expect(result.output?.user_id).toBe('user123');
  });

  test('should fail with missing message', async () => {
    const testCase = {
      name: 'Missing message test',
      input: {},
      shouldFail: true
    };

    const result = await tester.runTestCase(agentContent, testCase);
    
    expect(result.passed).toBe(false);
  });
});`
        },
        {
          path: '.gitignore',
          content: `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
dist/
build/
*.tsbuildinfo

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
node_modules/
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db`
        }
      ],
      dependencies: [
        'aaab@latest',
        'dotenv@^16.0.0'
      ],
      scripts: {
        'start': 'aaab serve --port 5000',
        'dev': 'aaab serve --port 5000 --watch',
        'test': 'jest',
        'playground': 'aaab playground'
      },
      envVars: [
        'OPENAI_API_KEY',
        'PORT'
      ],
      instructions: [
        'cd {{PROJECT_NAME_KEBAB}}',
        'npm install',
        'cp .env.example .env',
        'Add your OpenAI API key to .env',
        'npm start'
      ]
    });

    // Advanced Multi-Modal Agent Template
    this.registerTemplate({
      name: 'multimodal-agent',
      description: 'Advanced agent with vision, audio, and text capabilities',
      category: 'advanced',
      files: [
        {
          path: 'agents/{{PROJECT_NAME_KEBAB}}.agent',
          content: `@agent {{PROJECT_NAME_KEBAB}} v1
description: "{{PROJECT_NAME}} - Multi-modal AI agent with vision, audio, and text processing"

trigger:
  type: http
  method: POST
  path: /{{PROJECT_NAME_KEBAB}}

secrets:
  - name: OPENAI_API_KEY
    type: env
    value: OPENAI_API_KEY

vars:
  input_type:
    type: input
    from: body
    required: true

  text_input:
    type: input
    from: body
    required: false

  image_url:
    type: input
    from: body
    required: false

  audio_file:
    type: input
    from: files
    required: false

steps:
  - id: process_text
    kind: llm
    provider: openai
    model: gpt-4o
    prompt: "Process this text: {text_input}"
    when: "{input_type} == 'text'"
    save: text_result

  - id: process_image
    kind: vision
    provider: openai
    model: gpt-4o-vision
    input: "{image_url}"
    prompt: "Analyze this image and describe what you see"
    when: "{input_type} == 'image'"
    save: vision_result

  - id: process_audio
    kind: asr
    provider: openai
    model: whisper-1
    input: "{audio_file}"
    when: "{input_type} == 'audio'"
    save: audio_result

  - id: generate_summary
    kind: llm
    provider: openai
    model: gpt-4o
    prompt: |
      Create a summary based on the processed input:
      
      Text result: {text_result}
      Vision result: {vision_result}
      Audio result: {audio_result}
      
      Provide a comprehensive summary of the analysis.
    save: final_summary

outputs:
  summary: "{final_summary}"
  input_type: "{input_type}"
  text_result: "{text_result}"
  vision_result: "{vision_result}"
  audio_result: "{audio_result}"
@end`
        },
        {
          path: 'README.md',
          content: `# {{PROJECT_NAME}}

An advanced multi-modal AI agent built with AAABuilder that can process text, images, and audio.

## Features

- **Text Processing** - Natural language understanding and generation
- **Image Analysis** - Computer vision and image description
- **Audio Processing** - Speech-to-text transcription
- **Multi-modal Integration** - Combine insights from different input types

## Setup

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Copy environment variables:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

3. Configure your API keys in \`.env\`:
   \`\`\`
   OPENAI_API_KEY=your_openai_key
   \`\`\`

4. Start the server:
   \`\`\`bash
   npm start
   \`\`\`

## Usage

### Text Processing

\`\`\`bash
curl -X POST http://localhost:5000/{{PROJECT_NAME_KEBAB}} \\
  -H "Content-Type: application/json" \\
  -d '{
    "input_type": "text",
    "text_input": "Analyze the sentiment of this message"
  }'
\`\`\`

### Image Analysis

\`\`\`bash
curl -X POST http://localhost:5000/{{PROJECT_NAME_KEBAB}} \\
  -H "Content-Type: application/json" \\
  -d '{
    "input_type": "image",
    "image_url": "https://example.com/image.jpg"
  }'
\`\`\`

### Audio Processing

\`\`\`bash
curl -X POST http://localhost:5000/{{PROJECT_NAME_KEBAB}} \\
  -F "input_type=audio" \\
  -F "audio_file=@audio.mp3"
\`\`\`

## Development

- \`npm run dev\` - Development server with hot reload
- \`npm run test\` - Run test suite
- \`npm run playground\` - Interactive development
- \`npm run debug\` - Debug mode with step-by-step execution

## Architecture

The agent uses a conditional workflow based on input type:

1. **Input Detection** - Determines the type of input (text/image/audio)
2. **Specialized Processing** - Routes to appropriate AI model
3. **Result Integration** - Combines results into comprehensive summary
4. **Output Generation** - Returns structured response

## Testing

Run the test suite:

\`\`\`bash
npm test
\`\`\`

Generate additional test cases:

\`\`\`bash
npm run test:generate
\`\`\`

## Deployment

Deploy to various platforms:

\`\`\`bash
# Docker
npm run docker:build
npm run docker:run

# Serverless
npm run deploy:lambda
npm run deploy:vercel
\`\`\`

Created with AAABuilder on {{CURRENT_DATE}}.`
        },
        {
          path: 'tests/multimodal.test.ts',
          content: `import { AgentTester, TestSuite } from 'aaab/testing';
import * as fs from 'fs';
import * as path from 'path';

describe('{{PROJECT_NAME}} Multi-modal Agent', () => {
  let tester: AgentTester;
  let agentContent: string;

  beforeAll(async () => {
    const agentPath = path.join(__dirname, '../agents/{{PROJECT_NAME_KEBAB}}.agent');
    agentContent = await fs.promises.readFile(agentPath, 'utf-8');
    tester = new AgentTester();

    // Setup mock responses
    tester.setupMockProvider('gpt-4o', {
      content: 'Text processing complete'
    });
    
    tester.setupMockProvider('gpt-4o-vision', {
      content: 'Image analysis: I can see a beautiful landscape'
    });
    
    tester.setupMockProvider('whisper-1', {
      transcription: 'Hello, this is a test audio message'
    });
  });

  afterEach(() => {
    tester.clearMockProvider();
  });

  const testSuite: TestSuite = {
    name: 'Multi-modal Processing Tests',
    description: 'Test all input modalities',
    agentContent,
    testCases: [
      {
        name: 'Text input processing',
        input: {
          input_type: 'text',
          text_input: 'Analyze this text message'
        },
        expectedSteps: ['process_text', 'generate_summary'],
        tags: ['text', 'basic']
      },
      {
        name: 'Image input processing',
        input: {
          input_type: 'image',
          image_url: 'https://example.com/test.jpg'
        },
        expectedSteps: ['process_image', 'generate_summary'],
        tags: ['vision', 'basic']
      },
      {
        name: 'Audio input processing',
        input: {
          input_type: 'audio',
          audio_file: 'mock_audio_data'
        },
        expectedSteps: ['process_audio', 'generate_summary'],
        tags: ['audio', 'basic']
      },
      {
        name: 'Invalid input type',
        input: {
          input_type: 'invalid'
        },
        shouldFail: true,
        tags: ['validation', 'error']
      }
    ]
  };

  test('should run complete test suite', async () => {
    const result = await tester.runTestSuite(testSuite);
    
    expect(result.passed).toBe(true);
    expect(result.summary.passed).toBeGreaterThan(0);
    expect(result.summary.failed).toBe(0);
  });

  test('should handle conditional execution', async () => {
    const textResult = await tester.runTestCase(agentContent, {
      name: 'Text conditional test',
      input: { input_type: 'text', text_input: 'test' }
    });

    expect(textResult.passed).toBe(true);
    expect(textResult.stepResults?.some(s => s.stepId === 'process_text')).toBe(true);
    expect(textResult.stepResults?.some(s => s.stepId === 'process_image')).toBe(false);
  });
});`
        },
        {
          path: 'docker/Dockerfile',
          content: `FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Build if needed
RUN npm run build || true

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:5000/health || exit 1

# Start application
CMD ["npm", "start"]`
        },
        {
          path: 'docker/docker-compose.yml',
          content: `version: '3.8'

services:
  {{PROJECT_NAME_KEBAB}}:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
    env_file:
      - ../.env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  redis_data:`
        }
      ],
      dependencies: [
        'aaab@latest',
        'dotenv@^16.0.0',
        'multer@^1.4.5',
        'redis@^4.0.0'
      ],
      scripts: {
        'start': 'aaab serve --port 5000',
        'dev': 'aaab serve --port 5000 --watch',
        'build': 'aaab build',
        'test': 'jest',
        'test:generate': 'aaab test generate',
        'playground': 'aaab playground',
        'debug': 'aaab debug',
        'docker:build': 'docker build -f docker/Dockerfile -t {{PROJECT_NAME_KEBAB}} .',
        'docker:run': 'docker-compose -f docker/docker-compose.yml up',
        'deploy:lambda': 'aaab deploy lambda',
        'deploy:vercel': 'aaab deploy vercel'
      },
      envVars: [
        'OPENAI_API_KEY',
        'PORT',
        'NODE_ENV',
        'REDIS_URL'
      ],
      instructions: [
        'cd {{PROJECT_NAME_KEBAB}}',
        'npm install',
        'cp .env.example .env',
        'Configure your API keys in .env',
        'npm run dev to start development',
        'npm test to run tests',
        'npm run playground for interactive development'
      ]
    });

    // Data Processing Pipeline Template
    this.registerTemplate({
      name: 'data-pipeline',
      description: 'Data processing pipeline with ML integration',
      category: 'specialized',
      files: [
        {
          path: 'agents/data-processor.agent',
          content: `@agent data-processor v1
description: "{{PROJECT_NAME}} - Data processing pipeline with ML capabilities"

trigger:
  type: http
  method: POST
  path: /process-data

vars:
  data_source:
    type: input
    from: body
    required: true

  processing_type:
    type: input
    from: body
    required: true

  output_format:
    type: input
    from: body
    required: false
    default: "json"

steps:
  - id: validate_data
    kind: function
    operation: validate_data_source
    input: "{data_source}"
    save: validation_result

  - id: extract_data
    kind: function
    operation: extract
    input: "{data_source}"
    when: "{validation_result.valid}"
    save: raw_data

  - id: clean_data
    kind: function
    operation: clean
    input: "{raw_data}"
    save: clean_data

  - id: analyze_data
    kind: ml
    provider: scikit-learn
    model: random-forest-classifier
    input: "{clean_data}"
    when: "{processing_type} == 'classification'"
    save: ml_results

  - id: generate_insights
    kind: llm
    provider: openai
    model: gpt-4o
    prompt: |
      Analyze this data processing result:
      
      Data: {clean_data}
      ML Results: {ml_results}
      
      Provide insights and recommendations.
    save: insights

  - id: format_output
    kind: function
    operation: format_output
    input: |
      {
        "data": "{clean_data}",
        "results": "{ml_results}",
        "insights": "{insights}",
        "format": "{output_format}"
      }
    save: formatted_output

outputs:
  result: "{formatted_output}"
  processing_type: "{processing_type}"
  record_count: "{clean_data.length}"
@end`
        },
        {
          path: 'README.md',
          content: `# {{PROJECT_NAME}}

A data processing pipeline built with AAABuilder that combines traditional data processing with modern AI/ML capabilities.

## Features

- **Data Validation** - Comprehensive input validation
- **Data Extraction** - Support for multiple data sources
- **Data Cleaning** - Automated data cleaning and preprocessing
- **ML Integration** - Built-in machine learning models
- **AI Insights** - LLM-powered data analysis and recommendations
- **Flexible Output** - Multiple output formats

## Supported Data Sources

- CSV files
- JSON data
- Database connections
- API endpoints
- File uploads

## Processing Types

- **Classification** - Categorize data using ML models
- **Regression** - Predict numerical values
- **Clustering** - Group similar data points
- **Analysis** - Generate insights and recommendations

## Quick Start

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Configure environment:
   \`\`\`bash
   cp .env.example .env
   # Add your API keys
   \`\`\`

3. Start the pipeline:
   \`\`\`bash
   npm start
   \`\`\`

## Usage Examples

### Process CSV Data

\`\`\`bash
curl -X POST http://localhost:5000/process-data \\
  -H "Content-Type: application/json" \\
  -d '{
    "data_source": "data/sample.csv",
    "processing_type": "classification",
    "output_format": "json"
  }'
\`\`\`

### Analyze JSON Data

\`\`\`bash
curl -X POST http://localhost:5000/process-data \\
  -H "Content-Type: application/json" \\
  -d '{
    "data_source": {"records": [...]},
    "processing_type": "analysis",
    "output_format": "report"
  }'
\`\`\`

Created with AAABuilder on {{CURRENT_DATE}}.`
        }
      ],
      dependencies: [
        'aaab@latest',
        'dotenv@^16.0.0',
        'csv-parser@^3.0.0',
        'pandas-js@^0.2.4'
      ],
      scripts: {
        'start': 'aaab serve --port 5000',
        'dev': 'aaab serve --port 5000 --watch',
        'test': 'jest',
        'process': 'aaab run data-processor'
      },
      envVars: [
        'OPENAI_API_KEY',
        'DATABASE_URL',
        'PORT'
      ],
      instructions: [
        'cd {{PROJECT_NAME_KEBAB}}',
        'npm install',
        'cp .env.example .env',
        'Configure your database and API keys',
        'Place your data files in the data/ directory',
        'npm start'
      ]
    });
  }

  // Helper methods for string transformations
  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  private toPascalCase(str: string): string {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
      .replace(/[\s-_]+/g, '');
  }

  private toSnakeCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[\s-]+/g, '_')
      .toLowerCase();
  }

  private processTemplate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      return variables[key] || match;
    });
  }

  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  private async createPackageJson(
    outputDir: string, 
    template: ProjectTemplate, 
    variables: Record<string, string>
  ): Promise<void> {
    const packageJson = {
      name: variables['PROJECT_NAME_KEBAB'],
      version: '1.0.0',
      description: template.description,
      main: 'index.js',
      scripts: template.scripts || {},
      dependencies: {} as Record<string, string>,
      devDependencies: {
        '@types/node': '^20.0.0',
        'typescript': '^5.0.0',
        'jest': '^29.0.0',
        '@types/jest': '^29.0.0'
      },
      keywords: ['aaab', 'ai', 'agent', 'automation'],
      author: '',
      license: 'MIT'
    };

    // Add dependencies
    if (template.dependencies) {
      for (const dep of template.dependencies) {
        const [name, version] = dep.split('@');
        if (name) {
          packageJson.dependencies[name] = version || 'latest';
        }
      }
    }

    const packagePath = path.join(outputDir, 'package.json');
    await fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2), 'utf-8');
    console.log('   Created: package.json');
  }

  private async createEnvExample(outputDir: string, envVars: string[]): Promise<void> {
    const envContent = envVars.map(varName => {
      const examples: Record<string, string> = {
        'OPENAI_API_KEY': 'sk-your-openai-api-key-here',
        'ANTHROPIC_API_KEY': 'your-anthropic-api-key-here',
        'GEMINI_API_KEY': 'your-gemini-api-key-here',
        'DATABASE_URL': 'postgresql://user:password@localhost:5432/database',
        'REDIS_URL': 'redis://localhost:6379',
        'PORT': '5000',
        'NODE_ENV': 'development'
      };
      
      const example = examples[varName] || 'your-value-here';
      return `${varName}=${example}`;
    }).join('\n');

    const envPath = path.join(outputDir, '.env.example');
    await fs.writeFile(envPath, envContent, 'utf-8');
    console.log('   Created: .env.example');
  }

  private async initGitRepository(outputDir: string): Promise<void> {
    try {
      const { spawn } = await import('child_process');
      
      await new Promise<void>((resolve, reject) => {
        const git = spawn('git', ['init'], { cwd: outputDir });
        git.on('close', (code) => {
          if (code === 0) {
            console.log('   Initialized git repository');
            resolve();
          } else {
            reject(new Error(`Git init failed with code ${code}`));
          }
        });
      });
    } catch (error) {
      console.warn('   Warning: Could not initialize git repository');
    }
  }

  private async installDependencies(outputDir: string): Promise<void> {
    try {
      console.log('   Installing dependencies...');
      const { spawn } = await import('child_process');
      
      await new Promise<void>((resolve, reject) => {
        const npm = spawn('npm', ['install'], { 
          cwd: outputDir,
          stdio: 'inherit'
        });
        
        npm.on('close', (code) => {
          if (code === 0) {
            console.log('   Dependencies installed successfully');
            resolve();
          } else {
            reject(new Error(`npm install failed with code ${code}`));
          }
        });
      });
    } catch (error) {
      console.warn('   Warning: Could not install dependencies automatically');
      console.warn('   Please run "npm install" manually in the project directory');
    }
  }
}