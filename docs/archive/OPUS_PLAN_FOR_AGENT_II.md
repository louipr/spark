🚨 CRITICAL IMPLEMENTATION PLAN FOR SPARK CLONE
Executive Summary
The current implementation has built solid infrastructure but completely missed the core agent architecture. What exists are LLM wrappers incorrectly named "agents" and a workflow orchestrator that doesn't orchestrate workflows. This document provides the exact implementation plan to fix these issues.

🔴 Critical Architectural Misalignment
What Was Specified (Line 71+ of OPUS_PLAN_FOR_AGENT.md)

class WorkflowOrchestrator {
  async processRequest(input: string): Promise<OutputResult> {
    // Should coordinate multi-step workflows
    // Should decompose tasks
    // Should execute plans
    // Should manage tool orchestration
  }
}

What Was Actually Built
// These are NOT orchestrators, just state managers:
StateManager.ts       // Only manages session state
IterationManager.ts   // Only refines PRDs
ValidationEngine.ts   // Only validates

// These are NOT agents, just API wrappers:
ClaudeAgent.ts       // Just wraps Anthropic API
GPTAgent.ts          // Just wraps OpenAI API
AgentRouter.ts       // Just selects provider

📋 IMPLEMENTATION TASKS
PHASE 1: Critical Fixes (Day 1 Morning)
Task 1.1: Rename Misnamed Components (30 min)

# These are NOT agents - rename them:
src/core/llm/ClaudeAgent.ts → src/core/llm/ClaudeProvider.ts
src/core/llm/GPTAgent.ts → src/core/llm/GPTProvider.ts
src/core/llm/AgentRouter.ts → src/core/llm/LLMRouter.ts


Update all imports:
// Before:
import { ClaudeAgent } from './llm/ClaudeAgent';
// After:
import { ClaudeProvider } from './llm/ClaudeProvider';


Task 1.2: Clean Up Dead Code (15 min)

# Remove deprecated files:
rm src/core/llm/EnhancedAgentRouter.ts
rm MCP_ARCHITECTURE.md
rm -rf test/copilot-experiment/

PHASE 2: Build True Agent System (Day 1-2)
Task 2.1: Create Agent Directory Structure
mkdir -p src/core/agent
mkdir -p src/core/agent/tools
mkdir -p src/core/agent/planner
mkdir -p src/core/agent/executor


Task 2.2: Implement WorkflowPlanner (2 hours)

// src/core/agent/planner/WorkflowPlanner.ts
import { LLMRouter } from '../../llm/LLMRouter';

export interface WorkflowStep {
  id: string;
  name: string;
  tool: string;
  params: Record<string, any>;
  dependencies: string[];
}

export interface WorkflowPlan {
  goal: string;
  steps: WorkflowStep[];
  estimatedDuration: number;
}

export class WorkflowPlanner {
  constructor(private llmRouter: LLMRouter) {}

  async createPlan(goal: string): Promise<WorkflowPlan> {
    // 1. Use LLM to decompose goal into steps
    const decompositionPrompt = this.buildDecompositionPrompt(goal);
    const response = await this.llmRouter.generate(decompositionPrompt);
    
    // 2. Parse response into workflow steps
    const steps = this.parseSteps(response);
    
    // 3. Identify dependencies
    const stepsWithDeps = this.identifyDependencies(steps);
    
    // 4. Return structured plan
    return {
      goal,
      steps: stepsWithDeps,
      estimatedDuration: this.estimateDuration(stepsWithDeps)
    };
  }

  private buildDecompositionPrompt(goal: string): string {
    return `
      Decompose this goal into executable steps:
      Goal: ${goal}
      
      Available tools:
      - github_copilot: Get command suggestions
      - file_system: Create/read/write files
      - shell: Execute commands
      - prd_generator: Generate PRD
      
      Output JSON array of steps with tool and params.
    `;
  }
}


Task 2.3: Implement ToolRegistry (1 hour)

// src/core/agent/tools/ToolRegistry.ts
export interface AgentTool {
  name: string;
  description: string;
  execute(params: any, context: ExecutionContext): Promise<any>;
  validate(params: any): boolean;
}

export class ToolRegistry {
  private tools = new Map<string, AgentTool>();

  register(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  listTools(): AgentTool[] {
    return Array.from(this.tools.values());
  }
}

Task 2.4: Wrap Existing Functionality as Tools (2 hours)

// src/core/agent/tools/GitHubCopilotTool.ts
import { GitHubCopilotCLI } from '../../../integrations/GitHubCopilotCLI';

export class GitHubCopilotTool implements AgentTool {
  name = 'github_copilot';
  description = 'Get command suggestions and explanations';
  private cli = new GitHubCopilotCLI();

  async execute(params: { action: string; prompt: string }) {
    if (params.action === 'suggest') {
      return await this.cli.suggest(params.prompt);
    } else if (params.action === 'explain') {
      return await this.cli.explain(params.prompt);
    }
  }

  validate(params: any): boolean {
    return params.action && params.prompt;
  }
}

// src/core/agent/tools/PRDGeneratorTool.ts
import { PRDGenerator } from '../../generator/PRDGenerator';

export class PRDGeneratorTool implements AgentTool {
  name = 'prd_generator';
  description = 'Generate Product Requirements Document';
  private generator = new PRDGenerator();

  async execute(params: { request: string; analysis: any }) {
    return await this.generator.generate(params.request, params.analysis);
  }

  validate(params: any): boolean {
    return params.request && params.analysis;
  }
}

// src/core/agent/tools/ShellTool.ts
import { exec } from 'child_process';
import { promisify } from 'util';

export class ShellTool implements AgentTool {
  name = 'shell';
  description = 'Execute shell commands';
  private execAsync = promisify(exec);

  async execute(params: { command: string; cwd?: string }) {
    const result = await this.execAsync(params.command, {
      cwd: params.cwd || process.cwd()
    });
    return {
      stdout: result.stdout,
      stderr: result.stderr
    };
  }

  validate(params: any): boolean {
    return params.command && typeof params.command === 'string';
  }
}

// src/core/agent/tools/FileSystemTool.ts
import * as fs from 'fs/promises';
import * as path from 'path';

export class FileSystemTool implements AgentTool {
  name = 'file_system';
  description = 'File system operations';

  async execute(params: { action: string; path: string; content?: string }) {
    switch(params.action) {
      case 'write':
        await fs.writeFile(params.path, params.content || '');
        return { success: true, path: params.path };
      case 'read':
        const content = await fs.readFile(params.path, 'utf-8');
        return { content };
      case 'create_dir':
        await fs.mkdir(params.path, { recursive: true });
        return { success: true, path: params.path };
      default:
        throw new Error(`Unknown action: ${params.action}`);
    }
  }

  validate(params: any): boolean {
    return params.action && params.path;
  }
}



Task 2.5: Implement TaskExecutor (2 hours)
// src/core/agent/executor/TaskExecutor.ts
export class TaskExecutor {
  constructor(private toolRegistry: ToolRegistry) {}

  async execute(step: WorkflowStep, context: ExecutionContext): Promise<any> {
    // 1. Get tool
    const tool = this.toolRegistry.getTool(step.tool);
    if (!tool) {
      throw new Error(`Tool not found: ${step.tool}`);
    }

    // 2. Validate params
    if (!tool.validate(step.params)) {
      throw new Error(`Invalid params for tool: ${step.tool}`);
    }

    // 3. Execute with retry logic
    let retries = 3;
    while (retries > 0) {
      try {
        const result = await tool.execute(step.params, context);
        return {
          stepId: step.id,
          tool: step.tool,
          success: true,
          result
        };
      } catch (error) {
        retries--;
        if (retries === 0) throw error;
        await this.delay(1000);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

Task 2.6: Implement the TRUE WorkflowOrchestrator (3 hours)
// src/core/agent/WorkflowOrchestrator.ts
export class WorkflowOrchestrator {
  private planner: WorkflowPlanner;
  private executor: TaskExecutor;
  private toolRegistry: ToolRegistry;
  private stateManager: StateManager; // Use existing

  constructor(dependencies: OrchestratorDependencies) {
    this.planner = new WorkflowPlanner(dependencies.llmRouter);
    this.toolRegistry = new ToolRegistry();
    this.executor = new TaskExecutor(this.toolRegistry);
    this.stateManager = dependencies.stateManager;
    
    // Register all tools
    this.registerTools();
  }

  private registerTools(): void {
    this.toolRegistry.register(new GitHubCopilotTool());
    this.toolRegistry.register(new PRDGeneratorTool());
    this.toolRegistry.register(new ShellTool());
    this.toolRegistry.register(new FileSystemTool());
  }

  async processRequest(input: string): Promise<OutputResult> {
    // 1. Create execution plan
    const plan = await this.planner.createPlan(input);
    
    // 2. Show plan to user for approval
    console.log('Execution Plan:');
    plan.steps.forEach(step => {
      console.log(`  - ${step.name} (using ${step.tool})`);
    });
    
    // 3. Get user approval (can be made optional)
    const approved = await this.getUserApproval();
    if (!approved) {
      return { success: false, message: 'User cancelled' };
    }
    
    // 4. Execute plan step by step
    const results = [];
    const context = this.createExecutionContext();
    
    for (const step of plan.steps) {
      console.log(`Executing: ${step.name}`);
      try {
        const result = await this.executor.execute(step, context);
        results.push(result);
        
        // Update context with result
        context.state.set(step.id, result);
        
        // Save progress
        await this.stateManager.saveProgress(plan, results);
      } catch (error) {
        console.error(`Failed at step: ${step.name}`, error);
        // Allow user to retry or skip
        const action = await this.handleStepFailure(step, error);
        if (action === 'abort') break;
      }
    }
    
    // 5. Return comprehensive result
    return {
      success: true,
      plan,
      results,
      artifacts: this.collectArtifacts(results)
    };
  }

  private createExecutionContext(): ExecutionContext {
    return {
      workingDirectory: process.cwd(),
      environment: new Map(),
      state: new Map(),
      history: []
    };
  }

  private async getUserApproval(): Promise<boolean> {
    // Implementation depends on CLI library
    // For now, return true for testing
    return true;
  }

  private async handleStepFailure(step: WorkflowStep, error: any) {
    console.error(`Step ${step.name} failed:`, error.message);
    // In production, ask user what to do
    return 'continue'; // or 'retry' or 'abort'
  }

  private collectArtifacts(results: any[]): any[] {
    // Collect generated files, PRDs, etc.
    return results.filter(r => r.result?.artifact);
  }
}


PHASE 3: Integrate with Main Application (Day 2)
Task 3.1: Update Main Entry Point (1 hour)
// src/index.ts
import { WorkflowOrchestrator } from './core/agent/WorkflowOrchestrator';
import { LLMRouter } from './core/llm/LLMRouter'; // Renamed from AgentRouter

class SparkApplication {
  private orchestrator: WorkflowOrchestrator;

  constructor() {
    const llmRouter = new LLMRouter(/* config */);
    const stateManager = new StateManager();
    
    this.orchestrator = new WorkflowOrchestrator({
      llmRouter,
      stateManager
    });
  }

  async handleRequest(input: string): Promise<void> {
    const result = await this.orchestrator.processRequest(input);
    this.displayResult(result);
  }
}

Task 3.2: Add New CLI Commands (1 hour)
// src/cli/SparkCLI.ts
program
  .command('agent <request>')
  .description('Use agent to fulfill request')
  .option('--approve', 'Auto-approve execution plan')
  .action(async (request, options) => {
    const orchestrator = new WorkflowOrchestrator(/* deps */);
    const result = await orchestrator.processRequest(request);
    displayResult(result);
  });

program
  .command('plan <request>')
  .description('Show execution plan without running')
  .action(async (request) => {
    const planner = new WorkflowPlanner(/* deps */);
    const plan = await planner.createPlan(request);
    displayPlan(plan);
  });


  PHASE 4: Testing & Validation (Day 3)
Task 4.1: Create Integration Tests
// tests/integration/agent.test.ts
describe('WorkflowOrchestrator', () => {
  it('should create plan for simple request', async () => {
    const orchestrator = new WorkflowOrchestrator(/* mock deps */);
    const result = await orchestrator.processRequest('Create a todo app');
    expect(result.plan.steps).toHaveLength(greaterThan(3));
  });

  it('should execute tools in correct order', async () => {
    // Test dependency resolution
  });

  it('should handle tool failures gracefully', async () => {
    // Test retry and error handling
  });
});


🎯 Success Criteria
Renamed Components: No more "agents" that aren't agents
True Workflow Orchestration: Can decompose goals into multi-step plans
Tool Execution: Can execute plans using registered tools
GitHub Copilot Integration: Works as a tool within the agent system
User Approval Flow: Users can review and approve plans
Error Recovery: Graceful handling of step failures
⚠️ Common Pitfalls to Avoid
DON'T create another LLM wrapper and call it an agent
DON'T confuse workflow orchestration with state management
DON'T hardcode tool selection - use the registry pattern
DON'T execute all steps at once - go step by step with feedback
DON'T ignore user approval - this is critical for trust
📊 Current vs Target Architecture
Current (WRONG):
User Request → "Agent" (LLM Wrapper) → Single Response → Done


Target (CORRECT):
User Request → Planner → Multi-Step Plan → User Approval → 
Step 1 (Tool A) → Step 2 (Tool B) → Step 3 (Tool C) → 
Aggregate Results → Return Success


🚀 Quick Start Commands for Sonnet
# 1. Rename files
mv src/core/llm/ClaudeAgent.ts src/core/llm/ClaudeProvider.ts
mv src/core/llm/GPTAgent.ts src/core/llm/GPTProvider.ts
mv src/core/llm/AgentRouter.ts src/core/llm/LLMRouter.ts

# 2. Create agent directory
mkdir -p src/core/agent/tools src/core/agent/planner src/core/agent/executor

# 3. Start implementing (follow the code blocks above)

Final Note
The existing code is a good foundation - it just needs the ACTUAL agent layer on top. The LLM providers work, the PRD generator works, the GitHub Copilot CLI works. What's missing is the orchestration layer that makes it behave like an agent. Focus on building that, not fixing what already works.

