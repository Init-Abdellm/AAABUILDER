const logger = require('../diagnostics/logger');

/**
 * Parse .agent file content into AST-like JSON structure
 */
class AgentParser {
  parse(content) {
    logger.debug('Parsing agent file content');
    
    // Detect format based on content
    if (this.isNewFormat(content)) {
      return this.parseNewFormat(content);
    } else {
      return this.parseOldFormat(content);
    }
  }

  isNewFormat(content) {
    // New format has structured YAML-like syntax with colons and dashes
    return content.includes('description:') || 
           content.includes('secrets:') ||
           content.includes('vars:') ||
           content.includes('steps:') ||
           content.includes('outputs:');
  }

  parseNewFormat(content) {
    logger.debug('Parsing new format agent file');
    
    const lines = content.split('\n').map(line => line.trim());
    const ast = {
      id: null,
      version: null,
      description: null,
      trigger: null,
      secrets: {},
      vars: {},
      steps: [],
      outputs: null,
    };

    let currentSection = null;
    let currentStep = null;
    let inPrompt = false;
    let promptLines = [];
    let promptIndent = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (!line || line.startsWith('#')) continue;

      if (line.startsWith('@agent')) {
        const match = line.match(/@agent\s+(\S+)\s+v(\d+)/);
        if (!match) {
          throw new Error(`Invalid @agent declaration at line ${i + 1}: ${line}`);
        }
        ast.id = match[1];
        ast.version = parseInt(match[2]);
      }
      
      else if (line.startsWith('description:')) {
        ast.description = line.substring('description:'.length).trim().replace(/^["']|["']$/g, '');
      }
      
      else if (line.startsWith('trigger:')) {
        currentSection = 'trigger';
        // Parse trigger on next line
        if (i + 1 < lines.length && lines[i + 1].includes('type:')) {
          const triggerLine = lines[i + 1];
          const typeMatch = triggerLine.match(/type:\s*(\w+)/);
          const methodMatch = triggerLine.match(/method:\s*(\w+)/);
          const pathMatch = triggerLine.match(/path:\s*(\S+)/);
          
          ast.trigger = {
            type: typeMatch ? typeMatch[1] : 'http',
            method: methodMatch ? methodMatch[1] : 'POST',
            path: pathMatch ? pathMatch[1] : `/${ast.id}`,
          };
          i++; // Skip next line since we processed it
        }
      }
      
      else if (line.startsWith('secrets:')) {
        currentSection = 'secrets';
      }
      
      else if (line.startsWith('vars:')) {
        currentSection = 'vars';
      }
      
      else if (line.startsWith('steps:')) {
        currentSection = 'steps';
      }
      
      else if (line.startsWith('outputs:')) {
        currentSection = 'outputs';
      }
      
      else if (line === '@end') {
        if (currentStep) {
          ast.steps.push(currentStep);
        }
        break;
      }
      
      else if (currentSection === 'secrets' && line.startsWith('-')) {
        // Parse secret: - name: OPENAI
        const secretMatch = line.match(/name:\s*(\w+)/);
        const typeMatch = lines[i + 1]?.match(/type:\s*(\w+)/);
        const valueMatch = lines[i + 1]?.match(/value:\s*(\w+)/);
        
        if (secretMatch) {
          const secretName = secretMatch[1];
          const secretType = typeMatch ? typeMatch[1] : 'env';
          const secretValue = valueMatch ? valueMatch[1] : `${secretName}_API_KEY`;
          
          ast.secrets[secretName] = { 
            type: secretType, 
            value: secretValue, 
          };
          
          if (lines[i + 1]?.includes('type:') || lines[i + 1]?.includes('value:')) {
            i++; // Skip next line
          }
        }
      }
      
      else if (currentSection === 'vars' && line.includes(':')) {
        // Handle root-level vars like "message: type: string"
        const colonIndex = line.indexOf(':');
        if (colonIndex !== -1) {
          const varName = line.substring(0, colonIndex).trim();
          
          // Only process if this looks like a variable name (not a property)
          if (varName && varName !== 'type' && varName !== 'from' && varName !== 'required') {
            // Look ahead to find the type, from, and required properties
            let varType = 'string';
            let varFrom = 'input';
            let varRequired = false;
            
            let nextLineIndex = i + 1;
            while (nextLineIndex < lines.length && 
                   !lines[nextLineIndex].startsWith('-') &&
                   !lines[nextLineIndex].startsWith('steps:') &&
                   !lines[nextLineIndex].startsWith('outputs:')) {
              const nextLine = lines[nextLineIndex];
              if (nextLine.includes('type:')) {
                const typeMatch = nextLine.match(/type:\s*(\w+)/);
                varType = typeMatch ? typeMatch[1] : 'string';
              } else if (nextLine.includes('from:')) {
                const fromMatch = nextLine.match(/from:\s*(\w+)/);
                varFrom = fromMatch ? fromMatch[1] : 'input';
              } else if (nextLine.includes('required:')) {
                const requiredMatch = nextLine.match(/required:\s*(true|false)/);
                varRequired = requiredMatch ? requiredMatch[1] === 'true' : false;
              } else if (nextLine.includes(':')) {
                // This might be another variable, stop here
                break;
              }
              nextLineIndex++;
            }
            
            ast.vars[varName] = {
              type: varType,
              from: varFrom,
              required: varRequired,
            };
            
            // Skip the lines we processed
            i = nextLineIndex - 1;
          }
        }
      }
      
      else if (currentSection === 'steps' && line.startsWith('-')) {
        if (currentStep) {
          ast.steps.push(currentStep);
        }
        
        // Parse step: - id: respond
        const stepMatch = line.match(/id:\s*(\w+)/);
        if (stepMatch) {
          currentStep = {
            id: stepMatch[1],
            retries: 0,
            timeout_ms: 60000,
          };
          
          // Parse step properties on next lines
          let j = i + 1;
          while (j < lines.length && !lines[j].startsWith('-')) {
            const propLine = lines[j];
            
            // Check if this is a root-level section (not a step property)
            if (propLine === 'outputs:' || propLine === 'vars:' || propLine === 'secrets:') {
              // Only treat as root-level if we're not currently parsing a step
              if (currentStep && currentStep.id) {
                // Found step-level section, continue parsing
                console.log('DEBUG: Found step-level section:', propLine);
              } else {
                console.log('DEBUG: Found root-level section:', propLine);
                break;
              }
            }
            
            // Check if this is a step property line (indented or at same level as step)
            if (propLine.startsWith('  ') || propLine.startsWith('    ') || propLine.includes(':')) {
              if (propLine.includes('type:') || propLine.includes('kind:')) {
                const typeMatch = propLine.match(/(?:type|kind):\s*(\w+)/);
                currentStep.kind = typeMatch ? typeMatch[1] : 'llm';
              } else if (propLine.includes('provider:')) {
                const providerMatch = propLine.match(/provider:\s*(\w+)/);
                currentStep.provider = providerMatch ? providerMatch[1] : 'openai';
              } else if (propLine.includes('model:')) {
                const modelMatch = propLine.match(/model:\s*(.+)/);
                currentStep.model = modelMatch ? modelMatch[1].trim() : 'gpt-4o';
              } else if (propLine.includes('input:')) {
                const inputMatch = propLine.match(/input:\s*(.+)/);
                currentStep.input = inputMatch ? inputMatch[1].trim() : '';
              } else if (propLine.includes('operation:')) {
                const operationMatch = propLine.match(/operation:\s*(\w+)/);
                currentStep.operation = operationMatch ? operationMatch[1] : '';
              } else if (propLine.includes('backend:')) {
                const backendMatch = propLine.match(/backend:\s*(.+)/);
                currentStep.backend = backendMatch ? backendMatch[1].trim() : '';
              } else if (propLine.includes('collection:')) {
                const collectionMatch = propLine.match(/collection:\s*(.+)/);
                currentStep.collection = collectionMatch ? collectionMatch[1].trim() : '';
              } else if (propLine.includes('query:')) {
                const queryMatch = propLine.match(/query:\s*(.+)/);
                currentStep.query = queryMatch ? queryMatch[1].trim() : '';
              } else if (propLine.includes('topK:')) {
                const topKMatch = propLine.match(/topK:\s*(\d+)/);
                currentStep.topK = topKMatch ? parseInt(topKMatch[1]) : 5;
              } else if (propLine.includes('filter:')) {
                // Handle filter object
                currentStep.filter = {};
              } else if (propLine.includes('documents:')) {
                // Handle documents array
                currentStep.documents = [];
              } else if (propLine.includes('embeddings:')) {
                // Handle embeddings array
                currentStep.embeddings = [];
              } else if (propLine.includes('config:')) {
                // Handle config object
                currentStep.config = {};
              } else if (propLine.includes('jobId:')) {
                const jobIdMatch = propLine.match(/jobId:\s*(.+)/);
                currentStep.jobId = jobIdMatch ? jobIdMatch[1].trim() : '';
              } else if (propLine.includes('limit:')) {
                const limitMatch = propLine.match(/limit:\s*(\d+)/);
                currentStep.limit = limitMatch ? parseInt(limitMatch[1]) : 100;
              } else if (propLine.includes('filePath:')) {
                const filePathMatch = propLine.match(/filePath:\s*(.+)/);
                currentStep.filePath = filePathMatch ? filePathMatch[1].trim() : '';
              } else if (propLine.includes('format:')) {
                const formatMatch = propLine.match(/format:\s*(\w+)/);
                currentStep.format = formatMatch ? formatMatch[1] : 'jsonl';
              } else if (propLine.includes('text:')) {
                const textMatch = propLine.match(/text:\s*(.+)/);
                currentStep.text = textMatch ? textMatch[1].trim() : '';
              } else if (propLine.includes('audio:')) {
                const audioMatch = propLine.match(/audio:\s*(.+)/);
                currentStep.audio = audioMatch ? audioMatch[1].trim() : '';
              } else if (propLine.includes('voice:')) {
                const voiceMatch = propLine.match(/voice:\s*(\w+)/);
                currentStep.voice = voiceMatch ? voiceMatch[1] : 'alloy';
              } else if (propLine.includes('outputPath:')) {
                const outputPathMatch = propLine.match(/outputPath:\s*(.+)/);
                currentStep.outputPath = outputPathMatch ? outputPathMatch[1].trim() : '';
              } else if (propLine.includes('function:')) {
                const functionMatch = propLine.match(/function:\s*(\w+)/);
                currentStep.function = functionMatch ? functionMatch[1] : '';
              } else if (propLine.includes('args:')) {
                // Handle args object
                currentStep.args = {};
              } else if (propLine.includes('when:')) {
                const whenMatch = propLine.match(/when:\s*(.+)/);
                currentStep.when = whenMatch ? whenMatch[1].trim() : '';
              } else if (propLine.includes('save:')) {
                const saveMatch = propLine.match(/save:\s*(\w+)/);
                currentStep.save = saveMatch ? saveMatch[1] : '';
              } else if (propLine.includes('retries:')) {
                const retriesMatch = propLine.match(/retries:\s*(\d+)/);
                currentStep.retries = retriesMatch ? parseInt(retriesMatch[1]) : 0;
              } else if (propLine.includes('timeout_ms:')) {
                const timeoutMatch = propLine.match(/timeout_ms:\s*(\d+)/);
                currentStep.timeout_ms = timeoutMatch ? parseInt(timeoutMatch[1]) : 60000;
              } else if (propLine.includes('prompt:')) {
                // Handle multi-line prompt
                if (propLine.includes('|')) {
                  // Pipe format: prompt: |
                  let promptStart = j + 1;
                  while (promptStart < lines.length && 
                         !lines[promptStart].startsWith('-') &&
                         !lines[promptStart].startsWith('outputs:') &&
                         !lines[promptStart].trim().startsWith('outputs:') &&
                         !lines[promptStart].includes('outputs:') &&
                         !lines[promptStart].match(/^\s*outputs:\s*$/) &&
                         !lines[promptStart].match(/^\s+outputs:\s*$/) &&
                         !lines[promptStart].match(/^\s{2,}outputs:\s*$/) &&
                         !lines[promptStart].match(/^\s{4,}outputs:\s*$/) &&
                         !lines[promptStart].match(/^\s{6,}outputs:\s*$/) &&
                         !lines[promptStart].match(/^\s{8,}outputs:\s*$/) &&
                         !lines[promptStart].match(/^\s{10,}outputs:\s*$/) &&
                         lines[promptStart].trim() !== '') {
                    promptLines.push(lines[promptStart].trim());
                    promptStart++;
                  }
                  currentStep.prompt = promptLines.join('\n');
                  promptLines = [];
                  j = promptStart - 1;
                  // Continue parsing step properties after prompt
                  continue;
                } else {
                  // Check if this is a multi-line prompt without pipe
                  const promptMatch = propLine.match(/prompt:\s*(.+)/);
                  if (promptMatch) {
                    const promptContent = promptMatch[1].trim();
                    
                    // If the prompt content is empty or just whitespace, it might be multi-line
                    if (!promptContent || promptContent === '') {
                      let promptStart = j + 1;
                      while (promptStart < lines.length && 
                             !lines[promptStart].startsWith('-') &&
                             !lines[promptStart].startsWith('outputs:') &&
                             !lines[promptStart].trim().startsWith('outputs:') &&
                             !lines[promptStart].includes('outputs:') &&
                             !lines[promptStart].match(/^\s*outputs:\s*$/) &&
                             !lines[promptStart].match(/^\s+outputs:\s*$/) &&
                             !lines[promptStart].match(/^\s{2,}outputs:\s*$/) &&
                             !lines[promptStart].match(/^\s{4,}outputs:\s*$/) &&
                             !lines[promptStart].match(/^\s{6,}outputs:\s*$/) &&
                             !lines[promptStart].match(/^\s{8,}outputs:\s*$/) &&
                             !lines[promptStart].match(/^\s{10,}outputs:\s*$/) &&
                             lines[promptStart].trim() !== '') {
                        promptLines.push(lines[promptStart].trim());
                        promptStart++;
                      }
                      currentStep.prompt = promptLines.join('\n');
                      promptLines = [];
                      j = promptStart - 1;
                      // Continue parsing step properties after prompt
                      continue;
                    } else {
                      // Single line prompt
                      currentStep.prompt = promptContent;
                    }
                  }
                }
              } else if (propLine.includes('outputs:')) {
                // Parse outputs
                let outputStart = j + 1;
                while (outputStart < lines.length && 
                       !lines[outputStart].startsWith('-') &&
                       !lines[outputStart].startsWith('steps:') &&
                       !lines[outputStart].startsWith('outputs:') &&
                       lines[outputStart].trim() !== '') {
                  const outputLine = lines[outputStart];
                  if (outputLine.includes(':')) {
                    const [key, value] = outputLine.split(':').map(s => s.trim());
                    if (!currentStep.outputs) currentStep.outputs = {};
                    currentStep.outputs[key] = value;
                    
                    // Map outputs to save field for compatibility with old schema
                    if (key === 'response' && value === 'content') {
                      currentStep.save = key;
                    }
                  }
                  outputStart++;
                }
                j = outputStart - 1;
                
                // After parsing step outputs, stop parsing step properties
                break;
              }
            } else if (propLine.trim() === '') {
              // Empty line, continue
            } else {
              // Not a property line, stop parsing
              break;
            }
            j++;
          }
          i = j - 1;
        }
      }
      
      else if (currentSection === 'outputs' && line.startsWith('-')) {
        // Parse output format
        const outputMatch = line.match(/result:\s*"([^"]+)"/);
        if (outputMatch) {
          ast.output = outputMatch[1];
        } else {
          // Handle other output formats
          const colonIndex = line.indexOf(':');
          if (colonIndex !== -1) {
            const key = line.substring(0, colonIndex).trim();
            const value = line.substring(colonIndex + 1).trim();
            if (key === 'result') {
              ast.output = value.replace(/^["']|["']$/g, '');
            }
          }
        }
      }
      
      else if (currentSection === 'outputs' && line.includes(':')) {
        // Handle root-level outputs like "result: {response}"
        const colonIndex = line.indexOf(':');
        if (colonIndex !== -1) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          if (key === 'result') {
            ast.output = value.replace(/^["']|["']$/g, '');
          }
        }
      }
      
      else if (currentStep) {
        if (line.includes('"""')) {
          if (inPrompt) {
            // End of prompt
            currentStep.prompt = promptLines.join('\n').trim();
            inPrompt = false;
            promptLines = [];
          } else {
            // Start of prompt
            inPrompt = true;
            promptIndent = line.substring(0, line.indexOf('"""'));
          }
        } else if (inPrompt) {
          // Inside prompt block
          let promptLine = line;
          if (line.startsWith(promptIndent)) {
            promptLine = line.substring(promptIndent.length);
          }
          promptLines.push(promptLine);
        } else {
          // Regular step property
          this.parseStepProperty(currentStep, line, i + 1);
        }
      }
    }

    this.validateRequiredFields(ast);
    this.cleanupAST(ast);
    return ast;
  }

  parseOldFormat(content) {
    logger.debug('Parsing old format agent file');
    
    const lines = content.split('\n').map(line => line.trim());
    const ast = {
      id: null,
      version: null,
      trigger: null,
      secrets: {},
      vars: {},
      steps: [],
      output: null,
    };

    let currentStep = null;
    let inPrompt = false;
    let promptLines = [];
    let promptIndent = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (!line || line.startsWith('#')) continue;

      if (line.startsWith('@agent')) {
        const match = line.match(/@agent\s+(\S+)\s+v(\d+)/);
        if (!match) {
          throw new Error(`Invalid @agent declaration at line ${i + 1}: ${line}`);
        }
        ast.id = match[1];
        ast.version = parseInt(match[2]);
      }
      
      else if (line.startsWith('trigger')) {
        const parts = line.split(/\s+/);
        ast.trigger = {
          type: parts[1],
          method: parts[2] || null,
          path: parts[3] || null,
        };
      }
      
      else if (line.startsWith('secret')) {
        const match = line.match(/secret\s+(\w+)=env:(\w+)/);
        if (!match) {
          throw new Error(`Invalid secret declaration at line ${i + 1}: ${line}`);
        }
        ast.secrets[match[1]] = { type: 'env', value: match[2] };
      }
      
      else if (line.startsWith('var')) {
        const match = line.match(/var\s+(\w+)\s*=\s*(.+)/);
        if (!match) {
          throw new Error(`Invalid var declaration at line ${i + 1}: ${line}`);
        }
        ast.vars[match[1]] = this.parseVarValue(match[2]);
      }
      
      else if (line.startsWith('step')) {
        if (currentStep) {
          ast.steps.push(currentStep);
        }
        const match = line.match(/step\s+(\w+):/);
        if (!match) {
          throw new Error(`Invalid step declaration at line ${i + 1}: ${line}`);
        }
        currentStep = {
          id: match[1],
          retries: 0,
          timeout_ms: 60000,
        };
      }
      
      else if (line.startsWith('output')) {
        const match = line.match(/output\s+(.+)/);
        if (!match) {
          throw new Error(`Invalid output declaration at line ${i + 1}: ${line}`);
        }
        ast.output = match[1];
      }
      
      else if (line === '@end') {
        if (currentStep) {
          ast.steps.push(currentStep);
          currentStep = null;
        }
        break;
      }
      
      else if (currentStep) {
        if (line.includes('"""')) {
          if (inPrompt) {
            // End of prompt
            currentStep.prompt = promptLines.join('\n').trim();
            inPrompt = false;
            promptLines = [];
          } else {
            // Start of prompt
            inPrompt = true;
            promptIndent = line.substring(0, line.indexOf('"""'));
          }
        } else if (inPrompt) {
          // Inside prompt block
          let promptLine = line;
          if (line.startsWith(promptIndent)) {
            promptLine = line.substring(promptIndent.length);
          }
          promptLines.push(promptLine);
        } else {
          // Regular step property
          this.parseStepProperty(currentStep, line, i + 1);
        }
      }
    }

    this.validateRequiredFields(ast);
    this.cleanupAST(ast);
    return ast;
  }

  parseVarValue(value) {
    value = value.trim();
    
    if (value.startsWith('input.')) {
      return { type: 'input', path: value.substring(6) };
    } else if (value.startsWith('env.')) {
      return { type: 'env', path: value.substring(4) };
    } else {
      return { type: 'literal', value: value };
    }
  }

  parseStepProperty(step, line, lineNumber) {
    // Handle both formats: "key: value" and "key value"
    let key, value;
    
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      // Format: "key: value"
      key = line.substring(0, colonIndex).trim();
      value = line.substring(colonIndex + 1).trim();
    } else {
      // Format: "key value" (space-separated)
      const spaceIndex = line.indexOf(' ');
      if (spaceIndex === -1) {
        throw new Error(`Invalid step property at line ${lineNumber}: ${line}`);
      }
      key = line.substring(0, spaceIndex).trim();
      value = line.substring(spaceIndex + 1).trim();
    }

    switch (key) {
    case 'kind':
      if (!['llm', 'http', 'function'].includes(value)) {
        throw new Error(`Invalid step kind '${value}' at line ${lineNumber}`);
      }
      step.kind = value;
      break;
    case 'model':
      step.model = value;
      break;
    case 'provider':
      step.provider = value;
      break;
    case 'when':
      step.when = value;
      break;
    case 'retries':
      step.retries = parseInt(value);
      break;
    case 'timeout_ms':
      step.timeout_ms = parseInt(value);
      break;
    case 'save':
      step.save = value;
      break;
    case 'action':
      step.action = value;
      break;
    case 'url':
      step.url = value;
      break;
    case 'headers':
      try {
        step.headers = JSON.parse(value);
      } catch (e) {
        throw new Error(`Invalid JSON for headers at line ${lineNumber}: ${value}`);
      }
      break;
    case 'body':
      try {
        step.body = JSON.parse(value);
      } catch (e) {
        throw new Error(`Invalid JSON for body at line ${lineNumber}: ${value}`);
      }
      break;
    default:
      logger.warn(`Unknown step property '${key}' at line ${lineNumber}`);
    }
  }

  validateRequiredFields(ast) {
    if (!ast.id) {
      throw new Error('Missing required field: @agent id');
    }
    if (!ast.version) {
      throw new Error('Missing required field: version');
    }
    if (!ast.trigger) {
      throw new Error('Missing required field: trigger');
    }
    if (!ast.output) {
      throw new Error('Missing required field: output');
    }
    if (ast.steps.length === 0) {
      throw new Error('At least one step is required');
    }
  }

  cleanupAST(ast) {
    // Remove null/undefined fields from steps
    for (const step of ast.steps) {
      Object.keys(step).forEach(key => {
        if (step[key] === null || step[key] === undefined) {
          delete step[key];
        }
        // Remove empty objects/arrays
        if (typeof step[key] === 'object' && step[key] !== null) {
          if (Array.isArray(step[key]) && step[key].length === 0) {
            delete step[key];
          } else if (!Array.isArray(step[key]) && Object.keys(step[key]).length === 0) {
            delete step[key];
          }
        }
      });
    }
  }
}

module.exports = new AgentParser();
