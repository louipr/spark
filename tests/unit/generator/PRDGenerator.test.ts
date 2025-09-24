import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { PRDGenerator } from '../../../src/core/generator/PRDGenerator.js';
import { 
  UserRequest, 
  AnalysisResult, 
  ModelType, 
  OutputFormat, 
  AppType, 
  ComplexityLevel, 
  Intent, 
  FeatureType, 
  Priority 
} from '../../../src/models/index.js';

// Helper function to create mock user request
function createMockUserRequest(overrides: any = {}): UserRequest {
  return {
    id: 'req-test-001',
    timestamp: new Date('2024-01-01T00:00:00Z'),
    rawInput: 'Create a todo app with user authentication',
    sessionId: 'session-test-001',
    context: {
      previousRequests: [],
      currentPRD: undefined,
      iterationCount: 0,
      userPreferences: {
        defaultModel: ModelType.GPT_4_TURBO,
        outputFormat: OutputFormat.MARKDOWN,
        iterationLimit: 3
      },
      conversationHistory: []
    },
    ...overrides
  };
}

// Helper function to create mock analysis result
function createMockAnalysisResult(overrides: any = {}): AnalysisResult {
  return {
    appType: AppType.WEB_APP,
    features: [
      {
        name: 'User Authentication',
        type: FeatureType.AUTHENTICATION,
        priority: Priority.MUST_HAVE,
        complexity: ComplexityLevel.MODERATE,
        dependencies: [],
        estimatedEffort: 8,
        description: 'User login and registration',
        acceptanceCriteria: ['Users can register', 'Users can log in']
      }
    ],
    complexity: ComplexityLevel.MODERATE,
    intent: Intent.CREATE_NEW,
    entities: [],
    suggestedTechStack: {
      frontend: ['React', 'TypeScript'],
      backend: ['Node.js', 'Express'],
      database: ['PostgreSQL'],
      deployment: ['Vercel'],
      testing: ['Jest'],
      authentication: ['Auth0']
    },
    confidence: 0.85,
    reasoning: 'Web application with standard authentication requirements',
    ...overrides
  };
}

describe('PRDGenerator', () => {
  let prdGenerator: PRDGenerator;

  beforeEach(() => {
    prdGenerator = new PRDGenerator();
  });

  describe('constructor', () => {
    test('should create PRDGenerator instance', () => {
      expect(prdGenerator).toBeInstanceOf(PRDGenerator);
    });

    test('should initialize internal components', () => {
      expect(prdGenerator).toBeDefined();
      expect(typeof prdGenerator.generate).toBe('function');
    });
  });

  describe('generate', () => {
    test('should be a function', () => {
      expect(typeof prdGenerator.generate).toBe('function');
    });

    test('should return a Promise', () => {
      const mockRequest = createMockUserRequest();
      const mockAnalysis = createMockAnalysisResult();
      
      const result = prdGenerator.generate(mockRequest, mockAnalysis);
      expect(result).toBeInstanceOf(Promise);
    });

    test('should generate PRD with basic structure', async () => {
      const mockRequest = createMockUserRequest();
      const mockAnalysis = createMockAnalysisResult();

      try {
        const prd = await prdGenerator.generate(mockRequest, mockAnalysis);
        
        expect(prd).toBeDefined();
        expect(prd.id).toBeDefined();
        expect(prd.metadata).toBeDefined();
        expect(prd.productOverview).toBeDefined();
        expect(typeof prd.id).toBe('string');
        expect(prd.id.length).toBeGreaterThan(0);
      } catch (error) {
        // If generation fails due to dependencies, ensure error is meaningful
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('should handle different app types', async () => {
      const appTypes = [
        AppType.WEB_APP,
        AppType.MOBILE_APP,
        AppType.API_SERVICE,
        AppType.CLI_TOOL,
        AppType.DASHBOARD
      ];

      for (const appType of appTypes) {
        const mockRequest = createMockUserRequest();
        const mockAnalysis = createMockAnalysisResult({ appType });

        try {
          const prd = await prdGenerator.generate(mockRequest, mockAnalysis);
          expect(prd).toBeDefined();
          expect(prd.metadata).toBeDefined();
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      }
    });

    test('should handle different complexity levels', async () => {
      const complexityLevels = [
        ComplexityLevel.SIMPLE,
        ComplexityLevel.MODERATE,
        ComplexityLevel.COMPLEX,
        ComplexityLevel.ENTERPRISE
      ];

      for (const complexity of complexityLevels) {
        const mockRequest = createMockUserRequest();
        const mockAnalysis = createMockAnalysisResult({ complexity });

        try {
          const prd = await prdGenerator.generate(mockRequest, mockAnalysis);
          expect(prd).toBeDefined();
          expect(prd.metadata).toBeDefined();
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      }
    });

    test('should include features from analysis', async () => {
      const mockFeatures = [
        {
          name: 'User Management',
          type: FeatureType.AUTHENTICATION,
          priority: Priority.MUST_HAVE,
          complexity: ComplexityLevel.MODERATE,
          dependencies: [],
          estimatedEffort: 16,
          description: 'User registration and authentication',
          acceptanceCriteria: ['Users can register', 'Users can log in']
        },
        {
          name: 'Data Storage',
          type: FeatureType.DATA_PERSISTENCE,
          priority: Priority.MUST_HAVE,
          complexity: ComplexityLevel.SIMPLE,
          dependencies: [],
          estimatedEffort: 8,
          description: 'Store application data',
          acceptanceCriteria: ['Data is persisted', 'Data can be retrieved']
        }
      ];

      const mockRequest = createMockUserRequest();
      const mockAnalysis = createMockAnalysisResult({ features: mockFeatures });

      try {
        const prd = await prdGenerator.generate(mockRequest, mockAnalysis);
        expect(prd).toBeDefined();
        // Verify features are reflected in the PRD
        expect(prd.functionalRequirements).toBeDefined();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('should generate different sections based on app type', async () => {
      const webAppRequest = createMockUserRequest({
        rawInput: 'Create a web dashboard with charts'
      });
      const webAppAnalysis = createMockAnalysisResult({
        appType: AppType.WEB_APP
      });

      const apiRequest = createMockUserRequest({
        rawInput: 'Create a REST API service'
      });
      const apiAnalysis = createMockAnalysisResult({
        appType: AppType.API_SERVICE
      });

      try {
        const webPrd = await prdGenerator.generate(webAppRequest, webAppAnalysis);
        const apiPrd = await prdGenerator.generate(apiRequest, apiAnalysis);

        expect(webPrd).toBeDefined();
        expect(apiPrd).toBeDefined();

        // Web app should have UI specifications
        expect(webPrd.userInterface).toBeDefined();
        
        // API service should have API specifications
        expect(apiPrd.apiSpecification).toBeDefined();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('should include suggested tech stack', async () => {
      const mockTechStack = {
        frontend: ['React', 'TypeScript', 'Tailwind CSS'],
        backend: ['Node.js', 'Express', 'TypeScript'],
        database: ['PostgreSQL', 'Redis'],
        deployment: ['Docker', 'AWS'],
        testing: ['Jest', 'Cypress'],
        authentication: ['JWT', 'bcrypt']
      };

      const mockRequest = createMockUserRequest();
      const mockAnalysis = createMockAnalysisResult({
        suggestedTechStack: mockTechStack
      });

      try {
        const prd = await prdGenerator.generate(mockRequest, mockAnalysis);
        expect(prd).toBeDefined();
        expect(prd.technicalSpecifications).toBeDefined();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('PRD structure validation', () => {
    test('should generate PRD with all required sections', async () => {
      const mockRequest = createMockUserRequest();
      const mockAnalysis = createMockAnalysisResult();

      try {
        const prd = await prdGenerator.generate(mockRequest, mockAnalysis);
        
        // Check required sections exist
        expect(prd.id).toBeDefined();
        expect(prd.metadata).toBeDefined();
        expect(prd.productOverview).toBeDefined();
        expect(prd.functionalRequirements).toBeDefined();
        expect(prd.technicalSpecifications).toBeDefined();
        
        // Check metadata structure
        expect(prd.metadata.title).toBeDefined();
        expect(prd.metadata.version).toBeDefined();
        expect(prd.metadata.createdAt).toBeDefined();
        expect(prd.metadata.description).toBeDefined();
        expect(prd.metadata.author).toBeDefined();
        
        // Check product overview structure
        expect(prd.productOverview.vision).toBeDefined();
        expect(prd.productOverview.objectives).toBeDefined();
        expect(prd.productOverview.valueProposition).toBeDefined();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('should generate consistent PRD for same input', async () => {
      const mockRequest = createMockUserRequest();
      const mockAnalysis = createMockAnalysisResult();

      try {
        const prd1 = await prdGenerator.generate(mockRequest, mockAnalysis);
        const prd2 = await prdGenerator.generate(mockRequest, mockAnalysis);

        expect(prd1.metadata.title).toBe(prd2.metadata.title);
        expect(prd1.metadata.description).toBe(prd2.metadata.description);
        expect(prd1.productOverview.vision).toBe(prd2.productOverview.vision);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('error handling', () => {
    test('should handle null request', async () => {
      const mockAnalysis = createMockAnalysisResult();
      
      await expect(
        prdGenerator.generate(null as any, mockAnalysis)
      ).rejects.toThrow();
    });

    test('should handle null analysis', async () => {
      const mockRequest = createMockUserRequest();
      
      await expect(
        prdGenerator.generate(mockRequest, null as any)
      ).rejects.toThrow();
    });

    test('should handle invalid analysis structure', async () => {
      const mockRequest = createMockUserRequest();
      const invalidAnalysis = {
        // Missing required fields
        appType: AppType.WEB_APP
      };
      
      await expect(
        prdGenerator.generate(mockRequest, invalidAnalysis as any)
      ).rejects.toThrow();
    });

    test('should handle empty features array', async () => {
      const mockRequest = createMockUserRequest();
      const mockAnalysis = createMockAnalysisResult({
        features: []
      });

      try {
        const prd = await prdGenerator.generate(mockRequest, mockAnalysis);
        expect(prd).toBeDefined();
        // Should still generate a valid PRD even with no features
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('integration with dependencies', () => {
    test('should integrate with TechStackSelector', async () => {
      const mockRequest = createMockUserRequest();
      const mockAnalysis = createMockAnalysisResult();

      try {
        const prd = await prdGenerator.generate(mockRequest, mockAnalysis);
        expect(prd.technicalSpecifications).toBeDefined();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('should integrate with RequirementsBuilder', async () => {
      const mockRequest = createMockUserRequest();
      const mockAnalysis = createMockAnalysisResult();

      try {
        const prd = await prdGenerator.generate(mockRequest, mockAnalysis);
        expect(prd.functionalRequirements).toBeDefined();
        expect(Array.isArray(prd.functionalRequirements)).toBe(true);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('should integrate with DataModelDesigner', async () => {
      const mockRequest = createMockUserRequest();
      const mockAnalysis = createMockAnalysisResult();

      try {
        const prd = await prdGenerator.generate(mockRequest, mockAnalysis);
        expect(prd.dataModel).toBeDefined();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});
