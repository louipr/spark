// Feature Detector - Detects features from natural language descriptions

import {
  Feature,
  FeatureType,
  Priority,
  ComplexityLevel,
  AppType
} from '../../models/index.js';

export class FeatureDetector {
  private featurePatterns: Map<FeatureType, FeaturePattern>;

  constructor() {
    this.featurePatterns = this.initializeFeaturePatterns();
  }

  /**
   * Detects features from the input text
   */
  async detectFeatures(
    input: string,
    appType: AppType,
    keywords: string[]
  ): Promise<Feature[]> {
    const detectedFeatures: Feature[] = [];
    
    for (const [featureType, pattern] of this.featurePatterns) {
      const confidence = this.calculateFeatureConfidence(input, pattern, appType);
      
      if (confidence >= pattern.minConfidence) {
        const feature = this.createFeature(featureType, pattern, confidence, input);
        detectedFeatures.push(feature);
      }
    }

    // Add context-specific features based on app type
    const contextFeatures = this.detectContextualFeatures(input, appType, keywords);
    detectedFeatures.push(...contextFeatures);

    // Remove duplicates and sort by priority
    const uniqueFeatures = this.deduplicateFeatures(detectedFeatures);
    return uniqueFeatures.sort((a, b) => this.comparePriority(a.priority, b.priority));
  }

  /**
   * Initializes feature detection patterns
   */
  private initializeFeaturePatterns(): Map<FeatureType, FeaturePattern> {
    const patterns = new Map<FeatureType, FeaturePattern>();

    patterns.set(FeatureType.AUTHENTICATION, {
      keywords: ['login', 'signup', 'register', 'auth', 'password', 'user', 'account', 'profile'],
      phrases: ['user authentication', 'sign in', 'sign up', 'create account', 'user login'],
      complexity: ComplexityLevel.MODERATE,
      priority: Priority.MUST_HAVE,
      minConfidence: 0.6,
      dependencies: [],
      estimatedEffort: 16
    });

    patterns.set(FeatureType.DATA_PERSISTENCE, {
      keywords: ['save', 'store', 'database', 'persist', 'data', 'record', 'crud'],
      phrases: ['save data', 'store information', 'database', 'data storage'],
      complexity: ComplexityLevel.MODERATE,
      priority: Priority.MUST_HAVE,
      minConfidence: 0.5,
      dependencies: [],
      estimatedEffort: 12
    });

    patterns.set(FeatureType.REAL_TIME, {
      keywords: ['real-time', 'live', 'instant', 'websocket', 'push', 'notification', 'chat'],
      phrases: ['real time', 'live updates', 'instant messaging', 'push notifications'],
      complexity: ComplexityLevel.COMPLEX,
      priority: Priority.SHOULD_HAVE,
      minConfidence: 0.7,
      dependencies: ['data_persistence'],
      estimatedEffort: 24
    });

    patterns.set(FeatureType.AI_INTEGRATION, {
      keywords: ['ai', 'artificial intelligence', 'ml', 'machine learning', 'gpt', 'chatbot', 'recommendation'],
      phrases: ['ai integration', 'machine learning', 'chatbot', 'recommendations'],
      complexity: ComplexityLevel.COMPLEX,
      priority: Priority.NICE_TO_HAVE,
      minConfidence: 0.8,
      dependencies: ['data_persistence'],
      estimatedEffort: 32
    });

    patterns.set(FeatureType.PAYMENT, {
      keywords: ['payment', 'pay', 'checkout', 'stripe', 'paypal', 'billing', 'subscription', 'price'],
      phrases: ['payment processing', 'online payments', 'checkout', 'billing system'],
      complexity: ComplexityLevel.COMPLEX,
      priority: Priority.SHOULD_HAVE,
      minConfidence: 0.8,
      dependencies: ['authentication', 'data_persistence'],
      estimatedEffort: 28
    });

    patterns.set(FeatureType.SOCIAL, {
      keywords: ['social', 'share', 'like', 'comment', 'follow', 'friend', 'post', 'feed'],
      phrases: ['social features', 'social media', 'sharing', 'social network'],
      complexity: ComplexityLevel.MODERATE,
      priority: Priority.SHOULD_HAVE,
      minConfidence: 0.6,
      dependencies: ['authentication', 'data_persistence'],
      estimatedEffort: 20
    });

    patterns.set(FeatureType.ANALYTICS, {
      keywords: ['analytics', 'metrics', 'tracking', 'stats', 'report', 'dashboard', 'insight'],
      phrases: ['analytics', 'user tracking', 'performance metrics', 'reporting'],
      complexity: ComplexityLevel.MODERATE,
      priority: Priority.NICE_TO_HAVE,
      minConfidence: 0.6,
      dependencies: ['data_persistence'],
      estimatedEffort: 16
    });

    patterns.set(FeatureType.SEARCH, {
      keywords: ['search', 'find', 'filter', 'query', 'lookup', 'discover'],
      phrases: ['search functionality', 'search feature', 'find items'],
      complexity: ComplexityLevel.MODERATE,
      priority: Priority.SHOULD_HAVE,
      minConfidence: 0.5,
      dependencies: ['data_persistence'],
      estimatedEffort: 14
    });

    patterns.set(FeatureType.FILE_UPLOAD, {
      keywords: ['upload', 'file', 'image', 'photo', 'document', 'attachment', 'media'],
      phrases: ['file upload', 'image upload', 'file sharing', 'document management'],
      complexity: ComplexityLevel.MODERATE,
      priority: Priority.SHOULD_HAVE,
      minConfidence: 0.7,
      dependencies: ['data_persistence'],
      estimatedEffort: 18
    });

    patterns.set(FeatureType.NOTIFICATIONS, {
      keywords: ['notification', 'alert', 'notify', 'remind', 'email', 'push'],
      phrases: ['notifications', 'email notifications', 'push notifications', 'alerts'],
      complexity: ComplexityLevel.MODERATE,
      priority: Priority.SHOULD_HAVE,
      minConfidence: 0.6,
      dependencies: ['authentication'],
      estimatedEffort: 16
    });

    patterns.set(FeatureType.EMAIL, {
      keywords: ['email', 'mail', 'send', 'newsletter', 'smtp'],
      phrases: ['email system', 'send emails', 'email notifications'],
      complexity: ComplexityLevel.MODERATE,
      priority: Priority.SHOULD_HAVE,
      minConfidence: 0.7,
      dependencies: ['authentication'],
      estimatedEffort: 12
    });

    patterns.set(FeatureType.API_INTEGRATION, {
      keywords: ['api', 'integration', 'third-party', 'external', 'service', 'webhook'],
      phrases: ['api integration', 'third party integration', 'external services'],
      complexity: ComplexityLevel.MODERATE,
      priority: Priority.SHOULD_HAVE,
      minConfidence: 0.6,
      dependencies: [],
      estimatedEffort: 20
    });

    return patterns;
  }

  /**
   * Calculates confidence score for a feature based on pattern matching
   */
  private calculateFeatureConfidence(
    input: string,
    pattern: FeaturePattern,
    appType: AppType
  ): number {
    let confidence = 0;

    // Keyword matching
    const keywordMatches = pattern.keywords.filter(keyword => 
      input.includes(keyword.toLowerCase())
    );
    confidence += keywordMatches.length * 0.1;

    // Phrase matching (higher weight)
    const phraseMatches = pattern.phrases.filter(phrase => 
      input.includes(phrase.toLowerCase())
    );
    confidence += phraseMatches.length * 0.2;

    // App type relevance bonus
    const relevanceBonus = this.getAppTypeRelevance(pattern, appType);
    confidence += relevanceBonus;

    return Math.min(confidence, 1.0);
  }

  /**
   * Gets relevance bonus based on app type
   */
  private getAppTypeRelevance(pattern: FeaturePattern, appType: AppType): number {
    // Different features are more relevant to different app types
    const relevanceMap: Partial<Record<AppType, Partial<Record<FeatureType, number>>>> = {
      [AppType.WEB_APP]: {
        [FeatureType.AUTHENTICATION]: 0.2,
        [FeatureType.DATA_PERSISTENCE]: 0.2,
        [FeatureType.SEARCH]: 0.1,
        [FeatureType.FILE_UPLOAD]: 0.1
      },
      [AppType.MOBILE_APP]: {
        [FeatureType.NOTIFICATIONS]: 0.2,
        [FeatureType.AUTHENTICATION]: 0.2,
        [FeatureType.REAL_TIME]: 0.1
      },
      [AppType.DASHBOARD]: {
        [FeatureType.ANALYTICS]: 0.3,
        [FeatureType.DATA_PERSISTENCE]: 0.2,
        [FeatureType.AUTHENTICATION]: 0.1
      },
      [AppType.API_SERVICE]: {
        [FeatureType.API_INTEGRATION]: 0.3,
        [FeatureType.AUTHENTICATION]: 0.2,
        [FeatureType.DATA_PERSISTENCE]: 0.2
      }
    };

    // Find the feature type for this pattern
    for (const [featureType, featurePattern] of this.featurePatterns) {
      if (featurePattern === pattern) {
        return relevanceMap[appType]?.[featureType] || 0;
      }
    }

    return 0;
  }

  /**
   * Creates a feature object from detected patterns
   */
  private createFeature(
    type: FeatureType,
    pattern: FeaturePattern,
    confidence: number,
    input: string
  ): Feature {
    return {
      name: this.getFeatureName(type),
      type,
      priority: pattern.priority,
      complexity: pattern.complexity,
      dependencies: pattern.dependencies,
      estimatedEffort: pattern.estimatedEffort,
      description: this.generateFeatureDescription(type, input),
      acceptanceCriteria: this.generateAcceptanceCriteria(type)
    };
  }

  /**
   * Gets human-readable name for feature type
   */
  private getFeatureName(type: FeatureType): string {
    const nameMap = {
      [FeatureType.AUTHENTICATION]: 'User Authentication',
      [FeatureType.DATA_PERSISTENCE]: 'Data Storage',
      [FeatureType.REAL_TIME]: 'Real-time Updates',
      [FeatureType.AI_INTEGRATION]: 'AI Integration',
      [FeatureType.PAYMENT]: 'Payment Processing',
      [FeatureType.SOCIAL]: 'Social Features',
      [FeatureType.ANALYTICS]: 'Analytics & Reporting',
      [FeatureType.SEARCH]: 'Search Functionality',
      [FeatureType.FILE_UPLOAD]: 'File Upload',
      [FeatureType.NOTIFICATIONS]: 'Notifications',
      [FeatureType.EMAIL]: 'Email System',
      [FeatureType.API_INTEGRATION]: 'API Integration'
    };

    return nameMap[type] || type;
  }

  /**
   * Generates description for detected feature
   */
  private generateFeatureDescription(type: FeatureType, input: string): string {
    const baseDescriptions = {
      [FeatureType.AUTHENTICATION]: 'Secure user registration, login, and session management system',
      [FeatureType.DATA_PERSISTENCE]: 'Database integration for storing and retrieving application data',
      [FeatureType.REAL_TIME]: 'Real-time updates and live data synchronization',
      [FeatureType.AI_INTEGRATION]: 'Integration with AI services for intelligent features',
      [FeatureType.PAYMENT]: 'Secure payment processing and transaction management',
      [FeatureType.SOCIAL]: 'Social networking features like sharing, following, and interactions',
      [FeatureType.ANALYTICS]: 'Analytics tracking and reporting dashboard',
      [FeatureType.SEARCH]: 'Search and filtering capabilities for finding content',
      [FeatureType.FILE_UPLOAD]: 'File upload, storage, and management system',
      [FeatureType.NOTIFICATIONS]: 'Push notifications and alert system',
      [FeatureType.EMAIL]: 'Email sending and management capabilities',
      [FeatureType.API_INTEGRATION]: 'Integration with external APIs and services'
    };

    return baseDescriptions[type] || `${type} functionality`;
  }

  /**
   * Generates acceptance criteria for feature
   */
  private generateAcceptanceCriteria(type: FeatureType): string[] {
    const criteriaMap: Partial<Record<FeatureType, string[]>> = {
      [FeatureType.AUTHENTICATION]: [
        'Users can register with email and password',
        'Users can log in securely',
        'User sessions are managed properly',
        'Password reset functionality is available'
      ],
      [FeatureType.DATA_PERSISTENCE]: [
        'Data is saved reliably to database',
        'Data can be retrieved efficiently',
        'Database operations handle errors gracefully',
        'Data integrity is maintained'
      ],
      [FeatureType.REAL_TIME]: [
        'Updates are pushed to users immediately',
        'Connection is maintained reliably',
        'Multiple users can receive updates simultaneously',
        'System handles connection drops gracefully'
      ],
      [FeatureType.PAYMENT]: [
        'Payment processing is secure and PCI compliant',
        'Multiple payment methods are supported',
        'Transaction confirmations are sent',
        'Failed payments are handled properly'
      ],
      [FeatureType.SEARCH]: [
        'Users can search by relevant criteria',
        'Search results are accurate and fast',
        'Search supports filtering and sorting',
        'Search handles typos and partial matches'
      ]
    };

    return criteriaMap[type] || ['Feature functions as expected', 'Feature is tested thoroughly'];
  }

  /**
   * Detects contextual features based on app type and domain
   */
  private detectContextualFeatures(
    input: string,
    appType: AppType,
    keywords: string[]
  ): Feature[] {
    const contextFeatures: Feature[] = [];

    // Add common features based on app type
    if (appType === AppType.WEB_APP || appType === AppType.MOBILE_APP) {
      // Most apps need authentication and data persistence
      if (!this.hasFeatureKeywords(input, ['login', 'auth', 'user'])) {
        // Don't auto-add if user explicitly mentions no auth needed
        if (!input.includes('no login') && !input.includes('no auth')) {
          // Only suggest if app seems to need user-specific features
          if (this.needsAuthentication(input, keywords)) {
            const authFeature = this.createFeature(
              FeatureType.AUTHENTICATION,
              this.featurePatterns.get(FeatureType.AUTHENTICATION)!,
              0.5,
              input
            );
            authFeature.priority = Priority.SHOULD_HAVE; // Lower priority for auto-detected
            contextFeatures.push(authFeature);
          }
        }
      }
    }

    return contextFeatures;
  }

  /**
   * Checks if input contains keywords for a feature type
   */
  private hasFeatureKeywords(input: string, keywords: string[]): boolean {
    return keywords.some(keyword => input.includes(keyword.toLowerCase()));
  }

  /**
   * Determines if an app likely needs authentication
   */
  private needsAuthentication(input: string, keywords: string[]): boolean {
    const authIndicators = [
      'personal', 'profile', 'account', 'save', 'my', 'custom',
      'dashboard', 'admin', 'manage', 'social', 'comment'
    ];
    
    return authIndicators.some(indicator => 
      input.includes(indicator) || keywords.includes(indicator)
    );
  }

  /**
   * Removes duplicate features
   */
  private deduplicateFeatures(features: Feature[]): Feature[] {
    const seen = new Set<FeatureType>();
    return features.filter(feature => {
      if (seen.has(feature.type)) {
        return false;
      }
      seen.add(feature.type);
      return true;
    });
  }

  /**
   * Compares priority for sorting
   */
  private comparePriority(a: Priority, b: Priority): number {
    const priorityOrder = {
      [Priority.MUST_HAVE]: 0,
      [Priority.SHOULD_HAVE]: 1,
      [Priority.NICE_TO_HAVE]: 2
    };

    return priorityOrder[a] - priorityOrder[b];
  }
}

interface FeaturePattern {
  keywords: string[];
  phrases: string[];
  complexity: ComplexityLevel;
  priority: Priority;
  minConfidence: number;
  dependencies: string[];
  estimatedEffort: number; // hours
}
