// Spark CLI - Main orchestration class for the CLI interface

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';

import { 
  UserRequest, 
  PRD, 
  ValidationResult,
  OutputFormat,
  ModelType,
  LLMProvider,
  ProcessingStage
} from '../models/index.js';

import { RequestAnalyzer } from '../core/analyzer/index.js';
import { PRDGenerator } from '../core/generator/index.js';
import { StateManager, IterationManager, ValidationEngine, ValidationReport } from '../core/orchestrator/index.js';
import { LLMRouter, ProviderConfig, RoutingStrategy } from '../core/llm/index.js';
import { OutputFormatter as UtilsFormatter } from '../utils/index.js';
import { ConfigManager } from './ConfigManager.js';
import { OutputFormatter } from './OutputFormatter.js';

export interface GenerationOptions {
  description: string;
  format: OutputFormat;
  model: string;
  maxIterations: number;
  interactive: boolean;
  outputPath?: string;
  template?: string;
}

export interface ValidationOptions {
  filePath: string;
  format: OutputFormat;
  strict: boolean;
  outputPath?: string;
}

export interface GenerationResult {
  sessionId: string;
  prd: PRD;
  iterations: number;
  validationResult: ValidationReport;
  outputPath?: string;
  processingTime: number;
  confidence: number;
}

export interface SessionInfo {
  sessionId: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  description: string;
  iterations: number;
}

export interface TemplateInfo {
  name: string;
  description: string;
  category: string;
  createdAt: Date;
  usageCount: number;
}

export class SparkCLI extends EventEmitter {
  private requestAnalyzer: RequestAnalyzer;
  private prdGenerator: PRDGenerator;
  private stateManager: StateManager;
  private iterationManager: IterationManager;
  private validationEngine: ValidationEngine;
  private agentRouter: LLMRouter;
  private configManager: ConfigManager;
  private outputFormatter: OutputFormatter;
  private initialized: boolean = false;

  constructor() {
    super();
    
    // Initialize components
    this.requestAnalyzer = new RequestAnalyzer();
    this.prdGenerator = new PRDGenerator();
    this.stateManager = new StateManager();
    this.validationEngine = new ValidationEngine();
    this.configManager = new ConfigManager();
    this.outputFormatter = new OutputFormatter();
    
    // Will be initialized in initialize()
    this.agentRouter = null as any;
    this.iterationManager = null as any;
  }

  /**
   * Initialize the CLI with configuration
   */
  async initialize(options: any = {}): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Load configuration
      await this.configManager.load();
      
      // Initialize LLM providers
      const providerConfigs = await this.createProviderConfigs(options);
      this.agentRouter = new LLMRouter(providerConfigs);
      
      // Initialize iteration manager
      this.iterationManager = new IterationManager(
        this.stateManager,
        this.requestAnalyzer,
        this.prdGenerator,
        this.agentRouter,
        {
          maxIterations: options.maxIterations || 5,
          convergenceThreshold: 0.9,
          improvementThreshold: 0.1,
          enableAutoApproval: false
        }
      );

      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Generate a PRD from a description
   */
  async generatePRD(options: GenerationOptions): Promise<GenerationResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    const sessionId = `session-${Date.now()}`;

    try {
      this.emit('generation-started', { sessionId, options });

      // Create user request
      const userRequest: UserRequest = {
        id: `req-${Date.now()}`,
        timestamp: new Date(),
        rawInput: options.description,
        sessionId,
        context: {
          previousRequests: [],
          currentPRD: undefined,
          iterationCount: 0,
          userPreferences: {
            defaultModel: this.mapStringToModelType(options.model),
            outputFormat: options.format,
            iterationLimit: options.maxIterations
          },
          conversationHistory: []
        }
      };

      // Initialize session
      this.stateManager.initializeSession(sessionId, userRequest);

      let prd: PRD;
      let iterations = 0;
      let confidence = 0;

      if (options.interactive && options.maxIterations > 1) {
        // Interactive iterative refinement
        const iterationResults = await this.iterationManager.executeIterativeRefinement(
          sessionId,
          userRequest
        );
        
        iterations = iterationResults.length;
        const lastResult = iterationResults[iterationResults.length - 1];
        prd = lastResult.prd;
        confidence = lastResult.confidence;

        // Show iteration progress
        for (const [index, result] of iterationResults.entries()) {
          console.log(chalk.blue(`\n📋 Iteration ${index + 1}:`));
          console.log(chalk.gray(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`));
          console.log(chalk.gray(`  Convergence: ${(result.convergenceScore * 100).toFixed(1)}%`));
          
          if (result.improvements.length > 0) {
            console.log(chalk.green('  Improvements:'));
            result.improvements.forEach(improvement => {
              console.log(chalk.green(`    ✓ ${improvement}`));
            });
          }

          // Ask for feedback if not the last iteration
          if (options.interactive && index < iterationResults.length - 1) {
            const feedbackResponse = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'provideFeedback',
                message: 'Would you like to provide feedback for the next iteration?',
                default: false
              }
            ]);

            if (feedbackResponse.provideFeedback) {
              const feedback = await inquirer.prompt([
                {
                  type: 'editor',
                  name: 'feedback',
                  message: 'Provide your feedback:'
                }
              ]);

              // Process feedback in next iteration
              await this.iterationManager.processUserFeedback(
                sessionId,
                feedback.feedback,
                result.prd
              );
            }
          }
        }
      } else {
        // Single generation
        const spinner = ora('Analyzing request...').start();
        
        const analysisResult = await this.requestAnalyzer.analyze(userRequest);
        spinner.text = 'Generating PRD...';
        
        prd = await this.prdGenerator.generate(userRequest, analysisResult);
        iterations = 1;
        confidence = 0.8; // Default confidence for single generation
        
        spinner.succeed('PRD generated');
      }

      // Validate the final PRD
      const validationResult = await this.validationEngine.validatePRD(prd);

      // Save output if path specified
      let outputPath: string | undefined;
      if (options.outputPath) {
        outputPath = await this.savePRD(prd, options.outputPath, options.format);
      }

      const processingTime = Date.now() - startTime;
      
      const result: GenerationResult = {
        sessionId,
        prd,
        iterations,
        validationResult,
        outputPath,
        processingTime,
        confidence
      };

      this.emit('generation-completed', result);
      return result;

    } catch (error) {
      this.emit('generation-failed', { sessionId, error });
      throw error;
    }
  }

  /**
   * Validate an existing PRD
   */
  async validatePRD(options: ValidationOptions): Promise<ValidationReport> {
    try {
      // Read the PRD file
      const content = await fs.readFile(options.filePath, 'utf-8');
      
      // Parse based on format
      let prd: PRD;
      switch (options.format) {
        case OutputFormat.JSON:
          prd = JSON.parse(content);
          break;
        case OutputFormat.MARKDOWN:
          // Parse markdown to PRD (simplified)
          prd = this.parseMarkdownToPRD(content);
          break;
        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }

      // Validate with appropriate strictness
      const validationEngine = new ValidationEngine({
        strictMode: options.strict
      });

      const validationResult = await validationEngine.validatePRD(prd);

      // Save validation report if path specified
      if (options.outputPath) {
        await this.saveValidationReport(validationResult, options.outputPath);
      }

      return validationResult;
    } catch (error) {
      throw new Error(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Start interactive mode
   */
  async startInteractiveMode(options: any = {}): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    let sessionId = options.resume;
    
    if (sessionId) {
      // Resume existing session
      const session = this.stateManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }
      console.log(chalk.green(`Resumed session: ${sessionId}`));
    }

    while (true) {
      const response = await inquirer.prompt([
        {
          type: 'input',
          name: 'input',
          message: chalk.cyan('spark>'),
          prefix: ''
        }
      ]);

      const input = response.input.trim();

      if (input === '/exit' || input === '/quit') {
        console.log(chalk.yellow('Goodbye! 👋'));
        break;
      }

      if (input === '/help') {
        this.showInteractiveHelp();
        continue;
      }

      if (input === '/config') {
        const config = await this.configManager.getAll();
        this.outputFormatter.displayConfig(config);
        continue;
      }

      if (input === '/session') {
        const sessions = await this.listSessions();
        this.outputFormatter.displaySessions(sessions);
        continue;
      }

      if (input.startsWith('/')) {
        console.log(chalk.red(`Unknown command: ${input}`));
        console.log(chalk.gray('Type /help for available commands'));
        continue;
      }

      if (input.length === 0) {
        continue;
      }

      // Process as generation request
      try {
        const result = await this.generatePRD({
          description: input,
          format: OutputFormat.MARKDOWN,
          model: 'claude',
          maxIterations: 3,
          interactive: true
        });

        await this.outputFormatter.displayGenerationResult(result);
        sessionId = result.sessionId;
      } catch (error) {
        console.error(chalk.red('Generation failed:'), error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }

  /**
   * List all sessions
   */
  async listSessions(): Promise<SessionInfo[]> {
    const sessions = this.stateManager.getAllSessions();
    
    return sessions.map((session: any) => ({
      sessionId: session.sessionId,
      userId: session.userId,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt || session.createdAt,
      status: session.workflowState.currentStage,
      description: session.currentRequest?.rawInput?.substring(0, 100) + '...' || 'No description',
      iterations: session.workflowState.completed.length
    }));
  }

  /**
   * Resume a session
   */
  async resumeSession(sessionId: string): Promise<SessionInfo> {
    const session = this.stateManager.getSession(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return {
      sessionId: session.sessionId,
      userId: session.userId,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt || session.createdAt,
      status: session.workflowState.currentStage,
      description: session.currentRequest?.rawInput || 'No description',
      iterations: session.workflowState.completed.length
    };
  }

  /**
   * Export session data
   */
  async exportSession(sessionId: string): Promise<{ path: string; data: any }> {
    const session = this.stateManager.getSession(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const exportData = this.stateManager.exportSession(sessionId);
    const outputPath = `spark-session-${sessionId}-${Date.now()}.json`;
    
    await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2));
    
    return { path: outputPath, data: exportData };
  }

  /**
   * Import session data
   */
  async importSession(filePath: string): Promise<{ sessionId: string }> {
    const content = await fs.readFile(filePath, 'utf-8');
    const sessionData = JSON.parse(content);
    
    const sessionId = this.stateManager.importSession(sessionData);
    
    return { sessionId };
  }

  /**
   * Cleanup old sessions
   */
  async cleanupSessions(): Promise<{ count: number }> {
    const count = this.stateManager.cleanupExpiredSessions();
    return { count };
  }

  /**
   * List available templates (placeholder)
   */
  async listTemplates(): Promise<TemplateInfo[]> {
    // This would be implemented with actual template storage
    return [
      {
        name: 'web-app',
        description: 'Standard web application template',
        category: 'Web',
        createdAt: new Date(),
        usageCount: 10
      },
      {
        name: 'mobile-app',
        description: 'Mobile application template',
        category: 'Mobile',
        createdAt: new Date(),
        usageCount: 5
      }
    ];
  }

  /**
   * Create template (placeholder)
   */
  async createTemplate(name: string): Promise<TemplateInfo> {
    // This would be implemented with actual template creation
    return {
      name,
      description: 'Custom template',
      category: 'Custom',
      createdAt: new Date(),
      usageCount: 0
    };
  }

  /**
   * Delete template (placeholder)
   */
  async deleteTemplate(name: string): Promise<void> {
    // This would be implemented with actual template deletion
  }

  /**
   * Export template (placeholder)
   */
  async exportTemplate(name: string): Promise<{ path: string }> {
    // This would be implemented with actual template export
    return { path: `template-${name}.json` };
  }

  /**
   * Import template (placeholder)
   */
  async importTemplate(filePath: string): Promise<{ name: string }> {
    // This would be implemented with actual template import
    const name = path.basename(filePath, '.json');
    return { name };
  }

  /**
   * Create provider configurations
   */
  private async createProviderConfigs(options: any): Promise<ProviderConfig[]> {
    const config = await this.configManager.getAll();
    const configs: ProviderConfig[] = [];

    // Claude configuration
    if (config.claudeApiKey || process.env.ANTHROPIC_API_KEY) {
      configs.push({
        provider: LLMProvider.CLAUDE,
        config: {
          model: ModelType.CLAUDE_3_5_SONNET,
          temperature: 0.7,
          maxTokens: 4000,
          topP: 0.9
        },
        priority: 'must_have' as any,
        enabled: true,
        apiKey: options.apiKey || config.claudeApiKey || process.env.ANTHROPIC_API_KEY
      });
    }

    // GPT configuration
    if (config.openaiApiKey || process.env.OPENAI_API_KEY) {
      configs.push({
        provider: LLMProvider.GPT,
        config: {
          model: ModelType.GPT_4O,
          temperature: 0.7,
          maxTokens: 4000,
          topP: 0.9
        },
        priority: 'should_have' as any,
        enabled: true,
        apiKey: options.apiKey || config.openaiApiKey || process.env.OPENAI_API_KEY
      });
    }

    if (configs.length === 0) {
      throw new Error('No LLM providers configured. Please set API keys using: spark config --set claudeApiKey=YOUR_KEY');
    }

    return configs;
  }

  /**
   * Map string to ModelType
   */
  private mapStringToModelType(model: string): ModelType {
    switch (model.toLowerCase()) {
      case 'claude':
      case 'claude-3-5-sonnet':
        return ModelType.CLAUDE_3_5_SONNET;
      case 'claude-3-haiku':
        return ModelType.CLAUDE_3_HAIKU;
      case 'gpt':
      case 'gpt-4o':
        return ModelType.GPT_4O;
      case 'gpt-4-turbo':
        return ModelType.GPT_4_TURBO;
      case 'gpt-3.5-turbo':
        return ModelType.GPT_3_5_TURBO;
      default:
        return ModelType.CLAUDE_3_5_SONNET;
    }
  }

  /**
   * Save PRD to file
   */
  private async savePRD(prd: PRD, outputPath: string, format: OutputFormat): Promise<string> {
    let content: string;
    
    switch (format) {
      case OutputFormat.JSON:
        content = JSON.stringify(prd, null, 2);
        break;
      case OutputFormat.MARKDOWN:
        content = this.convertPRDToMarkdown(prd);
        break;
      case OutputFormat.YAML:
        // Would use a YAML library here
        content = JSON.stringify(prd, null, 2);
        break;
      default:
        content = JSON.stringify(prd, null, 2);
    }

    await fs.writeFile(outputPath, content);
    return outputPath;
  }

  /**
   * Convert PRD to Markdown
   */
  private convertPRDToMarkdown(prd: PRD): string {
    let markdown = '';
    
    // Title and metadata
    markdown += `# ${prd.metadata?.title || 'Product Requirements Document'}\n\n`;
    markdown += `**Version:** ${prd.version}\n`;
    markdown += `**Created:** ${prd.metadata?.createdAt?.toLocaleDateString() || 'Unknown'}\n`;
    markdown += `**Author:** ${prd.metadata?.author || 'Spark'}\n\n`;
    
    // Description
    if (prd.metadata?.description) {
      markdown += `## Description\n\n${prd.metadata.description}\n\n`;
    }

    // Product Overview
    if (prd.productOverview) {
      markdown += `## Product Overview\n\n`;
      if (prd.productOverview.vision) {
        markdown += `**Vision:** ${prd.productOverview.vision}\n\n`;
      }
      if (prd.productOverview.objectives?.length) {
        markdown += `**Objectives:**\n`;
        prd.productOverview.objectives.forEach(obj => {
          markdown += `- ${obj}\n`;
        });
        markdown += '\n';
      }
    }

    // Functional Requirements
    if (prd.functionalRequirements?.length) {
      markdown += `## Functional Requirements\n\n`;
      prd.functionalRequirements.forEach((req, index) => {
        markdown += `### ${index + 1}. ${req.title}\n\n`;
        markdown += `${req.description}\n\n`;
        markdown += `**Priority:** ${req.priority}\n\n`;
        if (req.acceptanceCriteria?.length) {
          markdown += `**Acceptance Criteria:**\n`;
          req.acceptanceCriteria.forEach(criteria => {
            markdown += `- ${criteria}\n`;
          });
          markdown += '\n';
        }
      });
    }

    // Technical Specifications
    if (prd.technicalSpecifications) {
      markdown += `## Technical Specifications\n\n`;
      if (prd.technicalSpecifications.techStack) {
        markdown += `### Technology Stack\n\n`;
        markdown += `- **Frontend:** ${JSON.stringify(prd.technicalSpecifications.techStack.frontend)}\n`;
        markdown += `- **Backend:** ${JSON.stringify(prd.technicalSpecifications.techStack.backend)}\n`;
        markdown += `- **Database:** ${JSON.stringify(prd.technicalSpecifications.techStack.database)}\n\n`;
      }
    }

    return markdown;
  }

  /**
   * Parse Markdown to PRD (simplified)
   */
  private parseMarkdownToPRD(content: string): PRD {
    // This is a simplified parser - would be more sophisticated in practice
    const lines = content.split('\n');
    let title = 'Imported PRD';
    
    // Extract title from first header
    for (const line of lines) {
      if (line.startsWith('# ')) {
        title = line.substring(2).trim();
        break;
      }
    }

    // Create a minimal PRD structure that satisfies the type requirements
    const minimalPRD = {
      id: `imported-${Date.now()}`,
      version: '1.0.0',
      metadata: {
        title,
        description: 'Imported from Markdown',
        author: 'Unknown',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: [],
        estimatedTimeline: '',
        targetAudience: []
      },
      productOverview: {
        vision: '',
        objectives: [],
        valueProposition: '',
        targetUsers: [],
        successMetrics: []
      },
      functionalRequirements: [],
      technicalSpecifications: {} as any,
      userInterface: {} as any,
      dataModel: {} as any,
      apiSpecification: [],
      securityRequirements: [],
      performanceRequirements: {} as any,
      testingStrategy: {} as any,
      deploymentConfig: {} as any,
      implementationPlan: [],
      futureEnhancements: []
    };

    // Use type assertion to satisfy TypeScript - this is acceptable for a simplified parser
    return minimalPRD as PRD;
  }

  /**
   * Save validation report
   */
  private async saveValidationReport(result: any, outputPath: string): Promise<void> {
    const report = JSON.stringify(result, null, 2);
    await fs.writeFile(outputPath, report);
  }

  /**
   * Show interactive help
   */
  private showInteractiveHelp(): void {
    console.log(chalk.cyan('\n📖 Interactive Mode Commands:\n'));
    console.log(chalk.white('  /help     - Show this help message'));
    console.log(chalk.white('  /config   - Show current configuration'));
    console.log(chalk.white('  /session  - Show session information'));
    console.log(chalk.white('  /exit     - Exit interactive mode'));
    console.log(chalk.gray('\nJust type your project description to generate a PRD!\n'));
  }

  /**
   * Start interactive mode (alias for startInteractiveMode)
   */
  async startInteractive(options: any = {}): Promise<void> {
    return this.startInteractiveMode(options);
  }

  /**
   * Output result in specified format
   */
  async outputResult(prd: PRD, options: { format?: OutputFormat, outputPath?: string } = {}): Promise<void> {
    const { format = OutputFormat.MARKDOWN, outputPath } = options;
    
    if (outputPath) {
      const savedPath = await this.savePRD(prd, outputPath, format);
      console.log(chalk.green(`✅ PRD saved to: ${savedPath}`));
    } else {
      // Output to console
      switch (format) {
        case OutputFormat.JSON:
          console.log(JSON.stringify(prd, null, 2));
          break;
        case OutputFormat.MARKDOWN:
          console.log(UtilsFormatter.formatPRDAsMarkdown(prd));
          break;
        case OutputFormat.TEXT:
        default:
          console.log(UtilsFormatter.formatPRD(prd));
          break;
      }
    }
  }
}
