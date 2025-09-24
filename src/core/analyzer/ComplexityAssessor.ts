// Complexity Assessor - Evaluates the complexity level of a project

import {
  ComplexityLevel,
  Feature,
  AppType,
  FeatureType
} from '../../models/index.js';

export class ComplexityAssessor {
  private complexityWeights: ComplexityWeights;

  constructor() {
    this.complexityWeights = this.initializeComplexityWeights();
  }

  /**
   * Assesses the overall complexity of a project
   */
  async assess(
    features: Feature[],
    input: string,
    appType: AppType
  ): Promise<ComplexityLevel> {
    const scores = this.calculateComplexityScores(features, input, appType);
    return this.determineComplexityLevel(scores);
  }

  /**
   * Calculates complexity scores across different dimensions
   */
  private calculateComplexityScores(
    features: Feature[],
    input: string,
    appType: AppType
  ): ComplexityScores {
    return {
      featureComplexity: this.assessFeatureComplexity(features),
      technicalComplexity: this.assessTechnicalComplexity(features, input),
      scaleComplexity: this.assessScaleComplexity(input),
      integrationComplexity: this.assessIntegrationComplexity(features, input),
      appTypeComplexity: this.getAppTypeBaseComplexity(appType)
    };
  }

  /**
   * Assesses complexity based on features
   */
  private assessFeatureComplexity(features: Feature[]): number {
    let complexity = 0;

    // Base complexity from number of features
    complexity += Math.min(features.length * 0.5, 5);

    // Complexity from feature types
    features.forEach(feature => {
      const featureWeight = this.complexityWeights.featureTypes[feature.type] || 1;
      const priorityMultiplier = this.getPriorityMultiplier(feature.priority);
      complexity += featureWeight * priorityMultiplier;
    });

    // Complexity from feature dependencies
    const totalDependencies = features.reduce((sum, f) => sum + f.dependencies.length, 0);
    complexity += totalDependencies * 0.3;

    // Complexity from estimated effort
    const totalEffort = features.reduce((sum, f) => sum + f.estimatedEffort, 0);
    complexity += Math.min(totalEffort / 20, 8); // Normalize effort to complexity score

    return Math.min(complexity, 10);
  }

  /**
   * Assesses technical complexity indicators
   */
  private assessTechnicalComplexity(features: Feature[], input: string): number {
    let complexity = 0;

    // Advanced technology indicators
    const advancedTechPatterns = [
      'microservices', 'kubernetes', 'docker', 'serverless', 'lambda',
      'graphql', 'websocket', 'blockchain', 'ml', 'ai', 'machine learning',
      'real-time', 'streaming', 'big data', 'scalable', 'high availability'
    ];

    advancedTechPatterns.forEach(pattern => {
      if (input.includes(pattern)) {
        complexity += 1;
      }
    });

    // Multi-platform indicators
    const multiPlatformPatterns = [
      'mobile and web', 'cross-platform', 'ios and android', 'responsive',
      'pwa', 'progressive web app'
    ];

    multiPlatformPatterns.forEach(pattern => {
      if (input.includes(pattern)) {
        complexity += 1.5;
      }
    });

    // Integration complexity
    const hasRealTime = features.some(f => f.type === FeatureType.REAL_TIME);
    const hasAI = features.some(f => f.type === FeatureType.AI_INTEGRATION);
    const hasPayment = features.some(f => f.type === FeatureType.PAYMENT);
    const hasMultipleIntegrations = features.filter(f => f.type === FeatureType.API_INTEGRATION).length > 1;

    if (hasRealTime) complexity += 2;
    if (hasAI) complexity += 2.5;
    if (hasPayment) complexity += 2;
    if (hasMultipleIntegrations) complexity += 1.5;

    return Math.min(complexity, 10);
  }

  /**
   * Assesses scale complexity from requirements
   */
  private assessScaleComplexity(input: string): number {
    let complexity = 0;

    // Scale indicators
    const scalePatterns = {
      'million users': 4,
      'thousands of users': 2,
      'hundreds of users': 1,
      'high traffic': 3,
      'global': 2.5,
      'enterprise': 3,
      'scalable': 2,
      'load balancing': 2.5,
      'cdn': 1.5,
      'caching': 1
    };

    for (const [pattern, weight] of Object.entries(scalePatterns)) {
      if (input.includes(pattern)) {
        complexity += weight;
      }
    }

    // Performance requirements
    const performancePatterns = [
      'fast', 'performance', 'speed', 'optimization', 'responsive'
    ];

    performancePatterns.forEach(pattern => {
      if (input.includes(pattern)) {
        complexity += 0.5;
      }
    });

    return Math.min(complexity, 10);
  }

  /**
   * Assesses integration complexity
   */
  private assessIntegrationComplexity(features: Feature[], input: string): number {
    let complexity = 0;

    // Count external integrations
    const integrationFeatures = features.filter(f => 
      f.type === FeatureType.API_INTEGRATION ||
      f.type === FeatureType.PAYMENT ||
      f.type === FeatureType.AI_INTEGRATION ||
      f.type === FeatureType.EMAIL
    );

    complexity += integrationFeatures.length * 1.5;

    // Specific integration complexity
    const complexIntegrations = [
      'oauth', 'sso', 'saml', 'ldap', 'stripe', 'paypal',
      'aws', 'google cloud', 'azure', 'firebase',
      'elasticsearch', 'redis', 'mongodb'
    ];

    complexIntegrations.forEach(integration => {
      if (input.includes(integration)) {
        complexity += 1;
      }
    });

    // Multi-database complexity
    if (input.includes('database') && input.includes('cache')) {
      complexity += 1.5;
    }

    return Math.min(complexity, 10);
  }

  /**
   * Gets base complexity for app type
   */
  private getAppTypeBaseComplexity(appType: AppType): number {
    const baseComplexity = {
      [AppType.CLI_TOOL]: 1,
      [AppType.WEB_APP]: 2,
      [AppType.MOBILE_APP]: 2.5,
      [AppType.API_SERVICE]: 2,
      [AppType.DASHBOARD]: 2.5,
      [AppType.AUTOMATION]: 1.5,
      [AppType.GAME]: 3
    };

    return baseComplexity[appType] || 2;
  }

  /**
   * Gets priority multiplier for complexity calculation
   */
  private getPriorityMultiplier(priority: any): number {
    const priorityMap: Record<string, number> = {
      'must_have': 1.2,
      'should_have': 1.0,
      'nice_to_have': 0.8
    };

    return priorityMap[priority as string] || 1.0;
  }

  /**
   * Determines overall complexity level from scores
   */
  private determineComplexityLevel(scores: ComplexityScores): ComplexityLevel {
    // Calculate weighted average
    const weights = {
      featureComplexity: 0.3,
      technicalComplexity: 0.25,
      scaleComplexity: 0.2,
      integrationComplexity: 0.15,
      appTypeComplexity: 0.1
    };

    const weightedScore = 
      scores.featureComplexity * weights.featureComplexity +
      scores.technicalComplexity * weights.technicalComplexity +
      scores.scaleComplexity * weights.scaleComplexity +
      scores.integrationComplexity * weights.integrationComplexity +
      scores.appTypeComplexity * weights.appTypeComplexity;

    // Map to complexity levels
    if (weightedScore <= 2) {
      return ComplexityLevel.SIMPLE;
    } else if (weightedScore <= 4) {
      return ComplexityLevel.MODERATE;
    } else if (weightedScore <= 7) {
      return ComplexityLevel.COMPLEX;
    } else {
      return ComplexityLevel.ENTERPRISE;
    }
  }

  /**
   * Initializes complexity weights for different factors
   */
  private initializeComplexityWeights(): ComplexityWeights {
    return {
      featureTypes: {
        [FeatureType.AUTHENTICATION]: 1.5,
        [FeatureType.DATA_PERSISTENCE]: 1.0,
        [FeatureType.REAL_TIME]: 3.0,
        [FeatureType.AI_INTEGRATION]: 3.5,
        [FeatureType.PAYMENT]: 2.5,
        [FeatureType.SOCIAL]: 2.0,
        [FeatureType.ANALYTICS]: 2.0,
        [FeatureType.SEARCH]: 1.5,
        [FeatureType.FILE_UPLOAD]: 1.5,
        [FeatureType.NOTIFICATIONS]: 1.5,
        [FeatureType.EMAIL]: 1.0,
        [FeatureType.API_INTEGRATION]: 2.0
      }
    };
  }

  /**
   * Gets detailed complexity assessment with reasoning
   */
  async getDetailedAssessment(
    features: Feature[],
    input: string,
    appType: AppType
  ): Promise<DetailedComplexityAssessment> {
    const scores = this.calculateComplexityScores(features, input, appType);
    const level = this.determineComplexityLevel(scores);
    
    const factors: string[] = [];
    const recommendations: string[] = [];

    // Analyze each dimension
    if (scores.featureComplexity > 3) {
      factors.push(`High feature complexity (${features.length} features with complex interactions)`);
      recommendations.push('Consider implementing features in phases');
    }

    if (scores.technicalComplexity > 3) {
      factors.push('Advanced technical requirements detected');
      recommendations.push('Ensure team has expertise in advanced technologies');
    }

    if (scores.scaleComplexity > 2) {
      factors.push('High scale requirements');
      recommendations.push('Plan for scalable architecture from the start');
    }

    if (scores.integrationComplexity > 2) {
      factors.push('Multiple external integrations required');
      recommendations.push('Research API limitations and plan integration testing');
    }

    // Calculate time estimates
    const totalEffort = features.reduce((sum, f) => sum + f.estimatedEffort, 0);
    const timelineEstimate = this.calculateTimelineEstimate(level, totalEffort);

    return {
      level,
      scores,
      factors,
      recommendations,
      estimatedTimelineWeeks: timelineEstimate,
      riskFactors: this.identifyRiskFactors(features, input)
    };
  }

  /**
   * Calculates timeline estimate based on complexity
   */
  private calculateTimelineEstimate(level: ComplexityLevel, totalEffort: number): number {
    const baseMultipliers = {
      [ComplexityLevel.SIMPLE]: 1.0,
      [ComplexityLevel.MODERATE]: 1.3,
      [ComplexityLevel.COMPLEX]: 1.6,
      [ComplexityLevel.ENTERPRISE]: 2.0
    };

    const baseWeeks = Math.ceil(totalEffort / 40); // 40 hours per week
    return Math.ceil(baseWeeks * baseMultipliers[level]);
  }

  /**
   * Identifies potential risk factors
   */
  private identifyRiskFactors(features: Feature[], input: string): string[] {
    const risks: string[] = [];

    // Feature-based risks
    if (features.some(f => f.type === FeatureType.REAL_TIME)) {
      risks.push('Real-time features may require complex infrastructure');
    }

    if (features.some(f => f.type === FeatureType.AI_INTEGRATION)) {
      risks.push('AI integration may have unpredictable costs and performance');
    }

    if (features.some(f => f.type === FeatureType.PAYMENT)) {
      risks.push('Payment processing requires security compliance (PCI DSS)');
    }

    // Technical risks
    if (input.includes('scalable') || input.includes('million')) {
      risks.push('Scale requirements may require significant infrastructure investment');
    }

    if (input.includes('mobile') && input.includes('web')) {
      risks.push('Multi-platform development increases complexity and testing requirements');
    }

    return risks;
  }
}

interface ComplexityWeights {
  featureTypes: Record<FeatureType, number>;
}

interface ComplexityScores {
  featureComplexity: number;
  technicalComplexity: number;
  scaleComplexity: number;
  integrationComplexity: number;
  appTypeComplexity: number;
}

export interface DetailedComplexityAssessment {
  level: ComplexityLevel;
  scores: ComplexityScores;
  factors: string[];
  recommendations: string[];
  estimatedTimelineWeeks: number;
  riskFactors: string[];
}
