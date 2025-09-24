// FeatureDetector Simple Unit Tests

import { describe, test, expect, beforeEach } from '@jest/globals';
import { FeatureDetector } from '../../../../src/core/analyzer/FeatureDetector.js';
import { AppType } from '../../../../src/models/index.js';

describe('FeatureDetector', () => {
  let detector: FeatureDetector;

  beforeEach(() => {
    detector = new FeatureDetector();
  });

  describe('detectFeatures', () => {
    test('should be a function', () => {
      expect(detector.detectFeatures).toBeDefined();
      expect(typeof detector.detectFeatures).toBe('function');
    });

    test('should return a Promise', () => {
      const result = detector.detectFeatures('test input', AppType.WEB_APP, []);
      expect(result).toBeInstanceOf(Promise);
    });

    test('should resolve to an array', async () => {
      const features = await detector.detectFeatures('test input', AppType.WEB_APP, []);
      expect(Array.isArray(features)).toBe(true);
    });

    test('should handle various app types', async () => {
      const webFeatures = await detector.detectFeatures('web app', AppType.WEB_APP, []);
      const mobileFeatures = await detector.detectFeatures('mobile app', AppType.MOBILE_APP, []);
      const apiFeatures = await detector.detectFeatures('api service', AppType.API_SERVICE, []);

      expect(Array.isArray(webFeatures)).toBe(true);
      expect(Array.isArray(mobileFeatures)).toBe(true);
      expect(Array.isArray(apiFeatures)).toBe(true);
    });

    test('should handle empty string input', async () => {
      const features = await detector.detectFeatures('', AppType.WEB_APP, []);
      expect(Array.isArray(features)).toBe(true);
      expect(features.length).toBe(0);
    });

    test('should handle empty keywords array', async () => {
      const features = await detector.detectFeatures('some input text', AppType.WEB_APP, []);
      expect(Array.isArray(features)).toBe(true);
    });

    test('should return features with proper structure when found', async () => {
      const features = await detector.detectFeatures('user authentication login register', AppType.WEB_APP, ['auth', 'login']);
      
      features.forEach(feature => {
        expect(feature).toHaveProperty('name');
        expect(feature).toHaveProperty('type');
        expect(feature).toHaveProperty('priority');
        expect(feature).toHaveProperty('complexity');
        expect(feature).toHaveProperty('dependencies');
        expect(feature).toHaveProperty('estimatedEffort');
        expect(feature).toHaveProperty('description');
        expect(feature).toHaveProperty('acceptanceCriteria');
        
        expect(typeof feature.name).toBe('string');
        expect(typeof feature.description).toBe('string');
        expect(typeof feature.estimatedEffort).toBe('number');
        expect(Array.isArray(feature.dependencies)).toBe(true);
        expect(Array.isArray(feature.acceptanceCriteria)).toBe(true);
      });
    });
  });
});
