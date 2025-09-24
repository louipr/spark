// GPT Provider - OpenAI GPT LLM integration

import OpenAI from 'openai';
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

export class GPTProvider extends LLMInterface {
  private client: OpenAI;
  private readonly modelMapping = {
    [ModelType.GPT_4_TURBO]: 'gpt-4-turbo-preview',
    [ModelType.GPT_4O]: 'gpt-4o',
    [ModelType.GPT_3_5_TURBO]: 'gpt-3.5-turbo'
  };

  constructor(config: LLMConfig, apiKey?: string) {
    super(LLMProvider.GPT, config);
    
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY
    });
  }

  /**
   * Generate a response from GPT
   */
  async generate(
    messages: LLMMessage[],
    taskType: TaskType,
    options?: Partial<LLMConfig>
  ): Promise<LLMResponse> {
    this.validateMessages(messages);
    
    const effectiveConfig = { ...this.config, ...options };
    const contextualMessages = this.addContextToMessages(messages, taskType);
    const preparedMessages = this.prepareMessages(contextualMessages);

    return this.handleRateLimit(async () => {
      const startTime = Date.now();
      
      const response = await this.client.chat.completions.create({
        model: this.modelMapping[effectiveConfig.model as keyof typeof this.modelMapping] || this.modelMapping[ModelType.GPT_4O],
        messages: preparedMessages,
        max_tokens: effectiveConfig.maxTokens,
        temperature: effectiveConfig.temperature,
        top_p: effectiveConfig.topP,
        frequency_penalty: effectiveConfig.frequencyPenalty,
        presence_penalty: effectiveConfig.presencePenalty,
        stop: effectiveConfig.stopSequences
      });

      const processingTime = Date.now() - startTime;
      const llmResponse = this.parseResponse(response, processingTime);
      
      this.logRequest(contextualMessages, taskType, llmResponse);
      
      return llmResponse;
    });
  }

  /**
   * Stream a response from GPT
   */
  async* stream(
    messages: LLMMessage[],
    taskType: TaskType,
    options?: Partial<LLMConfig>
  ): AsyncGenerator<string, void, unknown> {
    this.validateMessages(messages);
    
    const effectiveConfig = { ...this.config, ...options };
    const contextualMessages = this.addContextToMessages(messages, taskType);
    const preparedMessages = this.prepareMessages(contextualMessages);

    const stream = await this.client.chat.completions.create({
      model: this.modelMapping[effectiveConfig.model as keyof typeof this.modelMapping] || this.modelMapping[ModelType.GPT_4O],
      messages: preparedMessages,
      max_tokens: effectiveConfig.maxTokens,
      temperature: effectiveConfig.temperature,
      top_p: effectiveConfig.topP,
      frequency_penalty: effectiveConfig.frequencyPenalty,
      presence_penalty: effectiveConfig.presencePenalty,
      stop: effectiveConfig.stopSequences,
      stream: true
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  /**
   * Check if GPT API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Simple ping to check API availability
      const response = await this.client.chat.completions.create({
        model: this.modelMapping[ModelType.GPT_3_5_TURBO], // Use fastest model for ping
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 10
      });
      
      return !!response.choices[0]?.message?.content;
    } catch (error) {
      console.warn('GPT API unavailable:', error);
      return false;
    }
  }

  /**
   * Get GPT capabilities
   */
  getCapabilities() {
    return {
      maxTokens: 128000, // GPT-4 context window
      supportsStreaming: true,
      supportsSystemMessages: true,
      supportsFunctionCalling: true,
      modelVersions: Object.values(this.modelMapping)
    };
  }

  /**
   * Estimate token count for GPT
   */
  estimateTokens(messages: LLMMessage[]): number {
    // GPT's tokenization is roughly 4 characters per token
    const totalCharacters = messages.reduce((sum, msg) => 
      sum + msg.content.length + msg.role.length + 10, 0 // +10 for formatting
    );
    
    return Math.ceil(totalCharacters / 4);
  }

  /**
   * Prepare messages for OpenAI API format
   */
  protected prepareMessages(messages: LLMMessage[]): any[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  /**
   * Parse OpenAI API response
   */
  protected parseResponse(response: any, processingTime?: number): LLMResponse {
    const choice = response.choices[0];
    const content = choice?.message?.content || '';

    const usage: TokenUsage = {
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
      cost: this.calculateCost(
        response.usage?.prompt_tokens || 0,
        response.usage?.completion_tokens || 0
      ).totalCost
    };

    const metadata: ResponseMetadata = {
      requestId: response.id || 'unknown',
      timestamp: new Date(),
      processingTime: processingTime || 0,
      cacheHit: false,
      reasoning: this.extractReasoning(content)
    };

    return {
      id: response.id || 'unknown',
      model: this.config.model,
      provider: LLMProvider.GPT,
      content: this.sanitizeContent(content),
      usage,
      metadata,
      finishReason: choice?.finish_reason || 'stop',
      cost: this.calculateCost(
        response.usage?.prompt_tokens || 0,
        response.usage?.completion_tokens || 0
      )
    };
  }

  /**
   * Calculate cost for OpenAI API
   */
  protected calculateCost(inputTokens: number, outputTokens: number): {
    inputCost: number;
    outputCost: number;
    totalCost: number;
  } {
    // OpenAI pricing (as of 2024)
    const pricing = {
      [ModelType.GPT_3_5_TURBO]: { input: 0.0005, output: 0.0015 }, // per 1K tokens
      [ModelType.GPT_4_TURBO]: { input: 0.01, output: 0.03 },
      [ModelType.GPT_4O]: { input: 0.005, output: 0.015 }
    };

    const modelPricing = pricing[this.config.model as keyof typeof pricing] || pricing[ModelType.GPT_4O];
    
    const inputCost = (inputTokens / 1000) * modelPricing.input;
    const outputCost = (outputTokens / 1000) * modelPricing.output;

    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost
    };
  }

  /**
   * Extract reasoning from GPT's response
   */
  private extractReasoning(content: string): string | undefined {
    // GPT sometimes includes reasoning in its responses
    // Look for common patterns that indicate reasoning
    const reasoningPatterns = [
      /Let me think about this:?(.*?)(?:\n\n|$)/s,
      /Here's my reasoning:?(.*?)(?:\n\n|$)/s,
      /Step by step:?(.*?)(?:\n\n|$)/s,
      /My approach:?(.*?)(?:\n\n|$)/s
    ];

    for (const pattern of reasoningPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  /**
   * Add GPT-specific function calling support
   */
  async generateWithFunctions(
    messages: LLMMessage[],
    functions: any[],
    taskType: TaskType,
    options?: Partial<LLMConfig>
  ): Promise<LLMResponse> {
    this.validateMessages(messages);
    
    const effectiveConfig = { ...this.config, ...options };
    const contextualMessages = this.addContextToMessages(messages, taskType);
    const preparedMessages = this.prepareMessages(contextualMessages);

    return this.handleRateLimit(async () => {
      const startTime = Date.now();
      
      const response = await this.client.chat.completions.create({
        model: this.modelMapping[effectiveConfig.model as keyof typeof this.modelMapping] || this.modelMapping[ModelType.GPT_4O],
        messages: preparedMessages,
        max_tokens: effectiveConfig.maxTokens,
        temperature: effectiveConfig.temperature,
        top_p: effectiveConfig.topP,
        frequency_penalty: effectiveConfig.frequencyPenalty,
        presence_penalty: effectiveConfig.presencePenalty,
        functions: functions,
        function_call: 'auto'
      });

      const processingTime = Date.now() - startTime;
      const llmResponse = this.parseResponse(response, processingTime);
      
      this.logRequest(contextualMessages, taskType, llmResponse);
      
      return llmResponse;
    });
  }
}
