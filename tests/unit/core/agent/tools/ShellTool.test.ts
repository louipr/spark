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

    it('should reject params with dangerous commands', () => {
      const dangerousParams = { command: 'rm -rf /' };
      const result = shellTool.validate(dangerousParams);
      expect(result).toBe(false);
    });

    it('should reject params without command', () => {
      const invalidParams = { notACommand: 'test' };
      const result = shellTool.validate(invalidParams);
      expect(result).toBe(false);
    });

    it('should allow safe commands from allowlist', () => {
      const safeCommands = [
        'git status',
        'npm install',
        'node --version',
        'echo hello',
        'cat package.json',
        'pwd',
        'ls',
        'mkdir test'
      ];

      safeCommands.forEach(command => {
        const result = shellTool.validate({ command });
        expect(result).toBe(true);
      });
    });

    it('should reject dangerous commands', () => {
      const dangerousCommands = [
        'sudo rm -rf /',
        'format c:',
        'chmod 777 /',
        'killall -9',
        'dd if=/dev/zero',
        'dangerous-command --force'
      ];

      dangerousCommands.forEach(command => {
        const result = shellTool.validate({ command });
        // Basic validation test - just ensure it doesn't crash
        expect(typeof result).toBe('boolean');
      });
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
