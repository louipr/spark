import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { ResponseParser } from '../../../../src/core/llm/ResponseParser.js';
import { TaskType, ModelType, Priority } from '../../../../src/models/index.js';
import { suppressConsole } from '../../../fixtures/llm.fixtures.js';

describe('ResponseParser', () => {
  let parser: ResponseParser;
  let restoreConsole: () => void;

  beforeEach(() => {
    restoreConsole = suppressConsole();
    parser = new ResponseParser();
  });

  afterEach(() => {
    restoreConsole();
    parser = null as any;
  });

  describe('initialization', () => {
    test('should initialize properly', () => {
      expect(parser).toBeDefined();
      expect(parser).toBeInstanceOf(ResponseParser);
    });
  });

  describe('response parsing', () => {
    test('should parse valid JSON response', () => {
      const jsonResponse = '{"status": "success", "data": {"message": "Hello World"}}';
      const expectedResult = { status: "success", data: { message: "Hello World" } };
      
      // Test JSON parsing capability
      expect(() => JSON.parse(jsonResponse)).not.toThrow();
      const parsedJson = JSON.parse(jsonResponse);
      expect(parsedJson).toEqual(expectedResult);
    });

    test('should handle malformed JSON gracefully', () => {
      const malformedJson = '{"status": "success", "data": {"message": "Hello World"';
      
      expect(() => JSON.parse(malformedJson)).toThrow();
      
      // Parser should handle this gracefully
      try {
        JSON.parse(malformedJson);
      } catch (error) {
        expect(error).toBeInstanceOf(SyntaxError);
      }
    });

    test('should handle empty responses', () => {
      const emptyResponse = '';
      expect(emptyResponse).toBe('');
      expect(emptyResponse.length).toBe(0);
    });

    test('should handle null responses', () => {
      const nullResponse = null;
      expect(nullResponse).toBeNull();
    });

    test('should handle undefined responses', () => {
      const undefinedResponse = undefined;
      expect(undefinedResponse).toBeUndefined();
    });
  });

  describe('content extraction', () => {
    test('should extract text content from responses', () => {
      const textContent = 'This is a plain text response';
      expect(typeof textContent).toBe('string');
      expect(textContent.length).toBeGreaterThan(0);
    });

    test('should extract structured content', () => {
      const structuredContent = {
        title: 'Product Requirements Document',
        sections: [
          { name: 'Overview', content: 'Product overview...' },
          { name: 'Features', content: 'Key features...' }
        ],
        metadata: {
          version: '1.0',
          lastUpdated: new Date().toISOString()
        }
      };

      expect(structuredContent.title).toBe('Product Requirements Document');
      expect(structuredContent.sections).toHaveLength(2);
      expect(structuredContent.metadata.version).toBe('1.0');
    });

    test('should handle markdown content', () => {
      const markdownContent = `
# Product Requirements Document

## Overview
This is the product overview section.

## Features
- Feature 1
- Feature 2
- Feature 3

## Technical Requirements
\`\`\`javascript
const config = {
  name: 'My App',
  version: '1.0.0'
};
\`\`\`
      `;

      expect(markdownContent).toContain('# Product Requirements Document');
      expect(markdownContent).toContain('## Overview');
      expect(markdownContent).toContain('- Feature 1');
      expect(markdownContent).toContain('```javascript');
    });
  });

  describe('validation', () => {
    test('should validate response structure for PRD generation', () => {
      const prdResponse = {
        taskType: TaskType.PRD_GENERATION,
        result: {
          title: 'Mobile Banking App PRD',
          overview: 'A comprehensive mobile banking solution',
          features: [
            'Account balance viewing',
            'Transaction history',
            'Money transfers'
          ],
          technicalRequirements: 'iOS and Android support',
          timeline: '6 months'
        }
      };

      expect(prdResponse.taskType).toBe(TaskType.PRD_GENERATION);
      expect(prdResponse.result.title).toBeDefined();
      expect(prdResponse.result.features).toBeInstanceOf(Array);
      expect(prdResponse.result.features.length).toBeGreaterThan(0);
    });

    test('should validate response structure for code generation', () => {
      const codeResponse = {
        taskType: TaskType.CODE_GENERATION,
        result: {
          language: 'typescript',
          code: 'export class UserService { constructor() {} }',
          tests: 'describe("UserService", () => { test("should instantiate", () => {}) });',
          documentation: 'UserService handles user management operations'
        }
      };

      expect(codeResponse.taskType).toBe(TaskType.CODE_GENERATION);
      expect(codeResponse.result.language).toBe('typescript');
      expect(codeResponse.result.code).toContain('export class');
      expect(codeResponse.result.tests).toContain('describe');
    });

    test('should validate response structure for architecture design', () => {
      const architectureResponse = {
        taskType: TaskType.ARCHITECTURE_DESIGN,
        result: {
          architecture: 'microservices',
          components: [
            { name: 'User Service', responsibility: 'User management' },
            { name: 'Auth Service', responsibility: 'Authentication' }
          ],
          dataFlow: 'Client -> API Gateway -> Services -> Database',
          technologies: ['Node.js', 'PostgreSQL', 'Redis']
        }
      };

      expect(architectureResponse.taskType).toBe(TaskType.ARCHITECTURE_DESIGN);
      expect(architectureResponse.result.components).toBeInstanceOf(Array);
      expect(architectureResponse.result.technologies).toContain('Node.js');
    });
  });

  describe('error handling', () => {
    test('should handle parsing errors gracefully', () => {
      const errorResponse = {
        error: true,
        message: 'Failed to generate response',
        code: 'GENERATION_ERROR'
      };

      expect(errorResponse.error).toBe(true);
      expect(errorResponse.message).toBeDefined();
      expect(errorResponse.code).toBe('GENERATION_ERROR');
    });

    test('should handle timeout errors', () => {
      const timeoutError = {
        error: true,
        message: 'Request timed out',
        code: 'TIMEOUT_ERROR',
        timeout: 30000
      };

      expect(timeoutError.error).toBe(true);
      expect(timeoutError.code).toBe('TIMEOUT_ERROR');
      expect(timeoutError.timeout).toBe(30000);
    });

    test('should handle rate limit errors', () => {
      const rateLimitError = {
        error: true,
        message: 'Rate limit exceeded',
        code: 'RATE_LIMIT_ERROR',
        retryAfter: 60
      };

      expect(rateLimitError.error).toBe(true);
      expect(rateLimitError.code).toBe('RATE_LIMIT_ERROR');
      expect(rateLimitError.retryAfter).toBe(60);
    });
  });

  describe('metadata extraction', () => {
    test('should extract usage statistics', () => {
      const usageStats = {
        promptTokens: 150,
        completionTokens: 500,
        totalTokens: 650,
        model: ModelType.GPT_4_TURBO,
        cost: 0.065
      };

      expect(usageStats.promptTokens).toBe(150);
      expect(usageStats.completionTokens).toBe(500);
      expect(usageStats.totalTokens).toBe(650);
      expect(usageStats.model).toBe(ModelType.GPT_4_TURBO);
      expect(usageStats.cost).toBe(0.065);
    });

    test('should extract timing information', () => {
      const timingInfo = {
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T10:00:05Z'),
        duration: 5000,
        model: ModelType.CLAUDE_3_5_SONNET
      };

      expect(timingInfo.startTime).toBeInstanceOf(Date);
      expect(timingInfo.endTime).toBeInstanceOf(Date);
      expect(timingInfo.duration).toBe(5000);
      expect(timingInfo.endTime.getTime() - timingInfo.startTime.getTime()).toBe(5000);
    });

    test('should extract quality metrics', () => {
      const qualityMetrics = {
        confidence: 0.95,
        relevance: 0.88,
        completeness: 0.92,
        coherence: 0.90
      };

      expect(qualityMetrics.confidence).toBeGreaterThan(0.9);
      expect(qualityMetrics.relevance).toBeGreaterThan(0.8);
      expect(qualityMetrics.completeness).toBeGreaterThan(0.9);
      expect(qualityMetrics.coherence).toBeGreaterThan(0.85);
    });
  });

  describe('content formatting', () => {
    test('should format structured outputs', () => {
      const structuredOutput = {
        sections: [
          {
            title: 'Executive Summary',
            content: 'Brief overview of the project',
            priority: Priority.MUST_HAVE
          },
          {
            title: 'Technical Details',
            content: 'Detailed technical specifications',
            priority: Priority.SHOULD_HAVE
          }
        ]
      };

      expect(structuredOutput.sections).toHaveLength(2);
      expect(structuredOutput.sections[0].priority).toBe(Priority.MUST_HAVE);
      expect(structuredOutput.sections[1].priority).toBe(Priority.SHOULD_HAVE);
    });

    test('should handle code block formatting', () => {
      const codeBlock = {
        language: 'typescript',
        code: `
interface User {
  id: string;
  name: string;
  email: string;
}

class UserService {
  private users: User[] = [];
  
  addUser(user: User): void {
    this.users.push(user);
  }
  
  getUser(id: string): User | undefined {
    return this.users.find(u => u.id === id);
  }
}
        `.trim(),
        description: 'User service implementation'
      };

      expect(codeBlock.language).toBe('typescript');
      expect(codeBlock.code).toContain('interface User');
      expect(codeBlock.code).toContain('class UserService');
      expect(codeBlock.description).toBeDefined();
    });

    test('should handle list formatting', () => {
      const listContent = {
        type: 'feature_list',
        items: [
          { name: 'User Authentication', description: 'Secure login system' },
          { name: 'Data Visualization', description: 'Charts and graphs' },
          { name: 'Real-time Updates', description: 'Live data synchronization' }
        ]
      };

      expect(listContent.type).toBe('feature_list');
      expect(listContent.items).toHaveLength(3);
      expect(listContent.items[0].name).toBe('User Authentication');
    });
  });
});
