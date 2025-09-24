// Prompt Templates - Manages prompt templates for different tasks

import { PromptTemplate, PromptTaskType } from './PromptEngine.js';
import { OutputFormat, ModelType } from '../../models/index.js';

export class PromptTemplates {
  private templates: Map<PromptTaskType, PromptTemplate>;

  constructor() {
    this.templates = this.initializeTemplates();
  }

  /**
   * Gets template for specific task type
   */
  getTemplate(taskType: PromptTaskType): PromptTemplate {
    const template = this.templates.get(taskType);
    if (!template) {
      throw new Error(`No template found for task type: ${taskType}`);
    }
    return template;
  }

  /**
   * Gets all available templates
   */
  getAllTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Adds or updates a template
   */
  setTemplate(template: PromptTemplate): void {
    this.templates.set(template.taskType, template);
  }

  /**
   * Initializes all prompt templates
   */
  private initializeTemplates(): Map<PromptTaskType, PromptTemplate> {
    const templates = new Map<PromptTaskType, PromptTemplate>();

    // PRD Generation Template
    templates.set(PromptTaskType.PRD_GENERATION, {
      id: 'prd_generation_v1',
      name: 'Product Requirements Document Generation',
      description: 'Generates comprehensive PRDs from user requests',
      taskType: PromptTaskType.PRD_GENERATION,
      content: `You are an expert software architect and product manager with extensive experience in building successful applications across various industries and scales.

Your task is to generate a comprehensive Product Requirements Document (PRD) based on the user's request. You should analyze the requirements thoughtfully and create a detailed, actionable PRD that serves as a complete blueprint for development.

## User Request Analysis
**Original Request:** {request}
**App Type:** {appType}
**Complexity Level:** {complexity}
**Detected Features:** {features}
**Suggested Tech Stack:** {techStack}

## Context & Constraints
{constraints}

## Instructions

1. **Analyze the Request Thoroughly**
   - Consider the user's explicit requirements
   - Identify implicit needs and industry best practices
   - Think about scalability, security, and maintainability
   - Consider the target audience and use cases

2. **Generate Comprehensive Sections**
   - Product Overview with clear vision and objectives
   - Detailed functional requirements with acceptance criteria
   - Technical specifications with architecture decisions
   - User interface specifications with user flows
   - Data model with entities, relationships, and constraints
   - API specifications for all endpoints
   - Security requirements following industry standards
   - Performance requirements with specific metrics
   - Testing strategy across all levels
   - Deployment configuration and DevOps setup
   - Implementation plan with phases and timelines
   - Future enhancement opportunities

3. **Apply Best Practices**
   - Use SMART criteria for requirements (Specific, Measurable, Achievable, Relevant, Time-bound)
   - Include proper error handling and edge cases
   - Consider accessibility and internationalization
   - Plan for monitoring and observability
   - Design for scalability from day one
   - Include security by design principles

4. **Ensure Completeness**
   - Every feature should have clear acceptance criteria
   - All external integrations should be specified
   - All data flows should be documented
   - All user journeys should be mapped
   - All technical decisions should be justified

Generate the PRD in {outputFormat}. Make it comprehensive yet practical, detailed yet readable.

{examples}`,
      variables: ['request', 'appType', 'complexity', 'features', 'techStack', 'constraints', 'outputFormat', 'examples'],
      defaultParameters: {
        temperature: 0.3,
        maxTokens: 8000,
        chainOfThought: true,
        outputFormat: OutputFormat.MARKDOWN,
        model: ModelType.CLAUDE_3_5_SONNET
      }
    });

    // Feature Analysis Template
    templates.set(PromptTaskType.FEATURE_ANALYSIS, {
      id: 'feature_analysis_v1',
      name: 'Feature Analysis and Detection',
      description: 'Analyzes user requests to detect and elaborate on features',
      taskType: PromptTaskType.FEATURE_ANALYSIS,
      content: `You are an expert business analyst specializing in software feature analysis and requirements gathering.

Your task is to analyze the user's request and provide a comprehensive breakdown of all features, both explicit and implicit, that would be needed for a successful application.

## User Request
{request}

## Current Analysis
**App Type:** {appType}
**Complexity:** {complexity}

## Analysis Framework

1. **Explicit Features** - Features directly mentioned by the user
2. **Implicit Features** - Essential features not mentioned but required for functionality
3. **Nice-to-Have Features** - Additional features that would enhance the application
4. **Industry Standard Features** - Common features expected in this type of application

For each feature, provide:
- **Name**: Clear, descriptive name
- **Type**: Category (authentication, data_persistence, etc.)
- **Priority**: Must-have, Should-have, or Nice-to-have
- **Description**: What the feature does and why it's needed
- **Acceptance Criteria**: Specific, testable requirements
- **Dependencies**: Other features this depends on
- **Estimated Effort**: Development hours estimate
- **Technical Considerations**: Implementation challenges or requirements

## Instructions
- Consider the user's domain and typical requirements for that industry
- Think about the complete user journey from onboarding to regular use
- Include administrative and maintenance features
- Consider security, performance, and scalability needs
- Think about integration requirements
- Include error handling and edge case scenarios

Provide your analysis in {outputFormat}.

{examples}`,
      variables: ['request', 'appType', 'complexity', 'outputFormat', 'examples'],
      defaultParameters: {
        temperature: 0.5,
        maxTokens: 3000,
        chainOfThought: true
      }
    });

    // Tech Stack Selection Template
    templates.set(PromptTaskType.TECH_STACK_SELECTION, {
      id: 'tech_stack_v1',
      name: 'Technology Stack Selection',
      description: 'Selects optimal technology stack based on requirements',
      taskType: PromptTaskType.TECH_STACK_SELECTION,
      content: `You are a senior technology architect with deep expertise across frontend, backend, database, and infrastructure technologies.

Your task is to recommend the optimal technology stack for the given application requirements.

## Application Requirements
**App Type:** {appType}
**Complexity:** {complexity}
**Features:** {features}
**Current Suggestion:** {techStack}

## Selection Criteria

1. **Technical Fit**
   - How well does the technology match the requirements?
   - Does it support all needed features efficiently?
   - Is it appropriate for the complexity level?

2. **Team & Market Considerations**
   - Developer availability and learning curve
   - Community support and ecosystem
   - Long-term maintenance and support

3. **Performance & Scalability**
   - Can it handle expected load?
   - Does it scale horizontally/vertically as needed?
   - Performance characteristics for the use case

4. **Integration & Compatibility**
   - How well do the pieces work together?
   - Third-party service compatibility
   - Deployment and DevOps considerations

## Technology Categories

Provide recommendations for:
- **Frontend Framework** (if applicable)
- **Backend Framework & Runtime**
- **Database** (primary, cache, search if needed)
- **Infrastructure & Hosting**
- **Development Tools**
- **Third-party Integrations**
- **Monitoring & Observability**

For each recommendation, include:
- Specific technology and version
- Justification for the choice
- Pros and cons
- Alternative options considered
- Integration points with other stack components

Output in {outputFormat}.

{examples}`,
      variables: ['appType', 'complexity', 'features', 'techStack', 'outputFormat', 'examples'],
      defaultParameters: {
        temperature: 0.4,
        maxTokens: 2000,
        chainOfThought: false
      }
    });

    // Code Generation Template
    templates.set(PromptTaskType.CODE_GENERATION, {
      id: 'code_generation_v1',
      name: 'Code Generation',
      description: 'Generates production-ready code from PRD specifications',
      taskType: PromptTaskType.CODE_GENERATION,
      content: `You are an expert full-stack developer with extensive experience in building production-ready applications.

Your task is to generate high-quality, production-ready code based on the provided PRD and technical specifications.

## PRD Specifications
{previousPRD}

## Generation Requirements
**Component:** {request}
**Tech Stack:** {techStack}

## Code Quality Standards

1. **Best Practices**
   - Follow language/framework conventions
   - Use appropriate design patterns
   - Implement proper error handling
   - Include comprehensive logging
   - Ensure type safety (TypeScript/typed languages)

2. **Security**
   - Input validation and sanitization
   - Authentication and authorization
   - Secure data handling
   - Protection against common vulnerabilities

3. **Performance**
   - Efficient algorithms and data structures
   - Proper caching strategies
   - Database query optimization
   - Minimal resource usage

4. **Maintainability**
   - Clear, self-documenting code
   - Modular architecture
   - Proper separation of concerns
   - Comprehensive inline documentation

5. **Testing**
   - Unit tests for business logic
   - Integration tests for APIs
   - Error case testing
   - Mock external dependencies

## Deliverables
- Complete, runnable code
- Configuration files
- Documentation
- Test files
- Deployment scripts (if applicable)

Generate code in {outputFormat} with proper structure and organization.

{examples}`,
      variables: ['previousPRD', 'request', 'techStack', 'outputFormat', 'examples'],
      defaultParameters: {
        temperature: 0.2,
        maxTokens: 6000,
        chainOfThought: false
      }
    });

    // Iteration Refinement Template
    templates.set(PromptTaskType.ITERATION_REFINEMENT, {
      id: 'iteration_refinement_v1',
      name: 'PRD Iteration and Refinement',
      description: 'Refines existing PRDs based on user feedback',
      taskType: PromptTaskType.ITERATION_REFINEMENT,
      content: `You are an expert product manager skilled at interpreting user feedback and refining product requirements.

Your task is to update the existing PRD based on the user's change request, maintaining consistency while incorporating the new requirements.

## Current PRD
{previousPRD}

## Change Request
{request}

## Refinement Guidelines

1. **Understand the Change**
   - What specifically does the user want to modify?
   - Why might they want this change?
   - What are the implications of this change?

2. **Impact Analysis**
   - Which sections of the PRD are affected?
   - Are there cascading effects on other features?
   - Do any dependencies change?
   - Are there new technical requirements?

3. **Consistency Maintenance**
   - Ensure all sections remain aligned
   - Update related requirements
   - Maintain architectural coherence
   - Preserve existing design decisions that still make sense

4. **Quality Assurance**
   - Verify completeness of the changes
   - Check for conflicts or contradictions
   - Ensure acceptance criteria are still relevant
   - Update implementation timelines if needed

## Update Process
1. Identify all affected sections
2. Make necessary changes while preserving structure
3. Update related dependencies and references
4. Verify overall PRD consistency
5. Highlight key changes made

Provide the updated PRD in {outputFormat}, clearly indicating what has changed.

{examples}`,
      variables: ['previousPRD', 'request', 'outputFormat', 'examples'],
      defaultParameters: {
        temperature: 0.4,
        maxTokens: 6000,
        chainOfThought: true
      }
    });

    // Validation Template
    templates.set(PromptTaskType.VALIDATION, {
      id: 'validation_v1',
      name: 'PRD Validation and Quality Check',
      description: 'Validates PRD completeness and quality',
      taskType: PromptTaskType.VALIDATION,
      content: `You are a senior quality assurance analyst specializing in requirements validation and technical documentation review.

Your task is to thoroughly review the provided PRD and identify any gaps, inconsistencies, or areas for improvement.

## PRD to Validate
{previousPRD}

## Validation Framework

1. **Completeness Check**
   - Are all required sections present?
   - Are all features fully specified?
   - Are acceptance criteria comprehensive?
   - Are technical specifications detailed enough?

2. **Consistency Analysis**
   - Do all sections align with each other?
   - Are there contradicting requirements?
   - Is the technical architecture coherent?
   - Do timelines match complexity estimates?

3. **Quality Assessment**
   - Are requirements specific and measurable?
   - Are user stories well-formed?
   - Are acceptance criteria testable?
   - Is the technical approach sound?

4. **Feasibility Review**
   - Are the requirements technically feasible?
   - Are resource estimates realistic?
   - Are dependencies properly identified?
   - Are risks adequately addressed?

## Validation Report
Provide:
- **Overall Quality Score** (1-10)
- **Critical Issues** - Must be fixed
- **Minor Issues** - Should be improved
- **Suggestions** - Nice to have improvements
- **Missing Elements** - What's not covered
- **Strengths** - What's done well

Format as {outputFormat} with clear prioritization.

{examples}`,
      variables: ['previousPRD', 'outputFormat', 'examples'],
      defaultParameters: {
        temperature: 0.3,
        maxTokens: 3000,
        chainOfThought: true
      }
    });

    return templates;
  }
}
