// src/core/agent/executor/TaskExecutor.ts
import { ToolRegistry } from '../tools/ToolRegistry.js';
import { WorkflowStep, ExecutionContext } from '../planner/WorkflowPlanner.js';

export interface TaskResult {
  stepId: string;
  tool: string;
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
  timestamp: Date;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  exponentialBackoff: boolean;
}

export class TaskExecutor {
  constructor(private toolRegistry: ToolRegistry) {}

  async execute(step: WorkflowStep, context: ExecutionContext): Promise<TaskResult> {
    const startTime = Date.now();
    const timestamp = new Date();

    // 1. Get tool
    const tool = this.toolRegistry.getTool(step.tool);
    if (!tool) {
      return {
        stepId: step.id,
        tool: step.tool,
        success: false,
        error: `Tool not found: ${step.tool}`,
        duration: Date.now() - startTime,
        timestamp
      };
    }

    // 2. Validate params
    if (!tool.validate(step.params)) {
      return {
        stepId: step.id,
        tool: step.tool,
        success: false,
        error: `Invalid params for tool: ${step.tool}`,
        duration: Date.now() - startTime,
        timestamp
      };
    }

    // 3. Execute with retry logic
    const retryPolicy: RetryPolicy = {
      maxRetries: 3,
      backoffMs: 1000,
      exponentialBackoff: true
    };

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retryPolicy.maxRetries; attempt++) {
      try {
        console.log(`Executing step: ${step.name} (attempt ${attempt + 1}/${retryPolicy.maxRetries + 1})`);
        
        // Add timeout handling
        const timeoutMs = context.timeout || 30000; // Default 30 seconds
        let timeoutHandle: NodeJS.Timeout | undefined;
        const result = await Promise.race([
          tool.execute(step.params, context),
          new Promise<never>((_, reject) => {
            timeoutHandle = setTimeout(() => reject(new Error(`Task timeout after ${timeoutMs}ms`)), timeoutMs);
          })
        ]);
        
        // Clear timeout to prevent memory leaks
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        
        // Update execution history
        context.history.push({
          stepId: step.id,
          timestamp: new Date(),
          result,
          duration: Date.now() - startTime
        });

        return {
          stepId: step.id,
          tool: step.tool,
          success: true,
          result,
          duration: Date.now() - startTime,
          timestamp
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`Step ${step.id} failed (attempt ${attempt + 1}):`, lastError.message);
        
        // Don't retry on the last attempt
        if (attempt < retryPolicy.maxRetries) {
          const delayMs = retryPolicy.exponentialBackoff 
            ? retryPolicy.backoffMs * Math.pow(2, attempt)
            : retryPolicy.backoffMs;
          
          console.log(`Retrying in ${delayMs}ms...`);
          await this.delay(delayMs);
        }
      }
    }

    // All retries failed
    return {
      stepId: step.id,
      tool: step.tool,
      success: false,
      error: lastError?.message || 'Unknown error',
      duration: Date.now() - startTime,
      timestamp
    };
  }

  async executeParallel(steps: WorkflowStep[], context: ExecutionContext): Promise<TaskResult[]> {
    console.log(`Executing ${steps.length} steps in parallel`);
    
    const promises = steps.map(step => this.execute(step, context));
    const results = await Promise.allSettled(promises);
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          stepId: steps[index].id,
          tool: steps[index].tool,
          success: false,
          error: result.reason?.message || 'Parallel execution failed',
          duration: 0,
          timestamp: new Date()
        };
      }
    });
  }

  async canExecute(step: WorkflowStep): Promise<boolean> {
    const tool = this.toolRegistry.getTool(step.tool);
    if (!tool) {
      return false;
    }
    
    return tool.validate(step.params);
  }

  async validateResult(result: TaskResult): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    if (!result.success && !result.error) {
      issues.push('Failed result must have an error message');
    }
    
    if (result.success && result.error) {
      issues.push('Successful result should not have an error message');
    }
    
    if (result.duration < 0) {
      issues.push('Duration cannot be negative');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Helper method to check dependencies
  checkDependencies(step: WorkflowStep, completedSteps: Set<string>): boolean {
    return step.dependencies.every(depId => completedSteps.has(depId));
  }

  // Get steps that can be executed given completed steps
  getExecutableSteps(allSteps: WorkflowStep[], completedSteps: Set<string>): WorkflowStep[] {
    return allSteps.filter(step => 
      !completedSteps.has(step.id) && 
      this.checkDependencies(step, completedSteps)
    );
  }
}
