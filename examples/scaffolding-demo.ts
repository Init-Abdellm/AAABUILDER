import { ProjectScaffolder } from '../src/scaffolding/ProjectScaffolder';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Example: Project Scaffolding Demo
 * Shows how to use the project scaffolding system
 */
async function demonstrateScaffolding() {
  console.log('🏗️  Project Scaffolding Demo');
  console.log('============================');

  const scaffolder = new ProjectScaffolder();

  // 1. List available templates
  console.log('\n📋 Available Templates:');
  const templates = scaffolder.getTemplates();
  
  templates.forEach(template => {
    console.log(`  ${template.name} (${template.category})`);
    console.log(`    ${template.description}`);
    console.log(`    Files: ${template.files.length}`);
    console.log(`    Dependencies: ${template.dependencies?.length || 0}`);
    console.log();
  });

  // 2. Create a basic chatbot project
  console.log('🤖 Creating basic chatbot project...');
  
  const outputDir = path.join(process.cwd(), 'demo-projects', 'my-chatbot');
  
  try {
    // Clean up any existing demo project
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }

    await scaffolder.createProject({
      projectName: 'My Chatbot',
      template: 'basic-chatbot',
      outputDir,
      overwrite: true,
      installDependencies: false, // Skip for demo
      initGit: false // Skip for demo
    });

    console.log('\n✅ Basic chatbot project created successfully!');

    // Show created files
    console.log('\n📁 Created Files:');
    await listDirectoryRecursive(outputDir, '');

  } catch (error) {
    console.error('❌ Failed to create basic chatbot:', error);
  }

  // 3. Create a multimodal agent project
  console.log('\n🎭 Creating multimodal agent project...');
  
  const multimodalDir = path.join(process.cwd(), 'demo-projects', 'multimodal-agent');
  
  try {
    // Clean up any existing demo project
    try {
      await fs.rm(multimodalDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }

    await scaffolder.createProject({
      projectName: 'Advanced Multimodal Agent',
      template: 'multimodal-agent',
      outputDir: multimodalDir,
      overwrite: true,
      installDependencies: false, // Skip for demo
      initGit: false, // Skip for demo
      variables: {
        AUTHOR_NAME: 'Demo User',
        AUTHOR_EMAIL: 'demo@example.com'
      }
    });

    console.log('\n✅ Multimodal agent project created successfully!');

    // Show package.json content
    const packageJsonPath = path.join(multimodalDir, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    
    console.log('\n📦 Package.json Scripts:');
    Object.entries(packageJson.scripts || {}).forEach(([name, command]) => {
      console.log(`  ${name}: ${command}`);
    });

  } catch (error) {
    console.error('❌ Failed to create multimodal agent:', error);
  }

  // 4. Create a custom template
  console.log('\n🔧 Creating custom template...');
  
  const customTemplate = {
    name: 'custom-demo',
    description: 'Custom template for demonstration',
    category: 'basic' as const,
    files: [
      {
        path: 'agents/{{PROJECT_NAME_KEBAB}}.agent',
        content: `@agent {{PROJECT_NAME_KEBAB}} v1
description: "{{PROJECT_NAME}} - Custom demo agent"

trigger:
  type: http
  method: POST
  path: /{{PROJECT_NAME_KEBAB}}

vars:
  demo_input:
    type: input
    from: body
    required: true

steps:
  - id: demo_step
    kind: function
    operation: demo_operation
    input: "{demo_input}"
    save: demo_result

outputs:
  result: "{demo_result}"
@end`
      },
      {
        path: 'README.md',
        content: `# {{PROJECT_NAME}}

This is a custom demo project created on {{CURRENT_DATE}}.

## Usage

\`\`\`bash
curl -X POST http://localhost:5000/{{PROJECT_NAME_KEBAB}} \\
  -H "Content-Type: application/json" \\
  -d '{"demo_input": "Hello World"}'
\`\`\`

## Development

- \`npm start\` - Start the server
- \`npm test\` - Run tests

Created with AAABuilder scaffolding system.`
      }
    ],
    dependencies: ['aaab@latest'],
    scripts: {
      'start': 'aaab serve --port 5000',
      'test': 'echo "No tests yet"'
    },
    instructions: [
      'cd {{PROJECT_NAME_KEBAB}}',
      'npm install',
      'npm start'
    ]
  };

  // Register the custom template
  scaffolder.registerTemplate(customTemplate);

  // Create project from custom template
  const customDir = path.join(process.cwd(), 'demo-projects', 'custom-demo');
  
  try {
    // Clean up any existing demo project
    try {
      await fs.rm(customDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }

    await scaffolder.createProject({
      projectName: 'Custom Demo Project',
      template: 'custom-demo',
      outputDir: customDir,
      overwrite: true,
      installDependencies: false,
      initGit: false
    });

    console.log('\n✅ Custom template project created successfully!');

    // Show the generated agent file
    const agentPath = path.join(customDir, 'agents', 'custom-demo-project.agent');
    const agentContent = await fs.readFile(agentPath, 'utf-8');
    
    console.log('\n📄 Generated Agent File:');
    console.log('========================');
    console.log(agentContent);

  } catch (error) {
    console.error('❌ Failed to create custom template project:', error);
  }

  // 5. Template information
  console.log('\n📋 Template Information:');
  console.log('========================');
  
  const basicTemplate = scaffolder.getTemplate('basic-chatbot');
  if (basicTemplate) {
    console.log(`Name: ${basicTemplate.name}`);
    console.log(`Description: ${basicTemplate.description}`);
    console.log(`Category: ${basicTemplate.category}`);
    console.log(`Files: ${basicTemplate.files.length}`);
    console.log(`Dependencies: ${basicTemplate.dependencies?.length || 0}`);
    console.log(`Scripts: ${Object.keys(basicTemplate.scripts || {}).length}`);
    console.log(`Environment Variables: ${basicTemplate.envVars?.length || 0}`);
  }

  console.log('\n🎉 Scaffolding demo completed!');
  console.log('\n💡 Try the CLI commands:');
  console.log('   npm run templates - List all templates');
  console.log('   npm run create:interactive - Interactive project creation');
  console.log('   npm run create new basic-chatbot my-project - Create from template');
}

/**
 * Helper function to list directory contents recursively
 */
async function listDirectoryRecursive(dirPath: string, indent: string): Promise<void> {
  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);
      
      if (item.isDirectory()) {
        console.log(`${indent}📁 ${item.name}/`);
        await listDirectoryRecursive(itemPath, indent + '  ');
      } else {
        console.log(`${indent}📄 ${item.name}`);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
  }
}

/**
 * Example: CLI Usage Simulation
 */
async function demonstrateCLIUsage() {
  console.log('\n\n🖥️  CLI Usage Examples');
  console.log('======================');

  console.log('\n1. List available templates:');
  console.log('   npm run templates');
  console.log('   # or: npx aaab-create list');

  console.log('\n2. Create project interactively:');
  console.log('   npm run create:interactive');
  console.log('   # or: npx aaab-create interactive');

  console.log('\n3. Create project from template:');
  console.log('   npm run create new basic-chatbot my-chatbot');
  console.log('   # or: npx aaab-create new basic-chatbot my-chatbot');

  console.log('\n4. Create with options:');
  console.log('   npx aaab-create new multimodal-agent my-agent \\');
  console.log('     --output ./projects \\');
  console.log('     --overwrite \\');
  console.log('     --no-install \\');
  console.log('     --no-git');

  console.log('\n5. Get template information:');
  console.log('   npx aaab-create info basic-chatbot');

  console.log('\n📚 Available Templates:');
  const scaffolder = new ProjectScaffolder();
  const templates = scaffolder.getTemplates();
  
  templates.forEach(template => {
    console.log(`   ${template.name.padEnd(20)} - ${template.description}`);
  });
}

// Run the demo
async function main() {
  try {
    await demonstrateScaffolding();
    await demonstrateCLIUsage();
    
    console.log('\n🎯 Key Features Demonstrated:');
    console.log('   ✅ Template-based project creation');
    console.log('   ✅ Variable substitution in templates');
    console.log('   ✅ Automatic package.json generation');
    console.log('   ✅ Environment variable setup');
    console.log('   ✅ Custom template registration');
    console.log('   ✅ CLI interface for easy usage');
    console.log('   ✅ Multiple project categories');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

if (require.main === module) {
  main();
}

export { demonstrateScaffolding, demonstrateCLIUsage };