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

program.parse();
