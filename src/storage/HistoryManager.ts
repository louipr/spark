// History Manager - Manages conversation history and session persistence

import { FileStorage } from './FileStorage.js';
import { PRD, UserRequest } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

export interface ConversationHistory {
  id: string;
  sessionId: string;
  timestamp: Date;
  userInput: string;
  prd: PRD;
  metadata?: {
    iterations?: number;
    confidence?: number;
    processingTime?: number;
    model?: string;
  };
}

export interface HistorySearchOptions {
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

export interface HistoryStats {
  totalConversations: number;
  totalSessions: number;
  averageConfidence: number;
  mostUsedFeatures: string[];
  timeRange: {
    earliest: Date;
    latest: Date;
  };
}

export class HistoryManager {
  private storage: FileStorage;
  private historyFile = 'history/conversations.jsonl'; // JSON Lines format for efficient appending
  private sessionsFile = 'history/sessions.json';
  private indexFile = 'history/index.json';

  constructor(storage: FileStorage) {
    this.storage = storage;
  }

  /**
   * Initialize history storage
   */
  async initialize(): Promise<void> {
    await this.storage.initialize();
    
    // Create index file if it doesn't exist
    if (!(await this.storage.exists(this.indexFile))) {
      await this.storage.writeJSON(this.indexFile, {
        totalConversations: 0,
        lastUpdated: new Date().toISOString(),
        sessions: {}
      });
    }
  }

  /**
   * Add a new conversation to history
   */
  async addConversation(conversation: Omit<ConversationHistory, 'id'>): Promise<string> {
    const id = uuidv4();
    const fullConversation: ConversationHistory = {
      id,
      ...conversation
    };

    // Append to history file using JSON Lines format
    const jsonLine = JSON.stringify(fullConversation) + '\n';
    await this.storage.appendFile(this.historyFile, jsonLine);

    // Update index
    await this.updateIndex(fullConversation);

    return id;
  }

  /**
   * Get recent conversations
   */
  async getRecentConversations(limit: number = 10): Promise<ConversationHistory[]> {
    try {
      if (!(await this.storage.exists(this.historyFile))) {
        return [];
      }

      const content = await this.storage.readFile(this.historyFile);
      const lines = content.trim().split('\n').filter(line => line.trim());
      
      // Get the last N lines
      const recentLines = lines.slice(-limit).reverse();
      
      return recentLines.map(line => {
        const conversation = JSON.parse(line) as ConversationHistory;
        // Parse date strings back to Date objects
        conversation.timestamp = new Date(conversation.timestamp);
        return conversation;
      });
    } catch (error) {
      console.error('Error reading conversation history:', error);
      return [];
    }
  }

  /**
   * Search conversations
   */
  async searchConversations(options: HistorySearchOptions): Promise<ConversationHistory[]> {
    try {
      if (!(await this.storage.exists(this.historyFile))) {
        return [];
      }

      const content = await this.storage.readFile(this.historyFile);
      const lines = content.trim().split('\n').filter(line => line.trim());
      
      let conversations: ConversationHistory[] = lines.map(line => {
        const conversation = JSON.parse(line) as ConversationHistory;
        conversation.timestamp = new Date(conversation.timestamp);
        return conversation;
      });

      // Apply filters
      if (options.startDate) {
        conversations = conversations.filter(c => c.timestamp >= options.startDate!);
      }
      
      if (options.endDate) {
        conversations = conversations.filter(c => c.timestamp <= options.endDate!);
      }
      
      if (options.searchTerm) {
        const searchLower = options.searchTerm.toLowerCase();
        conversations = conversations.filter(c => 
          c.userInput.toLowerCase().includes(searchLower) ||
          c.prd.metadata.title.toLowerCase().includes(searchLower) ||
          c.prd.metadata.description.toLowerCase().includes(searchLower)
        );
      }

      // Sort by timestamp (newest first)
      conversations.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Apply pagination
      const offset = options.offset || 0;
      const limit = options.limit || 50;
      
      return conversations.slice(offset, offset + limit);
    } catch (error) {
      console.error('Error searching conversations:', error);
      return [];
    }
  }

  /**
   * Get conversation by ID
   */
  async getConversationById(id: string): Promise<ConversationHistory | null> {
    try {
      if (!(await this.storage.exists(this.historyFile))) {
        return null;
      }

      const content = await this.storage.readFile(this.historyFile);
      const lines = content.trim().split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const conversation = JSON.parse(line) as ConversationHistory;
        if (conversation.id === id) {
          conversation.timestamp = new Date(conversation.timestamp);
          return conversation;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding conversation:', error);
      return null;
    }
  }

  /**
   * Get conversations by session ID
   */
  async getConversationsBySession(sessionId: string): Promise<ConversationHistory[]> {
    return this.searchConversations({ searchTerm: sessionId });
  }

  /**
   * Get history statistics
   */
  async getHistoryStats(): Promise<HistoryStats> {
    try {
      if (!(await this.storage.exists(this.historyFile))) {
        return {
          totalConversations: 0,
          totalSessions: 0,
          averageConfidence: 0,
          mostUsedFeatures: [],
          timeRange: {
            earliest: new Date(),
            latest: new Date()
          }
        };
      }

      const content = await this.storage.readFile(this.historyFile);
      const lines = content.trim().split('\n').filter(line => line.trim());
      
      const conversations: ConversationHistory[] = lines.map(line => {
        const conversation = JSON.parse(line) as ConversationHistory;
        conversation.timestamp = new Date(conversation.timestamp);
        return conversation;
      });

      const sessionIds = new Set(conversations.map(c => c.sessionId));
      const confidences = conversations
        .map(c => c.metadata?.confidence)
        .filter((c): c is number => c !== undefined);
      
      const timestamps = conversations.map(c => c.timestamp);
      const earliest = new Date(Math.min(...timestamps.map(t => t.getTime())));
      const latest = new Date(Math.max(...timestamps.map(t => t.getTime())));

      // Extract features from PRDs
      const featureTypes = conversations.flatMap(c => 
        c.prd.functionalRequirements?.map(req => req.title).filter(Boolean) || []
      );
      const featureCounts = featureTypes.reduce((acc, feature) => {
        acc[feature] = (acc[feature] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const mostUsedFeatures = Object.entries(featureCounts)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([feature]) => feature);

      return {
        totalConversations: conversations.length,
        totalSessions: sessionIds.size,
        averageConfidence: confidences.length > 0 ? 
          confidences.reduce((a, b) => a + b, 0) / confidences.length : 0,
        mostUsedFeatures,
        timeRange: {
          earliest,
          latest
        }
      };
    } catch (error) {
      console.error('Error calculating history stats:', error);
      return {
        totalConversations: 0,
        totalSessions: 0,
        averageConfidence: 0,
        mostUsedFeatures: [],
        timeRange: {
          earliest: new Date(),
          latest: new Date()
        }
      };
    }
  }

  /**
   * Clear all history
   */
  async clearHistory(): Promise<void> {
    try {
      if (await this.storage.exists(this.historyFile)) {
        await this.storage.deleteFile(this.historyFile);
      }
      
      if (await this.storage.exists(this.sessionsFile)) {
        await this.storage.deleteFile(this.sessionsFile);
      }
      
      if (await this.storage.exists(this.indexFile)) {
        await this.storage.deleteFile(this.indexFile);
      }

      await this.initialize();
    } catch (error) {
      console.error('Error clearing history:', error);
      throw error;
    }
  }

  /**
   * Export history to different formats
   */
  async exportHistory(format: 'json' | 'csv' | 'markdown' = 'json'): Promise<string> {
    const conversations = await this.searchConversations({ limit: 1000 });
    
    switch (format) {
      case 'json':
        return JSON.stringify(conversations, null, 2);
      
      case 'csv':
        return this.convertToCSV(conversations);
      
      case 'markdown':
        return this.convertToMarkdown(conversations);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Update the index file
   */
  private async updateIndex(conversation: ConversationHistory): Promise<void> {
    try {
      let index: any = {};
      
      if (await this.storage.exists(this.indexFile)) {
        index = await this.storage.readJSON(this.indexFile);
      }

      index.totalConversations = (index.totalConversations || 0) + 1;
      index.lastUpdated = new Date().toISOString();
      index.sessions = index.sessions || {};
      
      if (!index.sessions[conversation.sessionId]) {
        index.sessions[conversation.sessionId] = {
          firstConversation: conversation.timestamp.toISOString(),
          conversationCount: 0
        };
      }
      
      index.sessions[conversation.sessionId].conversationCount += 1;
      index.sessions[conversation.sessionId].lastConversation = conversation.timestamp.toISOString();

      await this.storage.writeJSON(this.indexFile, index);
    } catch (error) {
      console.error('Error updating index:', error);
      // Don't throw - index is not critical
    }
  }

  /**
   * Convert conversations to CSV format
   */
  private convertToCSV(conversations: ConversationHistory[]): string {
    const headers = ['ID', 'Timestamp', 'Session ID', 'User Input', 'PRD Title', 'Confidence', 'Iterations'];
    const rows = conversations.map(c => [
      c.id,
      c.timestamp.toISOString(),
      c.sessionId,
      `"${c.userInput.replace(/"/g, '""')}"`, // Escape quotes
      `"${c.prd.metadata.title.replace(/"/g, '""')}"`,
      c.metadata?.confidence?.toString() || '',
      c.metadata?.iterations?.toString() || ''
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * Convert conversations to Markdown format
   */
  private convertToMarkdown(conversations: ConversationHistory[]): string {
    const lines = ['# Conversation History', ''];
    
    for (const conv of conversations) {
      lines.push(`## ${conv.prd.metadata.title}`);
      lines.push(`**Date:** ${conv.timestamp.toLocaleString()}`);
      lines.push(`**Session:** ${conv.sessionId}`);
      lines.push(`**User Input:** ${conv.userInput}`);
      
      if (conv.metadata?.confidence) {
        lines.push(`**Confidence:** ${(conv.metadata.confidence * 100).toFixed(1)}%`);
      }
      
      if (conv.metadata?.iterations) {
        lines.push(`**Iterations:** ${conv.metadata.iterations}`);
      }
      
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Flush any pending writes
   */
  async flush(): Promise<void> {
    // No explicit flushing needed for file system operations
    // This method is here for compatibility with other storage backends
  }
}
