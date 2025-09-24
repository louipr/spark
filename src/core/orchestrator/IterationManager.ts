// Iteration Manager - Handles iterative refinement of PRDs

import {
  UserRequest,
  PRD,
  LLMResponse,
  ValidationResult,
  Intent,
  Priority,
  ComplexityLevel,
  ProcessingStage
} from '../../models/index.js';
import { StateManager } from './StateManager.js';
import { RequestAnalyzer } from '../analyzer/index.js';
import { PRDGenerator } from '../generator/index.js';
import { LLMRouter, RoutingStrategy } from '../llm/index.js';

export interface IterationConfig {
  maxIterations: number;
  convergenceThreshold: number;
  improvementThreshold: number;
  timeoutMs: number;
  enableAutoApproval: boolean;
}

export interface IterationResult {
  iteration: number;
  prd: PRD;
  improvements: string[];
  confidence: number;
  validation: ValidationResult;
  response: LLMResponse;
  convergenceScore: number;
}

export interface IterationMetrics {
  totalIterations: number;
  averageConfidence: number;
  improvementRate: number;
  convergenceRate: number;
  timeSpent: number;
  userInterventions: number;
}

export class IterationManager {
  private stateManager: StateManager;
  private requestAnalyzer: RequestAnalyzer;
  private prdGenerator: PRDGenerator;
  private agentRouter: LLMRouter;
  private config: IterationConfig;

  constructor(
    stateManager: StateManager,
    requestAnalyzer: RequestAnalyzer,
    prdGenerator: PRDGenerator,
    agentRouter: LLMRouter,
    config: Partial<IterationConfig> = {}
  ) {
    this.stateManager = stateManager;
    this.requestAnalyzer = requestAnalyzer;
    this.prdGenerator = prdGenerator;
    this.agentRouter = agentRouter;
    
    this.config = {
      maxIterations: 5,
      convergenceThreshold: 0.95,
      improvementThreshold: 0.1,
      timeoutMs: 300000, // 5 minutes
      enableAutoApproval: false,
      ...config
    };
  }

  /**
   * Execute iterative refinement process
   */
  async executeIterativeRefinement(
    sessionId: string,
    initialRequest: UserRequest,
    feedback?: string[]
  ): Promise<IterationResult[]> {
    const startTime = Date.now();
    const results: IterationResult[] = [];
    let currentPRD: PRD | undefined;
    let previousConfidence = 0;

    // Initialize session if needed
    let session = this.stateManager.getSession(sessionId);
    if (!session) {
      session = this.stateManager.initializeSession(sessionId, initialRequest);
    }

    try {
      for (let iteration = 1; iteration <= this.config.maxIterations; iteration++) {
        // Check timeout
        if (Date.now() - startTime > this.config.timeoutMs) {
          throw new Error('Iteration timeout exceeded');
        }

        // Update workflow stage
        this.stateManager.updateWorkflowStage(
          sessionId,
          ProcessingStage.GENERATING_PRD,
          (iteration / this.config.maxIterations) * 80, // 80% of total progress
          { iteration, maxIterations: this.config.maxIterations }
        );

        // Analyze current request with iteration context
        const analysisResult = await this.requestAnalyzer.analyze(initialRequest);
        
        // Generate or refine PRD
        const generationResult = currentPRD 
          ? await this.refinePRD(sessionId, currentPRD, feedback, iteration)
          : await this.generateInitialPRD(sessionId, analysisResult);

        // Validate the result
        const validation = await this.validateIteration(generationResult.prd);
        
        // Calculate convergence score
        const convergenceScore = this.calculateConvergenceScore(
          generationResult.prd,
          currentPRD,
          validation,
          generationResult.response
        );

        // Create iteration result
        const iterationResult: IterationResult = {
          iteration,
          prd: generationResult.prd,
          improvements: this.identifyImprovements(currentPRD, generationResult.prd),
          confidence: generationResult.response.metadata?.confidence || 0.5,
          validation,
          response: generationResult.response,
          convergenceScore
        };

        results.push(iterationResult);
        currentPRD = generationResult.prd;

        // Update PRD in session
        this.stateManager.updatePRD(sessionId, currentPRD);

        // Check convergence criteria
        if (this.shouldStopIteration(iterationResult, previousConfidence)) {
          break;
        }

        previousConfidence = iterationResult.confidence;

        // Add iteration delay to prevent rate limiting
        await this.wait(1000);
      }

      // Final validation stage
      this.stateManager.updateWorkflowStage(
        sessionId,
        ProcessingStage.VALIDATING_OUTPUT,
        95,
        { finalIteration: results.length }
      );

      return results;

    } catch (error) {
      this.stateManager.addError(sessionId, error);
      throw error;
    }
  }

  /**
   * Process user feedback and iterate
   */
  async processUserFeedback(
    sessionId: string,
    feedback: string,
    currentPRD: PRD
  ): Promise<IterationResult> {
    // Parse feedback into actionable items
    const feedbackAnalysis = await this.analyzeFeedback(feedback);
    
    // Generate iteration request
    const iterationRequest: UserRequest = {
      id: `feedback-${Date.now()}`,
      timestamp: new Date(),
      rawInput: feedback,
      sessionId,
      context: {
        ...this.stateManager.getSession(sessionId)?.context,
        feedbackType: feedbackAnalysis.type,
        priority: feedbackAnalysis.priority
      } as any
    };

    // Add to session context
    this.stateManager.addRequestToContext(sessionId, iterationRequest);

    // Refine PRD based on feedback
    const refinementResult = await this.refinePRD(sessionId, currentPRD, [feedback], 1);
    
    // Validate refinement
    const validation = await this.validateIteration(refinementResult.prd);
    
    // Calculate improvement score
    const improvements = this.identifyImprovements(currentPRD, refinementResult.prd);
    const convergenceScore = this.calculateConvergenceScore(
      refinementResult.prd,
      currentPRD,
      validation,
      refinementResult.response
    );

    const result: IterationResult = {
      iteration: -1, // Feedback iteration
      prd: refinementResult.prd,
      improvements,
      confidence: refinementResult.response.metadata?.confidence || 0.5,
      validation,
      response: refinementResult.response,
      convergenceScore
    };

    // Update PRD in session
    this.stateManager.updatePRD(sessionId, refinementResult.prd);

    return result;
  }

  /**
   * Get iteration metrics for a session
   */
  getIterationMetrics(sessionId: string): IterationMetrics | undefined {
    const session = this.stateManager.getSession(sessionId);
    
    if (!session) {
      return undefined;
    }

    const history = this.stateManager.getSessionHistory(sessionId);
    const prdSnapshots = history.filter(s => s.stage === ProcessingStage.GENERATING_PRD);
    
    const totalTime = session.updatedAt.getTime() - session.createdAt.getTime();
    const iterations = prdSnapshots.length;
    
    // Calculate average confidence from snapshots
    const confidenceValues = prdSnapshots
      .map(s => s.metadata?.confidence)
      .filter(c => typeof c === 'number');
    
    const averageConfidence = confidenceValues.length > 0
      ? confidenceValues.reduce((sum, c) => sum + c, 0) / confidenceValues.length
      : 0;

    return {
      totalIterations: iterations,
      averageConfidence,
      improvementRate: this.calculateImprovementRate(prdSnapshots),
      convergenceRate: this.calculateConvergenceRate(prdSnapshots),
      timeSpent: totalTime,
      userInterventions: session.context.previousRequests.length
    };
  }

  /**
   * Generate initial PRD
   */
  private async generateInitialPRD(
    sessionId: string,
    analysisResult: any
  ): Promise<{ prd: PRD; response: LLMResponse }> {
    const session = this.stateManager.getSession(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const prd = await this.prdGenerator.generate(session.currentRequest, analysisResult);
    
    // Create mock response for consistency
    const response: LLMResponse = {
      id: `prd-gen-${Date.now()}`,
      model: 'claude-3-5-sonnet-20241022' as any,
      provider: 'claude' as any,
      content: JSON.stringify(prd),
      usage: {
        promptTokens: 1000,
        completionTokens: 2000,
        totalTokens: 3000,
        cost: 0.05
      },
      metadata: {
        requestId: `req-${Date.now()}`,
        timestamp: new Date(),
        processingTime: 5000,
        cacheHit: false,
        confidence: 0.8
      },
      finishReason: 'stop',
      cost: {
        inputCost: 0.02,
        outputCost: 0.03,
        totalCost: 0.05
      }
    };

    return { prd, response };
  }

  /**
   * Refine existing PRD
   */
  private async refinePRD(
    sessionId: string,
    currentPRD: PRD,
    feedback: string[] = [],
    iteration: number
  ): Promise<{ prd: PRD; response: LLMResponse }> {
    // Create refinement prompt
    const refinementPrompt = this.createRefinementPrompt(currentPRD, feedback, iteration);
    
    // Route to appropriate LLM
    const strategy: RoutingStrategy = {
      type: 'performance',
      preferences: {
        requiresStreaming: false
      }
    };

    const response = await this.agentRouter.route(
      [{ role: 'user', content: refinementPrompt }],
      'prd_generation' as any,
      strategy
    );

    // Parse response to PRD
    const refinedPRD = this.parsePRDFromResponse(response.content, currentPRD);

    return { prd: refinedPRD, response };
  }

  /**
   * Validate iteration result
   */
  private async validateIteration(prd: PRD): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Basic validation
    if (!prd.metadata?.title) {
      errors.push({ field: 'title', message: 'PRD must have a title', constraint: 'required' });
    }

    if (!prd.productOverview?.vision) {
      warnings.push({ field: 'problem', message: 'Consider adding problem statement', suggestion: 'Clarify the problem being solved' });
    }

    if (!prd.functionalRequirements || prd.functionalRequirements.length === 0) {
      errors.push({ field: 'requirements', message: 'PRD must have functional requirements', constraint: 'required' });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Calculate convergence score
   */
  private calculateConvergenceScore(
    newPRD: PRD,
    previousPRD: PRD | undefined,
    validation: ValidationResult,
    response: LLMResponse
  ): number {
    let score = 0.5; // Base score

    // Validation contribution (40%)
    if (validation.valid) {
      score += 0.4;
    } else {
      score -= validation.errors.length * 0.1;
    }

    // Response confidence contribution (30%)
    const confidence = response.metadata?.confidence || 0.5;
    score += confidence * 0.3;

    // Stability contribution (30%) - how much did it change?
    if (previousPRD) {
      const stability = this.calculateStability(newPRD, previousPRD);
      score += stability * 0.3;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate stability between PRD versions
   */
  private calculateStability(newPRD: PRD, previousPRD: PRD): number {
    // Simple heuristic: compare key fields
    let similarities = 0;
    let total = 0;

    // Title similarity
    total++;
    if (newPRD.metadata?.title === previousPRD.metadata?.title) {
      similarities++;
    }

    // Requirements count similarity
    total++;
    const newReqCount = newPRD.functionalRequirements?.length || 0;
    const oldReqCount = previousPRD.functionalRequirements?.length || 0;
    
    if (Math.abs(newReqCount - oldReqCount) <= 1) {
      similarities++;
    }

    return total > 0 ? similarities / total : 0;
  }

  /**
   * Identify improvements between PRD versions
   */
  private identifyImprovements(previousPRD: PRD | undefined, newPRD: PRD): string[] {
    const improvements: string[] = [];

    if (!previousPRD) {
      improvements.push('Initial PRD generated');
      return improvements;
    }

    // Compare requirements
    const oldReqCount = previousPRD.functionalRequirements?.length || 0;
    const newReqCount = newPRD.functionalRequirements?.length || 0;
    
    if (newReqCount > oldReqCount) {
      improvements.push(`Added ${newReqCount - oldReqCount} new functional requirements`);
    }

    // Compare metadata
    if (newPRD.metadata?.description && !previousPRD.metadata?.description) {
      improvements.push('Added product description');
    }

    // Compare technical specifications
    if (newPRD.technicalSpecifications && !previousPRD.technicalSpecifications) {
      improvements.push('Added technical specifications');
    }

    return improvements;
  }

  /**
   * Check if iteration should stop
   */
  private shouldStopIteration(result: IterationResult, previousConfidence: number): boolean {
    // High convergence score
    if (result.convergenceScore >= this.config.convergenceThreshold) {
      return true;
    }

    // Valid and high confidence
    if (result.validation.valid && result.confidence >= 0.9) {
      return true;
    }

    // No significant improvement
    if (previousConfidence > 0 && 
        Math.abs(result.confidence - previousConfidence) < this.config.improvementThreshold) {
      return true;
    }

    // Auto-approval enabled and meets minimum criteria
    if (this.config.enableAutoApproval && 
        result.validation.valid && 
        result.confidence >= 0.7) {
      return true;
    }

    return false;
  }

  /**
   * Analyze user feedback
   */
  private async analyzeFeedback(feedback: string): Promise<{
    type: 'clarification' | 'addition' | 'modification' | 'removal';
    priority: Priority;
    targets: string[];
  }> {
    // Simple keyword-based analysis (could be enhanced with LLM)
    const lower = feedback.toLowerCase();
    
    let type: 'clarification' | 'addition' | 'modification' | 'removal' = 'modification';
    
    if (lower.includes('add') || lower.includes('include') || lower.includes('need')) {
      type = 'addition';
    } else if (lower.includes('remove') || lower.includes('delete') || lower.includes('exclude')) {
      type = 'removal';
    } else if (lower.includes('clarify') || lower.includes('explain') || lower.includes('unclear')) {
      type = 'clarification';
    }

    const priority = lower.includes('important') || lower.includes('critical') || lower.includes('must')
      ? Priority.MUST_HAVE
      : Priority.SHOULD_HAVE;

    return {
      type,
      priority,
      targets: [] // Could extract specific targets
    };
  }

  /**
   * Create refinement prompt
   */
  private createRefinementPrompt(prd: PRD, feedback: string[], iteration: number): string {
    let prompt = `Please refine the following PRD based on the feedback provided:\n\n`;
    
    prompt += `Current PRD:\n${JSON.stringify(prd, null, 2)}\n\n`;
    
    if (feedback.length > 0) {
      prompt += `Feedback to address:\n`;
      feedback.forEach((f, i) => {
        prompt += `${i + 1}. ${f}\n`;
      });
      prompt += '\n';
    }
    
    prompt += `This is iteration ${iteration}. Please provide an improved version of the PRD that addresses the feedback while maintaining consistency and completeness.`;
    
    return prompt;
  }

  /**
   * Parse PRD from LLM response
   */
  private parsePRDFromResponse(content: string, fallbackPRD: PRD): PRD {
    try {
      const parsed = JSON.parse(content);
      return { ...fallbackPRD, ...parsed };
    } catch {
      // If parsing fails, return the fallback PRD
      return fallbackPRD;
    }
  }

  /**
   * Calculate improvement rate
   */
  private calculateImprovementRate(snapshots: any[]): number {
    if (snapshots.length < 2) return 0;
    
    let improvements = 0;
    for (let i = 1; i < snapshots.length; i++) {
      const current = snapshots[i].metadata?.confidence || 0;
      const previous = snapshots[i - 1].metadata?.confidence || 0;
      
      if (current > previous) {
        improvements++;
      }
    }
    
    return improvements / (snapshots.length - 1);
  }

  /**
   * Calculate convergence rate
   */
  private calculateConvergenceRate(snapshots: any[]): number {
    if (snapshots.length < 2) return 0;
    
    const confidenceValues = snapshots
      .map(s => s.metadata?.confidence)
      .filter(c => typeof c === 'number');
    
    if (confidenceValues.length < 2) return 0;
    
    // Calculate variance reduction over time
    const firstHalf = confidenceValues.slice(0, Math.floor(confidenceValues.length / 2));
    const secondHalf = confidenceValues.slice(Math.floor(confidenceValues.length / 2));
    
    const variance1 = this.calculateVariance(firstHalf);
    const variance2 = this.calculateVariance(secondHalf);
    
    return variance1 > 0 ? Math.max(0, (variance1 - variance2) / variance1) : 0;
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    
    return squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length;
  }

  /**
   * Wait for specified milliseconds
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
