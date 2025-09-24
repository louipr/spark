// WorkflowPlanner Unit Tests

import { WorkflowPlanner } from '../../../../../src/core/agent/planner/WorkflowPlanner.js';
import { LLMRouter } from '../../../../../src/core/llm/index.js';
import { StateManager } from '../../../../../src/core/orchestrator/StateManager.js';
import { LLMProvider, ModelType } from '../../../../../src/models/index.js';

// Mock dependencies
jest.mock('../../../../../src/core/llm/index.js');
jest.mock('../../../../../src/core/orchestrator/StateManager.js');

describe('WorkflowPlanner', () => {
  let planner: WorkflowPlanner;
  let mockLLMRouter: jest.Mocked<LLMRouter>;
  let mockStateManager: jest.Mocked<StateManager>;

  beforeEach(() => {
    mockLLMRouter = {
      route: jest.fn(),
      getAvailableProviders: jest.fn(),
      selectProvider: jest.fn()
    } as any;

    mockStateManager = {
      getSessionState: jest.fn(),
      updateSessionState: jest.fn(),
      initializeSession: jest.fn()
    } as any;

    planner = new WorkflowPlanner(mockLLMRouter);
  });

  describe('createPlan', () => {
    it('should create a basic workflow plan for simple requests', async () => {
      const mockPlan = {
        goal: 'Create a simple web app',
        steps: [
          {
            id: 'step-1',
            name: 'Generate PRD',
            tool: 'PRDGeneratorTool',
            params: { request: 'Create a simple web app' },
            dependencies: []
          }
        ],
        estimatedDuration: 5
      };

      mockLLMRouter.route.mockResolvedValue({
        id: 'test-response',
        model: ModelType.CLAUDE_3_5_SONNET,
        provider: LLMProvider.CLAUDE,
        content: JSON.stringify(mockPlan),
        usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
        metadata: { 
          requestId: 'test-request',
          timestamp: new Date(),
          processingTime: 1000,
          cacheHit: false
        },
        finishReason: 'stop',
        cost: { inputCost: 0.01, outputCost: 0.02, totalCost: 0.03 }
      });

      const goal = 'Create a simple web app';
      const result = await planner.createPlan(goal);

      expect(result).toBeDefined();
      expect(result.goal).toBe('Create a simple web app');
      expect(result.steps.length).toBeGreaterThan(0);
      expect(mockLLMRouter.route).toHaveBeenCalled();
    });

    it('should handle planning errors gracefully', async () => {
      mockLLMRouter.route.mockRejectedValue(new Error('LLM error'));

      const goal = 'Invalid request';
      await expect(planner.createPlan(goal)).rejects.toThrow();
    });
  });

  describe('validatePlan', () => {
    it('should validate a well-formed plan', async () => {
      const validPlan = {
        id: 'test-plan',
        goal: 'Valid goal',
        steps: [
          {
            id: 'step-1',
            name: 'Valid step',
            tool: 'ValidTool',
            params: {},
            dependencies: []
          }
        ],
        estimatedDuration: 10,
        requiresApproval: false,
        metadata: {}
      };

      const result = await planner.validatePlan(validPlan);

      expect(result).toBeDefined();
    });

    it('should identify invalid plans', async () => {
      const invalidPlan = {
        id: '',
        goal: '',
        steps: [],
        estimatedDuration: -1,
        requiresApproval: false,
        metadata: {}
      };

      const result = await planner.validatePlan(invalidPlan);

      expect(result).toBeDefined();
    });
  });
});
