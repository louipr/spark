// Core enumerations for the Spark Clone system

export enum AppType {
  WEB_APP = 'web_app',
  MOBILE_APP = 'mobile_app',
  API_SERVICE = 'api_service',
  DASHBOARD = 'dashboard',
  CLI_TOOL = 'cli_tool',
  AUTOMATION = 'automation',
  GAME = 'game'
}

export enum ComplexityLevel {
  SIMPLE = 'simple',
  MODERATE = 'moderate',
  COMPLEX = 'complex',
  ENTERPRISE = 'enterprise'
}

export enum FeatureType {
  AUTHENTICATION = 'authentication',
  DATA_PERSISTENCE = 'data_persistence',
  REAL_TIME = 'real_time',
  AI_INTEGRATION = 'ai_integration',
  PAYMENT = 'payment',
  SOCIAL = 'social',
  ANALYTICS = 'analytics',
  SEARCH = 'search',
  FILE_UPLOAD = 'file_upload',
  NOTIFICATIONS = 'notifications',
  EMAIL = 'email',
  API_INTEGRATION = 'api_integration'
}

export enum Priority {
  MUST_HAVE = 'must_have',
  SHOULD_HAVE = 'should_have',
  NICE_TO_HAVE = 'nice_to_have'
}

export enum Intent {
  CREATE_NEW = 'create_new',
  ITERATE = 'iterate',
  EXPORT = 'export',
  DEPLOY = 'deploy',
  PREVIEW = 'preview',
  CONFIGURE = 'configure'
}

export enum LLMProvider {
  CLAUDE = 'claude',
  GPT = 'gpt',
  GEMINI = 'gemini',
  GITHUB_COPILOT = 'github_copilot'
}

export enum ModelType {
  CLAUDE_3_5_SONNET = 'claude-3-5-sonnet-20241022',
  CLAUDE_3_HAIKU = 'claude-3-haiku-20240307',
  GPT_4_TURBO = 'gpt-4-turbo-preview',
  GPT_4O = 'gpt-4o',
  GPT_3_5_TURBO = 'gpt-3.5-turbo'
}

export enum OutputFormat {
  JSON = 'json',
  MARKDOWN = 'markdown',
  YAML = 'yaml',
  TEXT = 'text'
}

export enum TaskType {
  PRD_GENERATION = 'prd_generation',
  FEATURE_ANALYSIS = 'feature_analysis',
  TECH_STACK_SELECTION = 'tech_stack_selection',
  CODE_GENERATION = 'code_generation',
  ARCHITECTURE_DESIGN = 'architecture_design',
  TESTING_STRATEGY = 'testing_strategy',
  DEPLOYMENT_PLANNING = 'deployment_planning',
  DOCUMENTATION = 'documentation'
}

export enum ErrorType {
  INVALID_INPUT = 'INVALID_INPUT',
  LLM_ERROR = 'LLM_ERROR',
  GENERATION_FAILED = 'GENERATION_FAILED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  STORAGE_ERROR = 'STORAGE_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR'
}

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export enum DatabaseType {
  POSTGRESQL = 'postgresql',
  MYSQL = 'mysql',
  MONGODB = 'mongodb',
  SQLITE = 'sqlite',
  REDIS = 'redis',
  FIREBASE = 'firebase'
}

export enum FrontendFramework {
  REACT = 'react',
  VUE = 'vue',
  ANGULAR = 'angular',
  SVELTE = 'svelte',
  NEXT_JS = 'nextjs',
  NUXT = 'nuxt',
  VANILLA = 'vanilla'
}

export enum BackendFramework {
  EXPRESS = 'express',
  FASTIFY = 'fastify',
  NEST_JS = 'nestjs',
  KOA = 'koa',
  DJANGO = 'django',
  FLASK = 'flask',
  SPRING_BOOT = 'spring_boot',
  RAILS = 'rails'
}

export enum DeploymentPlatform {
  VERCEL = 'vercel',
  NETLIFY = 'netlify',
  HEROKU = 'heroku',
  AWS = 'aws',
  GCP = 'gcp',
  AZURE = 'azure',
  DIGITALOCEAN = 'digitalocean',
  RAILWAY = 'railway'
}

export enum TestingFramework {
  JEST = 'jest',
  VITEST = 'vitest',
  MOCHA = 'mocha',
  CYPRESS = 'cypress',
  PLAYWRIGHT = 'playwright',
  TESTING_LIBRARY = 'testing_library'
}

export enum HTTPMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  OPTIONS = 'OPTIONS',
  HEAD = 'HEAD'
}

export enum ProcessingStage {
  ANALYZING_REQUEST = 'analyzing_request',
  GENERATING_PRD = 'generating_prd',
  VALIDATING_OUTPUT = 'validating_output',
  COMPLETED = 'completed',
  ERROR = 'error'
}
