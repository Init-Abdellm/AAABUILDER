const logger = require('../diagnostics/logger');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

class EnvironmentDoctor {
  checkEnvironment() {
    logger.debug('Running environment checks');
    
    const checks = [
      this.checkNodeVersion(),
      this.checkNpmPackages(),
      this.checkEnvironmentVariables(),
      this.checkFilePermissions(),
      this.checkAgentFiles(),
      this.checkProviderConnectivity()
    ];

    return checks.flat();
  }

  checkNodeVersion() {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    return {
      category: 'Runtime',
      check: 'Node.js Version',
      status: majorVersion >= 14,
      message: majorVersion >= 14 
        ? `Node.js ${nodeVersion} (✓ Compatible)`
        : `Node.js ${nodeVersion} (⚠ Requires Node.js 14+)`,
      details: majorVersion >= 14 ? null : 'Please upgrade to Node.js 14 or higher'
    };
  }

  checkNpmPackages() {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    
    const checks = [];
    
    // Check if package.json exists
    checks.push({
      category: 'Dependencies',
      check: 'package.json',
      status: fs.existsSync(packageJsonPath),
      message: fs.existsSync(packageJsonPath) 
        ? 'package.json found'
        : 'package.json not found',
      details: fs.existsSync(packageJsonPath) ? null : 'Run npm init to create package.json'
    });

    // Check if node_modules exists
    checks.push({
      category: 'Dependencies',
      check: 'node_modules',
      status: fs.existsSync(nodeModulesPath),
      message: fs.existsSync(nodeModulesPath) 
        ? 'Dependencies installed'
        : 'Dependencies not installed',
      details: fs.existsSync(nodeModulesPath) ? null : 'Run npm install to install dependencies'
    });

    return checks;
  }

  checkEnvironmentVariables() {
    const requiredEnvVars = [
      { name: 'OPENAI_KEY', required: false, description: 'OpenAI API key' },
      { name: 'HUGGINGFACE_KEY', required: false, description: 'Hugging Face API key' },
      { name: 'GEMINI_KEY', required: false, description: 'Google Gemini API key' },
      { name: 'OLLAMA_HOST', required: false, description: 'Ollama server host' },
      { name: 'LLAMA_HOST', required: false, description: 'LLaMA server host' }
    ];

    const checks = [];

    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar.name];
      const isSet = !!value;
      
      checks.push({
        category: 'Environment',
        check: envVar.name,
        status: !envVar.required || isSet,
        message: isSet 
          ? `${envVar.name} is set`
          : `${envVar.name} is not set`,
        details: !isSet ? `${envVar.description} - Set in .env file or environment` : null
      });
    }

    return checks;
  }

  checkFilePermissions() {
    const testPaths = [
      { path: '.', description: 'Current directory' },
      { path: './examples', description: 'Examples directory' }
    ];

    const checks = [];

    for (const testPath of testPaths) {
      try {
        const stats = fs.statSync(testPath.path);
        const readable = fs.constants.R_OK;
        const writable = fs.constants.W_OK;
        
        let hasPermissions = true;
        let permissionDetails = [];

        try {
          fs.accessSync(testPath.path, readable);
        } catch {
          hasPermissions = false;
          permissionDetails.push('not readable');
        }

        try {
          fs.accessSync(testPath.path, writable);
        } catch {
          hasPermissions = false;
          permissionDetails.push('not writable');
        }

        checks.push({
          category: 'Permissions',
          check: `${testPath.description} access`,
          status: hasPermissions,
          message: hasPermissions 
            ? `${testPath.description} accessible`
            : `${testPath.description} ${permissionDetails.join(', ')}`,
          details: hasPermissions ? null : 'Check file/directory permissions'
        });
      } catch (error) {
        checks.push({
          category: 'Permissions',
          check: `${testPath.description} access`,
          status: false,
          message: `${testPath.description} not accessible`,
          details: error.message
        });
      }
    }

    return checks;
  }

  checkAgentFiles() {
    const examplesDir = './examples';
    const checks = [];

    if (fs.existsSync(examplesDir)) {
      try {
        const files = fs.readdirSync(examplesDir);
        const agentFiles = files.filter(f => f.endsWith('.agent'));
        
        checks.push({
          category: 'Agent Files',
          check: 'Example files',
          status: agentFiles.length > 0,
          message: `Found ${agentFiles.length} example .agent file(s)`,
          details: agentFiles.length === 0 ? 'No example .agent files found' : null
        });

        // Try to parse each agent file
        for (const agentFile of agentFiles.slice(0, 3)) { // Check first 3 files
          try {
            const content = fs.readFileSync(path.join(examplesDir, agentFile), 'utf8');
            const parser = require('../parser/parser');
            parser.parse(content);
            
            checks.push({
              category: 'Agent Files',
              check: `Parse ${agentFile}`,
              status: true,
              message: `${agentFile} parses successfully`,
              details: null
            });
          } catch (error) {
            checks.push({
              category: 'Agent Files',
              check: `Parse ${agentFile}`,
              status: false,
              message: `${agentFile} has parsing errors`,
              details: error.message
            });
          }
        }
      } catch (error) {
        checks.push({
          category: 'Agent Files',
          check: 'Examples directory',
          status: false,
          message: 'Cannot read examples directory',
          details: error.message
        });
      }
    } else {
      checks.push({
        category: 'Agent Files',
        check: 'Examples directory',
        status: false,
        message: 'Examples directory not found',
        details: 'Create examples/ directory with sample .agent files'
      });
    }

    return checks;
  }

  checkProviderConnectivity() {
    // This is a basic connectivity check - in a real implementation,
    // you might want to make actual test calls to the providers
    const checks = [];
    
    const providers = [
      { name: 'OpenAI', host: 'api.openai.com', envVar: 'OPENAI_KEY' },
      { name: 'Hugging Face', host: 'api-inference.huggingface.co', envVar: 'HUGGINGFACE_KEY' },
      { name: 'Ollama', host: process.env.OLLAMA_HOST || 'localhost:11434', envVar: null },
      { name: 'LLaMA', host: process.env.LLAMA_HOST || 'localhost:8080', envVar: null }
    ];

    for (const provider of providers) {
      const hasKey = !provider.envVar || !!process.env[provider.envVar];
      
      checks.push({
        category: 'Providers',
        check: `${provider.name} setup`,
        status: hasKey,
        message: hasKey 
          ? `${provider.name} configured`
          : `${provider.name} not configured`,
        details: hasKey ? null : `Set ${provider.envVar} environment variable`
      });
    }

    return checks;
  }

  printResults(results) {
    console.log(chalk.blue.bold('\nAAB Environment Check\n'));
    console.log('=' .repeat(50));

    const categories = [...new Set(results.map(r => r.category))];
    
    for (const category of categories) {
      console.log(chalk.yellow.bold(`\n${category}:`));
      
      const categoryResults = results.filter(r => r.category === category);
      
      for (const result of categoryResults) {
        const status = result.status 
          ? chalk.green('✓') 
          : chalk.red('✗');
        
        console.log(`  ${status} ${result.check}: ${result.message}`);
        
        if (result.details) {
          console.log(chalk.gray(`    ${result.details}`));
        }
      }
    }

    // Summary
    const total = results.length;
    const passed = results.filter(r => r.status).length;
    const failed = total - passed;

    console.log(chalk.blue.bold('\nSummary:'));
    console.log(`  Total checks: ${total}`);
    console.log(`  ${chalk.green('Passed')}: ${passed}`);
    console.log(`  ${chalk.red('Failed')}: ${failed}`);

    if (failed === 0) {
      console.log(chalk.green('\n✅ All checks passed! Your environment is ready.'));
    } else {
      console.log(chalk.yellow('\n⚠️  Some checks failed. See details above.'));
    }
  }
}

module.exports = new EnvironmentDoctor();
