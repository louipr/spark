// Logger - Comprehensive logging utility for Spark Clone

import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LoggerConfig {
  level: LogLevel;
  enableConsole?: boolean;
  enableFile?: boolean;
  filePath?: string;
  maxFileSize?: number; // in bytes
  maxFiles?: number;
  timestamp?: boolean;
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  metadata?: any;
}

export class Logger {
  private config: LoggerConfig;
  private logLevels: Record<LogLevel, number> = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
  };

  constructor(config: LoggerConfig) {
    this.config = {
      enableConsole: true,
      enableFile: false,
      timestamp: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      ...config
    };

    // Initialize file logging if enabled
    if (this.config.enableFile && this.config.filePath) {
      this.initializeFileLogging().catch(err => {
        console.error('Failed to initialize file logging:', err);
      });
    }
  }

  /**
   * Initialize file logging directory
   */
  private async initializeFileLogging(): Promise<void> {
    if (!this.config.filePath) return;

    const logDir = path.dirname(this.config.filePath);
    try {
      await fs.access(logDir);
    } catch {
      await fs.mkdir(logDir, { recursive: true });
    }
  }

  /**
   * Log an error message
   */
  error(message: string, metadata?: any): void {
    this.log('error', message, metadata);
  }

  /**
   * Log a warning message
   */
  warn(message: string, metadata?: any): void {
    this.log('warn', message, metadata);
  }

  /**
   * Log an info message
   */
  info(message: string, metadata?: any): void {
    this.log('info', message, metadata);
  }

  /**
   * Log a debug message
   */
  debug(message: string, metadata?: any): void {
    this.log('debug', message, metadata);
  }

  /**
   * Core logging method
   */
  private async log(level: LogLevel, message: string, metadata?: any): Promise<void> {
    // Check if log level is enabled
    if (this.logLevels[level] > this.logLevels[this.config.level]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      metadata
    };

    // Console output
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // File output
    if (this.config.enableFile && this.config.filePath) {
      await this.logToFile(entry);
    }
  }

  /**
   * Log to console with colors and formatting
   */
  private logToConsole(entry: LogEntry): void {
    const colors = {
      error: '\x1b[31m', // Red
      warn: '\x1b[33m',  // Yellow
      info: '\x1b[32m',  // Green
      debug: '\x1b[36m'  // Cyan
    };
    const reset = '\x1b[0m';

    const timestamp = this.config.timestamp 
      ? `${entry.timestamp.toISOString()} ` 
      : '';
    
    const level = `[${entry.level.toUpperCase()}]`.padEnd(7);
    const coloredLevel = `${colors[entry.level]}${level}${reset}`;
    
    let output = `${timestamp}${coloredLevel} ${entry.message}`;
    
    if (entry.metadata) {
      output += `\n${this.formatMetadata(entry.metadata)}`;
    }

    console.log(output);
  }

  /**
   * Log to file
   */
  private async logToFile(entry: LogEntry): Promise<void> {
    try {
      if (!this.config.filePath) return;

      // Check file size and rotate if needed
      await this.rotateLogIfNeeded();

      const timestamp = entry.timestamp.toISOString();
      const level = entry.level.toUpperCase().padEnd(5);
      
      let logLine = `${timestamp} [${level}] ${entry.message}`;
      
      if (entry.metadata) {
        logLine += ` ${JSON.stringify(entry.metadata)}`;
      }
      
      logLine += '\n';

      await fs.appendFile(this.config.filePath, logLine, 'utf8');
    } catch (error) {
      // Fallback to console if file logging fails
      console.error('Failed to write to log file:', error);
      this.logToConsole(entry);
    }
  }

  /**
   * Rotate log file if it exceeds maximum size
   */
  private async rotateLogIfNeeded(): Promise<void> {
    if (!this.config.filePath || !this.config.maxFileSize) return;

    try {
      const stats = await fs.stat(this.config.filePath);
      
      if (stats.size >= this.config.maxFileSize) {
        await this.rotateLogFiles();
      }
    } catch {
      // File doesn't exist yet, no need to rotate
    }
  }

  /**
   * Rotate log files (keep last N files)
   */
  private async rotateLogFiles(): Promise<void> {
    if (!this.config.filePath || !this.config.maxFiles) return;

    const logDir = path.dirname(this.config.filePath);
    const logName = path.basename(this.config.filePath, path.extname(this.config.filePath));
    const logExt = path.extname(this.config.filePath);

    try {
      // Move existing rotated files
      for (let i = this.config.maxFiles - 1; i > 0; i--) {
        const oldFile = path.join(logDir, `${logName}.${i}${logExt}`);
        const newFile = path.join(logDir, `${logName}.${i + 1}${logExt}`);
        
        try {
          await fs.access(oldFile);
          if (i === this.config.maxFiles - 1) {
            // Delete the oldest file
            await fs.unlink(oldFile);
          } else {
            // Move file to next number
            await fs.rename(oldFile, newFile);
          }
        } catch {
          // File doesn't exist, continue
        }
      }

      // Move current file to .1
      const rotatedFile = path.join(logDir, `${logName}.1${logExt}`);
      await fs.rename(this.config.filePath, rotatedFile);
    } catch (error) {
      console.error('Failed to rotate log files:', error);
    }
  }

  /**
   * Format metadata for console output
   */
  private formatMetadata(metadata: any): string {
    if (typeof metadata === 'string') {
      return metadata;
    }
    
    if (metadata instanceof Error) {
      return `${metadata.name}: ${metadata.message}\n${metadata.stack}`;
    }
    
    try {
      return JSON.stringify(metadata, null, 2);
    } catch {
      return String(metadata);
    }
  }

  /**
   * Create a child logger with additional metadata
   */
  createChild(additionalMetadata: any): Logger {
    const childLogger = new Logger(this.config);
    
    // Override the log method to include additional metadata
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = async (level: LogLevel, message: string, metadata?: any) => {
      const combinedMetadata = {
        ...additionalMetadata,
        ...metadata
      };
      return originalLog(level, message, combinedMetadata);
    };
    
    return childLogger;
  }

  /**
   * Set log level at runtime
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * Check if a log level is enabled
   */
  isLevelEnabled(level: LogLevel): boolean {
    return this.logLevels[level] <= this.logLevels[this.config.level];
  }

  /**
   * Flush any pending log writes
   */
  async flush(): Promise<void> {
    // For file system based logging, no explicit flushing needed
    // This method is here for compatibility with other logging backends
  }

  /**
   * Create a timer for measuring operation duration
   */
  timer(label: string): () => void {
    const start = Date.now();
    
    return () => {
      const duration = Date.now() - start;
      this.info(`Timer [${label}]: ${duration}ms`);
    };
  }

  /**
   * Log system information
   */
  logSystemInfo(): void {
    this.info('System Information', {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      memory: {
        total: Math.round(os.totalmem() / 1024 / 1024),
        free: Math.round(os.freemem() / 1024 / 1024),
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
      },
      uptime: Math.round(os.uptime()),
      processUptime: Math.round(process.uptime()),
      hostname: os.hostname()
    });
  }

  /**
   * Log memory usage
   */
  logMemoryUsage(): void {
    const usage = process.memoryUsage();
    this.debug('Memory Usage', {
      rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB',
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
      external: Math.round(usage.external / 1024 / 1024) + 'MB'
    });
  }
}
