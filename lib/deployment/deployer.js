const fs = require('fs');
const _path = require('path');
const console = require('../utils/console');

class AABBDeployer {
  constructor() {
    this.deploymentStrategies = {
      replit: new ReplitDeployment(),
      docker: new DockerDeployment(),
      serverless: new ServerlessDeployment(),
      kubernetes: new KubernetesDeployment(),
    };
  }

  async deploy(strategy, options = {}) {
    console.header('Deploying AAAB Application', `Strategy: ${strategy}`);
    
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

# Set working directory
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create agents directory
RUN mkdir -p agents

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \\
    adduser -S aaab -u 1001

# Change ownership of the app directory
RUN chown -R aaab:nodejs /app
USER aaab

# Expose port
EXPOSE ${port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:${port}/health || exit 1

# Start application
CMD ["npm", "start"]
`;
  }

  generatePackageJson(options = {}) {
    const port = options.port || 5000;
    
    return {
      name: options.appName || 'aaab-app',
      version: '1.0.0',
      description: 'AAAB Agent Application',
      main: 'bin/aaab.js',
      scripts: {
        start: `node bin/aaab.js serve --port ${port}`,
        serve: `node bin/aaab.js serve --port ${port}`,
        dev: `node bin/aaab.js serve --port ${port} --watch`,
        test: 'echo "No tests specified" && exit 0',
      },
      dependencies: {
        'ajv': '^8.17.1',
        'ajv-formats': '^3.0.1',
        'chalk': '^4.1.2',
        'chokidar': '^4.0.3',
        'commander': '^14.0.0',
        'cors': '^2.8.5',
        'express': '^5.1.0',
        'express-rate-limit': '^8.0.1',
        'helmet': '^8.1.0',
        'morgan': '^1.10.1',
        'openai': '^4.28.0',
        '@google/generative-ai': '^0.21.0',
        'jsonwebtoken': '^9.0.2',
        'bcryptjs': '^2.4.3',
        'dotenv': '^16.4.1',
      },
      engines: {
        node: '>=18.0.0',
      },
    };
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
        - name: AAAB_ENCRYPTION_KEY
          valueFrom:
            secretKeyRef:
              name: ${appName}-secrets
              key: encryption-key
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: ${appName}-secrets
              key: openai-api-key
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
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
---
apiVersion: v1
kind: Secret
metadata:
  name: ${appName}-secrets
type: Opaque
data:
  encryption-key: <base64-encoded-encryption-key>
  openai-api-key: <base64-encoded-openai-key>
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
          NODE_ENV: 'production',
          AAAB_ENCRYPTION_KEY: '${env:AAAB_ENCRYPTION_KEY}',
          OPENAI_API_KEY: '${env:OPENAI_API_KEY}',
        },
        iam: {
          role: {
            statements: [
              {
                Effect: 'Allow',
                Action: [
                  'logs:CreateLogGroup',
                  'logs:CreateLogStream',
                  'logs:PutLogEvents',
                ],
                Resource: 'arn:aws:logs:*:*:*',
              },
            ],
          },
        },
      },
      functions: {
        app: {
          handler: 'serverless.handler',
          events: [
            {
              http: {
                path: '/{proxy+}',
                method: 'ANY',
                cors: true,
              },
            },
          ],
          environment: {
            AAAB_ENCRYPTION_KEY: '${env:AAAB_ENCRYPTION_KEY}',
            OPENAI_API_KEY: '${env:OPENAI_API_KEY}',
          },
        },
      },
    };
  }

  generateRailwayConfig(options = {}) {
    return {
      build: {
        builder: 'nixpacks',
      },
      deploy: {
        startCommand: 'npm start',
        healthcheckPath: '/health',
        healthcheckTimeout: 300,
        restartPolicyType: 'ON_FAILURE',
        restartPolicyMaxRetries: 10,
      },
    };
  }

  generateVercelConfig(options = {}) {
    return {
      version: 2,
      builds: [
        {
          src: 'bin/aaab.js',
          use: '@vercel/node',
        },
      ],
      routes: [
        {
          src: '/(.*)',
          dest: '/bin/aaab.js',
        },
      ],
      env: {
        NODE_ENV: 'production',
      },
    };
  }
}

class ReplitDeployment {
  async deploy(_options) {
    console.section('Replit Deployment');
    
    // Generate Replit-specific files
    const replitConfig = {
      run: 'npm start',
      language: 'nodejs',
      entrypoint: 'bin/aaab.js',
    };

    fs.writeFileSync('.replit', Object.entries(replitConfig)
      .map(([key, value]) => `${key} = "${value}"`)
      .join('\n'));

    // Generate replit.nix for dependencies
    const replitNix = `{ pkgs }: {
  deps = [
    pkgs.nodejs-18_x
    pkgs.nodePackages.npm
  ];
}`;
    
    fs.writeFileSync('replit.nix', replitNix);

    console.success('Generated .replit configuration');
    console.success('Generated replit.nix for dependencies');
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
    const packageJson = deployer.generatePackageJson(options);
    
    fs.writeFileSync('Dockerfile', dockerfile);
    console.success('Generated Dockerfile');
    
    // Update package.json with proper scripts
    if (fs.existsSync('package.json')) {
      const existingPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      existingPackage.scripts = { ...existingPackage.scripts, ...packageJson.scripts };
      fs.writeFileSync('package.json', JSON.stringify(existingPackage, null, 2));
      console.success('Updated package.json with deployment scripts');
    } else {
      fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
      console.success('Generated package.json');
    }
    
    // Generate docker-compose.yml
    const dockerCompose = `version: '3.8'
services:
  aaab:
    build: .
    ports:
      - "${options.port || 5000}:${options.port || 5000}"
    environment:
      - NODE_ENV=production
      - PORT=${options.port || 5000}
      - AAAB_ENCRYPTION_KEY=${process.env.AAAB_ENCRYPTION_KEY || 'your-encryption-key'}
      - OPENAI_API_KEY=${process.env.OPENAI_API_KEY || ''}
    volumes:
      - ./agents:/app/agents:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:${options.port || 5000}/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
`;
    
    fs.writeFileSync('docker-compose.yml', dockerCompose);
    console.success('Generated docker-compose.yml');
    
    // Generate .dockerignore
    const dockerignore = `node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.aaab-secrets
*.log
.DS_Store
`;
    
    fs.writeFileSync('.dockerignore', dockerignore);
    console.success('Generated .dockerignore');
    
    console.info('Build and run with:');
    console.info('• docker build -t aaab .');
    console.info('• docker run -p 5000:5000 -e OPENAI_API_KEY=your-key aaab');
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

const server = new AABBServer({
  port: process.env.PORT || 5000,
  enableAuth: false, // Disable auth for serverless
  cors: {
    origin: '*',
    credentials: false
  }
});

module.exports.handler = serverless(server.app);
`;
    
    fs.writeFileSync('serverless.js', handler);
    console.success('Generated serverless handler');
    
    // Generate package.json for serverless
    const serverlessPackage = {
      name: 'aaab-serverless',
      version: '1.0.0',
      main: 'serverless.js',
      dependencies: {
        'serverless-http': '^3.2.0',
      },
    };
    
    fs.writeFileSync('serverless-package.json', JSON.stringify(serverlessPackage, null, 2));
    console.success('Generated serverless-package.json');
    
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
    
    // Generate deployment script
    const deployScript = `#!/bin/bash
# AAAB Kubernetes Deployment Script

echo "Building Docker image..."
docker build -t ${options.image || 'aaab:latest'} .

echo "Creating Kubernetes secrets..."
kubectl create secret generic ${options.appName || 'aaab-app'}-secrets \\
  --from-literal=encryption-key="${process.env.AAAB_ENCRYPTION_KEY || 'your-key'}" \\
  --from-literal=openai-api-key="${process.env.OPENAI_API_KEY || ''}" \\
  --dry-run=client -o yaml | kubectl apply -f -

echo "Deploying to Kubernetes..."
kubectl apply -f k8s-manifest.yml

echo "Checking deployment status..."
kubectl get pods -l app=${options.appName || 'aaab-app'}

echo "Deployment complete!"
`;
    
    fs.writeFileSync('deploy-k8s.sh', deployScript);
    fs.chmodSync('deploy-k8s.sh', '755');
    console.success('Generated deploy-k8s.sh script');
    
    console.info('Deploy with:');
    console.info('• chmod +x deploy-k8s.sh');
    console.info('• ./deploy-k8s.sh');
    console.info('Or manually: kubectl apply -f k8s-manifest.yml');
    
    return { status: 'ready', platform: 'kubernetes' };
  }
}

module.exports = AABBDeployer;