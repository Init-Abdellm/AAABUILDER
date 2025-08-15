import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  error?: Error;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  logFile?: string;
  maxFileSize?: number;
  maxFiles?: number;
  format: 'json' | 'text';
  colors: boolean;
}

/**
 * Advanced Logger for AAABuilder
 * Supports multiple output formats, file rotation, and structured logging
 */
export class Logger {
  private config: LoggerConfig;
  private logStream?: fs.WriteStream;
  private logBuffer: LogEntry[] = [];
  private bufferSize = 100;

  constructor(
    private context: string,
    config: Partial<LoggerConfig> = {}
  ) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: false,
      format: 'text',
      colors: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      ...config,
    };

    if (this.config.enableFile && this.config.logFile) {
      this.initializeFileLogging();
    }
  }

  /**
   * Initialize file logging with rotation
   */
  private initializeFileLogging(): void {
    try {
      const logDir = path.dirname(this.config.logFile!);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      this.logStream = fs.createWriteStream(this.config.logFile!, { flags: 'a' });
      
      // Handle stream errors
      this.logStream.on('error', (error) => {
        console.error('Logger file stream error:', error);
      });

      // Check file size and rotate if needed
      this.checkAndRotateLogFile();
    } catch (error) {
      console.error('Failed to initialize file logging:', error);
    }
  }

  /**
   * Check log file size and rotate if necessary
   */
  private checkAndRotateLogFile(): void {
    if (!this.config.logFile || !fs.existsSync(this.config.logFile)) return;

    try {
      const stats = fs.statSync(this.config.logFile);
      if (stats.size > (this.config.maxFileSize || 10 * 1024 * 1024)) {
        this.rotateLogFile();
      }
    } catch (error) {
      console.error('Error checking log file size:', error);
    }
  }

  /**
   * Rotate log files
   */
  private rotateLogFile(): void {
    if (!this.config.logFile) return;

    try {
      const baseName = this.config.logFile.replace(/\.log$/, '');
      const ext = '.log';

      // Remove oldest log file if max files reached
      const oldestFile = `${baseName}.${this.config.maxFiles}${ext}`;
      if (fs.existsSync(oldestFile)) {
        fs.unlinkSync(oldestFile);
      }

      // Shift existing log files
      for (let i = this.config.maxFiles! - 1; i >= 1; i--) {
        const oldFile = `${baseName}.${i}${ext}`;
        const newFile = `${baseName}.${i + 1}${ext}`;
        if (fs.existsSync(oldFile)) {
          fs.renameSync(oldFile, newFile);
        }
      }

      // Rename current log file
      const backupFile = `${baseName}.1${ext}`;
      fs.renameSync(this.config.logFile, backupFile);

      // Create new log file
      this.logStream?.end();
      this.logStream = fs.createWriteStream(this.config.logFile, { flags: 'a' });
    } catch (error) {
      console.error('Error rotating log file:', error);
    }
  }

  /**
   * Create log entry
   */
  private createLogEntry(level: LogLevel, message: string, data?: any, error?: Error): LogEntry {
    return {
      timestamp: new Date(),
      level,
      message,
      context: this.context,
      data,
      error,
    };
  }

  /**
   * Format log entry for output
   */
  private formatLogEntry(entry: LogEntry): string {
    if (this.config.format === 'json') {
      return JSON.stringify({
        timestamp: entry.timestamp.toISOString(),
        level: LogLevel[entry.level],
        context: entry.context,
        message: entry.message,
        data: entry.data,
        error: entry.error ? {
          message: entry.error.message,
          stack: entry.error.stack,
          name: entry.error.name,
        } : undefined,
      });
    }

    // Text format
    const timestamp = entry.timestamp.toISOString();
    const levelStr = LogLevel[entry.level].padEnd(5);
    const contextStr = entry.context ? `[${entry.context}]` : '';
    const messageStr = entry.message;
    const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
    const errorStr = entry.error ? `\n${entry.error.stack}` : '';

    return `${timestamp} ${levelStr} ${contextStr} ${messageStr}${dataStr}${errorStr}`;
  }

  /**
   * Write log entry to console
   */
  private writeToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return;

    const formatted = this.formatLogEntry(entry);
    
    if (this.config.colors) {
      const colored = this.colorizeLogEntry(entry, formatted);
      console.log(colored);
    } else {
      console.log(formatted);
    }
  }

  /**
   * Colorize log entry for console output
   */
  private colorizeLogEntry(entry: LogEntry, formatted: string): string {
    const levelColors = {
      [LogLevel.DEBUG]: chalk.gray,
      [LogLevel.INFO]: chalk.blue,
      [LogLevel.WARN]: chalk.yellow,
      [LogLevel.ERROR]: chalk.red,
      [LogLevel.FATAL]: chalk.red.bold,
    };

    const color = levelColors[entry.level] || chalk.white;
    return color(formatted);
  }

  /**
   * Write log entry to file
   */
  private writeToFile(entry: LogEntry): void {
    if (!this.config.enableFile || !this.logStream) return;

    try {
      const formatted = this.formatLogEntry(entry) + '\n';
      this.logStream.write(formatted);
    } catch (error) {
      console.error('Error writing to log file:', error);
    }
  }

  /**
   * Buffer log entry for batch processing
   */
  private bufferLogEntry(entry: LogEntry): void {
    this.logBuffer.push(entry);
    
    if (this.logBuffer.length >= this.bufferSize) {
      this.flushBuffer();
    }
  }

  /**
   * Flush log buffer
   */
  public flushBuffer(): void {
    if (this.logBuffer.length === 0) return;

    for (const entry of this.logBuffer) {
      this.writeToFile(entry);
    }

    this.logBuffer = [];
  }

  /**
   * Log debug message
   */
  public debug(message: string, data?: any): void {
    if (this.config.level <= LogLevel.DEBUG) {
      const entry = this.createLogEntry(LogLevel.DEBUG, message, data);
      this.writeToConsole(entry);
      this.writeToFile(entry);
    }
  }

  /**
   * Log info message
   */
  public info(message: string, data?: any): void {
    if (this.config.level <= LogLevel.INFO) {
      const entry = this.createLogEntry(LogLevel.INFO, message, data);
      this.writeToConsole(entry);
      this.writeToFile(entry);
    }
  }

  /**
   * Log warning message
   */
  public warn(message: string, data?: any): void {
    if (this.config.level <= LogLevel.WARN) {
      const entry = this.createLogEntry(LogLevel.WARN, message, data);
      this.writeToConsole(entry);
      this.writeToFile(entry);
    }
  }

  /**
   * Log error message
   */
  public error(message: string, error?: Error, data?: any): void {
    if (this.config.level <= LogLevel.ERROR) {
      const entry = this.createLogEntry(LogLevel.ERROR, message, data, error);
      this.writeToConsole(entry);
      this.writeToFile(entry);
    }
  }

  /**
   * Log fatal message
   */
  public fatal(message: string, error?: Error, data?: any): void {
    if (this.config.level <= LogLevel.FATAL) {
      const entry = this.createLogEntry(LogLevel.FATAL, message, data, error);
      this.writeToConsole(entry);
      this.writeToFile(entry);
    }
  }

  /**
   * Create child logger with context
   */
  public child(childContext: string): Logger {
    const childLogger = new Logger(`${this.context}:${childContext}`, this.config);
    return childLogger;
  }

  /**
   * Update logger configuration
   */
  public updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.enableFile && config.logFile && !this.logStream) {
      this.initializeFileLogging();
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * Close logger and flush buffer
   */
  public close(): void {
    this.flushBuffer();
    this.logStream?.end();
  }

  /**
   * Create a logger with specific configuration
   */
  public static create(config: LoggerConfig): Logger {
    return new Logger('default', config);
  }

  /**
   * Create a logger for a specific context
   */
  public static forContext(context: string, config?: Partial<LoggerConfig>): Logger {
    return new Logger(context, config);
  }
}
