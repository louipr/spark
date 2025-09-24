// Chain of Thought - Adds reasoning steps to prompts for better LLM performance

import { PromptTaskType } from './PromptEngine.js';

export class ChainOfThought {
  private reasoningTemplates: Map<PromptTaskType, ReasoningTemplate>;

  constructor() {
    this.reasoningTemplates = this.initializeReasoningTemplates();
  }

  /**
   * Adds chain-of-thought reasoning steps to a prompt
   */
  addReasoningSteps(prompt: string, taskType: PromptTaskType): string {
    const template = this.reasoningTemplates.get(taskType);
    if (!template) {
      return this.addGenericReasoningSteps(prompt);
    }

    return this.insertReasoningSteps(prompt, template);
  }

  /**
   * Inserts reasoning steps into the prompt
   */
  private insertReasoningSteps(prompt: string, template: ReasoningTemplate): string {
    const reasoningSection = this.buildReasoningSection(template);
    
    // Look for insertion point in the prompt
    const insertionMarkers = [
      '## Instructions',
      '## Analysis Framework',
      '## Task Instructions',
      'Your task is to'
    ];

    for (const marker of insertionMarkers) {
      if (prompt.includes(marker)) {
        return prompt.replace(marker, `${reasoningSection}\\n\\n${marker}`);
      }
    }

    // If no marker found, add reasoning steps before the main content
    return `${reasoningSection}\\n\\n${prompt}`;
  }

  /**
   * Builds reasoning section from template
   */
  private buildReasoningSection(template: ReasoningTemplate): string {
    const steps = template.steps.map((step, index) => {
      return `${index + 1}. **${step.name}:** ${step.description}`;
    }).join('\\n');

    return `## Reasoning Process

Before providing your response, think through this process step by step:

${steps}

${template.finalInstruction}`;
  }

  /**
   * Adds generic reasoning steps for unknown task types
   */
  private addGenericReasoningSteps(prompt: string): string {
    const genericReasoning = `## Reasoning Process

Think through this systematically:

1. **Understand the Requirements:** What exactly is being asked?
2. **Analyze the Context:** What factors should influence the solution?
3. **Consider Constraints:** What limitations or requirements must be met?
4. **Evaluate Options:** What different approaches are possible?
5. **Make Decisions:** What is the best approach and why?
6. **Validate Solution:** Does this address all requirements effectively?

Work through each step before providing your final response.

`;

    return `${genericReasoning}\\n${prompt}`;
  }

  /**
   * Initializes reasoning templates for different task types
   */
  private initializeReasoningTemplates(): Map<PromptTaskType, ReasoningTemplate> {
    const templates = new Map<PromptTaskType, ReasoningTemplate>();

    // PRD Generation Reasoning
    templates.set(PromptTaskType.PRD_GENERATION, {
      taskType: PromptTaskType.PRD_GENERATION,
      steps: [
        {
          name: 'Requirements Analysis',
          description: 'Break down the user request into core requirements, identifying both explicit and implicit needs'
        },
        {
          name: 'User Journey Mapping',
          description: 'Think through the complete user experience from first interaction to ongoing usage'
        },
        {
          name: 'Technical Architecture',
          description: 'Consider the technical approach, scalability requirements, and integration needs'
        },
        {
          name: 'Risk Assessment',
          description: 'Identify potential challenges, technical risks, and mitigation strategies'
        },
        {
          name: 'Priority Mapping',
          description: 'Classify features by priority (Must-have, Should-have, Nice-to-have) based on user value and technical complexity'
        },
        {
          name: 'Implementation Planning',
          description: 'Think through development phases, dependencies, and realistic timelines'
        }
      ],
      finalInstruction: 'Now generate a comprehensive PRD that addresses each of these considerations systematically.'
    });

    // Feature Analysis Reasoning
    templates.set(PromptTaskType.FEATURE_ANALYSIS, {
      taskType: PromptTaskType.FEATURE_ANALYSIS,
      steps: [
        {
          name: 'Explicit Feature Identification',
          description: 'List all features directly mentioned in the user request'
        },
        {
          name: 'Implicit Feature Discovery',
          description: 'Consider what additional features are essential for the app to function properly'
        },
        {
          name: 'User Workflow Analysis',
          description: 'Think through typical user workflows and identify supporting features needed'
        },
        {
          name: 'Industry Standards Review',
          description: 'Consider what features users expect in this type of application based on industry standards'
        },
        {
          name: 'Technical Dependencies',
          description: 'Identify features that depend on or enable other features'
        },
        {
          name: 'Priority Assessment',
          description: 'Evaluate each feature\'s importance to core functionality and user value'
        }
      ],
      finalInstruction: 'Based on this analysis, provide a comprehensive feature breakdown with clear priorities and rationale.'
    });

    // Tech Stack Selection Reasoning
    templates.set(PromptTaskType.TECH_STACK_SELECTION, {
      taskType: PromptTaskType.TECH_STACK_SELECTION,
      steps: [
        {
          name: 'Requirements Mapping',
          description: 'Map each technical requirement to potential technology solutions'
        },
        {
          name: 'Compatibility Analysis',
          description: 'Ensure all selected technologies work well together and have good integration points'
        },
        {
          name: 'Scalability Considerations',
          description: 'Evaluate how each technology handles growth in users, data, and complexity'
        },
        {
          name: 'Development Experience',
          description: 'Consider developer productivity, learning curve, and available resources'
        },
        {
          name: 'Long-term Viability',
          description: 'Assess community support, update frequency, and long-term sustainability'
        },
        {
          name: 'Trade-off Evaluation',
          description: 'Weigh the pros and cons of each technology choice against alternatives'
        }
      ],
      finalInstruction: 'Select the optimal technology stack that balances all these factors for the specific use case.'
    });

    // Code Generation Reasoning
    templates.set(PromptTaskType.CODE_GENERATION, {
      taskType: PromptTaskType.CODE_GENERATION,
      steps: [
        {
          name: 'Architecture Planning',
          description: 'Design the overall structure and organization of the code'
        },
        {
          name: 'Interface Design',
          description: 'Define clear interfaces and contracts between components'
        },
        {
          name: 'Error Handling Strategy',
          description: 'Plan how to handle errors gracefully and provide meaningful feedback'
        },
        {
          name: 'Security Implementation',
          description: 'Identify security requirements and implement appropriate protections'
        },
        {
          name: 'Testing Strategy',
          description: 'Design testable code and plan comprehensive test coverage'
        },
        {
          name: 'Performance Optimization',
          description: 'Consider performance implications and optimize critical paths'
        }
      ],
      finalInstruction: 'Generate clean, well-structured code that implements these design decisions effectively.'
    });

    // Iteration Refinement Reasoning
    templates.set(PromptTaskType.ITERATION_REFINEMENT, {
      taskType: PromptTaskType.ITERATION_REFINEMENT,
      steps: [
        {
          name: 'Change Request Analysis',
          description: 'Understand exactly what the user wants to change and why'
        },
        {
          name: 'Impact Assessment',
          description: 'Identify all PRD sections and requirements that will be affected by this change'
        },
        {
          name: 'Dependency Mapping',
          description: 'Trace through dependencies to find cascading effects of the change'
        },
        {
          name: 'Consistency Check',
          description: 'Ensure the change doesn\'t create contradictions or conflicts with existing requirements'
        },
        {
          name: 'Quality Validation',
          description: 'Verify that the updated PRD maintains the same level of detail and completeness'
        },
        {
          name: 'Change Documentation',
          description: 'Clearly identify what has been modified for tracking and communication'
        }
      ],
      finalInstruction: 'Apply the changes systematically while maintaining PRD integrity and completeness.'
    });

    // Validation Reasoning
    templates.set(PromptTaskType.VALIDATION, {
      taskType: PromptTaskType.VALIDATION,
      steps: [
        {
          name: 'Structural Review',
          description: 'Check that all required PRD sections are present and properly structured'
        },
        {
          name: 'Completeness Analysis',
          description: 'Verify that each section contains sufficient detail for implementation'
        },
        {
          name: 'Consistency Verification',
          description: 'Ensure all sections align and don\'t contain contradictory information'
        },
        {
          name: 'Quality Assessment',
          description: 'Evaluate if requirements are specific, measurable, achievable, relevant, and time-bound'
        },
        {
          name: 'Feasibility Check',
          description: 'Assess if the requirements are technically and practically achievable'
        },
        {
          name: 'Gap Identification',
          description: 'Identify missing elements or areas that need more detail'
        }
      ],
      finalInstruction: 'Provide a comprehensive validation report with prioritized recommendations for improvement.'
    });

    return templates;
  }

  /**
   * Gets reasoning template for a task type
   */
  getReasoningTemplate(taskType: PromptTaskType): ReasoningTemplate | undefined {
    return this.reasoningTemplates.get(taskType);
  }

  /**
   * Creates a custom reasoning template
   */
  createCustomTemplate(
    taskType: PromptTaskType,
    steps: ReasoningStep[],
    finalInstruction: string
  ): ReasoningTemplate {
    return {
      taskType,
      steps,
      finalInstruction
    };
  }

  /**
   * Validates a reasoning step
   */
  validateReasoningStep(step: ReasoningStep): boolean {
    return step.name.trim().length > 0 && step.description.trim().length > 10;
  }

  /**
   * Optimizes reasoning steps based on complexity
   */
  optimizeForComplexity(template: ReasoningTemplate, complexity: 'simple' | 'moderate' | 'complex' | 'enterprise'): ReasoningTemplate {
    let steps = [...template.steps];

    switch (complexity) {
      case 'simple':
        // Reduce to core reasoning steps
        steps = steps.slice(0, 3);
        break;
      case 'complex':
      case 'enterprise':
        // Add additional validation steps
        steps.push({
          name: 'Risk Mitigation',
          description: 'Consider potential risks and how to mitigate them'
        });
        break;
    }

    return {
      ...template,
      steps
    };
  }

  /**
   * Adds domain-specific reasoning steps
   */
  addDomainReasoning(template: ReasoningTemplate, domain: string): ReasoningTemplate {
    const domainSteps: Record<string, ReasoningStep[]> = {
      healthcare: [
        {
          name: 'Compliance Review',
          description: 'Ensure all requirements meet healthcare regulations (HIPAA, etc.)'
        },
        {
          name: 'Patient Safety',
          description: 'Consider patient safety implications of all features'
        }
      ],
      finance: [
        {
          name: 'Regulatory Compliance',
          description: 'Verify compliance with financial regulations and standards'
        },
        {
          name: 'Security Assessment',
          description: 'Evaluate security requirements for financial data handling'
        }
      ],
      education: [
        {
          name: 'Educational Standards',
          description: 'Align with educational standards and learning objectives'
        },
        {
          name: 'Accessibility Review',
          description: 'Ensure accessibility for diverse learning needs'
        }
      ]
    };

    const additionalSteps = domainSteps[domain] || [];
    
    return {
      ...template,
      steps: [...template.steps, ...additionalSteps]
    };
  }
}

// Types and interfaces

export interface ReasoningTemplate {
  taskType: PromptTaskType;
  steps: ReasoningStep[];
  finalInstruction: string;
}

export interface ReasoningStep {
  name: string;
  description: string;
}
