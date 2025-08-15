const chalk = require('chalk');
const mask = require('./mask');

class Logger {
  constructor() {
    this.level = 'info';
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
  }

  setLevel(level) {
    if (this.levels[level] !== undefined) {
      this.level = level;
    }
  }

  shouldLog(level) {
    return this.levels[level] >= this.levels[this.level];
  }

  formatMessage(level, message) {
    const timestamp = new Date().toISOString();
    const maskedMessage = mask.maskSensitiveData(message);
    
    let coloredLevel;
    switch (level) {
      case 'debug':
        coloredLevel = chalk.gray('[DEBUG]');
        break;
      case 'info':
        coloredLevel = chalk.blue('[INFO]');
        break;
      case 'warn':
        coloredLevel = chalk.yellow('[WARN]');
        break;
      case 'error':
        coloredLevel = chalk.red('[ERROR]');
        break;
      default:
        coloredLevel = `[${level.toUpperCase()}]`;
    }

    return `${chalk.gray(timestamp)} ${coloredLevel} ${maskedMessage}`;
  }

  debug(message) {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message));
    }
  }

  info(message) {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message));
    }
  }

  warn(message) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message));
    }
  }

  error(message) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message));
    }
  }

  success(message) {
    if (this.shouldLog('info')) {
      console.log(chalk.green('✓'), message);
    }
  }

  failure(message) {
    if (this.shouldLog('error')) {
      console.error(chalk.red('✗'), message);
    }
  }
}

module.exports = new Logger();
