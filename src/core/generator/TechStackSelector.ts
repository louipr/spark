// Tech Stack Selector - Recommends technology stacks based on requirements

import {
  TechStack,
  AppType,
  Feature,
  ComplexityLevel,
  FeatureType,
  FrontendFramework,
  BackendFramework,
  DatabaseType,
  DeploymentPlatform,
  TestingFramework,
  FrontendStack,
  BackendStack,
  DatabaseConfig,
  InfrastructureConfig,
  Integration,
  DevelopmentTools
} from '../../models/index.js';

export class TechStackSelector {
  private stackTemplates: Map<AppType, TechStackTemplate>;
  private featureRequirements: Map<FeatureType, FeatureRequirements>;

  constructor() {
    this.stackTemplates = this.initializeStackTemplates();
    this.featureRequirements = this.initializeFeatureRequirements();
  }

  /**
   * Suggests a tech stack based on app type, features, and complexity
   */
  async suggest(
    appType: AppType,
    features: Feature[],
    complexity: ComplexityLevel
  ): Promise<TechStack> {
    // Get base stack template
    const baseTemplate = this.stackTemplates.get(appType);
    if (!baseTemplate) {
      throw new Error(`No stack template found for app type: ${appType}`);
    }

    // Build tech stack based on requirements
    const frontend = this.selectFrontend(appType, features, complexity, baseTemplate);
    const backend = this.selectBackend(appType, features, complexity, baseTemplate);
    const database = this.selectDatabase(features, complexity, baseTemplate);
    const infrastructure = this.selectInfrastructure(complexity, features, baseTemplate);
    const integrations = this.selectIntegrations(features);
    const developmentTools = this.selectDevelopmentTools(complexity, frontend.framework);

    return {
      frontend,
      backend,
      database,
      infrastructure,
      integrations,
      developmentTools
    };
  }

  /**
   * Selects frontend stack
   */
  private selectFrontend(
    appType: AppType,
    features: Feature[],
    complexity: ComplexityLevel,
    template: TechStackTemplate
  ): FrontendStack {
    let framework = template.preferredFrontend;
    
    // Feature-based adjustments
    const hasRealTime = features.some(f => f.type === FeatureType.REAL_TIME);
    const hasSocial = features.some(f => f.type === FeatureType.SOCIAL);
    const needsSEO = appType === AppType.WEB_APP && features.length > 3;

    // Complexity-based adjustments
    if (complexity === ComplexityLevel.ENTERPRISE && framework === FrontendFramework.VANILLA) {
      framework = FrontendFramework.REACT;
    }

    if (needsSEO && framework === FrontendFramework.REACT) {
      framework = FrontendFramework.NEXT_JS;
    }

    // Select supporting libraries
    const additionalLibraries = this.selectFrontendLibraries(framework, features, hasRealTime);

    return {
      framework,
      version: this.getFrameworkVersion(framework),
      stateManagement: this.selectStateManagement(framework, complexity),
      styling: this.selectStyling(framework, complexity),
      buildTool: this.selectBuildTool(framework),
      testing: this.selectTestingFrameworks('frontend', complexity),
      additionalLibraries
    };
  }

  /**
   * Selects backend stack
   */
  private selectBackend(
    appType: AppType,
    features: Feature[],
    complexity: ComplexityLevel,
    template: TechStackTemplate
  ): BackendStack {
    let framework = template.preferredBackend;
    
    // Feature-based adjustments
    const hasPayment = features.some(f => f.type === FeatureType.PAYMENT);
    const hasAI = features.some(f => f.type === FeatureType.AI_INTEGRATION);
    const hasRealTime = features.some(f => f.type === FeatureType.REAL_TIME);

    // Complexity-based adjustments
    if (complexity === ComplexityLevel.ENTERPRISE) {
      framework = BackendFramework.NEST_JS; // More structured for enterprise
    }

    if (hasAI && framework === BackendFramework.EXPRESS) {
      // Express is fine for AI, just need good library support
    }

    const additionalLibraries = this.selectBackendLibraries(framework, features, hasRealTime, hasPayment);

    return {
      framework,
      runtime: this.getRuntime(framework),
      version: this.getFrameworkVersion(framework),
      authentication: this.selectAuthentication(features),
      validation: this.selectValidation(framework),
      logging: this.selectLogging(complexity),
      testing: this.selectTestingFrameworks('backend', complexity),
      additionalLibraries
    };
  }

  /**
   * Selects database configuration
   */
  private selectDatabase(
    features: Feature[],
    complexity: ComplexityLevel,
    template: TechStackTemplate
  ): DatabaseConfig {
    const hasAnalytics = features.some(f => f.type === FeatureType.ANALYTICS);
    const hasRealTime = features.some(f => f.type === FeatureType.REAL_TIME);
    const needsSearch = features.some(f => f.type === FeatureType.SEARCH);

    let primaryDb = template.preferredDatabase;

    // Complexity-based adjustments
    if (complexity === ComplexityLevel.SIMPLE) {
      primaryDb = DatabaseType.SQLITE;
    } else if (complexity === ComplexityLevel.ENTERPRISE) {
      primaryDb = DatabaseType.POSTGRESQL;
    }

    const config: DatabaseConfig = {
      primary: {
        type: primaryDb,
        version: this.getDatabaseVersion(primaryDb),
        purpose: 'Primary application data storage'
      }
    };

    // Add cache if needed
    if (complexity >= ComplexityLevel.MODERATE || hasRealTime) {
      config.cache = {
        type: DatabaseType.REDIS,
        version: '7.0',
        purpose: 'Session storage and caching'
      };
    }

    // Add search if needed
    if (needsSearch && features.length > 5) {
      config.search = {
        type: 'elasticsearch',
        version: '8.0',
        purpose: 'Full-text search capabilities'
      };
    }

    return config;
  }

  /**
   * Selects infrastructure configuration
   */
  private selectInfrastructure(
    complexity: ComplexityLevel,
    features: Feature[],
    template: TechStackTemplate
  ): InfrastructureConfig {
    const hasRealTime = features.some(f => f.type === FeatureType.REAL_TIME);
    
    let hosting = template.preferredHosting;

    // Complexity-based hosting selection
    if (complexity === ComplexityLevel.SIMPLE) {
      hosting = DeploymentPlatform.VERCEL;
    } else if (complexity === ComplexityLevel.ENTERPRISE) {
      hosting = DeploymentPlatform.AWS;
    }

    const needsContainerization = complexity >= ComplexityLevel.COMPLEX;
    const needsOrchestration = complexity === ComplexityLevel.ENTERPRISE;

    return {
      hosting,
      containerization: needsContainerization ? 'Docker' : undefined,
      orchestration: needsOrchestration ? 'Kubernetes' : undefined,
      monitoring: this.selectMonitoring(complexity, hasRealTime),
      cicd: 'GitHub Actions',
      domainManagement: 'Cloudflare'
    };
  }

  /**
   * Selects required integrations
   */
  private selectIntegrations(features: Feature[]): Integration[] {
    const integrations: Integration[] = [];

    features.forEach(feature => {
      switch (feature.type) {
        case FeatureType.PAYMENT:
          integrations.push({
            name: 'Stripe',
            type: 'payment',
            purpose: 'Payment processing',
            authentication: 'API Key',
            dataFlow: 'bidirectional',
            protocol: 'HTTPS/REST'
          });
          break;

        case FeatureType.AI_INTEGRATION:
          integrations.push({
            name: 'OpenAI API',
            type: 'ai',
            purpose: 'AI services integration',
            authentication: 'Bearer Token',
            dataFlow: 'bidirectional',
            protocol: 'HTTPS/REST'
          });
          break;

        case FeatureType.EMAIL:
          integrations.push({
            name: 'SendGrid',
            type: 'email',
            purpose: 'Email delivery',
            authentication: 'API Key',
            dataFlow: 'outbound',
            protocol: 'HTTPS/REST'
          });
          break;

        case FeatureType.ANALYTICS:
          integrations.push({
            name: 'Google Analytics',
            type: 'analytics',
            purpose: 'User analytics tracking',
            authentication: 'OAuth2',
            dataFlow: 'outbound',
            protocol: 'HTTPS/REST'
          });
          break;
      }
    });

    return integrations;
  }

  /**
   * Selects development tools
   */
  private selectDevelopmentTools(
    complexity: ComplexityLevel,
    frontendFramework: FrontendFramework
  ): DevelopmentTools {
    const isTypeScript = complexity >= ComplexityLevel.MODERATE;
    
    return {
      versionControl: 'Git',
      packageManager: this.selectPackageManager(frontendFramework),
      linting: isTypeScript ? ['ESLint', 'TypeScript'] : ['ESLint'],
      formatting: 'Prettier',
      bundling: this.selectBundler(frontendFramework),
      taskRunner: complexity >= ComplexityLevel.COMPLEX ? 'npm scripts' : undefined
    };
  }

  // Helper methods for specific selections

  private selectFrontendLibraries(
    framework: FrontendFramework,
    features: Feature[],
    hasRealTime: boolean
  ): any[] {
    const libraries = [];

    if (hasRealTime) {
      libraries.push({ name: 'Socket.io-client', purpose: 'Real-time communication' });
    }

    if (features.some(f => f.type === FeatureType.AUTHENTICATION)) {
      if (framework === FrontendFramework.REACT) {
        libraries.push({ name: 'React Router', purpose: 'Client-side routing' });
      }
    }

    return libraries;
  }

  private selectBackendLibraries(
    framework: BackendFramework,
    features: Feature[],
    hasRealTime: boolean,
    hasPayment: boolean
  ): any[] {
    const libraries = [];

    if (hasRealTime) {
      libraries.push({ name: 'Socket.io', purpose: 'Real-time communication' });
    }

    if (hasPayment) {
      libraries.push({ name: 'stripe', purpose: 'Payment processing' });
    }

    if (framework === BackendFramework.EXPRESS) {
      libraries.push(
        { name: 'express-rate-limit', purpose: 'Rate limiting' },
        { name: 'helmet', purpose: 'Security headers' },
        { name: 'cors', purpose: 'Cross-origin resource sharing' }
      );
    }

    return libraries;
  }

  private getFrameworkVersion(framework: FrontendFramework | BackendFramework): string {
    const versions: Record<string, string> = {
      [FrontendFramework.REACT]: '18.2.0',
      [FrontendFramework.VUE]: '3.3.0',
      [FrontendFramework.NEXT_JS]: '14.0.0',
      [BackendFramework.EXPRESS]: '4.18.0',
      [BackendFramework.NEST_JS]: '10.0.0',
      [BackendFramework.FASTIFY]: '4.24.0'
    };

    return versions[framework] || 'latest';
  }

  private selectStateManagement(framework: FrontendFramework, complexity: ComplexityLevel): string {
    if (complexity === ComplexityLevel.SIMPLE) return 'React useState';
    
    const stateManagement: Record<FrontendFramework, string> = {
      [FrontendFramework.REACT]: 'Zustand',
      [FrontendFramework.VUE]: 'Pinia',
      [FrontendFramework.NEXT_JS]: 'Zustand',
      [FrontendFramework.ANGULAR]: 'NgRx',
      [FrontendFramework.SVELTE]: 'Svelte stores',
      [FrontendFramework.NUXT]: 'Pinia',
      [FrontendFramework.VANILLA]: 'None'
    };

    return stateManagement[framework] || 'Context API';
  }

  private selectStyling(framework: FrontendFramework, complexity: ComplexityLevel): string {
    if (complexity === ComplexityLevel.SIMPLE) return 'CSS';
    return 'Tailwind CSS';
  }

  private selectBuildTool(framework: FrontendFramework): string {
    const buildTools: Record<FrontendFramework, string> = {
      [FrontendFramework.REACT]: 'Vite',
      [FrontendFramework.VUE]: 'Vite',
      [FrontendFramework.NEXT_JS]: 'Next.js',
      [FrontendFramework.ANGULAR]: 'Angular CLI',
      [FrontendFramework.SVELTE]: 'Vite',
      [FrontendFramework.NUXT]: 'Nuxt.js',
      [FrontendFramework.VANILLA]: 'Vite'
    };

    return buildTools[framework] || 'Webpack';
  }

  private selectTestingFrameworks(type: 'frontend' | 'backend', complexity: ComplexityLevel): TestingFramework[] {
    if (complexity === ComplexityLevel.SIMPLE) {
      return [TestingFramework.JEST];
    }

    const frameworks = [TestingFramework.JEST];
    
    if (type === 'frontend' && complexity >= ComplexityLevel.MODERATE) {
      frameworks.push(TestingFramework.TESTING_LIBRARY);
    }

    if (complexity >= ComplexityLevel.COMPLEX) {
      frameworks.push(TestingFramework.PLAYWRIGHT);
    }

    return frameworks;
  }

  private getRuntime(framework: BackendFramework): string {
    // Most of our supported frameworks use Node.js
    return 'Node.js 18.x';
  }

  private selectAuthentication(features: Feature[]): string {
    const hasAuth = features.some(f => f.type === FeatureType.AUTHENTICATION);
    return hasAuth ? 'JWT' : 'None';
  }

  private selectValidation(framework: BackendFramework): string {
    return 'Zod'; // Works well with TypeScript
  }

  private selectLogging(complexity: ComplexityLevel): string {
    return complexity >= ComplexityLevel.MODERATE ? 'Winston' : 'console.log';
  }

  private getDatabaseVersion(dbType: DatabaseType): string {
    const versions: Record<DatabaseType, string> = {
      [DatabaseType.POSTGRESQL]: '15.0',
      [DatabaseType.MYSQL]: '8.0',
      [DatabaseType.MONGODB]: '7.0',
      [DatabaseType.SQLITE]: '3.42',
      [DatabaseType.REDIS]: '7.0',
      [DatabaseType.FIREBASE]: 'latest'
    };

    return versions[dbType] || 'latest';
  }

  private selectMonitoring(complexity: ComplexityLevel, hasRealTime: boolean): string[] {
    const monitoring = ['Basic logging'];

    if (complexity >= ComplexityLevel.MODERATE) {
      monitoring.push('Error tracking (Sentry)');
    }

    if (complexity >= ComplexityLevel.COMPLEX) {
      monitoring.push('Performance monitoring (New Relic)');
    }

    if (hasRealTime || complexity === ComplexityLevel.ENTERPRISE) {
      monitoring.push('Real-time metrics (DataDog)');
    }

    return monitoring;
  }

  private selectPackageManager(framework: FrontendFramework): string {
    return 'npm'; // Default to npm for simplicity
  }

  private selectBundler(framework: FrontendFramework): string {
    return this.selectBuildTool(framework);
  }

  private initializeStackTemplates(): Map<AppType, TechStackTemplate> {
    const templates = new Map<AppType, TechStackTemplate>();

    templates.set(AppType.WEB_APP, {
      preferredFrontend: FrontendFramework.REACT,
      preferredBackend: BackendFramework.EXPRESS,
      preferredDatabase: DatabaseType.POSTGRESQL,
      preferredHosting: DeploymentPlatform.VERCEL
    });

    templates.set(AppType.API_SERVICE, {
      preferredFrontend: FrontendFramework.VANILLA, // No frontend
      preferredBackend: BackendFramework.FASTIFY,
      preferredDatabase: DatabaseType.POSTGRESQL,
      preferredHosting: DeploymentPlatform.RAILWAY
    });

    templates.set(AppType.DASHBOARD, {
      preferredFrontend: FrontendFramework.REACT,
      preferredBackend: BackendFramework.NEST_JS,
      preferredDatabase: DatabaseType.POSTGRESQL,
      preferredHosting: DeploymentPlatform.VERCEL
    });

    // Add more templates as needed

    return templates;
  }

  private initializeFeatureRequirements(): Map<FeatureType, FeatureRequirements> {
    const requirements = new Map<FeatureType, FeatureRequirements>();

    requirements.set(FeatureType.REAL_TIME, {
      requiresWebSocket: true,
      recommendedBackend: [BackendFramework.EXPRESS, BackendFramework.FASTIFY],
      additionalServices: ['Redis']
    });

    requirements.set(FeatureType.PAYMENT, {
      requiresHTTPS: true,
      recommendedServices: ['Stripe', 'PayPal'],
      securityRequirements: ['PCI DSS compliance']
    });

    // Add more feature requirements as needed

    return requirements;
  }
}

interface TechStackTemplate {
  preferredFrontend: FrontendFramework;
  preferredBackend: BackendFramework;
  preferredDatabase: DatabaseType;
  preferredHosting: DeploymentPlatform;
}

interface FeatureRequirements {
  requiresWebSocket?: boolean;
  requiresHTTPS?: boolean;
  recommendedBackend?: BackendFramework[];
  recommendedServices?: string[];
  additionalServices?: string[];
  securityRequirements?: string[];
}
