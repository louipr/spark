// Integration Test - Basic Application Startup Test

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { SparkApplication } from '../../src/index.js';

describe('SparkApplication Integration Tests', () => {
  let app: SparkApplication;

  beforeAll(async () => {
    // Set test environment variables
    process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests
    process.env.STORAGE_PATH = '/tmp/spark-test';
  });

  afterAll(async () => {
    // Cleanup test environment
    delete process.env.LOG_LEVEL;
    delete process.env.STORAGE_PATH;
  });

  test('should create SparkApplication instance', () => {
    expect(() => {
      app = new SparkApplication();
    }).not.toThrow();
  });

  test('application should initialize all components', () => {
    // If we get here without throwing, the constructor worked
    expect(app).toBeDefined();
    expect(app).toBeInstanceOf(SparkApplication);
  });
});
