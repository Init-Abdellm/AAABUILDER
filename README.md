# AAABuilder - Advanced AI/ML Agent Framework

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](package.json)
[![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](package.json)
[![License](https://img.shields.io/badge/license-Apache%202.0-brightgreen.svg)](LICENSE)
[![Downloads](https://img.shields.io/npm/dm/aaabuilder.svg)](https://www.npmjs.com/package/aaabuilder)
[![Stars](https://github.com/Init-Abdellm/AAABuilder/stargazers)](https://github.com/Init-Abdellm/AAABuilder)

**AAABuilder** (AGENT AS A BACKEND) is a comprehensive AI/ML development framework available, transforming complex AI workflows into production-ready APIs with support for all major AI/ML model types including LLM, SLM, MLM, Vision, ASR, TTS, RL, GNN, RNN, CNN, GAN, Diffusion, Transformer, MLP, Autoencoder, BERT, RAG, Hybrid, and Foundation Models.

## Table of Contents

- [Overview](#overview)
- [Why Zinebi?](#why-zinebi)
- [Comparison with Other Solutions](#comparison-with-other-solutions)
- [Features](#features)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Usage](#usage)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Overview

Zinebi addresses the growing complexity of AI/ML development by providing a unified framework that handles everything from simple text generation to complex multimodal AI systems. Unlike other solutions that focus on specific domains, Zinebi offers comprehensive support across all AI/ML paradigms.

The framework is built with TypeScript-first development, ensuring type safety and developer productivity while maintaining the flexibility needed for rapid AI/ML prototyping and production deployment.

## Why AAABuilder?

### Comprehensive Model Support
Zinebi supports every major AI/ML model type, from traditional language models to cutting-edge multimodal systems. This eliminates the need to learn multiple frameworks for different AI tasks.

### Production-Ready Architecture
Built with enterprise-grade features including security, monitoring, and deployment automation. Zinebi transforms prototypes into production systems seamlessly.

### Developer Experience
TypeScript-first development with comprehensive tooling, hot reload, and intuitive CLI commands. Developers can focus on AI logic rather than infrastructure concerns.

## Comparison with Other Solutions

| Feature | AAABuilder | LangChain | AutoGen | CrewAI | Flowise |
|---------|--------|-----------|---------|--------|---------|
| **Model Support** | All AI/ML types | LLM-focused | LLM-focused | LLM-focused | LLM-focused |
| **Vision Models** | ✓ Full support | ✗ Limited | ✗ Limited | ✗ Limited | ✗ Limited |
| **Audio Models** | ✓ ASR/TTS | ✗ None | ✗ None | ✗ None | ✗ None |
| **ML Models** | ✓ CNN/RNN/GNN | ✗ None | ✗ None | ✗ None | ✗ None |
| **Fine-tuning** | ✓ Complete pipeline | ✗ Limited | ✗ None | ✗ None | ✗ None |
| **TypeScript** | ✓ First-class | ✗ Python-only | ✗ Python-only | ✗ Python-only | ✗ JavaScript |
| **Deployment** | ✓ Multi-platform | ✗ Manual | ✗ Manual | ✗ Manual | ✗ Limited |
| **Security** | ✓ Enterprise-grade | ✗ Basic | ✗ Basic | ✗ Basic | ✗ Basic |
| **Monitoring** | ✓ Built-in | ✗ None | ✗ None | ✗ None | ✗ None |
| **Vector DBs** | ✓ All major | ✓ Limited | ✗ None | ✗ None | ✓ Limited |

### Key Advantages

- **Unified Framework**: Single solution for all AI/ML needs
- **Type Safety**: Full TypeScript support with comprehensive types
- **Production Ready**: Built-in security, monitoring, and deployment
- **Extensible**: Plugin system for custom integrations
- **Performance**: Optimized for high-throughput AI operations

## Features

### Core Capabilities

- **Language Models**: GPT-4, Claude, Gemini, Llama, Mistral, and more
- **Computer Vision**: Image classification, object detection, OCR, face recognition
- **Audio Processing**: Speech-to-text, text-to-speech, voice cloning
- **Machine Learning**: CNN, RNN, GNN, GAN, Diffusion, Transformer architectures
- **Vector Databases**: Pinecone, Weaviate, Qdrant, Chroma, Milvus integration
- **Fine-tuning**: Complete model customization pipeline
- **Real-time Processing**: Streaming, live inference, monitoring

### Development Features

- **TypeScript Support**: Full type safety and modern development
- **Hot Reload**: Instant development with file watching
- **CLI Tools**: Comprehensive command-line interface
- **Templates**: Pre-built agent templates for common use cases
- **Validation**: Built-in syntax and structure validation
- **Linting**: Code quality and best practices enforcement

### Production Features

- **Security**: JWT authentication, encrypted secrets, rate limiting
- **Monitoring**: Performance metrics, error tracking, health checks
- **Deployment**: Docker, Kubernetes, serverless support
- **Scaling**: Horizontal and vertical scaling capabilities
- **Backup**: Automated backup and recovery systems

## Quick Start

### Prerequisites

- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- TypeScript 5.3+ (optional but recommended)

### Installation

```bash
# Install globally
npm install -g aaabuilder

# Verify installation
aaab --version
```

### Your First Agent

```bash
# Initialize a new project
aaab init my-ai-project --provider openai --model gpt-4o

# Navigate to project
cd my-ai-project

# Set your API key
export OPENAI_API_KEY="your-api-key-here"

# Start the server
npm start
```

## Installation

### Global Installation

```bash
npm install -g aaabuilder

### Local Development

```bash
# Clone the repository
git clone https://github.com/Init-Abdellm/AAABuilder.git
cd AAABuilder

# Install dependencies
npm install

# Build the project
npm run build

# Start development server
npm run dev
```

### Docker Installation

```bash
# Pull the image
docker pull aaabuilder/aaabuilder:latest

# Run the container
docker run -p 5000:5000 -e OPENAI_API_KEY=your-key aaabuilder/aaabuilder:latest

## Usage

### Basic Commands

```bash
# Initialize a new project
aaab init <project-name> [options]

# List available models
aaab models --list

# Get model recommendations
aaab models --recommend "sentiment-analysis"

# Create an agent from template
aaab template chatbot agents/chat.agent

# Start the server
aaab serve --port 5000

# Validate agent files
aaab validate agents/*.agent

# Deploy to production
aaab deploy docker
```

### Advanced Commands

```bash
# Vision operations
aaab vision --classify image.jpg
aaab vision --detect image.jpg
aaab vision --ocr document.pdf

# Audio operations
aaab audio --stt audio.wav
aaab audio --tts "Hello world"

# Machine learning
aaab ml --train config.json
aaab ml --predict model.pkl data.json

# Fine-tuning
aaab fine-tune --create gpt-3.5-turbo --data training.jsonl

# Vector databases
aaab vector-db --create my-db
aaab vector-db --search my-db docs "query"
```

## Architecture

### Core Components

```
Zinebi/
├── Core Framework
│   ├── Model Manager      # AI/ML model registry and management
│   ├── Orchestrator       # Workflow execution engine
│   ├── Parser            # Agent file parsing and validation
│   └── Renderer          # Output formatting and templating
├── Providers
│   ├── OpenAI            # GPT models and APIs
│   ├── Anthropic         # Claude models
│   ├── Google            # Gemini models
│   ├── Ollama            # Local model serving
│   └── Custom            # Custom provider integration
├── Models
│   ├── Language          # LLM, SLM, MLM models
│   ├── Vision            # Computer vision models
│   ├── Audio             # ASR, TTS models
│   └── ML                # Traditional ML models
└── Utils
    ├── Logger            # Structured logging
    ├── Security          # Authentication and encryption
    └── Monitoring        # Performance and health monitoring
```

### Data Flow

1. **Input Processing**: Agent files are parsed and validated
2. **Model Selection**: Appropriate models are selected based on requirements
3. **Execution**: Workflows are executed with proper error handling
4. **Output Generation**: Results are formatted and returned
5. **Monitoring**: Performance metrics are collected and logged

## API Reference

### Agent File Format

```yaml
@agent agent-name v1
description: "Agent description"
trigger:
  type: http
  method: POST
  path: /endpoint

secrets:
  - name: API_KEY
    type: env
    value: OPENAI_API_KEY

variables:
  input:
    type: input
    path: message
    required: true

steps:
  - id: process
    type: llm
    provider: openai
    model: gpt-4o
    prompt: "Process: {input}"
    save: result

outputs:
  response: "{result}"
@end
```

### CLI Commands

| Command | Description | Options |
|---------|-------------|---------|
| `aaab init` | Initialize new project | `--provider`, `--model`, `--template` |
| `aaab models` | Manage AI/ML models | `--list`, `--type`, `--provider`, `--recommend` |
| `aaab serve` | Start HTTP server | `--port`, `--host`, `--watch` |
| `aaab validate` | Validate agent files | `--strict`, `--fix` |
| `aaab deploy` | Deploy to production | `--strategy`, `--config` |

### Configuration

```json
{
  "name": "my-aaabuilder-project",
  "version": "1.0.0",
  "providers": {
    "openai": {
      "apiKey": "${OPENAI_API_KEY}",
      "timeout": 30000
    }
  },
  "models": {
    "default": "gpt-4o",
    "vision": "gpt-4o-vision",
    "audio": "whisper-1"
  },
  "security": {
    "jwtSecret": "${JWT_SECRET}",
    "rateLimit": {
      "windowMs": 900000,
      "max": 100
    }
  }
}
```

## Examples

### Simple Chat Agent

```yaml
@agent chat v1
description: "Simple chat agent"
trigger:
  type: http
  method: POST
  path: /chat

secrets:
  - name: OPENAI
    type: env
    value: OPENAI_API_KEY

variables:
  message:
    type: input
    path: message
    required: true

steps:
  - id: respond
    type: llm
    provider: openai
    model: gpt-4o
    prompt: "Respond to: {message}"
    save: response

outputs:
  reply: "{response}"
@end
```

### Vision Analysis Agent

```yaml
@agent vision-analyzer v1
description: "Analyze images with AI"
trigger:
  type: http
  method: POST
  path: /vision/analyze

variables:
  image:
    type: input
    path: image
    required: true

steps:
  - id: classify
    type: vision
    model: gpt-4o-vision
    action: classify
    input: "{image}"
    save: classification

  - id: describe
    type: vision
    model: gpt-4o-vision
    action: describe
    input: "{image}"
    save: description

outputs:
  labels: "{classification.labels}"
  confidence: "{classification.confidence}"
  description: "{description}"
@end
```

### Multimodal Agent

```yaml
@agent multimodal v1
description: "Process text, image, and audio"
trigger:
  type: http
  method: POST
  path: /multimodal

steps:
  - id: text_analysis
    type: llm
    provider: openai
    model: gpt-4o
    input: "{text}"
    save: text_insights

  - id: image_analysis
    type: vision
    model: gpt-4o-vision
    input: "{image}"
    save: image_insights

  - id: audio_analysis
    type: asr
    model: whisper-1
    input: "{audio}"
    save: audio_insights

  - id: synthesis
    type: llm
    provider: openai
    model: gpt-4o
    prompt: |
      Synthesize insights:
      Text: {text_insights}
      Image: {image_insights}
      Audio: {audio_insights}
    save: final_analysis

outputs:
  analysis: "{final_analysis}"
@end
```

## Deployment

### Docker Deployment

```bash
# Build the image
docker build -t aaabuilder .

# Run the container
docker run -p 5000:5000 \
  -e OPENAI_API_KEY=your-key \
  -e NODE_ENV=production \
  aaabuilder

### Kubernetes Deployment

```bash
# Apply the manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -l app=aaabuilder
```

### Serverless Deployment

```bash
# Deploy to AWS Lambda
serverless deploy

# Deploy to Vercel
vercel --prod
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `ANTHROPIC_API_KEY` | Anthropic API key | No |
| `GEMINI_API_KEY` | Google Gemini API key | No |
| `NODE_ENV` | Environment (development/production) | No |
| `PORT` | Server port | No |
| `JWT_SECRET` | JWT signing secret | No |

## Contributing

We welcome contributions from the community. Please read our contributing guidelines before submitting pull requests.

### Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/your-username/AAABuilder.git
cd AAABuilder

# Install dependencies
npm install

# Run tests
npm test

# Start development server
npm run dev
```

### Code Style

- Use TypeScript for all new code
- Follow ESLint and Prettier configurations
- Write comprehensive tests
- Update documentation for new features

### Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Update documentation
6. Submit a pull request

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

### License Summary

- **License**: Apache License 2.0
- **Commercial Use**: ✓ Allowed
- **Modification**: ✓ Allowed
- **Distribution**: ✓ Allowed
- **Patent Use**: ✓ Allowed
- **Private Use**: ✓ Allowed
- **Liability**: ✗ Limited
- **Warranty**: ✗ Limited

For more information about the Apache License 2.0, visit [https://www.apache.org/licenses/LICENSE-2.0](https://www.apache.org/licenses/LICENSE-2.0).

---

**AAABuilder** - Transforming AI/ML development with comprehensive, production-ready solutions.

Built with ❤️ by [INIT-ABDELLM](https://github.com/Init-Abdellm)
