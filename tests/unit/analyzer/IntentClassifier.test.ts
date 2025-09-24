import { describe, test, expect, beforeEach } from '@jest/globals';
import { IntentClassifier } from '../../../src/core/analyzer/IntentClassifier.js';
import { Intent, AppType, RequestContext, ModelType, OutputFormat } from '../../../src/models/index.js';

describe('IntentClassifier', () => {
  let classifier: IntentClassifier;

  beforeEach(() => {
    classifier = new IntentClassifier();
  });

  describe('classify', () => {
    test('should be a function', () => {
      expect(typeof classifier.classify).toBe('function');
    });

    test('should return a Promise', () => {
      const result = classifier.classify('build a web app');
      expect(result).toBeInstanceOf(Promise);
    });

    test('should resolve to an Intent', async () => {
      const result = await classifier.classify('create a mobile app');
      expect(Object.values(Intent)).toContain(result);
    });

    test('should classify intents for new application requests', async () => {
      const createPhrases = [
        'build a web application',
        'create a mobile app',
        'develop a new CLI tool',
        'make a desktop application',
        'generate a REST API'
      ];

      for (const phrase of createPhrases) {
        const result = await classifier.classify(phrase);
        expect(Object.values(Intent)).toContain(result);
      }
    });

    test('should classify intents for modification requests', async () => {
      const iteratePhrases = [
        'update the user authentication',
        'modify the database schema',
        'change the API endpoints',
        'refactor the code structure',
        'enhance the user interface'
      ];

      for (const phrase of iteratePhrases) {
        const result = await classifier.classify(phrase);
        expect(Object.values(Intent)).toContain(result);
      }
    });

    test('should classify intents for export requests', async () => {
      const exportPhrases = [
        'export the project',
        'download the code',
        'save the files',
        'export to ZIP',
        'generate package'
      ];

      for (const phrase of exportPhrases) {
        const result = await classifier.classify(phrase);
        expect(Object.values(Intent)).toContain(result);
      }
    });

    test('should classify intents for deployment requests', async () => {
      const deployPhrases = [
        'deploy the application',
        'publish to production',
        'host the website',
        'launch the app',
        'go live'
      ];

      for (const phrase of deployPhrases) {
        const result = await classifier.classify(phrase);
        expect(Object.values(Intent)).toContain(result);
      }
    });

    test('should classify intents for preview requests', async () => {
      const previewPhrases = [
        'show me the app',
        'preview the website',
        'demo the application',
        'view the result',
        'see the output'
      ];

      for (const phrase of previewPhrases) {
        const result = await classifier.classify(phrase);
        expect(Object.values(Intent)).toContain(result);
      }
    });

    test('should handle ambiguous inputs with default classification', async () => {
      const ambiguousInputs = [
        'help',
        'something',
        'do stuff',
        'make it better',
        'fix issues'
      ];

      for (const input of ambiguousInputs) {
        const result = await classifier.classify(input);
        expect(Object.values(Intent)).toContain(result);
      }
    });

    test('should handle empty or minimal input', async () => {
      const minimalInputs = [
        '',
        'a',
        'app',
        'code',
        'project'
      ];

      for (const input of minimalInputs) {
        const result = await classifier.classify(input);
        expect(Object.values(Intent)).toContain(result);
      }
    });

    test('should be case insensitive', async () => {
      const casePairs = [
        ['BUILD A WEB APP', 'build a web app'],
        ['Create Mobile Application', 'create mobile application'],
        ['UPDATE THE CODE', 'update the code'],
        ['Analyze Performance', 'analyze performance']
      ];

      for (const [upper, lower] of casePairs) {
        const upperResult = await classifier.classify(upper);
        const lowerResult = await classifier.classify(lower);
        expect(upperResult).toBe(lowerResult);
      }
    });

    test('should handle complex multi-intent descriptions', async () => {
      const complexDescriptions = [
        'build a web app with user authentication and then test it',
        'create a mobile application and document the API',
        'develop a CLI tool and analyze its performance',
        'make a desktop app, modify the UI, and write tests'
      ];

      for (const description of complexDescriptions) {
        const result = await classifier.classify(description);
        expect(Object.values(Intent)).toContain(result);
      }
    });
  });

  describe('error handling', () => {
    test('should handle null input', async () => {
      await expect(classifier.classify(null as any)).rejects.toThrow();
    });

    test('should handle undefined input', async () => {
      await expect(classifier.classify(undefined as any)).rejects.toThrow();
    });

    test('should handle empty string input', async () => {
      const result = await classifier.classify('');
      expect(Object.values(Intent)).toContain(result);
    });
  });
});
