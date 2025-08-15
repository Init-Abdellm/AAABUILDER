const express = require('express');
const cors = require('cors');
const orchestrator = require('../core/orchestrator');
const AgentParser = require('../parser/parser');
const AgentValidator = require('../validate/validator');
const console = require('../utils/console');
const fs = require('fs');
const path = require('path');

class SimpleAABBServer {
  constructor(options = {}) {
    this.app = express();
    this.port = options.port || 5000;
    this.agentsDir = options.agentsDir || './agents';
    this.agents = new Map();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.loadAgents();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        agents: this.agents.size,
      });
    });

    // List agents
    this.app.get('/api/agents', (req, res) => {
      const agentList = Array.from(this.agents.entries()).map(([id, agent]) => ({
        id,
        version: agent.ast.version,
        description: agent.ast.description || 'No description',
      }));
      
      res.json({ agents: agentList });
    });

    // Execute agent by ID
    this.app.post('/api/agents/:id/execute', async (req, res) => {
      await this.executeAgent(req.params.id, req.body, res);
    });

    // Simple catch-all for any other routes
    this.app.use('*', (req, res) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });
  }

  async executeAgent(agentId, input, res) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found', id: agentId });
    }

    try {
      console.info(`Executing agent: ${agentId}`);
      const result = await orchestrator.execute(agent.ast, input);
      
      res.json({
        success: true,
        result,
        agent: agentId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Agent execution failed: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
        agent: agentId,
      });
    }
  }

  loadAgents() {
    console.section('Loading Agents');
    
    this.agents.clear();
    
    if (!fs.existsSync(this.agentsDir)) {
      console.warn(`Agents directory not found: ${this.agentsDir}`);
      return;
    }

    const files = fs.readdirSync(this.agentsDir)
      .filter(file => file.endsWith('.agent'));

    for (const file of files) {
      try {
        const filePath = path.join(this.agentsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        const parser = new AgentParser();
        const ast = parser.parse(content);
        
        const validator = new AgentValidator();
        const validation = validator.validate(ast);
        
        if (!validation.valid) {
          console.error(`Invalid agent file: ${file}`);
          continue;
        }

        this.agents.set(ast.id, { ast, file: filePath });
        console.success(`Loaded agent: ${ast.id}`);
      } catch (error) {
        console.error(`Failed to load ${file}: ${error.message}`);
      }
    }
    
    console.info(`Total agents loaded: ${this.agents.size}`);
    console.endSection();
  }

  async start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, '0.0.0.0', () => {
        console.header('AAAB Server Started', 'Agent as a Backend HTTP Server');
        console.success(`Server running on http://0.0.0.0:${this.port}`);
        console.info(`Agents directory: ${this.agentsDir}`);
        console.info(`Loaded agents: ${this.agents.size}`);
        console.info('');
        console.info('Available endpoints:');
        console.info('• GET  /health                     - Health check');
        console.info('• GET  /api/agents                 - List all agents');
        console.info('• POST /api/agents/:id/execute     - Execute agent by ID');
        console.endSection();
        resolve();
      });
    });
  }

  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(resolve);
      } else {
        resolve();
      }
    });
  }
}

module.exports = SimpleAABBServer;