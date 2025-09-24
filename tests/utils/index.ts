// Test Utilities - Common testing helper functions

import { jest } from '@jest/globals';
import type { Mock } from 'jest-mock';

// Mock Function Utilities
export const createMockFunction = <T extends (...args: any[]) => any>(): Mock<T> => {
  return jest.fn() as Mock<T>;
};

export const createMockAsyncFunction = <T extends (...args: any[]) => Promise<any>>(
  resolveValue?: any,
  rejectValue?: any
): Mock<T> => {
  const mock = jest.fn() as Mock<T>;
  
  if (rejectValue) {
    mock.mockRejectedValue(rejectValue);
  } else {
    mock.mockResolvedValue(resolveValue);
  }
  
  return mock;
};

// Environment Utilities
export const setTestEnvironment = (env: Record<string, string>): void => {
  Object.entries(env).forEach(([key, value]) => {
    process.env[key] = value;
  });
};

export const cleanTestEnvironment = (keys: string[]): void => {
  keys.forEach(key => {
    delete process.env[key];
  });
};

// Test Data Generation
export const generateRandomString = (length: number = 10): string => {
  return Math.random().toString(36).substring(2, length + 2);
};

export const generateRandomId = (): string => {
  return `test-${Date.now()}-${generateRandomString(8)}`;
};

// Test Assertion Helpers
export const expectObjectToMatchPartial = <T>(actual: T, expected: Partial<T>): void => {
  expect(actual).toMatchObject(expected);
};

export const expectArrayToContainPartial = <T>(array: T[], partial: Partial<T>): void => {
  expect(array).toEqual(
    expect.arrayContaining([
      expect.objectContaining(partial)
    ])
  );
};
