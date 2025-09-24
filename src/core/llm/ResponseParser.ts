// Response Parser - Standardizes and validates LLM responses

import {
  LLMResponse,
  OutputFormat,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ErrorType,
  TaskType,
  PRD,
  FunctionalRequirement,
  TechStack,
  Priority
} from '../../models/index.js';

export interface ParsedResponse<T = any> {
  success: boolean;
  data?: T;
  errors: string[];
  warnings: string[];
  format: OutputFormat;
  confidence: number;
}

export interface ParsingOptions {
  expectedFormat?: OutputFormat;
  strictValidation?: boolean;
  allowPartialParsing?: boolean;
  schemaValidation?: boolean;
}

// Simplified types for parsing
interface SimpleTechStackRecommendation {
  category: string;
  technology: string;
  reasoning: string;
  confidence: number;
  alternatives: string[];
}

export class ResponseParser {
  /**
   * Parse LLM response based on task type
   */
  static parse<T>(
    response: LLMResponse,
    taskType: TaskType,
    options: ParsingOptions = {}
  ): ParsedResponse<T> {
    const parser = new ResponseParser();
    
    try {
      // Determine expected format
      const format = options.expectedFormat || parser.inferFormat(response.content);
      
      // Clean and preprocess content
      const cleanedContent = parser.cleanContent(response.content);
      
      // Parse based on task type
      let parsedData: any;
      
      switch (taskType) {
        case TaskType.PRD_GENERATION:
          parsedData = parser.parsePRD(cleanedContent, format);
          break;
        
        case TaskType.FEATURE_ANALYSIS:
          parsedData = parser.parseFeatureAnalysis(cleanedContent, format);
          break;
        
        case TaskType.TECH_STACK_SELECTION:
          parsedData = parser.parseTechStack(cleanedContent, format);
          break;
        
        case TaskType.CODE_GENERATION:
          parsedData = parser.parseCode(cleanedContent, format);
          break;
        
        case TaskType.ARCHITECTURE_DESIGN:
          parsedData = parser.parseArchitecture(cleanedContent, format);
          break;
        
        default:
          parsedData = parser.parseGeneric(cleanedContent, format);
      }
      
      // Validate parsed data
      const validation = parser.validateParsedData(parsedData, taskType, options);
      
      return {
        success: validation.valid,
        data: parsedData as T,
        errors: validation.errors.map(e => e.message),
        warnings: validation.warnings.map(w => w.message),
        format,
        confidence: parser.calculateConfidence(response, parsedData, validation)
      };
      
    } catch (error) {
      return {
        success: false,
        errors: [`Parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        format: OutputFormat.TEXT,
        confidence: 0
      };
    }
  }

  /**
   * Extract structured data from markdown
   */
  static extractFromMarkdown(content: string): {
    sections: Record<string, string>;
    codeBlocks: Array<{ language: string; code: string }>;
    lists: string[][];
    tables: string[][];
  } {
    const parser = new ResponseParser();
    return {
      sections: parser.extractMarkdownSections(content),
      codeBlocks: parser.extractCodeBlocks(content),
      lists: parser.extractLists(content),
      tables: parser.extractTables(content)
    };
  }

  /**
   * Validate JSON structure
   */
  static validateJSON(content: string, schema?: any): ValidationResult {
    try {
      const parsed = JSON.parse(content);
      
      // Basic validation
      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];
      
      if (schema) {
        // Schema validation would go here
        // For now, just basic structure checks
        if (typeof parsed !== 'object') {
          errors.push({
            field: 'root',
            message: 'Expected object at root level',
            constraint: 'type',
            value: typeof parsed
          });
        }
      }
      
      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      return {
        valid: false,
        errors: [{
          field: 'content',
          message: `Invalid JSON: ${error instanceof Error ? error.message : 'Parse error'}`,
          constraint: 'json-syntax'
        }],
        warnings: []
      };
    }
  }

  /**
   * Infer output format from content
   */
  private inferFormat(content: string): OutputFormat {
    const trimmed = content.trim();
    
    // Check for JSON
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        JSON.parse(trimmed);
        return OutputFormat.JSON;
      } catch {
        // Not valid JSON, continue checking
      }
    }
    
    // Check for YAML
    if (trimmed.includes('---') || /^[a-zA-Z_][a-zA-Z0-9_]*:\s/m.test(trimmed)) {
      return OutputFormat.YAML;
    }
    
    // Check for Markdown
    if (trimmed.includes('#') || trimmed.includes('##') || 
        trimmed.includes('```') || trimmed.includes('**')) {
      return OutputFormat.MARKDOWN;
    }
    
    return OutputFormat.TEXT;
  }

  /**
   * Clean and preprocess content
   */
  private cleanContent(content: string): string {
    return content
      .trim()
      .replace(/^\s*```(?:json|yaml|markdown)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n');
  }

  /**
   * Parse PRD document
   */
  private parsePRD(content: string, format: OutputFormat): Partial<PRD> {
    if (format === OutputFormat.JSON) {
      return JSON.parse(content);
    }
    
    if (format === OutputFormat.MARKDOWN) {
      const sections = this.extractMarkdownSections(content);
      
      return ({
        // Just return the raw data for now
        content: sections
      } as unknown) as Partial<PRD>;
    }
    
    // Fallback to text parsing
    return this.parseGeneric(content, format);
  }

  /**
   * Parse feature analysis
   */
  private parseFeatureAnalysis(content: string, format: OutputFormat): FunctionalRequirement[] {
    if (format === OutputFormat.JSON) {
      return JSON.parse(content);
    }
    
    if (format === OutputFormat.MARKDOWN) {
      const sections = this.extractMarkdownSections(content);
      const lists = this.extractLists(content);
      
      // Convert lists to feature requirements
      return lists.flat().map((item, index) => ({
        id: `feature-${index + 1}`,
        title: item.replace(/^\d+\.\s*/, '').split('\n')[0],
        description: item,
        priority: Priority.SHOULD_HAVE,
        acceptanceCriteria: [],
        dependencies: [],
        userStory: item,
        businessRules: []
      }));
    }
    
    return [];
  }

  /**
   * Parse tech stack recommendations
   */
  private parseTechStack(content: string, format: OutputFormat): SimpleTechStackRecommendation[] {
    if (format === OutputFormat.JSON) {
      return JSON.parse(content);
    }
    
    if (format === OutputFormat.MARKDOWN) {
      const sections = this.extractMarkdownSections(content);
      const recommendations: SimpleTechStackRecommendation[] = [];
      
      for (const [sectionName, sectionContent] of Object.entries(sections)) {
        if (sectionName.toLowerCase().includes('frontend') ||
            sectionName.toLowerCase().includes('backend') ||
            sectionName.toLowerCase().includes('database')) {
          
          const category = sectionName.toLowerCase().includes('frontend') ? 'frontend' :
                          sectionName.toLowerCase().includes('backend') ? 'backend' : 'database';
          
          recommendations.push({
            category,
            technology: sectionContent.split('\n')[0] || 'Unknown',
            reasoning: sectionContent,
            confidence: 0.8,
            alternatives: []
          });
        }
      }
      
      return recommendations;
    }
    
    return [];
  }

  /**
   * Parse code generation
   */
  private parseCode(content: string, format: OutputFormat): { files: Array<{ path: string; content: string; language: string }> } {
    const codeBlocks = this.extractCodeBlocks(content);
    
    return {
      files: codeBlocks.map((block, index) => ({
        path: `generated-${index + 1}.${this.getFileExtension(block.language)}`,
        content: block.code,
        language: block.language
      }))
    };
  }

  /**
   * Parse architecture design
   */
  private parseArchitecture(content: string, format: OutputFormat): any {
    if (format === OutputFormat.JSON) {
      return JSON.parse(content);
    }
    
    const sections = this.extractMarkdownSections(content);
    
    return {
      components: this.parseListFromText(sections['components'] || ''),
      dataFlow: sections['data flow'] || sections['dataflow'] || '',
      architecture: sections['architecture'] || sections['overview'] || ''
    };
  }

  /**
   * Parse generic content
   */
  private parseGeneric(content: string, format: OutputFormat): any {
    switch (format) {
      case OutputFormat.JSON:
        return JSON.parse(content);
      
      case OutputFormat.YAML:
        // Would use a YAML parser here
        return { content, format: 'yaml' };
      
      case OutputFormat.MARKDOWN:
        return this.extractMarkdownSections(content);
      
      default:
        return { content, format: 'text' };
    }
  }

  /**
   * Extract markdown sections
   */
  private extractMarkdownSections(content: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const lines = content.split('\n');
    let currentSection = '';
    let currentContent: string[] = [];
    
    for (const line of lines) {
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headerMatch) {
        // Save previous section
        if (currentSection) {
          sections[currentSection.toLowerCase()] = currentContent.join('\n').trim();
        }
        
        // Start new section
        currentSection = headerMatch[2];
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }
    
    // Save last section
    if (currentSection) {
      sections[currentSection.toLowerCase()] = currentContent.join('\n').trim();
    }
    
    return sections;
  }

  /**
   * Extract code blocks
   */
  private extractCodeBlocks(content: string): Array<{ language: string; code: string }> {
    const codeBlocks: Array<{ language: string; code: string }> = [];
    const regex = /```(\w+)?\n([\s\S]*?)\n```/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      codeBlocks.push({
        language: match[1] || 'text',
        code: match[2]
      });
    }
    
    return codeBlocks;
  }

  /**
   * Extract lists from content
   */
  private extractLists(content: string): string[][] {
    const lists: string[][] = [];
    const lines = content.split('\n');
    let currentList: string[] = [];
    
    for (const line of lines) {
      if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
        currentList.push(line.replace(/^\s*[-*+\d.]\s*/, '').trim());
      } else if (currentList.length > 0) {
        lists.push([...currentList]);
        currentList = [];
      }
    }
    
    if (currentList.length > 0) {
      lists.push(currentList);
    }
    
    return lists;
  }

  /**
   * Extract tables from content
   */
  private extractTables(content: string): string[][] {
    const tables: string[][] = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('|')) {
        const row = line.split('|').map(cell => cell.trim()).filter(cell => cell);
        if (row.length > 1) {
          tables.push(row);
        }
      }
    }
    
    return tables;
  }

  /**
   * Parse list from text
   */
  private parseListFromText(text: string): string[] {
    return text
      .split('\n')
      .map(line => line.replace(/^\s*[-*+\d.]\s*/, '').trim())
      .filter(line => line);
  }

  /**
   * Parse requirements from text
   */
  private parseRequirementsFromText(text: string): FunctionalRequirement[] {
    const items = this.parseListFromText(text);
    
    return items.map((item, index) => ({
      id: `req-${index + 1}`,
      title: item.split('\n')[0],
      description: item,
      priority: Priority.SHOULD_HAVE,
      acceptanceCriteria: [],
      dependencies: [],
      userStory: item,
      businessRules: []
    }));
  }

  /**
   * Parse tech stack from text
   */
  private parseTechStackFromText(text: string): any {
    // Return a simplified structure for parsing
    return {
      frontend: text.includes('React') ? 'React' : 'Unknown',
      backend: text.includes('Node') ? 'Node.js' : 'Unknown',
      database: text.includes('PostgreSQL') ? 'PostgreSQL' : 'Unknown'
    };
  }

  /**
   * Validate parsed data
   */
  private validateParsedData(data: any, taskType: TaskType, options: ParsingOptions): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    if (!data) {
      errors.push({
        field: 'data',
        message: 'No data parsed from response',
        constraint: 'required'
      });
      return { valid: false, errors, warnings };
    }
    
    // Task-specific validation
    switch (taskType) {
      case TaskType.PRD_GENERATION:
        if (!data.metadata?.title) {
          warnings.push({
            field: 'title',
            message: 'PRD missing title',
            suggestion: 'Add a descriptive title to the PRD'
          });
        }
        if (!data.metadata?.description) {
          warnings.push({
            field: 'description',
            message: 'PRD missing description',
            suggestion: 'Add a comprehensive description to the PRD'
          });
        }
        break;
      
      case TaskType.FEATURE_ANALYSIS:
        if (!Array.isArray(data)) {
          errors.push({
            field: 'data',
            message: 'Feature analysis should return an array',
            constraint: 'type'
          });
        }
        break;
      
      case TaskType.TECH_STACK_SELECTION:
        if (!Array.isArray(data)) {
          errors.push({
            field: 'data',
            message: 'Tech stack selection should return an array',
            constraint: 'type'
          });
        }
        break;
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(response: LLMResponse, parsedData: any, validation: ValidationResult): number {
    let confidence = 0.5; // Base confidence
    
    // Boost confidence for successful parsing
    if (validation.valid) {
      confidence += 0.3;
    }
    
    // Boost confidence for structured data
    if (typeof parsedData === 'object' && parsedData !== null) {
      confidence += 0.1;
    }
    
    // Reduce confidence for warnings
    confidence -= validation.warnings.length * 0.05;
    
    // Reduce confidence for errors
    confidence -= validation.errors.length * 0.1;
    
    // Consider response metadata
    if (response.metadata?.reasoning) {
      confidence += 0.1;
    }
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Get file extension for language
   */
  private getFileExtension(language: string): string {
    const extensions: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      csharp: 'cs',
      cpp: 'cpp',
      c: 'c',
      go: 'go',
      rust: 'rs',
      php: 'php',
      ruby: 'rb',
      swift: 'swift',
      kotlin: 'kt',
      html: 'html',
      css: 'css',
      scss: 'scss',
      sql: 'sql',
      json: 'json',
      yaml: 'yml',
      markdown: 'md'
    };
    
    return extensions[language.toLowerCase()] || 'txt';
  }
}
