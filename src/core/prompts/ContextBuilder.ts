// Context Builder - Builds comprehensive context for prompt generation

import {
  UserRequest,
  AnalysisResult,
  PRD,
  TechStack,
  Feature,
  RequestContext,
  Example
} from '../../models/index.js';
import { PromptGenerationContext } from './PromptEngine.js';

export class ContextBuilder {
  /**
   * Builds enriched context for prompt generation
   */
  buildContext(baseContext: Partial<PromptGenerationContext>): PromptGenerationContext {
    return {
      userRequest: baseContext.userRequest || '',
      appType: baseContext.appType || '',
      complexity: baseContext.complexity || '',
      features: baseContext.features || [],
      techStack: baseContext.techStack || null,
      previousPRD: baseContext.previousPRD || null,
      constraints: this.buildConstraints(baseContext),
      examples: baseContext.examples || [],
      outputFormat: baseContext.outputFormat || 'markdown' as any,
      chainOfThought: baseContext.chainOfThought || false,
      temperature: baseContext.temperature || 0.7,
      maxTokens: baseContext.maxTokens || 4000,
      model: baseContext.model || 'claude-3-5-sonnet-20241022' as any,
      additionalContext: baseContext.additionalContext || {}
    };
  }

  /**
   * Builds context from analysis result
   */
  buildFromAnalysis(
    request: UserRequest,
    analysis: AnalysisResult,
    existingPRD?: PRD
  ): Partial<PromptGenerationContext> {
    return {
      userRequest: request.rawInput,
      appType: analysis.appType,
      complexity: analysis.complexity,
      features: analysis.features,
      techStack: analysis.suggestedTechStack,
      previousPRD: existingPRD,
      additionalContext: {
        confidence: analysis.confidence.toString(),
        reasoning: analysis.reasoning,
        entities: JSON.stringify(analysis.entities),
        intent: analysis.intent
      }
    };
  }

  /**
   * Builds context for iteration requests
   */
  buildIterationContext(
    changeRequest: string,
    currentPRD: PRD,
    requestContext?: RequestContext
  ): Partial<PromptGenerationContext> {
    const context: Partial<PromptGenerationContext> = {
      userRequest: changeRequest,
      previousPRD: currentPRD,
      additionalContext: {
        iterationCount: requestContext?.iterationCount?.toString() || '0',
        version: currentPRD.version
      }
    };

    // Add previous conversation context if available
    if (requestContext?.conversationHistory) {
      context.additionalContext!.conversationHistory = JSON.stringify(
        requestContext.conversationHistory.slice(-3) // Last 3 messages for context
      );
    }

    return context;
  }

  /**
   * Builds constraints based on context
   */
  private buildConstraints(context: Partial<PromptGenerationContext>): string[] {
    const constraints: string[] = [];

    // Base quality constraints
    constraints.push('Ensure all requirements are specific, measurable, and testable');
    constraints.push('Include proper error handling and edge cases');
    constraints.push('Consider security implications for all features');
    constraints.push('Design for scalability and maintainability');

    // Complexity-based constraints
    if (context.complexity === 'simple') {
      constraints.push('Keep the solution simple and focused on core functionality');
      constraints.push('Avoid over-engineering or unnecessary complexity');
    } else if (context.complexity === 'enterprise') {
      constraints.push('Include comprehensive monitoring and observability');
      constraints.push('Plan for high availability and disaster recovery');
      constraints.push('Include detailed security and compliance requirements');
    }

    // Feature-specific constraints
    if (context.features) {
      const featureTypes = context.features.map((f: any) => f.type);
      
      if (featureTypes.includes('payment')) {
        constraints.push('Ensure PCI DSS compliance for payment processing');
      }
      
      if (featureTypes.includes('authentication')) {
        constraints.push('Implement secure authentication with proper session management');
      }
      
      if (featureTypes.includes('real_time')) {
        constraints.push('Design for real-time performance and reliability');
      }
      
      if (featureTypes.includes('ai_integration')) {
        constraints.push('Consider AI model costs and rate limits in the design');
      }
    }

    // Tech stack constraints
    if (context.techStack) {
      const stack = context.techStack as any;
      if (stack.frontend?.framework === 'react') {
        constraints.push('Follow React best practices and hooks patterns');
      }
      if (stack.database?.primary?.type === 'postgresql') {
        constraints.push('Design database schema with proper indexes and constraints');
      }
    }

    return constraints;
  }

  /**
   * Builds examples based on context
   */
  buildExamples(taskType: string, context: Partial<PromptGenerationContext>): Example[] {
    const examples: Example[] = [];

    // Add task-specific examples
    switch (taskType) {
      case 'prd_generation':
        examples.push(...this.getPRDExamples(context));
        break;
      case 'feature_analysis':
        examples.push(...this.getFeatureAnalysisExamples(context));
        break;
      case 'tech_stack_selection':
        examples.push(...this.getTechStackExamples(context));
        break;
    }

    return examples;
  }

  /**
   * Gets PRD generation examples
   */
  private getPRDExamples(context: Partial<PromptGenerationContext>): Example[] {
    if (context.appType === 'web_app') {
      return [{
        input: 'Create a simple todo app where users can add, edit, and delete tasks',
        output: `# Todo App - Product Requirements Document

## Product Overview
**Vision:** A simple, intuitive todo application that helps users organize and track their daily tasks efficiently.

**Objectives:**
- Provide a clean, distraction-free task management interface
- Enable quick task creation, editing, and completion
- Ensure data persistence and reliability

## Functional Requirements

### FR-001: Task Management
**Priority:** Must Have
**User Story:** As a user, I want to create, edit, and delete tasks so I can manage my todo list effectively.

**Acceptance Criteria:**
- Users can add new tasks with a title and optional description
- Users can edit existing task titles and descriptions
- Users can mark tasks as complete/incomplete
- Users can delete tasks permanently
- Tasks persist between browser sessions`,
        explanation: 'This example shows how to structure a PRD with clear sections, user stories, and acceptance criteria for a simple application.'
      }];
    }

    return [];
  }

  /**
   * Gets feature analysis examples
   */
  private getFeatureAnalysisExamples(context: Partial<PromptGenerationContext>): Example[] {
    return [{
      input: 'I want to build an e-commerce store',
      output: `# E-commerce Store - Feature Analysis

## Explicit Features
1. **Product Catalog** (Must Have)
   - Display products with images, descriptions, prices
   - Product categories and search functionality

2. **Shopping Cart** (Must Have)
   - Add/remove items, quantity adjustment
   - Cart persistence across sessions

## Implicit Features
1. **User Authentication** (Must Have)
   - User registration and login for checkout
   - Order history and profile management

2. **Payment Processing** (Must Have)
   - Secure payment gateway integration
   - Order confirmation and receipts

3. **Inventory Management** (Should Have)
   - Track product availability
   - Low stock alerts`,
      explanation: 'Shows how to identify both explicit and implicit features with proper categorization and priority levels.'
    }];
  }

  /**
   * Gets tech stack examples
   */
  private getTechStackExamples(context: Partial<PromptGenerationContext>): Example[] {
    return [{
      input: 'React web app with real-time features',
      output: `# Tech Stack Recommendation

## Frontend
**Framework:** React 18.2.0
**Justification:** Excellent ecosystem, component reusability, strong community support

**State Management:** Zustand
**Justification:** Simpler than Redux, sufficient for moderate complexity

## Backend
**Framework:** Express.js with Socket.io
**Justification:** Socket.io provides robust real-time communication

## Database
**Primary:** PostgreSQL
**Cache:** Redis (for session storage and Socket.io adapter)
**Justification:** PostgreSQL for relational data, Redis for real-time features`,
      explanation: 'Demonstrates how to provide specific technology recommendations with clear justifications.'
    }];
  }

  /**
   * Enriches context with domain knowledge
   */
  enrichWithDomainKnowledge(
    context: Partial<PromptGenerationContext>,
    domain?: string
  ): Partial<PromptGenerationContext> {
    if (!domain) return context;

    const domainConstraints = this.getDomainConstraints(domain);
    const domainExamples = this.getDomainExamples(domain);

    return {
      ...context,
      constraints: [...(context.constraints || []), ...domainConstraints],
      examples: [...(context.examples || []), ...domainExamples]
    };
  }

  /**
   * Gets domain-specific constraints
   */
  private getDomainConstraints(domain: string): string[] {
    const domainConstraintsMap: Record<string, string[]> = {
      healthcare: [
        'Ensure HIPAA compliance for healthcare data',
        'Include audit trails for all data access',
        'Implement role-based access control'
      ],
      finance: [
        'Follow financial regulations and compliance standards',
        'Implement strong encryption for sensitive data',
        'Include comprehensive audit logging'
      ],
      education: [
        'Consider FERPA compliance for student data',
        'Design for accessibility (WCAG 2.1 AA)',
        'Include proper content moderation features'
      ]
    };

    return domainConstraintsMap[domain] || [];
  }

  /**
   * Gets domain-specific examples
   */
  private getDomainExamples(domain: string): Example[] {
    // Could be expanded with domain-specific examples
    return [];
  }
}
