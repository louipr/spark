// GitHub Copilot Provider - LLM Interface implementation using CopilotAssistant
// Uses composition pattern to delegate to existing integration layer

import { LLMInterface } from './LLMInterface.js';
import { CopilotAssistant } from '../../integrations/index.js';
import {
  LLMProvider,
  LLMMessage,
  LLMResponse,
  LLMConfig,
  TaskType,
  ModelType
} from '../../models/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * GitHub Copilot LLM Provider
 * Implements LLM interface by delegating to CopilotAssistant integration layer
 */
export class GitHubCopilotProvider extends LLMInterface {
  private copilotAssistant: CopilotAssistant;

  constructor(config: LLMConfig, copilotAssistant: CopilotAssistant) {
    super(LLMProvider.GITHUB_COPILOT, config);
    this.copilotAssistant = copilotAssistant;
  }

  /**
   * Generate response using GitHub Copilot CLI
   * Converts LLM messages to natural language prompt for Copilot
   */
  async generate(
    messages: LLMMessage[],
    taskType: TaskType,
    options?: Partial<LLMConfig>
  ): Promise<LLMResponse> {
    try {
      const startTime = Date.now();
      
      // Validate messages
      this.validateMessages(messages);
      
      // Convert messages to a single prompt for GitHub Copilot
      const prompt = this.convertMessagesToPrompt(messages, taskType);
      
      // Use CopilotAssistant to get suggestion
      const suggestion = await this.copilotAssistant.suggestCommand(prompt);
      
      if (!suggestion) {
        throw new Error('GitHub Copilot could not generate a suggestion for this request');
      }

      const endTime = Date.now();
      
      return {
        id: uuidv4(),
        model: ModelType.GITHUB_COPILOT,
        provider: LLMProvider.GITHUB_COPILOT,
        content: suggestion,
        usage: {
          promptTokens: 0, // GitHub Copilot doesn't provide token counts
          completionTokens: 0,
          totalTokens: 0
        },
        metadata: {
          requestId: uuidv4(),
          timestamp: new Date(),
          processingTime: endTime - startTime,
          cacheHit: false
        },
        finishReason: 'stop'
      };
    } catch (error) {
      throw new Error(`GitHub Copilot generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * GitHub Copilot doesn't support streaming, so we simulate it
   */
  async* stream(
    messages: LLMMessage[],
    taskType: TaskType,
    options?: Partial<LLMConfig>
  ): AsyncGenerator<string, void, unknown> {
    // Generate the full response first
    const response = await this.generate(messages, taskType, options);
    
    // Simulate streaming by yielding the content in chunks
    const content = response.content;
    const chunkSize = 10; // Characters per chunk
    
    for (let i = 0; i < content.length; i += chunkSize) {
      yield content.slice(i, i + chunkSize);
      // Small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  /**
   * Check if GitHub Copilot CLI is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await this.copilotAssistant.isAvailable();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get GitHub Copilot capabilities
   */
  getCapabilities() {
    return {
      maxTokens: 4000, // Estimated, GitHub Copilot doesn't specify
      supportsStreaming: true, // Simulated streaming
      supportsSystemMessages: false, // Copilot CLI doesn't support system messages
      supportsFunctionCalling: false, // No function calling support
      modelVersions: ['github-copilot'] // Available model versions
    };
  }

  /**
   * Estimate token count for messages (rough approximation)
   */
  estimateTokens(messages: LLMMessage[]): number {
    // Simple estimation: ~4 characters per token
    const totalText = messages.map(m => m.content).join(' ');
    return Math.ceil(totalText.length / 4);
  }

  /**
   * Prepare messages for GitHub Copilot (convert to single prompt)
   */
  protected prepareMessages(messages: LLMMessage[]): string[] {
    return [this.convertMessagesToPrompt(messages, TaskType.CODE_GENERATION)];
  }

  /**
   * Parse response from GitHub Copilot (already in expected format)
   */
  protected parseResponse(response: string): LLMResponse {
    return {
      id: uuidv4(),
      model: ModelType.GITHUB_COPILOT,
      provider: LLMProvider.GITHUB_COPILOT,
      content: response,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      },
      metadata: {
        requestId: uuidv4(),
        timestamp: new Date(),
        processingTime: 0,
        cacheHit: false
      },
      finishReason: 'stop'
    };
  }

  /**
   * Convert LLM messages to a natural language prompt for GitHub Copilot
   */
  private convertMessagesToPrompt(messages: LLMMessage[], taskType: TaskType): string {
    // Filter out system messages since Copilot CLI doesn't support them
    const userMessages = messages.filter(msg => msg.role === 'user' || msg.role === 'assistant');
    
    // Combine messages into a coherent prompt
    let prompt = '';
    
    // Add task type context if it's code-related
    if (this.isCodeRelatedTask(taskType)) {
      prompt += this.getTaskTypeContext(taskType) + '\n\n';
    }
    
    // Add conversation context
    for (const message of userMessages) {
      if (message.role === 'user') {
        prompt += message.content + '\n';
      } else if (message.role === 'assistant') {
        // Include assistant context to maintain conversation flow
        prompt += `Previous response: ${message.content}\n`;
      }
    }
    
    return prompt.trim();
  }

  /**
   * Check if the task type is code-related and suitable for GitHub Copilot
   */
  private isCodeRelatedTask(taskType: TaskType): boolean {
    const codeRelatedTasks = [
      TaskType.CODE_GENERATION,
      TaskType.ARCHITECTURE_DESIGN,
      TaskType.TESTING_STRATEGY,
      TaskType.DEPLOYMENT_PLANNING
    ];
    
    return codeRelatedTasks.includes(taskType);
  }

  /**
   * Get context prompt based on task type
   */
  private getTaskTypeContext(taskType: TaskType): string {
    const contextMap: Record<TaskType, string> = {
      [TaskType.CODE_GENERATION]: 'Generate code or commands for',
      [TaskType.ARCHITECTURE_DESIGN]: 'Design system architecture or setup commands for',
      [TaskType.TESTING_STRATEGY]: 'Create testing commands or setup for',
      [TaskType.DEPLOYMENT_PLANNING]: 'Plan deployment commands or scripts for',
      [TaskType.PRD_GENERATION]: 'Help with project planning for',
      [TaskType.FEATURE_ANALYSIS]: 'Analyze or implement features for',
      [TaskType.TECH_STACK_SELECTION]: 'Recommend technology stack or setup for',
      [TaskType.DOCUMENTATION]: 'Generate documentation commands or setup for'
    };
    
    return contextMap[taskType] || 'Help with';
  }

  /**
   * Override toString for debugging
   */
  toString(): string {
    return `GitHubCopilotProvider(model=${this.config.model})`;
  }
}
