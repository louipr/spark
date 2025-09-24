import { GitHubCopilotCLI, CopilotTarget } from './GitHubCopilotCLI.js';
import { Logger } from '../utils/index.js';

export interface AIAssistant {
  suggestCommand(prompt: string, context?: string): Promise<string | null>;
  explainCommand(command: string): Promise<string | null>;
  isAvailable(): Promise<boolean>;
}

/**
 * GitHub Copilot integration for Spark
 * Provides AI-powered command suggestions and explanations
 */
export class CopilotAssistant implements AIAssistant {
  private readonly copilot: GitHubCopilotCLI;
  private readonly logger: Logger;

  constructor(logger?: Logger) {
    this.copilot = new GitHubCopilotCLI();
    this.logger = logger || new Logger({ level: 'info' });
  }

  /**
   * Get a command suggestion based on a natural language prompt
   * @param prompt - Natural language description of what the user wants to do
   * @param context - Optional context about the project or environment
   * @returns Suggested command or null if no suggestion could be generated
   */
  async suggestCommand(prompt: string, context?: string): Promise<string | null> {
    try {
      // Determine the best target based on the prompt
      const target = this.determineTarget(prompt);
      
      // Enhance prompt with context if provided
      const enhancedPrompt = context ? `${context}\n${prompt}` : prompt;
      
      this.logger.debug(`Requesting suggestion for: "${enhancedPrompt}" (target: ${target})`);
      
      const result = await this.copilot.suggest(enhancedPrompt, target);
      
      if (result.success && result.suggestion) {
        this.logger.info(`Generated suggestion: ${result.suggestion}`);
        return result.suggestion;
      } else {
        this.logger.warn(`Failed to generate suggestion: ${result.error}`);
        return null;
      }
    } catch (error) {
      this.logger.error('Error generating command suggestion:', error);
      return null;
    }
  }

  /**
   * Get an explanation for a given command
   * @param command - The command to explain
   * @returns Explanation of the command or null if explanation could not be generated
   */
  async explainCommand(command: string): Promise<string | null> {
    try {
      this.logger.debug(`Requesting explanation for: "${command}"`);
      
      const result = await this.copilot.explain(command);
      
      if (result.success && result.explanation) {
        this.logger.info(`Generated explanation for command`);
        return result.explanation;
      } else {
        this.logger.warn(`Failed to generate explanation: ${result.error}`);
        return null;
      }
    } catch (error) {
      this.logger.error('Error generating command explanation:', error);
      return null;
    }
  }

  /**
   * Check if GitHub Copilot CLI is available
   * @returns True if the CLI is available and working
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await this.copilot.isAvailable();
    } catch (error) {
      this.logger.error('Error checking Copilot availability:', error);
      return false;
    }
  }

  /**
   * Determine the best target type based on the prompt content
   * @param prompt - The user's prompt
   * @returns The most appropriate target type
   */
  private determineTarget(prompt: string): CopilotTarget {
    const lowerPrompt = prompt.toLowerCase();
    
    // GitHub-specific keywords
    if (lowerPrompt.includes('github') || 
        lowerPrompt.includes('repo') ||
        lowerPrompt.includes('pull request') ||
        lowerPrompt.includes('issue') ||
        lowerPrompt.includes('release') ||
        lowerPrompt.includes('gh ')) {
      return 'gh';
    }
    
    // Git-specific keywords
    if (lowerPrompt.includes('git') ||
        lowerPrompt.includes('commit') ||
        lowerPrompt.includes('branch') ||
        lowerPrompt.includes('merge') ||
        lowerPrompt.includes('push') ||
        lowerPrompt.includes('pull') ||
        lowerPrompt.includes('checkout') ||
        lowerPrompt.includes('diff') ||
        lowerPrompt.includes('log') ||
        lowerPrompt.includes('status')) {
      return 'git';
    }
    
    // Default to shell for general commands
    return 'shell';
  }

  /**
   * Generate suggestions for common Spark use cases
   * @param useCase - The type of task the user wants to accomplish
   * @param projectPath - Path to the current project
   * @returns Tailored suggestion for the use case
   */
  async suggestForUseCase(useCase: string, projectPath?: string): Promise<string | null> {
    const useCasePrompts: Record<string, string> = {
      'setup': 'initialize a new project with package.json and basic structure',
      'test': 'run tests for this project',
      'build': 'build this project for production',
      'dev': 'start development server for this project',
      'deploy': 'deploy this project to production',
      'install': 'install dependencies for this project',
      'lint': 'lint and format code in this project',
      'clean': 'clean build artifacts and dependencies',
    };

    const prompt = useCasePrompts[useCase.toLowerCase()];
    if (!prompt) {
      return null;
    }

    const context = projectPath ? `Working in project directory: ${projectPath}` : undefined;
    return this.suggestCommand(prompt, context);
  }
}
