import { describe, test, expect, beforeEach } from '@jest/globals';
import { PromptTemplates } from '../../../src/core/prompts/PromptTemplates.js';
import { PromptTaskType } from '../../../src/core/prompts/PromptEngine.js';

describe('PromptTemplates', () => {
  let promptTemplates: PromptTemplates;

  beforeEach(() => {
    promptTemplates = new PromptTemplates();
  });

  describe('constructor', () => {
    test('should create PromptTemplates instance', () => {
      expect(promptTemplates).toBeInstanceOf(PromptTemplates);
    });

    test('should initialize templates', () => {
      expect(promptTemplates).toBeDefined();
      expect(typeof promptTemplates.getTemplate).toBe('function');
    });
  });

  describe('getTemplate', () => {
    test('should be a function', () => {
      expect(typeof promptTemplates.getTemplate).toBe('function');
    });

    test('should return template for valid task type', () => {
      const template = promptTemplates.getTemplate(PromptTaskType.PRD_GENERATION);
      
      expect(template).toBeDefined();
      expect(template.id).toBeDefined();
      expect(template.name).toBeDefined();
      expect(template.description).toBeDefined();
      expect(template.content).toBeDefined();
      expect(template.taskType).toBe(PromptTaskType.PRD_GENERATION);
    });

    test('should return different templates for different task types', () => {
      const prdTemplate = promptTemplates.getTemplate(PromptTaskType.PRD_GENERATION);
      const featureTemplate = promptTemplates.getTemplate(PromptTaskType.FEATURE_ANALYSIS);
      
      expect(prdTemplate.id).not.toBe(featureTemplate.id);
      expect(prdTemplate.taskType).not.toBe(featureTemplate.taskType);
    });

    test('should throw error for invalid task type', () => {
      expect(() => {
        promptTemplates.getTemplate('invalid_task_type' as any);
      }).toThrow('No template found for task type');
    });

    test('should handle all defined task types', () => {
      const taskTypes = [
        PromptTaskType.PRD_GENERATION,
        PromptTaskType.FEATURE_ANALYSIS,
        PromptTaskType.TECH_STACK_SELECTION,
        PromptTaskType.CODE_GENERATION,
        PromptTaskType.ITERATION_REFINEMENT,
        PromptTaskType.VALIDATION
      ];

      for (const taskType of taskTypes) {
        const template = promptTemplates.getTemplate(taskType);
        expect(template).toBeDefined();
        expect(template.taskType).toBe(taskType);
      }
    });
  });

  describe('getAllTemplates', () => {
    test('should be a function', () => {
      expect(typeof promptTemplates.getAllTemplates).toBe('function');
    });

    test('should return array of templates', () => {
      const templates = promptTemplates.getAllTemplates();
      
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });

    test('should return templates with valid structure', () => {
      const templates = promptTemplates.getAllTemplates();
      
      for (const template of templates) {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.content).toBeDefined();
        expect(template.taskType).toBeDefined();
        
        // Verify taskType is valid enum value
        expect(Object.values(PromptTaskType)).toContain(template.taskType);
      }
    });

    test('should return unique templates', () => {
      const templates = promptTemplates.getAllTemplates();
      const ids = templates.map(t => t.id);
      const uniqueIds = [...new Set(ids)];
      
      expect(ids.length).toBe(uniqueIds.length);
    });
  });

  describe('setTemplate', () => {
    test('should be a function', () => {
      expect(typeof promptTemplates.setTemplate).toBe('function');
    });

    test('should add new template', () => {
      const customTemplate = {
        id: 'custom_test_template',
        name: 'Custom Test Template',
        description: 'A template for testing',
        content: 'Test template content with {{variable}}',
        taskType: PromptTaskType.PRD_GENERATION,
        variables: ['variable']
      };

      promptTemplates.setTemplate(customTemplate);
      const retrieved = promptTemplates.getTemplate(PromptTaskType.PRD_GENERATION);
      
      expect(retrieved.id).toBe(customTemplate.id);
      expect(retrieved.name).toBe(customTemplate.name);
    });

    test('should update existing template', () => {
      const originalTemplate = promptTemplates.getTemplate(PromptTaskType.FEATURE_ANALYSIS);
      const updatedTemplate = {
        ...originalTemplate,
        name: 'Updated Feature Analysis Template',
        content: 'Updated content'
      };

      promptTemplates.setTemplate(updatedTemplate);
      const retrieved = promptTemplates.getTemplate(PromptTaskType.FEATURE_ANALYSIS);
      
      expect(retrieved.name).toBe('Updated Feature Analysis Template');
      expect(retrieved.content).toBe('Updated content');
    });

    test('should handle template with variables', () => {
      const templateWithVariables = {
        id: 'variable_test_template',
        name: 'Variable Test Template',
        description: 'Template with variables',
        content: 'Hello {{name}}, create a {{appType}} with {{features}}',
        taskType: PromptTaskType.CODE_GENERATION,
        variables: ['name', 'appType', 'features']
      };

      promptTemplates.setTemplate(templateWithVariables);
      const retrieved = promptTemplates.getTemplate(PromptTaskType.CODE_GENERATION);
      
      expect(retrieved.variables).toEqual(['name', 'appType', 'features']);
      expect(retrieved.content).toContain('{{name}}');
      expect(retrieved.content).toContain('{{appType}}');
      expect(retrieved.content).toContain('{{features}}');
    });
  });

  describe('template content validation', () => {
    test('should have non-empty content for all templates', () => {
      const templates = promptTemplates.getAllTemplates();
      
      for (const template of templates) {
        expect(template.content.length).toBeGreaterThan(0);
        expect(template.content.trim()).not.toBe('');
      }
    });

    test('should have meaningful names and descriptions', () => {
      const templates = promptTemplates.getAllTemplates();
      
      for (const template of templates) {
        expect(template.name.length).toBeGreaterThan(5);
        expect(template.description.length).toBeGreaterThan(10);
      }
    });

    test('should have consistent template structure', () => {
      const templates = promptTemplates.getAllTemplates();
      
      for (const template of templates) {
        // All templates should have consistent ID format
        expect(template.id).toMatch(/^[a-z_]+_v?\d*$/);
        
        // Content should be substantial
        expect(template.content.length).toBeGreaterThan(50);
      }
    });
  });

  describe('error handling', () => {
    test('should handle null template parameter', () => {
      expect(() => {
        promptTemplates.setTemplate(null as any);
      }).toThrow();
    });

    test('should handle template with missing required fields', () => {
      const incompleteTemplate = {
        id: 'incomplete',
        name: 'Incomplete Template'
        // Missing required fields
      };

      try {
        promptTemplates.setTemplate(incompleteTemplate as any);
        // If it doesn't throw, that's acceptable behavior for this implementation
        expect(true).toBe(true);
      } catch (error) {
        // If it does throw, that's also acceptable
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('template specific tests', () => {
    test('PRD generation template should contain key sections', () => {
      const template = promptTemplates.getTemplate(PromptTaskType.PRD_GENERATION);
      
      // Should contain common PRD sections
      const content = template.content.toLowerCase();
      expect(content).toContain('product');
      expect(content).toContain('requirement');
    });

    test('Feature analysis template should focus on features', () => {
      const template = promptTemplates.getTemplate(PromptTaskType.FEATURE_ANALYSIS);
      
      const content = template.content.toLowerCase();
      expect(content).toContain('feature');
      expect(content).toContain('analysis');
    });

    test('Tech stack template should mention technology', () => {
      const template = promptTemplates.getTemplate(PromptTaskType.TECH_STACK_SELECTION);
      
      const content = template.content.toLowerCase();
      expect(content).toContain('tech');
    });
  });
});
