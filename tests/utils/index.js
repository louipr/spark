// Test Utilities - Common testing helper functions
import { jest } from '@jest/globals';
// Mock Function Utilities
export const createMockFunction = () => {
    return jest.fn();
};
export const createMockAsyncFunction = (resolveValue, rejectValue) => {
    const mock = jest.fn();
    if (rejectValue) {
        mock.mockRejectedValue(rejectValue);
    }
    else {
        mock.mockResolvedValue(resolveValue);
    }
    return mock;
};
// Environment Utilities
export const setTestEnvironment = (env) => {
    Object.entries(env).forEach(([key, value]) => {
        process.env[key] = value;
    });
};
export const cleanTestEnvironment = (keys) => {
    keys.forEach(key => {
        delete process.env[key];
    });
};
// Test Data Generation
export const generateRandomString = (length = 10) => {
    return Math.random().toString(36).substring(2, length + 2);
};
export const generateRandomId = () => {
    return `test-${Date.now()}-${generateRandomString(8)}`;
};
// Test Assertion Helpers
export const expectObjectToMatchPartial = (actual, expected) => {
    expect(actual).toMatchObject(expected);
};
export const expectArrayToContainPartial = (array, partial) => {
    expect(array).toEqual(expect.arrayContaining([
        expect.objectContaining(partial)
    ]));
};
//# sourceMappingURL=index.js.map