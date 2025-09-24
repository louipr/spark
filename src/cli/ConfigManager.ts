// Configuration Manager for Spark CLI

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export interface SparkConfig {
  // LLM Provider Configuration
  claudeApiKey?: string;
  openaiApiKey?: string;
  defaultModel: string;
  
  // Output Configuration
  defaultOutputFormat: string;
  defaultOutputPath?: string;
  
  // Generation Configuration
  maxIterations: number;
  autoSave: boolean;
  interactiveMode: boolean;
  
  // Validation Configuration
  strictValidation: boolean;
  validationOnGenerate: boolean;
  
  // Session Configuration
  sessionTimeout: number; // minutes
  maxSessions: number;
  
  // Template Configuration
  templatePath?: string;
  defaultTemplate?: string;
  
  // Advanced Configuration
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  cacheEnabled: boolean;
  telemetryEnabled: boolean;
  
  // Editor Configuration
  editor?: string;
}

export class ConfigManager {
  private configPath: string;
  private config: SparkConfig;
  
  constructor(configPath?: string) {
    this.configPath = configPath || path.join(os.homedir(), '.spark', 'config.json');
    this.config = this.getDefaultConfig();
  }

  /**
   * Initialize configuration (alias for load)
   */
  async initialize(): Promise<void> {
    await this.load();
  }

  /**
   * Load configuration from file
   */
  async load(): Promise<void> {
    try {
      // Ensure config directory exists
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });

      // Try to read existing config
      try {
        const content = await fs.readFile(this.configPath, 'utf-8');
        const loadedConfig = JSON.parse(content);
        
        // Merge with defaults
        this.config = { ...this.getDefaultConfig(), ...loadedConfig };
      } catch (error) {
        // File doesn't exist or is invalid, use defaults
        this.config = this.getDefaultConfig();
        
        // Save defaults for next time
        await this.save();
      }
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save configuration to file
   */
  async save(): Promise<void> {
    try {
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });
      
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a configuration value
   */
  get<K extends keyof SparkConfig>(key: K): SparkConfig[K] {
    return this.config[key];
  }

  /**
   * Set a configuration value
   */
  async set<K extends keyof SparkConfig>(key: K, value: SparkConfig[K]): Promise<void> {
    this.config[key] = value;
    await this.save();
  }

  /**
   * Get all configuration
   */
  getAll(): SparkConfig {
    return { ...this.config };
  }

  /**
   * Update multiple configuration values
   */
  async update(updates: Partial<SparkConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    await this.save();
  }

  /**
   * Reset configuration to defaults
   */
  async reset(): Promise<void> {
    this.config = this.getDefaultConfig();
    await this.save();
  }

  /**
   * Validate configuration
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate API keys format
    if (this.config.claudeApiKey && !this.config.claudeApiKey.startsWith('sk-ant-')) {
      errors.push('Claude API key should start with "sk-ant-"');
    }

    if (this.config.openaiApiKey && !this.config.openaiApiKey.startsWith('sk-')) {
      errors.push('OpenAI API key should start with "sk-"');
    }

    // Validate numeric values
    if (this.config.maxIterations < 1 || this.config.maxIterations > 20) {
      errors.push('maxIterations must be between 1 and 20');
    }

    if (this.config.sessionTimeout < 1 || this.config.sessionTimeout > 1440) {
      errors.push('sessionTimeout must be between 1 and 1440 minutes');
    }

    if (this.config.maxSessions < 1 || this.config.maxSessions > 1000) {
      errors.push('maxSessions must be between 1 and 1000');
    }

    // Validate enum values
    const validFormats = ['json', 'markdown', 'yaml'];
    if (!validFormats.includes(this.config.defaultOutputFormat)) {
      errors.push(`defaultOutputFormat must be one of: ${validFormats.join(', ')}`);
    }

    const validModels = ['claude', 'claude-3-5-sonnet', 'claude-3-haiku', 'gpt', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'];
    if (!validModels.includes(this.config.defaultModel)) {
      errors.push(`defaultModel must be one of: ${validModels.join(', ')}`);
    }

    const validLogLevels = ['error', 'warn', 'info', 'debug'];
    if (!validLogLevels.includes(this.config.logLevel)) {
      errors.push(`logLevel must be one of: ${validLogLevels.join(', ')}`);
    }

    // Validate paths
    if (this.config.defaultOutputPath) {
      try {
        path.resolve(this.config.defaultOutputPath);
      } catch (error) {
        errors.push('defaultOutputPath must be a valid path');
      }
    }

    if (this.config.templatePath) {
      try {
        path.resolve(this.config.templatePath);
      } catch (error) {
        errors.push('templatePath must be a valid path');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get configuration file path
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Set configuration file path
   */
  setConfigPath(newPath: string): void {
    this.configPath = newPath;
  }

  /**
   * Check if configuration file exists
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.configPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Import configuration from file
   */
  async import(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const importedConfig = JSON.parse(content);
      
      // Validate imported config
      const tempConfig = { ...this.getDefaultConfig(), ...importedConfig };
      const tempManager = new ConfigManager();
      tempManager.config = tempConfig;
      
      const validation = tempManager.validate();
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }
      
      this.config = tempConfig;
      await this.save();
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export configuration to file
   */
  async export(filePath: string): Promise<void> {
    try {
      await fs.writeFile(filePath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      throw new Error(`Failed to export configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all configuration keys
   */
  listKeys(): (keyof SparkConfig)[] {
    return Object.keys(this.config) as (keyof SparkConfig)[];
  }

  /**
   * Get configuration summary for display
   */
  getSummary(): { section: string; items: { key: string; value: any; description: string }[] }[] {
    return [
      {
        section: 'LLM Providers',
        items: [
          {
            key: 'claudeApiKey',
            value: this.config.claudeApiKey ? '***' + this.config.claudeApiKey.slice(-4) : 'Not set',
            description: 'Claude API key'
          },
          {
            key: 'openaiApiKey',
            value: this.config.openaiApiKey ? '***' + this.config.openaiApiKey.slice(-4) : 'Not set',
            description: 'OpenAI API key'
          },
          {
            key: 'defaultModel',
            value: this.config.defaultModel,
            description: 'Default LLM model'
          }
        ]
      },
      {
        section: 'Output',
        items: [
          {
            key: 'defaultOutputFormat',
            value: this.config.defaultOutputFormat,
            description: 'Default output format'
          },
          {
            key: 'defaultOutputPath',
            value: this.config.defaultOutputPath || 'Not set',
            description: 'Default output directory'
          }
        ]
      },
      {
        section: 'Generation',
        items: [
          {
            key: 'maxIterations',
            value: this.config.maxIterations,
            description: 'Maximum iteration count'
          },
          {
            key: 'autoSave',
            value: this.config.autoSave,
            description: 'Auto-save generated PRDs'
          },
          {
            key: 'interactiveMode',
            value: this.config.interactiveMode,
            description: 'Enable interactive mode by default'
          }
        ]
      },
      {
        section: 'Validation',
        items: [
          {
            key: 'strictValidation',
            value: this.config.strictValidation,
            description: 'Use strict validation rules'
          },
          {
            key: 'validationOnGenerate',
            value: this.config.validationOnGenerate,
            description: 'Validate PRDs after generation'
          }
        ]
      },
      {
        section: 'Sessions',
        items: [
          {
            key: 'sessionTimeout',
            value: `${this.config.sessionTimeout} minutes`,
            description: 'Session timeout duration'
          },
          {
            key: 'maxSessions',
            value: this.config.maxSessions,
            description: 'Maximum concurrent sessions'
          }
        ]
      },
      {
        section: 'Advanced',
        items: [
          {
            key: 'logLevel',
            value: this.config.logLevel,
            description: 'Logging level'
          },
          {
            key: 'cacheEnabled',
            value: this.config.cacheEnabled,
            description: 'Enable response caching'
          },
          {
            key: 'telemetryEnabled',
            value: this.config.telemetryEnabled,
            description: 'Enable telemetry collection'
          }
        ]
      }
    ];
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): SparkConfig {
    return {
      // LLM Provider Configuration
      defaultModel: 'claude-3-5-sonnet',
      
      // Output Configuration
      defaultOutputFormat: 'markdown',
      
      // Generation Configuration
      maxIterations: 5,
      autoSave: true,
      interactiveMode: true,
      
      // Validation Configuration
      strictValidation: false,
      validationOnGenerate: true,
      
      // Session Configuration
      sessionTimeout: 60, // 1 hour
      maxSessions: 10,
      
      // Advanced Configuration
      logLevel: 'info',
      cacheEnabled: true,
      telemetryEnabled: false
    };
  }
}
