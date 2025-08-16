#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

const parser = require('../lib/parser/parser');
const validator = require('../lib/validate/validator');
const linter = require('../lib/validate/linter');
const corrector = require('../lib/validate/corrector');
const orchestrator = require('../lib/core/orchestrator');
const logger = require('../lib/diagnostics/logger');
const console = require('../lib/utils/console');
const list = require('../lib/cli/list');
const explain = require('../lib/cli/explain');
const doctor = require('../lib/cli/doctor');

const program = new Command();

program
  .name('aaab')
  .description('Agent as a Backend - AI agent workflow executor')
  .version('1.0.0');

program
  .command('run')
  .description('Execute an .agent file')
  .argument('<file>', '.agent file to execute')
  .option('--input <json>', 'Input data as JSON string', '{}')
  .option('--stream', 'Stream provider output when supported')
  .option('--temperature <num>', 'Sampling temperature', parseFloat)
  .option('--top-p <num>', 'Top-p nucleus sampling', parseFloat)
  .option('--top-k <num>', 'Top-k sampling (for some local models)', parseInt)
  .option('--max-tokens <num>', 'Max tokens to generate', parseInt)
  .option('--debug', 'Enable debug output')
  .action(async (file, options) => {
    try {
      if (options.debug) {
        logger.setLevel('debug');
      }

      logger.info(`Running agent file: ${file}`);
      
      if (!fs.existsSync(file)) {
        logger.error(`File not found: ${file}`);
        process.exit(1);
      }

      const content = fs.readFileSync(file, 'utf8');
      const ast = parser.parse(content);
      
      // Validate the agent
      try {
        await validator.validate(ast);
      } catch (error) {
        logger.warn(`Validation warnings: ${error.message}`);
        // Continue execution even with validation warnings
      }

      const input = JSON.parse(options.input);

      // Execution options forwarded to providers via context
      const execOptions = {
        stream: Boolean(options.stream),
        temperature: options.temperature,
        topP: options.topP,
        topK: options.topK,
        maxTokens: options.maxTokens,
      };

      if (execOptions.stream) {
        execOptions.onStreamChunk = (chunk) => {
          process.stdout.write(chunk);
        };
      }

      const result = await orchestrator.execute(ast, input, execOptions);
      
      logger.info(chalk.green('Execution completed successfully'));
      if (result) {
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error) {
      logger.error(`Execution failed: ${error.message}`);
      if (options.debug) {
        logger.debug(error.stack);
      }
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate an .agent file')
  .argument('<file>', '.agent file to validate')
  .action((file) => {
    try {
      logger.info(`Validating: ${file}`);
      
      if (!fs.existsSync(file)) {
        logger.error(`File not found: ${file}`);
        process.exit(1);
      }

      const content = fs.readFileSync(file, 'utf8');
      const ast = parser.parse(content);
      const result = validator.validate(ast);

      if (result.valid) {
        logger.info(chalk.green('✓ Validation passed'));
      } else {
        logger.error('Validation failed:');
        result.errors.forEach(error => logger.error(`  ${error}`));
        process.exit(1);
      }
    } catch (error) {
      logger.error(`Validation error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('lint')
  .description('Lint an .agent file for best practices')
  .argument('<file>', '.agent file to lint')
  .action((file) => {
    try {
      logger.info(`Linting: ${file}`);
      
      if (!fs.existsSync(file)) {
        logger.error(`File not found: ${file}`);
        process.exit(1);
      }

      const content = fs.readFileSync(file, 'utf8');
      const ast = parser.parse(content);
      const issues = linter.lint(ast);

      if (issues.length === 0) {
        logger.info(chalk.green('✓ No linting issues found'));
      } else {
        logger.warn(`Found ${issues.length} linting issue(s):`);
        issues.forEach(issue => {
          logger.warn(`  ${issue.severity}: ${issue.message} (${issue.rule})`);
        });
      }
    } catch (error) {
      logger.error(`Linting error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('fix')
  .description('Auto-fix common issues in an .agent file')
  .argument('<file>', '.agent file to fix')
  .option('--output <file>', 'Output file (default: <input>.fixed.agent)')
  .action((file, options) => {
    try {
      logger.info(`Fixing: ${file}`);
      
      if (!fs.existsSync(file)) {
        logger.error(`File not found: ${file}`);
        process.exit(1);
      }

      const content = fs.readFileSync(file, 'utf8');
      const ast = parser.parse(content);
      const fixed = corrector.correct(ast);
      
      const outputFile = options.output || file.replace(/\.agent$/, '.fixed.agent');
      const fixedContent = corrector.serialize(fixed.ast);
      
      fs.writeFileSync(outputFile, fixedContent);
      
      logger.info(chalk.green(`✓ Fixed file written to: ${outputFile}`));
      if (fixed.changes.length > 0) {
        logger.info('Applied fixes:');
        fixed.changes.forEach(change => logger.info(`  ${change}`));
      }
    } catch (error) {
      logger.error(`Fix error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('new')
  .description('Create a new .agent file from template')
  .argument('<name>', 'Name for the new agent')
  .option('--template <type>', 'Template type (basic, llm, http)', 'basic')
  .action((name, options) => {
    try {
      const filename = `${name}.agent`;
      
      if (fs.existsSync(filename)) {
        logger.error(`File already exists: ${filename}`);
        process.exit(1);
      }

      let template;
      switch (options.template) {
        case 'llm':
          template = `@agent ${name} v1
trigger http POST /${name}
secret OPENAI=env:OPENAI_KEY
var name = input.name

step generate:
  kind llm
  model gpt-4o
  provider openai
  prompt """
    Hello {name}, provide a helpful response.
  """
  save result

output result
@end`;
          break;
        case 'http':
          template = `@agent ${name} v1
trigger http POST /${name}
var url = input.url

step fetch:
  kind http
  action GET
  url {url}
  headers {"Content-Type":"application/json"}
  save response

output response
@end`;
          break;
        default:
          template = `@agent ${name} v1
trigger http POST /${name}
var message = input.message

step process:
  kind llm
  model gpt-4o
  provider openai
  prompt """
    Process this message: {message}
  """
  save result

output result
@end`;
      }

      fs.writeFileSync(filename, template);
      logger.info(chalk.green(`✓ Created new agent: ${filename}`));
    } catch (error) {
      logger.error(`Create error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all .agent files in current directory')
  .option('--recursive', 'Search recursively')
  .action((options) => {
    try {
      const files = list.findAgentFiles('.', options.recursive);
      
      if (files.length === 0) {
        logger.info('No .agent files found');
      } else {
        logger.info(`Found ${files.length} .agent file(s):`);
        files.forEach(file => console.log(`  ${file}`));
      }
    } catch (error) {
      logger.error(`List error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('explain')
  .description('Explain an .agent file in human-readable format')
  .argument('<file>', '.agent file to explain')
  .action((file) => {
    try {
      if (!fs.existsSync(file)) {
        logger.error(`File not found: ${file}`);
        process.exit(1);
      }

      const content = fs.readFileSync(file, 'utf8');
      const ast = parser.parse(content);
      const explanation = explain.explainAgent(ast);
      
      console.log(explanation);
    } catch (error) {
      logger.error(`Explain error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('doctor')
  .description('Check environment and dependencies')
  .action(() => {
    try {
      const results = doctor.checkEnvironment();
      doctor.printResults(results);
      
      const hasErrors = results.some(result => !result.status);
      if (hasErrors) {
        process.exit(1);
      }
    } catch (error) {
      logger.error(`Doctor error: ${error.message}`);
      process.exit(1);
    }
  });

// Enhanced AI/ML Model Management Commands
program
  .command('models')
  .description('Manage AI/ML models')
  .option('--list', 'List all available models')
  .option('--type <type>', 'Filter by model type (LLM, Vision, ASR, TTS, etc.)')
  .option('--provider <provider>', 'Filter by provider (openai, anthropic, ollama, etc.)')
  .option('--capability <capability>', 'Filter by capability (text-generation, image-classification, etc.)')
  .option('--search <query>', 'Search models by name or description')
  .option('--recommend <task>', 'Get model recommendations for a specific task')
  .action(async (options) => {
    try {
      const ModelManager = require('../src/core/ModelManager').ModelManager;
      const modelManager = ModelManager.getInstance();
      
      if (options.list) {
        const stats = modelManager.getModelStatistics();
        console.header('AI/ML Model Statistics');
        console.info(`Total Models: ${stats.total}`);
        
        Object.entries(stats.byType).forEach(([type, count]) => {
          console.info(`${type}: ${count} models`);
        });
        
        console.endSection();
      } else if (options.recommend) {
        const recommendations = modelManager.getRecommendedModels(options.recommend);
        console.header(`Model Recommendations for: ${options.recommend}`);
        recommendations.forEach((model, index) => {
          console.info(`${index + 1}. ${model.name} (${model.provider})`);
          console.info(`   Type: ${model.type}`);
          console.info(`   Capabilities: ${model.capabilities.join(', ')}`);
          console.info(`   Size: ${Math.round((model.metadata.size || 0) / 1000000)}MB`);
        });
        console.endSection();
      } else {
        let models = Array.from(modelManager['models'].values());
        
        if (options.type) {
          models = models.filter(m => m.type === options.type);
        }
        if (options.provider) {
          models = models.filter(m => m.provider === options.provider);
        }
        if (options.capability) {
          models = models.filter(m => m.capabilities.includes(options.capability));
        }
        if (options.search) {
          const query = options.search.toLowerCase();
          models = models.filter(m => 
            m.name.toLowerCase().includes(query) || 
            m.metadata.description?.toLowerCase().includes(query)
          );
        }
        
        console.header('Available AI/ML Models');
        models.forEach(model => {
          console.info(`${model.name} (${model.id})`);
          console.info(`  Provider: ${model.provider}`);
          console.info(`  Type: ${model.type}`);
          console.info(`  Capabilities: ${model.capabilities.join(', ')}`);
        });
        console.endSection();
      }
    } catch (error) {
      console.error(`Models command error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('fine-tune')
  .description('Manage model fine-tuning')
  .option('--create <modelId>', 'Create a new fine-tuning job')
  .option('--list', 'List all fine-tuning jobs')
  .option('--status <jobId>', 'Get status of a fine-tuning job')
  .option('--cancel <jobId>', 'Cancel a fine-tuning job')
  .option('--data <file>', 'Training data file (JSONL, CSV, JSON)')
  .option('--hyperparameters <json>', 'Hyperparameters as JSON string')
  .option('--provider <provider>', 'Fine-tuning provider (openai, huggingface)', 'openai')
  .action(async (options) => {
    try {
      const FineTuneProvider = require('../lib/providers/finetune');
      
      console.header('Model Fine-tuning Management');
      
      const provider = new FineTuneProvider(options.provider);
      
      // Initialize provider
      const apiKey = process.env[`${options.provider.toUpperCase()}_API_KEY`];
      if (!apiKey) {
        console.error(`No API key found for ${options.provider}. Set ${options.provider.toUpperCase()}_API_KEY environment variable.`);
        process.exit(1);
      }
      
      await provider.initialize({ apiKey });
      
      if (options.create) {
        console.info(`Creating fine-tuning job for model: ${options.create}`);
        
        if (!options.data) {
          console.error('Training data file is required. Use --data <file>');
          process.exit(1);
        }
        
        const config = {
          model: options.create,
          trainingFile: options.data,
          hyperparameters: options.hyperparameters ? JSON.parse(options.hyperparameters) : {}
        };
        
        const job = await provider.createFineTuneJob(config);
        console.success('Fine-tuning job created successfully');
        console.json(job, 'Job Details');
        
      } else if (options.list) {
        console.info('Listing fine-tuning jobs...');
        const jobs = await provider.listFineTuneJobs();
        
        if (jobs.length === 0) {
          console.info('No fine-tuning jobs found');
        } else {
          console.table(['ID', 'Status', 'Model', 'Created'], 
            jobs.map(job => [
              job.id,
              job.status,
              job.model,
              job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'N/A'
            ])
          );
        }
        
      } else if (options.status) {
        console.info(`Getting status for job: ${options.status}`);
        const status = await provider.getFineTuneStatus(options.status);
        console.json(status, 'Job Status');
        
      } else if (options.cancel) {
        console.info(`Cancelling job: ${options.cancel}`);
        const result = await provider.cancelFineTuneJob(options.cancel);
        console.success('Job cancelled successfully');
        console.json(result, 'Cancellation Result');
        
      } else if (options.data) {
        console.info(`Validating training data: ${options.data}`);
        const format = path.extname(options.data).substring(1);
        const validation = provider.validateTrainingData(options.data, format);
        
        if (validation.valid) {
          console.success('Training data is valid');
          console.info(`Total lines: ${validation.totalLines}`);
          console.info(`Valid lines: ${validation.validLines}`);
        } else {
          console.error('Training data validation failed');
          validation.errors.forEach(error => console.error(`  ${error}`));
          process.exit(1);
        }
        
      } else {
        console.info('Use --help to see available options');
      }
      
      console.endSection();
    } catch (error) {
      console.error(`Fine-tuning error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('vision')
  .description('Computer vision operations')
  .option('--classify <image>', 'Classify image')
  .option('--detect <image>', 'Detect objects in image')
  .option('--ocr <image>', 'Extract text from image')
  .option('--caption <image>', 'Generate image caption')
  .option('--model <modelId>', 'Specify vision model to use')
  .option('--provider <provider>', 'Vision provider (openai, huggingface)', 'openai')
  .action(async (options) => {
    try {
      const visionProvider = require('../lib/providers/vision');
      
      console.header('Computer Vision Operations');
      
      if (!options.classify && !options.detect && !options.ocr && !options.caption) {
        console.error('Please specify an operation: --classify, --detect, --ocr, or --caption');
        process.exit(1);
      }
      
      const imagePath = options.classify || options.detect || options.ocr || options.caption;
      const model = options.model || (options.provider === 'openai' ? 'gpt-4o-vision' : 'microsoft/DialoGPT-large');
      
      // Check if image file exists
      if (!fs.existsSync(imagePath)) {
        console.error(`Image file not found: ${imagePath}`);
        process.exit(1);
      }
      
      if (options.classify) {
        console.info(`Classifying image: ${imagePath}`);
        const result = await visionProvider.operations.classify(model, imagePath);
        console.success('Classification completed');
        console.json(result, 'Classification Result');
        
      } else if (options.detect) {
        console.info(`Detecting objects in: ${imagePath}`);
        const result = await visionProvider.operations.analyze(model, imagePath);
        console.success('Object detection completed');
        console.json(result, 'Detection Result');
        
      } else if (options.ocr) {
        console.info(`Extracting text from: ${imagePath}`);
        const result = await visionProvider.operations.analyze(model, imagePath);
        console.success('OCR completed');
        console.json(result, 'OCR Result');
        
      } else if (options.caption) {
        console.info(`Generating caption for: ${imagePath}`);
        const result = await visionProvider.operations.caption(model, imagePath);
        console.success('Caption generation completed');
        console.json(result, 'Caption Result');
      }
      
      console.endSection();
    } catch (error) {
      console.error(`Vision error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('audio')
  .description('Audio processing operations')
  .option('--stt <audio>', 'Speech to text conversion')
  .option('--tts <text>', 'Text to speech conversion')
  .option('--voice <voice>', 'Specify voice for TTS')
  .option('--model <modelId>', 'Specify audio model to use')
  .option('--output <file>', 'Output file for TTS')
  .action(async (options) => {
    try {
      const audioProvider = require('../lib/providers/audio');
      
      console.header('Audio Processing Operations');
      
      if (!options.stt && !options.tts) {
        console.error('Please specify an operation: --stt or --tts');
        process.exit(1);
      }
      
      if (options.stt) {
        console.info(`Converting speech to text: ${options.stt}`);
        
        if (!fs.existsSync(options.stt)) {
          console.error(`Audio file not found: ${options.stt}`);
          process.exit(1);
        }
        
        const result = await audioProvider.operations.stt(options.stt, {
          model: options.model || 'whisper-1'
        });
        
        console.success('Speech-to-text completed');
        console.json(result, 'Transcription Result');
        
      } else if (options.tts) {
        console.info(`Converting text to speech: "${options.tts}"`);
        
        const result = await audioProvider.operations.tts(options.tts, {
          model: options.model || 'tts-1',
          voice: options.voice || 'alloy',
          outputPath: options.output
        });
        
        console.success('Text-to-speech completed');
        console.json(result, 'TTS Result');
        console.info(`Audio saved to: ${result.outputPath}`);
      }
      
      console.endSection();
    } catch (error) {
      console.error(`Audio error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('ml')
  .description('Machine learning operations')
  .option('--train <config>', 'Train a new ML model')
  .option('--predict <model> <data>', 'Make predictions with trained model')
  .option('--evaluate <model> <data>', 'Evaluate model performance')
  .option('--export <model> <format>', 'Export model to format (onnx, tensorflow, etc.)')
  .action(async (options) => {
    try {
      console.header('Machine Learning Operations');
      
      if (options.train) {
        console.info(`Training ML model with config: ${options.train}`);
        
        if (!fs.existsSync(options.train)) {
          console.error(`Config file not found: ${options.train}`);
          process.exit(1);
        }
        
        const config = JSON.parse(fs.readFileSync(options.train, 'utf8'));
        console.info('Training configuration loaded');
        console.json(config, 'Training Config');
        
        // This would integrate with actual ML training frameworks
        console.warn('ML training requires integration with frameworks like TensorFlow, PyTorch, or scikit-learn');
        console.info('Consider using the fine-tuning command for model customization instead');
        
      } else if (options.predict) {
        const [model, data] = options.predict.split(' ');
        console.info(`Making predictions with model: ${model}`);
        
        if (!fs.existsSync(data)) {
          console.error(`Data file not found: ${data}`);
          process.exit(1);
        }
        
        console.warn('ML prediction requires integration with trained model files');
        console.info('Consider using the LLM providers for text-based predictions');
        
      } else if (options.evaluate) {
        const [model, data] = options.evaluate.split(' ');
        console.info(`Evaluating model: ${model}`);
        
        if (!fs.existsSync(data)) {
          console.error(`Data file not found: ${data}`);
          process.exit(1);
        }
        
        console.warn('ML evaluation requires integration with trained model files');
        
      } else if (options.export) {
        const [model, format] = options.export.split(' ');
        console.info(`Exporting model ${model} to ${format} format`);
        
        console.warn('ML export requires integration with trained model files');
        console.info('Supported formats: ONNX, TensorFlow SavedModel, PyTorch, scikit-learn pickle');
        
      } else {
        console.info('Use --help to see available options');
        console.info('Note: Full ML operations require integration with ML frameworks');
        console.info('For AI model operations, use: fine-tune, vision, audio commands');
      }
      
      console.endSection();
    } catch (error) {
      console.error(`ML error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('vector-db')
  .description('Vector database operations')
  .option('--create <name>', 'Create new vector database')
  .option('--list', 'List all vector databases')
  .option('--add <db> <collection> <data>', 'Add documents to collection')
  .option('--search <db> <collection> <query>', 'Search in collection')
  .option('--delete <db> <collection>', 'Delete collection')
  .option('--backend <backend>', 'Vector DB backend (pinecone, weaviate, qdrant)', 'pinecone')
  .action(async (options) => {
    try {
      const VectorDBProvider = require('../lib/providers/vectordb');
      
      console.header('Vector Database Operations');
      
      if (!options.create && !options.list && !options.add && !options.search && !options.delete) {
        console.error('Please specify an operation: --create, --list, --add, --search, or --delete');
        process.exit(1);
      }
      
      const backend = options.backend;
      const apiKey = process.env[`${backend.toUpperCase()}_API_KEY`];
      
      if (!apiKey) {
        console.error(`No API key found for ${backend}. Set ${backend.toUpperCase()}_API_KEY environment variable.`);
        process.exit(1);
      }
      
      const vectorDB = new VectorDBProvider(backend);
      
      try {
        await vectorDB.initialize({ apiKey });
        console.success(`Connected to ${backend} vector database`);
      } catch (error) {
        console.error(`Failed to connect to ${backend}: ${error.message}`);
        process.exit(1);
      }
      
      if (options.create) {
        console.info(`Creating vector database: ${options.create}`);
        const result = await vectorDB.createCollection(options.create);
        console.success('Vector database created successfully');
        console.json(result, 'Database Info');
        
      } else if (options.list) {
        console.info('Listing vector databases...');
        console.warn('Collection listing depends on the specific backend implementation');
        console.info(`Using backend: ${backend}`);
        
      } else if (options.add) {
        const [db, collection, data] = options.add.split(' ');
        console.info(`Adding documents to ${db}/${collection}`);
        
        if (!fs.existsSync(data)) {
          console.error(`Data file not found: ${data}`);
          process.exit(1);
        }
        
        const documents = JSON.parse(fs.readFileSync(data, 'utf8'));
        console.info(`Loaded ${documents.length} documents`);
        
        // This would require embeddings to be generated first
        console.warn('Document addition requires pre-generated embeddings');
        console.info('Consider using OpenAI embeddings or similar service first');
        
      } else if (options.search) {
        const [db, collection, query] = options.search.split(' ');
        console.info(`Searching in ${db}/${collection}: ${query}`);
        
        // This would require query embeddings to be generated first
        console.warn('Vector search requires query embeddings');
        console.info('Consider using OpenAI embeddings or similar service first');
        
      } else if (options.delete) {
        const [db, collection] = options.delete.split(' ');
        console.info(`Deleting collection: ${db}/${collection}`);
        
        const result = await vectorDB.deleteCollection(collection);
        console.success('Collection deleted successfully');
        console.json(result, 'Deletion Result');
      }
      
      console.endSection();
    } catch (error) {
      console.error(`Vector DB error: ${error.message}`);
      process.exit(1);
    }
  });

// Templates management commands
program
  .command('templates')
  .description('Manage agent templates')
  .action(() => {
    console.header('Available Templates', 'Pre-built agent workflows for common use cases');
    listTemplates();
  });

program
  .command('template')
  .description('Create new agent from template')
  .argument('<template>', 'Template name (category/template)')
  .argument('[output]', 'Output file name')
  .option('--list', 'List available templates')
  .action((template, output, options) => {
    if (options.list) {
      listTemplates();
      return;
    }
    createFromTemplate(template, output);
  });

program
  .command('init')
  .description('Initialize a new agent project')
  .argument('[name]', 'Project name')
  .option('--template <name>', 'Use a specific template')
  .option('--provider <provider>', 'Default AI provider (openai, gemini, ollama)', 'openai')
  .option('--model <model>', 'Default AI model', 'gpt-4o')
  .option('--port <port>', 'Default server port', '5000')
  .action((name, options) => {
    initProject(name, options);
  });

program
  .command('workspace')
  .description('Manage agent workspace')
  .option('--list', 'List agents in workspace')
  .option('--stats', 'Show workspace statistics')
  .action((options) => {
    if (options.list) {
      listWorkspaceAgents();
    } else if (options.stats) {
      showWorkspaceStats();
    } else {
      showWorkspaceOverview();
    }
  });

program
  .command('serve')
  .description('Start HTTP server to expose agents as APIs')
  .option('--port <port>', 'Port to listen on', '5000')
  .option('--agents-dir <dir>', 'Directory containing .agent files', './agents')
  .option('--watch', 'Watch for file changes and reload agents')
  .option('--express', 'Use full Express server with auth and dynamic endpoints')
  .option('--no-auth', 'Disable authentication (Express server only)')
  .option('--api-key <key...>', 'API key(s) for server authentication (Express server)')
  .option('--jwt-secret <secret>', 'JWT secret for token auth (Express server)')
  .action(async (options) => {
    const useExpress = Boolean(options.express);
    const ServerClass = useExpress
      ? require('../lib/server/express-server')
      : require('../lib/server/minimal-server');

    const server = new ServerClass({
      port: parseInt(options.port),
      agentsDir: options.agentsDir,
      enableAuth: useExpress ? options.auth !== false : undefined,
      apiKeys: useExpress ? (options.apiKey || []) : undefined,
      jwtSecret: useExpress ? (options.jwtSecret || process.env.AAAB_JWT_SECRET) : undefined,
    });
    
    try {
      await server.start();
      
      if (options.watch && server.loadAgents) {
        const chokidar = require('chokidar');
        const watcher = chokidar.watch(options.agentsDir + '/*.agent');
        
        watcher.on('change', () => {
          console.info('Agent files changed, reloading...');
          server.loadAgents();
        });
        
        console.info('File watching enabled');
      }
      
      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.info('Shutting down server...');
        await server.stop();
        process.exit(0);
      });
    } catch (error) {
      console.error(`Server startup failed: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('deploy')
  .description('Deploy AAAB application to various platforms')
  .argument('<strategy>', 'Deployment strategy (replit, docker, serverless, kubernetes)')
  .option('--port <port>', 'Port number', '5000')
  .option('--app-name <name>', 'Application name', 'aaab-app')
  .option('--image <image>', 'Docker image name', 'aaab:latest')
  .option('--replicas <count>', 'Number of replicas', '2')
  .action(async (strategy, options) => {
    const AABBDeployer = require('../lib/deployment/deployer');
    
    try {
      const deployer = new AABBDeployer();
      const result = await deployer.deploy(strategy, options);
      
      console.success(`Deployment preparation complete!`);
      console.json(result, 'Deployment Result');
    } catch (error) {
      console.error(`Deployment failed: ${error.message}`);
      process.exit(1);
    }
  });

program.parse();

// Template management functions
function listTemplates() {
  const templatesDir = path.join(__dirname, '../templates');
  if (!fs.existsSync(templatesDir)) {
    console.warn('Templates directory not found');
    return;
  }

  const categories = fs.readdirSync(templatesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.section('Template Categories');
  
  categories.forEach(category => {
    console.info(`📁 ${category.toUpperCase()}`);
    const categoryPath = path.join(templatesDir, category);
    const templates = fs.readdirSync(categoryPath)
      .filter(file => file.endsWith('.agent'))
      .map(file => file.replace('.agent', ''));
    
    templates.forEach(template => {
      console.info(`   └─ ${template}`);
    });
  });
  
  console.endSection();
  console.info('Usage: aaab template <category>/<template> [output-file]');
}

function createFromTemplate(templateName, outputFile) {
  const templatesDir = path.join(__dirname, '../templates');
  let templatePath;
  
  // Handle category/template format
  if (templateName.includes('/')) {
    templatePath = path.join(templatesDir, templateName + '.agent');
  } else {
    // Search for template in all categories
    const categories = fs.readdirSync(templatesDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    for (const category of categories) {
      const possiblePath = path.join(templatesDir, category, templateName + '.agent');
      if (fs.existsSync(possiblePath)) {
        templatePath = possiblePath;
        break;
      }
    }
  }
  
  if (!templatePath || !fs.existsSync(templatePath)) {
    console.error(`Template '${templateName}' not found`);
    return;
  }
  
  const outputPath = outputFile || `${templateName.split('/').pop()}.agent`;
  
  console.header('Creating Agent from Template', `Template: ${templateName}`);
  console.info(`Source: ${templatePath}`);
  console.info(`Output: ${outputPath}`);
  
  const content = fs.readFileSync(templatePath, 'utf8');
  fs.writeFileSync(outputPath, content);
  
  console.success(`Agent created: ${outputPath}`);
  console.info('Next steps:');
  console.info('1. Edit the agent file to customize for your needs');
  console.info('2. Configure required secrets in your environment');
  console.info('3. Test with: aaab run ' + outputPath);
  console.endSection();
}

function initProject(name, options) {
  const projectName = name || 'my-agent-project';
  const projectDir = path.join(process.cwd(), projectName);
  
  console.header('Initializing Agent Project', `Project: ${projectName}`);
  
  if (fs.existsSync(projectDir)) {
    console.error(`Directory '${projectName}' already exists`);
    return;
  }
  
  fs.mkdirSync(projectDir, { recursive: true });
  
  // Create project structure
  const dirs = ['agents', 'examples', 'tests', 'config'];
  dirs.forEach(dir => {
    fs.mkdirSync(path.join(projectDir, dir), { recursive: true });
  });
  
  // Create package.json
  const packageJson = {
    name: projectName,
    version: '1.0.0',
    description: 'AAAB Agent Project',
    main: 'index.js',
    scripts: {
      'start': `aaab serve --port ${options.port || 5000}`,
      'serve': `aaab serve --port ${options.port || 5000}`,
      'dev': `aaab serve --port ${options.port || 5000} --watch`,
      'run': 'aaab run',
      'validate': 'aaab validate',
      'lint': 'aaab lint',
      'doctor': 'aaab doctor'
    },
    dependencies: {},
    aaab: {
      version: '1.0.0',
      agentsDir: './agents',
      examplesDir: './examples',
      defaultProvider: options.provider || 'openai',
      defaultModel: options.model || 'gpt-4o',
      port: options.port || 5000
    }
  };
  
  fs.writeFileSync(
    path.join(projectDir, 'package.json'), 
    JSON.stringify(packageJson, null, 2)
  );
  
  // Create default agent files
  createDefaultAgents(projectDir, options);
  
  // Create configuration files
  createConfigFiles(projectDir, options);
  
  // Create README
  const readme = createProjectReadme(projectName, options);
  fs.writeFileSync(path.join(projectDir, 'README.md'), readme);
  
  // Copy a starter template if specified
  if (options.template) {
    createFromTemplate(options.template, path.join(projectDir, 'agents', 'starter.agent'));
  }
  
  console.success(`Project created: ${projectDir}`);
  console.info('Next steps:');
  console.info(`1. cd ${projectName}`);
  console.info('2. Set your API keys:');
  console.info(`   export ${options.provider?.toUpperCase() || 'OPENAI'}_API_KEY="your-api-key"`);
  console.info('3. Start the server: npm start');
  console.info('4. Test your agents: aaab run agents/chat.agent --input \'{"message":"Hello"}\'');
  console.endSection();
}

function createDefaultAgents(projectDir, options) {
  const provider = options.provider || 'openai';
  const model = options.model || 'gpt-4o';
  
  // Chat agent
  const chatAgent = `@agent chat v1
description: "Simple chat agent for conversations"
trigger:
  type: http
  method: POST
  path: /chat

secrets:
  - name: ${provider.toUpperCase()}
    type: env
    value: ${provider.toUpperCase()}_API_KEY

vars:
  message:
    type: string
    from: input
    required: true

steps:
  - id: respond
    type: llm
    provider: ${provider}
    model: ${model}
    prompt: |
      You are a helpful AI assistant. Respond to the user's message in a friendly and helpful way.
      
      User message: {message}
    outputs:
      response: content

outputs:
  result: "{response}"
@end`;

  // Global prompt agent
  const globalPromptAgent = `@agent global-prompt v1
description: "Agent with global system prompt"
trigger:
  type: http
  method: POST
  path: /global-prompt

secrets:
  - name: ${provider.toUpperCase()}
    type: env
    value: ${provider.toUpperCase()}_API_KEY

vars:
  message:
    type: string
    from: input
    required: true

steps:
  - id: process
    type: llm
    provider: ${provider}
    model: ${model}
    globalPrompt: |
      You are an expert AI assistant with deep knowledge in technology, science, and business.
      Always provide accurate, helpful, and well-structured responses.
      Use markdown formatting when appropriate.
    prompt: |
      Please respond to: {message}
    outputs:
      response: content

outputs:
  result: "{response}"
@end`;

  // Knowledge base agent
  const kbAgent = `@agent kb v1
description: "Knowledge base query agent"
trigger:
  type: http
  method: POST
  path: /kb

secrets:
  - name: ${provider.toUpperCase()}
    type: env
    value: ${provider.toUpperCase()}_API_KEY

vars:
  query:
    type: string
    from: input
    required: true
  context:
    type: string
    from: input
    default: ""

steps:
  - id: search
    type: llm
    provider: ${provider}
    model: ${model}
    prompt: |
      Based on the following context, answer the user's question:
      
      Context: {context}
      Question: {query}
      
      If no context is provided, answer based on your general knowledge.
    outputs:
      answer: content

outputs:
  result: "{answer}"
@end`;

  // Settings agent
  const settingsAgent = `@agent settings v1
description: "Agent configuration and settings"
trigger:
  type: http
  method: POST
  path: /settings

vars:
  action:
    type: string
    from: input
    required: true
  data:
    type: object
    from: input
    default: {}

steps:
  - id: process
    type: http
    action: GET
    url: "https://httpbin.org/json"
    headers:
      Content-Type: "application/json"
    outputs:
      response: body

outputs:
  result: "{response}"
@end`;

  // Write agent files
  fs.writeFileSync(path.join(projectDir, 'agents', 'chat.agent'), chatAgent);
  fs.writeFileSync(path.join(projectDir, 'agents', 'global-prompt.agent'), globalPromptAgent);
  fs.writeFileSync(path.join(projectDir, 'agents', 'kb.agent'), kbAgent);
  fs.writeFileSync(path.join(projectDir, 'agents', 'settings.agent'), settingsAgent);
  
  console.success('Created default agent files:');
  console.info('  • agents/chat.agent - Simple chat agent');
  console.info('  • agents/global-prompt.agent - Agent with system prompt');
  console.info('  • agents/kb.agent - Knowledge base queries');
  console.info('  • agents/settings.agent - Configuration agent');
}

function createConfigFiles(projectDir, options) {
  // Create .env.example
  const envExample = `# AAAB Configuration
# Copy this file to .env and fill in your values

# AI Provider API Keys
${options.provider?.toUpperCase() || 'OPENAI'}_API_KEY=your-api-key-here
GEMINI_API_KEY=your-gemini-key-here
OLLAMA_URL=http://localhost:11434

# Security
AAAB_ENCRYPTION_KEY=your-encryption-key-here
AAAB_JWT_SECRET=your-jwt-secret-here

# Server Configuration
PORT=${options.port || 5000}
NODE_ENV=development

# Optional: Cloud Secret Stores
# AWS_SECRETS_ACCESS_KEY=your-aws-key
# AWS_SECRETS_SECRET_KEY=your-aws-secret
# GCP_PROJECT_ID=your-gcp-project
`;
  
  fs.writeFileSync(path.join(projectDir, '.env.example'), envExample);
  
  // Create .gitignore
  const gitignore = `# Dependencies
node_modules/
npm-debug.log*

# Environment variables
.env
.env.local
.env.production

# AAAB specific
.aaab-secrets
*.log

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Build outputs
dist/
build/
`;
  
  fs.writeFileSync(path.join(projectDir, '.gitignore'), gitignore);
  
  // Create aaab.config.js
  const config = `module.exports = {
  // Server configuration
  port: ${options.port || 5000},
  agentsDir: './agents',
  
  // Default AI provider settings
  defaultProvider: '${options.provider || 'openai'}',
  defaultModel: '${options.model || 'gpt-4o'}',
  
  // Security settings
  enableAuth: true,
  apiKeys: [
    // Add your API keys here for server authentication
    // 'your-api-key-1',
    // 'your-api-key-2'
  ],
  
  // CORS settings
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5000'],
    credentials: true
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  }
};
`;
  
  fs.writeFileSync(path.join(projectDir, 'aaab.config.js'), config);
  
  console.success('Created configuration files:');
  console.info('  • .env.example - Environment variables template');
  console.info('  • .gitignore - Git ignore rules');
  console.info('  • aaab.config.js - AAAB configuration');
}

function createProjectReadme(projectName, options) {
  const provider = options.provider || 'openai';
  const model = options.model || 'gpt-4o';
  const port = options.port || 5000;
  
  return `# ${projectName}

AAAB Agent Project - AI-powered backend services

## 🚀 Quick Start

### 1. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 2. Configure Environment
\`\`\`bash
cp .env.example .env
# Edit .env with your API keys
\`\`\`

### 3. Set API Keys
\`\`\`bash
export ${provider.toUpperCase()}_API_KEY="your-api-key-here"
\`\`\`

### 4. Start the Server
\`\`\`bash
npm start
# or
aaab serve --port ${port}
\`\`\`

### 5. Test Your Agents
\`\`\`bash
# Test chat agent
curl -X POST http://localhost:${port}/api/agents/chat/execute \\
  -H "Content-Type: application/json" \\
  -d '{"message":"Hello, how are you?"}'

# Test with CLI
aaab run agents/chat.agent --input '{"message":"Hello"}'
\`\`\`

## 📁 Project Structure

\`\`\`
${projectName}/
├── agents/           # Your agent definitions
│   ├── chat.agent    # Simple chat agent
│   ├── global-prompt.agent  # Agent with system prompt
│   ├── kb.agent      # Knowledge base queries
│   └── settings.agent # Configuration agent
├── examples/         # Example inputs and outputs
├── tests/           # Test cases
├── config/          # Configuration files
├── .env.example     # Environment variables template
├── aaab.config.js   # AAAB configuration
└── README.md        # This file
\`\`\`

## 🤖 Available Agents

### Chat Agent (\`/api/agents/chat/execute\`)
Simple conversation agent using ${provider} ${model}.

**Input:**
\`\`\`json
{
  "message": "Hello, how are you?"
}
\`\`\`

### Global Prompt Agent (\`/api/agents/global-prompt/execute\`)
Agent with predefined system prompt for consistent behavior.

### Knowledge Base Agent (\`/api/agents/kb/execute\`)
Query agent with context support.

**Input:**
\`\`\`json
{
  "query": "What is AI?",
  "context": "Additional context information..."
}
\`\`\`

### Settings Agent (\`/api/agents/settings/execute\`)
Configuration and settings management.

## 🔧 Configuration

### Environment Variables
- \`${provider.toUpperCase()}_API_KEY\` - Your ${provider} API key
- \`AAAB_ENCRYPTION_KEY\` - Encryption key for local secrets
- \`AAAB_JWT_SECRET\` - JWT secret for authentication
- \`PORT\` - Server port (default: ${port})

### AAAB Configuration (\`aaab.config.js\`)
Edit \`aaab.config.js\` to customize:
- Server settings
- Authentication
- CORS configuration
- Rate limiting

## 🛠️ Available Commands

\`\`\`bash
# Development
npm start          # Start server
npm run dev        # Start with file watching
npm run serve      # Start server

# Agent Management
aaab run <file>    # Execute agent
aaab validate <file> # Validate agent syntax
aaab lint <file>   # Check best practices
aaab doctor        # Diagnose issues

# Project Management
aaab templates     # List available templates
aaab template <name> <output> # Create from template
\`\`\`

## 🔐 Security

- API key authentication for all endpoints
- Rate limiting to prevent abuse
- CORS protection
- Encrypted local secret storage

## 🚢 Deployment

### Docker
\`\`\`bash
aaab deploy docker
docker-compose up
\`\`\`

### Kubernetes
\`\`\`bash
aaab deploy kubernetes
kubectl apply -f k8s-manifest.yml
\`\`\`

### Serverless
\`\`\`bash
aaab deploy serverless
serverless deploy
\`\`\`

## 📚 Next Steps

1. **Customize Agents**: Edit the \`.agent\` files in the \`agents/\` directory
2. **Add New Agents**: Use \`aaab template <template-name> agents/my-agent.agent\`
3. **Configure Secrets**: Set up your API keys and encryption
4. **Deploy**: Choose your deployment strategy and go live!

## 🤝 Support

- Check \`aaab doctor\` for common issues
- Review agent validation with \`aaab validate\`
- See examples in the \`examples/\` directory

---

Built with ❤️ using AAAB (Agent as a Backend)
`;
}

function listWorkspaceAgents() {
  console.header('Workspace Agents');
  
  const agentFiles = [];
  const searchDirs = ['.', 'agents', 'examples'];
  
  searchDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir)
        .filter(file => file.endsWith('.agent'))
        .map(file => path.join(dir, file));
      agentFiles.push(...files);
    }
  });
  
  if (agentFiles.length === 0) {
    console.warn('No .agent files found in workspace');
    console.info('Create one with: aaab template <template-name> my-agent.agent');
    return;
  }
  
  console.table(['File', 'Size', 'Modified'], 
    agentFiles.map(file => {
      const stats = fs.statSync(file);
      return [
        file,
        `${Math.round(stats.size / 1024)}KB`,
        stats.mtime.toLocaleDateString()
      ];
    })
  );
  
  console.endSection();
}

function showWorkspaceStats() {
  console.header('Workspace Statistics');
  
  const stats = {
    'Agent Files': 0,
    'Total Size': 0,
    'Categories': new Set(),
    'Last Modified': null
  };
  
  const searchDirs = ['.', 'agents', 'examples', 'templates'];
  let latestTime = 0;
  
  searchDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir, { recursive: true })
        .filter(file => file.endsWith && file.endsWith('.agent'));
      
      files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.existsSync(fullPath)) {
          const fileStat = fs.statSync(fullPath);
          stats['Agent Files']++;
          stats['Total Size'] += fileStat.size;
          
          if (fileStat.mtime.getTime() > latestTime) {
            latestTime = fileStat.mtime.getTime();
            stats['Last Modified'] = fileStat.mtime.toLocaleString();
          }
          
          // Determine category from path
          const pathParts = file.split('/');
          if (pathParts.length > 1) {
            stats['Categories'].add(pathParts[0]);
          }
        }
      });
    }
  });
  
  stats['Total Size'] = `${Math.round(stats['Total Size'] / 1024)}KB`;
  stats['Categories'] = stats['Categories'].size;
  
  Object.entries(stats).forEach(([key, value]) => {
    console.info(`${key}: ${value}`);
  });
  
  console.endSection();
}

function showWorkspaceOverview() {
  console.header('Agent Workspace Overview');
  
  console.info('🚀 Welcome to your AAAB workspace!');
  console.info('');
  console.info('Available commands:');
  console.info('• aaab templates          - Browse available templates');
  console.info('• aaab workspace --list   - List all agents');
  console.info('• aaab workspace --stats  - Show statistics');
  console.info('• aaab init <name>        - Create new project');
  console.info('• aaab run <file>         - Execute an agent');
  
  console.endSection();
}
