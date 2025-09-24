// src/core/agent/tools/ShellTool.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import { AgentTool } from './ToolRegistry.js';
import { ExecutionContext } from '../planner/WorkflowPlanner.js';

export class ShellTool implements AgentTool {
  name = 'shell';
  description = 'Execute shell commands in the system';
  private execAsync = promisify(exec);
  
  // Security: Allowlist of safe commands
  private allowedCommands = [
    'ls', 'pwd', 'echo', 'cat', 'head', 'tail', 'grep', 'find', 'wc',
    'mkdir', 'touch', 'cp', 'mv', 'rm', 'chmod', 'chown',
    'git', 'npm', 'node', 'python', 'pip', 'which', 'whereis',
    'cd', 'pushd', 'popd', 'du', 'df', 'ps', 'top', 'kill'
  ];

  async execute(params: { command: string; cwd?: string; timeout?: number }, context: ExecutionContext): Promise<any> {
    if (!this.validate(params)) {
      throw new Error('Invalid parameters for Shell tool');
    }

    // Security: Validate command is allowed
    const cmd = params.command.trim().split(' ')[0];
    if (!this.allowedCommands.includes(cmd)) {
      throw new Error(`Command '${cmd}' not allowed for security reasons. Allowed: ${this.allowedCommands.join(', ')}`);
    }

    try {
      const options = {
        cwd: params.cwd || context.workingDirectory,
        timeout: params.timeout || 30000, // 30 second default timeout
        maxBuffer: 1024 * 1024 // 1MB buffer
      };

      console.log(`Executing command: ${params.command}`);
      console.log(`Working directory: ${options.cwd}`);

      const startTime = Date.now();
      const result = await this.execAsync(params.command, options);
      const duration = Date.now() - startTime;

      // Update context with command result
      context.state.set('last_command', params.command);
      context.state.set('last_command_result', result);

      return {
        type: 'shell_result',
        command: params.command,
        cwd: options.cwd,
        stdout: result.stdout,
        stderr: result.stderr,
        duration,
        success: true
      };
    } catch (error: any) {
      console.error('Shell command error:', error);
      
      return {
        type: 'shell_error',
        command: params.command,
        cwd: params.cwd || context.workingDirectory,
        error: error.message,
        exitCode: error.code,
        stdout: error.stdout || '',
        stderr: error.stderr || '',
        success: false
      };
    }
  }

  validate(params: any): boolean {
    if (!params || typeof params.command !== 'string') {
      return false;
    }

    // Basic security checks - prevent dangerous commands
    const dangerousCommands = [
      'rm -rf /',
      'rm -rf *',
      'format',
      'del /f /s /q',
      'shutdown',
      'reboot',
      'halt'
    ];

    const command = params.command.toLowerCase().trim();
    
    for (const dangerous of dangerousCommands) {
      if (command.includes(dangerous)) {
        console.warn(`Blocked potentially dangerous command: ${params.command}`);
        return false;
      }
    }

    return params.command.length > 0;
  }

  // Helper method to check if a command is safe to run
  private isSafeCommand(command: string): boolean {
    // Whitelist of generally safe commands
    const safeCommands = [
      'ls', 'dir', 'pwd', 'cd', 'mkdir', 'touch', 'echo', 'cat', 'head', 'tail',
      'npm', 'yarn', 'node', 'python', 'pip', 'git', 'curl', 'wget',
      'cp', 'mv', 'chmod', 'chown', 'find', 'grep', 'sort', 'uniq',
      'tsc', 'jest', 'test', 'build', 'start', 'dev', 'install'
    ];

    const firstWord = command.split(' ')[0].toLowerCase();
    return safeCommands.some(safe => firstWord.includes(safe));
  }
}
