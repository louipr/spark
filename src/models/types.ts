// Core TypeScript interfaces for the Spark Clone system

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
  DatabaseType,
  FrontendFramework,
  BackendFramework,
  DeploymentPlatform,
  TestingFramework,
  HTTPMethod,
  ProcessingStage
} from './enums.js';

// ============================================================================
// Core Request & Analysis Types
// ============================================================================

export interface UserRequest {
  id: string;
  timestamp: Date;
  rawInput: string;
  sessionId: string;
  userId?: string;
  context?: RequestContext;
}

export interface RequestContext {
  previousRequests: UserRequest[];
  currentPRD?: PRD;
  iterationCount: number;
  userPreferences: UserPreferences;
  conversationHistory: ConversationMessage[];
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface UserPreferences {
  defaultModel: ModelType;
  complexityPreference?: ComplexityLevel;
  techStackPreferences?: Partial<TechStack>;
  outputFormat: OutputFormat;
  iterationLimit: number;
}

export interface AnalysisResult {
  appType: AppType;
  features: Feature[];
  complexity: ComplexityLevel;
  intent: Intent;
  entities: Entity[];
  suggestedTechStack: TechStack;
  confidence: number;
  reasoning: string;
}

export interface Feature {
  name: string;
  type: FeatureType;
  priority: Priority;
  complexity: ComplexityLevel;
  dependencies: string[];
  estimatedEffort: number; // hours
  description: string;
  acceptanceCriteria: string[];
}

export interface Entity {
  text: string;
  type: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
}

// ============================================================================
// PRD (Product Requirements Document) Types
// ============================================================================

export interface PRD {
  id: string;
  version: string;
  metadata: PRDMetadata;
  productOverview: ProductOverview;
  functionalRequirements: FunctionalRequirement[];
  technicalSpecifications: TechnicalSpec;
  userInterface: UISpecification;
  dataModel: DataModel;
  apiSpecification: APISpec[];
  securityRequirements: SecurityRequirement[];
  performanceRequirements: PerformanceSpec;
  testingStrategy: TestingStrategy;
  deploymentConfig: DeploymentConfig;
  implementationPlan: ImplementationPhase[];
  futureEnhancements: Enhancement[];
}

export interface PRDMetadata {
  title: string;
  description: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
  version: string;
  tags: string[];
  estimatedTimeline: string;
  targetAudience: string[];
}

export interface ProductOverview {
  vision: string;
  objectives: string[];
  targetUsers: UserPersona[];
  valueProposition: string;
  successMetrics: Metric[];
}

export interface UserPersona {
  name: string;
  description: string;
  goals: string[];
  painPoints: string[];
  technicalSkillLevel: 'low' | 'medium' | 'high';
}

export interface Metric {
  name: string;
  description: string;
  target: string;
  measurementMethod: string;
}

export interface FunctionalRequirement {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  acceptanceCriteria: string[];
  dependencies: string[];
  userStory: string;
  businessRules: string[];
}

// ============================================================================
// Technical Specification Types
// ============================================================================

export interface TechnicalSpec {
  architecture: ArchitectureDescription;
  techStack: TechStack;
  systemRequirements: SystemRequirements;
  integrations: Integration[];
  scalabilityPlan: ScalabilityPlan;
}

export interface ArchitectureDescription {
  pattern: string;
  description: string;
  components: ComponentDescription[];
  dataFlow: string;
  communicationProtocols: string[];
}

export interface ComponentDescription {
  name: string;
  responsibility: string;
  dependencies: string[];
  interfaces: string[];
}

export interface TechStack {
  frontend: FrontendStack;
  backend: BackendStack;
  database: DatabaseConfig;
  infrastructure: InfrastructureConfig;
  integrations: Integration[];
  developmentTools: DevelopmentTools;
}

export interface FrontendStack {
  framework: FrontendFramework;
  version: string;
  stateManagement?: string;
  styling: string;
  buildTool: string;
  testing: TestingFramework[];
  additionalLibraries: Library[];
}

export interface BackendStack {
  framework: BackendFramework;
  runtime: string;
  version: string;
  authentication: string;
  validation: string;
  logging: string;
  testing: TestingFramework[];
  additionalLibraries: Library[];
}

export interface Library {
  name: string;
  purpose: string;
  version?: string;
}

export interface DatabaseConfig {
  primary: {
    type: DatabaseType;
    version: string;
    purpose: string;
  };
  cache?: {
    type: DatabaseType;
    version: string;
    purpose: string;
  };
  search?: {
    type: string;
    version: string;
    purpose: string;
  };
}

export interface InfrastructureConfig {
  hosting: DeploymentPlatform;
  containerization?: string;
  orchestration?: string;
  monitoring: string[];
  cicd: string;
  domainManagement: string;
}

export interface Integration {
  name: string;
  type: string;
  purpose: string;
  authentication: string;
  dataFlow: 'inbound' | 'outbound' | 'bidirectional';
  protocol: string;
}

export interface DevelopmentTools {
  versionControl: string;
  packageManager: string;
  linting: string[];
  formatting: string;
  bundling: string;
  taskRunner?: string;
}

export interface SystemRequirements {
  minSystemSpecs: SystemSpecs;
  recommendedSpecs: SystemSpecs;
  browserCompatibility: string[];
  mobileCompatibility: string[];
}

export interface SystemSpecs {
  cpu: string;
  memory: string;
  storage: string;
  bandwidth: string;
}

export interface ScalabilityPlan {
  horizontalScaling: string;
  verticalScaling: string;
  databaseScaling: string;
  caching: string;
  loadBalancing: string;
  expectedLoad: LoadRequirements;
}

export interface LoadRequirements {
  concurrentUsers: number;
  requestsPerSecond: number;
  dataGrowthRate: string;
  peakLoadMultiplier: number;
}

// ============================================================================
// UI & API Specification Types
// ============================================================================

export interface UISpecification {
  designSystem: DesignSystem;
  layouts: LayoutSpec[];
  components: UIComponent[];
  userFlows: UserFlow[];
  accessibility: AccessibilitySpec;
  responsive: ResponsiveSpec;
}

export interface DesignSystem {
  colorPalette: ColorSpec[];
  typography: TypographySpec;
  spacing: SpacingSpec;
  iconography: string;
  brandingGuidelines: string[];
}

export interface ColorSpec {
  name: string;
  hex: string;
  usage: string;
}

export interface TypographySpec {
  primaryFont: string;
  secondaryFont?: string;
  fontSizes: FontSize[];
  lineHeights: LineHeight[];
}

export interface FontSize {
  name: string;
  size: string;
  usage: string;
}

export interface LineHeight {
  name: string;
  value: string;
  usage: string;
}

export interface SpacingSpec {
  unit: string;
  scale: number[];
  usage: Record<string, string>;
}

export interface LayoutSpec {
  name: string;
  type: string;
  description: string;
  components: string[];
  wireframe?: string;
}

export interface UIComponent {
  name: string;
  type: string;
  properties: ComponentProperty[];
  states: ComponentState[];
  variants: ComponentVariant[];
  accessibility: string[];
}

export interface ComponentProperty {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: any;
  description: string;
}

export interface ComponentState {
  name: string;
  description: string;
  trigger: string;
  visualChanges: string[];
}

export interface ComponentVariant {
  name: string;
  description: string;
  differences: string[];
  usage: string;
}

export interface UserFlow {
  name: string;
  description: string;
  steps: FlowStep[];
  alternativeFlows: AlternativeFlow[];
  errorHandling: ErrorHandlingStep[];
}

export interface FlowStep {
  stepNumber: number;
  action: string;
  userIntent: string;
  systemResponse: string;
  validation: string[];
}

export interface AlternativeFlow {
  name: string;
  trigger: string;
  steps: FlowStep[];
}

export interface ErrorHandlingStep {
  errorType: string;
  userExperience: string;
  recoveryOptions: string[];
}

export interface AccessibilitySpec {
  wcagLevel: 'A' | 'AA' | 'AAA';
  screenReaderSupport: boolean;
  keyboardNavigation: boolean;
  colorContrastRatio: number;
  alternativeText: boolean;
  focusManagement: string[];
}

export interface ResponsiveSpec {
  breakpoints: Breakpoint[];
  approach: 'mobile-first' | 'desktop-first';
  fluidDesign: boolean;
  adaptiveImages: boolean;
}

export interface Breakpoint {
  name: string;
  width: string;
  description: string;
}

export interface APISpec {
  endpoint: string;
  method: HTTPMethod;
  description: string;
  parameters: APIParameter[];
  requestBody?: RequestBodySpec;
  responses: APIResponse[];
  authentication: AuthenticationSpec;
  rateLimit?: RateLimitSpec;
}

export interface APIParameter {
  name: string;
  type: string;
  location: 'query' | 'path' | 'header';
  required: boolean;
  description: string;
  example?: any;
  validation?: ValidationRule[];
}

export interface RequestBodySpec {
  contentType: string;
  schema: any; // JSON Schema
  examples: Record<string, any>;
}

export interface APIResponse {
  statusCode: number;
  description: string;
  schema?: any;
  examples?: Record<string, any>;
  headers?: Record<string, string>;
}

export interface AuthenticationSpec {
  type: 'none' | 'api-key' | 'bearer' | 'oauth2' | 'basic';
  description: string;
  location?: 'header' | 'query';
  parameterName?: string;
}

export interface RateLimitSpec {
  requestsPerWindow: number;
  windowSizeMinutes: number;
  identifier: 'ip' | 'user' | 'api-key';
  headers: string[];
}

// ============================================================================
// Data Model Types
// ============================================================================

export interface DataModel {
  entities: DataEntity[];
  relationships: DataRelationship[];
  constraints: DataConstraint[];
  indices: IndexSpec[];
  migrations: MigrationSpec[];
}

export interface DataEntity {
  name: string;
  description: string;
  attributes: DataAttribute[];
  primaryKey: string[];
  timestamps: boolean;
  softDelete: boolean;
}

export interface DataAttribute {
  name: string;
  type: string;
  required: boolean;
  unique: boolean;
  defaultValue?: any;
  validation: ValidationRule[];
  description: string;
}

export interface ValidationRule {
  type: string;
  value?: any;
  message: string;
}

export interface DataRelationship {
  name: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  from: EntityReference;
  to: EntityReference;
  cascadeDelete: boolean;
  description: string;
}

export interface EntityReference {
  entity: string;
  attribute: string;
}

export interface DataConstraint {
  name: string;
  type: string;
  entities: string[];
  condition: string;
  description: string;
}

export interface IndexSpec {
  name: string;
  entity: string;
  attributes: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist';
  unique: boolean;
  description: string;
}

export interface MigrationSpec {
  version: string;
  description: string;
  operations: MigrationOperation[];
  rollback: MigrationOperation[];
}

export interface MigrationOperation {
  type: string;
  target: string;
  changes: Record<string, any>;
}

// ============================================================================
// Security & Performance Types
// ============================================================================

export interface SecurityRequirement {
  category: string;
  requirement: string;
  implementation: string;
  priority: Priority;
  compliance: string[];
}

export interface PerformanceSpec {
  responseTime: PerformanceTarget;
  throughput: PerformanceTarget;
  availability: PerformanceTarget;
  scalability: PerformanceTarget;
  loadTesting: LoadTestSpec;
}

export interface PerformanceTarget {
  metric: string;
  target: string;
  measurement: string;
  tools: string[];
}

export interface LoadTestSpec {
  scenarios: LoadTestScenario[];
  duration: string;
  rampUp: string;
  success_criteria: string[];
}

export interface LoadTestScenario {
  name: string;
  virtualUsers: number;
  actions: string[];
  expectedBehavior: string;
}

// ============================================================================
// Testing & Deployment Types
// ============================================================================

export interface TestingStrategy {
  levels: TestLevel[];
  automation: AutomationStrategy;
  coverage: CoverageTarget;
  performance: PerformanceTestSpec;
  security: SecurityTestSpec;
}

export interface TestLevel {
  type: string;
  framework: string;
  coverage: string;
  tools: string[];
  description: string;
}

export interface AutomationStrategy {
  cicd: boolean;
  triggers: string[];
  environments: string[];
  reportingTools: string[];
}

export interface CoverageTarget {
  unit: number;
  integration: number;
  e2e: number;
  overall: number;
}

export interface PerformanceTestSpec {
  tools: string[];
  metrics: string[];
  thresholds: Record<string, string>;
}

export interface SecurityTestSpec {
  staticAnalysis: boolean;
  dynamicAnalysis: boolean;
  dependencyScanning: boolean;
  tools: string[];
}

export interface DeploymentConfig {
  strategy: DeploymentStrategy;
  environments: EnvironmentConfig[];
  pipeline: PipelineStage[];
  rollback: RollbackStrategy;
  monitoring: MonitoringConfig;
}

export interface DeploymentStrategy {
  type: string;
  description: string;
  advantages: string[];
  implementation: string[];
}

export interface EnvironmentConfig {
  name: string;
  purpose: string;
  infrastructure: InfrastructureSpec;
  configuration: Record<string, string>;
  dataManagement: string;
}

export interface InfrastructureSpec {
  platform: string;
  compute: ComputeSpec;
  storage: StorageSpec;
  networking: NetworkingSpec;
}

export interface ComputeSpec {
  type: string;
  cpu: string;
  memory: string;
  scaling: ScalingConfig;
}

export interface StorageSpec {
  type: string;
  size: string;
  backup: BackupConfig;
}

export interface BackupConfig {
  frequency: string;
  retention: string;
  strategy: string;
}

export interface NetworkingSpec {
  loadBalancer: boolean;
  cdn: boolean;
  ssl: boolean;
  domains: string[];
}

export interface ScalingConfig {
  type: 'manual' | 'automatic';
  triggers: string[];
  minInstances: number;
  maxInstances: number;
}

export interface PipelineStage {
  name: string;
  description: string;
  actions: PipelineAction[];
  conditions: PipelineCondition[];
}

export interface PipelineAction {
  type: string;
  configuration: Record<string, any>;
  timeout: string;
}

export interface PipelineCondition {
  type: string;
  value: string;
  action: string;
}

export interface RollbackStrategy {
  automatic: boolean;
  triggers: string[];
  process: string[];
  timeLimit: string;
}

export interface MonitoringConfig {
  metrics: MetricConfig[];
  alerts: AlertConfig[];
  logging: LoggingConfig;
  uptime: UptimeConfig;
}

export interface MetricConfig {
  name: string;
  description: string;
  source: string;
  threshold: string;
}

export interface AlertConfig {
  name: string;
  condition: string;
  severity: string;
  channels: string[];
}

export interface LoggingConfig {
  level: string;
  aggregation: boolean;
  retention: string;
  analysis: string[];
}

export interface UptimeConfig {
  monitoring: boolean;
  frequency: string;
  locations: string[];
  alerts: boolean;
}

// ============================================================================
// Implementation & Enhancement Types
// ============================================================================

export interface ImplementationPhase {
  phase: number;
  name: string;
  description: string;
  duration: string;
  features: string[];
  deliverables: Deliverable[];
  dependencies: string[];
  risks: Risk[];
}

export interface Deliverable {
  name: string;
  type: string;
  description: string;
  acceptanceCriteria: string[];
}

export interface Risk {
  description: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface Enhancement {
  name: string;
  description: string;
  businessValue: string;
  technicalComplexity: ComplexityLevel;
  dependencies: string[];
  estimatedEffort: string;
}

// ============================================================================
// LLM & Prompt Engineering Types
// ============================================================================

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

export interface LLMConfig {
  model: ModelType;
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  timeout?: number;
}

export interface PromptContext {
  role: string;
  task: string;
  constraints: string[];
  examples: Example[];
  outputFormat: OutputFormat;
  chainOfThought: boolean;
  temperature: number;
  maxTokens: number;
  model: ModelType;
}

export interface Example {
  input: string;
  output: string;
  explanation?: string;
}

export interface LLMResponse {
  id: string;
  model: ModelType;
  provider: LLMProvider;
  content: string;
  usage: TokenUsage;
  metadata: ResponseMetadata;
  finishReason: string;
  cost?: {
    inputCost: number;
    outputCost: number;
    totalCost: number;
  };
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: number;
}

export interface ResponseMetadata {
  requestId: string;
  timestamp: Date;
  processingTime: number;
  cacheHit: boolean;
  reasoning?: string;
  confidence?: number;
}

// ============================================================================
// State Management Types
// ============================================================================

export interface SessionState {
  sessionId: string;
  userId?: string;
  currentPRD?: PRD;
  history: HistoryEntry[];
  context: Map<string, any>;
  preferences: UserPreferences;
  createdAt: Date;
  lastActivity: Date;
}

export interface HistoryEntry {
  id: string;
  type: 'request' | 'response' | 'iteration' | 'export';
  timestamp: Date;
  data: any;
  metadata: Record<string, any>;
}

// ============================================================================
// Error & Validation Types
// ============================================================================

export interface SparkError {
  type: ErrorType;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  requestId?: string;
  stack?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  constraint: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion: string;
}

// ============================================================================
// Output & Configuration Types
// ============================================================================

export interface OutputResult {
  success: boolean;
  data?: any;
  error?: SparkError;
  metadata: ResultMetadata;
}

export interface ResultMetadata {
  requestId: string;
  processingTime: number;
  model: ModelType;
  tokensUsed: number;
  version: string;
}

export interface Configuration {
  defaultModel: ModelType;
  maxIterations: number;
  cacheEnabled: boolean;
  cacheTTL: number;
  logLevel: string;
  storagePath: string;
  apiTimeouts: Record<string, number>;
  rateLimits: Record<string, RateLimitConfig>;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
}

// ============================================================================
// Workflow and Session Management Types
// ============================================================================

export interface WorkflowState {
  currentStage: ProcessingStage;
  progress: number;
  completed: ProcessingStage[];
  errors: ErrorRecord[];
  metadata: Record<string, any>;
}

export interface ErrorRecord {
  timestamp: Date;
  stage: ProcessingStage;
  message: string;
  stack?: string;
}

export interface SessionData {
  sessionId: string;
  userId?: string;
  requests: UserRequest[];
  prd?: PRD;
  conversationHistory: ConversationMessage[];
  workflowState: WorkflowState;
  createdAt: Date;
  completedAt?: Date;
}
