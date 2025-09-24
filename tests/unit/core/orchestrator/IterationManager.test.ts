import { describe, test, expect, beforeEach } from '@jest/globals';
import { IterationManager, IterationConfig } from '../../../../src/core/orchestrator/IterationManager.js';
import { StateManager } from '../../../../src/core/orchestrator/StateManager.js';
import { RequestAnalyzer } from '../../../../src/core/analyzer/RequestAnalyzer.js';
import { PRDGenerator } from '../../../../src/core/generator/PRDGenerator.js';
import { LLMRouter } from '../../../../src/core/llm/LLMRouter.js';

describe('IterationManager', () => {
  let iterationManager: IterationManager;
  let mockStateManager: jest.Mocked<StateManager>;
  let mockRequestAnalyzer: jest.Mocked<RequestAnalyzer>;
  let mockPRDGenerator: jest.Mocked<PRDGenerator>;
  let mockLLMRouter: jest.Mocked<LLMRouter>;
  let mockConfig: IterationConfig;

  beforeEach(() => {
    mockStateManager = {
      initializeSession: jest.fn(),
      getSession: jest.fn(),
      updateSession: jest.fn()
    } as any;

    mockRequestAnalyzer = {
      analyze: jest.fn()
    } as any;

    mockPRDGenerator = {
      generatePRD: jest.fn()
    } as any;

    mockLLMRouter = {
      route: jest.fn()
    } as any;

    mockConfig = {
      maxIterations: 3,
      convergenceThreshold: 0.95,
      improvementThreshold: 0.1,
      timeoutMs: 300000,
      enableAutoApproval: false
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
      const manager = new IterationManager(
        mockStateManager,
        mockRequestAnalyzer,
        mockPRDGenerator,
        mockLLMRouter
      );
      expect(manager).toBeDefined();
    });
  });

  describe('configuration validation', () => {
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
});
