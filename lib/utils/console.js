const chalk = require('chalk');

class ModernConsole {
  constructor() {
    this.startTime = Date.now();
    this.showBanner();
  }

  showBanner() {
    const banner = `
${chalk.cyan.bold('    ╔═══════════════════════════════════════════════════════════════╗')}
${chalk.cyan.bold('    ║')}                                                               ${chalk.cyan.bold('║')}
${chalk.cyan.bold('    ║')}     ${chalk.white.bold('█████╗  █████╗  █████╗ ██████╗')}                        ${chalk.cyan.bold('║')}
${chalk.cyan.bold('    ║')}     ${chalk.white.bold('██╔══██╗██╔══██╗██╔══██╗██╔══██╗')}                       ${chalk.cyan.bold('║')}
${chalk.cyan.bold('    ║')}     ${chalk.white.bold('███████║███████║███████║██████╔╝')}                       ${chalk.cyan.bold('║')}
${chalk.cyan.bold('    ║')}     ${chalk.white.bold('██╔══██║██╔══██║██╔══██║██╔══██╗')}                       ${chalk.cyan.bold('║')}
${chalk.cyan.bold('    ║')}     ${chalk.white.bold('██║  ██║██║  ██║██║  ██║██████╔╝')}                       ${chalk.cyan.bold('║')}
${chalk.cyan.bold('    ║')}     ${chalk.white.bold('╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝')}                        ${chalk.cyan.bold('║')}
${chalk.cyan.bold('    ║')}                                                               ${chalk.cyan.bold('║')}
${chalk.cyan.bold('    ║')}           ${chalk.magenta.bold('Agent as a Backend Framework')}                     ${chalk.cyan.bold('║')}
${chalk.cyan.bold('    ║')}           ${chalk.gray('Transform .agent files into APIs')}                   ${chalk.cyan.bold('║')}
${chalk.cyan.bold('    ║')}                                                               ${chalk.cyan.bold('║')}
${chalk.cyan.bold('    ║')}           ${chalk.yellow('Developed by:')} ${chalk.green.bold('INIT-ABDELLM')}                      ${chalk.cyan.bold('║')}
${chalk.cyan.bold('    ║')}           ${chalk.blue('Version:')} ${chalk.white('1.0.0')}                               ${chalk.cyan.bold('║')}
${chalk.cyan.bold('    ║')}                                                               ${chalk.cyan.bold('║')}
${chalk.cyan.bold('    ╚═══════════════════════════════════════════════════════════════╝')}
`;
    console.log(banner);
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

  section(title) {
    console.log();
    console.log(chalk.blue('┌─ ') + chalk.white.bold(title));
    console.log(chalk.blue('│'));
  }

  info(message, icon = 'ℹ') {
    const timestamp = this.getTimestamp();
    console.log(chalk.blue('│ ') + chalk.cyan(icon) + ' ' + chalk.white(message) + chalk.gray(` [${timestamp}]`));
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
      pending: '⏸'
    };
    const colors = {
      running: chalk.blue,
      success: chalk.green,
      error: chalk.red,
      pending: chalk.gray
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
      Math.max(header.length, ...rows.map(row => String(row[i] || '').length))
    );
    
    // Header
    const headerRow = '│ ' + headers.map((header, i) => 
      chalk.white.bold(header.padEnd(widths[i]))
    ).join(' │ ') + ' │';
    
    const separator = '├─' + widths.map(w => '─'.repeat(w)).join('─┼─') + '─┤';
    
    console.log(chalk.blue('│ ') + chalk.gray('┌─') + chalk.gray('─'.repeat(headerRow.length - 8)) + chalk.gray('─┐'));
    console.log(chalk.blue('│ ') + chalk.gray('│ ') + headers.map((header, i) => 
      chalk.white.bold(header.padEnd(widths[i]))
    ).join(chalk.gray(' │ ')) + chalk.gray(' │'));
    console.log(chalk.blue('│ ') + chalk.gray(separator));
    
    // Rows
    rows.forEach(row => {
      console.log(chalk.blue('│ ') + chalk.gray('│ ') + row.map((cell, i) => 
        String(cell || '').padEnd(widths[i])
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

  getTimestamp() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  }

  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }
}

module.exports = new ModernConsole();