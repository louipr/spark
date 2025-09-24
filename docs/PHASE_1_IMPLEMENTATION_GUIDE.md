# Phase 1 Implementation Guide - Domain Layer Extraction

## 🎯 **Goal**
Extract pure business logic from the current tightly-coupled system into a clean domain layer with no infrastructure dependencies.

## 🏗️ **Step-by-Step Implementation**

### **Step 1: Create Domain Entities (Day 1)**

#### **1.1 Create Base Entity**
```typescript
// src/domain/entities/Entity.ts
export abstract class Entity<T> {
  protected constructor(protected readonly id: T) {}
  
  equals(other: Entity<T>): boolean {
    return this.id === other.id;
  }
}
```

#### **1.2 Create Workflow Entity**
```typescript
// src/domain/entities/Workflow.ts
export enum WorkflowStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export class Workflow extends Entity<string> {
  constructor(
    id: string,
    public readonly description: string,
    public readonly taskType: TaskType,
    public readonly steps: WorkflowStep[],
    public readonly status: WorkflowStatus = WorkflowStatus.PENDING,
    public readonly createdAt: Date = new Date()
  ) {
    super(id);
  }

  canExecute(): boolean {
    return this.status === WorkflowStatus.PENDING;
  }

  start(): Workflow {
    if (!this.canExecute()) {
      throw new Error(`Cannot start workflow in status: ${this.status}`);
    }
    
    return new Workflow(
      this.id,
      this.description,
      this.taskType,
      this.steps,
      WorkflowStatus.RUNNING,
      this.createdAt
    );
  }

  complete(): Workflow {
    return new Workflow(
      this.id,
      this.description,
      this.taskType,
      this.steps,
      WorkflowStatus.COMPLETED,
      this.createdAt
    );
  }

  fail(error: string): Workflow {
    return new Workflow(
      this.id,
      this.description,
      this.taskType,
      this.steps,
      WorkflowStatus.FAILED,
      this.createdAt
    );
  }
}
```

#### **1.3 Create LLM Request Entity**
```typescript
// src/domain/entities/LLMRequest.ts
export class LLMRequest extends Entity<string> {
  constructor(
    id: string,
    public readonly prompt: string,
    public readonly taskType: TaskType,
    public readonly requirements: LLMRequirements,
    public readonly context: RequestContext = {}
  ) {
    super(id);
  }

  estimateComplexity(): ComplexityLevel {
    // Simple business rule for complexity estimation
    const wordCount = this.prompt.split(' ').length;
    
    if (wordCount < 10) return ComplexityLevel.SIMPLE;
    if (wordCount < 50) return ComplexityLevel.MODERATE;
    if (wordCount < 100) return ComplexityLevel.COMPLEX;
    return ComplexityLevel.ENTERPRISE;
  }

  requiresStructuredOutput(): boolean {
    const structuredKeywords = ['json', 'yaml', 'workflow', 'plan', 'steps'];
    return structuredKeywords.some(keyword => 
      this.prompt.toLowerCase().includes(keyword)
    );
  }
}
```

### **Step 2: Create Value Objects (Day 1)**

#### **2.1 LLM Requirements**
```typescript
// src/domain/values/LLMRequirements.ts
export class LLMRequirements {
  constructor(
    public readonly taskType: TaskType,
    public readonly capabilities: LLMCapability[],
    public readonly maxCost?: number,
    public readonly maxLatency?: number,
    public readonly requiresStreaming: boolean = false
  ) {}

  matches(provider: LLMProviderCapabilities): boolean {
    // Business logic for capability matching
    return this.capabilities.every(required => 
      provider.capabilities.includes(required)
    );
  }

  isSimpleCommand(): boolean {
    return this.taskType === TaskType.CODE_GENERATION && 
           this.capabilities.length === 1 &&
           this.capabilities.includes(LLMCapability.COMMAND_GENERATION);
  }
}
```

#### **2.2 Provider Selection Result**
```typescript
// src/domain/values/ProviderSelection.ts
export class ProviderSelection {
  constructor(
    public readonly providerId: string,
    public readonly providerType: ProviderType,
    public readonly confidence: number,
    public readonly reasoning: string
  ) {}

  isHighConfidence(): boolean {
    return this.confidence >= 0.8;
  }

  static noProvider(reason: string): ProviderSelection {
    return new ProvierSelection('none', ProviderType.NONE, 0, reason);
  }
}
```

### **Step 3: Create Domain Services (Day 2)**

#### **3.1 Workflow Domain Service**
```typescript
// src/domain/services/WorkflowDomainService.ts
export class WorkflowDomainService {
  createWorkflow(description: string, taskType: TaskType): Workflow {
    const id = this.generateWorkflowId();
    const steps = this.planWorkflowSteps(description, taskType);
    
    return new Workflow(id, description, taskType, steps);
  }

  planWorkflowSteps(description: string, taskType: TaskType): WorkflowStep[] {
    // Pure business logic - no infrastructure dependencies
    switch (taskType) {
      case TaskType.CODE_GENERATION:
        return this.planCodeGenerationSteps(description);
      
      case TaskType.PRD_GENERATION:
        return this.planPRDGenerationSteps(description);
      
      default:
        return this.planGenericSteps(description);
    }
  }

  private planCodeGenerationSteps(description: string): WorkflowStep[] {
    // Simple command generation - perfect for GitHub Copilot
    if (this.isSimpleCommand(description)) {
      return [
        new WorkflowStep('generate-command', 'Generate command suggestion', {
          tool: 'github_copilot',
          prompt: description
        })
      ];
    }

    // Complex code generation - needs structured LLM
    return [
      new WorkflowStep('analyze-requirements', 'Analyze code requirements'),
      new WorkflowStep('generate-code', 'Generate code structure'),
      new WorkflowStep('validate-output', 'Validate generated code')
    ];
  }

  private isSimpleCommand(description: string): boolean {
    const simpleCommandIndicators = [
      'create file', 'delete file', 'list files', 'move file',
      'git commit', 'git push', 'git pull', 'git branch',
      'npm install', 'npm start', 'npm build'
    ];

    return simpleCommandIndicators.some(indicator =>
      description.toLowerCase().includes(indicator)
    );
  }

  private generateWorkflowId(): string {
    return `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

#### **3.2 LLM Domain Service**
```typescript
// src/domain/services/LLMDomainService.ts
export class LLMDomainService {
  constructor(
    private readonly selectionStrategy: LLMSelectionStrategy,
    private readonly providerRepository: LLMProviderRepository
  ) {}

  async selectOptimalProvider(request: LLMRequest): Promise<ProviderSelection> {
    // Get available providers based on requirements
    const availableProviders = await this.providerRepository
      .findAvailable(request.requirements);

    if (availableProviders.length === 0) {
      return ProviderSelection.noProvider('No providers meet requirements');
    }

    // Use strategy pattern for selection logic
    const selectedProvider = this.selectionStrategy.selectProvider(
      availableProviders,
      {
        taskType: request.taskType,
        complexity: request.estimateComplexity(),
        requiresStructured: request.requiresStructuredOutput()
      }
    );

    return new ProviderSelection(
      selectedProvider.id,
      selectedProvider.type,
      this.calculateConfidence(selectedProvider, request),
      this.generateSelectionReasoning(selectedProvider, request)
    );
  }

  private calculateConfidence(
    provider: LLMProvider,
    request: LLMRequest
  ): number {
    // Business logic for confidence calculation
    let confidence = 0.5; // Base confidence

    // Task type matching
    if (this.isProviderOptimalForTask(provider.type, request.taskType)) {
      confidence += 0.3;
    }

    // Capability matching
    const capabilityMatch = request.requirements.capabilities
      .filter(cap => provider.capabilities.includes(cap)).length / 
      request.requirements.capabilities.length;
    confidence += capabilityMatch * 0.2;

    return Math.min(confidence, 1.0);
  }

  private isProviderOptimalForTask(
    providerType: ProviderType,
    taskType: TaskType
  ): boolean {
    const optimalMappings = {
      [TaskType.CODE_GENERATION]: [ProviderType.GITHUB_COPILOT, ProviderType.GPT],
      [TaskType.PRD_GENERATION]: [ProviderType.CLAUDE, ProviderType.GPT],
      [TaskType.WORKFLOW_PLANNING]: [ProviderType.CLAUDE]
    };

    return optimalMappings[taskType]?.includes(providerType) || false;
  }

  private generateSelectionReasoning(
    provider: LLMProvider,
    request: LLMRequest
  ): string {
    if (provider.type === ProviderType.GITHUB_COPILOT) {
      return 'Selected GitHub Copilot for command generation task';
    }

    if (request.requiresStructuredOutput()) {
      return `Selected ${provider.type} for structured output requirement`;
    }

    return `Selected ${provider.type} as best available provider`;
  }
}
```

### **Step 4: Create Repository Interfaces (Day 2)**

#### **4.1 LLM Provider Repository**
```typescript
// src/domain/repositories/LLMProviderRepository.ts
export interface LLMProviderRepository {
  findAvailable(requirements: LLMRequirements): Promise<LLMProvider[]>;
  findById(id: string): Promise<LLMProvider | null>;
  findByType(type: ProviderType): Promise<LLMProvider[]>;
  isHealthy(providerId: string): Promise<boolean>;
}
```

#### **4.2 Workflow Repository**
```typescript
// src/domain/repositories/WorkflowRepository.ts
export interface WorkflowRepository {
  save(workflow: Workflow): Promise<void>;
  findById(id: string): Promise<Workflow | null>;
  findByStatus(status: WorkflowStatus): Promise<Workflow[]>;
  findByUser(userId: string): Promise<Workflow[]>;
}
```

### **Step 5: Create Selection Strategies (Day 3)**

#### **5.1 Task-Optimized Strategy**
```typescript
// src/domain/strategies/TaskOptimizedSelectionStrategy.ts
export class TaskOptimizedSelectionStrategy implements LLMSelectionStrategy {
  selectProvider(
    providers: LLMProvider[],
    context: SelectionContext
  ): LLMProvider {
    // GitHub Copilot for simple commands
    if (context.taskType === TaskType.CODE_GENERATION && 
        context.complexity === ComplexityLevel.SIMPLE) {
      const copilot = providers.find(p => p.type === ProviderType.GITHUB_COPILOT);
      if (copilot) return copilot;
    }

    // Claude for complex structured output
    if (context.requiresStructured && context.complexity !== ComplexityLevel.SIMPLE) {
      const claude = providers.find(p => p.type === ProviderType.CLAUDE);
      if (claude) return claude;
    }

    // Fallback to first available
    return providers[0];
  }
}
```

## 🧪 **Testing Strategy**

### **Unit Tests for Domain Logic**
```typescript
// tests/domain/services/WorkflowDomainService.test.ts
describe('WorkflowDomainService', () => {
  let service: WorkflowDomainService;

  beforeEach(() => {
    service = new WorkflowDomainService();
  });

  describe('createWorkflow', () => {
    it('should create simple command workflow for basic requests', () => {
      const workflow = service.createWorkflow(
        'create a new file called test.txt',
        TaskType.CODE_GENERATION
      );

      expect(workflow.steps).toHaveLength(1);
      expect(workflow.steps[0].name).toBe('generate-command');
      expect(workflow.steps[0].params.tool).toBe('github_copilot');
    });

    it('should create complex workflow for complex requests', () => {
      const workflow = service.createWorkflow(
        'create a full-stack application with authentication',
        TaskType.CODE_GENERATION
      );

      expect(workflow.steps).toHaveLength(3);
      expect(workflow.steps.map(s => s.name)).toEqual([
        'analyze-requirements',
        'generate-code', 
        'validate-output'
      ]);
    });
  });
});
```

## ✅ **Phase 1 Completion Checklist**

- [ ] Domain entities created (Workflow, LLMRequest)
- [ ] Value objects implemented (LLMRequirements, ProviderSelection)
- [ ] Domain services extracted (WorkflowDomainService, LLMDomainService)
- [ ] Repository interfaces defined
- [ ] Selection strategies implemented
- [ ] Unit tests covering domain logic
- [ ] No infrastructure dependencies in domain layer
- [ ] Domain logic is pure and testable

## 🎯 **Expected Outcomes**

After Phase 1 completion:

1. **Pure Business Logic**: All business rules isolated in domain layer
2. **Testable Code**: Domain logic can be tested without infrastructure
3. **Clear Responsibilities**: Each service has single responsibility
4. **Strategy Pattern**: LLM selection logic is pluggable
5. **Foundation Ready**: Ready for Phase 2 application layer implementation

## 🚀 **Next Steps**

Once Phase 1 is complete, proceed to Phase 2: Application Layer implementation with command handlers and command bus setup.

---
*This guide provides concrete steps to extract domain logic and create a solid foundation for the clean architecture.*
