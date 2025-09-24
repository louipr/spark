// Claude Provider - Anthropic Claude LLM integration

import Anthropic from '@anthropic-ai/sdk';
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

export class ClaudeProvider extends LLMInterface {
  private client: Anthropic;
  private readonly modelMapping = {
    [ModelType.CLAUDE_3_5_SONNET]: 'claude-3-5-sonnet-20241022',
    [ModelType.CLAUDE_3_HAIKU]: 'claude-3-haiku-20240307'
  };

  constructor(config: LLMConfig, apiKey?: string) {
    super(LLMProvider.CLAUDE, config);
    
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    });
  }

  /**
   * Generate a response from Claude
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
      
      const response = await this.client.messages.create({
        model: this.modelMapping[effectiveConfig.model as keyof typeof this.modelMapping] || this.modelMapping[ModelType.CLAUDE_3_5_SONNET],
        max_tokens: effectiveConfig.maxTokens,
        temperature: effectiveConfig.temperature,
        messages: preparedMessages,
        top_p: effectiveConfig.topP,
        stop_sequences: effectiveConfig.stopSequences
      });

      const processingTime = Date.now() - startTime;
      const llmResponse = this.parseResponse(response, processingTime);
      
      this.logRequest(contextualMessages, taskType, llmResponse);
      
      return llmResponse;
    });
  }

  /**
   * Stream a response from Claude
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

    const stream = await this.client.messages.create({
      model: this.modelMapping[effectiveConfig.model as keyof typeof this.modelMapping] || this.modelMapping[ModelType.CLAUDE_3_5_SONNET],
      max_tokens: effectiveConfig.maxTokens,
      temperature: effectiveConfig.temperature,
      messages: preparedMessages,
      top_p: effectiveConfig.topP,
      stop_sequences: effectiveConfig.stopSequences,
      stream: true
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield chunk.delta.text;
      }
    }
  }

  /**
   * Check if Claude API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Simple ping to check API availability
      const response = await this.client.messages.create({
        model: this.modelMapping[ModelType.CLAUDE_3_HAIKU], // Use fastest model for ping
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }]
      });
      
      return !!response.content;
    } catch (error) {
      console.warn('Claude API unavailable:', error);
      return false;
    }
  }

  /**
   * Get Claude capabilities
   */
  getCapabilities() {
    return {
      maxTokens: 200000, // Claude 3 context window
      supportsStreaming: true,
      supportsSystemMessages: true,
      supportsFunctionCalling: false, // Claude doesn't support function calling like GPT
      modelVersions: Object.values(this.modelMapping)
    };
  }

  /**
   * Estimate token count for Claude
   */
  estimateTokens(messages: LLMMessage[]): number {
    // Claude's tokenization is roughly 3.5 characters per token
    const totalCharacters = messages.reduce((sum, msg) => 
      sum + msg.content.length + msg.role.length + 10, 0 // +10 for formatting
    );
    
    return Math.ceil(totalCharacters / 3.5);
  }

  /**
   * Prepare messages for Claude API format
   */
  protected prepareMessages(messages: LLMMessage[]): any[] {
    // Claude expects system messages to be handled separately
    // For now, we'll convert system messages to user messages with clear indication
    return messages
      .filter(msg => msg.role !== 'system') // Filter out system messages
      .map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));
  }

  /**
   * Parse Claude API response
   */
  protected parseResponse(response: any, processingTime?: number): LLMResponse {
    const content = response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('');

    const usage: TokenUsage = {
      promptTokens: response.usage?.input_tokens || 0,
      completionTokens: response.usage?.output_tokens || 0,
      totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
      cost: this.calculateCost(
        response.usage?.input_tokens || 0,
        response.usage?.output_tokens || 0
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
      provider: LLMProvider.CLAUDE,
      content: this.sanitizeContent(content),
      usage,
      metadata,
      finishReason: response.stop_reason || 'stop',
      cost: this.calculateCost(
        response.usage?.input_tokens || 0,
        response.usage?.output_tokens || 0
      )
    };
  }

  /**
   * Calculate cost for Claude API
   */
  protected calculateCost(inputTokens: number, outputTokens: number): {
    inputCost: number;
    outputCost: number;
    totalCost: number;
  } {
    // Claude 3 pricing (as of 2024)
    const pricing = {
      [ModelType.CLAUDE_3_HAIKU]: { input: 0.00025, output: 0.00125 }, // per 1K tokens
      [ModelType.CLAUDE_3_5_SONNET]: { input: 0.003, output: 0.015 }
    };

    const modelPricing = pricing[this.config.model as keyof typeof pricing] || pricing[ModelType.CLAUDE_3_5_SONNET];
    
    const inputCost = (inputTokens / 1000) * modelPricing.input;
    const outputCost = (outputTokens / 1000) * modelPricing.output;

    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost
    };
  }

  /**
   * Extract reasoning from Claude's response
   */
  private extractReasoning(content: string): string | undefined {
    // Claude often includes reasoning in its responses
    // Look for common patterns that indicate reasoning
    const reasoningPatterns = [
      /Let me think through this step by step:?(.*?)(?:\n\n|$)/s,
      /Here's my reasoning:?(.*?)(?:\n\n|$)/s,
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
   * Handle Claude-specific system prompts
   */
  protected addContextToMessages(
    messages: LLMMessage[],
    taskType: TaskType
  ): LLMMessage[] {
    const contextualMessages = super.addContextToMessages(messages, taskType);
    
    // For Claude, we need to merge system messages into the first user message
    const systemMessages = contextualMessages.filter(m => m.role === 'system');
    const nonSystemMessages = contextualMessages.filter(m => m.role !== 'system');
    
    if (systemMessages.length > 0 && nonSystemMessages.length > 0) {
      const systemContent = systemMessages.map(m => m.content).join('\n\n');
      const firstUserMessage = nonSystemMessages.find(m => m.role === 'user');
      
      if (firstUserMessage) {
        firstUserMessage.content = `${systemContent}\n\nUser Request: ${firstUserMessage.content}`;
      }
    }
    
    return nonSystemMessages;
  }
}
