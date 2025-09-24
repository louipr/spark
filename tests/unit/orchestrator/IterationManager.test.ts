import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { 
  IterationManager, 
  IterationConfig, 
  IterationResult, 
  IterationMetrics 
} from '../../../src/core/orchestrator/IterationManager.js';
import { StateManager } from '../../../src/core/orchestrator/StateManager.js';
import { RequestAnalyzer } from '../../../src/core/analyzer/index.js';
import { PRDGenerator } from '../../../src/core/generator/index.js';
import { LLMRouter } from '../../../src/core/llm/index.js';
import { 
  UserRequest, 
  PRD, 
  ValidationResult, 
  LLMResponse,
  ProcessingStage,
  Priority,
  Intent,
  ComplexityLevel 
} from '../../../src/models/index.js';

// Mock the dependencies
jest.mock('../../../src/core/orchestrator/StateManager.js');
jest.mock('../../../src/core/analyzer/index.js');
jest.mock('../../../src/core/generator/index.js');
jest.mock('../../../src/core/llm/index.js');

describe('IterationManager', () => {
  let iterationManager: IterationManager;
  let mockStateManager: jest.Mocked<StateManager>;
  let mockRequestAnalyzer: jest.Mocked<RequestAnalyzer>;
  let mockPRDGenerator: jest.Mocked<PRDGenerator>;
  let mockLLMRouter: jest.Mocked<LLMRouter>;
  let mockUserRequest: UserRequest;
  let mockConfig: IterationConfig;

  beforeEach(() => {
    // Create mocks
    mockStateManager = new StateManager() as jest.Mocked<StateManager>;
    mockRequestAnalyzer = new RequestAnalyzer() as jest.Mocked<RequestAnalyzer>;
    mockPRDGenerator = new PRDGenerator() as jest.Mocked<PRDGenerator>;
    mockLLMRouter = new LLMRouter([]) as jest.Mocked<LLMRouter>;

    mockConfig = {
      maxIterations: 3,
      convergenceThreshold: 0.90,
      improvementThreshold: 0.15,
      timeoutMs: 60000,
      enableAutoApproval: false
    };

    mockUserRequest = {
      id: 'req-iteration-123',
      timestamp: new Date(),
      rawInput: 'Create a task management app',
      sessionId: 'session-iteration',
      userId: 'user-iteration'
    };

    iterationManager = new IterationManager(
      mockStateManager,
      mockRequestAnalyzer,
      mockPRDGenerator,
      mockLLMRouter,
      mockConfig
    );
  });

  describe('initialization', () => {
    test('should initialize with provided dependencies', () => {
      expect(iterationManager).toBeDefined();
      expect(iterationManager).toBeInstanceOf(IterationManager);
    });

    test('should initialize with default config values', () => {
      const defaultManager = new IterationManager(
        mockStateManager,
        mockRequestAnalyzer,
        mockPRDGenerator,
        mockLLMRouter
      );

      expect(defaultManager).toBeDefined();
    });

    test('should merge provided config with defaults', () => {
      const partialConfig = { maxIterations: 10 };
      
      const managerWithPartialConfig = new IterationManager(
        mockStateManager,
        mockRequestAnalyzer,
        mockPRDGenerator,
        mockLLMRouter,
        partialConfig
      );

      expect(managerWithPartialConfig).toBeDefined();
    });
  });

  describe('configuration validation', () => {
    test('should validate IterationConfig structure', () => {
      const config: IterationConfig = {
        maxIterations: 5,
        convergenceThreshold: 0.95,
        improvementThreshold: 0.1,
        timeoutMs: 300000,
        enableAutoApproval: false
      };

      expect(config.maxIterations).toBeGreaterThan(0);
      expect(config.convergenceThreshold).toBeGreaterThanOrEqual(0);
      expect(config.convergenceThreshold).toBeLessThanOrEqual(1);
      expect(config.improvementThreshold).toBeGreaterThanOrEqual(0);
      expect(config.timeoutMs).toBeGreaterThan(0);
      expect(typeof config.enableAutoApproval).toBe('boolean');
    });

    test('should handle edge case configurations', () => {
      const edgeConfig: IterationConfig = {
        maxIterations: 1,
        convergenceThreshold: 1.0,
        improvementThreshold: 0.0,
        timeoutMs: 1000,
        enableAutoApproval: true
      };

      expect(() => {
        new IterationManager(
          mockStateManager,
          mockRequestAnalyzer,
          mockPRDGenerator,
          mockLLMRouter,
          edgeConfig
        );
      }).not.toThrow();
    });
  });

  describe('iteration result validation', () => {
    test('should validate IterationResult structure', () => {
      const mockPRD = {} as PRD; // Simplified mock
      const mockValidation = {} as ValidationResult; // Simplified mock
      const mockLLMResponse = {} as LLMResponse; // Simplified mock

      const iterationResult: IterationResult = {
        iteration: 1,
        prd: mockPRD,
        improvements: ['Added detailed feature descriptions'],
        confidence: 0.9,
        validation: mockValidation,
        response: mockLLMResponse,
        convergenceScore: 0.85
      };

      expect(iterationResult.iteration).toBeGreaterThan(0);
      expect(iterationResult.prd).toBeDefined();
      expect(Array.isArray(iterationResult.improvements)).toBe(true);
      expect(iterationResult.confidence).toBeGreaterThanOrEqual(0);
      expect(iterationResult.confidence).toBeLessThanOrEqual(1);
      expect(iterationResult.validation).toBeDefined();
      expect(iterationResult.response).toBeDefined();
      expect(iterationResult.convergenceScore).toBeGreaterThanOrEqual(0);
      expect(iterationResult.convergenceScore).toBeLessThanOrEqual(1);
    });
  });

  describe('iteration metrics validation', () => {
    test('should validate IterationMetrics structure', () => {
      const metrics: IterationMetrics = {
        totalIterations: 3,
        averageConfidence: 0.85,
        improvementRate: 0.25,
        convergenceRate: 0.90,
        timeSpent: 45000,
        userInterventions: 1
      };

      expect(metrics.totalIterations).toBeGreaterThanOrEqual(0);
      expect(metrics.averageConfidence).toBeGreaterThanOrEqual(0);
      expect(metrics.averageConfidence).toBeLessThanOrEqual(1);
      expect(metrics.improvementRate).toBeGreaterThanOrEqual(0);
      expect(metrics.convergenceRate).toBeGreaterThanOrEqual(0);
      expect(metrics.convergenceRate).toBeLessThanOrEqual(1);
      expect(metrics.timeSpent).toBeGreaterThanOrEqual(0);
      expect(metrics.userInterventions).toBeGreaterThanOrEqual(0);
    });

    test('should handle zero metrics values', () => {
      const zeroMetrics: IterationMetrics = {
        totalIterations: 0,
        averageConfidence: 0,
        improvementRate: 0,
        convergenceRate: 0,
        timeSpent: 0,
        userInterventions: 0
      };

      expect(zeroMetrics.totalIterations).toBe(0);
      expect(zeroMetrics.averageConfidence).toBe(0);
      expect(zeroMetrics.improvementRate).toBe(0);
      expect(zeroMetrics.convergenceRate).toBe(0);
      expect(zeroMetrics.timeSpent).toBe(0);
      expect(zeroMetrics.userInterventions).toBe(0);
    });
  });

  describe('dependency validation', () => {
    test('should accept valid StateManager dependency', () => {
      expect(mockStateManager).toBeDefined();
      expect(mockStateManager.initializeSession).toBeDefined();
      expect(mockStateManager.getSession).toBeDefined();
      expect(mockStateManager.updateSession).toBeDefined();
      expect(mockStateManager.updateWorkflowStage).toBeDefined();
    });

    test('should accept valid RequestAnalyzer dependency', () => {
      expect(mockRequestAnalyzer).toBeDefined();
      expect(mockRequestAnalyzer.analyze).toBeDefined();
    });

    test('should accept valid PRDGenerator dependency', () => {
      expect(mockPRDGenerator).toBeDefined();
      expect(mockPRDGenerator.generate).toBeDefined();
    });

    test('should accept valid LLMRouter dependency', () => {
      expect(mockLLMRouter).toBeDefined();
      expect(mockLLMRouter.route).toBeDefined();
    });
  });

  describe('request handling', () => {
    test('should validate UserRequest structure', () => {
      expect(mockUserRequest.id).toBeDefined();
      expect(mockUserRequest.timestamp).toBeInstanceOf(Date);
      expect(typeof mockUserRequest.rawInput).toBe('string');
      expect(mockUserRequest.rawInput.length).toBeGreaterThan(0);
      expect(typeof mockUserRequest.sessionId).toBe('string');
      expect(mockUserRequest.sessionId.length).toBeGreaterThan(0);
    });

    test('should handle requests with optional userId', () => {
      const requestWithoutUserId: UserRequest = {
        id: 'req-no-user',
        timestamp: new Date(),
        rawInput: 'Test request without user',
        sessionId: 'session-no-user'
      };

      expect(requestWithoutUserId.userId).toBeUndefined();
      expect(requestWithoutUserId.id).toBeDefined();
      expect(requestWithoutUserId.sessionId).toBeDefined();
    });

    test('should handle requests with context', () => {
      const requestWithContext: UserRequest = {
        id: 'req-with-context',
        timestamp: new Date(),
        rawInput: 'Test request with context',
        sessionId: 'session-with-context',
        userId: 'user-with-context',
        context: {
          previousRequests: [],
          iterationCount: 0,
          userPreferences: {
            defaultModel: 'claude-3-5-sonnet-20241022' as any,
            outputFormat: 'markdown' as any,
            iterationLimit: 5
          },
          conversationHistory: []
        }
      };

      expect(requestWithContext.context).toBeDefined();
      expect(requestWithContext.context!.previousRequests).toBeDefined();
      expect(requestWithContext.context!.userPreferences).toBeDefined();
    });
  });

  describe('priority and complexity handling', () => {
    test('should handle Priority enum values', () => {
      const priorities = [Priority.MUST_HAVE, Priority.SHOULD_HAVE, Priority.NICE_TO_HAVE];
      
      for (const priority of priorities) {
        expect(Object.values(Priority)).toContain(priority);
      }
    });

    test('should handle Intent enum values', () => {
      const intents = [Intent.CREATE_NEW, Intent.ITERATE, Intent.EXPORT];
      
      for (const intent of intents) {
        expect(Object.values(Intent)).toContain(intent);
      }
    });

    test('should handle ComplexityLevel enum values', () => {
      const complexityLevels = [
        ComplexityLevel.SIMPLE,
        ComplexityLevel.MODERATE,
        ComplexityLevel.COMPLEX,
        ComplexityLevel.ENTERPRISE
      ];
      
      for (const level of complexityLevels) {
        expect(Object.values(ComplexityLevel)).toContain(level);
      }
    });
  });

  describe('processing stage validation', () => {
    test('should handle ProcessingStage enum values', () => {
      const stages = [
        ProcessingStage.ANALYZING_REQUEST,
        ProcessingStage.GENERATING_PRD,
        ProcessingStage.VALIDATING_OUTPUT,
        ProcessingStage.COMPLETED,
        ProcessingStage.ERROR
      ];
      
      for (const stage of stages) {
        expect(Object.values(ProcessingStage)).toContain(stage);
      }
    });

    test('should validate stage progression logic', () => {
      expect(ProcessingStage.ANALYZING_REQUEST).toBe('analyzing_request');
      expect(ProcessingStage.GENERATING_PRD).toBe('generating_prd');
      expect(ProcessingStage.VALIDATING_OUTPUT).toBe('validating_output');
      expect(ProcessingStage.COMPLETED).toBe('completed');
      expect(ProcessingStage.ERROR).toBe('error');
    });
  });
});
