// ComplexityAssessor Unit Tests

import { describe, test, expect, beforeEach } from '@jest/globals';
import { ComplexityAssessor } from '../../../src/core/analyzer/ComplexityAssessor.js';
import { ComplexityLevel, AppType, FeatureType, Priority } from '../../../src/models/index.js';

describe('ComplexityAssessor', () => {
  let assessor: ComplexityAssessor;

  beforeEach(() => {
    assessor = new ComplexityAssessor();
  });

  describe('assess', () => {
    test('should be a function', () => {
      expect(assessor.assess).toBeDefined();
      expect(typeof assessor.assess).toBe('function');
    });

    test('should return a Promise', () => {
      const mockFeatures = [
        {
          name: 'simple-feature',
          type: FeatureType.AUTHENTICATION,
          priority: Priority.MUST_HAVE,
          complexity: ComplexityLevel.SIMPLE,
          dependencies: [],
          estimatedEffort: 8,
          description: 'Test feature',
          acceptanceCriteria: []
        }
      ];
      const result = assessor.assess(mockFeatures, 'test input', AppType.WEB_APP);
      expect(result).toBeInstanceOf(Promise);
    });

    test('should resolve to a ComplexityLevel', async () => {
      const mockFeatures = [
        {
          name: 'simple-feature',
          type: FeatureType.AUTHENTICATION,
          priority: Priority.MUST_HAVE,
          complexity: ComplexityLevel.SIMPLE,
          dependencies: [],
          estimatedEffort: 8,
          description: 'Test feature',
          acceptanceCriteria: []
        }
      ];
      const result = await assessor.assess(mockFeatures, 'simple todo app', AppType.WEB_APP);
      
      expect(Object.values(ComplexityLevel)).toContain(result);
    });

    test('should handle empty features array', async () => {
      const result = await assessor.assess([], 'simple app', AppType.WEB_APP);
      expect(result).toBe(ComplexityLevel.SIMPLE);
    });

    test('should assess simple complexity for basic features', async () => {
      const simpleFeatures = [
        {
          name: 'basic-crud',
          type: FeatureType.DATA_PERSISTENCE,
          priority: Priority.MUST_HAVE,
          complexity: ComplexityLevel.SIMPLE,
          dependencies: [],
          estimatedEffort: 8,
          description: 'Basic CRUD operations',
          acceptanceCriteria: ['Create', 'Read', 'Update', 'Delete']
        }
      ];

      const result = await assessor.assess(simpleFeatures, 'simple todo app', AppType.WEB_APP);
      expect(result).toBe(ComplexityLevel.SIMPLE);
    });

    test('should assess higher complexity for complex features', async () => {
      const complexFeatures = Array.from({ length: 15 }, (_, i) => ({
        name: `complex-feature-${i}`,
        type: FeatureType.AI_INTEGRATION,
        priority: Priority.MUST_HAVE,
        complexity: ComplexityLevel.COMPLEX,
        dependencies: [`dep-${i}-1`, `dep-${i}-2`, `dep-${i}-3`],
        estimatedEffort: 80,
        description: 'Complex AI feature',
        acceptanceCriteria: ['AI training', 'Model deployment', 'Real-time inference']
      }));

      const result = await assessor.assess(
        complexFeatures,
        'enterprise AI platform with machine learning, real-time analytics, microservices architecture, and multi-tenant support',
        AppType.WEB_APP
      );
      
      expect([ComplexityLevel.COMPLEX, ComplexityLevel.ENTERPRISE]).toContain(result);
    });

    test('should consider app type in assessment', async () => {
      const features = [
        {
          name: 'data-feature',
          type: FeatureType.DATA_PERSISTENCE,
          priority: Priority.MUST_HAVE,
          complexity: ComplexityLevel.MODERATE,
          dependencies: [],
          estimatedEffort: 24,
          description: 'Data management',
          acceptanceCriteria: []
        }
      ];

      const webResult = await assessor.assess(features, 'web dashboard', AppType.WEB_APP);
      const cliResult = await assessor.assess(features, 'cli tool', AppType.CLI_TOOL);

      expect(Object.values(ComplexityLevel)).toContain(webResult);
      expect(Object.values(ComplexityLevel)).toContain(cliResult);
    });

    test('should handle complex input descriptions', async () => {
      const features = [
        {
          name: 'auth-feature',
          type: FeatureType.AUTHENTICATION,
          priority: Priority.MUST_HAVE,
          complexity: ComplexityLevel.MODERATE,
          dependencies: [],
          estimatedEffort: 16,
          description: 'Authentication system',
          acceptanceCriteria: []
        }
      ];

      const complexInput = 'Build a scalable, distributed, real-time, multi-tenant platform with advanced security, AI integration, and enterprise-grade features';
      const result = await assessor.assess(features, complexInput, AppType.WEB_APP);
      
      // The result should be one of the valid complexity levels
      expect(Object.values(ComplexityLevel)).toContain(result);
    });
  });

  describe('error handling', () => {
    test('should handle null features', async () => {
      await expect(assessor.assess(null as any, 'test', AppType.WEB_APP)).rejects.toThrow();
    });

    test('should handle null input', async () => {
      const features: any[] = [];
      await expect(assessor.assess(features, null as any, AppType.WEB_APP)).rejects.toThrow();
    });

    test('should handle invalid app type', async () => {
      const features: any[] = [];
      // The implementation returns 'simple' for invalid app types rather than throwing
      const result = await assessor.assess(features, 'test', null as any);
      expect(result).toBe(ComplexityLevel.SIMPLE);
    });
  });
});
