const enhancedParser = require('../lib/parser/enhanced-parser');
const fs = require('fs');

// Read the actual coder-helper.agent file
const testAgent = fs.readFileSync('./agents/coder-helper.agent', 'utf8');

console.log('=== PARSER DEBUG ===\n');
console.log('Testing coder-helper.agent file:\n');
console.log(testAgent);
console.log('\n' + '='.repeat(50) + '\n');

const result = enhancedParser.parse(testAgent);
console.log('Valid:', result.validation.valid);
console.log('Errors:', result.validation.errors.length);
console.log('Warnings:', result.validation.warnings.length);

if (result.validation.errors.length > 0) {
  console.log('\nErrors:');
  result.validation.errors.forEach((error, i) => {
    console.log(`${i + 1}. ${error.message}`);
    console.log(`   Line: ${error.line}, Column: ${error.column}`);
    console.log(`   Context: ${error.context}`);
    if (error.suggestion) {
      console.log(`   Suggestion: ${error.suggestion}`);
    }
  });
}

if (result.validation.warnings.length > 0) {
  console.log('\nWarnings:');
  result.validation.warnings.forEach((warning, i) => {
    console.log(`${i + 1}. ${warning.message}`);
    console.log(`   Line: ${warning.line}, Column: ${warning.column}`);
    console.log(`   Context: ${warning.context}`);
  });
}

if (result.ast) {
  console.log('\nAST:');
  console.log('- ID:', result.ast.id);
  console.log('- Version:', result.ast.version);
  console.log('- Description:', result.ast.description);
  console.log('- Trigger:', JSON.stringify(result.ast.trigger, null, 2));
  console.log('- Steps:', result.ast.steps.length);
  if (result.ast.steps.length > 0) {
    const step = result.ast.steps[0];
    console.log('- First step:');
    console.log(`  - ID: ${step.id}`);
    console.log(`  - Kind: ${step.kind}`);
    console.log(`  - Model: ${step.model}`);
    console.log(`  - Provider: ${step.provider}`);
    console.log(`  - Temperature: ${step.temperature}`);
    console.log(`  - Retries: ${step.retries}`);
    console.log(`  - Timeout: ${step.timeout_ms}`);
    console.log(`  - Save: ${step.save}`);
  }
  console.log('- Outputs:', JSON.stringify(result.ast.outputs, null, 2));
}