# test-project

AAAB Agent Project - AI-powered backend services

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your API keys
```

### 3. Set API Keys
```bash
export OPENAI_API_KEY="your-api-key-here"
```

### 4. Start the Server
```bash
npm start
# or
aaab serve --port 5000
```

### 5. Test Your Agents
```bash
# Test chat agent
curl -X POST http://localhost:5000/api/agents/chat/execute \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello, how are you?"}'

# Test with CLI
aaab run agents/chat.agent --input '{"message":"Hello"}'
```

## 📁 Project Structure

```
test-project/
├── agents/           # Your agent definitions
│   ├── chat.agent    # Simple chat agent
│   ├── global-prompt.agent  # Agent with system prompt
│   ├── kb.agent      # Knowledge base queries
│   └── settings.agent # Configuration agent
├── examples/         # Example inputs and outputs
├── tests/           # Test cases
├── config/          # Configuration files
├── .env.example     # Environment variables template
├── aaab.config.js   # AAAB configuration
└── README.md        # This file
```

## 🤖 Available Agents

### Chat Agent (`/api/agents/chat/execute`)
Simple conversation agent using openai gpt-4o.

**Input:**
```json
{
  "message": "Hello, how are you?"
}
```

### Global Prompt Agent (`/api/agents/global-prompt/execute`)
Agent with predefined system prompt for consistent behavior.

### Knowledge Base Agent (`/api/agents/kb/execute`)
Query agent with context support.

**Input:**
```json
{
  "query": "What is AI?",
  "context": "Additional context information..."
}
```

### Settings Agent (`/api/agents/settings/execute`)
Configuration and settings management.

## 🔧 Configuration

### Environment Variables
- `OPENAI_API_KEY` - Your openai API key
- `AAAB_ENCRYPTION_KEY` - Encryption key for local secrets
- `AAAB_JWT_SECRET` - JWT secret for authentication
- `PORT` - Server port (default: 5000)

### AAAB Configuration (`aaab.config.js`)
Edit `aaab.config.js` to customize:
- Server settings
- Authentication
- CORS configuration
- Rate limiting

## 🛠️ Available Commands

```bash
# Development
npm start          # Start server
npm run dev        # Start with file watching
npm run serve      # Start server

# Agent Management
aaab run <file>    # Execute agent
aaab validate <file> # Validate agent syntax
aaab lint <file>   # Check best practices
aaab doctor        # Diagnose issues

# Project Management
aaab templates     # List available templates
aaab template <name> <output> # Create from template
```

## 🔐 Security

- API key authentication for all endpoints
- Rate limiting to prevent abuse
- CORS protection
- Encrypted local secret storage

## 🚢 Deployment

### Docker
```bash
aaab deploy docker
docker-compose up
```

### Kubernetes
```bash
aaab deploy kubernetes
kubectl apply -f k8s-manifest.yml
```

### Serverless
```bash
aaab deploy serverless
serverless deploy
```

## 📚 Next Steps

1. **Customize Agents**: Edit the `.agent` files in the `agents/` directory
2. **Add New Agents**: Use `aaab template <template-name> agents/my-agent.agent`
3. **Configure Secrets**: Set up your API keys and encryption
4. **Deploy**: Choose your deployment strategy and go live!

## 🤝 Support

- Check `aaab doctor` for common issues
- Review agent validation with `aaab validate`
- See examples in the `examples/` directory

---

Built with ❤️ using AAAB (Agent as a Backend)
