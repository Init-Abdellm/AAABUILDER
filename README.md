# 🚀 AAAB (Agent as a Backend)

**Transform AI workflows into production-ready APIs with declarative `.agent` files**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](package.json)
[![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)](package.json)
[![License](https://img.shields.io/badge/license-MIT-brightgreen.svg)](LICENSE)

AAAB is a comprehensive Node.js framework that revolutionizes AI workflow deployment by converting simple declarative files into powerful, scalable backend APIs. Built by **INIT-ABDELLM**, it features a stunning modern CLI interface, enterprise-grade plugin system, and production deployment tools.

## ✨ Key Features

### 🎯 **Modern CLI Experience**
- Beautiful ASCII branding with organized, color-coded output
- Structured logging with timestamps and clear status indicators
- Interactive template management and project initialization

### 🔌 **Enterprise Plugin System**
- **Analytics Plugin**: Execution metrics, performance monitoring, and usage analytics
- **Cache Plugin**: Intelligent in-memory caching with TTL and auto-cleanup
- **Extensible Architecture**: Easy custom plugin development

### 🌐 **HTTP Server Integration**
- Full Express.js integration for API deployment
- Health checks, rate limiting, and security middleware
- Auto-discovery of agent files with hot reloading
- RESTful endpoints for agent execution and management

### 📦 **Template System**
- 5+ pre-built professional templates (chatbot, webhook-processor, sentiment-analyzer, price-tracker, lead-scorer)
- Rapid project scaffolding with `aaab template create`
- Industry-standard workflow patterns

### 🚢 **Multi-Platform Deployment**
- **Replit**: One-click deployment ready
- **Docker**: Containerization with health checks
- **Kubernetes**: Production manifests with scaling
- **Serverless**: AWS Lambda ready configurations

### 🤖 **AI Provider Support**
- OpenAI, Hugging Face, Gemini, Ollama, LLaMA
- Unified interface across all providers
- Secure API key management

## 🏃‍♂️ Quick Start

### Installation & Setup

```bash
# Clone and install
git clone <repository-url>
cd aaab-framework
npm install

# Initialize a new project
node bin/aaab.js init my-project --template chatbot
```

### Your First Agent

Create `hello.agent`:

```yaml
id: hello-world
version: "1.0"
description: "Professional greeting agent"

trigger:
  type: manual

secrets:
  - name: OPENAI
    env: OPENAI_KEY

vars:
  name:
    type: string
    from: input
    default: "World"

steps:
  - id: greet
    type: llm
    provider: openai
    model: gpt-4o
    prompt: "Create a professional greeting for {name} with a helpful tip."
    outputs:
      greeting: response

outputs:
  result: "{greeting}"
```

### Run Your Agent

```bash
# Set API key
export OPENAI_KEY="your-key-here"

# Execute agent
node bin/aaab.js run hello.agent --input '{"name":"Developer"}'
```

## 📚 CLI Commands

### Core Commands
```bash
# Workflow Execution
aaab run <file>                    # Execute agent workflow
aaab validate <file>               # Validate syntax & structure
aaab lint <file>                   # Best practices check
aaab fix <file>                    # Auto-fix common issues

# Project Management
aaab init <name>                   # Initialize new project
aaab template list                 # Show available templates
aaab template create <name>        # Create from template

# Server & Deployment
aaab serve --port 5000            # Start HTTP API server
aaab deploy docker                # Generate Docker configs
aaab deploy kubernetes            # Generate K8s manifests
aaab deploy replit                # Prepare Replit deployment

# Workspace Management
aaab workspace --list            # List workspace agents
aaab workspace --stats           # Show workspace statistics
```

## 🌐 HTTP Server API

Start the production-ready HTTP server:

```bash
node bin/aaab.js serve --port 5000 --watch
```

### API Endpoints

```bash
# Health & Status
GET  /health                      # Health check
GET  /api/agents                  # List all agents

# Agent Execution
POST /api/agents/:id/execute      # Execute specific agent
POST /api/agents/reload           # Reload all agents

# Example Usage
curl -X POST http://localhost:5000/api/agents/hello-world/execute \
  -H "Content-Type: application/json" \
  -d '{"name":"API User"}'
```

## 🔌 Plugin System

### Analytics Plugin
Monitors execution metrics, success rates, and performance:

```javascript
const AnalyticsPlugin = require('./plugins/analytics.plugin.js');
// Auto-loaded with plugin manager
// Provides: execution counts, success rates, performance metrics
```

### Cache Plugin
Intelligent caching for deterministic operations:

```javascript
const CachePlugin = require('./plugins/cache.plugin.js');
// Features: TTL management, automatic cleanup, memory optimization
// Supports: configurable cache keys, expiration policies
```

## 🚢 Deployment Options

### Docker Deployment
```bash
# Generate Docker files
node bin/aaab.js deploy docker --port 5000

# Build and run
docker build -t aaab .
docker run -p 5000:5000 aaab
```

### Kubernetes Deployment
```bash
# Generate K8s manifests
node bin/aaab.js deploy kubernetes --replicas 3

# Deploy to cluster
kubectl apply -f k8s-manifest.yml
```

### Replit Deployment
```bash
# Prepare for Replit
node bin/aaab.js deploy replit

# Click "Deploy" in Replit interface
```

## 🏗️ Architecture

### Modern Framework Structure
```
├── bin/aaab.js                   # Modern CLI with ASCII branding
├── lib/
│   ├── core/orchestrator.js      # Execution engine
│   ├── server/                   # HTTP server implementations
│   ├── plugins/                  # Plugin management system
│   ├── deployment/               # Multi-platform deployment
│   ├── utils/console.js          # Beautiful console interface
│   └── providers/                # AI provider integrations
├── plugins/                      # Built-in plugins
├── templates/                    # Professional templates
└── agents/                       # Your agent workflows
```

### Data Flow
1. **Parse** `.agent` files into executable ASTs
2. **Validate** structure and semantics
3. **Execute** through plugin-enhanced orchestrator
4. **Serve** via HTTP API or CLI interface
5. **Monitor** with analytics and caching plugins

## 🎨 Template Gallery

| Template | Description | Use Case |
|----------|-------------|----------|
| `chatbot` | Interactive conversation agent | Customer service, support |
| `webhook-processor` | HTTP webhook handler | API integrations, notifications |
| `sentiment-analyzer` | Text sentiment analysis | Social media, feedback analysis |
| `price-tracker` | Product price monitoring | E-commerce, deal alerts |
| `lead-scorer` | Sales lead qualification | CRM, marketing automation |

## 🔐 Security & Best Practices

- **API Keys**: Externalized to environment variables
- **Validation**: Comprehensive schema and semantic validation
- **Rate Limiting**: Built-in request rate limiting
- **Error Handling**: Secure error messages without data leakage
- **CORS**: Configurable cross-origin resource sharing

## 🤝 Contributing

```bash
# Development setup
git clone <repo>
cd aaab-framework
npm install

# Run tests
npm test

# Start development server
npm run dev
```

## 📖 Examples

Explore the `examples/` and `templates/` directories for:
- Real-world workflow patterns
- Multi-step automation examples
- Provider integration samples
- Production-ready configurations

## 📄 License

MIT License - Built with ❤️ by **INIT-ABDELLM**

---

**Ready to transform your AI workflows?** Start with `node bin/aaab.js init my-project` and experience the future of agent deployment!