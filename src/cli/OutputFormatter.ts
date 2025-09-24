// Output Formatter for Spark CLI

import chalk from 'chalk';
import boxen from 'boxen';
import { PRD, ValidationResult, ValidationError, ValidationWarning } from '../models/index.js';
import { SparkConfig } from './ConfigManager.js';
import { ValidationReport } from '../core/orchestrator/index.js';

export interface ValidationDisplayReport {
  overallScore: number;
  sectionScores?: Record<string, number>;
  issues?: Array<{
    severity: 'error' | 'warning' | 'info';
    message: string;
    suggestion?: string;
  }>;
  suggestions?: string[];
}

export interface GenerationResult {
  sessionId: string;
  prd: PRD;
  iterations: number;
  validationResult: ValidationReport;
  outputPath?: string;
  processingTime: number;
  confidence: number;
}

export interface SessionInfo {
  sessionId: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  description: string;
  iterations: number;
}

export interface TemplateInfo {
  name: string;
  description: string;
  category: string;
  createdAt: Date;
  usageCount: number;
}

export class OutputFormatter {
  private icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    loading: '🔄',
    spark: '✨',
    document: '📋',
    config: '⚙️',
    session: '🗄️',
    template: '📝',
    validation: '🔍',
    time: '⏱️',
    iterations: '🔄',
    confidence: '📊'
  };

  /**
   * Display generation result
   */
  async displayGenerationResult(result: GenerationResult): Promise<void> {
    const { prd, iterations, validationResult, outputPath, processingTime, confidence } = result;
    
    // Header
    console.log(boxen(
      chalk.bold.green(`${this.icons.spark} PRD Generated Successfully!`),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'green'
      }
    ));

    // Summary stats
    console.log(chalk.cyan('\n📊 Generation Summary:'));
    console.log(`  ${this.icons.document} Title: ${chalk.white(prd.metadata?.title || 'Untitled PRD')}`);
    console.log(`  ${this.icons.iterations} Iterations: ${chalk.yellow(iterations)}`);
    console.log(`  ${this.icons.confidence} Confidence: ${chalk.yellow((confidence * 100).toFixed(1))}%`);
    console.log(`  ${this.icons.time} Processing Time: ${chalk.gray(this.formatDuration(processingTime))}`);
    
    if (outputPath) {
      console.log(`  📁 Output: ${chalk.blue(outputPath)}`);
    }

    // PRD Overview
    this.displayPRDOverview(prd);

    // Validation Results - convert ValidationReport to simple ValidationResult
    if (validationResult) {
      const simpleValidation: ValidationResult = {
        valid: validationResult.overall.valid,
        errors: validationResult.overall.errors,
        warnings: validationResult.overall.warnings
      };
      this.displayValidationSummary(simpleValidation);
    }

    console.log(chalk.green('\n🎉 Your PRD is ready to use!\n'));
  }

  /**
   * Display PRD overview
   */
  displayPRDOverview(prd: PRD): void {
    console.log(chalk.cyan('\n📋 PRD Overview:'));
    
    if (prd.metadata?.description) {
      console.log(chalk.gray(`  ${prd.metadata.description}`));
    }

    if (prd.productOverview?.vision) {
      console.log(chalk.white(`\n  Vision: ${prd.productOverview.vision}`));
    }

    if (prd.functionalRequirements?.length) {
      console.log(chalk.white(`\n  Requirements: ${prd.functionalRequirements.length} functional requirements`));
      
      // Show top 3 requirements
      const topRequirements = prd.functionalRequirements.slice(0, 3);
      topRequirements.forEach((req, index) => {
        console.log(chalk.gray(`    ${index + 1}. ${req.title} (${req.priority})`));
      });
      
      if (prd.functionalRequirements.length > 3) {
        console.log(chalk.gray(`    ... and ${prd.functionalRequirements.length - 3} more`));
      }
    }

    if (prd.technicalSpecifications?.techStack) {
      console.log(chalk.white('\n  Tech Stack:'));
      const { techStack } = prd.technicalSpecifications;
      
      if (techStack.frontend?.framework) {
        console.log(chalk.gray(`    Frontend: ${techStack.frontend.framework}`));
      }
      if (techStack.backend?.framework) {
        console.log(chalk.gray(`    Backend: ${techStack.backend.framework}`));
      }
      if (techStack.database?.primary?.type) {
        console.log(chalk.gray(`    Database: ${techStack.database.primary.type}`));
      }
    }
  }

  /**
   * Display validation summary
   */
  displayValidationSummary(validation: ValidationResult): void {
    console.log(chalk.cyan('\n🔍 Validation Results:'));
    
    const status = validation.valid ? 'PASS' : 'FAIL';
    const statusColor = validation.valid ? 'green' : 'red';
    const icon = validation.valid ? this.icons.success : this.icons.error;
    
    console.log(`  ${icon} Status: ${chalk[statusColor](status)}`);
    
    if (validation.errors.length > 0) {
      console.log(chalk.red(`\n  ${this.icons.error} Errors (${validation.errors.length}):`));
      validation.errors.forEach((error: ValidationError) => {
        console.log(chalk.gray(`    • ${error.message} (${error.field})`));
      });
    }

    if (validation.warnings.length > 0) {
      console.log(chalk.yellow(`\n  ${this.icons.warning} Warnings (${validation.warnings.length}):`));
      validation.warnings.forEach((warning: ValidationWarning) => {
        console.log(chalk.gray(`    • ${warning.message} (${warning.field})`));
        if (warning.suggestion) {
          console.log(chalk.gray(`      💡 ${warning.suggestion}`));
        }
      });
    }

    if (validation.valid && validation.errors.length === 0 && validation.warnings.length === 0) {
      console.log(chalk.green('  ✨ PRD validation passed with no issues!'));
    }
  }

  /**
   * Display configuration
   */
  displayConfig(config: SparkConfig): void {
    console.log(boxen(
      chalk.bold.cyan(`${this.icons.config} Spark Configuration`),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan'
      }
    ));

    const summary = this.getConfigSummaryFallback(config);

    summary.forEach(section => {
      console.log(chalk.cyan(`\n${section.section}:`));
      section.items.forEach((item: any) => {
        const value = typeof item.value === 'boolean' 
          ? (item.value ? chalk.green('enabled') : chalk.red('disabled'))
          : chalk.white(item.value);
        console.log(`  ${chalk.gray(item.key)}: ${value}`);
        if (item.description) {
          console.log(chalk.gray(`    ${item.description}`));
        }
      });
    });
  }

  /**
   * Display sessions
   */
  displaySessions(sessions: SessionInfo[]): void {
    console.log(boxen(
      chalk.bold.blue(`${this.icons.session} Active Sessions`),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'blue'
      }
    ));

    if (sessions.length === 0) {
      console.log(chalk.gray('\nNo active sessions found.\n'));
      return;
    }

    sessions.forEach(session => {
      console.log(chalk.cyan(`\n📄 ${session.sessionId}`));
      console.log(`  Status: ${this.getStatusIcon(session.status)} ${chalk.white(session.status)}`);
      console.log(`  Created: ${chalk.gray(session.createdAt.toLocaleString())}`);
      console.log(`  Iterations: ${chalk.yellow(session.iterations)}`);
      console.log(`  Description: ${chalk.gray(session.description)}`);
    });

    console.log(chalk.blue(`\nTotal: ${sessions.length} sessions\n`));
  }

  /**
   * Display single session info
   */
  displaySessionInfo(session: SessionInfo): void {
    console.log(boxen(
      chalk.bold.blue(`${this.icons.session} Session Information`),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'blue'
      }
    ));

    console.log(chalk.cyan(`\n📄 Session ID: ${session.sessionId}`));
    console.log(`  Status: ${this.getStatusIcon(session.status)} ${chalk.white(session.status)}`);
    console.log(`  Created: ${chalk.gray(session.createdAt.toLocaleString())}`);
    console.log(`  Updated: ${chalk.gray(session.updatedAt.toLocaleString())}`);
    console.log(`  Iterations: ${chalk.yellow(session.iterations)}`);
    console.log(`  Description: ${chalk.gray(session.description)}\n`);
  }

  /**
   * Display templates
   */
  displayTemplates(templates: TemplateInfo[]): void {
    console.log(boxen(
      chalk.bold.magenta(`${this.icons.template} Available Templates`),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'magenta'
      }
    ));

    if (templates.length === 0) {
      console.log(chalk.gray('\nNo templates found.\n'));
      return;
    }

    // Group by category
    const categories = templates.reduce((acc, template) => {
      if (!acc[template.category]) {
        acc[template.category] = [];
      }
      acc[template.category].push(template);
      return acc;
    }, {} as Record<string, TemplateInfo[]>);

    Object.entries(categories).forEach(([category, categoryTemplates]) => {
      console.log(chalk.cyan(`\n${category}:`));
      categoryTemplates.forEach(template => {
        console.log(`  📝 ${chalk.white(template.name)}`);
        console.log(`     ${chalk.gray(template.description)}`);
        console.log(`     Used ${chalk.yellow(template.usageCount)} times`);
      });
    });

    console.log(chalk.magenta(`\nTotal: ${templates.length} templates\n`));
  }

  /**
   * Display validation report
   */
  displayValidationReport(validation: ValidationDisplayReport): void {
    console.log(boxen(
      chalk.bold.blue(`${this.icons.validation} Validation Report`),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'blue'
      }
    ));

    // Overall score
    const score = validation.overallScore * 100;
    const scoreColor = score >= 90 ? 'green' : score >= 70 ? 'yellow' : 'red';
    
    console.log(chalk.cyan('\n📊 Overall Assessment:'));
    console.log(`  Score: ${chalk[scoreColor](`${score.toFixed(1)}%`)}`);
    console.log(`  Status: ${score >= 70 ? chalk.green('PASS') : chalk.red('FAIL')}`);

    // Detailed sections
    if (validation.sectionScores) {
      console.log(chalk.cyan('\n📋 Section Details:'));
      Object.entries(validation.sectionScores).forEach(([section, sectionScore]) => {
        const score = (sectionScore as number) * 100;
        const color = score >= 90 ? 'green' : score >= 70 ? 'yellow' : 'red';
        const status = score >= 70 ? '✅' : '❌';
        
        console.log(`  ${status} ${chalk.white(section)}: ${chalk[color](`${score.toFixed(1)}%`)}`);
      });
    }

    // Issues by severity
    if (validation.issues?.length) {
      const issuesByType = validation.issues.reduce((acc: Record<string, any[]>, issue: any) => {
        if (!acc[issue.severity]) {
          acc[issue.severity] = [];
        }
        acc[issue.severity].push(issue);
        return acc;
      }, {});

      ['error', 'warning', 'info'].forEach(severity => {
        const issues = issuesByType[severity];
        if (issues?.length) {
          const icon = severity === 'error' ? this.icons.error : 
                      severity === 'warning' ? this.icons.warning : this.icons.info;
          const color = severity === 'error' ? 'red' : severity === 'warning' ? 'yellow' : 'blue';
          
          console.log(chalk[color](`\n${icon} ${severity.toUpperCase()} (${issues.length}):`));
          issues.forEach((issue: any) => {
            console.log(chalk.gray(`  • ${issue.message}`));
            if (issue.suggestion) {
              console.log(chalk.gray(`    💡 ${issue.suggestion}`));
            }
          });
        }
      });
    }

    // Suggestions
    if (validation.suggestions?.length) {
      console.log(chalk.blue('\n💡 Recommendations:'));
      validation.suggestions.forEach((suggestion: string, index: number) => {
        console.log(chalk.gray(`  ${index + 1}. ${suggestion}`));
      });
    }

    console.log();
  }

  /**
   * Display error message
   */
  displayError(error: Error | string): void {
    const message = error instanceof Error ? error.message : error;
    console.log(boxen(
      chalk.bold.red(`${this.icons.error} Error`),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'red'
      }
    ));
    console.log(chalk.red(`\n${message}\n`));
  }

  /**
   * Display warning message
   */
  displayWarning(message: string): void {
    console.log(chalk.yellow(`${this.icons.warning} ${message}`));
  }

  /**
   * Display info message
   */
  displayInfo(message: string): void {
    console.log(chalk.blue(`${this.icons.info} ${message}`));
  }

  /**
   * Display success message
   */
  displaySuccess(message: string): void {
    console.log(chalk.green(`${this.icons.success} ${message}`));
  }

  /**
   * Format duration in milliseconds to human readable
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  /**
   * Get status icon
   */
  private getStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return this.icons.success;
      case 'failed':
      case 'error':
        return this.icons.error;
      case 'processing':
      case 'running':
        return this.icons.loading;
      case 'warning':
        return this.icons.warning;
      default:
        return this.icons.info;
    }
  }

  /**
   * Fallback config summary if ConfigManager doesn't have getSummary method
   */
  private getConfigSummaryFallback(config: SparkConfig): any[] {
    return [
      {
        section: 'LLM Providers',
        items: [
          {
            key: 'defaultModel',
            value: config.defaultModel,
            description: 'Default LLM model'
          }
        ]
      },
      {
        section: 'Output',
        items: [
          {
            key: 'defaultOutputFormat',
            value: config.defaultOutputFormat,
            description: 'Default output format'
          }
        ]
      },
      {
        section: 'Generation',
        items: [
          {
            key: 'maxIterations',
            value: config.maxIterations,
            description: 'Maximum iteration count'
          },
          {
            key: 'autoSave',
            value: config.autoSave,
            description: 'Auto-save generated PRDs'
          }
        ]
      }
    ];
  }
}
