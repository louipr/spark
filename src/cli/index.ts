// Main CLI Entry Point - GitHub Copilot Spark Clone

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import boxen from 'boxen';
import { SparkCLI } from './SparkCLI.js';
import { ConfigManager } from './ConfigManager.js';
import { OutputFormatter } from './OutputFormatter.js';

const program = new Command();
const sparkCLI = new SparkCLI();
const configManager = new ConfigManager();
const formatter = new OutputFormatter();

// CLI Metadata
program
  .name('spark')
  .description('GitHub Copilot Spark Clone - Transform natural language into Product Requirements Documents')
  .version('1.0.0')
  .helpOption('-h, --help', 'Display help information');

// Global options
program
  .option('-v, --verbose', 'Enable verbose output')
  .option('-q, --quiet', 'Suppress non-essential output')
  .option('--no-color', 'Disable colored output')
  .option('--config <path>', 'Specify config file path')
  .option('--api-key <key>', 'Override API key for LLM providers');

/**
 * Main spark command - Interactive mode
 */
program
  .command('generate')
  .alias('g')
  .description('Generate a PRD from natural language description')
  .argument('[description]', 'Project description (optional - will prompt if not provided)')
  .option('-o, --output <path>', 'Output file path for the generated PRD')
  .option('-f, --format <type>', 'Output format (json, markdown, yaml)', 'markdown')
  .option('-m, --model <model>', 'LLM model to use (claude, gpt, copilot)', 'claude')
  .option('-i, --iterations <num>', 'Maximum iterations for refinement', '3')
  .option('--no-interactive', 'Disable interactive mode')
  .option('--template <name>', 'Use predefined template')
  .action(async (description, options) => {
    try {
      await handleGenerateCommand(description, options);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

/**
 * Configuration management
 */
program
  .command('config')
  .description('Manage Spark configuration')
  .option('--init', 'Initialize configuration')
  .option('--set <key=value>', 'Set configuration value')
  .option('--get <key>', 'Get configuration value')
  .option('--list', 'List all configuration values')
  .option('--reset', 'Reset to default configuration')
  .action(async (options) => {
    try {
      await handleConfigCommand(options);
    } catch (error) {
      console.error(chalk.red('Configuration Error:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

/**
 * Session management
 */
program
  .command('session')
  .description('Manage Spark sessions')
  .option('--list', 'List all sessions')
  .option('--resume <id>', 'Resume a previous session')
  .option('--export <id>', 'Export session data')
  .option('--import <path>', 'Import session data')
  .option('--cleanup', 'Clean up old sessions')
  .action(async (options) => {
    try {
      await handleSessionCommand(options);
    } catch (error) {
      console.error(chalk.red('Session Error:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

/**
 * Template management
 */
program
  .command('template')
  .description('Manage PRD templates')
  .option('--list', 'List available templates')
  .option('--create <name>', 'Create new template')
  .option('--delete <name>', 'Delete template')
  .option('--export <name>', 'Export template')
  .option('--import <path>', 'Import template')
  .action(async (options) => {
    try {
      await handleTemplateCommand(options);
    } catch (error) {
      console.error(chalk.red('Template Error:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

/**
 * Validation command
 */
program
  .command('validate')
  .description('Validate an existing PRD')
  .argument('<file>', 'PRD file to validate')
  .option('--strict', 'Enable strict validation mode')
  .option('--format <type>', 'Input format (json, markdown, yaml)', 'markdown')
  .option('--output <path>', 'Output validation report')
  .action(async (file, options) => {
    try {
      await handleValidateCommand(file, options);
    } catch (error) {
      console.error(chalk.red('Validation Error:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

/**
 * Interactive mode command
 */
program
  .command('interactive')
  .alias('i')
  .description('Start interactive Spark session')
  .option('--resume <id>', 'Resume previous session')
  .action(async (options) => {
    try {
      await handleInteractiveCommand(options);
    } catch (error) {
      console.error(chalk.red('Interactive Error:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

/**
 * Handle generate command
 */
async function handleGenerateCommand(description: string, options: any): Promise<void> {
  const spinner = ora('Initializing Spark...').start();
  
  try {
    // Initialize CLI
    await sparkCLI.initialize(options);
    spinner.succeed('Spark initialized');

    // Get description if not provided
    let projectDescription = description;
    if (!projectDescription && !options.noInteractive) {
      spinner.stop();
      const response = await inquirer.prompt([
        {
          type: 'editor',
          name: 'description',
          message: 'Describe your project (this will open your default editor):',
          validate: (input: string) => input.trim().length > 10 || 'Please provide a more detailed description'
        }
      ]);
      projectDescription = response.description;
    }

    if (!projectDescription) {
      throw new Error('Project description is required');
    }

    // Show welcome message
    console.log(boxen(
      chalk.cyan.bold('🚀 Spark - GitHub Copilot Clone\n') +
      chalk.white('Transforming your idea into a comprehensive PRD...'),
      { 
        padding: 1, 
        margin: 1, 
        borderStyle: 'round',
        borderColor: 'cyan'
      }
    ));

    // Generate PRD
    const result = await sparkCLI.generatePRD({
      description: projectDescription,
      format: options.format,
      model: options.model,
      maxIterations: parseInt(options.iterations),
      interactive: !options.noInteractive,
      outputPath: options.output,
      template: options.template
    });

    // Display results
    await formatter.displayGenerationResult(result);

  } catch (error) {
    spinner.fail('Generation failed');
    throw error;
  }
}

/**
 * Handle config command
 */
async function handleConfigCommand(options: any): Promise<void> {
  if (options.init) {
    await configManager.initialize();
    console.log(chalk.green('✓ Configuration initialized'));
    return;
  }

  if (options.set) {
    const [key, value] = options.set.split('=');
    if (!key || !value) {
      throw new Error('Invalid format. Use: --set key=value');
    }
    await configManager.set(key, value);
    console.log(chalk.green(`✓ Set ${key} = ${value}`));
    return;
  }

  if (options.get) {
    const value = await configManager.get(options.get);
    console.log(`${options.get}: ${value}`);
    return;
  }

  if (options.list) {
    const config = await configManager.getAll();
    formatter.displayConfig(config);
    return;
  }

  if (options.reset) {
    const confirm = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'reset',
        message: 'Are you sure you want to reset all configuration?',
        default: false
      }
    ]);

    if (confirm.reset) {
      await configManager.reset();
      console.log(chalk.green('✓ Configuration reset to defaults'));
    }
    return;
  }

  // Default: show current config
  const config = await configManager.getAll();
  formatter.displayConfig(config);
}

/**
 * Handle session command
 */
async function handleSessionCommand(options: any): Promise<void> {
  if (options.list) {
    const sessions = await sparkCLI.listSessions();
    formatter.displaySessions(sessions);
    return;
  }

  if (options.resume) {
    const result = await sparkCLI.resumeSession(options.resume);
    console.log(chalk.green(`✓ Resumed session: ${options.resume}`));
    formatter.displaySessionInfo(result);
    return;
  }

  if (options.export) {
    const exported = await sparkCLI.exportSession(options.export);
    console.log(chalk.green(`✓ Session exported to: ${exported.path}`));
    return;
  }

  if (options.import) {
    const imported = await sparkCLI.importSession(options.import);
    console.log(chalk.green(`✓ Session imported: ${imported.sessionId}`));
    return;
  }

  if (options.cleanup) {
    const cleaned = await sparkCLI.cleanupSessions();
    console.log(chalk.green(`✓ Cleaned up ${cleaned.count} old sessions`));
    return;
  }

  // Default: list sessions
  const sessions = await sparkCLI.listSessions();
  formatter.displaySessions(sessions);
}

/**
 * Handle template command
 */
async function handleTemplateCommand(options: any): Promise<void> {
  if (options.list) {
    const templates = await sparkCLI.listTemplates();
    formatter.displayTemplates(templates);
    return;
  }

  if (options.create) {
    const template = await sparkCLI.createTemplate(options.create);
    console.log(chalk.green(`✓ Template created: ${options.create}`));
    return;
  }

  if (options.delete) {
    const confirm = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'delete',
        message: `Are you sure you want to delete template "${options.delete}"?`,
        default: false
      }
    ]);

    if (confirm.delete) {
      await sparkCLI.deleteTemplate(options.delete);
      console.log(chalk.green(`✓ Template deleted: ${options.delete}`));
    }
    return;
  }

  if (options.export) {
    const exported = await sparkCLI.exportTemplate(options.export);
    console.log(chalk.green(`✓ Template exported to: ${exported.path}`));
    return;
  }

  if (options.import) {
    const imported = await sparkCLI.importTemplate(options.import);
    console.log(chalk.green(`✓ Template imported: ${imported.name}`));
    return;
  }

  // Default: list templates
  const templates = await sparkCLI.listTemplates();
  formatter.displayTemplates(templates);
}

/**
 * Handle validate command
 */
async function handleValidateCommand(file: string, options: any): Promise<void> {
  const spinner = ora('Validating PRD...').start();

  try {
    const result = await sparkCLI.validatePRD({
      filePath: file,
      format: options.format,
      strict: options.strict,
      outputPath: options.output
    });

    spinner.succeed('Validation complete');
    
    // Convert ValidationReport to ValidationDisplayReport for display
    const displayReport = {
      overallScore: result.qualityScore,
      sectionScores: Object.entries(result.sections).reduce((acc, [key, value]) => {
        acc[key] = (value as any).valid ? 1.0 : 0.5; // Simple conversion
        return acc;
      }, {} as Record<string, number>),
      issues: [
        ...result.overall.errors.map((e: any) => ({ severity: 'error' as const, message: e.message })),
        ...result.overall.warnings.map((w: any) => ({ severity: 'warning' as const, message: w.message }))
      ],
      suggestions: result.recommendations
    };
    
    formatter.displayValidationReport(displayReport);

  } catch (error) {
    spinner.fail('Validation failed');
    throw error;
  }
}

/**
 * Handle interactive command
 */
async function handleInteractiveCommand(options: any): Promise<void> {
  console.log(boxen(
    chalk.cyan.bold('🚀 Spark Interactive Mode\n') +
    chalk.white('Type your project description or use commands:\n') +
    chalk.gray('  /help    - Show available commands\n') +
    chalk.gray('  /config  - Show configuration\n') +
    chalk.gray('  /session - Manage sessions\n') +
    chalk.gray('  /exit    - Exit interactive mode'),
    { 
      padding: 1, 
      margin: 1, 
      borderStyle: 'round',
      borderColor: 'cyan'
    }
  ));

  await sparkCLI.startInteractiveMode(options);
}

/**
 * Handle uncaught errors
 */
process.on('uncaughtException', (error) => {
  console.error(chalk.red('\nUncaught Exception:'), error.message);
  if (program.opts().verbose) {
    console.error(error.stack);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('\nUnhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

/**
 * Show banner on help
 */
program.on('--help', () => {
  console.log(boxen(
    chalk.cyan.bold('GitHub Copilot Spark Clone\n') +
    chalk.white('Transform natural language into comprehensive PRDs\n\n') +
    chalk.gray('Examples:\n') +
    chalk.yellow('  spark generate "Build a todo app with React"\n') +
    chalk.yellow('  spark interactive\n') +
    chalk.yellow('  spark validate my-prd.md\n') +
    chalk.yellow('  spark config --set model=gpt'),
    { 
      padding: 1, 
      margin: 1, 
      borderStyle: 'round',
      borderColor: 'cyan'
    }
  ));
});

/**
 * Parse CLI arguments and execute
 */
async function main() {
  try {
    // Set global options
    const globalOpts = program.opts();
    
    if (globalOpts.noColor) {
      chalk.level = 0;
    }

    if (globalOpts.config) {
      configManager.setConfigPath(globalOpts.config);
    }

    // Parse and execute
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error(chalk.red('CLI Error:'), error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Only run main if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { program, sparkCLI, configManager, formatter };
