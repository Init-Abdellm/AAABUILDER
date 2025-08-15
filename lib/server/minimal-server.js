const express = require('express');
const console = require('../utils/console');

class MinimalAABBServer {
  constructor(options = {}) {
    this.app = express();
    this.port = options.port || 5000;
    this.setupRoutes();
  }

  setupRoutes() {
    this.app.use(express.json());
    
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    this.app.get('/', (req, res) => {
      res.json({ 
        message: 'AAAB Framework - Agent as a Backend',
        version: '1.0.0',
        endpoints: ['/health', '/api/status'],
      });
    });

    this.app.get('/api/status', (req, res) => {
      res.json({ 
        framework: 'AAAB',
        status: 'running',
        timestamp: new Date().toISOString(),
      });
    });
  }

  async start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, '0.0.0.0', () => {
        console.header('AAAB Minimal Server Started', 'HTTP Server');
        console.success(`Server running on http://0.0.0.0:${this.port}`);
        console.info('Available endpoints:');
        console.info('• GET  /              - Welcome message');
        console.info('• GET  /health        - Health check');
        console.info('• GET  /api/status    - API status');
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

module.exports = MinimalAABBServer;