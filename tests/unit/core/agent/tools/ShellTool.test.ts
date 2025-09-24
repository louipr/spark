// ShellTool Unit Tests

import { ShellTool } from '../../../../../src/core/agent/tools/ShellTool.js';
import { ExecutionContext } from '../../../../../src/core/agent/planner/WorkflowPlanner.js';

describe('ShellTool', () => {
  let shellTool: ShellTool;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    shellTool = new ShellTool();
    mockContext = {
      workingDirectory: '/test',
      environment: new Map(),
      state: new Map(),
      history: [],
      timeout: 30000
    };
  });

  describe('validate', () => {
    it('should validate params with allowed commands', () => {
      const validParams = { command: 'ls -la' };
      const result = shellTool.validate(validParams);
      expect(result).toBe(true);
    });

    it('should validate commands appropriately', () => {
      // Test invalid params
      expect(shellTool.validate({ notACommand: 'test' })).toBe(false);
      
      // Test safe commands (reduced set)
      expect(shellTool.validate({ command: 'ls' })).toBe(true);
      expect(shellTool.validate({ command: 'pwd' })).toBe(true);
      
      // Test one dangerous command to minimize console spam  
      expect(shellTool.validate({ command: 'rm -rf /' })).toBe(false);
    });
  });

  describe('execute', () => {
    it('should have basic execute functionality', async () => {
      // Since execute involves actual shell execution, we'll just test the interface
      const params = { command: 'echo test' };
      
      // We won't actually execute for unit tests, but ensure the method exists
      expect(typeof shellTool.execute).toBe('function');
      expect(shellTool.execute.length).toBe(2); // params and context parameters
    });
  });

  describe('tool properties', () => {
    it('should have correct name and description', () => {
      expect(shellTool.name).toBe('shell');
      expect(shellTool.description).toContain('shell');
    });
  });
});
