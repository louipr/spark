import { describe, test, expect, beforeEach } from '@jest/globals';
import { StateManager } from '../../../../src/core/orchestrator/StateManager.js';
import { ProcessingStage, UserRequest } from '../../../../src/models/index.js';

describe('StateManager', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    stateManager = new StateManager();
  });

  describe('session management', () => {
    test('should initialize a new session with required data', () => {
      const sessionId = 'test-session-123';
      const userId = 'user-123';
      const mockRequest: UserRequest = {
        id: 'req-1',
        rawInput: 'Test request',
        timestamp: new Date(),
        sessionId
      };

      const session = stateManager.initializeSession(sessionId, mockRequest, userId);

      expect(session).toBeDefined();
      expect(session.sessionId).toBe(sessionId);
      expect(session.userId).toBe(userId);
      expect(session.createdAt).toBeInstanceOf(Date);
    });

    test('should retrieve existing session', () => {
      const sessionId = 'test-session-456';
      const mockRequest: UserRequest = {
        id: 'req-1',
        rawInput: 'Test request',
        timestamp: new Date(),
        sessionId
      };

      const originalSession = stateManager.initializeSession(sessionId, mockRequest);
      const retrievedSession = stateManager.getSession(sessionId);

      expect(retrievedSession).toEqual(originalSession);
    });

    test('should return undefined for non-existent session', () => {
      const result = stateManager.getSession('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('session updates', () => {
    test('should update session workflow stage', () => {
      const sessionId = 'test-session-update';
      const mockRequest: UserRequest = {
        id: 'req-1',
        rawInput: 'Test request',
        timestamp: new Date(),
        sessionId
      };

      stateManager.initializeSession(sessionId, mockRequest);
      stateManager.updateWorkflowStage(sessionId, ProcessingStage.GENERATING_PRD, 75);

      const session = stateManager.getSession(sessionId);
      expect(session!.workflowState.currentStage).toBe(ProcessingStage.GENERATING_PRD);
      expect(session!.workflowState.progress).toBe(75);
    });

    test('should handle error for non-existent session update', () => {
      expect(() => {
        stateManager.updateWorkflowStage('non-existent', ProcessingStage.ANALYZING_REQUEST, 50);
      }).toThrow();
    });
  });

  describe('context management', () => {
    test('should manage session context', () => {
      const sessionId = 'test-context';
      const mockRequest: UserRequest = {
        id: 'req-1',
        rawInput: 'Create a web app',
        timestamp: new Date(),
        sessionId
      };

      const session = stateManager.initializeSession(sessionId, mockRequest);
      expect(session.context).toBeDefined();
      expect(session.currentRequest).toEqual(mockRequest);
    });
  });
});
