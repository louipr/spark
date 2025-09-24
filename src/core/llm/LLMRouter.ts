// LLM Router - LLM provider selection and load balancing

import {
  LLMProvider,
  LLMMessage,
  LLMResponse,
  LLMConfig,
  TaskType,
  ModelType,
  Priority
} from '../../models/index.js';
import { LLMInterface } from './LLMInterface.js';
import { ClaudeProvider } from './ClaudeProvider.js';
import { GPTProvider } from './GPTProvider.js';
import { GitHubCopilotProvider } from './GitHubCopilotProvider.js';
import { CopilotAssistant } from '../../integrations/index.js';


export interface ProviderConfig {
  provider: LLMProvider;
  config: LLMConfig;
  priority: Priority;
  enabled: boolean;
  apiKey?: string;
}

export interface RoutingStrategy {
  type: 'cost' | 'performance' | 'capability' | 'fallback' | 'round_robin';
  preferences?: {
    maxCostPerRequest?: number;
    maxLatencyMs?: number;
    requiresStreaming?: boolean;
    requiresFunctionCalling?: boolean;
  };
}

export class LLMRouter {
  private providers: Map<LLMProvider, LLMInterface> = new Map();
  private providerConfigs: Map<LLMProvider, ProviderConfig> = new Map();
  private requestCounts: Map<LLMProvider, number> = new Map();
  private lastUsedProvider?: LLMProvider;
  private copilotAssistant?: CopilotAssistant;

  constructor(configs: ProviderConfig[], copilotAssistant?: CopilotAssistant) {
    this.copilotAssistant = copilotAssistant;
    this.initializeProviders(configs);
  }

  /**
   * Route a request to the best available provider
   */
  async route(
    messages: LLMMessage[],
    taskType: TaskType,
    strategy: RoutingStrategy = { type: 'fallback' },
    options?: Partial<LLMConfig>
  ): Promise<LLMResponse> {
    const selectedProvider = await this.selectProvider(strategy, taskType, messages);
    const agent = this.providers.get(selectedProvider);

    if (!agent) {
      throw new Error(`No agent available for provider: ${selectedProvider}`);
    }

    try {
      const response = await agent.generate(messages, taskType, options);
      this.updateMetrics(selectedProvider, true);
      return response;
    } catch (error) {
      console.warn(`Provider ${selectedProvider} failed:`, error);
      this.updateMetrics(selectedProvider, false);
      
      // Try fallback provider if available
      if (strategy.type !== 'fallback') {
        return this.route(messages, taskType, { type: 'fallback' }, options);
      }
      
      throw error;
    }
  }

  /**
   * Stream a response using the best available provider
   */
  async* stream(
    messages: LLMMessage[],
    taskType: TaskType,
    strategy: RoutingStrategy = { type: 'fallback' },
    options?: Partial<LLMConfig>
  ): AsyncGenerator<string, void, unknown> {
    const selectedProvider = await this.selectProvider(strategy, taskType, messages);
    const agent = this.providers.get(selectedProvider);

    if (!agent) {
      throw new Error(`No agent available for provider: ${selectedProvider}`);
    }

    try {
      yield* agent.stream(messages, taskType, options);
      this.updateMetrics(selectedProvider, true);
    } catch (error) {
      console.warn(`Provider ${selectedProvider} streaming failed:`, error);
      this.updateMetrics(selectedProvider, false);
      throw error;
    }
  }

  /**
   * Select the best provider based on strategy
   */
  private async selectProvider(
    strategy: RoutingStrategy,
    taskType: TaskType,
    messages: LLMMessage[]
  ): Promise<LLMProvider> {
    const availableProviders = await this.getAvailableProviders();
    
    if (availableProviders.length === 0) {
      throw new Error('No providers available');
    }

    switch (strategy.type) {
      case 'cost':
        return this.selectByCost(availableProviders, messages);
      
      case 'performance':
        return this.selectByPerformance(availableProviders, taskType);
      
      case 'capability':
        return this.selectByCapability(availableProviders, strategy.preferences);
      
      case 'round_robin':
        return this.selectRoundRobin(availableProviders);
      
      case 'fallback':
      default:
        return this.selectByFallback(availableProviders);
    }
  }

  /**
   * Select provider by cost optimization
   */
  private selectByCost(providers: LLMProvider[], messages: LLMMessage[]): LLMProvider {
    let bestProvider = providers[0];
    let lowestCost = Infinity;

    for (const provider of providers) {
      const agent = this.providers.get(provider);
      if (!agent) continue;

      const estimatedTokens = agent.estimateTokens(messages);
      const estimatedCost = this.estimateCost(provider, estimatedTokens);

      if (estimatedCost < lowestCost) {
        lowestCost = estimatedCost;
        bestProvider = provider;
      }
    }

    return bestProvider;
  }

  /**
   * Select provider by performance characteristics
   */
  private selectByPerformance(providers: LLMProvider[], taskType: TaskType): LLMProvider {
    // Performance preferences based on task type
    const taskPreferences = {
      [TaskType.PRD_GENERATION]: [LLMProvider.CLAUDE, LLMProvider.GPT],
      [TaskType.CODE_GENERATION]: [LLMProvider.GPT, LLMProvider.CLAUDE],
      [TaskType.FEATURE_ANALYSIS]: [LLMProvider.CLAUDE, LLMProvider.GPT],
      [TaskType.TECH_STACK_SELECTION]: [LLMProvider.CLAUDE, LLMProvider.GPT],
      [TaskType.ARCHITECTURE_DESIGN]: [LLMProvider.CLAUDE, LLMProvider.GPT],
      [TaskType.TESTING_STRATEGY]: [LLMProvider.GPT, LLMProvider.CLAUDE],
      [TaskType.DEPLOYMENT_PLANNING]: [LLMProvider.CLAUDE, LLMProvider.GPT],
      [TaskType.DOCUMENTATION]: [LLMProvider.CLAUDE, LLMProvider.GPT]
    };

    const preferences = taskPreferences[taskType] || [LLMProvider.CLAUDE, LLMProvider.GPT];
    
    for (const preferredProvider of preferences) {
      if (providers.includes(preferredProvider)) {
        return preferredProvider;
      }
    }

    return providers[0];
  }

  /**
   * Select provider by capability requirements
   */
  private selectByCapability(
    providers: LLMProvider[], 
    preferences?: RoutingStrategy['preferences']
  ): LLMProvider {
    if (!preferences) {
      return providers[0];
    }

    for (const provider of providers) {
      const agent = this.providers.get(provider);
      if (!agent) continue;

      const capabilities = agent.getCapabilities();

      // Check streaming requirement
      if (preferences.requiresStreaming && !capabilities.supportsStreaming) {
        continue;
      }

      // Check function calling requirement
      if (preferences.requiresFunctionCalling && !capabilities.supportsFunctionCalling) {
        continue;
      }

      return provider;
    }

    return providers[0];
  }

  /**
   * Select provider using round-robin strategy
   */
  private selectRoundRobin(providers: LLMProvider[]): LLMProvider {
    const sortedProviders = providers.sort();
    
    if (!this.lastUsedProvider) {
      this.lastUsedProvider = sortedProviders[0];
      return sortedProviders[0];
    }

    const currentIndex = sortedProviders.indexOf(this.lastUsedProvider);
    const nextIndex = (currentIndex + 1) % sortedProviders.length;
    
    this.lastUsedProvider = sortedProviders[nextIndex];
    return sortedProviders[nextIndex];
  }

  /**
   * Select provider by fallback priority
   */
  private selectByFallback(providers: LLMProvider[]): LLMProvider {
    // Sort by priority and return the highest priority available provider
    const sortedProviders = providers.sort((a, b) => {
      const configA = this.providerConfigs.get(a);
      const configB = this.providerConfigs.get(b);
      
      if (!configA || !configB) return 0;
      
      const priorityOrder = {
        [Priority.MUST_HAVE]: 3,
        [Priority.SHOULD_HAVE]: 2,
        [Priority.NICE_TO_HAVE]: 1
      };
      
      return priorityOrder[configB.priority] - priorityOrder[configA.priority];
    });

    return sortedProviders[0];
  }

  /**
   * Get list of available providers
   */
  private async getAvailableProviders(): Promise<LLMProvider[]> {
    const available: LLMProvider[] = [];

    for (const [provider, agent] of this.providers) {
      const config = this.providerConfigs.get(provider);
      if (!config?.enabled) continue;

      try {
        const isAvailable = await agent.isAvailable();
        if (isAvailable) {
          available.push(provider);
        }
      } catch (error) {
        console.warn(`Provider ${provider} availability check failed:`, error);
      }
    }

    return available;
  }

  /**
   * Estimate cost for a provider
   */
  private estimateCost(provider: LLMProvider, tokens: number): number {
    // Simplified cost estimation based on provider
    const costPerToken: Record<LLMProvider, number> = {
      [LLMProvider.CLAUDE]: 0.008 / 1000, // Average Claude pricing
      [LLMProvider.GPT]: 0.01 / 1000,     // Average GPT pricing
      [LLMProvider.GEMINI]: 0.005 / 1000, // Average Gemini pricing
      [LLMProvider.GITHUB_COPILOT]: 0.001 / 1000 // GitHub Copilot pricing (estimation)
    };

    return tokens * (costPerToken[provider] || 0.01 / 1000);
  }

  /**
   * Update provider metrics
   */
  private updateMetrics(provider: LLMProvider, success: boolean): void {
    const current = this.requestCounts.get(provider) || 0;
    this.requestCounts.set(provider, current + 1);

    // In a real implementation, you'd track success rates, latency, etc.
    // For now, we just track request counts
  }

  /**
   * Initialize providers from configs
   */
  private initializeProviders(configs: ProviderConfig[]): void {
    for (const config of configs) {
      this.providerConfigs.set(config.provider, config);
      
      if (!config.enabled) continue;

      let agent: LLMInterface;
      
      switch (config.provider) {
        case LLMProvider.CLAUDE:
          agent = new ClaudeProvider(config.config, config.apiKey);
          break;
        
        case LLMProvider.GPT:
          agent = new GPTProvider(config.config, config.apiKey);
          break;
        
        case LLMProvider.GITHUB_COPILOT:
          if (!this.copilotAssistant) {
            console.warn('GitHub Copilot provider requested but CopilotAssistant not provided');
            continue;
          }
          agent = new GitHubCopilotProvider(config.config, this.copilotAssistant);
          break;
        
        default:
          console.warn(`Unsupported provider: ${config.provider}`);
          continue;
      }

      this.providers.set(config.provider, agent);
      this.requestCounts.set(config.provider, 0);
    }
  }

  /**
   * Get provider statistics
   */
  getStats(): Map<LLMProvider, { requestCount: number; enabled: boolean }> {
    const stats = new Map();
    
    for (const [provider, count] of this.requestCounts) {
      const config = this.providerConfigs.get(provider);
      stats.set(provider, {
        requestCount: count,
        enabled: config?.enabled || false
      });
    }
    
    return stats;
  }

  /**
   * Enable or disable a provider
   */
  setProviderEnabled(provider: LLMProvider, enabled: boolean): void {
    const config = this.providerConfigs.get(provider);
    if (config) {
      config.enabled = enabled;
    }
  }
}
