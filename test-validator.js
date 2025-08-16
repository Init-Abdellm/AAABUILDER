const parser = require('./lib/parser/parser');
const validator = require('./lib/validate/validator');
const fs = require('fs');

// Read the vision analysis agent file
const content = fs.readFileSync('./examples/vision-analysis.agent', 'utf8');

console.log('=== PARSING VISION ANALYSIS AGENT ===');
const ast = parser.parse(content);

console.log('\n=== PARSED AST ===');
console.log('Variables:', Object.keys(ast.vars));
console.log('Provider variable exists:', ast.vars.provider ? 'YES' : 'NO');
console.log('Provider variable details:', ast.vars.provider);

// Test variable extraction
console.log('\n=== TESTING VARIABLE EXTRACTION ===');
const whenCondition = '"{provider} == \'openai\'"';
const extractedVars = validator.extractVariables(whenCondition);
console.log('When condition:', whenCondition);
console.log('Extracted variables:', extractedVars);

// Test each extracted variable
extractedVars.forEach(variable => {
  const exists = validator.checkVariableReference(ast, variable);
  console.log(`Variable '${variable}' exists:`, exists);
});

console.log('\n=== VALIDATING ===');
const result = validator.validate(ast);

console.log('Valid:', result.valid);
if (!result.valid) {
  console.log('Errors:');
  result.errors.forEach(error => console.log('  -', error));
}

// Test the checkVariableReference method directly
console.log('\n=== TESTING VARIABLE REFERENCE CHECK ===');
const providerExists = validator.checkVariableReference(ast, 'provider');
console.log('Provider variable reference check:', providerExists);

// Test with a step result
const classificationExists = validator.checkVariableReference(ast, 'classification');
console.log('Classification step result check:', classificationExists);
