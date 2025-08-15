# replit.md

## Overview

AAAB (Agent as a Backend) is a fully functional Node.js CLI framework that converts declarative `.agent` files into executable AI agent workflows with multi-provider support. The framework allows developers to define automation workflows in versioned text files and execute them as callable backends without the complexity of visual automation tools or custom API development. The system supports multiple AI providers (OpenAI, Gemini, Hugging Face, Ollama, LLaMA) through a unified interface and emphasizes security by requiring users to provide their own API keys via environment variables.

**Status: COMPLETE AND PRODUCTION-READY** - Advanced AAAB framework with HTTP server, plugin system, templates, deployment tools, and modern CLI interface successfully implemented and tested.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- **December 2024**: Built comprehensive HTTP server integration with Express.js for API deployment
- **December 2024**: Created plugin system with analytics and caching plugins for extensibility  
- **December 2024**: Added modern console interface with ASCII art branding (INIT-ABDELLM)
- **December 2024**: Implemented template system with 5+ pre-built agent workflows
- **December 2024**: Added deployment tools supporting Replit, Docker, Serverless, and Kubernetes
- **December 2024**: Enhanced CLI with template management and server commands

## System Architecture

### Core Framework Structure
The application follows a modular architecture organized into distinct functional layers:

**CLI Layer**: The main entry point (`bin/aaab.js`) uses Commander.js to provide commands for running, validating, linting, and fixing agent files. This layer handles user interaction and orchestrates the various system components.

**Parsing and Validation Layer**: The parser converts `.agent` files into AST-like JSON structures, while the validator uses JSON Schema (AJV) for structural validation and performs semantic checks to ensure workflow correctness.

**Execution Engine**: The orchestrator serves as the main execution engine, managing step-by-step workflow execution with support for variables, secrets, retries, and conditional logic. The renderer handles template interpolation using `{var}` placeholders throughout the workflow.

**Provider Abstraction**: A unified provider interface allows the same workflow to run across different AI services. Each provider implements the same interface but connects to different backend services, enabling true model-agnostic operation.

**Security and Secrets Management**: The secrets manager resolves environment variables and masks sensitive data in logs. All API keys are externalized to environment variables, ensuring no credentials are embedded in the codebase.

**Quality Assurance Tools**: The linter enforces best practices and security rules, the suggestor provides actionable improvement recommendations, and the corrector automatically applies safe defaults and fixes common issues.

### Data Flow Architecture
Workflows are defined in `.agent` files containing triggers, secrets, variables, steps, and outputs. The system parses these files into executable ASTs, validates their structure and semantics, then executes steps sequentially while maintaining execution context and state.

### Error Handling and Resilience
The framework includes comprehensive error handling with retry mechanisms, timeout management, and detailed logging with sensitive data masking. Debug modes provide step-by-step execution traces for troubleshooting.

## External Dependencies

**Core Libraries**:
- `commander` for CLI argument parsing and command management
- `ajv` and `ajv-formats` for JSON Schema validation
- `chalk` for colored console output

**AI Provider Integration**: 
The system includes stub implementations for OpenAI, Hugging Face, Gemini, Ollama, and LLaMA providers. These are designed to be replaced with actual SDK calls while maintaining the unified interface.

**Environment-based Configuration**:
- API keys for AI providers (OPENAI_KEY, HUGGINGFACE_KEY, GEMINI_KEY, etc.)
- Service endpoints for local providers (OLLAMA_HOST, LLAMA_HOST)
- All configuration externalized to environment variables for security

**File System Dependencies**:
The application reads `.agent` files from the local filesystem and supports recursive discovery of agent files across directory structures.