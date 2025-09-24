import { describe, test, expect, beforeEach } from '@jest/globals';
import { 
  ValidationEngine, 
  ValidationConfig, 
  ValidationRule, 
  ValidationReport 
} from '../../../../src/core/orchestrator/ValidationEngine.js';
import { 
  PRD, 
  ValidationResult, 
  ValidationError, 
  ValidationWarning,
  UserRequest, 
  ComplexityLevel, 
  Priority 
} from '../../../../src/models/index.js';

describe('ValidationEngine', () => {
  let validationEngine: ValidationEngine;
  let mockConfig: ValidationConfig;
  let mockUserRequest: UserRequest;

  beforeEach(() => {
    mockConfig = {
      strictMode: false,
      requiredSections: ['metadata', 'productOverview', 'functionalRequirements'],
      minRequirements: 3,
      maxRequirements: 50,
      requireTechStack: true,
      requireTestingStrategy: false,
      customValidators: []
    };

    mockUserRequest = {
      id: 'req-validation-123',
      timestamp: new Date(),
      rawInput: 'Create a project management tool',
      sessionId: 'session-validation',
      userId: 'user-validation'
    };

    validationEngine = new ValidationEngine(mockConfig);
  });

  describe('initialization', () => {
    test('should initialize with provided config', () => {
      expect(validationEngine).toBeDefined();
      expect(validationEngine).toBeInstanceOf(ValidationEngine);
    });

    test('should initialize with default config', () => {
      const defaultEngine = new ValidationEngine();
      expect(defaultEngine).toBeDefined();
    });

    test('should merge partial config with defaults', () => {
      const partialConfig = { strictMode: true, minRequirements: 5 };
      const engineWithPartialConfig = new ValidationEngine(partialConfig);
      expect(engineWithPartialConfig).toBeDefined();
    });
  });

  describe('configuration validation', () => {
    test('should handle valid configurations', () => {
      expect(() => new ValidationEngine(mockConfig)).not.toThrow();
      expect(mockConfig.minRequirements).toBeLessThanOrEqual(mockConfig.maxRequirements);
    });
  });

  // Core functionality tests (removed redundant interface validation)

    test('should handle different rule severities', () => {
      const errorRule: ValidationRule = {
        name: 'error-rule',
        description: 'Error rule',
        validate: () => ({ valid: false, errors: [], warnings: [] }),
        severity: 'error',
        category: 'structure'
      };

      const warningRule: ValidationRule = {
        name: 'warning-rule',
        description: 'Warning rule',
        validate: () => ({ valid: true, errors: [], warnings: [] }),
        severity: 'warning',
        category: 'content'
      };

      expect(errorRule.severity).toBe('error');
      expect(warningRule.severity).toBe('warning');
    });

    test('should handle different rule categories', () => {
      const categories = ['structure', 'content', 'business', 'technical'];
      
      for (const category of categories) {
        const rule: ValidationRule = {
          name: `${category}-rule`,
          description: `${category} rule`,
          validate: () => ({ valid: true, errors: [], warnings: [] }),
          severity: 'warning',
          category: category as any
        };
        
        expect(rule.category).toBe(category);
      }
    });
  });

  describe('validation result structure', () => {
    test('should validate ValidationResult interface', () => {
      const result: ValidationResult = {
        valid: true,
        errors: [],
        warnings: []
      };

      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    test('should validate ValidationError structure', () => {
      const error: ValidationError = {
        field: 'testField',
        message: 'Test error message',
        constraint: 'required'
      };

      expect(typeof error.field).toBe('string');
      expect(typeof error.message).toBe('string');
      expect(typeof error.constraint).toBe('string');
    });

    test('should validate ValidationWarning structure', () => {
      const warning: ValidationWarning = {
        field: 'testField',
        message: 'Test warning message',
        suggestion: 'Test suggestion'
      };

      expect(typeof warning.field).toBe('string');
      expect(typeof warning.message).toBe('string');
      expect(typeof warning.suggestion).toBe('string');
    });
  });

  describe('validation report structure', () => {
    test('should validate ValidationReport interface', () => {
      const report: ValidationReport = {
        overall: {
          valid: true,
          errors: [],
          warnings: []
        },
        sections: {
          metadata: { valid: true, errors: [], warnings: [] },
          productOverview: { valid: true, errors: [], warnings: [] }
        },
        recommendations: ['Test recommendation'],
        completeness: 0.85,
        qualityScore: 0.90,
        estimatedEffort: '2-3 weeks'
      };

      expect(typeof report.overall).toBe('object');
      expect(typeof report.sections).toBe('object');
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(typeof report.completeness).toBe('number');
      expect(typeof report.qualityScore).toBe('number');
      expect(typeof report.estimatedEffort).toBe('string');
    });

    test('should validate report metrics ranges', () => {
      const report: ValidationReport = {
        overall: { valid: true, errors: [], warnings: [] },
        sections: {},
        recommendations: [],
        completeness: 0.75,
        qualityScore: 0.88,
        estimatedEffort: '1-2 months'
      };

      expect(report.completeness).toBeGreaterThanOrEqual(0);
      expect(report.completeness).toBeLessThanOrEqual(1);
      expect(report.qualityScore).toBeGreaterThanOrEqual(0);
      expect(report.qualityScore).toBeLessThanOrEqual(1);
    });
  });

  describe('user request validation', () => {
    test('should validate valid user request', () => {
      const result = validationEngine.validateUserRequest(mockUserRequest);
      
      expect(result).toBeDefined();
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    test('should handle request with missing id', () => {
      const invalidRequest = {
        ...mockUserRequest,
        id: ''
      };

      const result = validationEngine.validateUserRequest(invalidRequest);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should handle request with empty input', () => {
      const invalidRequest = {
        ...mockUserRequest,
        rawInput: ''
      };

      const result = validationEngine.validateUserRequest(invalidRequest);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should handle request with whitespace-only input', () => {
      const invalidRequest = {
        ...mockUserRequest,
        rawInput: '   \n  \t  '
      };

      const result = validationEngine.validateUserRequest(invalidRequest);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should validate optional fields', () => {
      const requestWithoutUserId = {
        id: 'req-no-user',
        timestamp: new Date(),
        rawInput: 'Valid request without userId',
        sessionId: 'session-123'
      };

      const result = validationEngine.validateUserRequest(requestWithoutUserId);
      expect(result).toBeDefined();
    });
  });

  describe('configuration edge cases', () => {
    test('should handle strict mode configuration', () => {
      const strictConfig = { ...mockConfig, strictMode: true };
      const strictEngine = new ValidationEngine(strictConfig);
      
      expect(strictEngine).toBeDefined();
    });

    test('should handle minimal requirements configuration', () => {
      const minimalConfig = { 
        ...mockConfig, 
        minRequirements: 1,
        maxRequirements: 5,
        requiredSections: ['metadata']
      };
      const minimalEngine = new ValidationEngine(minimalConfig);
      
      expect(minimalEngine).toBeDefined();
    });

    test('should handle tech stack requirement variations', () => {
      const noTechStackConfig = { ...mockConfig, requireTechStack: false };
      const requireTechStackConfig = { ...mockConfig, requireTechStack: true };
      
      const noTechStackEngine = new ValidationEngine(noTechStackConfig);
      const requireTechStackEngine = new ValidationEngine(requireTechStackConfig);
      
      expect(noTechStackEngine).toBeDefined();
      expect(requireTechStackEngine).toBeDefined();
    });

    test('should handle testing strategy requirement variations', () => {
      const noTestingConfig = { ...mockConfig, requireTestingStrategy: false };
      const requireTestingConfig = { ...mockConfig, requireTestingStrategy: true };
      
      const noTestingEngine = new ValidationEngine(noTestingConfig);
      const requireTestingEngine = new ValidationEngine(requireTestingConfig);
      
      expect(noTestingEngine).toBeDefined();
      expect(requireTestingEngine).toBeDefined();
    });
  });

  describe('priority and complexity handling', () => {
    test('should handle Priority enum values', () => {
      const priorities = [Priority.MUST_HAVE, Priority.SHOULD_HAVE, Priority.NICE_TO_HAVE];
      
      for (const priority of priorities) {
        expect(Object.values(Priority)).toContain(priority);
      }
    });

    test('should handle ComplexityLevel enum values', () => {
      const complexityLevels = [
        ComplexityLevel.SIMPLE,
        ComplexityLevel.MODERATE,
        ComplexityLevel.COMPLEX,
        ComplexityLevel.ENTERPRISE
      ];
      
      for (const level of complexityLevels) {
        expect(Object.values(ComplexityLevel)).toContain(level);
      }
    });
  });

  describe('custom validators', () => {
    test('should accept custom validation rules', () => {
      const customRule: ValidationRule = {
        name: 'custom-test-rule',
        description: 'Custom test validation rule',
        validate: (prd: PRD) => ({
          valid: true,
          errors: [],
          warnings: []
        }),
        severity: 'warning',
        category: 'business'
      };

      const configWithCustomRule = {
        ...mockConfig,
        customValidators: [customRule]
      };

      const engineWithCustomRule = new ValidationEngine(configWithCustomRule);
      expect(engineWithCustomRule).toBeDefined();
    });

    test('should handle multiple custom validators', () => {
      const customRules: ValidationRule[] = [
        {
          name: 'rule-1',
          description: 'First custom rule',
          validate: () => ({ valid: true, errors: [], warnings: [] }),
          severity: 'error',
          category: 'structure'
        },
        {
          name: 'rule-2',
          description: 'Second custom rule',
          validate: () => ({ valid: true, errors: [], warnings: [] }),
          severity: 'warning',
          category: 'technical'
        }
      ];

      const configWithMultipleRules = {
        ...mockConfig,
        customValidators: customRules
      };

      const engineWithMultipleRules = new ValidationEngine(configWithMultipleRules);
      expect(engineWithMultipleRules).toBeDefined();
    });

    test('should handle empty custom validators array', () => {
      const configWithEmptyRules = {
        ...mockConfig,
        customValidators: []
      };

      const engineWithEmptyRules = new ValidationEngine(configWithEmptyRules);
      expect(engineWithEmptyRules).toBeDefined();
    });
  });
});
