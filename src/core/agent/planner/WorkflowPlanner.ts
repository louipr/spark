// src/core/agent/planner/WorkflowPlanner.ts
import { LLMRouter } from '../../llm/LLMRouter.js';
import { LLMMessage, LLMConfig, ModelType, TaskType } from '../../../models/index.js';

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

export interface ExecutionContext {
  workingDirectory: string;
  environment: Map<string, string>;
  state: Map<string, any>;
  history: ExecutionHistory[];
  timeout?: number; // Optional timeout in milliseconds
}

export interface ExecutionHistory {
  stepId: string;
  timestamp: Date;
  result: any;
  duration: number;
}

export class WorkflowPlanner {
  constructor(private llmRouter: LLMRouter) {}

  async createPlan(goal: string): Promise<WorkflowPlan> {
    try {
      // Check if we have proper LLM providers available (not just GitHub Copilot)
      const hasProperLLM = await this.hasStructuredLLMAvailable();
      
      if (!hasProperLLM) {
        // Use simplified planning for GitHub Copilot only scenarios
        return this.createSimplifiedPlan(goal);
      }

      // 1. Use LLM to decompose goal into steps
      const decompositionPrompt = this.buildDecompositionPrompt(goal);
      const response = await this.llmRouter.route([{
        role: 'user',
        content: decompositionPrompt
      }], TaskType.CODE_GENERATION, { type: 'fallback' }, {
        model: ModelType.CLAUDE_3_5_SONNET,
        temperature: 0.1,
        maxTokens: 2000
      });
      
      // 2. Parse response into workflow steps
      const steps = this.parseSteps(response.content);
      
      // 3. Identify dependencies
      const stepsWithDeps = this.identifyDependencies(steps);
      
      // 4. Return structured plan
      return {
        goal,
        steps: stepsWithDeps,
        estimatedDuration: this.estimateDuration(stepsWithDeps)
      };
    } catch (error) {
      console.warn('Complex planning failed, falling back to simplified plan:', error);
      return this.createSimplifiedPlan(goal);
    }
  }

  private buildDecompositionPrompt(goal: string): string {
    return `
Decompose this goal into executable steps for a coding agent:

Goal: ${goal}

Available tools:
- github_copilot: Get command suggestions and explanations
- file_system: Create/read/write files and directories
- shell: Execute shell commands
- prd_generator: Generate Product Requirements Document

Requirements:
1. Break down the goal into specific, actionable steps
2. Each step should use one of the available tools
3. Steps should be ordered logically with dependencies
4. Include all necessary setup, implementation, and testing steps

Output JSON array format:
[
  {
    "id": "step_1",
    "name": "Generate PRD for the application",
    "tool": "prd_generator",
    "params": {
      "request": "${goal}",
      "includeSpecs": true
    }
  },
  {
    "id": "step_2", 
    "name": "Create project directory structure",
    "tool": "file_system",
    "params": {
      "action": "create_dir",
      "path": "./project-name"
    }
  }
]

Respond with ONLY the JSON array, no other text.
    `;
  }

  private parseSteps(response: string): WorkflowStep[] {
    try {
      // Clean the response - remove any markdown formatting
      const cleanResponse = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      const parsed = JSON.parse(cleanResponse);
      
      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }
      
      return parsed.map((step: any, index: number) => ({
        id: step.id || `step_${index + 1}`,
        name: step.name || `Step ${index + 1}`,
        tool: step.tool || 'unknown',
        params: step.params || {},
        dependencies: step.dependencies || []
      }));
    } catch (error) {
      console.error('Failed to parse workflow steps:', error);
      console.error('Raw response:', response);
      
      // Fallback to a basic plan
      return this.createFallbackPlan();
    }
  }

  private createFallbackPlan(): WorkflowStep[] {
    return [
      {
        id: 'step_1',
        name: 'Generate basic PRD',
        tool: 'prd_generator',
        params: { request: 'Create a basic application', includeSpecs: true },
        dependencies: []
      },
      {
        id: 'step_2',
        name: 'Create project structure',
        tool: 'file_system',
        params: { action: 'create_dir', path: './new-project' },
        dependencies: ['step_1']
      }
    ];
  }

  private identifyDependencies(steps: WorkflowStep[]): WorkflowStep[] {
    // Simple dependency detection based on tool usage patterns
    return steps.map((step, index) => {
      const dependencies: string[] = [...step.dependencies];
      
      // Add implicit dependencies based on common patterns
      if (step.tool === 'shell' && index > 0) {
        // Shell commands often depend on file system setup
        const prevFileSystemStep = steps
          .slice(0, index)
          .reverse()
          .find(s => s.tool === 'file_system');
        if (prevFileSystemStep && !dependencies.includes(prevFileSystemStep.id)) {
          dependencies.push(prevFileSystemStep.id);
        }
      }
      
      if (step.tool === 'file_system' && step.params.action === 'write') {
        // Writing files depends on directory creation
        const dirCreationStep = steps
          .slice(0, index)
          .reverse()
          .find(s => s.tool === 'file_system' && s.params.action === 'create_dir');
        if (dirCreationStep && !dependencies.includes(dirCreationStep.id)) {
          dependencies.push(dirCreationStep.id);
        }
      }
      
      return { ...step, dependencies };
    });
  }

  private estimateDuration(steps: WorkflowStep[]): number {
    // Estimate duration based on tool complexity (in minutes)
    const toolDurations = {
      'prd_generator': 2,
      'file_system': 0.5,
      'shell': 1,
      'github_copilot': 1
    };
    
    return steps.reduce((total, step) => {
      const baseDuration = toolDurations[step.tool as keyof typeof toolDurations] || 1;
      // Add complexity factor based on params
      const complexity = Object.keys(step.params).length;
      return total + baseDuration + (complexity * 0.2);
    }, 0);
  }

  async validatePlan(plan: WorkflowPlan): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    // Check for circular dependencies
    const hasCycles = this.detectCycles(plan.steps);
    if (hasCycles) {
      issues.push('Circular dependencies detected in workflow steps');
    }
    
    // Check for missing dependencies
    const stepIds = new Set(plan.steps.map(s => s.id));
    for (const step of plan.steps) {
      for (const depId of step.dependencies) {
        if (!stepIds.has(depId)) {
          issues.push(`Step ${step.id} depends on missing step ${depId}`);
        }
      }
    }
    
    // Check for valid tools
    const validTools = ['github_copilot', 'file_system', 'shell', 'prd_generator'];
    for (const step of plan.steps) {
      if (!validTools.includes(step.tool)) {
        issues.push(`Step ${step.id} uses invalid tool: ${step.tool}`);
      }
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }

  private detectCycles(steps: WorkflowStep[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const hasCycleDFS = (stepId: string): boolean => {
      if (recursionStack.has(stepId)) return true;
      if (visited.has(stepId)) return false;
      
      visited.add(stepId);
      recursionStack.add(stepId);
      
      const step = steps.find(s => s.id === stepId);
      if (step) {
        for (const depId of step.dependencies) {
          if (hasCycleDFS(depId)) return true;
        }
      }
      
      recursionStack.delete(stepId);
      return false;
    };
    
    for (const step of steps) {
      if (hasCycleDFS(step.id)) return true;
    }
    
    return false;
  }

  getExecutionOrder(steps: WorkflowStep[]): WorkflowStep[] {
    const result: WorkflowStep[] = [];
    const visited = new Set<string>();
    const stepMap = new Map(steps.map(s => [s.id, s]));
    
    const visit = (stepId: string) => {
      if (visited.has(stepId)) return;
      
      const step = stepMap.get(stepId);
      if (!step) return;
      
      // Visit dependencies first
      for (const depId of step.dependencies) {
        visit(depId);
      }
      
      visited.add(stepId);
      result.push(step);
    };
    
    // Visit all steps
    for (const step of steps) {
      visit(step.id);
    }
    
    return result;
  }
}
