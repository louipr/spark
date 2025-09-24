import { spawn } from 'child_process';

export interface CopilotSuggestionResult {
  success: boolean;
  suggestion?: string;
  error?: string;
}

export interface CopilotExplanationResult {
  success: boolean;
  explanation?: string;
  error?: string;
}

export type CopilotTarget = 'shell' | 'git' | 'gh';

/**
 * GitHub Copilot CLI integration for generating command suggestions and explanations
 */
export class GitHubCopilotCLI {
  private readonly timeout: number;

  constructor(timeout: number = 10000) {
    this.timeout = timeout;
  }

  /**
   * Get a command suggestion from GitHub Copilot
   * @param prompt - The natural language prompt
   * @param target - Target type: 'shell', 'git', or 'gh'
   * @returns Promise with suggestion result
   */
  async suggest(prompt: string, target: CopilotTarget = 'shell'): Promise<CopilotSuggestionResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const process = spawn('gh', ['copilot', 'suggest', '-t', target, prompt], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      let suggestionFound = false;
      let hasInteracted = false;
      let isResolved = false;

      const resolveOnce = (result: CopilotSuggestionResult) => {
        if (!isResolved) {
          isResolved = true;
          resolve(result);
        }
      };

      process.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;

        // Look for the suggestion in the output
        if (output.includes('Suggestion:')) {
          suggestionFound = true;
        }

        // If we see the interactive menu and haven't interacted yet, select first option
        if (output.includes('Select an option') && !hasInteracted) {
          hasInteracted = true;
          setTimeout(() => {
            if (!isResolved) {
              try {
                process.stdin.write('\n');
                process.stdin.end();
              } catch (e) {
                // Ignore stdin errors
              }
            }
          }, 200);
        }

        // If we see "Suggestion not readily available", it will go into interactive mode
        if (output.includes('Suggestion not readily available')) {
          setTimeout(() => {
            if (!isResolved) {
              process.kill('SIGTERM');
              resolveOnce({
                success: false,
                error: 'Prompt too complex - requires interactive mode'
              });
            }
          }, 1000);
        }
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // More aggressive timeout for complex prompts
      const timeout = setTimeout(() => {
        const elapsed = Date.now() - startTime;
        if (!isResolved) {
          process.kill('SIGKILL');
          resolveOnce({
            success: false,
            error: `Timeout after ${elapsed}ms - prompt may be too complex`
          });
        }
      }, 8000);

      process.on('close', (code) => {
        clearTimeout(timeout);
        
        if (isResolved) return;

        if (suggestionFound) {
          // Extract the actual command suggestion
          const lines = stdout.split('\n');
          let suggestionIndex = -1;
          
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('Suggestion:')) {
              suggestionIndex = i;
              break;
            }
          }

          if (suggestionIndex >= 0) {
            // Look for the actual command in the next non-empty lines
            for (let i = suggestionIndex + 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (line && 
                  !line.includes('?') && 
                  !line.includes('Select an option') && 
                  !line.includes('Use arrows') &&
                  !line.includes('>')  &&
                  line.length > 0) {
                resolveOnce({
                  success: true,
                  suggestion: line
                });
                return;
              }
            }
          }
        }

        // Check if it's an interactive fallback error
        if (stderr.includes('EOF') || stderr.includes('failed to prompt')) {
          resolveOnce({
            success: false,
            error: 'Interactive prompt required - suggestion may be too complex for automated response'
          });
        } else {
          resolveOnce({
            success: false,
            error: `No suggestion found. Exit code: ${code}${stderr ? ', stderr: ' + stderr.substring(0, 200) : ''}`
          });
        }
      });

      process.on('error', (error) => {
        clearTimeout(timeout);
        if (!isResolved) {
          resolveOnce({
            success: false,
            error: error.message
          });
        }
      });

      // Send initial interaction just in case
      setTimeout(() => {
        if (!isResolved && !hasInteracted) {
          try {
            process.stdin.write('\n');
          } catch (e) {
            // Ignore
          }
        }
      }, 2000);
    });
  }

  /**
   * Get an explanation for a command
   * @param command - The command to explain
   * @returns Promise with explanation result
   */
  async explain(command: string): Promise<CopilotExplanationResult> {
    return new Promise((resolve) => {
      const process = spawn('gh', ['copilot', 'explain', command], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      let explanationFound = false;

      process.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;

        if (output.includes('Explanation:')) {
          explanationFound = true;
        }
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Timeout to handle cases where process hangs
      const timeout = setTimeout(() => {
        process.kill();
        resolve({
          success: false,
          error: 'Timeout waiting for response'
        });
      }, this.timeout);

      process.on('close', (code) => {
        clearTimeout(timeout);
        
        if (explanationFound) {
          // Extract the explanation content
          const lines = stdout.split('\n');
          let explanationIndex = -1;
          
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('Explanation:')) {
              explanationIndex = i;
              break;
            }
          }

          if (explanationIndex >= 0) {
            // Collect all explanation content, stopping at interactive prompts
            const explanationLines: string[] = [];
            for (let i = explanationIndex + 1; i < lines.length; i++) {
              const line = lines[i];
              if (line.includes('?') || line.includes('Select an option')) {
                break;
              }
              explanationLines.push(line);
            }
            
            const explanation = explanationLines.join('\n').trim();
            
            resolve({
              success: true,
              explanation: explanation
            });
            return;
          }
        }

        resolve({
          success: false,
          error: `No explanation found. Exit code: ${code}${stderr ? ', stderr: ' + stderr : ''}`
        });
      });

      process.on('error', (error) => {
        clearTimeout(timeout);
        resolve({
          success: false,
          error: error.message
        });
      });
    });
  }

  /**
   * Check if GitHub Copilot CLI is available
   * @returns Promise indicating if the CLI is available
   */
  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const process = spawn('gh', ['copilot', '--version'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let hasOutput = false;

      process.stdout.on('data', () => {
        hasOutput = true;
      });

      process.on('close', (code) => {
        resolve(code === 0 && hasOutput);
      });

      process.on('error', () => {
        resolve(false);
      });
    });
  }
}
