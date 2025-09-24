// Test Fixtures - Common test data for consistent testing

import {
  UserRequest,
  ValidationResult,
  LLMResponse,
  OutputFormat,
  ModelType,
  LLMProvider,
  ProcessingStage
} from '../../src/models/index.js';

// Mock User Requests
export const mockUserRequests = {
  simple: {
    id: 'req-test-001',
    timestamp: new Date('2024-01-01T00:00:00Z'),
    rawInput: 'Create a simple todo app',
    sessionId: 'session-test-001',
    context: {
      previousRequests: [],
      currentPRD: undefined,
      iterationCount: 0,
      userPreferences: {
        defaultModel: ModelType.CLAUDE_3_5_SONNET,
        outputFormat: OutputFormat.MARKDOWN,
        iterationLimit: 3
      },
      conversationHistory: []
    }
  } as UserRequest,

  complex: {
    id: 'req-test-002',
    timestamp: new Date('2024-01-01T00:00:00Z'),
    rawInput: 'Build a comprehensive e-commerce platform with user authentication, payment processing, inventory management, order tracking, and admin dashboard',
    sessionId: 'session-test-002',
    context: {
      previousRequests: [],
      currentPRD: undefined,
      iterationCount: 0,
      userPreferences: {
        defaultModel: ModelType.CLAUDE_3_5_SONNET,
        outputFormat: OutputFormat.JSON,
        iterationLimit: 5
      },
      conversationHistory: []
    }
  } as UserRequest
};

// Test Configuration
export const testConfig = {
  timeout: 10000,
  retries: 3,
  mockApiKey: 'test-api-key-12345'
};

// Helper Functions for Tests
export function createMockRequest(overrides: Partial<UserRequest> = {}): UserRequest {
  return {
    ...mockUserRequests.simple,
    ...overrides
  };
}

// Export all fixtures
export default {
  mockUserRequests,
  testConfig,
  createMockRequest
};
