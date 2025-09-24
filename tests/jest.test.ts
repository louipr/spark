// Simple test to verify Jest setup

import { describe, test, expect } from '@jest/globals';

describe('Jest Setup', () => {
  test('should work with basic assertions', () => {
    expect(1 + 1).toBe(2);
    expect('hello').toBe('hello');
    expect(true).toBeTruthy();
  });

  test('should handle async operations', async () => {
    const result = await Promise.resolve('async result');
    expect(result).toBe('async result');
  });
});
