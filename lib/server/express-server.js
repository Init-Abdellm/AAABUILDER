const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');

const orchestrator = require('../core/orchestrator');
const AgentParser = require('../parser/parser');
const AgentValidator = require('../validate/validator');
const console = require('../utils/console');

class AABBServer {
  constructor(options = {}) {
    this.app = express();
    this.port = options.port || 3000;
    this.agentsDir = options.agentsDir || './agents';
    this.orchestrator = orchestrator;
    this.agents = new Map();
    
    // Security configuration
    this.apiKeys = new Set(options.apiKeys || []);
    this.jwtSecret = options.jwtSecret || process.env.AAAB_JWT_SECRET || '';
    this.enableAuth = options.enableAuth !== false;
    this.corsOptions = options.cors || {
      origin: options.allowedOrigins || ['http://localhost:3000', 'http://localhost:5000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    };
    
    this.setupMiddleware();
    this.setupRoutes();
    this.loadAgents();
  }

  setupMiddleware() {
    // Security
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    }));
    
    // CORS
    this.app.use(cors(this.corsOptions));
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);
    
    // Logging
    this.app.use(morgan('combined'));
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
  }

  /**
   * Authentication middleware
   */
  authenticate(req, res, next) {
    if (!this.enableAuth) {
      return next();
    }

    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    const authHeader = req.headers['authorization'];

    // Check API key
    if (apiKey && this.apiKeys.has(apiKey)) {
      req.user = { type: 'api-key', key: apiKey };
      return next();
    }

    // Check JWT token
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, this.jwtSecret);
        req.user = { type: 'jwt', ...decoded };
        return next();
      } catch (error) {
        return res.status(401).json({
          error: 'Invalid or expired token',
          message: 'Please provide a valid authentication token',
        });
      }
    }

    // No valid authentication found
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please provide an API key or JWT token',
      authMethods: ['X-API-Key header', 'Bearer token'],
    });
  }

  /**
   * Authorization middleware for modifying operations
   */
  requireAuth(req, res, next) {
    if (!this.enableAuth) {
      return next();
    }

    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'This endpoint requires authentication',
      });
    }

    // Check for admin privileges if needed
    if (req.requiresAdmin && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'Admin privileges required for this operation',
      });
    }

    next();
  }

  setupRoutes() {
    // Health check (no auth required)
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        agents: this.agents.size,
        uptime: process.uptime(),
        auth: this.enableAuth,
      });
    });

    // Authentication endpoints
    this.app.post('/api/auth/login', (req, res) => {
      const { username: _username, password: _password, apiKey } = req.body;
      
      if (apiKey && this.apiKeys.has(apiKey)) {
        const token = jwt.sign({ 
          type: 'api-key', 
          key: apiKey,
          iat: Date.now(), 
        }, this.jwtSecret, { expiresIn: '24h' });
        
        return res.json({
          success: true,
          token,
          type: 'api-key',
        });
      }
      
      // TODO: Implement username/password authentication
      res.status(401).json({
        error: 'Invalid credentials',
        message: 'Please provide valid API key or credentials',
      });
    });

    // Apply authentication to all API routes
    this.app.use('/api/', this.authenticate.bind(this));

    // List available agents (read-only, minimal auth)
    this.app.get('/api/agents', (req, res) => {
      const agentList = Array.from(this.agents.entries()).map(([id, agent]) => ({
        id,
        version: agent.ast.version,
        trigger: agent.ast.trigger,
        description: agent.ast.description || 'No description provided',
      }));
      
      res.json({
        agents: agentList,
        total: agentList.length,
      });
    });

    // Get agent details (read-only, minimal auth)
    this.app.get('/api/agents/:id', (req, res) => {
      const { id } = req.params;
      const agent = this.agents.get(id);
      
      if (!agent) {
        return res.status(404).json({
          error: 'Agent not found',
          id,
        });
      }
      
      res.json({
        id,
        ast: agent.ast,
        file: agent.file,
        loadedAt: agent.loadedAt,
      });
    });

    // Execute agent (requires auth)
    this.app.post('/api/agents/:id/execute', this.requireAuth.bind(this), async (req, res) => {
      const { id } = req.params;
      const input = req.body;
      
      const agent = this.agents.get(id);
      if (!agent) {
        return res.status(404).json({
          error: 'Agent not found',
          id,
        });
      }

      try {
        console.header(`Executing Agent: ${id}`, `HTTP Request by ${req.user.type}`);
        
        const startTime = Date.now();
        const result = await this.orchestrator.execute(agent.ast, input);
        const duration = Date.now() - startTime;

        console.success(`Agent executed successfully in ${duration}ms`);
        
        res.json({
          success: true,
          result,
          metadata: {
            agent: id,
            duration,
            timestamp: new Date().toISOString(),
            user: req.user.type,
          },
        });
      } catch (error) {
        console.error(`Agent execution failed: ${error.message}`);
        
        res.status(500).json({
          success: false,
          error: error.message,
          metadata: {
            agent: id,
            timestamp: new Date().toISOString(),
            user: req.user.type,
          },
        });
      }
    });

    // Reload agents (requires auth)
    this.app.post('/api/agents/reload', this.requireAuth.bind(this), (req, res) => {
      try {
        this.loadAgents();
        res.json({
          success: true,
          message: 'Agents reloaded successfully',
          total: this.agents.size,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Dynamic agent endpoints - simple approach (requires auth)
    this.app.all('/api/agent/:agentPath', this.requireAuth.bind(this), (req, res) => {
      const agentPath = '/' + req.params.agentPath;
      const method = req.method.toLowerCase();
      
      // Find agent with matching trigger
      for (const [id, agent] of this.agents.entries()) {
        const trigger = agent.ast.trigger;
        if (trigger.type === 'http' && 
            trigger.method?.toLowerCase() === method &&
            trigger.path === agentPath) {
          
          req.params.id = id;
          return this.executeAgentEndpoint(req, res);
        }
      }
      
      res.status(404).json({
        error: 'No agent found for this endpoint',
        path: agentPath,
        method: method.toUpperCase(),
      });
    });

    // Catch all
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
      });
    });
  }

  async executeAgentEndpoint(req, res) {
    const { id } = req.params;
    const input = { ...req.body, ...req.query };
    
    const agent = this.agents.get(id);
    try {
      const result = await this.orchestrator.execute(agent.ast, input);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: error.message,
        agent: id,
      });
    }
  }

  loadAgents() {
    const fs = require('fs');
    const path = require('path');
    
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
          validation.errors.forEach(error => console.error(`  ${error}`));
          continue;
        }

        this.agents.set(ast.id, {
          ast,
          file: filePath,
          loadedAt: new Date().toISOString(),
        });
        
        console.success(`Loaded agent: ${ast.id} (${file})`);
      } catch (error) {
        console.error(`Failed to load ${file}: ${error.message}`);
      }
    }
    
    console.info(`Total agents loaded: ${this.agents.size}`);
    console.endSection();
  }

  start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, '0.0.0.0', () => {
        console.header('AAAB Server Started', 'Agent as a Backend HTTP Server');
        console.success(`Server running on http://0.0.0.0:${this.port}`);
        console.info(`Agents directory: ${this.agentsDir}`);
        console.info(`Loaded agents: ${this.agents.size}`);
        console.info(`Authentication: ${this.enableAuth ? 'Enabled' : 'Disabled'}`);
        console.info('');
        console.info('Available endpoints:');
        console.info('• GET  /health           - Health check');
        console.info('• POST /api/auth/login   - Authentication');
        console.info('• GET  /api/agents       - List all agents');
        console.info('• POST /api/agents/:id/execute - Execute agent by ID');
        console.info('• POST /api/agents/reload      - Reload all agents');
        console.info('');
        
        if (this.enableAuth) {
          console.info('Authentication required for API endpoints');
          console.info('Use X-API-Key header or Bearer token');
        }
        
        // List dynamic endpoints
        for (const [id, agent] of this.agents.entries()) {
          const trigger = agent.ast.trigger;
          if (trigger.type === 'http') {
            console.info(`• ${trigger.method || 'POST'} /api/agent${trigger.path || '/' + id} - ${id}`);
          }
        }
        
        console.endSection();
        resolve();
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(resolve);
      } else {
        resolve();
      }
    });
  }
}

module.exports = AABBServer;