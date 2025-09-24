import type { Mock } from 'jest-mock';
export declare const createMockFunction: <T extends (...args: any[]) => any>() => Mock<T>;
export declare const createMockAsyncFunction: <T extends (...args: any[]) => Promise<any>>(resolveValue?: any, rejectValue?: any) => Mock<T>;
export declare const setTestEnvironment: (env: Record<string, string>) => void;
export declare const cleanTestEnvironment: (keys: string[]) => void;
export declare const generateRandomString: (length?: number) => string;
export declare const generateRandomId: () => string;
export declare const expectObjectToMatchPartial: <T>(actual: T, expected: Partial<T>) => void;
export declare const expectArrayToContainPartial: <T>(array: T[], partial: Partial<T>) => void;
//# sourceMappingURL=index.d.ts.map