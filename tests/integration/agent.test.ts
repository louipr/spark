// tests/integration/agent.test.ts
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { WorkflowOrchestrator } from '../../src/core/agent/WorkflowOrchestrator.js';
import { WorkflowPlanner } from '../../src/core/agent/planner/WorkflowPlanner.js';
import { ToolRegistry } from '../../src/core/agent/tools/ToolRegistry.js';
import { TaskExecutor } from '../../src/core/agent/executor/TaskExecutor.js';
import { FileSystemTool } from '../../src/core/agent/tools/FileSystemTool.js';
import { ShellTool } from '../../src/core/agent/tools/ShellTool.js';
import { LLMRouter } from '../../src/core/llm/LLMRouter.js';
import { StateManager } from '../../src/core/orchestrator/StateManager.js';
import { LLMProvider, ModelType } from '../../src/models/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock console methods to reduce noise
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Mock LLM Router for testing
class MockLLMRouter extends LLMRouter {
  constructor() {
    super([]);
  }

  async route(messages: any[], taskType: any, strategy: any, options?: any) {
    // Return a mock plan response for testing
    return {
      id: 'mock-response',
      model: ModelType.CLAUDE_3_5_SONNET,
      provider: LLMProvider.CLAUDE,
      content: JSON.stringify([
        {
          id: 'step_1',
          name: 'Create project directory',
          tool: 'file_system',
          params: {
            action: 'create_dir',
            path: './test-project'
          },
          dependencies: []
        },
        {
          id: 'step_2', 
          name: 'Create package.json',
          tool: 'file_system',
          params: {
            action: 'write',
            path: './test-project/package.json',
            content: '{"name": "test-project", "version": "1.0.0"}'
          },
          dependencies: ['step_1']
        }
      ]),
      usage: { 
        promptTokens: 100, 
        completionTokens: 200,
        totalTokens: 300
      },
      metadata: {
        requestId: 'mock-request',
        timestamp: new Date(),
        processingTime: 100,
        cacheHit: false
      },
      finishReason: 'stop'
    };
  }
}

describe('Agent Integration Tests', () => {
  let orchestrator: WorkflowOrchestrator;
  let testDir: string; 
  let mockLLMRouter: MockLLMRouter;
  let stateManager: StateManager;
  let originalDir: string;

  beforeEach(async () => {
    // Store original directory
    originalDir = process.cwd();
    
    // Suppress console output during tests
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    
    // Create temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'spark-agent-test-'));
    process.chdir(testDir);

    // Setup mock dependencies
    mockLLMRouter = new MockLLMRouter();
    stateManager = new StateManager();

    // Create orchestrator with test configuration
    orchestrator = new WorkflowOrchestrator({
      llmRouter: mockLLMRouter,
      stateManager: stateManager
    }, {
      requireApproval: false,
      allowParallelExecution: false,
      maxExecutionTime: 5,
      autoRetry: false
    });
  });

  afterEach(async () => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
    
    // Restore working directory
    process.chdir(originalDir);
    
    // Clean up orchestrator resources
    if (orchestrator) {
      // Force cleanup of any pending operations
      orchestrator = null as any;
    }
    
    // Clean up state manager
    if (stateManager) {
      stateManager = null as any;
    }
    
    // Clean up mock router
    if (mockLLMRouter) {
      mockLLMRouter = null as any;
    }
    
    // Cleanup test directory with retry
    if (testDir) {
      try {
        await fs.rm(testDir, { recursive: true, force: true });
      } catch (error) {
        // Retry cleanup after short delay
        await new Promise(resolve => setTimeout(resolve, 100));
        try {
          await fs.rm(testDir, { recursive: true, force: true });
        } catch (retryError) {
          // Final attempt with different approach
          console.warn(`Could not cleanup test directory: ${testDir}`);
        }
      }
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  describe('WorkflowOrchestrator', () => {
    it('should initialize with all tools registered', () => {
      const availableTools = orchestrator.getAvailableTools();
      expect(availableTools).toContain('file_system');
      expect(availableTools).toContain('shell');
      expect(availableTools).toContain('github_copilot');
      expect(availableTools).toContain('prd_generator');
      expect(availableTools).toHaveLength(4);
    });

    it('should validate plan successfully', async () => {
      const validation = await orchestrator.validatePlan('Create a test project');
      
      expect(validation.isValid).toBe(true);
      expect(validation.plan).toBeDefined();
      expect(validation.plan!.steps).toHaveLength(2);
      expect(validation.issues).toHaveLength(0);
    });

    it('should process request and execute workflow', async () => {
      const result = await orchestrator.processRequest('Create a test project');
      
      expect(result.success).toBe(true);
      expect(result.plan).toBeDefined();
      expect(result.results).toBeDefined();
      expect(result.results!).toHaveLength(2);
      
      // Check that files were created
      const projectExists = await fs.access('./test-project').then(() => true).catch(() => false);
      expect(projectExists).toBe(true);
      
      const packageJsonExists = await fs.access('./test-project/package.json').then(() => true).catch(() => false);
      expect(packageJsonExists).toBe(true);
    });

    it('should handle execution errors gracefully', async () => {
      // Create a plan that will fail (trying to write to invalid path)
      const mockFailingRouter = new MockLLMRouter();
      mockFailingRouter.route = async () => ({
        id: 'mock-response',
        model: ModelType.CLAUDE_3_5_SONNET,
        provider: LLMProvider.CLAUDE,
        content: JSON.stringify([
          {
            id: 'step_1',
            name: 'Write to invalid path',
            tool: 'file_system',
            params: {
              action: 'write',
              path: '/root/invalid/path/file.txt',
              content: 'test'
            },
            dependencies: []
          }
        ]),
        usage: { 
          promptTokens: 100, 
          completionTokens: 200,
          totalTokens: 300
        },
        metadata: {
          requestId: 'mock-failing-request',
          timestamp: new Date(),
          processingTime: 100,
          cacheHit: false
        },
        finishReason: 'stop'
      });

      const failingOrchestrator = new WorkflowOrchestrator({
        llmRouter: mockFailingRouter,
        stateManager: stateManager
      }, {
        requireApproval: false,
        autoRetry: false
      });

      const result = await failingOrchestrator.processRequest('Fail test');
      
      expect(result.success).toBe(false);
      expect(result.results![0].success).toBe(false);
      expect(result.results![0].error).toContain('Invalid params for tool');
    });
  });

  describe('ToolRegistry', () => {
    let toolRegistry: ToolRegistry;

    beforeEach(() => {
      toolRegistry = new ToolRegistry();
    });

    it('should register and retrieve tools', () => {
      const fileSystemTool = new FileSystemTool();
      toolRegistry.register(fileSystemTool);

      expect(toolRegistry.getTool('file_system')).toBe(fileSystemTool);
      expect(toolRegistry.listTools()).toHaveLength(1);
      expect(toolRegistry.getToolNames()).toContain('file_system');
    });

    it('should handle unknown tools', () => {
      expect(toolRegistry.getTool('unknown_tool')).toBeUndefined();
    });
  });

  describe('TaskExecutor', () => {
    let taskExecutor: TaskExecutor;
    let toolRegistry: ToolRegistry;

    beforeEach(() => {
      toolRegistry = new ToolRegistry();
      toolRegistry.register(new FileSystemTool());
      toolRegistry.register(new ShellTool());
      taskExecutor = new TaskExecutor(toolRegistry);
    });

    it('should execute file system tasks', async () => {
      const step = {
        id: 'test_step',
        name: 'Create test file',
        tool: 'file_system',
        params: {
          action: 'write',
          path: './test-file.txt',
          content: 'Hello, World!'
        },
        dependencies: []
      };

      const context = {
        workingDirectory: testDir,
        environment: new Map(),
        state: new Map(),
        history: []
      };

      const result = await taskExecutor.execute(step, context);

      expect(result.success).toBe(true);
      expect(result.stepId).toBe('test_step');
      expect(result.tool).toBe('file_system');

      // Verify file was created
      const content = await fs.readFile('./test-file.txt', 'utf-8');
      expect(content).toBe('Hello, World!');
    });

    it('should execute shell commands safely', async () => {
      const step = {
        id: 'shell_step',
        name: 'List directory',
        tool: 'shell',
        params: {
          command: 'ls -la'
        },
        dependencies: []
      };

      const context = {
        workingDirectory: testDir,
        environment: new Map(),
        state: new Map(),
        history: []
      };

      const result = await taskExecutor.execute(step, context);

      expect(result.success).toBe(true);
      expect(result.result.stdout).toBeDefined();
    });

    it('should handle tool validation errors', async () => {
      const step = {
        id: 'invalid_step',
        name: 'Invalid step',
        tool: 'file_system',
        params: {
          // Missing required params
        },
        dependencies: []
      };

      const context = {
        workingDirectory: testDir,
        environment: new Map(),
        state: new Map(),
        history: []
      };

      const result = await taskExecutor.execute(step, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid params');
    });

    it('should check dependencies correctly', () => {
      const step = {
        id: 'dependent_step',
        name: 'Dependent step',
        tool: 'file_system',
        params: {},
        dependencies: ['step_1', 'step_2']
      };

      const completedSteps = new Set(['step_1']);
      expect(taskExecutor.checkDependencies(step, completedSteps)).toBe(false);

      completedSteps.add('step_2');
      expect(taskExecutor.checkDependencies(step, completedSteps)).toBe(true);
    });
  });

  describe('WorkflowPlanner', () => {
    let planner: WorkflowPlanner;

    beforeEach(() => {
      planner = new WorkflowPlanner(mockLLMRouter);
    });

    it('should create valid workflow plans', async () => {
      const plan = await planner.createPlan('Create a simple project');

      expect(plan.goal).toBe('Create a simple project');
      expect(plan.steps).toHaveLength(2);
      expect(plan.estimatedDuration).toBeGreaterThan(0);
    });

    it('should validate plans correctly', async () => {
      const plan = await planner.createPlan('Create a simple project');
      const validation = await planner.validatePlan(plan);

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect circular dependencies', async () => {
      const stepsWithCycle = [
        {
          id: 'step_1',
          name: 'Step 1',
          tool: 'file_system',
          params: {},
          dependencies: ['step_2']
        },
        {
          id: 'step_2',
          name: 'Step 2', 
          tool: 'file_system',
          params: {},
          dependencies: ['step_1']
        }
      ];

      const plan = {
        goal: 'Test cycle',
        steps: stepsWithCycle,
        estimatedDuration: 1
      };

      const validation = await planner.validatePlan(plan);

      expect(validation.isValid).toBe(false);
      expect(validation.issues[0]).toContain('Circular dependencies');
    });

    it('should order steps correctly', async () => {
      const plan = await planner.createPlan('Create a simple project');
      const orderedSteps = planner.getExecutionOrder(plan.steps);

      // First step should have no dependencies
      expect(orderedSteps[0].dependencies).toHaveLength(0);
      
      // Second step should depend on first
      expect(orderedSteps[1].dependencies).toContain(orderedSteps[0].id);
    });
  });
});
