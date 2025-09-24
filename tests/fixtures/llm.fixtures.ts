// Shared test fixtures for LLM-related tests
import { LLMProvider, LLMConfig, TaskType, ModelType, LLMMessage, Priority, LLMResponse } from '../../src/models/index.js';
import { ProviderConfig, RoutingStrategy } from '../../src/core/llm/LLMRouter.js';

// Minimal provider configurations for testing
export const mockProviderConfigs: ProviderConfig[] = [
  {
    provider: LLMProvider.GPT,
    config: {
      model: ModelType.GPT_4_TURBO,
      temperature: 0.7,
      maxTokens: 2000
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
      maxTokens: 2000
    },
    priority: Priority.SHOULD_HAVE,
    enabled: true,
    apiKey: 'test-claude-key'
  }
];

// Minimal routing strategies
export const mockRoutingStrategies = {
  fallback: { type: 'fallback' as const },
  cost: { 
    type: 'cost' as const,
    preferences: { maxCostPerRequest: 0.10 }
  },
  performance: { 
    type: 'performance' as const,
    preferences: { maxLatencyMs: 5000 }
  }
};

// Simple mock LLM response
export const mockLLMResponse: LLMResponse = {
  id: 'test-response',
  model: ModelType.GPT_4_TURBO,
  provider: LLMProvider.GPT,
  content: 'Test response',
  usage: {
    promptTokens: 10,
    completionTokens: 20,
    totalTokens: 30
  },
  metadata: {
    requestId: 'test-request',
    timestamp: new Date('2023-01-01'),
    processingTime: 100,
    cacheHit: false
  },
  finishReason: 'stop'
};

// Simple mock messages
export const mockMessages: LLMMessage[] = [
  {
    role: 'user',
    content: 'Test message'
  }
];

// Mock console methods for all LLM tests
export const suppressConsole = () => {
  const original = {
    log: console.log,
    warn: console.warn,
    error: console.error
  };
  
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
  
  return () => {
    console.log = original.log;
    console.warn = original.warn;
    console.error = original.error;
  };
};
