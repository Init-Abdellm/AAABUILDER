const parser = require('./lib/parser/parser');
const fs = require('fs');

// Read the vision analysis agent file
const content = fs.readFileSync('./examples/vision-analysis.agent', 'utf8');

console.log('=== PARSING VISION ANALYSIS AGENT ===');
const ast = parser.parse(content);

console.log('\n=== PARSED AST ===');
console.log('ID:', ast.id);
console.log('Version:', ast.version);
console.log('Description:', ast.description);
console.log('Trigger:', ast.trigger);
console.log('Secrets:', ast.secrets);
console.log('Variables:', ast.vars);
console.log('Steps:', ast.steps.length);

console.log('\n=== VARIABLES ===');
Object.entries(ast.vars).forEach(([name, def]) => {
  console.log(`${name}:`, def);
});

console.log('\n=== STEPS ===');
ast.steps.forEach((step, index) => {
  console.log(`\nStep ${index + 1}: ${step.id}`);
  console.log('  Kind:', step.kind);
  console.log('  Provider:', step.provider);
  console.log('  Model:', step.model);
  console.log('  Input:', step.input);
  console.log('  Operation:', step.operation);
  console.log('  When:', step.when);
  console.log('  Save:', step.save);
});

console.log('\n=== OUTPUT ===');
console.log(ast.output);
