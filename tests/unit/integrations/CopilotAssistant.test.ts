import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CopilotAssistant } from '../../../src/integrations/CopilotAssistant.js';
import { GitHubCopilotCLI } from '../../../src/integrations/GitHubCopilotCLI.js';

// Mock the GitHubCopilotCLI
jest.mock('../../../src/integrations/GitHubCopilotCLI.js');

describe('CopilotAssistant Business Logic', () => {
  let copilot: CopilotAssistant;
  let mockCLI: jest.Mocked<GitHubCopilotCLI>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCLI = new (GitHubCopilotCLI as jest.MockedClass<typeof GitHubCopilotCLI>)() as jest.Mocked<GitHubCopilotCLI>;
    mockCLI.suggest.mockResolvedValue({ success: true, suggestion: 'mock response' });
    
    copilot = new CopilotAssistant();
    (copilot as any).copilot = mockCLI;
  });

  describe('target determination logic', () => {
    it('should determine correct target types based on prompt keywords', async () => {
      // Test GitHub target detection
      await copilot.suggestCommand('create github repo');
      expect(mockCLI.suggest).toHaveBeenLastCalledWith('create github repo', 'gh');

      await copilot.suggestCommand('make a pull request');
      expect(mockCLI.suggest).toHaveBeenLastCalledWith('make a pull request', 'gh');

      // Test Git target detection  
      await copilot.suggestCommand('commit my changes');
      expect(mockCLI.suggest).toHaveBeenLastCalledWith('commit my changes', 'git');

      await copilot.suggestCommand('show git status');
      expect(mockCLI.suggest).toHaveBeenLastCalledWith('show git status', 'git');

      // Test shell target (default)
      await copilot.suggestCommand('list files');
      expect(mockCLI.suggest).toHaveBeenLastCalledWith('list files', 'shell');
    });

    it('should handle case-insensitive keyword matching', async () => {
      await copilot.suggestCommand('Create GITHUB Issue');
      expect(mockCLI.suggest).toHaveBeenLastCalledWith('Create GITHUB Issue', 'gh');

      await copilot.suggestCommand('GIT STATUS');
      expect(mockCLI.suggest).toHaveBeenLastCalledWith('GIT STATUS', 'git');
    });
  });

  describe('use case prompt generation', () => {
    it('should generate correct prompts for known use cases', async () => {
      await copilot.suggestForUseCase('test', '/project/path');
      expect(mockCLI.suggest).toHaveBeenCalledWith(
        'Working in project directory: /project/path\nrun tests for this project',
        'shell'
      );

      await copilot.suggestForUseCase('build');
      expect(mockCLI.suggest).toHaveBeenCalledWith(
        'build this project for production',
        'shell'
      );
    });

    it('should return null for unknown use cases without making CLI calls', async () => {
      const result = await copilot.suggestForUseCase('unknown-case');
      
      expect(result).toBeNull();
      expect(mockCLI.suggest).not.toHaveBeenCalled();
    });

    it('should handle case-insensitive use case matching', async () => {
      await copilot.suggestForUseCase('TEST', '/path');
      expect(mockCLI.suggest).toHaveBeenCalledWith(
        'Working in project directory: /path\nrun tests for this project',
        'shell'
      );
    });
  });

  describe('error handling', () => {
    it('should handle CLI failures gracefully', async () => {
      // Test resolved failure
      mockCLI.suggest.mockResolvedValue({ success: false, error: 'Failed' });
      const result = await copilot.suggestCommand('test');
      expect(result).toBeNull();

      // Test rejected error  
      mockCLI.isAvailable.mockRejectedValue(new Error('Check failed'));
      const available = await copilot.isAvailable();
      expect(available).toBe(false);
    });
  });
});
