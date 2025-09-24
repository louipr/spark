# Spark Clone - Architecture Improvement Plan

## 🎯 **Vision: Clean Hexagonal Architecture**

Transform the current tightly-coupled system into a maintainable, testable, and extensible architecture using Domain-Driven Design and Hexagonal Architecture patterns.

## 🏛️ **Target Architecture**

### **Hexagonal Architecture Layers**

```
┌─────────────────────────────────────────────────────────┐
│                 Presentation Layer                      │
│  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │   CLI Interface │  │    Web API (Future)        │  │
│  │   (Commander.js)│  │    (Express.js)            │  │
│  └─────────────────┘  └─────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│                 Application Layer                       │
│  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  Command Bus    │  │    Query Bus               │  │
│  │  (CQRS Pattern) │  │    (Read Operations)       │  │
│  └─────────────────┘  └─────────────────────────────┘  │
│  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  Command        │  │    Application             │  │
│  │  Handlers       │  │    Services                │  │
│  └─────────────────┘  └─────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│                    Domain Layer                         │
│  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │   Workflow      │  │      LLM                    │  │
│  │   Domain        │  │    Domain                   │  │
│  │   (Pure Logic)  │  │   (Pure Logic)             │  │
│  └─────────────────┘  └─────────────────────────────┘  │
│  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │   Domain        │  │    Domain                   │  │
│  │   Services      │  │    Events                   │  │
│  └─────────────────┘  └─────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│               Infrastructure Layer                      │
│  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │   LLM           │  │    Storage                  │  │
│  │   Adapters      │  │    Adapters                 │  │
│  └─────────────────┘  └─────────────────────────────┘  │
│  ┹─────────────────┐  ┌─────────────────────────────┐  │
│  │   External      │  │    Configuration           │  │
│  │   Services      │  │    Management               │  │
│  └─────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 🔧 **Design Patterns Implementation**

### **1. Command Pattern (Application Layer)**
```typescript
// src/application/commands/Command.ts
export interface Command {
  readonly commandId: string;
  readonly timestamp: Date;
}

// src/application/commands/GeneratePRDCommand.ts
export class GeneratePRDCommand implements Command {
  constructor(
    public readonly commandId: string,
    public readonly timestamp: Date,
    public readonly description: string,
    public readonly options: GenerationOptions
  ) {}
}

// src/application/handlers/CommandHandler.ts
export interface CommandHandler<TCommand extends Command, TResult> {
  handle(command: TCommand): Promise<TResult>;
}

// src/application/handlers/GeneratePRDHandler.ts
export class GeneratePRDHandler implements CommandHandler<GeneratePRDCommand, PRDResult> {
  constructor(
    private readonly workflowService: WorkflowDomainService,
    private readonly llmService: LLMDomainService,
    private readonly prdRepository: PRDRepository
  ) {}

  async handle(command: GeneratePRDCommand): Promise<PRDResult> {
    // Clean application logic - no infrastructure concerns
    const workflow = this.workflowService.createPRDWorkflow(command.description);
    const result = await this.llmService.executeWorkflow(workflow);
    await this.prdRepository.save(result);
    return result;
  }
}
```

### **2. Strategy Pattern (LLM Selection)**
```typescript
// src/domain/services/LLMSelectionStrategy.ts
export interface LLMSelectionStrategy {
  selectProvider(
    availableProviders: LLMProvider[],
    context: SelectionContext
  ): LLMProvider;
}

export class TaskOptimizedStrategy implements LLMSelectionStrategy {
  private readonly taskProviderMapping = {
    [TaskType.CODE_GENERATION]: ['github_copilot', 'gpt', 'claude'],
    [TaskType.WORKFLOW_PLANNING]: ['claude', 'gpt'],
    [TaskType.SIMPLE_COMMANDS]: ['github_copilot']
  };

  selectProvider(providers: LLLMProvider[], context: SelectionContext): LLMProvider {
    const preferred = this.taskProviderMapping[context.taskType] || [];
    return providers.find(p => preferred.includes(p.type)) || providers[0];
  }
}

export class CostOptimizedStrategy implements LLMSelectionStrategy {
  selectProvider(providers: LLMProvider[], context: SelectionContext): LLMProvider {
    return providers.sort((a, b) => a.costPerToken - b.costPerToken)[0];
  }
}
```

### **3. Factory Pattern (Provider Creation)**
```typescript
// src/infrastructure/llm/factories/LLMProviderFactory.ts
export interface LLMProviderFactory {
  createProvider(config: ProviderConfig): LLMProvider;
  supports(providerType: ProviderType): boolean;
}

export class GitHubCopilotProviderFactory implements LLMProviderFactory {
  constructor(private readonly copilotService: GitHubCopilotService) {}

  supports(providerType: ProviderType): boolean {
    return providerType === ProviderType.GITHUB_COPILOT;
  }

  createProvider(config: ProviderConfig): LLMProvider {
    return new GitHubCopilotProvider(config, this.copilotService);
  }
}

// src/infrastructure/llm/factories/ProviderFactoryRegistry.ts
export class ProviderFactoryRegistry {
  private factories = new Map<ProviderType, LLMProviderFactory>();

  register(type: ProviderType, factory: LLMProviderFactory): void {
    this.factories.set(type, factory);
  }

  createProvider(config: ProviderConfig): LLMProvider {
    const factory = this.factories.get(config.type);
    if (!factory) {
      throw new Error(`No factory registered for provider type: ${config.type}`);
    }
    return factory.createProvider(config);
  }
}
```

### **4. Repository Pattern (Data Access)**
```typescript
// src/domain/repositories/LLMProviderRepository.ts
export interface LLMProviderRepository {
  findAvailable(requirements: LLMRequirements): Promise<LLMProvider[]>;
  findByCapabilities(capabilities: string[]): Promise<LLMProvider[]>;
  isHealthy(provider: LLMProvider): Promise<boolean>;
}

// src/infrastructure/repositories/InMemoryLLMProviderRepository.ts
export class InMemoryLLMProviderRepository implements LLMProviderRepository {
  constructor(private readonly providers: Map<string, LLMProvider>) {}

  async findAvailable(requirements: LLMRequirements): Promise<LLMProvider[]> {
    const available: LLMProvider[] = [];
    
    for (const provider of this.providers.values()) {
      if (await this.meetsRequirements(provider, requirements)) {
        available.push(provider);
      }
    }
    
    return available;
  }

  private async meetsRequirements(
    provider: LLMProvider, 
    requirements: LLMRequirements
  ): Promise<boolean> {
    return await provider.isHealthy() && 
           provider.hasCapabilities(requirements.capabilities);
  }
}
```

### **5. Observer Pattern (Events)**
```typescript
// src/domain/events/DomainEvent.ts
export interface DomainEvent {
  readonly eventId: string;
  readonly timestamp: Date;
  readonly eventType: string;
}

// src/domain/events/WorkflowEvents.ts
export class WorkflowStartedEvent implements DomainEvent {
  constructor(
    public readonly eventId: string,
    public readonly timestamp: Date,
    public readonly workflowId: string,
    public readonly requestDescription: string
  ) {}
  
  readonly eventType = 'workflow.started';
}

// src/application/events/EventHandler.ts
export interface EventHandler<TEvent extends DomainEvent> {
  handle(event: TEvent): Promise<void>;
}

// src/application/events/WorkflowStartedHandler.ts
export class WorkflowStartedHandler implements EventHandler<WorkflowStartedEvent> {
  constructor(private readonly logger: Logger) {}

  async handle(event: WorkflowStartedEvent): Promise<void> {
    this.logger.info(`Workflow started: ${event.workflowId}`, {
      description: event.requestDescription,
      timestamp: event.timestamp
    });
  }
}
```

## 📁 **Target Directory Structure**

```
src/
├── presentation/
│   ├── cli/
│   │   ├── SparkCLI.ts                    # Clean CLI interface
│   │   ├── CommandParser.ts               # Command parsing logic
│   │   └── OutputFormatter.ts             # Result formatting
│   └── web/                               # Future web interface
│       ├── controllers/
│       └── routes/
├── application/
│   ├── commands/
│   │   ├── GeneratePRDCommand.ts
│   │   ├── ExecuteWorkflowCommand.ts
│   │   └── SuggestCommandCommand.ts
│   ├── handlers/
│   │   ├── GeneratePRDHandler.ts
│   │   ├── ExecuteWorkflowHandler.ts
│   │   └── SuggestCommandHandler.ts
│   ├── queries/
│   │   ├── GetWorkflowStatusQuery.ts
│   │   └── GetProviderStatsQuery.ts
│   ├── services/
│   │   ├── CommandBus.ts
│   │   ├── QueryBus.ts
│   │   └── EventBus.ts
│   └── events/
│       ├── EventHandler.ts
│       └── WorkflowEventHandlers.ts
├── domain/
│   ├── entities/
│   │   ├── Workflow.ts
│   │   ├── ExecutionPlan.ts
│   │   ├── LLMRequest.ts
│   │   └── PRD.ts
│   ├── services/
│   │   ├── WorkflowDomainService.ts
│   │   ├── LLMDomainService.ts
│   │   └── PRDDomainService.ts
│   ├── repositories/
│   │   ├── WorkflowRepository.ts
│   │   ├── LLMProviderRepository.ts
│   │   └── PRDRepository.ts
│   ├── events/
│   │   ├── DomainEvent.ts
│   │   ├── WorkflowEvents.ts
│   │   └── LLMEvents.ts
│   └── strategies/
│       ├── LLMSelectionStrategy.ts
│       └── WorkflowExecutionStrategy.ts
├── infrastructure/
│   ├── llm/
│   │   ├── adapters/
│   │   │   ├── GitHubCopilotAdapter.ts
│   │   │   ├── ClaudeAdapter.ts
│   │   │   └── GPTAdapter.ts
│   │   ├── factories/
│   │   │   ├── LLMProviderFactory.ts
│   │   │   └── ProviderFactoryRegistry.ts
│   │   └── services/
│   │       ├── GitHubCopilotService.ts     # Clean external service
│   │       └── ProcessExecutorService.ts
│   ├── storage/
│   │   ├── adapters/
│   │   │   ├── FileStorageAdapter.ts
│   │   │   └── CacheAdapter.ts
│   │   └── repositories/
│   │       ├── FileWorkflowRepository.ts
│   │       └── InMemoryLLMProviderRepository.ts
│   ├── configuration/
│   │   ├── ConfigurationManager.ts
│   │   └── EnvironmentConfiguration.ts
│   └── di/
│       ├── Container.ts                   # Dependency injection
│       ├── ApplicationModule.ts
│       └── InfrastructureModule.ts
├── shared/
│   ├── types/
│   │   ├── Common.ts
│   │   └── Result.ts
│   ├── utils/
│   │   ├── Logger.ts
│   │   └── Validation.ts
│   └── constants/
│       ├── TaskTypes.ts
│       └── ProviderTypes.ts
└── main.ts                               # Application entry point
```

## 🚀 **Implementation Phases**

### **Phase 1: Domain Layer (Week 1)**
**Goal**: Extract pure business logic with no dependencies

**Tasks**:
1. Create domain entities (Workflow, LLMRequest, ExecutionPlan)
2. Extract domain services (WorkflowDomainService, LLMDomainService)
3. Define repository interfaces
4. Implement selection strategies

**Benefits**:
- Business logic becomes testable in isolation
- Clear separation of concerns
- Foundation for all other layers

### **Phase 2: Application Layer (Week 1-2)**
**Goal**: Implement use cases and command handling

**Tasks**:
1. Create command/query objects
2. Implement command handlers
3. Set up command bus and event bus
4. Create application services

**Benefits**:
- Clean use case implementation
- Easy to add new commands
- Clear application boundaries

### **Phase 3: Infrastructure Layer (Week 2)**
**Goal**: Clean adapters and external service integration

**Tasks**:
1. Refactor GitHub Copilot integration into clean adapter
2. Implement repository pattern for data access
3. Create provider factories
4. Set up dependency injection

**Benefits**:
- GitHub Copilot integration becomes maintainable
- Easy to swap implementations
- Proper dependency management

### **Phase 4: Presentation Layer (Week 3)**
**Goal**: Clean CLI interface

**Tasks**:
1. Simplify SparkApplication to thin CLI layer
2. Implement command bus integration
3. Clean up command parsing and output formatting
4. Add proper error handling

**Benefits**:
- CLI becomes simple orchestrator
- Easy to add web interface later
- Better user experience

### **Phase 5: Testing & Documentation (Week 3-4)**
**Goal**: Comprehensive testing and documentation

**Tasks**:
1. Unit tests for domain layer
2. Integration tests for application layer
3. End-to-end tests for CLI
4. Update documentation

**Benefits**:
- High confidence in refactoring
- Documentation matches implementation
- Maintainable test suite

## 📊 **Success Metrics**

### **Code Quality**
- **Cyclomatic Complexity**: < 10 per method
- **Class Responsibilities**: Single responsibility per class
- **Coupling**: Loose coupling between layers
- **Cohesion**: High cohesion within layers

### **Architecture Quality**
- **Dependency Direction**: All dependencies point inward to domain
- **Testability**: > 90% unit test coverage for domain layer
- **Maintainability**: New features require changes in single layer
- **Extensibility**: New LLM providers added with < 50 lines of code

### **Performance**
- **Startup Time**: < 2 seconds
- **Command Response**: < 5 seconds for simple commands
- **Memory Usage**: < 100MB baseline
- **Provider Selection**: < 100ms

## 🎯 **Expected Outcomes**

### **Short Term (1 month)**
- Clean, testable domain logic
- Proper separation of concerns
- GitHub Copilot integration no longer causes architectural issues
- Easy to add new commands

### **Medium Term (3 months)**
- New LLM providers added easily
- Web interface can be added without changing core logic
- Comprehensive test coverage
- Clear documentation

### **Long Term (6 months)**
- Microservices extraction possible
- Plugin architecture for extensions
- Multiple front-ends supported
- Production-ready architecture

---

*This architecture improvement plan transforms the current tightly-coupled system into a maintainable, extensible, and testable codebase following established software engineering principles.*
