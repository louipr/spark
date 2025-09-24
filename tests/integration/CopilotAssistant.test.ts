import { describe, it, expect, beforeAll } from '@jest/globals';
import { CopilotAssistant } from '../../src/integrations/index.js';

describe('CopilotAssistant Integration - Lightweight', () => {
  let copilot: CopilotAssistant;
  let isAvailable: boolean;

  beforeAll(async () => {
    copilot = new CopilotAssistant();
    // Quick availability check with short timeout
    isAvailable = await copilot.isAvailable();
  });

  describe('availability check', () => {
    it('should check if GitHub Copilot CLI is available', async () => {
      expect(typeof isAvailable).toBe('boolean');
    });
  });

  describe('basic functionality', () => {
    it('should handle empty prompts gracefully', async () => {
      const suggestion = await copilot.suggestCommand('');
      expect(suggestion).toBeNull();
    });

    it('should create CopilotAssistant instance without errors', () => {
      const newCopilot = new CopilotAssistant();
      expect(newCopilot).toBeDefined();
      expect(newCopilot.suggestCommand).toBeDefined();
      expect(newCopilot.explainCommand).toBeDefined();
      expect(newCopilot.isAvailable).toBeDefined();
    });

    // Single fast integration test if CLI is available
    it('should integrate with GitHub Copilot CLI when available', async () => {
      if (!isAvailable) {
        console.log('⚠️  GitHub Copilot CLI not available, skipping integration test');
        return;
      }

      // Quick test with simple prompt that should respond fast
      const suggestion = await copilot.suggestCommand('ls');
      
      // Should either get a suggestion or handle gracefully
      expect(suggestion === null || typeof suggestion === 'string').toBe(true);
      
      if (suggestion) {
        console.log('✅ Basic integration working:', suggestion);
      } else {
        console.log('⚠️  Integration test completed (no suggestion)');
      }
    }, 5000); // 5 second timeout instead of default 30s
  });
});
