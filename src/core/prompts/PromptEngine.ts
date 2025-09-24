// Prompt Engine - Core prompt engineering and generation system

import {
  PromptContext,
  Example,
  OutputFormat,
  ModelType,
  LLMProvider
} from '../../models/index.js';
import { PromptTemplates } from './PromptTemplates.js';
import { ContextBuilder } from './ContextBuilder.js';
import { ChainOfThought } from './ChainOfThought.js';

export class PromptEngine {
  private templates: PromptTemplates;
  private contextBuilder: ContextBuilder;
  private chainOfThought: ChainOfThought;

  constructor() {
    this.templates = new PromptTemplates();
    this.contextBuilder = new ContextBuilder();
    this.chainOfThought = new ChainOfThought();
  }

  /**
   * Generates an optimized prompt for a specific task
   */
  generatePrompt(taskType: PromptTaskType, context: PromptGenerationContext): string {
    try {
      // 1. Get base template for task
      const template = this.templates.getTemplate(taskType);
      
      // 2. Build comprehensive context
      const enrichedContext = this.contextBuilder.buildContext(context);
      
      // 3. Apply prompt engineering techniques
      let prompt = this.applyTemplate(template, enrichedContext);
      
      // 4. Add chain-of-thought reasoning if needed
      if (enrichedContext.chainOfThought) {
        prompt = this.chainOfThought.addReasoningSteps(prompt, taskType);
      }
      
      // 5. Add examples (few-shot learning)
      if (enrichedContext.examples && enrichedContext.examples.length > 0) {
        prompt = this.addExamples(prompt, enrichedContext.examples);
      }
      
      // 6. Format for specific model/provider
      prompt = this.formatForModel(prompt, enrichedContext.model);
      
      // 7. Add final instructions and constraints
      prompt = this.addFinalInstructions(prompt, enrichedContext);
      
      return prompt;
    } catch (error) {
      throw new Error(`Prompt generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Applies template with context variables
   */
  private applyTemplate(template: PromptTemplate, context: PromptGenerationContext): string {
    let prompt = template.content;
    
    // Replace template variables
    const variables = template.variables || [];
    variables.forEach(variable => {
      const placeholder = `{${variable}}`;
      const value = this.getContextValue(context, variable);
      prompt = prompt.replace(new RegExp(placeholder, 'g'), value);
    });
    
    return prompt;
  }

  /**
   * Gets value from context for template variable
   */
  private getContextValue(context: PromptGenerationContext, variable: string): string {
    switch (variable) {
      case 'request':
        return context.userRequest || '';
      case 'appType':
        return context.appType || '';
      case 'complexity':
        return context.complexity || '';
      case 'features':
        return context.features ? JSON.stringify(context.features, null, 2) : '';
      case 'techStack':
        return context.techStack ? JSON.stringify(context.techStack, null, 2) : '';
      case 'previousPRD':
        return context.previousPRD ? JSON.stringify(context.previousPRD, null, 2) : '';
      case 'constraints':
        return context.constraints?.join('\\n- ') || '';
      case 'outputFormat':
        return this.getOutputFormatDescription(context.outputFormat);
      default:
        return context.additionalContext?.[variable] || `{${variable}}`;
    }
  }

  /**
   * Adds examples to the prompt for few-shot learning
   */
  private addExamples(prompt: string, examples: Example[]): string {
    if (examples.length === 0) return prompt;

    const examplesSection = examples.map((example, index) => {
      const exampleText = [
        `## Example ${index + 1}`,
        `**Input:**`,
        example.input,
        `**Output:**`,
        example.output
      ];
      
      if (example.explanation) {
        exampleText.push(`**Explanation:**`, example.explanation);
      }
      
      return exampleText.join('\\n');
    }).join('\\n\\n');

    // Insert examples before the main task
    const examplesPlaceholder = '{examples}';
    if (prompt.includes(examplesPlaceholder)) {
      return prompt.replace(examplesPlaceholder, examplesSection);
    } else {
      // Add examples section if no placeholder exists
      const mainTaskMarker = '<main_task>';
      if (prompt.includes(mainTaskMarker)) {
        return prompt.replace(mainTaskMarker, `${examplesSection}\\n\\n<main_task>`);
      } else {
        return `${examplesSection}\\n\\n---\\n\\n${prompt}`;
      }
    }
  }

  /**
   * Formats prompt for specific model/provider
   */
  private formatForModel(prompt: string, model: ModelType): string {
    const provider = this.getProviderFromModel(model);
    
    switch (provider) {
      case LLMProvider.CLAUDE:
        return this.formatForClaude(prompt, model);
      case LLMProvider.GPT:
        return this.formatForGPT(prompt, model);
      default:
        return prompt;
    }
  }

  /**
   * Formats prompt for Claude models
   */
  private formatForClaude(prompt: string, model: ModelType): string {
    // Claude prefers XML-style tags for structure
    return `<instructions>
${prompt}
</instructions>

Please provide a comprehensive and well-structured response following the instructions above.`;
  }

  /**
   * Formats prompt for GPT models
   */
  private formatForGPT(prompt: string, model: ModelType): string {
    // GPT works well with clear section headers
    return `# Task Instructions

${prompt}

---

Please complete this task following the instructions above. Provide a detailed and accurate response.`;
  }

  /**
   * Adds final instructions and constraints
   */
  private addFinalInstructions(prompt: string, context: PromptGenerationContext): string {
    const instructions: string[] = [];

    // Output format instructions
    const formatInstructions = this.getOutputFormatInstructions(context.outputFormat);
    if (formatInstructions) {
      instructions.push(formatInstructions);
    }

    // Quality constraints
    if (context.constraints && context.constraints.length > 0) {
      instructions.push('**Important Constraints:**');
      context.constraints.forEach(constraint => {
        instructions.push(`- ${constraint}`);
      });
    }

    // General quality instructions
    instructions.push(
      '**Quality Requirements:**',
      '- Provide accurate and detailed information',
      '- Use professional language and clear explanations',
      '- Include specific examples where helpful',
      '- Ensure all requirements are addressed',
      '- Double-check for consistency and completeness'
    );

    if (instructions.length > 0) {
      return `${prompt}\\n\\n---\\n\\n${instructions.join('\\n')}`;
    }

    return prompt;
  }

  /**
   * Gets output format description for templates
   */
  private getOutputFormatDescription(format: OutputFormat): string {
    switch (format) {
      case OutputFormat.JSON:
        return 'structured JSON format';
      case OutputFormat.MARKDOWN:
        return 'well-formatted Markdown';
      case OutputFormat.YAML:
        return 'clean YAML structure';
      case OutputFormat.TEXT:
        return 'plain text format';
      default:
        return 'appropriate format';
    }
  }

  /**
   * Gets output format specific instructions
   */
  private getOutputFormatInstructions(format: OutputFormat): string | null {
    switch (format) {
      case OutputFormat.JSON:
        return '**Output Format:** Provide response as valid JSON. Ensure proper escaping and structure.';
      case OutputFormat.MARKDOWN:
        return '**Output Format:** Use proper Markdown formatting with headers, lists, and code blocks where appropriate.';
      case OutputFormat.YAML:
        return '**Output Format:** Provide response as valid YAML with proper indentation and structure.';
      case OutputFormat.TEXT:
        return '**Output Format:** Use plain text with clear structure and line breaks for readability.';
      default:
        return null;
    }
  }

  /**
   * Gets LLM provider from model type
   */
  private getProviderFromModel(model: ModelType): LLMProvider {
    if (model.includes('claude')) {
      return LLMProvider.CLAUDE;
    } else if (model.includes('gpt')) {
      return LLMProvider.GPT;
    } else {
      return LLMProvider.CLAUDE; // Default
    }
  }

  /**
   * Creates a prompt context from parameters
   */
  createPromptContext(
    role: string,
    task: string,
    constraints: string[] = [],
    examples: Example[] = [],
    outputFormat: OutputFormat = OutputFormat.MARKDOWN,
    chainOfThought: boolean = false,
    temperature: number = 0.7,
    maxTokens: number = 4000,
    model: ModelType = ModelType.CLAUDE_3_5_SONNET
  ): PromptContext {
    return {
      role,
      task,
      constraints,
      examples,
      outputFormat,
      chainOfThought,
      temperature,
      maxTokens,
      model
    };
  }

  /**
   * Gets optimized parameters for different task types
   */
  getOptimalParameters(taskType: PromptTaskType, complexity?: string): PromptParameters {
    const baseParams: PromptParameters = {
      temperature: 0.7,
      maxTokens: 4000,
      chainOfThought: false
    };

    switch (taskType) {
      case PromptTaskType.PRD_GENERATION:
        return {
          ...baseParams,
          temperature: 0.3, // Lower for more structured output
          maxTokens: 8000, // Longer for comprehensive PRDs
          chainOfThought: true // Better reasoning for complex requirements
        };

      case PromptTaskType.FEATURE_ANALYSIS:
        return {
          ...baseParams,
          temperature: 0.5,
          maxTokens: 3000,
          chainOfThought: true
        };

      case PromptTaskType.TECH_STACK_SELECTION:
        return {
          ...baseParams,
          temperature: 0.4,
          maxTokens: 2000,
          chainOfThought: false
        };

      case PromptTaskType.CODE_GENERATION:
        return {
          ...baseParams,
          temperature: 0.2, // Very low for precise code
          maxTokens: 6000,
          chainOfThought: false
        };

      default:
        return baseParams;
    }
  }

  /**
   * Validates generated prompt quality
   */
  validatePrompt(prompt: string, context: PromptGenerationContext): PromptValidationResult {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check minimum length
    if (prompt.length < 100) {
      issues.push('Prompt is too short to provide adequate context');
    }

    // Check for template variables that weren't replaced
    const unreplacedVars = prompt.match(/{[^}]+}/g);
    if (unreplacedVars) {
      issues.push(`Unreplaced template variables: ${unreplacedVars.join(', ')}`);
    }

    // Check for required sections
    if (context.userRequest && !prompt.toLowerCase().includes('you are')) {
      warnings.push('Role definition may be unclear');
    }

    // Check token estimate
    const estimatedTokens = this.estimateTokens(prompt);
    if (estimatedTokens > context.maxTokens * 0.8) {
      warnings.push(`Prompt may be too long (estimated ${estimatedTokens} tokens)`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      estimatedTokens
    };
  }

  /**
   * Estimates token count for a prompt
   */
  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token on average
    return Math.ceil(text.length / 4);
  }
}

// Types and interfaces

export enum PromptTaskType {
  PRD_GENERATION = 'prd_generation',
  FEATURE_ANALYSIS = 'feature_analysis',
  TECH_STACK_SELECTION = 'tech_stack_selection',
  CODE_GENERATION = 'code_generation',
  ITERATION_REFINEMENT = 'iteration_refinement',
  VALIDATION = 'validation'
}

export interface PromptGenerationContext {
  userRequest?: string;
  appType?: string;
  complexity?: string;
  features?: any[];
  techStack?: any;
  previousPRD?: any;
  constraints?: string[];
  examples?: Example[];
  outputFormat: OutputFormat;
  chainOfThought: boolean;
  temperature: number;
  maxTokens: number;
  model: ModelType;
  additionalContext?: Record<string, string>;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  variables?: string[];
  taskType: PromptTaskType;
  defaultParameters?: Partial<PromptContext>;
}

export interface PromptParameters {
  temperature: number;
  maxTokens: number;
  chainOfThought: boolean;
}

export interface PromptValidationResult {
  isValid: boolean;
  issues: string[];
  warnings: string[];
  estimatedTokens: number;
}
