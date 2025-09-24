// Formatters - Output formatting utilities for Spark Clone

import { PRD, UserRequest, ValidationResult, FunctionalRequirement } from '../models/index.js';

export interface FormatOptions {
  includeMetadata?: boolean;
  compact?: boolean;
  colorOutput?: boolean;
  maxWidth?: number;
  indent?: string;
}

export class OutputFormatter {
  private static readonly COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
  };

  /**
   * Format PRD for display
   */
  static formatPRD(prd: PRD, options: FormatOptions = {}): string {
    const { includeMetadata = true, colorOutput = false, indent = '  ' } = options;
    let output = '';
    
    const color = (text: string, colorCode: string) => 
      colorOutput ? `${colorCode}${text}${this.COLORS.reset}` : text;

    // Header
    output += color('━'.repeat(60), this.COLORS.cyan) + '\n';
    output += color('PRODUCT REQUIREMENTS DOCUMENT', this.COLORS.bright) + '\n';
    output += color('━'.repeat(60), this.COLORS.cyan) + '\n\n';

    // Metadata
    if (includeMetadata && prd.metadata) {
      output += color('📋 METADATA', this.COLORS.blue) + '\n';
      output += `${indent}Title: ${color(prd.metadata.title, this.COLORS.white)}\n`;
      output += `${indent}Description: ${prd.metadata.description}\n`;
      if (prd.metadata.author) {
        output += `${indent}Author: ${prd.metadata.author}\n`;
      }
      output += `${indent}Version: ${prd.version}\n`;
      if (prd.metadata.updatedAt) {
        output += `${indent}Last Modified: ${prd.metadata.updatedAt.toISOString()}\n`;
      }
      output += '\n';
    }

    // Product Overview
    if (prd.productOverview) {
      output += color('🎯 PRODUCT OVERVIEW', this.COLORS.green) + '\n';
      output += `${indent}Vision: ${prd.productOverview.vision}\n\n`;
      
      if (prd.productOverview.objectives?.length > 0) {
        output += color('📊 OBJECTIVES', this.COLORS.yellow) + '\n';
        prd.productOverview.objectives.forEach((objective, index) => {
          output += `${indent}${index + 1}. ${objective}\n`;
        });
        output += '\n';
      }

      if (prd.productOverview.valueProposition) {
        output += color('⭐ VALUE PROPOSITION', this.COLORS.cyan) + '\n';
        output += `${indent}${prd.productOverview.valueProposition}\n\n`;
      }
    }

    // Functional Requirements
    if (prd.functionalRequirements?.length > 0) {
      output += color('⚙️  FUNCTIONAL REQUIREMENTS', this.COLORS.green) + '\n';
      prd.functionalRequirements.forEach((req, index) => {
        const priorityColor = req.priority === 'must_have' ? this.COLORS.red :
                            req.priority === 'should_have' ? this.COLORS.yellow :
                            this.COLORS.dim;
        
        output += `${indent}${color(`${index + 1}. ${req.title}`, this.COLORS.white)}\n`;
        output += `${indent}${indent}Description: ${req.description}\n`;
        output += `${indent}${indent}Priority: ${color(req.priority, priorityColor)}\n`;
        
        if (req.acceptanceCriteria?.length > 0) {
          output += `${indent}${indent}Acceptance Criteria:\n`;
          req.acceptanceCriteria.forEach((criteria, i) => {
            output += `${indent}${indent}${indent}${i + 1}. ${criteria}\n`;
          });
        }
        output += '\n';
      });
    }

    // Technical Specifications
    if (prd.technicalSpecifications) {
      output += color('🔧 TECHNICAL SPECIFICATIONS', this.COLORS.magenta) + '\n';
      
      if (prd.technicalSpecifications.architecture) {
        output += `${indent}Architecture Pattern: ${prd.technicalSpecifications.architecture.pattern}\n`;
        output += `${indent}Description: ${prd.technicalSpecifications.architecture.description}\n`;
      }
      
      if (prd.technicalSpecifications.techStack) {
        const techStack = prd.technicalSpecifications.techStack;
        output += `${indent}Frontend Framework: ${techStack.frontend.framework}\n`;
        output += `${indent}Backend Framework: ${techStack.backend.framework}\n`;
        output += `${indent}Database: ${techStack.database.primary.type}\n`;
      }
      
      if (prd.technicalSpecifications.integrations?.length > 0) {
        output += `${indent}Integrations:\n`;
        prd.technicalSpecifications.integrations.forEach(integration => {
          output += `${indent}${indent}• ${integration.name}: ${integration.purpose}\n`;
        });
      }
      output += '\n';
    }

    // Implementation Plan
    if (prd.implementationPlan?.length > 0) {
      output += color('📅 IMPLEMENTATION PLAN', this.COLORS.blue) + '\n';
      prd.implementationPlan.forEach((phase, index) => {
        output += `${indent}${color(`Phase ${index + 1}: ${phase.name}`, this.COLORS.white)}\n`;
        output += `${indent}${indent}Description: ${phase.description}\n`;
        output += `${indent}${indent}Duration: ${phase.duration}\n`;
        if (phase.features?.length > 0) {
          output += `${indent}${indent}Features: ${phase.features.join(', ')}\n`;
        }
        output += '\n';
      });
    }

    return output;
  }

  /**
   * Format PRD as Markdown
   */
  static formatPRDAsMarkdown(prd: PRD): string {
    let markdown = '';
    
    // Header
    markdown += `# ${prd.metadata?.title || 'Product Requirements Document'}\n\n`;
    
    if (prd.metadata?.description) {
      markdown += `${prd.metadata.description}\n\n`;
    }

    // Metadata table
    markdown += '## Document Information\n\n';
    markdown += '| Field | Value |\n';
    markdown += '|-------|-------|\n';
    markdown += `| Version | ${prd.version} |\n`;
    if (prd.metadata?.author) {
      markdown += `| Author | ${prd.metadata.author} |\n`;
    }
    if (prd.metadata?.updatedAt) {
      markdown += `| Last Modified | ${prd.metadata.updatedAt.toISOString()} |\n`;
    }
    markdown += '\n';

    // Product Overview
    if (prd.productOverview) {
      markdown += '## Product Overview\n\n';
      markdown += `**Vision:** ${prd.productOverview.vision}\n\n`;
      
      if (prd.productOverview.objectives?.length > 0) {
        markdown += '### Objectives\n\n';
        prd.productOverview.objectives.forEach(objective => {
          markdown += `- ${objective}\n`;
        });
        markdown += '\n';
      }

      if (prd.productOverview.valueProposition) {
        markdown += '### Value Proposition\n\n';
        markdown += `${prd.productOverview.valueProposition}\n\n`;
      }
    }

    // Functional Requirements
    if (prd.functionalRequirements?.length > 0) {
      markdown += '## Functional Requirements\n\n';
      prd.functionalRequirements.forEach((req, index) => {
        markdown += `### FR-${index + 1}: ${req.title}\n\n`;
        markdown += `**Priority:** ${req.priority}\n\n`;
        markdown += `**Description:** ${req.description}\n\n`;
        
        if (req.acceptanceCriteria?.length > 0) {
          markdown += '**Acceptance Criteria:**\n\n';
          req.acceptanceCriteria.forEach((criteria, i) => {
            markdown += `${i + 1}. ${criteria}\n`;
          });
          markdown += '\n';
        }
      });
    }

    // Technical Specifications
    if (prd.technicalSpecifications) {
      markdown += '## Technical Specifications\n\n';
      
      if (prd.technicalSpecifications.architecture) {
        markdown += `**Architecture Pattern:** ${prd.technicalSpecifications.architecture.pattern}\n\n`;
        markdown += `**Description:** ${prd.technicalSpecifications.architecture.description}\n\n`;
      }
      
      if (prd.technicalSpecifications.techStack) {
        const techStack = prd.technicalSpecifications.techStack;
        markdown += '**Technology Stack:**\n\n';
        markdown += `- **Frontend:** ${techStack.frontend.framework} (${techStack.frontend.version})\n`;
        markdown += `- **Backend:** ${techStack.backend.framework} (${techStack.backend.runtime})\n`;
        markdown += `- **Database:** ${techStack.database.primary.type} (${techStack.database.primary.version})\n`;
        markdown += '\n';
      }
      
      if (prd.technicalSpecifications.integrations?.length > 0) {
        markdown += '**Integrations:**\n\n';
        prd.technicalSpecifications.integrations.forEach(integration => {
          markdown += `- **${integration.name}:** ${integration.purpose}\n`;
        });
        markdown += '\n';
      }
    }

    return markdown;
  }

  /**
   * Format validation results
   */
  static formatValidationResult(result: ValidationResult, options: FormatOptions = {}): string {
    const { colorOutput = false } = options;
    let output = '';

    const color = (text: string, colorCode: string) => 
      colorOutput ? `${colorCode}${text}${this.COLORS.reset}` : text;

    if (result.valid) {
      output += color('✅ Validation Passed', this.COLORS.green) + '\n';
    } else {
      output += color('❌ Validation Failed', this.COLORS.red) + '\n\n';
      
      if (result.errors?.length > 0) {
        output += color('Errors:', this.COLORS.red) + '\n';
        result.errors.forEach((error, index) => {
          output += `  ${index + 1}. ${error.field}: ${error.message}\n`;
        });
        output += '\n';
      }
    }

    if (result.warnings?.length > 0) {
      output += color('Warnings:', this.COLORS.yellow) + '\n';
      result.warnings.forEach((warning, index) => {
        output += `  ${index + 1}. ${warning.field}: ${warning.message}\n`;
        if (warning.suggestion) {
          output += `     Suggestion: ${warning.suggestion}\n`;
        }
      });
    }

    return output;
  }

  /**
   * Format user request for display
   */
  static formatUserRequest(request: UserRequest, options: FormatOptions = {}): string {
    const { colorOutput = false, includeMetadata = true } = options;
    let output = '';

    const color = (text: string, colorCode: string) => 
      colorOutput ? `${colorCode}${text}${this.COLORS.reset}` : text;

    output += color('📝 USER REQUEST', this.COLORS.blue) + '\n';
    output += color('─'.repeat(40), this.COLORS.dim) + '\n';
    
    if (includeMetadata) {
      output += `ID: ${request.id}\n`;
      output += `Session: ${request.sessionId}\n`;
      output += `Timestamp: ${request.timestamp.toISOString()}\n`;
      if (request.userId) {
        output += `User: ${request.userId}\n`;
      }
      output += '\n';
    }

    output += color('Input:', this.COLORS.white) + '\n';
    output += this.wrapText(request.rawInput, 60, '  ') + '\n\n';

    if (request.context && Object.keys(request.context).length > 0) {
      output += color('Context:', this.COLORS.cyan) + '\n';
      Object.entries(request.context).forEach(([key, value]) => {
        output += `  ${key}: ${JSON.stringify(value)}\n`;
      });
    }

    return output;
  }

  /**
   * Format JSON with syntax highlighting
   */
  static formatJSON(obj: any, options: FormatOptions = {}): string {
    const { colorOutput = false } = options;
    
    if (!colorOutput) {
      return JSON.stringify(obj, null, 2);
    }

    const json = JSON.stringify(obj, null, 2);
    return json
      .replace(/("([^"\\]|\\.)*"):/g, `${this.COLORS.blue}$1${this.COLORS.reset}:`)
      .replace(/: ("([^"\\]|\\.)*")/g, `: ${this.COLORS.green}$1${this.COLORS.reset}`)
      .replace(/: (true|false)/g, `: ${this.COLORS.yellow}$1${this.COLORS.reset}`)
      .replace(/: (\d+)/g, `: ${this.COLORS.magenta}$1${this.COLORS.reset}`)
      .replace(/: (null)/g, `: ${this.COLORS.dim}$1${this.COLORS.reset}`);
  }

  /**
   * Wrap text to specified width
   */
  static wrapText(text: string, width: number = 80, prefix: string = ''): string {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = prefix;

    words.forEach(word => {
      if (currentLine.length + word.length + 1 <= width) {
        currentLine += (currentLine.length > prefix.length ? ' ' : '') + word;
      } else {
        if (currentLine.length > prefix.length) {
          lines.push(currentLine);
          currentLine = prefix + word;
        } else {
          // Word is too long, just add it
          currentLine += word;
        }
      }
    });

    if (currentLine.length > prefix.length) {
      lines.push(currentLine);
    }

    return lines.join('\n');
  }

  /**
   * Format file size in human readable format
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
  }

  /**
   * Format duration in human readable format
   */
  static formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 60) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Strip ANSI color codes from text
   */
  static stripColors(text: string): string {
    return text.replace(/\x1b\[[0-9;]*m/g, '');
  }

  /**
   * Truncate text with ellipsis
   */
  static truncate(text: string, maxLength: number = 100, suffix: string = '...'): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - suffix.length) + suffix;
  }
}
