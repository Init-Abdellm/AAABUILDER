#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import { DocumentationGenerator, DocumentationOptions } from './DocumentationGenerator';
import { createProviderRouter } from '../providers';

/**
 * CLI for documentation generation
 */
async function main() {
  const program = new Command();

  program
    .name('aaab-docs')
    .description('Generate documentation for AAABuilder agents')
    .version('1.0.0');

  // Generate documentation command
  program
    .command('generate')
    .description('Generate documentation for agents')
    .option('-i, --input <dir>', 'Input directory containing agent files', './agents')
    .option('-o, --output <dir>', 'Output directory for documentation', './docs')
    .option('-f, --format <format>', 'Documentation format (markdown|html|json|openapi)', 'markdown')
    .option('-t, --title <title>', 'Documentation title', 'AAABuilder Project Documentation')
    .option('-d, --description <desc>', 'Project description')
    .option('-v, --version <version>', 'Project version', '1.0.0')
    .option('--theme <theme>', 'Documentation theme (default|minimal|detailed)', 'default')
    .option('--no-examples', 'Exclude examples from documentation')
    .option('--no-providers', 'Exclude provider information')
    .option('--no-tests', 'Exclude testing information')
    .option('--no-deployment', 'Exclude deployment information')
    .action(async (options) => {
      try {
        console.log('📚 Generating AAABuilder Documentation');
        console.log('=====================================');
        console.log(`Input: ${options.input}`);
        console.log(`Output: ${options.output}`);
        console.log(`Format: ${options.format}`);
        console.log();

        // Initialize provider router for enhanced documentation
        let providerRouter;
        try {
          console.log('🔌 Initializing provider system...');
          providerRouter = await createProviderRouter();
          console.log('✅ Provider system initialized');
        } catch (error) {
          console.warn('⚠️  Provider system not available, using basic documentation');
        }

        const generator = new DocumentationGenerator(providerRouter);

        const docOptions: DocumentationOptions = {
          format: options.format as any,
          outputDir: path.resolve(options.output),
          includeExamples: options.examples,
          includeProviders: options.providers,
          includeTests: options.tests,
          includeDeployment: options.deployment,
          theme: options.theme,
          title: options.title,
          description: options.description,
          version: options.version
        };

        await generator.generateProjectDocumentation(
          path.resolve(options.input),
          docOptions
        );

        console.log();
        console.log('✅ Documentation generation completed!');
        console.log(`📖 Documentation available at: ${docOptions.outputDir}`);

        // Show next steps based on format
        switch (options.format) {
          case 'markdown':
            console.log('💡 Open README.md to view the documentation');
            break;
          case 'html':
            console.log('💡 Open index.html in your browser to view the documentation');
            break;
          case 'json':
            console.log('💡 Use documentation.json for programmatic access');
            break;
          case 'openapi':
            console.log('💡 Import openapi.json into Swagger UI or Postman');
            break;
        }

      } catch (error) {
        console.error('❌ Documentation generation failed:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Generate for single agent
  program
    .command('agent <file>')
    .description('Generate documentation for a single agent file')
    .option('-f, --format <format>', 'Documentation format (markdown|html|json)', 'markdown')
    .option('-o, --output <file>', 'Output file path')
    .action(async (agentFile: string, options) => {
      try {
        console.log(`📄 Generating documentation for: ${agentFile}`);

        const generator = new DocumentationGenerator();
        const agentPath = path.resolve(agentFile);
        
        const documentation = await generator.generateAgentDocumentation(agentPath);

        // Determine output path
        let outputPath = options.output;
        if (!outputPath) {
          const baseName = path.basename(agentFile, '.agent');
          const extension = options.format === 'json' ? 'json' : 'md';
          outputPath = `${baseName}-docs.${extension}`;
        }

        // Generate content based on format
        let content: string;
        switch (options.format) {
          case 'json':
            content = JSON.stringify(documentation, null, 2);
            break;
          case 'markdown':
          default:
            // Generate markdown for single agent (simplified)
            content = `# ${documentation.agent.id}\n\n`;
            content += `${documentation.agent.description || 'No description available'}\n\n`;
            content += `## API Endpoint\n\n\`${documentation.api.method} ${documentation.api.endpoint}\`\n\n`;
            content += `## Steps\n\n`;
            documentation.steps.forEach((step, index) => {
              content += `${index + 1}. **${step.id}** (${step.type}): ${step.description}\n`;
            });
            break;
        }

        const fs = await import('fs/promises');
        await fs.writeFile(outputPath, content);

        console.log(`✅ Documentation generated: ${outputPath}`);

      } catch (error) {
        console.error('❌ Single agent documentation failed:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Watch mode
  program
    .command('watch')
    .description('Watch for changes and regenerate documentation')
    .option('-i, --input <dir>', 'Input directory containing agent files', './agents')
    .option('-o, --output <dir>', 'Output directory for documentation', './docs')
    .option('-f, --format <format>', 'Documentation format', 'markdown')
    .action(async (options) => {
      try {
        console.log('👀 Starting documentation watch mode...');
        console.log(`Watching: ${options.input}`);
        console.log('Press Ctrl+C to stop');

        const chokidar = await import('chokidar');
        const generator = new DocumentationGenerator();

        const watcher = chokidar.watch(path.resolve(options.input), {
          ignored: /node_modules/,
          persistent: true
        });

        const regenerateDocumentation = async () => {
          try {
            console.log('🔄 Regenerating documentation...');
            
            const docOptions: DocumentationOptions = {
              format: options.format,
              outputDir: path.resolve(options.output),
              includeExamples: true,
              includeProviders: true,
              includeTests: true
            };

            await generator.generateProjectDocumentation(
              path.resolve(options.input),
              docOptions
            );

            console.log('✅ Documentation updated');
          } catch (error) {
            console.error('❌ Documentation update failed:', error);
          }
        };

        watcher
          .on('add', (filePath) => {
            if (filePath.endsWith('.agent')) {
              console.log(`📄 Agent added: ${path.basename(filePath)}`);
              regenerateDocumentation();
            }
          })
          .on('change', (filePath) => {
            if (filePath.endsWith('.agent')) {
              console.log(`📝 Agent changed: ${path.basename(filePath)}`);
              regenerateDocumentation();
            }
          })
          .on('unlink', (filePath) => {
            if (filePath.endsWith('.agent')) {
              console.log(`🗑️  Agent removed: ${path.basename(filePath)}`);
              regenerateDocumentation();
            }
          });

        // Initial generation
        await regenerateDocumentation();

      } catch (error) {
        console.error('❌ Watch mode failed:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Validate documentation
  program
    .command('validate')
    .description('Validate agent files for documentation completeness')
    .option('-i, --input <dir>', 'Input directory containing agent files', './agents')
    .action(async (options) => {
      try {
        console.log('🔍 Validating agents for documentation completeness...');

        const generator = new DocumentationGenerator();
        const fs = await import('fs/promises');
        
        // Find all agent files
        const findAgentFiles = async (dir: string): Promise<string[]> => {
          const files: string[] = [];
          const items = await fs.readdir(dir, { withFileTypes: true });
          
          for (const item of items) {
            const fullPath = path.join(dir, item.name);
            if (item.isDirectory()) {
              files.push(...await findAgentFiles(fullPath));
            } else if (item.name.endsWith('.agent')) {
              files.push(fullPath);
            }
          }
          
          return files;
        };

        const agentFiles = await findAgentFiles(path.resolve(options.input));
        console.log(`Found ${agentFiles.length} agent files\n`);

        let validationIssues = 0;

        for (const agentFile of agentFiles) {
          const agentName = path.basename(agentFile);
          console.log(`📄 Validating: ${agentName}`);

          try {
            const doc = await generator.generateAgentDocumentation(agentFile);
            const issues: string[] = [];

            // Check for missing description
            if (!doc.agent.description) {
              issues.push('Missing description');
            }

            // Check for undocumented variables
            const undocumentedVars = doc.variables.filter(v => !v.description || v.description === 'Variable');
            if (undocumentedVars.length > 0) {
              issues.push(`${undocumentedVars.length} undocumented variables`);
            }

            // Check for missing tests
            if (doc.testing.testCases === 0) {
              issues.push('No test cases found');
            }

            // Check for complex steps without descriptions
            const complexSteps = doc.steps.filter(s => 
              s.type === 'llm' && s.description.includes('default model')
            );
            if (complexSteps.length > 0) {
              issues.push(`${complexSteps.length} steps using default models`);
            }

            if (issues.length > 0) {
              console.log(`  ⚠️  Issues found:`);
              issues.forEach(issue => console.log(`    - ${issue}`));
              validationIssues += issues.length;
            } else {
              console.log(`  ✅ No issues found`);
            }

          } catch (error) {
            console.log(`  ❌ Validation failed: ${error instanceof Error ? error.message : error}`);
            validationIssues++;
          }

          console.log();
        }

        console.log(`📊 Validation Summary:`);
        console.log(`  Files checked: ${agentFiles.length}`);
        console.log(`  Issues found: ${validationIssues}`);
        
        if (validationIssues === 0) {
          console.log(`  ✅ All agents are well-documented!`);
        } else {
          console.log(`  ⚠️  Consider addressing the issues above for better documentation`);
        }

      } catch (error) {
        console.error('❌ Validation failed:', error instanceof Error ? error.message : error);
        process.exit(1);
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

export { main as runDocsCLI };