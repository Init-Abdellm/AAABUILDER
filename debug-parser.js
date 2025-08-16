const enhancedParser = require('./lib/parser/enhanced-parser');

const testAgent = `@agent debug-test v1
description: "Debug test"
trigger:
  type: http
steps:
  - id: step1
    kind: llm
    model: qwen2.5-coder:1.5b
    prompt: "test"
    save: result
outputs:
  response: "{result}"
@end`;

console.log('=== PARSER DEBUG ===\n');

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

if (result.ast) {
  console.log('\nAST:');
  console.log('- ID:', result.ast.id);
  console.log('- Version:', result.ast.version);
  console.log('- Description:', result.ast.description);
  console.log('- Trigger:', JSON.stringify(result.ast.trigger, null, 2));
  console.log('- Steps:', result.ast.steps.length);
  if (result.ast.steps.length > 0) {
    console.log('- First step model:', result.ast.steps[0].model);
  }
  console.log('- Outputs:', JSON.stringify(result.ast.outputs, null, 2));
}