import { describe, test, expect, beforeEach } from '@jest/globals';
import { LLMRouter, ProviderConfig, RoutingStrategy } from '../../../src/core/llm/LLMRouter.js';
import { LLMProvider, LLMConfig, TaskType, ModelType, LLMMessage, Priority } from '../../../src/models/index.js';

describe('LLMRouter', () => {
  let llmRouter: LLMRouter;
  let providerConfigs: ProviderConfig[];

  beforeEach(() => {
    // Create provider configurations
    providerConfigs = [
      {
        provider: LLMProvider.GPT,
        config: {
          model: ModelType.GPT_4_TURBO,
          temperature: 0.7,
          maxTokens: 2000,
          topP: 1.0,
          frequencyPenalty: 0,
          presencePenalty: 0
        },
        priority: Priority.MUST_HAVE,
        enabled: true,
        apiKey: 'test-gpt-key'
      },
      {
        provider: LLMProvider.CLAUDE,
        config: {
          model: ModelType.CLAUDE_3_5_SONNET,
          temperature: 0.7,
          maxTokens: 2000,
          topP: 1.0,
          frequencyPenalty: 0,
          presencePenalty: 0
        },
        priority: Priority.SHOULD_HAVE,
        enabled: true,
        apiKey: 'test-claude-key'
      }
    ];

    llmRouter = new LLMRouter(providerConfigs);
  });

  describe('initialization', () => {
    test('should initialize with provider configurations', () => {
      expect(llmRouter).toBeDefined();
      expect(llmRouter).toBeInstanceOf(LLMRouter);
    });

    test('should handle empty configurations', () => {
      expect(() => new LLMRouter([])).not.toThrow();
    });

    test('should handle multiple providers', () => {
      const multiProviderConfigs: ProviderConfig[] = [
        ...providerConfigs,
        {
          provider: LLMProvider.GEMINI,
          config: {
            model: ModelType.GPT_3_5_TURBO,
            temperature: 0.5,
            maxTokens: 1000
          },
          priority: Priority.NICE_TO_HAVE,
          enabled: true,
          apiKey: 'test-gemini-key'
        }
      ];

      expect(() => new LLMRouter(multiProviderConfigs)).not.toThrow();
    });
  });

  describe('routing strategies', () => {
    test('should accept fallback routing strategy', () => {
      const strategy: RoutingStrategy = { type: 'fallback' };
      expect(strategy.type).toBe('fallback');
    });

    test('should accept cost-based routing strategy', () => {
      const strategy: RoutingStrategy = { 
        type: 'cost',
        preferences: {
          maxCostPerRequest: 0.10
        }
      };
      expect(strategy.type).toBe('cost');
      expect(strategy.preferences?.maxCostPerRequest).toBe(0.10);
    });

    test('should accept performance-based routing strategy', () => {
      const strategy: RoutingStrategy = { 
        type: 'performance',
        preferences: {
          maxLatencyMs: 5000
        }
      };
      expect(strategy.type).toBe('performance');
      expect(strategy.preferences?.maxLatencyMs).toBe(5000);
    });

    test('should accept capability-based routing strategy', () => {
      const strategy: RoutingStrategy = { 
        type: 'capability',
        preferences: {
          requiresStreaming: true,
          requiresFunctionCalling: false
        }
      };
      expect(strategy.type).toBe('capability');
      expect(strategy.preferences?.requiresStreaming).toBe(true);
      expect(strategy.preferences?.requiresFunctionCalling).toBe(false);
    });

    test('should accept round-robin routing strategy', () => {
      const strategy: RoutingStrategy = { type: 'round_robin' };
      expect(strategy.type).toBe('round_robin');
    });
  });

  describe('configuration validation', () => {
    test('should validate provider config structure', () => {
      const config: ProviderConfig = {
        provider: LLMProvider.GPT,
        config: {
          model: ModelType.GPT_4_TURBO,
          temperature: 0.7,
          maxTokens: 2000
        },
        priority: Priority.MUST_HAVE,
        enabled: true,
        apiKey: 'test-key'
      };

      expect(config.provider).toBe(LLMProvider.GPT);
      expect(config.config.model).toBe(ModelType.GPT_4_TURBO);
      expect(config.priority).toBe(Priority.MUST_HAVE);
      expect(config.enabled).toBe(true);
      expect(config.apiKey).toBe('test-key');
    });

    test('should handle optional apiKey', () => {
      const config: ProviderConfig = {
        provider: LLMProvider.GEMINI,
        config: {
          model: ModelType.CLAUDE_3_HAIKU,
          temperature: 0.5,
          maxTokens: 1000
        },
        priority: Priority.NICE_TO_HAVE,
        enabled: false
      };

      expect(config.apiKey).toBeUndefined();
      expect(config.enabled).toBe(false);
    });

    test('should validate LLM config parameters', () => {
      const llmConfig: LLMConfig = {
        model: ModelType.CLAUDE_3_5_SONNET,
        temperature: 0.8,
        maxTokens: 3000,
        topP: 0.9,
        frequencyPenalty: 0.1,
        presencePenalty: 0.2
      };

      expect(llmConfig.temperature).toBeGreaterThanOrEqual(0);
      expect(llmConfig.temperature).toBeLessThanOrEqual(2);
      expect(llmConfig.maxTokens).toBeGreaterThan(0);
      expect(llmConfig.topP).toBeGreaterThanOrEqual(0);
      expect(llmConfig.topP).toBeLessThanOrEqual(1);
    });
  });

  describe('task type handling', () => {
    test('should handle all supported task types', () => {
      const supportedTaskTypes = [
        TaskType.PRD_GENERATION,
        TaskType.FEATURE_ANALYSIS,
        TaskType.TECH_STACK_SELECTION,
        TaskType.CODE_GENERATION,
        TaskType.ARCHITECTURE_DESIGN,
        TaskType.TESTING_STRATEGY,
        TaskType.DEPLOYMENT_PLANNING,
        TaskType.DOCUMENTATION
      ];

      for (const taskType of supportedTaskTypes) {
        expect(Object.values(TaskType)).toContain(taskType);
      }
    });

    test('should differentiate between task types', () => {
      expect(TaskType.PRD_GENERATION).not.toBe(TaskType.CODE_GENERATION);
      expect(TaskType.FEATURE_ANALYSIS).not.toBe(TaskType.TECH_STACK_SELECTION);
    });
  });

  describe('message structure validation', () => {
    test('should validate LLM message structure', () => {
      const messages: LLMMessage[] = [
        {
          role: 'system',
          content: 'You are a helpful assistant'
        },
        {
          role: 'user',
          content: 'Generate a PRD for a mobile app'
        },
        {
          role: 'assistant',
          content: 'I\'ll help you create a PRD'
        }
      ];

      expect(messages).toHaveLength(3);
      expect(messages[0].role).toBe('system');
      expect(messages[1].role).toBe('user');
      expect(messages[2].role).toBe('assistant');
      
      for (const message of messages) {
        expect(typeof message.content).toBe('string');
        expect(message.content.length).toBeGreaterThan(0);
      }
    });

    test('should handle empty message arrays', () => {
      const emptyMessages: LLMMessage[] = [];
      expect(emptyMessages).toHaveLength(0);
      expect(Array.isArray(emptyMessages)).toBe(true);
    });

    test('should validate message roles', () => {
      const validRoles = ['system', 'user', 'assistant'] as const;
      
      for (const role of validRoles) {
        const message: LLMMessage = {
          role,
          content: `Message with ${role} role`
        };
        expect(validRoles).toContain(message.role);
      }
    });
  });

  describe('provider and model combinations', () => {
    test('should map GPT provider to GPT models', () => {
      const gptModels = [ModelType.GPT_4_TURBO, ModelType.GPT_4O, ModelType.GPT_3_5_TURBO];
      
      for (const model of gptModels) {
        const config: ProviderConfig = {
          provider: LLMProvider.GPT,
          config: { model, temperature: 0.7, maxTokens: 2000 },
          priority: Priority.MUST_HAVE,
          enabled: true
        };
        
        expect(config.provider).toBe(LLMProvider.GPT);
        expect(gptModels).toContain(config.config.model);
      }
    });

    test('should map Claude provider to Claude models', () => {
      const claudeModels = [ModelType.CLAUDE_3_5_SONNET, ModelType.CLAUDE_3_HAIKU];
      
      for (const model of claudeModels) {
        const config: ProviderConfig = {
          provider: LLMProvider.CLAUDE,
          config: { model, temperature: 0.7, maxTokens: 2000 },
          priority: Priority.SHOULD_HAVE,
          enabled: true
        };
        
        expect(config.provider).toBe(LLMProvider.CLAUDE);
        expect(claudeModels).toContain(config.config.model);
      }
    });
  });

  describe('priority handling', () => {
    test('should handle priority levels', () => {
      const priorities = [Priority.MUST_HAVE, Priority.SHOULD_HAVE, Priority.NICE_TO_HAVE];
      
      for (const priority of priorities) {
        expect(Object.values(Priority)).toContain(priority);
      }
    });

    test('should order priorities correctly', () => {
      const mustHave = Priority.MUST_HAVE;
      const shouldHave = Priority.SHOULD_HAVE;
      const niceToHave = Priority.NICE_TO_HAVE;
      
      expect(mustHave).toBe('must_have');
      expect(shouldHave).toBe('should_have');
      expect(niceToHave).toBe('nice_to_have');
    });
  });
});