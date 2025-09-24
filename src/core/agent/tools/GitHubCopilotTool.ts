// src/core/agent/tools/GitHubCopilotTool.ts
import { GitHubCopilotCLI } from '../../../integrations/GitHubCopilotCLI.js';
import { AgentTool } from './ToolRegistry.js';
import { ExecutionContext } from '../planner/WorkflowPlanner.js';

export class GitHubCopilotTool implements AgentTool {
  name = 'github_copilot';
  description = 'Get command suggestions and explanations from GitHub Copilot CLI';
  private cli = new GitHubCopilotCLI();

  async execute(params: { action: string; prompt: string }, context: ExecutionContext): Promise<any> {
    if (!this.validate(params)) {
      throw new Error('Invalid parameters for GitHub Copilot tool');
    }

    try {
      switch (params.action) {
        case 'suggest':
          const suggestion = await this.cli.suggest(params.prompt);
          return {
            type: 'suggestion',
            content: suggestion,
            source: 'github_copilot'
          };

        case 'explain':
          const explanation = await this.cli.explain(params.prompt);
          return {
            type: 'explanation',
            content: explanation,
            source: 'github_copilot'
          };

        case 'chat':
          // For chat, we'll use the suggest method as a fallback
          const chatResponse = await this.cli.suggest(`Chat: ${params.prompt}`);
          return {
            type: 'chat',
            content: chatResponse,
            source: 'github_copilot'
          };

        default:
          throw new Error(`Unknown GitHub Copilot action: ${params.action}`);
      }
    } catch (error) {
      console.error('GitHub Copilot tool error:', error);
      return {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'github_copilot'
      };
    }
  }

  validate(params: any): boolean {
    return (
      params &&
      typeof params.action === 'string' &&
      typeof params.prompt === 'string' &&
      params.action.length > 0 &&
      params.prompt.length > 0 &&
      ['suggest', 'explain', 'chat'].includes(params.action)
    );
  }
}
