// Validation Engine - Comprehensive validation for PRDs and workflow states

import {
  PRD,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  UserRequest,
  ComplexityLevel,
  Priority,
  FunctionalRequirement,
  TechnicalSpec,
  ErrorType
} from '../../models/index.js';

export interface ValidationConfig {
  strictMode: boolean;
  requiredSections: string[];
  minRequirements: number;
  maxRequirements: number;
  requireTechStack: boolean;
  requireTestingStrategy: boolean;
  customValidators: ValidationRule[];
}

export interface ValidationRule {
  name: string;
  description: string;
  validate: (prd: PRD) => ValidationResult;
  severity: 'error' | 'warning';
  category: 'structure' | 'content' | 'business' | 'technical';
}

export interface ValidationReport {
  overall: ValidationResult;
  sections: Record<string, ValidationResult>;
  recommendations: string[];
  completeness: number;
  qualityScore: number;
  estimatedEffort: string;
}

export class ValidationEngine {
  private config: ValidationConfig;
  private builtInRules: ValidationRule[];

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = {
      strictMode: false,
      requiredSections: ['metadata', 'productOverview', 'functionalRequirements'],
      minRequirements: 3,
      maxRequirements: 50,
      requireTechStack: true,
      requireTestingStrategy: false,
      customValidators: [],
      ...config
    };

    this.builtInRules = this.initializeBuiltInRules();
  }

  /**
   * Validate a complete PRD
   */
  async validatePRD(prd: PRD): Promise<ValidationReport> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const sectionResults: Record<string, ValidationResult> = {};

    // Validate each section
    sectionResults.metadata = this.validateMetadata(prd.metadata);
    sectionResults.productOverview = this.validateProductOverview(prd.productOverview);
    sectionResults.functionalRequirements = this.validateFunctionalRequirements(prd.functionalRequirements);
    sectionResults.technicalSpecifications = this.validateTechnicalSpec(prd.technicalSpecifications);

    // Collect all errors and warnings
    for (const result of Object.values(sectionResults)) {
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }

    // Run built-in validation rules
    for (const rule of this.builtInRules) {
      const ruleResult = rule.validate(prd);
      
      if (rule.severity === 'error') {
        errors.push(...ruleResult.errors);
      } else {
        warnings.push(...ruleResult.warnings);
      }
    }

    // Run custom validation rules
    for (const rule of this.config.customValidators) {
      const ruleResult = rule.validate(prd);
      
      if (rule.severity === 'error') {
        errors.push(...ruleResult.errors);
      } else {
        warnings.push(...ruleResult.warnings);
      }
    }

    // Calculate metrics
    const completeness = this.calculateCompleteness(prd, sectionResults);
    const qualityScore = this.calculateQualityScore(prd, errors, warnings);
    const estimatedEffort = this.estimateEffort(prd);

    // Generate recommendations
    const recommendations = this.generateRecommendations(prd, errors, warnings);

    const overall: ValidationResult = {
      valid: errors.length === 0,
      errors,
      warnings
    };

    return {
      overall,
      sections: sectionResults,
      recommendations,
      completeness,
      qualityScore,
      estimatedEffort
    };
  }

  /**
   * Validate user request
   */
  validateUserRequest(request: UserRequest): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields
    if (!request.id) {
      errors.push({
        field: 'id',
        message: 'Request must have an ID',
        constraint: 'required'
      });
    }

    if (!request.rawInput || request.rawInput.trim().length === 0) {
      errors.push({
        field: 'rawInput',
        message: 'Request must have input text',
        constraint: 'required'
      });
    }

    if (!request.sessionId) {
      errors.push({
        field: 'sessionId',
        message: 'Request must have a session ID',
        constraint: 'required'
      });
    }

    // Input quality checks
    if (request.rawInput && request.rawInput.length < 10) {
      warnings.push({
        field: 'rawInput',
        message: 'Input is very short',
        suggestion: 'Provide more detailed requirements for better results'
      });
    }

    if (request.rawInput && request.rawInput.length > 5000) {
      warnings.push({
        field: 'rawInput',
        message: 'Input is very long',
        suggestion: 'Consider breaking down into smaller, focused requests'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate workflow consistency
   */
  validateWorkflowConsistency(
    originalRequest: UserRequest,
    prd: PRD,
    analysisResult?: any
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check if PRD addresses the original request
    if (originalRequest.rawInput && prd.metadata?.description) {
      const requestKeywords = this.extractKeywords(originalRequest.rawInput);
      const prdKeywords = this.extractKeywords(prd.metadata.description);
      
      const overlap = this.calculateKeywordOverlap(requestKeywords, prdKeywords);
      
      if (overlap < 0.3) {
        warnings.push({
          field: 'consistency',
          message: 'PRD may not fully address the original request',
          suggestion: 'Review alignment between request and generated PRD'
        });
      }
    }

    // Check complexity alignment
    if (analysisResult?.complexity && prd.functionalRequirements) {
      const expectedRequirements = this.getExpectedRequirementCount(analysisResult.complexity);
      const actualRequirements = prd.functionalRequirements.length;
      
      if (Math.abs(actualRequirements - expectedRequirements) > expectedRequirements * 0.5) {
        warnings.push({
          field: 'complexity',
          message: 'Number of requirements may not match expected complexity',
          suggestion: 'Review requirement count for complexity alignment'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate metadata section
   */
  private validateMetadata(metadata: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!metadata) {
      errors.push({
        field: 'metadata',
        message: 'PRD must have metadata section',
        constraint: 'required'
      });
      return { valid: false, errors, warnings };
    }

    // Required fields
    if (!metadata.title) {
      errors.push({
        field: 'metadata.title',
        message: 'PRD must have a title',
        constraint: 'required'
      });
    } else if (metadata.title.length < 5) {
      warnings.push({
        field: 'metadata.title',
        message: 'Title is very short',
        suggestion: 'Provide a more descriptive title'
      });
    }

    if (!metadata.description) {
      errors.push({
        field: 'metadata.description',
        message: 'PRD must have a description',
        constraint: 'required'
      });
    } else if (metadata.description.length < 50) {
      warnings.push({
        field: 'metadata.description',
        message: 'Description is too brief',
        suggestion: 'Provide more detailed description'
      });
    }

    if (!metadata.version) {
      warnings.push({
        field: 'metadata.version',
        message: 'Consider adding version information',
        suggestion: 'Add version tracking for better management'
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate product overview section
   */
  private validateProductOverview(overview: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!overview) {
      errors.push({
        field: 'productOverview',
        message: 'PRD must have product overview section',
        constraint: 'required'
      });
      return { valid: false, errors, warnings };
    }

    if (!overview.vision) {
      warnings.push({
        field: 'productOverview.vision',
        message: 'Consider adding product vision',
        suggestion: 'Define clear product vision and goals'
      });
    }

    if (!overview.objectives || overview.objectives.length === 0) {
      warnings.push({
        field: 'productOverview.objectives',
        message: 'Consider adding specific objectives',
        suggestion: 'Define measurable product objectives'
      });
    }

    if (!overview.successMetrics || overview.successMetrics.length === 0) {
      warnings.push({
        field: 'productOverview.successMetrics',
        message: 'Consider adding success metrics',
        suggestion: 'Define how success will be measured'
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate functional requirements
   */
  private validateFunctionalRequirements(requirements: FunctionalRequirement[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!requirements || requirements.length === 0) {
      errors.push({
        field: 'functionalRequirements',
        message: 'PRD must have functional requirements',
        constraint: 'required'
      });
      return { valid: false, errors, warnings };
    }

    if (requirements.length < this.config.minRequirements) {
      warnings.push({
        field: 'functionalRequirements.count',
        message: `Only ${requirements.length} requirements found, consider adding more`,
        suggestion: `Aim for at least ${this.config.minRequirements} requirements`
      });
    }

    if (requirements.length > this.config.maxRequirements) {
      warnings.push({
        field: 'functionalRequirements.count',
        message: `${requirements.length} requirements may be too many`,
        suggestion: `Consider consolidating to under ${this.config.maxRequirements} requirements`
      });
    }

    // Validate individual requirements
    requirements.forEach((req, index) => {
      if (!req.title) {
        errors.push({
          field: `functionalRequirements[${index}].title`,
          message: 'Requirement must have a title',
          constraint: 'required'
        });
      }

      if (!req.description) {
        errors.push({
          field: `functionalRequirements[${index}].description`,
          message: 'Requirement must have a description',
          constraint: 'required'
        });
      }

      if (!req.acceptanceCriteria || req.acceptanceCriteria.length === 0) {
        warnings.push({
          field: `functionalRequirements[${index}].acceptanceCriteria`,
          message: `Requirement "${req.title}" lacks acceptance criteria`,
          suggestion: 'Add specific, testable acceptance criteria'
        });
      }
    });

    // Check for priority distribution
    const priorities = requirements.map(r => r.priority);
    const mustHaveCount = priorities.filter(p => p === Priority.MUST_HAVE).length;
    
    if (mustHaveCount === 0) {
      warnings.push({
        field: 'functionalRequirements.priorities',
        message: 'No must-have requirements identified',
        suggestion: 'Identify critical requirements as must-have'
      });
    }

    if (mustHaveCount === requirements.length) {
      warnings.push({
        field: 'functionalRequirements.priorities',
        message: 'All requirements marked as must-have',
        suggestion: 'Prioritize requirements to identify nice-to-have features'
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate technical specifications
   */
  private validateTechnicalSpec(techSpec: TechnicalSpec): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!techSpec && this.config.requireTechStack) {
      errors.push({
        field: 'technicalSpecifications',
        message: 'PRD must include technical specifications',
        constraint: 'required'
      });
      return { valid: false, errors, warnings };
    }

    if (techSpec) {
      if (!techSpec.techStack) {
        warnings.push({
          field: 'technicalSpecifications.techStack',
          message: 'Consider specifying technology stack',
          suggestion: 'Define frontend, backend, and database technologies'
        });
      }

      if (!techSpec.architecture) {
        warnings.push({
          field: 'technicalSpecifications.architecture',
          message: 'Consider adding architectural overview',
          suggestion: 'Describe system architecture and components'
        });
      }

      if (!techSpec.systemRequirements) {
        warnings.push({
          field: 'technicalSpecifications.performance',
          message: 'Consider adding performance requirements',
          suggestion: 'Define response time and scalability needs'
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Initialize built-in validation rules
   */
  private initializeBuiltInRules(): ValidationRule[] {
    return [
      {
        name: 'consistency_check',
        description: 'Check internal consistency of PRD',
        severity: 'warning',
        category: 'content',
        validate: (prd: PRD) => {
          const warnings: ValidationWarning[] = [];
          
          // Check if technical stack matches requirements complexity
          const reqCount = prd.functionalRequirements?.length || 0;
          const hasComplexTech = prd.technicalSpecifications?.techStack?.backend?.framework;
          
          if (reqCount > 10 && !hasComplexTech) {
            warnings.push({
              field: 'consistency',
              message: 'Complex requirements may need more sophisticated tech stack',
              suggestion: 'Consider enterprise-grade technologies for complex applications'
            });
          }
          
          return { valid: true, errors: [], warnings };
        }
      },
      {
        name: 'completeness_check',
        description: 'Check PRD completeness',
        severity: 'warning',
        category: 'structure',
        validate: (prd: PRD) => {
          const warnings: ValidationWarning[] = [];
          
          const sections = [
            { key: 'userInterface', name: 'User Interface' },
            { key: 'dataModel', name: 'Data Model' },
            { key: 'apiSpecification', name: 'API Specification' },
            { key: 'securityRequirements', name: 'Security Requirements' },
            { key: 'testingStrategy', name: 'Testing Strategy' }
          ];
          
          sections.forEach(section => {
            if (!prd[section.key as keyof PRD]) {
              warnings.push({
                field: section.key,
                message: `Consider adding ${section.name} section`,
                suggestion: `Define ${section.name.toLowerCase()} for completeness`
              });
            }
          });
          
          return { valid: true, errors: [], warnings };
        }
      }
    ];
  }

  /**
   * Calculate completeness percentage
   */
  private calculateCompleteness(prd: PRD, sectionResults: Record<string, ValidationResult>): number {
    const totalSections = Object.keys(sectionResults).length + 5; // +5 for optional sections
    let completedSections = 0;

    // Count completed required sections
    for (const result of Object.values(sectionResults)) {
      if (result.valid) {
        completedSections++;
      }
    }

    // Count optional sections
    const optionalSections = ['userInterface', 'dataModel', 'apiSpecification', 'securityRequirements', 'testingStrategy'];
    optionalSections.forEach(section => {
      if (prd[section as keyof PRD]) {
        completedSections++;
      }
    });

    return Math.round((completedSections / totalSections) * 100);
  }

  /**
   * Calculate quality score
   */
  private calculateQualityScore(prd: PRD, errors: ValidationError[], warnings: ValidationWarning[]): number {
    let score = 100;

    // Deduct for errors
    score -= errors.length * 10;

    // Deduct for warnings
    score -= warnings.length * 5;

    // Bonus for completeness
    const reqCount = prd.functionalRequirements?.length || 0;
    if (reqCount >= this.config.minRequirements) {
      score += 10;
    }

    // Bonus for good descriptions
    if (prd.metadata?.description && prd.metadata.description.length > 100) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Estimate development effort
   */
  private estimateEffort(prd: PRD): string {
    const reqCount = prd.functionalRequirements?.length || 0;
    const hasComplex = prd.technicalSpecifications?.techStack;
    
    let weekEstimate = Math.max(2, reqCount * 0.5);
    
    if (hasComplex) {
      weekEstimate *= 1.5;
    }
    
    if (weekEstimate <= 4) {
      return '2-4 weeks (Small project)';
    } else if (weekEstimate <= 12) {
      return '1-3 months (Medium project)';
    } else if (weekEstimate <= 24) {
      return '3-6 months (Large project)';
    } else {
      return '6+ months (Enterprise project)';
    }
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(prd: PRD, errors: ValidationError[], warnings: ValidationWarning[]): string[] {
    const recommendations: string[] = [];

    if (errors.length > 0) {
      recommendations.push('Address all validation errors before proceeding');
    }

    if (warnings.length > 5) {
      recommendations.push('Consider addressing warnings to improve PRD quality');
    }

    const reqCount = prd.functionalRequirements?.length || 0;
    if (reqCount < 5) {
      recommendations.push('Add more functional requirements to provide better guidance for development');
    }

    if (!prd.testingStrategy) {
      recommendations.push('Define testing strategy to ensure quality delivery');
    }

    if (!prd.deploymentConfig) {
      recommendations.push('Add deployment configuration for production readiness');
    }

    return recommendations;
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 20); // Limit to top 20 keywords
  }

  /**
   * Calculate keyword overlap between two sets
   */
  private calculateKeywordOverlap(keywords1: string[], keywords2: string[]): number {
    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Get expected requirement count based on complexity
   */
  private getExpectedRequirementCount(complexity: ComplexityLevel): number {
    switch (complexity) {
      case ComplexityLevel.SIMPLE:
        return 5;
      case ComplexityLevel.MODERATE:
        return 10;
      case ComplexityLevel.COMPLEX:
        return 20;
      case ComplexityLevel.ENTERPRISE:
        return 30;
      default:
        return 10;
    }
  }
}
