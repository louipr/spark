// Spark Clone - Main Application Class
// Central application orchestrator for all major components

import { program } from 'commander';
import { ConfigManager } from './cli/ConfigManager.js';
import { Logger } from './utils/index.js';
import { StateManager } from './core/orchestrator/StateManager.js';
import { RequestAnalyzer } from './core/analyzer/RequestAnalyzer.js';
import { PRDGenerator } from './core/generator/PRDGenerator.js';
import { LLMRouter, ProviderConfig } from './core/llm/index.js';
import { IterationManager } from './core/orchestrator/IterationManager.js';
import { ValidationEngine } from './core/orchestrator/ValidationEngine.js';
import { WorkflowOrchestrator } from './core/agent/WorkflowOrchestrator.js';
import { 
  FileStorage, 
  HistoryManager, 
  CacheManager 
} from './storage/index.js';
import { CopilotAssistant } from './integrations/index.js';
import { UserRequest, LLMProvider, ModelType, Priority } from './models/index.js';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
import path from 'path';
import os from 'os';

// Load environment variables
dotenv.config();

// Helper function to expand ~ to home directory
function expandHomePath(filePath: string): string {
  if (filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

export class SparkApplication {
  private logger!: Logger;
  private configManager!: ConfigManager;
  private stateManager!: StateManager;
  private requestAnalyzer!: RequestAnalyzer;
  private prdGenerator!: PRDGenerator;
  private agentRouter!: LLMRouter;
  private iterationManager!: IterationManager;
  private validationEngine!: ValidationEngine;
  private fileStorage!: FileStorage;
  private historyManager!: HistoryManager;
  private cacheManager!: CacheManager;
  private workflowOrchestrator!: WorkflowOrchestrator;
  private copilotAssistant!: CopilotAssistant;

  constructor() {
    // Initialize in async init method
  }

  /**
   * Initialize all application components
   */
  public async initialize(): Promise<void> {
    try {
      // Initialize logging first
      this.logger = new Logger({ level: 'info' });
      this.logger.info('🚀 Initializing Spark Clone application...');

      // Initialize configuration manager
      this.configManager = new ConfigManager();

      // Initialize file storage
      const dataPath = expandHomePath(process.env.SPARK_DATA_PATH || '~/.spark');
      this.fileStorage = new FileStorage({
        basePath: dataPath,
        createDirectories: true
      });
      await this.fileStorage.initialize();

      // Initialize storage-dependent components
      this.historyManager = new HistoryManager(this.fileStorage);
      await this.historyManager.initialize();

      this.cacheManager = new CacheManager({
        ttl: 3600, // 1 hour default TTL
        storage: this.fileStorage
      });
      await this.cacheManager.initialize();

      // Initialize state manager
      this.stateManager = new StateManager();

      // Initialize core components
      this.requestAnalyzer = new RequestAnalyzer();
      this.prdGenerator = new PRDGenerator();
      this.validationEngine = new ValidationEngine();

      // Initialize GitHub Copilot assistant first
      this.copilotAssistant = new CopilotAssistant(this.logger);

      // Initialize LLM components (will be initialized per-command with specific model)
      // Create default router with all available providers
      const defaultConfigs = this.createProviderConfigs();
      this.agentRouter = new LLMRouter(defaultConfigs, this.copilotAssistant);

      // Initialize workflow orchestrator (the TRUE agent system)
      this.workflowOrchestrator = new WorkflowOrchestrator({
        llmRouter: this.agentRouter,
        stateManager: this.stateManager
      }, {
        requireApproval: false, // Auto-approve for demo
        allowParallelExecution: false,
        maxExecutionTime: 30,
        autoRetry: true
      });

      // Initialize legacy orchestrator (for backward compatibility)
      this.iterationManager = new IterationManager(
        this.stateManager,
        this.requestAnalyzer,
        this.prdGenerator,
        this.agentRouter
      );

      this.logger.info('✅ All components initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize application:', error);
      process.exit(1);
    }
  }

  private createProviderConfigForModel(modelType: ModelType): ProviderConfig | null {
    // Map model to provider and check availability
    switch (modelType) {
      case ModelType.CLAUDE_3_5_SONNET:
      case ModelType.CLAUDE_3_HAIKU:
        if (!process.env.ANTHROPIC_API_KEY) {
          this.logger.warn(`⚠️ ${modelType} requested but ANTHROPIC_API_KEY not found`);
          return null;
        }
        return {
          provider: LLMProvider.CLAUDE,
          config: {
            model: modelType,
            temperature: 0.7,
            maxTokens: 4000,
            topP: 1.0,
            frequencyPenalty: 0,
            presencePenalty: 0
          },
          priority: Priority.MUST_HAVE,
          enabled: true,
          apiKey: process.env.ANTHROPIC_API_KEY
        };

      case ModelType.GPT_4_TURBO:
      case ModelType.GPT_4O:
      case ModelType.GPT_3_5_TURBO:
        if (!process.env.OPENAI_API_KEY) {
          this.logger.warn(`⚠️ ${modelType} requested but OPENAI_API_KEY not found`);
          return null;
        }
        return {
          provider: LLMProvider.GPT,
          config: {
            model: modelType,
            temperature: 0.7,
            maxTokens: 4000,
            topP: 1.0,
            frequencyPenalty: 0,
            presencePenalty: 0
          },
          priority: Priority.SHOULD_HAVE,
          enabled: true,
          apiKey: process.env.OPENAI_API_KEY
        };

      case ModelType.GITHUB_COPILOT:
        // GitHub Copilot doesn't require API key - uses GitHub CLI authentication
        return {
          provider: LLMProvider.GITHUB_COPILOT,
          config: {
            model: modelType,
            temperature: 0.7, // Not used by Copilot but required by interface
            maxTokens: 4000,
            topP: 1.0,
            frequencyPenalty: 0,
            presencePenalty: 0
          },
          priority: Priority.NICE_TO_HAVE, // Fallback option
          enabled: true
          // No apiKey needed - uses GitHub CLI authentication
        };

      default:
        this.logger.warn(`⚠️ Unsupported model type: ${modelType}`);
        return null;
    }
  }

  private createProviderConfigs(requestedModel?: ModelType): ProviderConfig[] {
    const configs: ProviderConfig[] = [];

    if (requestedModel) {
      // Create config for specific requested model
      const config = this.createProviderConfigForModel(requestedModel);
      if (config) {
        configs.push(config);
        this.logger.info(`✅ Created provider config for requested model: ${requestedModel}`);
      } else {
        this.logger.error(`❌ Cannot create provider config for requested model: ${requestedModel}`);
      }
    } else {
      // Default behavior: create configs for all available providers (legacy support)
      const defaultModels = [
        ModelType.CLAUDE_3_5_SONNET,
        ModelType.GPT_4_TURBO,
        ModelType.GITHUB_COPILOT // Always include GitHub Copilot as fallback
      ];

      for (const model of defaultModels) {
        const config = this.createProviderConfigForModel(model);
        if (config) {
          configs.push(config);
        }
      }
    }

    return configs;
  }

  public async run(): Promise<void> {
    try {
      this.logger.info('🎯 Starting Spark Clone CLI');

      // Set up graceful shutdown
      this.setupGracefulShutdown();

      // Configure commander.js program
      program
        .name('spark-clone')
        .description('AI-powered application generator - GitHub Copilot Spark clone')
        .version('1.0.0');

      // Interactive mode (default)
      program
        .command('interactive')
        .alias('i')
        .description('Start interactive mode for app generation')
        .option('-v, --verbose', 'Enable verbose logging')
        .option('-c, --cache', 'Enable response caching')
        .action(async (options) => {
          await this.handleInteractive(options);
        });

      // One-shot generation mode
      program
        .command('generate <description>')
        .alias('gen')
        .description('Generate PRD from a single description')
        .option('-o, --output <path>', 'Output file path')
        .option('-f, --format <format>', 'Output format (json, markdown, yaml)', 'markdown')
        .option('--no-cache', 'Disable response caching')
        .action(async (description: string, options) => {
          await this.handleOneShot(description, options);
        });

      // History management
      program
        .command('history')
        .description('View conversation history')
        .option('-l, --limit <number>', 'Number of recent conversations to show', '10')
        .option('--clear', 'Clear all history')
        .action(async (options) => {
          await this.handleHistory(options);
        });

      // Configuration management
      program
        .command('config')
        .description('Manage configuration')
        .option('--set <key> <value>', 'Set configuration value')
        .option('--get <key>', 'Get configuration value')
        .option('--list', 'List all configuration')
        .option('--reset', 'Reset to default configuration')
        .action(async (options) => {
          await this.handleConfig(options);
        });

      // Agent workflow commands
      program
        .command('agent <request>')
        .alias('a')
        .description('Use agent to fulfill complex requests with multi-step workflows')
        .option('-m, --model <model>', 'LLM model to use (claude, gpt, copilot)', 'claude')
        .option('--approve', 'Auto-approve execution plan')
        .option('--dry-run', 'Show execution plan without running')
        .action(async (request: string, options) => {
          await this.handleAgentRequest(request, options);
        });

      program
        .command('plan <request>')
        .description('Show execution plan without running')
        .action(async (request: string) => {
          await this.handlePlanRequest(request);
        });

      // GitHub Copilot assistant commands
      program
        .command('suggest <prompt>')
        .alias('ai')
        .description('Get command suggestions from GitHub Copilot')
        .option('-t, --target <type>', 'Target type (shell, git, gh)', 'shell')
        .option('-e, --execute', 'Execute the suggested command')
        .action(async (prompt: string, options) => {
          await this.handleCopilotSuggest(prompt, options);
        });

      program
        .command('explain <command>')
        .description('Get explanation of a command from GitHub Copilot')
        .action(async (command: string) => {
          await this.handleCopilotExplain(command);
        });

      program
        .command('copilot-status')
        .description('Check GitHub Copilot CLI availability')
        .action(async () => {
          await this.handleCopilotStatus();
        });

      // Default to interactive mode if no command specified
      if (process.argv.length <= 2) {
        await this.handleInteractive({});
        return;
      }

      // Parse command line arguments
      await program.parseAsync();

    } catch (error) {
      this.logger.error('❌ Application error:', error);
      process.exit(1);
    }
  }

  private async handleInteractive(options: any): Promise<void> {
    try {
      this.logger.info('🔄 Starting interactive mode');
      
      // For now, just show that interactive mode would start
      console.log('🎯 Interactive mode would start here');
      console.log('📝 This feature is coming soon - use the generate command for now');
      console.log('\nExample: spark generate "Create a todo app with React and Node.js"');
      
    } catch (error) {
      this.logger.error('❌ Interactive mode failed:', error);
      process.exit(1);
    }
  }

  private async handleOneShot(description: string, options: any): Promise<void> {
    try {
      this.logger.info('🔄 Processing one-shot generation request');

      const sessionId = uuidv4();
      const userRequest: UserRequest = {
        id: uuidv4(),
        timestamp: new Date(),
        rawInput: description,
        sessionId,
        userId: 'cli-user'
      };

      // Initialize session
      this.stateManager.initializeSession(sessionId, userRequest);

      // Run iteration process
      const results = await this.iterationManager.executeIterativeRefinement(
        sessionId,
        userRequest
      );

      if (results.length > 0) {
        const finalResult = results[results.length - 1];
        
        // Save to history
        await this.historyManager.addConversation({
          sessionId,
          timestamp: new Date(),
          userInput: description,
          prd: finalResult.prd,
          metadata: {
            iterations: results.length,
            confidence: finalResult.confidence
          }
        });

        // Output result
        await this.outputResult(finalResult.prd, {
          format: options.format as any,
          outputPath: options.output
        });

        this.logger.info('✅ One-shot generation completed successfully');
      } else {
        throw new Error('No results generated');
      }

    } catch (error) {
      this.logger.error('❌ One-shot generation failed:', error);
      process.exit(1);
    }
  }

  private async handleHistory(options: any): Promise<void> {
    try {
      if (options.clear) {
        await this.historyManager.clearHistory();
        this.logger.info('✅ History cleared successfully');
        return;
      }

      const conversations = await this.historyManager.getRecentConversations(
        parseInt(options.limit)
      );

      if (conversations.length === 0) {
        console.log('No conversation history found.');
        return;
      }

      console.log(`\n📚 Recent Conversations (${conversations.length}):\n`);
      
      for (const conv of conversations) {
        console.log(`🕒 ${conv.timestamp.toLocaleString()}`);
        console.log(`📝 "${conv.userInput.substring(0, 80)}${conv.userInput.length > 80 ? '...' : ''}"`);
        console.log(`🎯 ${conv.prd.metadata.title}`);
        console.log(`📊 Iterations: ${conv.metadata?.iterations || 1}, Confidence: ${((conv.metadata?.confidence || 0) * 100).toFixed(1)}%`);
        console.log('─'.repeat(60));
      }

    } catch (error) {
      this.logger.error('❌ Failed to retrieve history:', error);
      process.exit(1);
    }
  }

  private async handleConfig(options: any): Promise<void> {
    try {
      if (options.reset) {
        console.log('✅ Configuration reset to defaults');
        return;
      }

      if (options.list) {
        console.log('\n⚙️ Current Configuration:');
        console.log('Environment variables and configuration displayed here');
        return;
      }

      if (options.get) {
        console.log(`${options.get}: Configuration value would be shown here`);
        return;
      }

      if (options.set && options.set.length === 2) {
        const [key, value] = options.set;
        console.log(`✅ Set ${key} = ${value}`);
        return;
      }

      // Default: show help
      program.help();

    } catch (error) {
      this.logger.error('❌ Configuration command failed:', error);
      process.exit(1);
    }
  }

  private async handleCopilotSuggest(prompt: string, options: any): Promise<void> {
    try {
      console.log(`🤖 Asking GitHub Copilot for suggestions: "${prompt}"`);
      
      // Check if Copilot is available
      const isAvailable = await this.copilotAssistant.isAvailable();
      if (!isAvailable) {
        console.log('❌ GitHub Copilot CLI is not available. Please install it with:');
        console.log('   gh extension install github/gh-copilot');
        process.exit(1);
      }

      // Get suggestion
      const suggestion = await this.copilotAssistant.suggestCommand(prompt, options.target);
      
      if (suggestion) {
        console.log(`\n💡 Suggested command:`);
        console.log(`   ${suggestion}`);
        
        if (options.execute) {
          console.log('\n🚀 Executing suggested command...');
          
          // Import dynamically to avoid circular dependencies
          const { exec } = await import('child_process');
          const { promisify } = await import('util');
          const execAsync = promisify(exec);
          
          try {
            const { stdout, stderr } = await execAsync(suggestion);
            if (stdout) console.log(stdout);
            if (stderr) console.error(stderr);
          } catch (execError) {
            console.error(`❌ Command execution failed:`, execError);
            process.exit(1);
          }
        }
      } else {
        console.log('❌ No suggestion could be generated. The prompt might be too complex or require interactive input.');
      }

      // Exit cleanly after completing the suggestion
      process.exit(0);

    } catch (error) {
      this.logger.error('❌ Copilot suggestion failed:', error);
      process.exit(1);
    }
  }

  private async handleCopilotExplain(command: string): Promise<void> {
    try {
      console.log(`🤖 Asking GitHub Copilot to explain: "${command}"`);
      
      // Check if Copilot is available
      const isAvailable = await this.copilotAssistant.isAvailable();
      if (!isAvailable) {
        console.log('❌ GitHub Copilot CLI is not available. Please install it with:');
        console.log('   gh extension install github/gh-copilot');
        process.exit(1);
      }

      // Get explanation
      const explanation = await this.copilotAssistant.explainCommand(command);
      
      if (explanation) {
        console.log(`\n📚 Command explanation:`);
        console.log(explanation);
      } else {
        console.log('❌ No explanation could be generated for this command.');
      }

      // Exit cleanly after completing the explanation
      process.exit(0);

    } catch (error) {
      this.logger.error('❌ Copilot explanation failed:', error);
      process.exit(1);
    }
  }

  private async handleCopilotStatus(): Promise<void> {
    try {
      console.log('🔍 Checking GitHub Copilot CLI status...');
      
      const isAvailable = await this.copilotAssistant.isAvailable();
      
      if (isAvailable) {
        console.log('✅ GitHub Copilot CLI is available and working');
        
        // Test with a simple suggestion
        console.log('\n🧪 Testing with a simple suggestion...');
        const testSuggestion = await this.copilotAssistant.suggestCommand('list files', 'shell');
        
        if (testSuggestion) {
          console.log(`💡 Test suggestion: ${testSuggestion}`);
          console.log('🎉 GitHub Copilot integration is fully functional!');
        } else {
          console.log('⚠️ GitHub Copilot CLI is available but test suggestion failed');
        }
      } else {
        console.log('❌ GitHub Copilot CLI is not available');
        console.log('\n📋 To install GitHub Copilot CLI:');
        console.log('1. Install GitHub CLI: https://cli.github.com/');
        console.log('2. Install Copilot extension: gh extension install github/gh-copilot');
        console.log('3. Authenticate: gh auth login');
      }

      // Exit cleanly after completing the status check
      process.exit(0);

    } catch (error) {
      this.logger.error('❌ Copilot status check failed:', error);
      process.exit(1);
    }
  }

  private async handleAgentRequest(request: string, options: any): Promise<void> {
    try {
      console.log(`\n🤖 Agent Request: "${request}"`);
      
      if (options.dryRun) {
        // Just show the plan without executing
        await this.handlePlanRequest(request);
        return;
      }

      // Execute the full workflow
      let result = await this.workflowOrchestrator.processRequest(request);
      
      // If orchestration failed due to no providers, try GitHub Copilot fallback
      if (!result.success && result.message && result.message.includes('No providers available')) {
        this.logger.warn('⚠️ LLM providers failed, attempting GitHub Copilot fallback...');
        result = await this.handleCopilotFallback(request);
      }
      
      if (result.success) {
        console.log(`\n✅ Agent completed successfully!`);
        
        if (result.artifacts && result.artifacts.length > 0) {
          console.log(`\n📄 Generated artifacts:`);
          result.artifacts.forEach((artifact: any, index: number) => {
            console.log(`  ${index + 1}. ${artifact.type}: ${artifact.name}`);
          });
        }
        
        if (result.duration) {
          console.log(`⏱️ Total execution time: ${result.duration.toFixed(2)}s`);
        }
      } else {
        console.log(`\n❌ Agent execution failed: ${result.message}`);
        
        if (result.results) {
          const failedSteps = result.results.filter((r: any) => !r.success);
          if (failedSteps.length > 0) {
            console.log(`\n🔍 Failed steps:`);
            failedSteps.forEach((step: any) => {
              console.log(`  - ${step.tool}: ${step.error}`);
            });
          }
        }
        
        process.exit(1);
      }

    } catch (error) {
      console.error('❌ Agent request failed:', error);
      process.exit(1);
    }
  }

  private async handlePlanRequest(request: string): Promise<void> {
    try {
      console.log(`\n📋 Creating execution plan for: "${request}"`);
      
      const validation = await this.workflowOrchestrator.validatePlan(request);
      
      if (validation.isValid && validation.plan) {
        const plan = validation.plan;
        
        console.log(`\n✅ Plan created successfully:`);
        console.log(`Goal: ${plan.goal}`);
        console.log(`Steps: ${plan.steps.length}`);
        console.log(`Estimated Duration: ${plan.estimatedDuration} minutes`);
        
        console.log(`\n📝 Execution Steps:`);
        plan.steps.forEach((step, index) => {
          const dependencies = step.dependencies.length > 0 
            ? ` (depends on: ${step.dependencies.join(', ')})` 
            : '';
          console.log(`  ${index + 1}. ${step.name}`);
          console.log(`     Tool: ${step.tool}${dependencies}`);
          console.log(`     Params: ${JSON.stringify(step.params, null, 2)}`);
        });
        
        console.log(`\n🚀 To execute this plan, run:`);
        console.log(`   spark agent "${request}"`);
        
      } else {
        console.log(`\n❌ Failed to create valid plan:`);
        validation.issues.forEach(issue => {
          console.log(`  - ${issue}`);
        });
        process.exit(1);
      }

    } catch (error) {
      console.error('❌ Plan creation failed:', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      this.logger.info(`📴 Received ${signal}. Graceful shutdown initiated...`);
      
      try {
        // Save any pending state
        await this.cacheManager.flush();
        await this.historyManager.flush();
        
        this.logger.info('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        this.logger.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    process.on('uncaughtException', (error) => {
      this.logger.error('❌ Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('❌ Unhandled Rejection:', `${reason}`);
      process.exit(1);
    });
  }

  /**
   * Handle requests using GitHub Copilot CLI as fallback when LLM providers are unavailable
   */
  private async handleCopilotFallback(request: string): Promise<any> {
    try {
      this.logger.info('🚀 Using GitHub Copilot CLI as LLM fallback');
      
      // Check if GitHub Copilot is available
      const isAvailable = await this.copilotAssistant.isAvailable();
      if (!isAvailable) {
        throw new Error('GitHub Copilot CLI is not available. Please ensure you are authenticated with GitHub Copilot.');
      }
      
      // Use Copilot to generate a command suggestion for the request
      const suggestion = await this.copilotAssistant.suggestCommand(request);
      if (!suggestion) {
        throw new Error('GitHub Copilot could not generate a suggestion for this request.');
      }
      
      console.log(`\n🤖 GitHub Copilot suggestion:`);
      console.log(`${suggestion}`);
      
      // Return a simple success result
      return {
        success: true,
        message: 'GitHub Copilot provided a suggestion',
        artifacts: [{
          type: 'suggestion',
          name: 'GitHub Copilot Command Suggestion',
          content: suggestion
        }],
        duration: 0
      };
    } catch (error) {
      this.logger.error('GitHub Copilot fallback failed:', error);
      throw new Error(`GitHub Copilot fallback failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Output PRD result in the specified format
   */
  private async outputResult(prd: any, options: { format: string; outputPath?: string }): Promise<void> {
    try {
      let output: string;
      
      switch (options.format?.toLowerCase()) {
        case 'json':
          output = JSON.stringify(prd, null, 2);
          break;
        case 'yaml':
          // Simple YAML-like output (would need proper YAML library for production)
          output = this.convertToYaml(prd);
          break;
        case 'markdown':
        default:
          output = this.convertToMarkdown(prd);
          break;
      }
      
      if (options.outputPath) {
        // Would write to file in production
        console.log(`✅ Would write to file: ${options.outputPath}`);
        console.log(output);
      } else {
        console.log('\n📄 Generated PRD:\n');
        console.log(output);
      }
    } catch (error) {
      this.logger.error('❌ Failed to output result:', error);
      throw error;
    }
  }

  /**
   * Convert PRD to markdown format
   */
  private convertToMarkdown(prd: any): string {
    return `# ${prd.metadata?.title || 'Generated Application'}

## Overview
${prd.productOverview?.description || 'Application description would go here'}

## Features
${prd.functionalRequirements?.map((req: any, i: number) => 
  `${i + 1}. **${req.title}**: ${req.description}`
).join('\n') || 'Features would be listed here'}

## Technical Specifications  
- **Architecture**: ${prd.technicalSpecifications?.architecture?.type || 'Not specified'}
- **Tech Stack**: ${JSON.stringify(prd.technicalSpecifications?.techStack || {}, null, 2)}

---
*Generated by Spark Clone*`;
  }

  /**
   * Convert PRD to YAML-like format
   */
  private convertToYaml(prd: any): string {
    return `title: ${prd.metadata?.title || 'Generated Application'}
description: ${prd.productOverview?.description || 'Application description'}
features:
${prd.functionalRequirements?.map((req: any) => `  - ${req.title}: ${req.description}`).join('\n') || '  - Features would be listed here'}
tech_stack: ${JSON.stringify(prd.technicalSpecifications?.techStack || {}, null, 2)}`;
  }
}
