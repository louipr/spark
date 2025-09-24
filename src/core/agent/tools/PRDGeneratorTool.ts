// src/core/agent/tools/PRDGeneratorTool.ts
import { PRDGenerator } from '../../generator/PRDGenerator.js';
import { RequestAnalyzer } from '../../analyzer/RequestAnalyzer.js';
import { AgentTool } from './ToolRegistry.js';
import { ExecutionContext } from '../planner/WorkflowPlanner.js';
import { UserRequest } from '../../../models/index.js';

export class PRDGeneratorTool implements AgentTool {
  name = 'prd_generator';
  description = 'Generate Product Requirements Document from user request';
  private generator = new PRDGenerator();
  private analyzer = new RequestAnalyzer();

  async execute(params: { request: string; analysis?: any; includeSpecs?: boolean }, context: ExecutionContext): Promise<any> {
    if (!this.validate(params)) {
      throw new Error('Invalid parameters for PRD Generator tool');
    }

    try {
      // Create UserRequest object from string
      const userRequest: UserRequest = {
        id: `req_${Date.now()}`,
        timestamp: new Date(),
        rawInput: params.request,
        sessionId: context.state.get('sessionId') || `session_${Date.now()}`
      };

      // If analysis is not provided, analyze the request first
      let analysis = params.analysis;
      if (!analysis) {
        console.log('Analyzing request for PRD generation...');
        analysis = await this.analyzer.analyze(userRequest);
      }

      // Generate the PRD
      console.log('Generating PRD...');
      const prd = await this.generator.generate(userRequest, analysis);

      // Store the PRD in context for future steps
      context.state.set('generated_prd', prd);
      context.state.set('project_title', prd.metadata.title);
      context.state.set('tech_stack', prd.technicalSpecifications);

      return {
        type: 'prd',
        prd,
        summary: {
          title: prd.metadata.title,
          vision: prd.productOverview.vision,
          features: prd.functionalRequirements.length,
          techStack: prd.technicalSpecifications.architecture?.pattern || 'Not specified'
        },
        artifact: {
          type: 'document',
          name: 'PRD',
          content: prd
        }
      };
    } catch (error) {
      console.error('PRD Generator tool error:', error);
      return {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'prd_generator'
      };
    }
  }

  validate(params: any): boolean {
    return (
      params &&
      typeof params.request === 'string' &&
      params.request.length > 0
    );
  }
}
