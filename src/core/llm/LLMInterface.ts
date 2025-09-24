// LLM Interface - Base interface for all LLM providers

import {
  LLMProvider,
  LLMMessage,
  LLMResponse,
  LLMConfig,
  TaskType
} from '../../models/index.js';

export abstract class LLMInterface {
  protected provider: LLMProvider;
  protected config: LLMConfig;

  constructor(provider: LLMProvider, config: LLMConfig) {
    this.provider = provider;
    this.config = config;
  }

  /**
   * Generate a response from the LLM
   */
  abstract generate(
    messages: LLMMessage[],
    taskType: TaskType,
    options?: Partial<LLMConfig>
  ): Promise<LLMResponse>;

  /**
   * Stream a response from the LLM
   */
  abstract stream(
    messages: LLMMessage[],
    taskType: TaskType,
    options?: Partial<LLMConfig>
  ): AsyncGenerator<string, void, unknown>;

  /**
   * Check if the provider is available
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Get provider capabilities
   */
  abstract getCapabilities(): {
    maxTokens: number;
    supportsStreaming: boolean;
    supportsSystemMessages: boolean;
    supportsFunctionCalling: boolean;
    modelVersions: string[];
  };

  /**
   * Estimate token count for messages
   */
  abstract estimateTokens(messages: LLMMessage[]): number;

  /**
   * Get the provider type
   */
  getProvider(): LLMProvider {
    return this.provider;
  }

  /**
   * Get current configuration
   */
  getConfig(): LLMConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Validate message format
   */
  protected validateMessages(messages: LLMMessage[]): void {
    if (!messages || messages.length === 0) {
      throw new Error('Messages array cannot be empty');
    }

    for (const message of messages) {
      if (!message.role || !message.content) {
        throw new Error('Each message must have role and content');
      }

      if (!['system', 'user', 'assistant'].includes(message.role)) {
        throw new Error('Message role must be system, user, or assistant');
      }
    }
  }

  /**
   * Prepare messages for the specific provider
   */
  protected abstract prepareMessages(messages: LLMMessage[]): any[];

  /**
   * Parse response from the specific provider
   */
  protected abstract parseResponse(response: any): LLMResponse;

  /**
   * Handle rate limiting and retries
   */
  protected async handleRateLimit<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (this.isRateLimitError(error)) {
          const delay = baseDelay * Math.pow(2, attempt);
          await this.sleep(delay);
          continue;
        }
        
        throw error;
      }
    }

    throw lastError!;
  }

  /**
   * Check if error is rate limit related
   */
  protected isRateLimitError(error: any): boolean {
    const rateLimitIndicators = [
      'rate limit',
      'too many requests',
      '429',
      'quota exceeded'
    ];

    const errorMessage = (error.message || error.toString()).toLowerCase();
    return rateLimitIndicators.some(indicator => 
      errorMessage.includes(indicator)
    );
  }

  /**
   * Sleep utility for rate limiting
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Calculate cost estimate for the request
   */
  protected calculateCost(inputTokens: number, outputTokens: number): {
    inputCost: number;
    outputCost: number;
    totalCost: number;
  } {
    // Base implementation - should be overridden by specific providers
    const inputCostPerToken = 0.00001; // $0.01 per 1K tokens
    const outputCostPerToken = 0.00003; // $0.03 per 1K tokens

    const inputCost = (inputTokens / 1000) * inputCostPerToken;
    const outputCost = (outputTokens / 1000) * outputCostPerToken;

    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost
    };
  }

  /**
   * Add request context to messages
   */
  protected addContextToMessages(
    messages: LLMMessage[],
    taskType: TaskType
  ): LLMMessage[] {
    const contextPrompts = {
      [TaskType.PRD_GENERATION]: 'You are an expert product manager creating comprehensive Product Requirements Documents.',
      [TaskType.FEATURE_ANALYSIS]: 'You are a senior software architect analyzing feature requirements.',
      [TaskType.TECH_STACK_SELECTION]: 'You are a technical lead selecting optimal technology stacks.',
      [TaskType.CODE_GENERATION]: 'You are an expert software engineer generating production-ready code.',
      [TaskType.ARCHITECTURE_DESIGN]: 'You are a solution architect designing scalable system architectures.',
      [TaskType.TESTING_STRATEGY]: 'You are a QA engineer designing comprehensive testing strategies.',
      [TaskType.DEPLOYMENT_PLANNING]: 'You are a DevOps engineer planning deployment strategies.',
      [TaskType.DOCUMENTATION]: 'You are a technical writer creating clear and comprehensive documentation.'
    };

    const contextPrompt = contextPrompts[taskType] || 'You are a helpful AI assistant.';

    // Add system message if not present
    const hasSystemMessage = messages.some(m => m.role === 'system');
    
    if (!hasSystemMessage) {
      return [
        { role: 'system', content: contextPrompt },
        ...messages
      ];
    }

    return messages;
  }

  /**
   * Sanitize content for safety
   */
  protected sanitizeContent(content: string): string {
    // Remove potentially harmful content
    const sanitized = content
      .replace(/(?:api[_-]?key|secret|token|password)[\s]*[:=][\s]*[\"']?([^\s\"',}]+)[\"']?/gi, '[REDACTED]')
      .replace(/(?:bearer|basic)[\s]+([a-zA-Z0-9+/=]+)/gi, 'Bearer [REDACTED]')
      .trim();

    return sanitized;
  }

  /**
   * Log request for debugging and monitoring
   */
  protected logRequest(
    messages: LLMMessage[],
    taskType: TaskType,
    response?: LLMResponse
  ): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('LLM Request:', {
        provider: this.provider,
        taskType,
        messageCount: messages.length,
        inputTokens: response?.usage?.promptTokens,
        outputTokens: response?.usage?.completionTokens,
        totalTokens: response?.usage?.totalTokens,
        cost: response?.cost
      });
    }
  }
}
