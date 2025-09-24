// State Manager - Manages session state and workflow progression

import {
  UserRequest,
  RequestContext,
  PRD,
  WorkflowState,
  Intent,
  ValidationResult,
  LLMResponse,
  ProcessingStage,
  SessionData
} from '../../models/index.js';

export interface StateSnapshot {
  id: string;
  timestamp: Date;
  stage: ProcessingStage;
  data: any;
  metadata: Record<string, any>;
}

export interface SessionState {
  sessionId: string;
  userId?: string;
  currentRequest: UserRequest;
  context: RequestContext;
  currentPRD?: PRD;
  workflowState: WorkflowState;
  history: StateSnapshot[];
  createdAt: Date;
  updatedAt: Date;
}

export class StateManager {
  private sessions: Map<string, SessionState> = new Map();
  private maxHistorySize = 50;
  private sessionTimeout = 3600000; // 1 hour

  /**
   * Initialize a new session
   */
  initializeSession(
    sessionId: string,
    initialRequest: UserRequest,
    userId?: string
  ): SessionState {
    const session: SessionState = {
      sessionId,
      userId,
      currentRequest: initialRequest,
      context: {
        previousRequests: [],
        iterationCount: 0,
        userPreferences: {
          defaultModel: 'claude-3-5-sonnet-20241022' as any,
          outputFormat: 'markdown' as any,
          complexityPreference: 'medium' as any,
          iterationLimit: 10
        },
        conversationHistory: []
      },
      workflowState: {
        currentStage: 'analyzing_request' as any,
        progress: 0,
        completed: [],
        errors: [],
        metadata: {}
      },
      history: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.sessions.set(sessionId, session);
    this.captureSnapshot(sessionId, 'analyzing_request' as any, initialRequest);
    
    return session;
  }

  /**
   * Get session state
   */
  getSession(sessionId: string): SessionState | undefined {
    const session = this.sessions.get(sessionId);
    
    if (session && this.isSessionExpired(session)) {
      this.sessions.delete(sessionId);
      return undefined;
    }
    
    return session;
  }

  /**
   * Update session state
   */
  updateSession(
    sessionId: string, 
    updates: Partial<SessionState>
  ): SessionState | undefined {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const updatedSession = {
      ...session,
      ...updates,
      updatedAt: new Date()
    };

    this.sessions.set(sessionId, updatedSession);
    
    return updatedSession;
  }

  /**
   * Update workflow stage
   */
  updateWorkflowStage(
    sessionId: string,
    stage: ProcessingStage,
    progress?: number,
    metadata?: Record<string, any>
  ): void {
    const session = this.getSession(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Update workflow state
    session.workflowState.currentStage = stage;
    
    if (progress !== undefined) {
      session.workflowState.progress = Math.max(0, Math.min(100, progress));
    }
    
    if (metadata) {
      session.workflowState.metadata = { ...session.workflowState.metadata, ...metadata };
    }

    // Mark previous stages as completed
    this.markStageCompleted(session, stage);
    
    session.updatedAt = new Date();
    this.sessions.set(sessionId, session);
    
    // Capture snapshot
    this.captureSnapshot(sessionId, stage, { progress, metadata });
  }

  /**
   * Add request to context
   */
  addRequestToContext(sessionId: string, request: UserRequest): void {
    const session = this.getSession(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.context.previousRequests.push(request);
    session.context.iterationCount++;
    session.currentRequest = request;
    session.updatedAt = new Date();
    
    this.sessions.set(sessionId, session);
  }

  /**
   * Add conversation message
   */
  addConversationMessage(
    sessionId: string,
    role: 'user' | 'assistant' | 'system',
    content: string
  ): void {
    const session = this.getSession(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.context.conversationHistory.push({
      role,
      content,
      timestamp: new Date()
    });

    // Limit conversation history size
    if (session.context.conversationHistory.length > 100) {
      session.context.conversationHistory = session.context.conversationHistory.slice(-50);
    }

    session.updatedAt = new Date();
    this.sessions.set(sessionId, session);
  }

  /**
   * Update PRD
   */
  updatePRD(sessionId: string, prd: PRD): void {
    const session = this.getSession(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.currentPRD = prd;
    session.context.currentPRD = prd;
    session.updatedAt = new Date();
    
    this.sessions.set(sessionId, session);
    this.captureSnapshot(sessionId, 'prd_generated' as any, prd);
  }

  /**
   * Add error to workflow
   */
  addError(sessionId: string, error: any): void {
    const session = this.getSession(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const errorRecord = {
      timestamp: new Date(),
      stage: session.workflowState.currentStage,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    };

    session.workflowState.errors.push(errorRecord);
    session.updatedAt = new Date();
    
    this.sessions.set(sessionId, session);
  }

  /**
   * Get session history
   */
  getSessionHistory(sessionId: string): StateSnapshot[] {
    const session = this.getSession(sessionId);
    return session ? session.history : [];
  }

  /**
   * Restore session to a previous state
   */
  restoreSnapshot(sessionId: string, snapshotId: string): boolean {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return false;
    }

    const snapshot = session.history.find(s => s.id === snapshotId);
    
    if (!snapshot) {
      return false;
    }

    // Restore the workflow stage and data
    session.workflowState.currentStage = snapshot.stage;
    session.workflowState.metadata = snapshot.metadata;
    
    // Note: This is a simplified restoration - in practice you'd want to 
    // carefully restore all relevant state
    
    session.updatedAt = new Date();
    this.sessions.set(sessionId, session);
    
    return true;
  }

  /**
   * Export session data
   */
  exportSession(sessionId: string): SessionData | undefined {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return undefined;
    }

    return {
      sessionId: session.sessionId,
      userId: session.userId,
      requests: session.context.previousRequests,
      prd: session.currentPRD,
      conversationHistory: session.context.conversationHistory,
      workflowState: session.workflowState,
      createdAt: session.createdAt,
      completedAt: session.workflowState.currentStage === 'completed' ? session.updatedAt : undefined
    };
  }

  /**
   * Import session data
   */
  importSession(data: SessionData): string {
    const sessionId = data.sessionId;
    
    const session: SessionState = {
      sessionId,
      userId: data.userId,
      currentRequest: data.requests[data.requests.length - 1] || {
        id: 'imported',
        timestamp: data.createdAt,
        rawInput: 'Imported session',
        sessionId
      },
      context: {
        previousRequests: data.requests,
        currentPRD: data.prd,
        iterationCount: data.requests.length,
        userPreferences: {
          defaultModel: 'claude-3-5-sonnet-20241022' as any,
          outputFormat: 'markdown' as any,
          iterationLimit: 10
        },
        conversationHistory: data.conversationHistory
      },
      currentPRD: data.prd,
      workflowState: data.workflowState,
      history: [],
      createdAt: data.createdAt,
      updatedAt: new Date()
    };

    this.sessions.set(sessionId, session);
    
    return sessionId;
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): number {
    let cleaned = 0;
    
    for (const [sessionId, session] of this.sessions) {
      if (this.isSessionExpired(session)) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }
    
    return cleaned;
  }

  /**
   * Get active session count
   */
  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Get session summary
   */
  getSessionSummary(sessionId: string): {
    stage: ProcessingStage;
    progress: number;
    requestCount: number;
    duration: number;
    hasPRD: boolean;
    errorCount: number;
  } | undefined {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return undefined;
    }

    return {
      stage: session.workflowState.currentStage,
      progress: session.workflowState.progress,
      requestCount: session.context.iterationCount,
      duration: Date.now() - session.createdAt.getTime(),
      hasPRD: !!session.currentPRD,
      errorCount: session.workflowState.errors.length
    };
  }

  /**
   * Mark stage as completed
   */
  private markStageCompleted(session: SessionState, currentStage: ProcessingStage): void {
    const stageOrder: ProcessingStage[] = [
      'analyzing_request' as any,
      'generating_prd' as any,
      'validating_output' as any,
      'completed' as any
    ];

    const currentIndex = stageOrder.indexOf(currentStage);
    
    for (let i = 0; i < currentIndex; i++) {
      const stage = stageOrder[i];
      if (!session.workflowState.completed.includes(stage)) {
        session.workflowState.completed.push(stage);
      }
    }
  }

  /**
   * Capture state snapshot
   */
  private captureSnapshot(
    sessionId: string,
    stage: ProcessingStage,
    data: any
  ): void {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return;
    }

    const snapshot: StateSnapshot = {
      id: `${sessionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      stage,
      data,
      metadata: { ...session.workflowState.metadata }
    };

    session.history.push(snapshot);

    // Limit history size
    if (session.history.length > this.maxHistorySize) {
      session.history = session.history.slice(-this.maxHistorySize);
    }
  }

  /**
   * Check if session is expired
   */
  private isSessionExpired(session: SessionState): boolean {
    const now = Date.now();
    const lastActivity = session.updatedAt.getTime();
    
    return (now - lastActivity) > this.sessionTimeout;
  }

  /**
   * Get all sessions
   */
  getAllSessions(): SessionState[] {
    return Array.from(this.sessions.values());
  }
}
