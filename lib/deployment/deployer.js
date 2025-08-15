const fs = require('fs');
const path = require('path');
const console = require('../utils/console');

class AABBDeployer {
  constructor() {
    this.deploymentStrategies = {
      replit: new ReplitDeployment(),
      docker: new DockerDeployment(),
      serverless: new ServerlessDeployment(),
      kubernetes: new KubernetesDeployment()
    };
  }

  async deploy(strategy, options = {}) {
    console.header(`Deploying AAAB Application`, `Strategy: ${strategy}`);
    
    const deployer = this.deploymentStrategies[strategy];
    if (!deployer) {
      throw new Error(`Unknown deployment strategy: ${strategy}`);
    }

    return await deployer.deploy(options);
  }

  generateDockerfile(options = {}) {
    const nodeVersion = options.nodeVersion || '18-alpine';
    const port = options.port || 5000;
    
    return `FROM node:${nodeVersion}

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create agents directory
RUN mkdir -p agents

# Expose port
EXPOSE ${port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:${port}/health || exit 1

# Start application
CMD ["npm", "run", "serve"]
`;
  }

  generateK8sManifest(options = {}) {
    const appName = options.appName || 'aaab-app';
    const image = options.image || 'aaab:latest';
    const replicas = options.replicas || 2;
    const port = options.port || 5000;

    return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${appName}
  labels:
    app: ${appName}
spec:
  replicas: ${replicas}
  selector:
    matchLabels:
      app: ${appName}
  template:
    metadata:
      labels:
        app: ${appName}
    spec:
      containers:
      - name: ${appName}
        image: ${image}
        ports:
        - containerPort: ${port}
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "${port}"
        livenessProbe:
          httpGet:
            path: /health
            port: ${port}
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: ${port}
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: ${appName}-service
spec:
  selector:
    app: ${appName}
  ports:
  - protocol: TCP
    port: 80
    targetPort: ${port}
  type: LoadBalancer
`;
  }

  generateServerlessConfig(options = {}) {
    const functionName = options.functionName || 'aaab-function';
    const runtime = options.runtime || 'nodejs18.x';

    return {
      service: functionName,
      provider: {
        name: 'aws',
        runtime: runtime,
        environment: {
          NODE_ENV: 'production'
        }
      },
      functions: {
        app: {
          handler: 'serverless.handler',
          events: [
            {
              http: {
                path: '/{proxy+}',
                method: 'ANY',
                cors: true
              }
            }
          ]
        }
      }
    };
  }
}

class ReplitDeployment {
  async deploy(options) {
    console.section('Replit Deployment');
    
    // Generate Replit-specific files
    const replitConfig = {
      run: "node bin/aaab.js serve",
      language: "nodejs",
      entrypoint: "bin/aaab.js"
    };

    fs.writeFileSync('.replit', Object.entries(replitConfig)
      .map(([key, value]) => `${key} = "${value}"`)
      .join('\n'));

    console.success('Generated .replit configuration');
    console.info('Ready for Replit deployment');
    console.info('Click the "Deploy" button in Replit to go live!');
    
    return { status: 'ready', platform: 'replit' };
  }
}

class DockerDeployment {
  async deploy(options) {
    console.section('Docker Deployment');
    
    const deployer = new AABBDeployer();
    const dockerfile = deployer.generateDockerfile(options);
    
    fs.writeFileSync('Dockerfile', dockerfile);
    console.success('Generated Dockerfile');
    
    // Generate docker-compose.yml
    const dockerCompose = `version: '3.8'
services:
  aaab:
    build: .
    ports:
      - "${options.port || 5000}:${options.port || 5000}"
    environment:
      - NODE_ENV=production
    volumes:
      - ./agents:/app/agents:ro
    restart: unless-stopped
`;
    
    fs.writeFileSync('docker-compose.yml', dockerCompose);
    console.success('Generated docker-compose.yml');
    
    console.info('Build and run with:');
    console.info('• docker build -t aaab .');
    console.info('• docker run -p 5000:5000 aaab');
    console.info('Or use: docker-compose up');
    
    return { status: 'ready', platform: 'docker' };
  }
}

class ServerlessDeployment {
  async deploy(options) {
    console.section('Serverless Deployment');
    
    const deployer = new AABBDeployer();
    const config = deployer.generateServerlessConfig(options);
    
    fs.writeFileSync('serverless.yml', JSON.stringify(config, null, 2));
    console.success('Generated serverless.yml');
    
    // Generate serverless handler
    const handler = `const serverless = require('serverless-http');
const AABBServer = require('./lib/server/express-server');

const server = new AABBServer();
module.exports.handler = serverless(server.app);
`;
    
    fs.writeFileSync('serverless.js', handler);
    console.success('Generated serverless handler');
    
    console.info('Deploy with:');
    console.info('• npm install -g serverless');
    console.info('• serverless deploy');
    
    return { status: 'ready', platform: 'serverless' };
  }
}

class KubernetesDeployment {
  async deploy(options) {
    console.section('Kubernetes Deployment');
    
    const deployer = new AABBDeployer();
    const manifest = deployer.generateK8sManifest(options);
    
    fs.writeFileSync('k8s-manifest.yml', manifest);
    console.success('Generated Kubernetes manifest');
    
    console.info('Deploy with:');
    console.info('• kubectl apply -f k8s-manifest.yml');
    console.info('• kubectl get pods -l app=' + (options.appName || 'aaab-app'));
    
    return { status: 'ready', platform: 'kubernetes' };
  }
}

module.exports = AABBDeployer;