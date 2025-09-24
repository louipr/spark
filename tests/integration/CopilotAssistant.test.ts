import { describe, it, expect, beforeAll } from '@jest/globals';
import { CopilotAssistant } from '../../src/integrations/index.js';

describe('CopilotAssistant Integration', () => {
  let copilot: CopilotAssistant;
  let isAvailable: boolean;

  beforeAll(async () => {
    copilot = new CopilotAssistant();
    isAvailable = await copilot.isAvailable();
  });

  describe('availability check', () => {
    it('should check if GitHub Copilot CLI is available', async () => {
      expect(typeof isAvailable).toBe('boolean');
    });
  });

  describe('command suggestions', () => {
    it('should generate command suggestions when CLI is available', async () => {
      if (!isAvailable) {
        console.log('⚠️  GitHub Copilot CLI not available, skipping suggestion tests');
        return;
      }

      const suggestion = await copilot.suggestCommand('list all files with details');
      
      if (suggestion) {
        expect(typeof suggestion).toBe('string');
        expect(suggestion.length).toBeGreaterThan(0);
        console.log('✅ Generated suggestion:', suggestion);
      } else {
        console.log('⚠️  No suggestion generated (may be due to interactive prompt)');
      }
    });

    it('should handle git-related prompts appropriately', async () => {
      if (!isAvailable) {
        console.log('⚠️  GitHub Copilot CLI not available, skipping git suggestion test');
        return;
      }

      const suggestion = await copilot.suggestCommand('show git status');
      
      if (suggestion) {
        expect(typeof suggestion).toBe('string');
        expect(suggestion.length).toBeGreaterThan(0);
        console.log('✅ Generated git suggestion:', suggestion);
      } else {
        console.log('⚠️  No git suggestion generated');
      }
    });

    it('should provide use case suggestions', async () => {
      if (!isAvailable) {
        console.log('⚠️  GitHub Copilot CLI not available, skipping use case test');
        return;
      }

      const suggestion = await copilot.suggestForUseCase('test', '/path/to/project');
      
      if (suggestion) {
        expect(typeof suggestion).toBe('string');
        expect(suggestion.length).toBeGreaterThan(0);
        console.log('✅ Generated use case suggestion:', suggestion);
      } else {
        console.log('⚠️  No use case suggestion generated');
      }
    });
  });

  describe('command explanations', () => {
    it('should explain simple commands when CLI is available', async () => {
      if (!isAvailable) {
        console.log('⚠️  GitHub Copilot CLI not available, skipping explanation tests');
        return;
      }

      const explanation = await copilot.explainCommand('ls -la');
      
      if (explanation) {
        expect(typeof explanation).toBe('string');
        expect(explanation.length).toBeGreaterThan(0);
        console.log('✅ Generated explanation:', explanation.substring(0, 100) + '...');
      } else {
        console.log('⚠️  No explanation generated');
      }
    });
  });

  describe('graceful fallbacks', () => {
    it('should handle invalid prompts gracefully', async () => {
      const suggestion = await copilot.suggestCommand('');
      expect(suggestion).toBeNull();
    });

    it('should handle complex prompts that might timeout', async () => {
      if (!isAvailable) {
        return;
      }

      // This might timeout due to complexity
      const suggestion = await copilot.suggestCommand('create a complex distributed microservices architecture with kubernetes orchestration, service mesh, monitoring, logging, and CI/CD pipeline using the latest best practices and security measures');
      
      // Should either return a suggestion or null (timeout), but not throw
      expect(suggestion === null || typeof suggestion === 'string').toBe(true);
    });
  });
});
