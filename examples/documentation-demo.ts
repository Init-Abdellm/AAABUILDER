import { DocumentationGenerator } from '../src/documentation/DocumentationGenerator';
import { createProviderRouter } from '../src/providers';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Example: Auto-Documentation Generation Demo
 * Shows how to generate comprehensive documentation for AAABuilder agents
 */
async function demonstrateDocumentationGeneration() {
  console.log('📚 Auto-Documentation Generation Demo');
  console.log('=====================================');

  // Create sample agent files for documentation
  const demoDir = path.join(process.cwd(), 'demo-agents');
  await fs.mkdir(demoDir, { recursive: true });

  // Sample chatbot agent
  const chatbotAgent = `@agent demo-chatbot v1
description: "A comprehensive chatbot agent with multiple capabilities"

trigger:
  type: http
  method: POST
  path: /chat

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

  conversation_history:
    type: input
    from: body
    required: false

steps:
  - id: validate_input
    kind: function
    operation: validate_message
    input: "{message}"
    save: validation_result
    retries: 2
    timeout_ms: 5000

  - id: load_context
    kind: function
    operation: load_conversation_history
    input: "{user_id}"
    when: "{user_id} != 'anonymous'"
    save: context
    retries: 1
    timeout_ms: 3000

  - id: generate_response
    kind: llm
    provider: openai
    model: gpt-4o
    prompt: |
      You are a helpful assistant. 
      
      User message: {message}
      User ID: {user_id}
      Context: {context}
      
      Provide a helpful and contextual response.
    when: "{validation_result.valid}"
    save: ai_response
    retries: 3
    timeout_ms: 30000

  - id: save_conversation
    kind: function
    operation: save_to_history
    input: |
      {
        "user_id": "{user_id}",
        "message": "{message}",
        "response": "{ai_response}",
        "timestamp": "{current_time}"
      }
    save: save_result

outputs:
  response: "{ai_response}"
  user_id: "{user_id}"
  conversation_saved: "{save_result.success}"
@end`;

  // Sample data processing agent
  const dataProcessorAgent = `@agent data-processor v1
description: "Advanced data processing agent with ML capabilities"

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
  - id: extract_data
    kind: function
    operation: extract_from_source
    input: "{data_source}"
    save: raw_data
    retries: 2
    timeout_ms: 10000

  - id: clean_data
    kind: function
    operation: clean_and_validate
    input: "{raw_data}"
    save: clean_data
    timeout_ms: 15000

  - id: ml_analysis
    kind: ml
    provider: scikit-learn
    model: random-forest-classifier
    input: "{clean_data}"
    when: "{processing_type} == 'classification'"
    save: ml_results
    retries: 1
    timeout_ms: 60000

  - id: generate_insights
    kind: llm
    provider: openai
    model: gpt-4o
    prompt: |
      Analyze this data processing result and provide insights:
      
      Data: {clean_data}
      ML Results: {ml_results}
      Processing Type: {processing_type}
      
      Provide actionable insights and recommendations.
    save: insights
    timeout_ms: 20000

  - id: format_output
    kind: function
    operation: format_results
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
  insights: "{insights}"
@end`;

  // Write sample agent files
  await fs.writeFile(path.join(demoDir, 'chatbot.agent'), chatbotAgent);
  await fs.writeFile(path.join(demoDir, 'data-processor.agent'), dataProcessorAgent);

  console.log('📄 Created sample agent files');

  try {
    // Initialize provider system for enhanced documentation
    console.log('\n🔌 Initializing provider system...');
    const providerRouter = await createProviderRouter({
      scikitLearn: { enabled: true },
      whisper: { enabled: true }
    });
    console.log('✅ Provider system initialized');

    const generator = new DocumentationGenerator(providerRouter);

    // 1. Generate documentation for single agent
    console.log('\n📄 Generating documentation for single agent...');
    const chatbotDoc = await generator.generateAgentDocumentation(
      path.join(demoDir, 'chatbot.agent')
    );

    console.log(`Agent: ${chatbotDoc.agent.id}`);
    console.log(`Description: ${chatbotDoc.agent.description}`);
    console.log(`API: ${chatbotDoc.api.method} ${chatbotDoc.api.endpoint}`);
    console.log(`Steps: ${chatbotDoc.steps.length}`);
    console.log(`Variables: ${chatbotDoc.variables.length}`);
    console.log(`Providers: ${chatbotDoc.providers.join(', ')}`);

    // Show step details
    console.log('\nStep Details:');
    chatbotDoc.steps.forEach((step, index) => {
      console.log(`  ${index + 1}. ${step.id} (${step.type})`);
      console.log(`     ${step.description}`);
      if (step.conditions) {
        console.log(`     Condition: ${step.conditions}`);
      }
      console.log(`     Retries: ${step.errorHandling.retries}, Timeout: ${step.errorHandling.timeout}ms`);
    });

    // 2. Generate project documentation in multiple formats
    console.log('\n📚 Generating project documentation...');

    const docsDir = path.join(process.cwd(), 'demo-docs');
    await fs.mkdir(docsDir, { recursive: true });

    // Markdown documentation
    console.log('\n📝 Generating Markdown documentation...');
    await generator.generateProjectDocumentation(demoDir, {
      format: 'markdown',
      outputDir: path.join(docsDir, 'markdown'),
      includeExamples: true,
      includeProviders: true,
      includeTests: true,
      title: 'Demo AAABuilder Project',
      description: 'Comprehensive documentation for demo agents',
      version: '1.0.0'
    });

    // HTML documentation
    console.log('\n🌐 Generating HTML documentation...');
    await generator.generateProjectDocumentation(demoDir, {
      format: 'html',
      outputDir: path.join(docsDir, 'html'),
      includeExamples: true,
      title: 'Demo AAABuilder Project - HTML'
    });

    // JSON documentation
    console.log('\n📄 Generating JSON documentation...');
    await generator.generateProjectDocumentation(demoDir, {
      format: 'json',
      outputDir: path.join(docsDir, 'json'),
      includeExamples: true,
      includeProviders: true
    });

    // OpenAPI documentation
    console.log('\n🔌 Generating OpenAPI documentation...');
    await generator.generateProjectDocumentation(demoDir, {
      format: 'openapi',
      outputDir: path.join(docsDir, 'openapi'),
      title: 'Demo AAABuilder API',
      description: 'OpenAPI specification for demo agents',
      version: '1.0.0'
    });

    // 3. Show generated documentation structure
    console.log('\n📁 Generated Documentation Structure:');
    await showDirectoryStructure(docsDir, '');

    // 4. Display sample documentation content
    console.log('\n📖 Sample Documentation Content:');
    
    // Show README.md content
    const readmePath = path.join(docsDir, 'markdown', 'README.md');
    const readmeContent = await fs.readFile(readmePath, 'utf-8');
    console.log('\n--- README.md (first 20 lines) ---');
    console.log(readmeContent.split('\n').slice(0, 20).join('\n'));
    console.log('...\n');

    // Show OpenAPI spec
    const openApiPath = path.join(docsDir, 'openapi', 'openapi.json');
    const openApiContent = JSON.parse(await fs.readFile(openApiPath, 'utf-8'));
    console.log('--- OpenAPI Specification ---');
    console.log(`Title: ${openApiContent.info.title}`);
    console.log(`Version: ${openApiContent.info.version}`);
    console.log(`Paths: ${Object.keys(openApiContent.paths).length}`);
    console.log(`Endpoints:`);
    Object.entries(openApiContent.paths).forEach(([path, methods]: [string, any]) => {
      Object.keys(methods).forEach(method => {
        console.log(`  ${method.toUpperCase()} ${path}`);
      });
    });

    console.log('\n✅ Documentation generation completed!');

  } catch (error) {
    console.error('❌ Documentation generation failed:', error);
  } finally {
    // Clean up demo files
    try {
      await fs.rm(demoDir, { recursive: true, force: true });
      console.log('\n🧹 Cleaned up demo files');
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Example: CLI Usage Demonstration
 */
async function demonstrateCLIUsage() {
  console.log('\n\n🖥️  CLI Usage Examples');
  console.log('======================');

  console.log('\n1. Generate Markdown documentation:');
  console.log('   npm run docs');
  console.log('   # or: npx aaab-docs generate');

  console.log('\n2. Generate HTML documentation:');
  console.log('   npm run docs:html');
  console.log('   # or: npx aaab-docs generate --format html');

  console.log('\n3. Generate OpenAPI specification:');
  console.log('   npm run docs:openapi');
  console.log('   # or: npx aaab-docs generate --format openapi');

  console.log('\n4. Watch mode for automatic regeneration:');
  console.log('   npm run docs:watch');
  console.log('   # or: npx aaab-docs watch');

  console.log('\n5. Validate agents for documentation completeness:');
  console.log('   npm run docs:validate');
  console.log('   # or: npx aaab-docs validate');

  console.log('\n6. Generate documentation with custom options:');
  console.log('   npx aaab-docs generate \\');
  console.log('     --input ./agents \\');
  console.log('     --output ./documentation \\');
  console.log('     --format markdown \\');
  console.log('     --title "My Project API" \\');
  console.log('     --description "Comprehensive API documentation" \\');
  console.log('     --version "2.0.0"');

  console.log('\n7. Generate documentation for single agent:');
  console.log('   npx aaab-docs agent ./agents/chatbot.agent --format json');

  console.log('\n📚 Documentation Formats:');
  console.log('   markdown  - GitHub-style markdown documentation');
  console.log('   html      - Interactive HTML documentation');
  console.log('   json      - Machine-readable JSON format');
  console.log('   openapi   - OpenAPI 3.0 specification');

  console.log('\n🎯 Key Features:');
  console.log('   ✅ Automatic API documentation generation');
  console.log('   ✅ Step-by-step workflow documentation');
  console.log('   ✅ Variable and parameter documentation');
  console.log('   ✅ Provider and model information');
  console.log('   ✅ Request/response schema generation');
  console.log('   ✅ Code examples and usage samples');
  console.log('   ✅ Testing information integration');
  console.log('   ✅ Multiple output formats');
  console.log('   ✅ Watch mode for live updates');
  console.log('   ✅ Validation for documentation completeness');
}

/**
 * Example: Advanced Documentation Features
 */
async function demonstrateAdvancedFeatures() {
  console.log('\n\n🚀 Advanced Documentation Features');
  console.log('===================================');

  console.log('\n📊 Documentation Analysis:');
  console.log('   - Automatic API schema generation from agent variables');
  console.log('   - Step dependency analysis and visualization');
  console.log('   - Provider usage statistics and recommendations');
  console.log('   - Error handling documentation');
  console.log('   - Performance characteristics (timeouts, retries)');

  console.log('\n🔍 Validation Features:');
  console.log('   - Missing description detection');
  console.log('   - Undocumented variable identification');
  console.log('   - Test coverage analysis');
  console.log('   - Provider compatibility checking');
  console.log('   - Best practices recommendations');

  console.log('\n🎨 Customization Options:');
  console.log('   - Custom themes and styling');
  console.log('   - Configurable content sections');
  console.log('   - Brand customization');
  console.log('   - Template overrides');
  console.log('   - Plugin system for extensions');

  console.log('\n🔄 Integration Capabilities:');
  console.log('   - CI/CD pipeline integration');
  console.log('   - Git hooks for automatic updates');
  console.log('   - Slack/Teams notifications');
  console.log('   - Documentation hosting integration');
  console.log('   - API testing tool integration');

  console.log('\n📈 Metrics and Analytics:');
  console.log('   - Documentation coverage metrics');
  console.log('   - API usage statistics');
  console.log('   - Performance benchmarks');
  console.log('   - Error rate analysis');
  console.log('   - User engagement tracking');
}

/**
 * Helper function to show directory structure
 */
async function showDirectoryStructure(dirPath: string, indent: string): Promise<void> {
  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);
      
      if (item.isDirectory()) {
        console.log(`${indent}📁 ${item.name}/`);
        await showDirectoryStructure(itemPath, indent + '  ');
      } else {
        console.log(`${indent}📄 ${item.name}`);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
  }
}

// Run the demo
async function main() {
  try {
    await demonstrateDocumentationGeneration();
    await demonstrateCLIUsage();
    await demonstrateAdvancedFeatures();
    
    console.log('\n🎉 Auto-Documentation Demo Completed!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Create agent files in your project');
    console.log('   2. Run "npm run docs" to generate documentation');
    console.log('   3. Use "npm run docs:watch" during development');
    console.log('   4. Integrate documentation generation into your CI/CD pipeline');
    console.log('   5. Share the generated documentation with your team');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

if (require.main === module) {
  main();
}

export { 
  demonstrateDocumentationGeneration, 
  demonstrateCLIUsage, 
  demonstrateAdvancedFeatures 
};