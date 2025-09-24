import { describe, test, expect, beforeEach } from '@jest/globals';
import { 
  ValidationEngine, 
  ValidationConfig
} from '../../../../src/core/orchestrator/ValidationEngine.js';
import { 
  UserRequest
} from '../../../../src/models/index.js';

describe('ValidationEngine', () => {
  let validationEngine: ValidationEngine;
  let mockConfig: ValidationConfig;
  let mockUserRequest: UserRequest;

  beforeEach(() => {
    mockConfig = {
      strictMode: false,
      requiredSections: ['metadata', 'productOverview', 'functionalRequirements'],
      minRequirements: 3,
      maxRequirements: 50,
      requireTechStack: true,
      requireTestingStrategy: false,
      customValidators: []
    };

    mockUserRequest = {
      id: 'req-validation-123',
      timestamp: new Date(),
      rawInput: 'Create a project management tool',
      sessionId: 'session-validation',
      userId: 'user-validation'
    };

    validationEngine = new ValidationEngine(mockConfig);
  });

  describe('initialization', () => {
    test('should initialize with provided config', () => {
      expect(validationEngine).toBeDefined();
      expect(validationEngine).toBeInstanceOf(ValidationEngine);
    });
  });

  describe('configuration validation', () => {
    test('should handle valid configurations', () => {
      expect(() => new ValidationEngine(mockConfig)).not.toThrow();
      expect(mockConfig.minRequirements).toBeLessThanOrEqual(mockConfig.maxRequirements);
    });
  });

  describe('user request validation', () => {
    test('should validate valid user request', () => {
      const result = validationEngine.validateUserRequest(mockUserRequest);
      expect(result).toBeDefined();
    });

    test('should handle request with missing data', () => {
      const invalidRequest = {
        ...mockUserRequest,
        rawInput: ''
      };
      const result = validationEngine.validateUserRequest(invalidRequest);
      expect(result).toBeDefined();
    });
  });

  describe('basic functionality', () => {
    test('should have core validation methods', () => {
      expect(typeof validationEngine.validateUserRequest).toBe('function');
      expect(typeof validationEngine.validatePRD).toBe('function');
    });
  });
});
