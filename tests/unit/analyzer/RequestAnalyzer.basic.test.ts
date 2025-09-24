// RequestAnalyzer Basic Test - No complex imports

import { describe, test, expect, beforeEach } from '@jest/globals';
import { RequestAnalyzer } from '../../../src/core/analyzer/RequestAnalyzer.js';
import { ModelType, OutputFormat } from '../../../src/models/index.js';

describe('RequestAnalyzer Basic', () => {
  let analyzer: RequestAnalyzer;

  beforeEach(() => {
    analyzer = new RequestAnalyzer();
  });

  test('should instantiate properly', () => {
    expect(analyzer).toBeDefined();
    expect(analyzer.analyze).toBeDefined();
    expect(typeof analyzer.analyze).toBe('function');
  });

  test('should analyze a basic request', async () => {
    const mockRequest = {
      id: 'test-001',
      timestamp: new Date(),
      rawInput: 'Create a simple todo app',
      sessionId: 'session-001',
      context: {
        previousRequests: [],
        currentPRD: undefined,
        iterationCount: 0,
        userPreferences: {
          defaultModel: ModelType.CLAUDE_3_5_SONNET,
          outputFormat: OutputFormat.MARKDOWN,
          iterationLimit: 3
        },
        conversationHistory: []
      }
    };

    const result = await analyzer.analyze(mockRequest);

    expect(result).toBeDefined();
    expect(result.intent).toBeDefined();
    expect(result.complexity).toBeDefined();
    expect(result.appType).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(Array.isArray(result.features)).toBe(true);
    expect(Array.isArray(result.entities)).toBe(true);
    expect(result.suggestedTechStack).toBeDefined();
    expect(typeof result.reasoning).toBe('string');
  });
});
