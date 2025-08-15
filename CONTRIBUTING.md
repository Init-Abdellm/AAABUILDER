# Contributing to AAABuilder

Thank you for your interest in contributing to AAABuilder! This document provides guidelines and information for contributors.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Code of Conduct](#code-of-conduct)

## Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- Git

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/AAABuilder.git
   cd AAABuilder
   ```

## Development Setup

### Install Dependencies

```bash
npm install
```

### Build the Project

```bash
npm run build
```

### Start Development Server

```bash
npm run dev
```

### Run Tests

```bash
npm test
```

### Linting and Formatting

```bash
# Check for linting issues
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Format code
npm run format
```

## Code Style

### TypeScript Guidelines

- Use TypeScript for all new code
- Prefer `const` over `let` when possible
- Use explicit return types for public functions
- Avoid `any` type - use proper typing instead
- Use interfaces for object shapes
- Prefer arrow functions for callbacks

### JavaScript Guidelines

- Use ES6+ features
- Use `const`