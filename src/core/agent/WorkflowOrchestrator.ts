// src/core/agent/WorkflowOrchestrator.ts
import { WorkflowPlanner, WorkflowPlan, WorkflowStep, ExecutionContext } from './planner/WorkflowPlanner.js';
import { TaskExecutor, TaskResult } from './executor/TaskExecutor.js';
import { ToolRegistry } from './tools/ToolRegistry.js';
import { GitHubCopilotTool } from './tools/GitHubCopilotTool.js';
import { PRDGeneratorTool } from './tools/PRDGeneratorTool.js';
import { ShellTool } from './tools/ShellTool.js';
import { FileSystemTool } from './tools/FileSystemTool.js';
import { LLMRouter } from '../llm/LLMRouter.js';
import { StateManager } from '../orchestrator/StateManager.js';

export interface OrchestratorDependencies {
  llmRouter: LLMRouter;
  stateManager: StateManager;
}

export interface OutputResult {
  success: boolean;
  message?: string;
  plan?: WorkflowPlan;
  results?: TaskResult[];
  artifacts?: any[];
  duration?: number;
  timestamp?: Date;
}

export interface OrchestratorConfig {
  requireApproval: boolean;
  allowParallelExecution: boolean;
  maxExecutionTime: number; // in minutes
  autoRetry: boolean;
}

export class WorkflowOrchestrator {
  private planner: WorkflowPlanner;
  private executor: TaskExecutor;
  private toolRegistry: ToolRegistry;
  private stateManager: StateManager;
  private config: OrchestratorConfig;

  constructor(dependencies: OrchestratorDependencies, config: Partial<OrchestratorConfig> = {}) {
    this.planner = new WorkflowPlanner(dependencies.llmRouter);
    this.toolRegistry = new ToolRegistry();
    this.executor = new TaskExecutor(this.toolRegistry);
    this.stateManager = dependencies.stateManager;
    
    this.config = {
      requireApproval: config.requireApproval ?? true,
      allowParallelExecution: config.allowParallelExecution ?? false,
      maxExecutionTime: config.maxExecutionTime ?? 30, // 30 minutes default
      autoRetry: config.autoRetry ?? true
    };
    
    // Register all tools
    this.registerTools();
  }

  private registerTools(): void {
    console.log('Registering agent tools...');
    this.toolRegistry.register(new GitHubCopilotTool());
    this.toolRegistry.register(new PRDGeneratorTool());
    this.toolRegistry.register(new ShellTool());
    this.toolRegistry.register(new FileSystemTool());
    console.log(`Registered ${this.toolRegistry.listTools().length} tools`);
  }

  async processRequest(input: string): Promise<OutputResult> {
    const startTime = Date.now();
    const timestamp = new Date();
    
    try {
      console.log(`\n🚀 Processing request: "${input}"`);
      
      // 1. Create execution plan
      console.log('\n📋 Creating workflow plan...');
      const plan = await this.planner.createPlan(input);
      
      // Validate the plan
      const validation = await this.planner.validatePlan(plan);
      if (!validation.isValid) {
        return {
          success: false,
          message: `Invalid workflow plan: ${validation.issues.join(', ')}`,
          timestamp
        };
      }
      
      console.log(`✅ Plan created with ${plan.steps.length} steps`);
      console.log(`⏱️  Estimated duration: ${plan.estimatedDuration} minutes`);
      
      // 2. Show plan to user for approval
      this.displayPlan(plan);
      
      // 3. Get user approval (can be made optional)
      if (this.config.requireApproval) {
        const approved = await this.getUserApproval();
        if (!approved) {
          return {
            success: false,
            message: 'User cancelled execution',
            plan,
            timestamp
          };
        }
      }
      
      // 4. Execute plan step by step
      console.log('\n🔧 Starting execution...');
      const results = await this.executePlan(plan);
      
      // 5. Collect artifacts and return comprehensive result
      const artifacts = this.collectArtifacts(results);
      const duration = (Date.now() - startTime) / 1000; // in seconds
      
      const overallSuccess = results.every(r => r.success);
      
      console.log(`\n${overallSuccess ? '✅' : '❌'} Execution ${overallSuccess ? 'completed' : 'failed'} in ${duration.toFixed(2)}s`);
      
      return {
        success: overallSuccess,
        message: overallSuccess 
          ? `Successfully executed ${results.length} steps` 
          : `Execution failed - ${results.filter(r => !r.success).length} of ${results.length} steps failed`,
        plan,
        results,
        artifacts,
        duration,
        timestamp
      };
      
    } catch (error) {
      console.error('❌ Orchestrator error:', error);
      return {
        success: false,
        message: `Orchestration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp
      };
    }
  }

  private displayPlan(plan: WorkflowPlan): void {
    console.log('\n📋 Execution Plan:');
    console.log(`Goal: ${plan.goal}`);
    console.log(`Steps: ${plan.steps.length}`);
    console.log(`Estimated Duration: ${plan.estimatedDuration} minutes\n`);
    
    const executionOrder = this.planner.getExecutionOrder(plan.steps);
    executionOrder.forEach((step, index) => {
      const dependencies = step.dependencies.length > 0 
        ? ` (depends on: ${step.dependencies.join(', ')})` 
        : '';
      console.log(`  ${index + 1}. ${step.name} (using ${step.tool})${dependencies}`);
    });
    console.log('');
  }

  private async executePlan(plan: WorkflowPlan): Promise<TaskResult[]> {
    const results: TaskResult[] = [];
    const context = this.createExecutionContext();
    const completedSteps = new Set<string>();
    const executionOrder = this.planner.getExecutionOrder(plan.steps);
    
    // Save initial plan state
    const sessionId = context.state.get('sessionId') as string;
    // We'll use existing state management functionality
    
    for (const step of executionOrder) {
      console.log(`\n🔧 Executing: ${step.name}`);
      
      try {
        // Check if dependencies are satisfied
        if (!this.executor.checkDependencies(step, completedSteps)) {
          throw new Error(`Dependencies not satisfied for step: ${step.id}`);
        }
        
        const result = await this.executor.execute(step, context);
        results.push(result);
        
        if (result.success) {
          console.log(`✅ Step "${step.name}" completed successfully`);
          completedSteps.add(step.id);
          
          // Update context with result
          context.state.set(step.id, result);
        } else {
          console.error(`❌ Step "${step.name}" failed: ${result.error}`);
          
          // Handle step failure
          const action = await this.handleStepFailure(step, result);
          if (action === 'abort') {
            console.log('⏹️  Execution aborted by user');
            break;
          } else if (action === 'skip') {
            console.log('⏭️  Skipping failed step');
            completedSteps.add(step.id); // Mark as completed to continue
          }
          // 'continue' means we don't mark as completed but continue anyway
        }
        
        // Save progress after each step
        // Progress is tracked in the context.history
        
      } catch (error) {
        console.error(`💥 Unexpected error in step "${step.name}":`, error);
        
        const failureResult: TaskResult = {
          stepId: step.id,
          tool: step.tool,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: 0,
          timestamp: new Date()
        };
        
        results.push(failureResult);
        
        const action = await this.handleStepFailure(step, failureResult);
        if (action === 'abort') break;
      }
    }
    
    return results;
  }

  private createExecutionContext(): ExecutionContext {
    return {
      workingDirectory: process.cwd(),
      environment: new Map([
        ['NODE_ENV', process.env.NODE_ENV || 'development'],
        ['PATH', process.env.PATH || '']
      ]),
      state: new Map([
        ['sessionId', `session_${Date.now()}`],
        ['startTime', new Date().toISOString()]
      ]),
      history: []
    };
  }

  private async getUserApproval(): Promise<boolean> {
    // In a real implementation, this would show an interactive prompt
    // For now, we'll auto-approve for testing but log the approval request
    console.log('⚠️  Plan approval required (auto-approving for demo)');
    console.log('   In production, user would review and approve/reject the plan');
    
    // TODO: Implement actual user input mechanism
    // This could use readline, a CLI library like inquirer, or a web interface
    return true;
  }

  private async handleStepFailure(step: WorkflowStep, result: TaskResult): Promise<'continue' | 'retry' | 'skip' | 'abort'> {
    console.error(`\n❌ Step "${step.name}" failed:`);
    console.error(`   Error: ${result.error}`);
    console.error(`   Tool: ${step.tool}`);
    
    // In a real implementation, this would prompt the user
    // For now, we'll implement a simple retry logic based on error type
    
    if (this.config.autoRetry && this.isRetryableError(result.error || '')) {
      console.log('🔄 Error appears retryable, but max retries already attempted');
    }
    
    // Auto-decision based on error type for demo purposes
    if (step.tool === 'shell' && result.error?.includes('command not found')) {
      console.log('⏭️  Skipping step with missing command');
      return 'skip';
    }
    
    if (step.tool === 'file_system' && result.error?.includes('permission denied')) {
      console.log('⏹️  Aborting due to permission error');
      return 'abort';
    }
    
    // Default: continue with next step
    console.log('➡️  Continuing to next step');
    return 'continue';
  }

  private isRetryableError(error: string): boolean {
    const retryableErrors = [
      'timeout',
      'network',
      'temporary',
      'rate limit',
      'busy'
    ];
    
    return retryableErrors.some(retryable => 
      error.toLowerCase().includes(retryable)
    );
  }

  private collectArtifacts(results: TaskResult[]): any[] {
    const artifacts: any[] = [];
    
    for (const result of results) {
      if (result.success && result.result?.artifact) {
        artifacts.push(result.result.artifact);
      }
      
      // Collect file system artifacts
      if (result.success && result.result?.type === 'file_created') {
        artifacts.push({
          type: 'file',
          name: result.result.path,
          path: result.result.path
        });
      }
      
      // Collect PRD artifacts
      if (result.success && result.result?.type === 'prd') {
        artifacts.push({
          type: 'document',
          name: 'Product Requirements Document',
          content: result.result.prd
        });
      }
    }
    
    return artifacts;
  }

  // Public method to get available tools
  getAvailableTools(): string[] {
    return this.toolRegistry.getToolNames();
  }

  // Public method to validate a plan without executing
  async validatePlan(goal: string): Promise<{ isValid: boolean; issues: string[]; plan?: WorkflowPlan }> {
    try {
      const plan = await this.planner.createPlan(goal);
      const validation = await this.planner.validatePlan(plan);
      
      return {
        isValid: validation.isValid,
        issues: validation.issues,
        plan: validation.isValid ? plan : undefined
      };
    } catch (error) {
      return {
        isValid: false,
        issues: [`Failed to create plan: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  // Public method to get execution status
  getExecutionStatus(): { isExecuting: boolean; currentStep?: string } {
    // This would be enhanced to track real-time execution status
    return { isExecuting: false };
  }
}
