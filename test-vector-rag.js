const parser = require('./lib/parser/parser');
const fs = require('fs');

// Read the vector RAG agent file
const content = fs.readFileSync('./examples/vector-rag.agent', 'utf8');

console.log('=== PARSING VECTOR RAG AGENT ===');
const ast = parser.parse(content);

console.log('\n=== PARSED AST ===');
console.log('ID:', ast.id);
console.log('Version:', ast.version);
console.log('Steps:', ast.steps.length);

console.log('\n=== STEPS ===');
ast.steps.forEach((step, index) => {
  console.log(`\nStep ${index + 1}: ${step.id}`);
  console.log('  Kind:', step.kind);
  console.log('  Provider:', step.provider);
  console.log('  Model:', step.model);
  console.log('  Prompt:', step.prompt ? step.prompt.substring(0, 100) + '...' : 'undefined');
  console.log('  Save:', step.save);
});

console.log('\n=== OUTPUT ===');
console.log(ast.output);
