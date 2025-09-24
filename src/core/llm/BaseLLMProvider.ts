// Base LLM Provider - Template method pattern implementation for all LLM providers

import {
  LLMProvider,
  LLMMessage,
  LLMResponse,
  LLMConfig,
  TaskType,
  ModelType,
  TokenUsage,
  ResponseMetadata
} from '../../models/index.js';
import { LLMInterface } from './LLMInterface.js';

export interface ProviderModelMapping {
  [key: string]: string;
}

export interface StreamChunk {
  content?: string;
  finished?: boolean;
}

/**
 * Base implementation for LLM providers using template method pattern
 * Provides common structure for request/response handling while allowing
 * provider-specific implementations of key methods
 */
export abstract class BaseLLMProvider extends LLMInterface {
  protected abstract modelMapping: ProviderModelMapping;

  constructor(provider: LLMProvider, config: LLMConfig) {
    super(provider, config);
  }

  /**
   * Template method for generating responses
   * Defines the overall structure while delegating specifics to subclasses
   */
  async generate(
    messages: LLMMessage[],
    taskType: TaskType,
    options?: Partial<LLMConfig>
  ): Promise<LLMResponse> {
    // Common preprocessing
    this.validateMessages(messages);
    const effectiveConfig = { ...this.config, ...options };
    const contextualMessages = this.addContextToMessages(messages, taskType);
    const preparedMessages = this.prepareMessages(contextualMessages);

    // Execute with rate limiting and error handling
    return this.handleRateLimit(async () => {
      const startTime = Date.now();
      
      // Provider-specific API call
      const response = await this.executeRequest(preparedMessages, effectiveConfig);
      
      const processingTime = Date.now() - startTime;
      const llmResponse = this.parseResponse(response, processingTime);
      
      // Common postprocessing
      this.logRequest(contextualMessages, taskType, llmResponse);
      
      return llmResponse;
    });
  }

  /**
   * Template method for streaming responses
   * Defines the overall structure while delegating specifics to subclasses
   */
  async* stream(
    messages: LLMMessage[],
    taskType: TaskType,
    options?: Partial<LLMConfig>
  ): AsyncGenerator<string, void, unknown> {
    // Common preprocessing
    this.validateMessages(messages);
    const effectiveConfig = { ...this.config, ...options };
    const contextualMessages = this.addContextToMessages(messages, taskType);
    const preparedMessages = this.prepareMessages(contextualMessages);

    // Provider-specific streaming implementation
    const stream = await this.executeStreamRequest(preparedMessages, effectiveConfig);
    
    for await (const chunk of this.processStreamChunk(stream)) {
      if (chunk.content) {
        yield chunk.content;
      }
      if (chunk.finished) {
        break;
      }
    }
  }

  /**
   * Template method for availability check
   * Uses a lightweight request to verify API connectivity
   */
  async isAvailable(): Promise<boolean> {
    try {
      const testMessages = [{ role: 'user' as const, content: 'ping' }];
      const preparedMessages = this.prepareMessages(testMessages);
      
      // Use fastest/cheapest model for ping
      const testConfig = {
        ...this.config,
        model: this.getFastestModel(),
        maxTokens: 10
      };
      
      const response = await this.executeRequest(preparedMessages, testConfig);
      return this.validatePingResponse(response);
    } catch (error) {
      console.warn(`${this.provider} API unavailable:`, error);
      return false;
    }
  }

  /**
   * Get the model name for the given ModelType
   */
  protected getModelName(modelType: ModelType): string {
    return this.modelMapping[modelType] || this.modelMapping[this.getDefaultModel()];
  }

  /**
   * Build request parameters common to all providers
   */
  protected buildBaseRequestParams(
    preparedMessages: any[],
    config: LLMConfig
  ): Record<string, any> {
    return {
      messages: preparedMessages,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      top_p: config.topP,
      model: this.getModelName(config.model)
    };
  }

  // Abstract methods that subclasses must implement

  /**
   * Execute the actual API request to the provider
   */
  protected abstract executeRequest(
    preparedMessages: any[],
    config: LLMConfig
  ): Promise<any>;

  /**
   * Execute a streaming API request to the provider
   */
  protected abstract executeStreamRequest(
    preparedMessages: any[],
    config: LLMConfig
  ): Promise<any>;

  /**
   * Process streaming chunks from the provider
   */
  protected abstract processStreamChunk(stream: any): AsyncGenerator<StreamChunk, void, unknown>;

  /**
   * Validate that the ping response indicates successful connection
   */
  protected abstract validatePingResponse(response: any): boolean;

  /**
   * Get the fastest/cheapest model for availability testing
   */
  protected abstract getFastestModel(): ModelType;

  /**
   * Get the default model if no specific model is requested
   */
  protected abstract getDefaultModel(): ModelType;

  /**
   * Get provider-specific capabilities
   */
  abstract getCapabilities(): {
    maxTokens: number;
    supportsStreaming: boolean;
    supportsSystemMessages: boolean;
    supportsFunctionCalling: boolean;
    modelVersions: string[];
  };

  /**
   * Estimate token count for messages (provider-specific implementation)
   */
  abstract estimateTokens(messages: LLMMessage[]): number;

  /**
   * Prepare messages for the specific provider format
   */
  protected abstract prepareMessages(messages: LLMMessage[]): any[];

  /**
   * Parse the provider response into standard LLMResponse format
   */
  protected abstract parseResponse(response: any, processingTime?: number): LLMResponse;
}
