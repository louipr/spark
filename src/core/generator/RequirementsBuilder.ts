// Requirements Builder - Converts features into structured functional requirements

import {
  Feature,
  FunctionalRequirement,
  Priority,
  FeatureType,
  ComplexityLevel
} from '../../models/index.js';

export class RequirementsBuilder {

  /**
   * Builds functional requirements from features
   */
  async buildFunctionalRequirements(features: Feature[]): Promise<FunctionalRequirement[]> {
    const requirements: FunctionalRequirement[] = [];

    for (const feature of features) {
      const requirement = await this.buildRequirementFromFeature(feature);
      requirements.push(requirement);
      
      // Add additional requirements for complex features
      if (feature.complexity === ComplexityLevel.COMPLEX || feature.complexity === ComplexityLevel.ENTERPRISE) {
        const additionalReqs = this.generateAdditionalRequirements(feature);
        requirements.push(...additionalReqs);
      }
    }

    // Add cross-cutting requirements
    const crossCuttingReqs = this.generateCrossCuttingRequirements(features);
    requirements.push(...crossCuttingReqs);

    return requirements;
  }

  /**
   * Converts a single feature into a functional requirement
   */
  private async buildRequirementFromFeature(feature: Feature): Promise<FunctionalRequirement> {
    const userStories = this.generateUserStories(feature);
    
    return {
      id: `REQ-${feature.type.toUpperCase()}-${Date.now()}`,
      title: feature.name,
      description: feature.description,
      priority: feature.priority,
      acceptanceCriteria: feature.acceptanceCriteria || this.generateAcceptanceCriteria(feature),
      dependencies: feature.dependencies || [],
      userStory: userStories.length > 0 ? `As a ${userStories[0].role}, I want to ${userStories[0].goal} so that ${userStories[0].reason}` : `User can ${feature.name.toLowerCase()}`,
      businessRules: this.generateBusinessRules(feature)
    };
  }

  /**
   * Gets feature type templates for requirement generation
   */
  private getFeatureTypeTemplates(): Partial<Record<FeatureType | 'default', any>> {
    return {
      [FeatureType.AUTHENTICATION]: {
        category: 'User Management',
        businessRules: [
          'Users must provide valid email addresses',
          'Passwords must meet security requirements',
          'Failed login attempts must be rate limited'
        ],
        testingConsiderations: [
          'Test with valid and invalid credentials',
          'Verify password strength requirements',
          'Test session management and logout'
        ]
      },
      [FeatureType.DATA_PERSISTENCE]: {
        category: 'Data Management',
        businessRules: [
          'Data must be validated before storage',
          'Audit trails must be maintained for data changes',
          'Data integrity constraints must be enforced'
        ],
        testingConsiderations: [
          'Test CRUD operations for all entities',
          'Verify data validation rules',
          'Test data migration and backup processes'
        ]
      },
      [FeatureType.API_INTEGRATION]: {
        category: 'Integration',
        businessRules: [
          'API calls must handle rate limiting',
          'Error responses must be properly handled',
          'API keys must be securely managed'
        ],
        testingConsiderations: [
          'Test API connectivity and response handling',
          'Mock external API calls for testing',
          'Test error scenarios and retry logic'
        ]
      },
      [FeatureType.FILE_UPLOAD]: {
        category: 'File Management',
        businessRules: [
          'File types must be validated',
          'File size limits must be enforced',
          'Uploaded files must be scanned for security'
        ],
        testingConsiderations: [
          'Test various file formats and sizes',
          'Test upload progress and cancellation',
          'Verify file storage and retrieval'
        ]
      },
      [FeatureType.SEARCH]: {
        category: 'Search & Discovery',
        businessRules: [
          'Search results must be relevant and ranked',
          'Search queries must be logged for analytics',
          'Search must support filters and facets'
        ],
        testingConsiderations: [
          'Test search accuracy and performance',
          'Test filters and sorting options',
          'Test search with special characters'
        ]
      },
      [FeatureType.NOTIFICATIONS]: {
        category: 'Communication',
        businessRules: [
          'Users must be able to control notification preferences',
          'Notifications must be delivered reliably',
          'Critical notifications must have fallback channels'
        ],
        testingConsiderations: [
          'Test notification delivery across channels',
          'Test user preference settings',
          'Test notification formatting and content'
        ]
      },
      [FeatureType.PAYMENT]: {
        category: 'Financial',
        businessRules: [
          'Payment processing must be PCI compliant',
          'Failed payments must be properly handled',
          'Refunds must follow business policies'
        ],
        testingConsiderations: [
          'Test payment processing with test cards',
          'Test payment failure scenarios',
          'Test refund and chargeback processes'
        ]
      },
      [FeatureType.ANALYTICS]: {
        category: 'Analytics & Reporting',
        businessRules: [
          'User privacy must be maintained in analytics',
          'Analytics data must be anonymized where required',
          'Data retention policies must be followed'
        ],
        testingConsiderations: [
          'Test event tracking and data collection',
          'Test analytics dashboard functionality',
          'Test data privacy and anonymization'
        ]
      },
      [FeatureType.SOCIAL]: {
        category: 'Social Features',
        businessRules: [
          'User-generated content must be moderated',
          'Social connections must be mutual where appropriate',
          'Privacy settings must be respected'
        ],
        testingConsiderations: [
          'Test social interactions and content sharing',
          'Test privacy controls and blocking',
          'Test content moderation workflows'
        ]
      },
      [FeatureType.REAL_TIME]: {
        category: 'Real-time Features',
        businessRules: [
          'Real-time updates must be delivered promptly',
          'Connection failures must be handled gracefully',
          'Message ordering must be maintained'
        ],
        testingConsiderations: [
          'Test real-time message delivery',
          'Test connection handling and reconnection',
          'Test concurrent user scenarios'
        ]
      },
      [FeatureType.AI_INTEGRATION]: {
        category: 'AI Features',
        businessRules: [
          'AI responses must be appropriate and safe',
          'User data privacy must be maintained',
          'AI model performance must be monitored'
        ],
        testingConsiderations: [
          'Test AI response quality and accuracy',
          'Test handling of edge cases',
          'Test performance under load'
        ]
      },
      [FeatureType.EMAIL]: {
        category: 'Communication',
        businessRules: [
          'Email delivery must be reliable',
          'Email content must be properly formatted',
          'Unsubscribe options must be provided'
        ],
        testingConsiderations: [
          'Test email delivery and formatting',
          'Test unsubscribe functionality',
          'Test email bounce handling'
        ]
      },
      default: {
        category: 'General',
        businessRules: [
          'Feature must meet specified requirements',
          'Performance standards must be maintained',
          'Error handling must be comprehensive'
        ],
        testingConsiderations: [
          'Test feature functionality',
          'Test error scenarios',
          'Test performance under load'
        ]
      }
    };
  }

  /**
   * Maps feature type to requirement category
   */
  private mapFeatureTypeToCategory(featureType: FeatureType): string {
    const categoryMap: Partial<Record<FeatureType, string>> = {
      [FeatureType.AUTHENTICATION]: 'Security',
      [FeatureType.DATA_PERSISTENCE]: 'Data Management',
      [FeatureType.API_INTEGRATION]: 'Integration',
      [FeatureType.FILE_UPLOAD]: 'File Management',
      [FeatureType.SEARCH]: 'Search & Discovery',
      [FeatureType.NOTIFICATIONS]: 'Communication',
      [FeatureType.PAYMENT]: 'Financial',
      [FeatureType.ANALYTICS]: 'Analytics',
      [FeatureType.SOCIAL]: 'Social',
      [FeatureType.REAL_TIME]: 'Real-time',
      [FeatureType.AI_INTEGRATION]: 'AI Features',
      [FeatureType.EMAIL]: 'Communication'
    };

    return categoryMap[featureType] || 'General';
  }

  /**
   * Generates acceptance criteria for a feature
   */
  private generateAcceptanceCriteria(feature: Feature): string[] {
    const baseTemplate = this.getFeatureTypeTemplates()[feature.type]?.acceptanceCriteria || [
      `Given a user wants to use ${feature.name}`,
      `When they perform the required actions`,
      `Then the ${feature.name.toLowerCase()} should function as expected`
    ];

    // Add complexity-specific criteria
    if (feature.complexity === ComplexityLevel.COMPLEX || feature.complexity === ComplexityLevel.ENTERPRISE) {
      return [
        ...baseTemplate,
        'Performance requirements must be met under expected load',
        'Error handling must provide clear user feedback',
        'Feature must integrate properly with existing functionality'
      ];
    }

    return baseTemplate;
  }

  /**
   * Generates business rules for a feature
   */
  private generateBusinessRules(feature: Feature): string[] {
    const template = this.getFeatureTypeTemplates()[feature.type];
    return template?.businessRules || [
      `${feature.name} must comply with business requirements`,
      'Data integrity must be maintained',
      'User permissions must be respected'
    ];
  }

  /**
   * Generates user stories for a feature
   */
  private generateUserStories(feature: Feature): Array<{
    id: string;
    role: string;
    goal: string;
    reason: string;
    acceptanceCriteria: string[];
  }> {
    return [
      {
        id: `US-${feature.type}-001`,
        role: 'user',
        goal: `use ${feature.name.toLowerCase()}`,
        reason: feature.description,
        acceptanceCriteria: this.generateAcceptanceCriteria(feature)
      }
    ];
  }

  /**
   * Generates mockup requirements for a feature
   */
  private generateMockupRequirements(feature: Feature): Array<{
    id: string;
    type: 'wireframe' | 'prototype' | 'mockup';
    description: string;
    priority: Priority;
  }> {
    const hasUI = this.featureRequiresUI(feature.type);
    
    if (!hasUI) {
      return [];
    }

    return [
      {
        id: `MOCK-${feature.type}-001`,
        type: 'wireframe',
        description: `Wireframe for ${feature.name} user interface`,
        priority: Priority.SHOULD_HAVE
      },
      {
        id: `MOCK-${feature.type}-002`,
        type: 'mockup',
        description: `High-fidelity mockup for ${feature.name}`,
        priority: Priority.SHOULD_HAVE
      }
    ];
  }

  /**
   * Generates testing considerations for a feature
   */
  private generateTestingConsiderations(feature: Feature): string[] {
    const template = this.getFeatureTypeTemplates()[feature.type];
    const baseConsiderations = template?.testingConsiderations || [
      `Test ${feature.name.toLowerCase()} functionality`,
      'Test error scenarios and edge cases',
      'Test performance under expected load'
    ];

    // Add security considerations for sensitive features
    if (this.isSecuritySensitiveFeature(feature.type)) {
      baseConsiderations.push(
        'Test security vulnerabilities and access controls',
        'Test data protection and privacy compliance'
      );
    }

    return baseConsiderations;
  }

  /**
   * Generates additional requirements for complex features
   */
  private generateAdditionalRequirements(feature: Feature): FunctionalRequirement[] {
    const additionalReqs: FunctionalRequirement[] = [];

    // Add monitoring requirement for complex features
    if (feature.complexity === ComplexityLevel.COMPLEX || feature.complexity === ComplexityLevel.ENTERPRISE) {
      additionalReqs.push({
        id: `REQ-MONITOR-${feature.type}`,
        title: `${feature.name} Monitoring`,
        description: `Implement comprehensive monitoring and logging for ${feature.name}`,
        priority: Priority.SHOULD_HAVE,
        acceptanceCriteria: [
          'Metrics collection is implemented',
          'Error logging captures sufficient detail',
          'Performance monitoring tracks key indicators',
          'Alerts are configured for critical issues'
        ],
        dependencies: ['Monitoring infrastructure'],
        userStory: 'As a system administrator, I want to monitor feature performance so that I can ensure optimal system operation',
        businessRules: [
          'Monitoring must not impact performance significantly',
          'Sensitive data must not be logged',
          'Monitoring data must follow retention policies'
        ]
      });
    }

    // Add caching requirement for data-intensive features
    if (this.requiresCaching(feature.type)) {
      additionalReqs.push({
        id: `REQ-CACHE-${feature.type}`,
        title: `${feature.name} Caching`,
        description: `Implement caching strategy for ${feature.name} to improve performance`,
        priority: Priority.SHOULD_HAVE,
        acceptanceCriteria: [
          'Cache hit ratio meets performance targets',
          'Cache invalidation works correctly',
          'Cache misses are handled gracefully'
        ],
        dependencies: ['Caching infrastructure'],
        userStory: 'As a user, I want fast response times so that I can work efficiently',
        businessRules: [
          'Cache must maintain data consistency',
          'Cache expiration policies must be appropriate',
          'Cache size must be managed effectively'
        ]
      });
    }

    return additionalReqs;
  }

  /**
   * Generates cross-cutting requirements that apply to multiple features
   */
  private generateCrossCuttingRequirements(features: Feature[]): FunctionalRequirement[] {
    const crossCuttingReqs: FunctionalRequirement[] = [];

    // Add security requirements if needed
    if (features.some(f => this.isSecuritySensitiveFeature(f.type))) {
      crossCuttingReqs.push({
        id: 'REQ-SECURITY-001',
        title: 'Security Framework',
        description: 'Implement comprehensive security framework for the application',
        priority: Priority.MUST_HAVE,
        acceptanceCriteria: [
          'Authentication and authorization are implemented',
          'Input validation is applied consistently',
          'Security headers are configured',
          'Sensitive data is properly protected'
        ],
        dependencies: [],
        userStory: 'As a user, I want my data protected so that my privacy and security are maintained',
        businessRules: [
          'Security measures must not significantly impact user experience',
          'Security policies must be consistently applied',
          'Security incidents must be properly logged and reported'
        ]
      });
    }

    // Add logging requirements
    crossCuttingReqs.push({
      id: 'REQ-LOGGING-001',
      title: 'Application Logging',
      description: 'Implement comprehensive logging throughout the application',
      priority: Priority.MUST_HAVE,
      acceptanceCriteria: [
        'All critical operations are logged',
        'Log levels are appropriately configured',
        'Log aggregation and search are available',
        'Log rotation and retention policies are implemented'
      ],
      dependencies: ['Logging infrastructure'],
      userStory: 'As a system administrator, I want comprehensive logging so that I can troubleshoot issues effectively',
      businessRules: [
        'Sensitive information must not be logged',
        'Log retention must comply with policies',
        'Log access must be controlled and audited'
      ]
    });

    // Add error handling requirements
    crossCuttingReqs.push({
      id: 'REQ-ERROR-001',
      title: 'Error Handling Framework',
      description: 'Implement consistent error handling throughout the application',
      priority: Priority.MUST_HAVE,
      acceptanceCriteria: [
        'All errors are properly caught and handled',
        'Error messages are user-friendly',
        'Technical errors are logged with sufficient detail',
        'Error recovery mechanisms are implemented where appropriate'
      ],
      dependencies: [],
      userStory: 'As a user, I want to understand what went wrong when errors occur so that I can resolve issues effectively',
      businessRules: [
        'Error messages must not expose sensitive information',
        'Critical errors must trigger appropriate alerts',
        'Error handling must maintain system stability'
      ]
    });

    return crossCuttingReqs;
  }

  /**
   * Checks if a feature type requires UI components
   */
  private featureRequiresUI(featureType: FeatureType): boolean {
    const nonUIFeatures = [
      FeatureType.API_INTEGRATION,
      FeatureType.DATA_PERSISTENCE,
      FeatureType.ANALYTICS
    ];
    
    return !nonUIFeatures.includes(featureType);
  }

  /**
   * Checks if a feature type is security sensitive
   */
  private isSecuritySensitiveFeature(featureType: FeatureType): boolean {
    const securitySensitive = [
      FeatureType.AUTHENTICATION,
      FeatureType.PAYMENT,
      FeatureType.FILE_UPLOAD,
      FeatureType.DATA_PERSISTENCE
    ];
    
    return securitySensitive.includes(featureType);
  }

  /**
   * Checks if a feature type requires caching
   */
  private requiresCaching(featureType: FeatureType): boolean {
    const cachingFeatures = [
      FeatureType.SEARCH,
      FeatureType.ANALYTICS,
      FeatureType.API_INTEGRATION
    ];
    
    return cachingFeatures.includes(featureType);
  }
}
