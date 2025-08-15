# AAAB (Agent as a Backend)

A Node.js CLI framework that converts declarative `.agent` files into executable AI agent workflows with multi-provider support.

## Overview

AAAB lets you build real backends out of AI agent workflows without wiring boxes in n8n/Make/Zapier and without writing a custom API for every flow.

- **Declarative**: Define automation in a single, versioned `.agent` file
- **Model-agnostic**: Same workflow runs on OpenAI, Gemini, Hugging Face, Ollama, LLaMA, etc.
- **Secure**: No API keys in package - users supply their own via environment
- **Testable**: Validate, lint, and debug workflows before deployment

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment** (copy and fill your API keys):
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Run an example**:
   ```bash
   node bin/aaab.js run examples/hello.agent --input '{"name":"Alex"}' --debug
   ```

4. **Validate and lint**:
   ```bash
   node bin/aaab.js validate examples/hello.agent
   node bin/aaab.js lint examples/hello.agent
   