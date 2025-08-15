const fs = require('fs');
const path = require('path');
const logger = require('../diagnostics/logger');

class AgentLister {
  findAgentFiles(directory = '.', recursive = false) {
    logger.debug(`Searching for .agent files in: ${directory} (recursive: ${recursive})`);
    
    const agentFiles = [];
    
    try {
      this.searchDirectory(directory, agentFiles, recursive);
    } catch (error) {
      logger.error(`Error searching directory: ${error.message}`);
      throw error;
    }

    logger.debug(`Found ${agentFiles.length} .agent files`);
    return agentFiles.sort();
  }

  searchDirectory(dir, results, recursive) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip common directories that shouldn't contain .agent files
        if (this.shouldSkipDirectory(entry.name)) {
          continue;
        }

        if (recursive) {
          this.searchDirectory(fullPath, results, recursive);
        }
      } else if (entry.isFile() && entry.name.endsWith('.agent')) {
        results.push(fullPath);
      }
    }
  }

  shouldSkipDirectory(dirName) {
    const skipDirs = [
      'node_modules',
      '.git',
      '.vscode',
      'dist',
      'build',
      'coverage',
      '.nyc_output',
      'tmp',
      'temp',
    ];

    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  getAgentInfo(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const parser = require('../parser/parser');
      const ast = parser.parse(content);

      return {
        file: filePath,
        id: ast.id,
        version: ast.version,
        trigger: ast.trigger,
        steps: ast.steps.length,
        size: fs.statSync(filePath).size,
        modified: fs.statSync(filePath).mtime,
      };
    } catch (error) {
      logger.warn(`Could not parse agent file ${filePath}: ${error.message}`);
      return {
        file: filePath,
        id: 'INVALID',
        version: 'N/A',
        trigger: null,
        steps: 0,
        size: fs.statSync(filePath).size,
        modified: fs.statSync(filePath).mtime,
        error: error.message,
      };
    }
  }

  listWithDetails(directory = '.', recursive = false) {
    const files = this.findAgentFiles(directory, recursive);
    return files.map(file => this.getAgentInfo(file));
  }
}

module.exports = new AgentLister();
