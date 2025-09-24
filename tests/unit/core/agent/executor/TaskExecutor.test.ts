import { TaskExecutor } from '../../../../../src/core/agent/executor/TaskExecutor';
import { ToolRegistry } from '../../../../../src/core/agent/tools/ToolRegistry';

jest.mock('../../../../../src/core/agent/tools/ToolRegistry');

describe('TaskExecutor', () => {
  let taskExecutor: TaskExecutor;
  let mockToolRegistry: jest.Mocked<ToolRegistry>;

  beforeEach(() => {
    mockToolRegistry = new ToolRegistry() as jest.Mocked<ToolRegistry>;
    taskExecutor = new TaskExecutor(mockToolRegistry);
  });

  describe('constructor', () => {
    it('should create TaskExecutor', () => {
      expect(taskExecutor).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should execute a task successfully', async () => {
      const mockTool = { validate: jest.fn().mockReturnValue(true), execute: jest.fn().mockResolvedValue('test result') };
      mockToolRegistry.getTool = jest.fn().mockReturnValue(mockTool);

      const step = { id: 'test', name: 'test', tool: 'test', params: {}, dependencies: [] };
      const context = { 
        state: new Map(), 
        workingDirectory: '/tmp', 
        environment: new Map<string, string>(), 
        history: [] 
      };
      
      const result = await taskExecutor.execute(step, context);

      expect(result.success).toBe(true);
    });
  });
});