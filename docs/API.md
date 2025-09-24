# Spark Agent System - API Documentation

## Table of Contents

- [Core Classes](#core-classes)
- [Agent Tools](#agent-tools)
- [Workflow Schema](#workflow-schema)
- [Examples](#examples)
- [Error Handling](#error-handling)

## Core Classes

### WorkflowOrchestrator

The main entry point for agent execution.

```typescript
class WorkflowOrchestrator {
  constructor(
    llmRouter: LLMRouter,
    stateManager: StateManager,
    options?: OrchestratorOptions
  )

  async processRequest(request: string): Promise<WorkflowResult>
  async executeWorkflow(plan: WorkflowPlan): Promise<WorkflowResult>
  displayPlan(plan: WorkflowPlan): void
}

interface OrchestratorOptions {
  requireApproval?: boolean;
  autoRetry?: boolean;
  maxSteps?: number;
  timeout?: number;
}

interface WorkflowResult {
  success: boolean;
  executionTime: string;
  results?: TaskResult[];
  error?: string;
  plan?: WorkflowPlan;
}
```

**Example:**
```typescript
const orchestrator = new WorkflowOrchestrator(llmRouter, stateManager, {
  requireApproval: false,
  autoRetry: true,
  maxSteps: 20
});

const result = await orchestrator.processRequest("Create a REST API");
if (result.success) {
  console.log(`✅ Completed ${result.results.length} steps`);
}
```

### WorkflowPlanner

Converts natural language requests into structured workflow plans.

```typescript
class WorkflowPlanner {
  constructor(llmRouter: LLMRouter)

  async createPlan(goal: string): Promise<WorkflowPlan>
  validatePlan(plan: WorkflowPlan): boolean
  optimizePlan(plan: WorkflowPlan): WorkflowPlan
}

interface WorkflowPlan {
  goal: string;
  steps: WorkflowStep[];
  estimatedDuration?: number;
  totalSteps: number;
}

interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  tool: string;
  params: any;
  estimatedDuration: number;
  dependencies: string[];
}
```

**Example:**
```typescript
const planner = new WorkflowPlanner(llmRouter);
const plan = await planner.createPlan("Set up a Python web scraper");

console.log(`📋 Generated plan with ${plan.steps.length} steps`);
plan.steps.forEach(step => {
  console.log(`  ${step.id}: ${step.name} (${step.tool})`);
});
```

### TaskExecutor

Executes individual workflow steps with retry logic and validation.

```typescript
class TaskExecutor {
  constructor(toolRegistry: ToolRegistry)

  async execute(step: WorkflowStep, context: ExecutionContext): Promise<TaskResult>
  checkDependencies(step: WorkflowStep, context: ExecutionContext): boolean
}

interface TaskResult {
  stepId: string;
  tool: string;
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
  timestamp: Date;
}

interface ExecutionContext {
  workingDirectory: string;
  state: Map<string, any>;
  history: ExecutionHistory[];
}
```

**Example:**
```typescript
const executor = new TaskExecutor(toolRegistry);

const step: WorkflowStep = {
  id: 'create-file',
  name: 'Create package.json',
  tool: 'file_system',
  params: { action: 'write', path: './package.json', content: '...' },
  // ... other properties
};

const context: ExecutionContext = {
  workingDirectory: process.cwd(),
  state: new Map(),
  history: []
};

const result = await executor.execute(step, context);
if (result.success) {
  console.log(`✅ ${step.name} completed`);
}
```

### ToolRegistry

Manages available agent tools and provides tool discovery.

```typescript
class ToolRegistry {
  register(tool: AgentTool): void
  getTool(name: string): AgentTool | undefined
  listTools(): AgentTool[]
  getToolNames(): string[]
  hasCapability(capability: string): boolean
}

interface AgentTool {
  name: string;
  description: string;
  execute(params: any, context: ExecutionContext): Promise<any>;
  validate(params: any): boolean;
}
```

**Example:**
```typescript
const registry = new ToolRegistry();

// Register built-in tools
registry.register(new FileSystemTool());
registry.register(new ShellTool());
registry.register(new GitHubCopilotTool());

// List available tools
console.log('Available tools:', registry.getToolNames());
// Output: ['file_system', 'shell', 'github_copilot']

// Get specific tool
const fileTool = registry.getTool('file_system');
if (fileTool) {
  const result = await fileTool.execute({
    action: 'write',
    path: './test.txt',
    content: 'Hello World'
  }, context);
}
```

## Agent Tools

### FileSystemTool

Safe file system operations with security validation.

```typescript
interface FileSystemParams {
  action: 'read' | 'write' | 'create_dir' | 'delete' | 'list' | 'exists';
  path: string;
  content?: string;
  encoding?: string;
}

// Examples
await fileTool.execute({
  action: 'write',
  path: './src/index.ts',
  content: 'console.log("Hello TypeScript");'
}, context);

await fileTool.execute({
  action: 'create_dir',
  path: './src/components'
}, context);

const fileContent = await fileTool.execute({
  action: 'read',
  path: './package.json'
}, context);
```

**Security Features:**
- Blocked paths: `/root`, `/etc`, `/usr/bin`, `/System`, `C:\\Windows`
- Path traversal protection
- File size limits (configurable)
- Permission validation

### ShellTool

Secure command execution with comprehensive safety measures.

```typescript
interface ShellParams {
  command: string;
  workingDirectory?: string;
  timeout?: number;
  env?: Record<string, string>;
}

// Examples
await shellTool.execute({
  command: 'npm install express'
}, context);

await shellTool.execute({
  command: 'git init',
  workingDirectory: './my-project'
}, context);

// With custom environment
await shellTool.execute({
  command: 'node build.js',
  env: { NODE_ENV: 'production' }
}, context);
```

**Safety Features:**
- Blocked commands: `rm -rf /`, `sudo`, `chmod 777`, `curl | sh`
- Output size limits (1MB default)
- Execution timeouts (30s default)
- Working directory validation

### GitHubCopilotTool

Integration with GitHub Copilot CLI for code assistance.

```typescript
interface CopilotParams {
  action: 'suggest' | 'explain' | 'generate';
  prompt: string;
  language?: string;
  context?: string;
}

// Examples
await copilotTool.execute({
  action: 'generate',
  prompt: 'Create a REST API endpoint for user authentication',
  language: 'typescript'
}, context);

await copilotTool.execute({
  action: 'explain',
  prompt: 'Explain this complex algorithm',
  context: codeSnippet
}, context);
```

### PRDGeneratorTool

Generate Product Requirement Documents and specifications.

```typescript
interface PRDParams {
  action: 'create' | 'analyze' | 'refine';
  description: string;
  complexity?: 'simple' | 'moderate' | 'complex';
  format?: 'markdown' | 'json' | 'html';
}

// Example
await prdTool.execute({
  action: 'create',
  description: 'A social media dashboard with real-time analytics',
  complexity: 'moderate',
  format: 'markdown'
}, context);
```

## Workflow Schema

### Complete Workflow Example

```json
{
  "goal": "Create a Node.js REST API with database",
  "steps": [
    {
      "id": "step_1",
      "name": "Create project directory",
      "description": "Initialize project structure",
      "tool": "file_system",
      "params": {
        "action": "create_dir",
        "path": "./my-api"
      },
      "estimatedDuration": 5,
      "dependencies": []
    },
    {
      "id": "step_2", 
      "name": "Initialize package.json",
      "description": "Create package.json with dependencies",
      "tool": "shell",
      "params": {
        "command": "npm init -y && npm install express mongoose"
      },
      "estimatedDuration": 30,
      "dependencies": ["step_1"]
    },
    {
      "id": "step_3",
      "name": "Generate API code",
      "description": "Create Express server with MongoDB integration",
      "tool": "github_copilot",
      "params": {
        "action": "generate",
        "prompt": "Express server with MongoDB user model and CRUD endpoints",
        "language": "javascript"
      },
      "estimatedDuration": 45,
      "dependencies": ["step_2"]
    }
  ],
  "estimatedDuration": 80,
  "totalSteps": 3
}
```

### Step Dependencies

Steps can depend on other steps:

```typescript
// Sequential execution
{
  "id": "step_2",
  "dependencies": ["step_1"]  // Waits for step_1 to complete
}

// Parallel execution  
{
  "id": "step_3",
  "dependencies": []  // Can run immediately
}

// Multiple dependencies
{
  "id": "step_4", 
  "dependencies": ["step_2", "step_3"]  // Waits for both to complete
}
```

## Error Handling

### Retry Logic

Tasks automatically retry with exponential backoff:

```typescript
interface RetryPolicy {
  maxRetries: number;        // Default: 3
  backoffMs: number;        // Default: 1000ms
  exponentialBackoff: boolean;  // Default: true
}

// Retry sequence: 1s, 2s, 4s, then fail
```

### Error Types

```typescript
enum ErrorType {
  VALIDATION_ERROR = 'validation_error',
  EXECUTION_ERROR = 'execution_error', 
  TIMEOUT_ERROR = 'timeout_error',
  DEPENDENCY_ERROR = 'dependency_error',
  TOOL_NOT_FOUND = 'tool_not_found'
}

interface TaskError {
  type: ErrorType;
  message: string;
  stepId: string;
  tool: string;
  retryable: boolean;
}
```

### Error Handling Strategies

```typescript
// Configure error handling per orchestrator
const orchestrator = new WorkflowOrchestrator(llmRouter, stateManager, {
  onStepFailure: 'continue',  // 'continue' | 'retry' | 'abort'
  maxRetries: 4,
  retryBackoff: 2000
});

// Handle errors in results
if (!result.success) {
  console.error(`Workflow failed: ${result.error}`);
  
  if (result.results) {
    const failedSteps = result.results.filter(r => !r.success);
    failedSteps.forEach(step => {
      console.error(`Step ${step.stepId} failed: ${step.error}`);
    });
  }
}
```

## Custom Tool Development

### Creating a Custom Tool

```typescript
export class DatabaseTool implements AgentTool {
  name = 'database';
  description = 'Database operations and schema management';

  async execute(params: DatabaseParams, context: ExecutionContext): Promise<any> {
    // Validate parameters
    if (!this.validate(params)) {
      throw new Error('Invalid database parameters');
    }

    const { action, connection, query } = params;

    try {
      switch (action) {
        case 'migrate':
          return await this.runMigrations(connection);
          
        case 'query':
          return await this.executeQuery(query, connection);
          
        case 'backup':
          return await this.createBackup(connection);
          
        default:
          throw new Error(`Unknown database action: ${action}`);
      }
    } catch (error) {
      // Log error with context
      console.error(`Database tool error:`, error);
      throw error;
    }
  }

  validate(params: any): boolean {
    if (!params || typeof params !== 'object') return false;
    if (!params.action || typeof params.action !== 'string') return false;
    if (!params.connection) return false;
    
    return true;
  }

  private async runMigrations(connection: string): Promise<any> {
    // Implementation
  }

  private async executeQuery(query: string, connection: string): Promise<any> {
    // Implementation
  }

  private async createBackup(connection: string): Promise<any> {
    // Implementation  
  }
}

// Register the tool
const registry = new ToolRegistry();
registry.register(new DatabaseTool());
```

### Tool Best Practices

1. **Validation**: Always validate parameters thoroughly
2. **Error Handling**: Provide clear, actionable error messages  
3. **Security**: Validate and sanitize all inputs
4. **Logging**: Include detailed logging for debugging
5. **Documentation**: Document parameters and return values
6. **Testing**: Write comprehensive unit tests

```typescript
// Example validation patterns
validate(params: any): boolean {
  // Type checking
  if (!params || typeof params !== 'object') {
    return false;
  }

  // Required fields
  const required = ['action', 'target'];
  for (const field of required) {
    if (!(field in params)) {
      return false;
    }
  }

  // Value validation
  const validActions = ['create', 'update', 'delete'];
  if (!validActions.includes(params.action)) {
    return false;
  }

  return true;
}
```

## Configuration

### Environment Variables

```bash
# LLM Configuration
ANTHROPIC_API_KEY=your_claude_key
OPENAI_API_KEY=your_openai_key

# Agent Configuration
SPARK_MAX_STEPS=20
SPARK_TIMEOUT=300000
SPARK_RETRY_ATTEMPTS=3
SPARK_LOG_LEVEL=info

# Tool Configuration
SPARK_FILE_MAX_SIZE=10485760  # 10MB
SPARK_SHELL_TIMEOUT=30000    # 30 seconds
SPARK_COPILOT_MODEL=gpt-4
```

### Programmatic Configuration

```typescript
// Configure orchestrator
const config: OrchestratorOptions = {
  requireApproval: false,
  autoRetry: true, 
  maxSteps: 25,
  timeout: 600000,  // 10 minutes
  onStepFailure: 'retry'
};

const orchestrator = new WorkflowOrchestrator(llmRouter, stateManager, config);

// Configure tools
const fileSystemConfig = {
  maxFileSize: 50 * 1024 * 1024,  // 50MB
  allowedExtensions: ['.js', '.ts', '.json', '.md', '.txt'],
  blockedPaths: ['/sensitive', '/private']
};

const fileTool = new FileSystemTool(fileSystemConfig);
```

---

This API documentation provides a comprehensive reference for developers working with the Spark agent system. For more examples and tutorials, see the main [README](./README.md) and [examples directory](./examples/).
