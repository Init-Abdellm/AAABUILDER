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
      
      const validationResult = validator.validate(ast);
      if (!validationResult.valid) {
        logger.error('Validation failed:');
        validationResult.errors.forEach(error => logger.error(`  ${error}`));
        process.exit(1);
      }

      const input = JSON.parse(options.input);
      const result = await orchestrator.execute(ast, input);
      
      logger.info(chalk.green('Execution completed successfully'));
      console.log(JSON.stringify(result, null, 2));
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
  .action((name, options) => {
    initProject(name, options.template);
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
  .action(async (options) => {
    const AABBServer = require('../lib/server/minimal-server');
    
    const server = new AABBServer({
      port: parseInt(options.port),
      agentsDir: options.agentsDir
    });
    
    try {
      await server.start();
      
      if (options.watch) {
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

function initProject(name, template) {
  const projectName = name || 'my-agent-project';
  const projectDir = path.join(process.cwd(), projectName);
  
  console.header('Initializing Agent Project', `Project: ${projectName}`);
  
  if (fs.existsSync(projectDir)) {
    console.error(`Directory '${projectName}' already exists`);
    return;
  }
  
  fs.mkdirSync(projectDir, { recursive: true });
  
  // Create project structure
  const dirs = ['agents', 'examples', 'tests'];
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
      'run': 'aaab run',
      'validate': 'aaab validate',
      'lint': 'aaab lint'
    },
    dependencies: {},
    aaab: {
      version: '1.0.0',
      agentsDir: './agents',
      examplesDir: './examples'
    }
  };
  
  fs.writeFileSync(
    path.join(projectDir, 'package.json'), 
    JSON.stringify(packageJson, null, 2)
  );
  
  // Create README
  const readme = `# ${projectName}

AAAB Agent Project

## Getting Started

1. Create your first agent:
   \`\`\`bash
   aaab template ai/chatbot agents/my-chatbot.agent
   \`\`\`

2. Configure environment variables:
   \`\`\`bash
   export OPENAI_KEY="your-api-key"
   \`\`\`

3. Run your agent:
   \`\`\`bash
   aaab run agents/my-chatbot.agent --input '{"message":"Hello"}'
   \`\`\`

## Project Structure

- \`agents/\` - Your agent definitions
- \`examples/\` - Example inputs and outputs
- \`tests/\` - Test cases for your agents

## Available Commands

- \`aaab run <file>\` - Execute an agent
- \`aaab validate <file>\` - Validate agent syntax
- \`aaab lint <file>\` - Check for best practices
- \`aaab templates\` - List available templates
- \`aaab doctor\` - Diagnose issues
`;
  
  fs.writeFileSync(path.join(projectDir, 'README.md'), readme);
  
  // Copy a starter template if specified
  if (template) {
    createFromTemplate(template, path.join(projectDir, 'agents', 'starter.agent'));
  }
  
  console.success(`Project created: ${projectDir}`);
  console.info('Next steps:');
  console.info(`1. cd ${projectName}`);
  console.info('2. aaab templates');
  console.info('3. aaab template <template-name> agents/my-agent.agent');
  console.endSection();
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
