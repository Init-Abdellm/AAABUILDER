const chalk = require('chalk');

class ModernConsole {
  constructor() {
    this.startTime = Date.now();
    this.showBanner();
  }

  showBanner() {
    const banner = `
${chalk.cyan.bold('    ╔═══════════════════════════════════════════════════════════════')}
${chalk.cyan.bold('    ║')}                                                               ${chalk.cyan.bold('')}
${chalk.cyan.bold('    ║')}     ${chalk.magenta.bold('███████╗██╗███╗   ██╗███████╗██████╗ ██╗')}              ${chalk.cyan.bold('')}
${chalk.cyan.bold('    ║')}     ${chalk.magenta.bold('╚══███╔╝██║████╗  ██║██╔════╝██╔══██╗██║')}              ${chalk.cyan.bold('')}
${chalk.cyan.bold('    ║')}       ${chalk.magenta.bold('███╔╝ ██║██╔██╗ ██║█████╗  ██████╔╝██║')}              ${chalk.cyan.bold('')}
${chalk.cyan.bold('    ║')}      ${chalk.magenta.bold('███╔╝  ██║██║╚██╗██║██╔══╝  ██╔══██╗██║')}              ${chalk.cyan.bold('')}
${chalk.cyan.bold('    ║')}     ${chalk.magenta.bold('███████╗██║██║ ╚████║███████╗██████╔╝██║')}              ${chalk.cyan.bold('')}
${chalk.cyan.bold('    ║')}     ${chalk.magenta.bold('╚══════╝╚═╝╚═╝  ╚═══╝╚══════╝╚═════╝ ╚═╝')}              ${chalk.cyan.bold('')}
${chalk.cyan.bold('    ║')}                                                               ${chalk.cyan.bold('')}
${chalk.cyan.bold('    ║')}        ${chalk.white.bold('Advanced AI/ML Agent Framework')}                      ${chalk.cyan.bold('')}
${chalk.cyan.bold('    ║')}        ${chalk.gray('The Ultimate AI/ML Development Platform')}                   ${chalk.cyan.bold('')}
${chalk.cyan.bold('    ║')}                                                               ${chalk.cyan.bold('')}
${chalk.cyan.bold('    ║')}        ${chalk.yellow('Developed by:')} ${chalk.green.bold('INIT-ABDELLM')}                      ${chalk.cyan.bold('')}
${chalk.cyan.bold('    ║')}        ${chalk.blue('Version:')} ${chalk.white('2.0.0')}                               ${chalk.cyan.bold('')}
${chalk.cyan.bold('    ║')}        ${chalk.blue('TypeScript:')} ${chalk.white('5.3+')}                             ${chalk.cyan.bold('')}
${chalk.cyan.bold('    ║')}                                                               ${chalk.cyan.bold('')}
${chalk.cyan.bold('    ╚═══════════════════════════════════════════════════════════════')}
`;
    console.log(banner);
  }

  // Show welcome message with quick info
  showWelcome() {
    console.log();
    console.log(chalk.magenta('🚀 Welcome to Zinebi - The Ultimate AI/ML Development Platform!'));
    console.log(chalk.gray('   Type "aaab --help" for available commands or "aaab show-capabilities" for AI/ML features'));
    console.log();
  }

  // Show help with organized sections
  showHelp() {
    this.showBanner();
    this.showWelcome();
    
    this.showCommands();
    this.showQuickStart();
    this.showCapabilities();
    this.showModelTypes();
    
    console.log();
    console.log(chalk.magenta('💡 Pro Tips:'));
    console.log(chalk.gray('   • Use "aaab models --recommend <task>" to get model recommendations'));
    console.log(chalk.gray('   • Try "aaab vision --classify <image>" for computer vision'));
    console.log(chalk.gray('   • Use "aaab audio --stt <audio>" for speech recognition'));
    console.log(chalk.gray('   • Run "aaab doctor" to diagnose any issues'));
    console.log();
    console.log(chalk.cyan('🌐 Learn more: https://github.com/Init-Abdellm/zinebi'));
    console.log();
  }

  header(title, subtitle = '') {
    console.log();
    console.log(chalk.cyan('╭─' + '─'.repeat(60) + '─╮'));
    console.log(chalk.cyan('│') + chalk.white.bold(` ${title}`.padEnd(61)) + chalk.cyan('│'));
    if (subtitle) {
      console.log(chalk.cyan('│') + chalk.gray(` ${subtitle}`.padEnd(61)) + chalk.cyan('│'));
    }
    console.log(chalk.cyan('╰─' + '─'.repeat(60) + '─╯'));
    console.log();
  }

  // New compact header for less verbose output
  compactHeader(title) {
    console.log();
    console.log(chalk.magenta('━━━ ') + chalk.white.bold(title) + chalk.magenta(' ━━━'));
  }

  // Model-specific display methods
  modelCard(model) {
    const size = model.metadata.size ? `${Math.round(model.metadata.size / 1000000)}MB` : 'Unknown';
    console.log(chalk.blue('│ ') + chalk.cyan('🤖') + ' ' + chalk.white.bold(model.name));
    console.log(chalk.blue('│ ') + chalk.gray('   ID: ') + chalk.white(model.id));
    console.log(chalk.blue('│ ') + chalk.gray('   Type: ') + chalk.yellow(model.type));
    console.log(chalk.blue('│ ') + chalk.gray('   Provider: ') + chalk.green(model.provider));
    console.log(chalk.blue('│ ') + chalk.gray('   Size: ') + chalk.white(size));
    console.log(chalk.blue('│ ') + chalk.gray('   Capabilities: ') + chalk.cyan(model.capabilities.join(', ')));
  }

  // AI/ML specific status indicators
  aiStatus(status, message) {
    const icons = {
      'initializing': '🧠',
      'loading': '⏳',
      'processing': '⚡',
      'training': '🎯',
      'fine-tuning': '🔧',
      'inferencing': '🤖',
      'completed': '✅',
      'error': '❌',
      'warning': '⚠️',
    };
    
    const colors = {
      'initializing': chalk.blue,
      'loading': chalk.yellow,
      'processing': chalk.cyan,
      'training': chalk.magenta,
      'fine-tuning': chalk.green,
      'inferencing': chalk.white,
      'completed': chalk.green,
      'error': chalk.red,
      'warning': chalk.yellow,
    };

    const icon = icons[status] || 'ℹ️';
    const color = colors[status] || chalk.white;
    
    console.log(chalk.blue('│ ') + color(icon) + ' ' + chalk.white(message));
  }

  // Vision operations display
  visionResult(result) {
    console.log(chalk.blue('│ ') + chalk.cyan('👁️') + ' ' + chalk.white.bold('Vision Analysis'));
    if (result.labels) {
      console.log(chalk.blue('│ ') + chalk.gray('   Labels: ') + chalk.white(result.labels.join(', ')));
    }
    if (result.confidence) {
      console.log(chalk.blue('│ ') + chalk.gray('   Confidence: ') + chalk.green(`${(result.confidence * 100).toFixed(1)}%`));
    }
    if (result.text) {
      console.log(chalk.blue('│ ') + chalk.gray('   Extracted Text: ') + chalk.white(result.text));
    }
  }

  // Audio operations display
  audioResult(result) {
    console.log(chalk.blue('│ ') + chalk.cyan('🎵') + ' ' + chalk.white.bold('Audio Processing'));
    if (result.text) {
      console.log(chalk.blue('│ ') + chalk.gray('   Transcription: ') + chalk.white(result.text));
    }
    if (result.sentiment) {
      console.log(chalk.blue('│ ') + chalk.gray('   Sentiment: ') + chalk.yellow(result.sentiment));
    }
    if (result.confidence) {
      console.log(chalk.blue('│ ') + chalk.gray('   Confidence: ') + chalk.green(`${(result.confidence * 100).toFixed(1)}%`));
    }
  }

  // ML training progress
  trainingProgress(epoch, totalEpochs, loss, accuracy) {
    const percentage = Math.round((epoch / totalEpochs) * 100);
    const barLength = 20;
    const filledLength = Math.round((percentage / 100) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    
    console.log(chalk.blue('│ ') + chalk.magenta('🎯') + ' ' + 
                chalk.white(`Epoch ${epoch}/${totalEpochs} [`) + chalk.green(bar) + chalk.white(`] ${percentage}%`));
    console.log(chalk.blue('│ ') + chalk.gray('   Loss: ') + chalk.red(loss.toFixed(4)) + 
                chalk.gray(' | Accuracy: ') + chalk.green((accuracy * 100).toFixed(2) + '%'));
  }

  // Vector database operations
  vectorDBResult(operation, details) {
    console.log(chalk.blue('│ ') + chalk.cyan('🔍') + ' ' + chalk.white.bold(`Vector DB: ${operation}`));
    if (details.count) {
      console.log(chalk.blue('│ ') + chalk.gray('   Documents: ') + chalk.white(details.count));
    }
    if (details.similarity) {
      console.log(chalk.blue('│ ') + chalk.gray('   Similarity: ') + chalk.green((details.similarity * 100).toFixed(1) + '%'));
    }
    if (details.duration) {
      console.log(chalk.blue('│ ') + chalk.gray('   Duration: ') + chalk.white(details.duration + 'ms'));
    }
  }

  // Fine-tuning status
  fineTuningStatus(jobId, status, progress) {
    const statusIcons = {
      'pending': '⏳',
      'running': '🔄',
      'completed': '✅',
      'failed': '❌',
      'cancelled': '⏹️',
    };
    
    const statusColors = {
      'pending': chalk.yellow,
      'running': chalk.blue,
      'completed': chalk.green,
      'failed': chalk.red,
      'cancelled': chalk.gray,
    };

    const icon = statusIcons[status] || 'ℹ️';
    const color = statusColors[status] || chalk.white;
    
    console.log(chalk.blue('│ ') + color(icon) + ' ' + chalk.white.bold(`Fine-tuning Job: ${jobId}`));
    console.log(chalk.blue('│ ') + chalk.gray('   Status: ') + color(status));
    if (progress) {
      console.log(chalk.blue('│ ') + chalk.gray('   Progress: ') + chalk.white(progress));
    }
  }

  section(title) {
    console.log();
    console.log(chalk.blue('┌─ ') + chalk.white.bold(title));
    console.log(chalk.blue('│'));
  }

  info(message, icon = 'ℹ', showTimestamp = true) {
    const timestamp = showTimestamp ? chalk.gray(` [${this.getTimestamp()}]`) : '';
    console.log(chalk.blue('│ ') + chalk.cyan(icon) + ' ' + chalk.white(message) + timestamp);
  }

  // Compact info without timestamp for less clutter
  infoCompact(message, icon = 'ℹ') {
    this.info(message, icon, false);
  }

  success(message, icon = '✓') {
    const timestamp = this.getTimestamp();
    console.log(chalk.blue('│ ') + chalk.green(icon) + ' ' + chalk.white(message) + chalk.gray(` [${timestamp}]`));
  }

  warn(message, icon = '⚠') {
    const timestamp = this.getTimestamp();
    console.log(chalk.blue('│ ') + chalk.yellow(icon) + ' ' + chalk.white(message) + chalk.gray(` [${timestamp}]`));
  }

  error(message, icon = '✗') {
    const timestamp = this.getTimestamp();
    console.log(chalk.blue('│ ') + chalk.red(icon) + ' ' + chalk.white(message) + chalk.gray(` [${timestamp}]`));
  }

  debug(message, icon = '🔍') {
    if (process.env.DEBUG || process.argv.includes('--debug')) {
      const timestamp = this.getTimestamp();
      console.log(chalk.blue('│ ') + chalk.magenta(icon) + ' ' + chalk.gray(message) + chalk.gray(` [${timestamp}]`));
    }
  }

  step(stepNumber, stepName, status = 'running') {
    const icons = {
      running: '⏳',
      success: '✅',
      error: '❌',
      pending: '⏸',
    };
    const colors = {
      running: chalk.blue,
      success: chalk.green,
      error: chalk.red,
      pending: chalk.gray,
    };
    
    console.log(chalk.blue('│ ') + colors[status](icons[status]) + ' ' + 
                chalk.white(`Step ${stepNumber}: ${stepName}`));
  }

  progress(current, total, message = '') {
    const percentage = Math.round((current / total) * 100);
    const barLength = 30;
    const filledLength = Math.round((percentage / 100) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    
    console.log(chalk.blue('│ ') + chalk.cyan('📊') + ' ' + 
                chalk.white(`${message} [`) + chalk.green(bar) + chalk.white(`] ${percentage}%`));
  }

  table(headers, rows) {
    console.log(chalk.blue('│'));
    
    // Calculate column widths
    const widths = headers.map((header, i) => 
      Math.max(header.length, ...rows.map(row => String(row[i] || '').length)),
    );
    
    // Header
    const headerRow = '│ ' + headers.map((header, i) => 
      chalk.white.bold(header.padEnd(widths[i])),
    ).join(' │ ') + ' │';
    
    const separator = '├─' + widths.map(w => '─'.repeat(w)).join('─┼─') + '─┤';
    
    console.log(chalk.blue('│ ') + chalk.gray('┌─') + chalk.gray('─'.repeat(headerRow.length - 8)) + chalk.gray('─┐'));
    console.log(chalk.blue('│ ') + chalk.gray('│ ') + headers.map((header, i) => 
      chalk.white.bold(header.padEnd(widths[i])),
    ).join(chalk.gray(' │ ')) + chalk.gray(' │'));
    console.log(chalk.blue('│ ') + chalk.gray(separator));
    
    // Rows
    rows.forEach(row => {
      console.log(chalk.blue('│ ') + chalk.gray('│ ') + row.map((cell, i) => 
        String(cell || '').padEnd(widths[i]),
      ).join(chalk.gray(' │ ')) + chalk.gray(' │'));
    });
    
    console.log(chalk.blue('│ ') + chalk.gray('└─') + chalk.gray('─'.repeat(headerRow.length - 8)) + chalk.gray('─┘'));
  }

  json(obj, title = '') {
    if (title) {
      console.log(chalk.blue('│ ') + chalk.cyan('📄') + ' ' + chalk.white.bold(title));
    }
    console.log(chalk.blue('│'));
    const jsonStr = JSON.stringify(obj, null, 2);
    jsonStr.split('\n').forEach(line => {
      console.log(chalk.blue('│ ') + chalk.gray('   ') + chalk.cyan(line));
    });
  }

  execution(agentName, version, input) {
    this.header(`Executing Agent: ${agentName}`, `Version ${version}`);
    this.json(input, 'Input Data');
    console.log();
  }

  endSection() {
    console.log(chalk.blue('│'));
    console.log(chalk.blue('└─' + '─'.repeat(60)));
  }

  summary(stats) {
    this.section('Execution Summary');
    
    const duration = Date.now() - this.startTime;
    this.info(`Duration: ${this.formatDuration(duration)}`);
    
    Object.entries(stats).forEach(([key, value]) => {
      if (typeof value === 'boolean') {
        if (value) {
          this.success(`${key}: Yes`);
        } else {
          this.error(`${key}: No`);
        }
      } else {
        this.info(`${key}: ${value}`);
      }
    });
    
    this.endSection();
  }

  // Show model capabilities overview
  showCapabilities() {
    this.compactHeader('AI/ML Capabilities');
    
    const capabilities = [
      { icon: '🤖', name: 'Language Models', desc: 'LLM, SLM, MLM, GPT, Claude, Gemini' },
      { icon: '👁️', name: 'Computer Vision', desc: 'Image classification, object detection, OCR' },
      { icon: '🎵', name: 'Audio Processing', desc: 'Speech-to-text, text-to-speech, voice cloning' },
      { icon: '🧠', name: 'Machine Learning', desc: 'CNN, RNN, GNN, GAN, Diffusion, Transformer' },
      { icon: '🔍', name: 'Vector Databases', desc: 'Pinecone, Weaviate, Qdrant, RAG systems' },
      { icon: '🔧', name: 'Fine-tuning', desc: 'Model customization and training pipelines' },
      { icon: '⚡', name: 'Real-time Processing', desc: 'Streaming, live inference, monitoring' },
      { icon: '🌐', name: 'Multi-provider', desc: 'OpenAI, Anthropic, Google, Ollama, local models' },
    ];

    capabilities.forEach(cap => {
      console.log(chalk.blue('│ ') + cap.icon + ' ' + chalk.white.bold(cap.name));
      console.log(chalk.blue('│ ') + chalk.gray('   ') + chalk.white(cap.desc));
    });
    
    this.endSection();
  }

  // Show supported model types
  showModelTypes() {
    this.compactHeader('Supported Model Types');
    
    const modelTypes = [
      { type: 'LLM', desc: 'Large Language Models', examples: 'GPT-4, Claude, Gemini' },
      { type: 'SLM', desc: 'Small Language Models', examples: 'Phi-2, TinyLlama' },
      { type: 'MLM', desc: 'Multimodal Language Models', examples: 'GPT-4V, Claude 3' },
      { type: 'Vision', desc: 'Computer Vision Models', examples: 'ResNet, YOLO, Vision Transformer' },
      { type: 'ASR', desc: 'Automatic Speech Recognition', examples: 'Whisper, Wav2Vec' },
      { type: 'TTS', desc: 'Text-to-Speech', examples: 'TTS-1, Coqui TTS' },
      { type: 'CNN', desc: 'Convolutional Neural Networks', examples: 'Image classification, detection' },
      { type: 'RNN', desc: 'Recurrent Neural Networks', examples: 'LSTM, GRU, sequence modeling' },
      { type: 'GNN', desc: 'Graph Neural Networks', examples: 'Graph processing, social networks' },
      { type: 'GAN', desc: 'Generative Adversarial Networks', examples: 'Image generation, style transfer' },
      { type: 'Diffusion', desc: 'Diffusion Models', examples: 'Stable Diffusion, DALL-E' },
      { type: 'Transformer', desc: 'Transformer Models', examples: 'BERT, GPT, T5' },
      { type: 'MLP', desc: 'Multilayer Perceptrons', examples: 'Classification, regression' },
      { type: 'Autoencoder', desc: 'Autoencoders', examples: 'Dimensionality reduction' },
      { type: 'BERT', desc: 'BERT-style Models', examples: 'Text understanding, NER' },
      { type: 'RAG', desc: 'Retrieval-Augmented Generation', examples: 'Knowledge bases, Q&A' },
      { type: 'Hybrid', desc: 'Hybrid Models', examples: 'Multi-modal, multi-task' },
      { type: 'Foundation', desc: 'Foundation Models', examples: 'Large-scale pre-trained models' },
    ];

    modelTypes.forEach(model => {
      console.log(chalk.blue('│ ') + chalk.cyan(model.type) + ' ' + chalk.white(model.desc));
      console.log(chalk.blue('│ ') + chalk.gray('   ') + chalk.white(model.examples));
    });
    
    this.endSection();
  }

  // Show quick start guide
  showQuickStart() {
    this.compactHeader('Quick Start Guide');
    
    const steps = [
      { step: '1', action: 'Install Zinebi', command: 'npm install -g zinebi' },
      { step: '2', action: 'Initialize project', command: 'aaab init my-project --provider openai' },
      { step: '3', action: 'Set API key', command: 'export OPENAI_API_KEY="your-key"' },
      { step: '4', action: 'Create agent', command: 'aaab template chatbot agents/chat.agent' },
      { step: '5', action: 'Start server', command: 'aaab serve --port 5000' },
      { step: '6', action: 'Test endpoint', command: 'curl -X POST http://localhost:5000/chat' },
    ];

    steps.forEach(step => {
      console.log(chalk.blue('│ ') + chalk.magenta(step.step) + ' ' + chalk.white(step.action));
      console.log(chalk.blue('│ ') + chalk.gray('   ') + chalk.cyan(step.command));
    });
    
    this.endSection();
  }

  // Show available commands
  showCommands() {
    this.compactHeader('Available Commands');
    
    const commands = [
      { cmd: 'aaab init', desc: 'Initialize new project' },
      { cmd: 'aaab models', desc: 'Manage AI/ML models' },
      { cmd: 'aaab vision', desc: 'Computer vision operations' },
      { cmd: 'aaab audio', desc: 'Audio processing operations' },
      { cmd: 'aaab ml', desc: 'Machine learning operations' },
      { cmd: 'aaab fine-tune', desc: 'Model fine-tuning' },
      { cmd: 'aaab vector-db', desc: 'Vector database operations' },
      { cmd: 'aaab serve', desc: 'Start HTTP API server' },
      { cmd: 'aaab deploy', desc: 'Generate deployment configs' },
      { cmd: 'aaab doctor', desc: 'Diagnose environment issues' },
    ];

    commands.forEach(cmd => {
      console.log(chalk.blue('│ ') + chalk.cyan(cmd.cmd) + ' ' + chalk.white(cmd.desc));
    });
    
    this.endSection();
  }

  // Show system status and health
  showSystemStatus() {
    this.compactHeader('System Status');
    
    const status = {
      'Node.js': process.version,
      'Platform': process.platform,
      'Architecture': process.arch,
      'Memory': `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      'Uptime': this.formatDuration(process.uptime() * 1000),
      'Environment': process.env.NODE_ENV || 'development',
    };

    Object.entries(status).forEach(([key, value]) => {
      console.log(chalk.blue('│ ') + chalk.gray(key + ': ') + chalk.white(value));
    });
    
    this.endSection();
  }

  // Show environment check results
  showEnvironmentCheck(results) {
    this.compactHeader('Environment Check');
    
    results.forEach(result => {
      const icon = result.status ? '✅' : '❌';
      const color = result.status ? chalk.green : chalk.red;
      console.log(chalk.blue('│ ') + color(icon) + ' ' + chalk.white(result.name));
      if (!result.status && result.message) {
        console.log(chalk.blue('│ ') + chalk.gray('   ') + chalk.red(result.message));
      }
    });
    
    this.endSection();
  }

  // Show model statistics in a clean format
  showModelStats(stats) {
    this.compactHeader('Model Statistics');
    
    console.log(chalk.blue('│ ') + chalk.white.bold(`Total Models: ${stats.total}`));
    console.log();
    
    // Show by type
    console.log(chalk.blue('│ ') + chalk.cyan('By Type:'));
    Object.entries(stats.byType).forEach(([type, count]) => {
      console.log(chalk.blue('│ ') + chalk.gray('   ') + chalk.white(`${type}: ${count}`));
    });
    console.log();
    
    // Show by provider
    console.log(chalk.blue('│ ') + chalk.cyan('By Provider:'));
    Object.entries(stats.byProvider).forEach(([provider, count]) => {
      console.log(chalk.blue('│ ') + chalk.gray('   ') + chalk.white(`${provider}: ${count}`));
    });
    
    this.endSection();
  }

  getTimestamp() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  }

  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }
}

module.exports = new ModernConsole();