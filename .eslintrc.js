module.exports = {
  env: {
    node: true,
    jest: true,
    es2022: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  ignorePatterns: [
    '.eslintrc.js', 
    'dist/', 
    'node_modules/', 
    'coverage/',
    'src/**/*.ts', // Ignore TypeScript files for now
    'src/**/*.d.ts'
  ],
  rules: {
    'no-console': 'off',
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'semi': ['error', 'always'],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'indent': ['error', 2],
    'comma-dangle': ['error', 'always-multiline'],
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};
