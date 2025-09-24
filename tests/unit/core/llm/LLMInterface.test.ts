import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { LLMInterface } from '../../../../src/core/llm/LLMInterface.js';
import { LLMProvider, LLMConfig, TaskType, ModelType, LLMMessage, LLMResponse } from '../../../../src/models/index.js';
import { mockLLMResponse, mockMessages, suppressConsole } from '../../../fixtures/llm.fixtures.js';

// Minimal concrete implementation for testing
class TestLLMInterface extends LLMInterface {
  async generate(messages: LLMMessage[], taskType: TaskType, options?: Partial<LLMConfig>): Promise<LLMResponse> {
    return mockLLMResponse;
  }

  async *stream(messages: LLMMessage[], taskType: TaskType, options?: Partial<LLMConfig>) {
    yield 'Test ';
    yield 'streaming ';
    yield 'response';
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  getCapabilities() {
    return {
      maxTokens: 4000,
      supportsStreaming: true,
      supportsSystemMessages: true,
      supportsFunctionCalling: false,
      modelVersions: ['gpt-4-turbo']
    };
  }

  prepareMessages(messages: LLMMessage[]): LLMMessage[] {
    return messages;
  }

  estimateTokens(messages: LLMMessage[]): number {
    return messages.reduce((total, msg) => total + Math.ceil(msg.content.length / 4), 0);
  }

  parseResponse(response: any): LLMResponse {
    return response;
  }
}

const mockConfig: LLMConfig = {
  model: ModelType.GPT_4_TURBO,
  temperature: 0.7,
  maxTokens: 2000
};

describe('LLMInterface', () => {
  let llmInterface: TestLLMInterface;
  let restoreConsole: () => void;

  beforeEach(() => {
    restoreConsole = suppressConsole();
    llmInterface = new TestLLMInterface(LLMProvider.GPT, mockConfig);
  });

  afterEach(() => {
    restoreConsole();
    llmInterface = null as any;
  });

  describe('construction', () => {
    test('should create instance with provider and config', () => {
      expect(llmInterface).toBeInstanceOf(LLMInterface);
      expect(llmInterface).toBeInstanceOf(TestLLMInterface);
    });

    test('should store provider correctly', () => {
      expect(llmInterface['provider']).toBe(LLMProvider.GPT);
    });

    test('should store config correctly', () => {
      expect(llmInterface['config']).toEqual(mockConfig);
    });
  });

  describe('generate method', () => {
    test('should generate response for basic request', async () => {
      const messages: LLMMessage[] = [
        {
          role: 'user',
          content: 'Test message'
        }
      ];

      const response = await llmInterface.generate(messages, TaskType.PRD_GENERATION);

      expect(response).toBeDefined();
      expect(response.content).toBe('Test response');
      expect(response.provider).toBe(LLMProvider.GPT);
      expect(response.model).toBe(ModelType.GPT_4_TURBO);
      expect(response.usage).toBeDefined();
      expect(response.usage.totalTokens).toBe(30);
    });

    test('should handle system messages', async () => {
      const messages: LLMMessage[] = [
        {
          role: 'system',
          content: 'You are a helpful assistant'
        },
        {
          role: 'user',
          content: 'Test message'
        }
      ];

      const response = await llmInterface.generate(messages, TaskType.FEATURE_ANALYSIS);
      expect(response).toBeDefined();
    });

    test('should handle assistant messages', async () => {
      const messages: LLMMessage[] = [
        {
          role: 'user',
          content: 'Hello'
        },
        {
          role: 'assistant',
          content: 'Hi there!'
        },
        {
          role: 'user',
          content: 'How are you?'
        }
      ];

      const response = await llmInterface.generate(messages, TaskType.CODE_GENERATION);
      expect(response).toBeDefined();
    });

    test('should pass options to generation', async () => {
      const messages: LLMMessage[] = [
        {
          role: 'user',
          content: 'Test with options'
        }
      ];

      const options: Partial<LLMConfig> = {
        temperature: 0.9,
        maxTokens: 1000
      };

      const response = await llmInterface.generate(messages, TaskType.TECH_STACK_SELECTION, options);
      expect(response).toBeDefined();
    });
  });

  describe('stream method', () => {
    test('should stream response chunks', async () => {
      const messages: LLMMessage[] = [
        {
          role: 'user',
          content: 'Stream test'
        }
      ];

      const chunks: string[] = [];
      for await (const chunk of llmInterface.stream(messages, TaskType.PRD_GENERATION)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Test ', 'streaming ', 'response']);
    });

    test('should handle streaming with options', async () => {
      const messages: LLMMessage[] = [
        {
          role: 'user',
          content: 'Stream with options'
        }
      ];

      const options: Partial<LLMConfig> = {
        temperature: 0.5
      };

      const chunks: string[] = [];
      for await (const chunk of llmInterface.stream(messages, TaskType.FEATURE_ANALYSIS, options)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  describe('isAvailable method', () => {
    test('should check availability', async () => {
      const available = await llmInterface.isAvailable();
      expect(available).toBe(true);
    });
  });

  describe('getCapabilities method', () => {
    test('should return capabilities', () => {
      const capabilities = llmInterface.getCapabilities();
      
      expect(capabilities).toBeDefined();
      expect(capabilities.maxTokens).toBe(4000);
      expect(capabilities.supportsStreaming).toBe(true);
      expect(capabilities.supportsSystemMessages).toBe(true);
      expect(capabilities.supportsFunctionCalling).toBe(false);
      expect(Array.isArray(capabilities.modelVersions)).toBe(true);
    });
  });

  describe('prepareMessages method', () => {
    test('should prepare messages', () => {
      const messages: LLMMessage[] = [
        {
          role: 'user',
          content: 'Test message'
        }
      ];

      const prepared = llmInterface.prepareMessages(messages);
      expect(prepared).toEqual(messages);
    });

    test('should handle empty messages', () => {
      const prepared = llmInterface.prepareMessages([]);
      expect(prepared).toEqual([]);
    });

    test('should handle multiple message types', () => {
      const messages: LLMMessage[] = [
        {
          role: 'system',
          content: 'System prompt'
        },
        {
          role: 'user',
          content: 'User message'
        },
        {
          role: 'assistant',
          content: 'Assistant response'
        }
      ];

      const prepared = llmInterface.prepareMessages(messages);
      expect(prepared).toEqual(messages);
    });
  });

  describe('estimateTokens method', () => {
    test('should estimate tokens for messages', () => {
      const messages: LLMMessage[] = [
        {
          role: 'user',
          content: 'This is a test message'
        }
      ];

      const tokens = llmInterface.estimateTokens(messages);
      expect(tokens).toBeGreaterThan(0);
      expect(typeof tokens).toBe('number');
    });

    test('should handle empty messages', () => {
      const tokens = llmInterface.estimateTokens([]);
      expect(tokens).toBe(0);
    });

    test('should estimate tokens for multiple messages', () => {
      const messages: LLMMessage[] = [
        {
          role: 'system',
          content: 'You are a helpful assistant'
        },
        {
          role: 'user',
          content: 'Hello, how are you?'
        }
      ];

      const tokens = llmInterface.estimateTokens(messages);
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe('parseResponse method', () => {
    test('should parse response', () => {
      const mockResponse = {
        id: 'test-id',
        content: 'Test content'
      };

      const parsed = llmInterface.parseResponse(mockResponse);
      expect(parsed).toEqual(mockResponse);
    });
  });

  describe('configuration validation', () => {
    test('should work with different providers', () => {
      const claudeInterface = new TestLLMInterface(LLMProvider.CLAUDE, {
        model: ModelType.CLAUDE_3_5_SONNET,
        temperature: 0.5,
        maxTokens: 1500
      });

      expect(claudeInterface['provider']).toBe(LLMProvider.CLAUDE);
    });

    test('should work with different models', () => {
      const testCases = [
        { model: ModelType.GPT_4_TURBO, provider: LLMProvider.GPT },
        { model: ModelType.CLAUDE_3_5_SONNET, provider: LLMProvider.CLAUDE },
        { model: ModelType.GPT_4O, provider: LLMProvider.GPT }
      ];

      for (const { model, provider } of testCases) {
        const config: LLMConfig = {
          model,
          temperature: 0.7,
          maxTokens: 2000
        };

        const instance = new TestLLMInterface(provider, config);
        expect(instance['config'].model).toBe(model);
      }
    });

    test('should handle different temperature ranges', () => {
      const temperatureTests = [0, 0.5, 1.0, 1.5, 2.0];

      for (const temperature of temperatureTests) {
        const config: LLMConfig = {
          model: ModelType.GPT_4_TURBO,
          temperature,
          maxTokens: 2000
        };

        const instance = new TestLLMInterface(LLMProvider.GPT, config);
        expect(instance['config'].temperature).toBe(temperature);
      }
    });
  });

  describe('error handling', () => {
    test('should handle empty content', () => {
      const messages: LLMMessage[] = [
        {
          role: 'user',
          content: ''
        }
      ];

      expect(() => llmInterface.prepareMessages(messages)).not.toThrow();
      expect(llmInterface.estimateTokens(messages)).toBe(0);
    });
  });

  describe('task type compatibility', () => {
    test('should handle all task types', async () => {
      const messages: LLMMessage[] = [
        {
          role: 'user',
          content: 'Task type test'
        }
      ];

      const taskTypes = [
        TaskType.PRD_GENERATION,
        TaskType.FEATURE_ANALYSIS,
        TaskType.TECH_STACK_SELECTION,
        TaskType.CODE_GENERATION
      ];

      for (const taskType of taskTypes) {
        const response = await llmInterface.generate(messages, taskType);
        expect(response).toBeDefined();
        expect(response.content).toBe('Test response');
      }
    });
  });
});
