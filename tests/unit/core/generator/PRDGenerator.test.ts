import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { PRDGenerator } from '../../../../src/core/generator/PRDGenerator.js';
import { suppressConsole } from '../../../fixtures/llm.fixtures.js';

describe('PRDGenerator', () => {
  let prdGenerator: PRDGenerator;
  let restoreConsole: () => void;

  beforeEach(() => {
    restoreConsole = suppressConsole();
    prdGenerator = new PRDGenerator();
  });

  afterEach(() => {
    restoreConsole();
    prdGenerator = null as any;
  });

  test('should create PRDGenerator instance', () => {
    expect(prdGenerator).toBeDefined();
    expect(prdGenerator).toBeInstanceOf(PRDGenerator);
  });

  test('should have generate method', () => {
    expect(typeof prdGenerator.generate).toBe('function');
  });
});
