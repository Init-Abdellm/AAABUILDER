#!/usr/bin/env node

import { Command } from 'commander';
import * as inquirer from 'inquirer';
import * as path from 'path';
import { ProjectScaffolder } from './ProjectScaffolder';

/**
 * CLI for project scaffolding
 */
async function main() {
  const program = new Command();
  const scaffolder = new ProjectScaffolder();

  program
    .name('aaab-create')
    .description('Create new AAABuilder projects from templates')
    .version('1.0.0');

  // List templates command
  program
    .command('list')
    .description('List available project templates')
    .action(() => {
      const templates = scaffolder.getTemplates();
      
      console.log('\n📋 Available Templates:');
      console.log('======================');
      
      const categories = ['basic', 'advanced', 'specialized'] as const;
      
      for (const category of categories) {
        const categoryTemplates = templates.filter(t => t.category === category);
        if (categoryTemplates.length === 0) continue;
        
        console.log(`\n${category.toUpperCase()}:`);
        for (const template of categoryTemplates) {
          console.log(`  ${template.name.padEnd(20)} - ${template.description}`);
        }
      }
      
      console.log('\nUsage: aaab-create new <template-name> <project-name>');
      console.log('   or: aaab-create interactive');
    });

  // Create project command
  program
    .command('new <template> <name>')
    .description('Create a new project from template')
    .option('-o, --output <dir>', 'Output directory', '.')
    .option('--overwrite', 'Overwrite existing files', false)
    .option('--no-install', 'Skip dependency installation', false)
    .option('--no-git', 'Skip git initialization', false)
    .action(async (templateName: string, projectName: string, options: any) => {
      try {
        const template = scaffolder.getTemplate(templateName);
        if (!template) {
          console.error(`❌ Template not found: ${templateName}`);
          console.log('\nAvailable templates:');
          scaffolder.getTemplates().forEach(t => {
            console.log(`  - ${t.name}`);
          });
          process.exit(1);
        }

        const outputDir = path.resolve(options.output, projectName);
        
        await scaffolder.createProject({
          projectName,
          template: templateName,
          outputDir,
          overwrite: options.overwrite,
          installDependencies: options.install,
          initGit: options.git
        });

      } catch (error) {
        console.error('❌ Project creation failed:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Interactive mode
  program
    .command('interactive')
    .alias('i')
    .description('Create project interactively')
    .action(async () => {
      try {
        console.log('🎮 AAABuilder Project Creator');
        console.log('=============================\n');

        const templates = scaffolder.getTemplates();
        
        const answers = await inquirer.prompt([
          {
            type: 'list',
            name: 'template',
            message: 'Choose a project template:',
            choices: templates.map(t => ({
              name: `${t.name} - ${t.description}`,
              value: t.name
            }))
          },
          {
            type: 'input',
            name: 'projectName',
            message: 'Project name:',
            validate: (input: string) => {
              if (!input.trim()) {
                return 'Project name is required';
              }
              if (!/^[a-zA-Z0-9-_\s]+$/.test(input)) {
                return 'Project name can only contain letters, numbers, spaces, hyphens, and underscores';
              }
              return true;
            }
          },
          {
            type: 'input',
            name: 'outputDir',
            message: 'Output directory:',
            default: (answers: any) => `./${answers.projectName.toLowerCase().replace(/\s+/g, '-')}`,
            validate: (input: string) => {
              if (!input.trim()) {
                return 'Output directory is required';
              }
              return true;
            }
          },
          {
            type: 'confirm',
            name: 'installDependencies',
            message: 'Install dependencies automatically?',
            default: true
          },
          {
            type: 'confirm',
            name: 'initGit',
            message: 'Initialize git repository?',
            default: true
          },
          {
            type: 'confirm',
            name: 'overwrite',
            message: 'Overwrite existing files if directory is not empty?',
            default: false,
            when: () => {
              // This would ideally check if directory exists and is not empty
              return false; // For now, always skip this question
            }
          }
        ]);

        const outputDir = path.resolve(answers.outputDir);
        
        await scaffolder.createProject({
          projectName: answers.projectName,
          template: answers.template,
          outputDir,
          overwrite: answers.overwrite,
          installDependencies: answers.installDependencies,
          initGit: answers.initGit
        });

      } catch (error) {
        console.error('❌ Interactive creation failed:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Show template details
  program
    .command('info <template>')
    .description('Show detailed information about a template')
    .action((templateName: string) => {
      const template = scaffolder.getTemplate(templateName);
      if (!template) {
        console.error(`❌ Template not found: ${templateName}`);
        process.exit(1);
      }

      console.log(`\n📋 Template: ${template.name}`);
      console.log('='.repeat(template.name.length + 12));
      console.log(`Description: ${template.description}`);
      console.log(`Category: ${template.category}`);
      
      if (template.dependencies && template.dependencies.length > 0) {
        console.log(`\nDependencies:`);
        template.dependencies.forEach(dep => {
          console.log(`  - ${dep}`);
        });
      }

      if (template.scripts && Object.keys(template.scripts).length > 0) {
        console.log(`\nScripts:`);
        Object.entries(template.scripts).forEach(([name, command]) => {
          console.log(`  ${name}: ${command}`);
        });
      }

      if (template.envVars && template.envVars.length > 0) {
        console.log(`\nEnvironment Variables:`);
        template.envVars.forEach(envVar => {
          console.log(`  - ${envVar}`);
        });
      }

      console.log(`\nFiles:`);
      template.files.forEach(file => {
        console.log(`  - ${file.path}`);
      });

      if (template.instructions && template.instructions.length > 0) {
        console.log(`\nSetup Instructions:`);
        template.instructions.forEach((instruction, index) => {
          console.log(`  ${index + 1}. ${instruction}`);
        });
      }
    });

  // Parse command line arguments
  program.parse();
}

// Run CLI if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ CLI error:', error);
    process.exit(1);
  });
}

export { main as runCLI };