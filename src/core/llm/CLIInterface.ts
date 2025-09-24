// CLI Interface - Base interface for command-line based AI tools

import { spawn, ChildProcess } from 'child_process';
import { 
  LLMMessage, 
  LLMResponse, 
  TaskType,
  LLMProvider 
} from '../../models/index.js';

export interface CLIConfig {
  executable: string;
  args?: string[];
  timeout?: number;
  maxRetries?: number;
  environment?: Record<string, string>;
}

export interface CLICapabilities {
  supportsExplain: boolean;
  supportsSuggest: boolean;
  supportsStreaming: boolean;
  supportsInteractive: boolean;
  maxInputLength?: number;
}

export abstract class CLIInterface {
  protected provider: LLMProvider;
  protected config: CLIConfig;

  constructor(provider: LLMProvider, config: CLIConfig) {
    this.provider = provider;
    this.config = config;
  }

  /**
   * Execute a CLI command and return the result
   */
  protected async executeCommand(
    command: string,
    args: string[],
    options?: {
      input?: string;
      timeout?: number;
      environment?: Record<string, string>;
    }
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const timeout = options?.timeout || this.config.timeout || 30000;
      const env = { ...process.env, ...this.config.environment, ...options?.environment };
      
      const child = spawn(command, args, {
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      let timeoutHandle: NodeJS.Timeout;

      // Set up timeout
      if (timeout > 0) {
        timeoutHandle = setTimeout(() => {
          child.kill('SIGTERM');
          reject(new Error(`Command timed out after ${timeout}ms`));
        }, timeout);
      }

      // Collect output
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Send input if provided
      if (options?.input) {
        child.stdin?.write(options.input);
        child.stdin?.end();
      }

      // Handle completion
      child.on('close', (code) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0
        });
      });

      child.on('error', (error) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        reject(error);
      });
    });
  }

  /**
   * Check if the CLI tool is available
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Get CLI tool capabilities
   */
  abstract getCapabilities(): CLICapabilities;

  /**
   * Explain a command or concept
   */
  abstract explain(input: string): Promise<string>;

  /**
   * Suggest a command for a given task
   */
  abstract suggest(task: string): Promise<string>;

  /**
   * Get the provider type
   */
  getProvider(): LLMProvider {
    return this.provider;
  }

  /**
   * Get configuration
   */
  getConfig(): CLIConfig {
    return { ...this.config };
  }
}
