import { EnhancedAgentParser } from '../src/parser/enhanced-parser';
import { createProviderRouter, ProviderValidator } from '../src/providers';

/**
 * Example: Integrating Parser with Provider System
 * Shows how to validate agent files against available providers
 */
async function demonstrateParserProviderIntegration() {
  console.log('🔗 Parser-Provider Integration Demo');
  console.log('===================================');

  // Sample agent file content
  const agentContent = `
@agent test-agent v1
description: "Test agent with provider validation"

trigger:
  type: http
  method: POST
  path: /test

vars:
  message:
    type: input
    from: body
    required: true

steps:
  - id: analyze
    kind: llm
    provider: openai
    model: gpt-4o
    prompt: "Analyze this message: {message}"
    save: analysis

  - id: classify
    kind: vision
    provider: yolo
    model: yolo-v8
    input: "{image_url}"
    save: classification

outputs:
  result: "{analysis}"
  classification: "{classification}"
@end
`;

  try {
    // 1. Parse the agent file
    console.log('\n📝 Parsing agent file...');
    const parser = new EnhancedAgentParser();
    const parseResult = parser.parse(agentContent);

    if (!parseResult.ast) {
      console.error('❌ Failed to parse agent file:');
      parseResult.validation.errors.forEach(error => {
        console.error(`  - Line ${error.line}: ${error.message}`);
      });
      return;
    }

    console.log('✅ Agent file parsed successfully');
    console.log(`   Agent ID: ${parseResult.ast.id}`);
    console.log(`   Steps: ${parseResult.ast.steps.length}`);

    // 2. Initialize provider system
    console.log('\n🚀 Initializing provider system...');
    const providerRouter = await createProviderRouter({
      // Enable some providers for testing
      scikitLearn: { enabled: true },
      yolo: { enabled: true },
      whisper: { enabled: true }
    });

    console.log('✅ Provider system initialized');

    // 3. Validate agent against providers
    console.log('\n🔍 Validating agent against available providers...');
    const validator = new ProviderValidator(providerRouter);
    const validationResult = await validator.validateAgent(parseResult.ast);

    if (validationResult.valid) {
      console.log('✅ Agent validation passed');
    } else {
      console.log('❌ Agent validation failed:');
      validationResult.errors.forEach(error => {
        console.error(`  - ${error}`);
      });
    }

    if (validationResult.warnings.length > 0) {
      console.log('⚠️  Validation warnings:');
      validationResult.warnings.forEach(warning => {
        console.warn(`  - ${warning}`);
      });
    }

    // 4. Get recommendations for each step
    console.log('\n💡 Getting model recommendations...');
    for (const step of parseResult.ast.steps) {
      console.log(`\n   Step "${step.id}" (${step.kind || 'unknown'}):`);
      
      const recommendations = await validator.getRecommendedModels({
        id: step.id,
        provider: step.provider,
        kind: step.kind
      });

      if (recommendations.length > 0) {
        console.log('     Recommended models:');
        recommendations.forEach((rec, index) => {
          console.log(`     ${index + 1}. ${rec.name} (${rec.provider}) - ${rec.reason}`);
        });
      } else {
        console.log('     No recommendations available');
      }
    }

    // 5. Show available providers and models
    console.log('\n📊 Available Providers and Models:');
    const allModels = await providerRouter.getAllModels();
    const providerStats = providerRouter.getProviderStats();

    console.log(`   Total Models: ${allModels.length}`);
    console.log(`   Active Providers: ${providerStats.enabledProviders}`);
    
    // Group by provider
    const modelsByProvider = allModels.reduce((acc, model) => {
      if (!acc[model.provider]) acc[model.provider] = [];
      acc[model.provider].push(model);
      return acc;
    }, {} as Record<string, any[]>);

    Object.entries(modelsByProvider).forEach(([provider, models]) => {
      console.log(`   ${provider}: ${models.length} models`);
      models.slice(0, 3).forEach(model => {
        console.log(`     - ${model.name} (${model.id})`);
      });
      if (models.length > 3) {
        console.log(`     ... and ${models.length - 3} more`);
      }
    });

    console.log('\n✅ Parser-Provider Integration Demo Complete!');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

/**
 * Example: Real-time validation during agent development
 */
async function demonstrateRealTimeValidation() {
  console.log('\n🔄 Real-time Validation Demo');
  console.log('============================');

  const providerRouter = await createProviderRouter();
  const validator = new ProviderValidator(providerRouter);
  const parser = new EnhancedAgentParser();

  // Simulate editing an agent file with different configurations
  const agentVersions = [
    // Version 1: Invalid provider
    `@agent test v1
steps:
  - id: step1
    provider: invalid-provider
    model: some-model
@end`,

    // Version 2: Valid provider, invalid model
    `@agent test v1
steps:
  - id: step1
    provider: scikit-learn
    model: invalid-model
@end`,

    // Version 3: Valid configuration
    `@agent test v1
steps:
  - id: step1
    kind: llm
    provider: scikit-learn
    model: random-forest-classifier
@end`
  ];

  for (let i = 0; i < agentVersions.length; i++) {
    console.log(`\n📝 Validating version ${i + 1}...`);
    
    const parseResult = parser.parse(agentVersions[i]);
    if (parseResult.ast) {
      const validation = await validator.validateAgent(parseResult.ast);
      
      if (validation.valid) {
        console.log('✅ Valid configuration');
      } else {
        console.log('❌ Invalid configuration:');
        validation.errors.forEach(error => console.log(`  - ${error}`));
      }
      
      if (validation.warnings.length > 0) {
        console.log('⚠️  Warnings:');
        validation.warnings.forEach(warning => console.log(`  - ${warning}`));
      }
    } else {
      console.log('❌ Parse error');
    }
  }
}

// Run the demos
async function main() {
  try {
    await demonstrateParserProviderIntegration();
    await demonstrateRealTimeValidation();
  } catch (error) {
    console.error('Demo failed:', error);
  }
}

if (require.main === module) {
  main();
}

export { demonstrateParserProviderIntegration, demonstrateRealTimeValidation };