// Zod schemas for runtime validation

import { z } from 'zod';
import {
  AppType,
  ComplexityLevel,
  FeatureType,
  Priority,
  Intent,
  LLMProvider,
  ModelType,
  OutputFormat,
  ErrorType,
  HTTPMethod
} from './enums.js';

// ============================================================================
// Core Request Schemas
// ============================================================================

export const UserRequestSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.date(),
  rawInput: z.string().min(1).max(10000),
  sessionId: z.string().uuid(),
  userId: z.string().optional(),
  context: z.object({
    previousRequests: z.array(z.any()),
    currentPRD: z.any().optional(),
    iterationCount: z.number().int().min(0),
    userPreferences: z.any(),
    conversationHistory: z.array(z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
      timestamp: z.date()
    }))
  }).optional()
});

export const UserPreferencesSchema = z.object({
  defaultModel: z.nativeEnum(ModelType),
  complexityPreference: z.nativeEnum(ComplexityLevel).optional(),
  techStackPreferences: z.object({
    frontend: z.any().optional(),
    backend: z.any().optional(),
    database: z.any().optional(),
    infrastructure: z.any().optional(),
    integrations: z.array(z.any()).optional(),
    developmentTools: z.any().optional()
  }).optional(),
  outputFormat: z.nativeEnum(OutputFormat),
  iterationLimit: z.number().int().min(1).max(50)
});

export const FeatureSchema = z.object({
  name: z.string().min(1),
  type: z.nativeEnum(FeatureType),
  priority: z.nativeEnum(Priority),
  complexity: z.nativeEnum(ComplexityLevel),
  dependencies: z.array(z.string()),
  estimatedEffort: z.number().positive(),
  description: z.string(),
  acceptanceCriteria: z.array(z.string())
});

export const EntitySchema = z.object({
  text: z.string(),
  type: z.string(),
  confidence: z.number().min(0).max(1),
  startIndex: z.number().int().min(0),
  endIndex: z.number().int().min(0)
});

export const AnalysisResultSchema = z.object({
  appType: z.nativeEnum(AppType),
  features: z.array(FeatureSchema),
  complexity: z.nativeEnum(ComplexityLevel),
  intent: z.nativeEnum(Intent),
  entities: z.array(EntitySchema),
  suggestedTechStack: z.any(), // TechStackSchema would be defined separately
  confidence: z.number().min(0).max(1),
  reasoning: z.string()
});

// ============================================================================
// PRD Schemas
// ============================================================================

export const PRDMetadataSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  author: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  version: z.string(),
  tags: z.array(z.string()),
  estimatedTimeline: z.string(),
  targetAudience: z.array(z.string())
});

export const UserPersonaSchema = z.object({
  name: z.string(),
  description: z.string(),
  goals: z.array(z.string()),
  painPoints: z.array(z.string()),
  technicalSkillLevel: z.enum(['low', 'medium', 'high'])
});

export const MetricSchema = z.object({
  name: z.string(),
  description: z.string(),
  target: z.string(),
  measurementMethod: z.string()
});

export const ProductOverviewSchema = z.object({
  vision: z.string(),
  objectives: z.array(z.string()),
  targetUsers: z.array(UserPersonaSchema),
  valueProposition: z.string(),
  successMetrics: z.array(MetricSchema)
});

export const FunctionalRequirementSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  priority: z.nativeEnum(Priority),
  acceptanceCriteria: z.array(z.string()),
  dependencies: z.array(z.string()),
  userStory: z.string(),
  businessRules: z.array(z.string())
});

// ============================================================================
// Technical Specification Schemas
// ============================================================================

export const LibrarySchema = z.object({
  name: z.string(),
  purpose: z.string(),
  version: z.string().optional()
});

export const DatabaseConfigSchema = z.object({
  primary: z.object({
    type: z.string(),
    version: z.string(),
    purpose: z.string()
  }),
  cache: z.object({
    type: z.string(),
    version: z.string(),
    purpose: z.string()
  }).optional(),
  search: z.object({
    type: z.string(),
    version: z.string(),
    purpose: z.string()
  }).optional()
});

export const IntegrationSchema = z.object({
  name: z.string(),
  type: z.string(),
  purpose: z.string(),
  authentication: z.string(),
  dataFlow: z.enum(['inbound', 'outbound', 'bidirectional']),
  protocol: z.string()
});

// ============================================================================
// API Specification Schemas
// ============================================================================

export const APIParameterSchema = z.object({
  name: z.string(),
  type: z.string(),
  location: z.enum(['query', 'path', 'header']),
  required: z.boolean(),
  description: z.string(),
  example: z.any().optional(),
  validation: z.array(z.object({
    type: z.string(),
    value: z.any().optional(),
    message: z.string()
  })).optional()
});

export const APIResponseSchema = z.object({
  statusCode: z.number().int().min(100).max(599),
  description: z.string(),
  schema: z.any().optional(),
  examples: z.record(z.any()).optional(),
  headers: z.record(z.string()).optional()
});

export const AuthenticationSpecSchema = z.object({
  type: z.enum(['none', 'api-key', 'bearer', 'oauth2', 'basic']),
  description: z.string(),
  location: z.enum(['header', 'query']).optional(),
  parameterName: z.string().optional()
});

export const RateLimitSpecSchema = z.object({
  requestsPerWindow: z.number().int().positive(),
  windowSizeMinutes: z.number().int().positive(),
  identifier: z.enum(['ip', 'user', 'api-key']),
  headers: z.array(z.string())
});

export const APISpecSchema = z.object({
  endpoint: z.string(),
  method: z.nativeEnum(HTTPMethod),
  description: z.string(),
  parameters: z.array(APIParameterSchema),
  requestBody: z.object({
    contentType: z.string(),
    schema: z.any(),
    examples: z.record(z.any())
  }).optional(),
  responses: z.array(APIResponseSchema),
  authentication: AuthenticationSpecSchema,
  rateLimit: RateLimitSpecSchema.optional()
});

// ============================================================================
// Data Model Schemas
// ============================================================================

export const ValidationRuleSchema = z.object({
  type: z.string(),
  value: z.any().optional(),
  message: z.string()
});

export const DataAttributeSchema = z.object({
  name: z.string(),
  type: z.string(),
  required: z.boolean(),
  unique: z.boolean(),
  defaultValue: z.any().optional(),
  validation: z.array(ValidationRuleSchema),
  description: z.string()
});

export const DataEntitySchema = z.object({
  name: z.string(),
  description: z.string(),
  attributes: z.array(DataAttributeSchema),
  primaryKey: z.array(z.string()),
  timestamps: z.boolean(),
  softDelete: z.boolean()
});

export const DataRelationshipSchema = z.object({
  name: z.string(),
  type: z.enum(['one-to-one', 'one-to-many', 'many-to-many']),
  from: z.object({
    entity: z.string(),
    attribute: z.string()
  }),
  to: z.object({
    entity: z.string(),
    attribute: z.string()
  }),
  cascadeDelete: z.boolean(),
  description: z.string()
});

// ============================================================================
// LLM Schemas
// ============================================================================

export const PromptContextSchema = z.object({
  role: z.string(),
  task: z.string(),
  constraints: z.array(z.string()),
  examples: z.array(z.object({
    input: z.string(),
    output: z.string(),
    explanation: z.string().optional()
  })),
  outputFormat: z.nativeEnum(OutputFormat),
  chainOfThought: z.boolean(),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().positive(),
  model: z.nativeEnum(ModelType)
});

export const TokenUsageSchema = z.object({
  promptTokens: z.number().int().min(0),
  completionTokens: z.number().int().min(0),
  totalTokens: z.number().int().min(0),
  cost: z.number().positive().optional()
});

export const LLMResponseSchema = z.object({
  id: z.string(),
  model: z.nativeEnum(ModelType),
  provider: z.nativeEnum(LLMProvider),
  content: z.string(),
  usage: TokenUsageSchema,
  metadata: z.object({
    requestId: z.string(),
    timestamp: z.date(),
    processingTime: z.number().positive(),
    cacheHit: z.boolean(),
    reasoning: z.string().optional()
  }),
  finishReason: z.string()
});

// ============================================================================
// Error & Validation Schemas
// ============================================================================

export const SparkErrorSchema = z.object({
  type: z.nativeEnum(ErrorType),
  message: z.string(),
  details: z.record(z.any()).optional(),
  timestamp: z.date(),
  requestId: z.string().optional(),
  stack: z.string().optional()
});

export const ValidationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  value: z.any().optional(),
  constraint: z.string()
});

export const ValidationWarningSchema = z.object({
  field: z.string(),
  message: z.string(),
  suggestion: z.string()
});

export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(ValidationErrorSchema),
  warnings: z.array(ValidationWarningSchema)
});

// ============================================================================
// Configuration Schemas
// ============================================================================

export const RateLimitConfigSchema = z.object({
  requestsPerMinute: z.number().int().positive(),
  requestsPerHour: z.number().int().positive(),
  requestsPerDay: z.number().int().positive()
});

export const ConfigurationSchema = z.object({
  defaultModel: z.nativeEnum(ModelType),
  maxIterations: z.number().int().min(1).max(100),
  cacheEnabled: z.boolean(),
  cacheTTL: z.number().int().positive(),
  logLevel: z.string(),
  storagePath: z.string(),
  apiTimeouts: z.record(z.number().positive()),
  rateLimits: z.record(RateLimitConfigSchema)
});

export const OutputResultSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: SparkErrorSchema.optional(),
  metadata: z.object({
    requestId: z.string(),
    processingTime: z.number().positive(),
    model: z.nativeEnum(ModelType),
    tokensUsed: z.number().int().min(0),
    version: z.string()
  })
});

// ============================================================================
// Session State Schema
// ============================================================================

export const HistoryEntrySchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['request', 'response', 'iteration', 'export']),
  timestamp: z.date(),
  data: z.any(),
  metadata: z.record(z.any())
});

export const SessionStateSchema = z.object({
  sessionId: z.string().uuid(),
  userId: z.string().optional(),
  currentPRD: z.any().optional(), // Full PRD schema would be quite large
  history: z.array(HistoryEntrySchema),
  context: z.any(), // Map serialization
  preferences: UserPreferencesSchema,
  createdAt: z.date(),
  lastActivity: z.date()
});

// ============================================================================
// Utility Schema Functions
// ============================================================================

export function createValidationFunction<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): { success: true; data: T } | { success: false; errors: string[] } => {
    try {
      const result = schema.parse(data);
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return { success: false, errors };
      }
      return { success: false, errors: ['Unknown validation error'] };
    }
  };
}

export function createSafeValidationFunction<T>(schema: z.ZodSchema<T>) {
  return (data: unknown) => {
    return schema.safeParse(data);
  };
}
