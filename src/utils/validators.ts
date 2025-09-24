// Validators - Input validation utilities for Spark Clone

import { UserRequest, PRD, ValidationResult, ValidationError } from '../models/index.js';

export interface ValidationOptions {
  strict?: boolean;
  required?: string[];
  maxLength?: Record<string, number>;
  minLength?: Record<string, number>;
  patterns?: Record<string, RegExp>;
}

export class InputValidator {
  /**
   * Validate user request
   */
  static validateUserRequest(request: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: any[] = [];

    // Check required fields
    if (!request) {
      errors.push({
        field: 'request',
        message: 'Request object is required',
        constraint: 'required'
      });
      return { valid: false, errors, warnings };
    }

    if (!request.id || typeof request.id !== 'string') {
      errors.push({
        field: 'id',
        message: 'Request ID is required and must be a string',
        constraint: 'required'
      });
    }

    if (!request.rawInput || typeof request.rawInput !== 'string') {
      errors.push({
        field: 'rawInput',
        message: 'Raw input is required and must be a string',
        constraint: 'required'
      });
    } else {
      // Check input length
      if (request.rawInput.trim().length === 0) {
        errors.push({
          field: 'rawInput',
          message: 'Raw input cannot be empty',
          constraint: 'minLength'
        });
      }
      
      if (request.rawInput.length > 10000) {
        errors.push({
          field: 'rawInput',
          message: 'Raw input is too long (max 10,000 characters)',
          constraint: 'maxLength'
        });
      }
      
      // Warn about potentially vague input
      if (request.rawInput.trim().length < 10) {
        warnings.push({
          field: 'rawInput',
          message: 'Input is very short and may be too vague',
          suggestion: 'Consider providing more detailed description'
        });
      }
    }

    if (!request.sessionId || typeof request.sessionId !== 'string') {
      errors.push({
        field: 'sessionId',
        message: 'Session ID is required and must be a string',
        constraint: 'required'
      });
    }

    if (!request.timestamp || !(request.timestamp instanceof Date)) {
      errors.push({
        field: 'timestamp',
        message: 'Timestamp is required and must be a Date object',
        constraint: 'required'
      });
    }

    // Optional fields validation
    if (request.userId !== undefined && typeof request.userId !== 'string') {
      errors.push({
        field: 'userId',
        message: 'User ID must be a string if provided',
        constraint: 'type'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate PRD structure
   */
  static validatePRD(prd: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: any[] = [];

    if (!prd) {
      errors.push({
        field: 'prd',
        message: 'PRD object is required',
        constraint: 'required'
      });
      return { valid: false, errors, warnings };
    }

    // Check required top-level fields
    const requiredFields = ['id', 'version', 'metadata', 'productOverview'];
    for (const field of requiredFields) {
      if (!prd[field]) {
        errors.push({
          field,
          message: `${field} is required`,
          constraint: 'required'
        });
      }
    }

    // Validate metadata
    if (prd.metadata) {
      if (!prd.metadata.title || typeof prd.metadata.title !== 'string') {
        errors.push({
          field: 'metadata.title',
          message: 'PRD title is required and must be a string',
          constraint: 'required'
        });
      }
      
      if (!prd.metadata.description || typeof prd.metadata.description !== 'string') {
        errors.push({
          field: 'metadata.description',
          message: 'PRD description is required and must be a string',
          constraint: 'required'
        });
      }
    }

    // Validate product overview
    if (prd.productOverview) {
      if (!prd.productOverview.description || typeof prd.productOverview.description !== 'string') {
        errors.push({
          field: 'productOverview.description',
          message: 'Product description is required',
          constraint: 'required'
        });
      }
    }

    // Check for empty required arrays
    const arrayFields = ['functionalRequirements'];
    for (const field of arrayFields) {
      if (prd[field] && Array.isArray(prd[field])) {
        if (prd[field].length === 0) {
          warnings.push({
            field,
            message: `${field} array is empty`,
            suggestion: `Consider adding at least one ${field.slice(0, -1)}`
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate email address
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL
   */
  static validateURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate API key format
   */
  static validateAPIKey(apiKey: string, provider: string): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (!apiKey || typeof apiKey !== 'string') {
      errors.push({
        field: 'apiKey',
        message: 'API key is required and must be a string',
        constraint: 'required'
      });
      return { valid: false, errors, warnings: [] };
    }

    // Basic length check
    if (apiKey.length < 10) {
      errors.push({
        field: 'apiKey',
        message: 'API key appears to be too short',
        constraint: 'minLength'
      });
    }

    // Provider-specific validation
    switch (provider.toLowerCase()) {
      case 'openai':
      case 'gpt':
        if (!apiKey.startsWith('sk-')) {
          errors.push({
            field: 'apiKey',
            message: 'OpenAI API key should start with "sk-"',
            constraint: 'format'
          });
        }
        break;
      
      case 'anthropic':
      case 'claude':
        if (!apiKey.startsWith('sk-ant-')) {
          errors.push({
            field: 'apiKey',
            message: 'Anthropic API key should start with "sk-ant-"',
            constraint: 'format'
          });
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * Validate file path
   */
  static validateFilePath(filePath: string): boolean {
    if (!filePath || typeof filePath !== 'string') {
      return false;
    }

    // Check for valid characters (basic validation)
    const invalidChars = /[<>:"|?*]/;
    return !invalidChars.test(filePath);
  }

  /**
   * Validate session ID format
   */
  static validateSessionId(sessionId: string): boolean {
    if (!sessionId || typeof sessionId !== 'string') {
      return false;
    }
    
    // UUID format check (basic)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(sessionId);
  }

  /**
   * Sanitize input string
   */
  static sanitizeInput(input: string, options: ValidationOptions = {}): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    let sanitized = input;

    // Remove potentially harmful characters
    sanitized = sanitized.replace(/[<>]/g, '');
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    // Apply length limits
    if (options.maxLength) {
      const maxLength = Object.values(options.maxLength)[0] || 1000;
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }

  /**
   * Validate configuration object
   */
  static validateConfiguration(config: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: any[] = [];

    if (!config || typeof config !== 'object') {
      errors.push({
        field: 'config',
        message: 'Configuration must be an object',
        constraint: 'type'
      });
      return { valid: false, errors, warnings };
    }

    // Check for required API keys
    if (!config.ANTHROPIC_API_KEY && !config.OPENAI_API_KEY) {
      errors.push({
        field: 'apiKeys',
        message: 'At least one API key (ANTHROPIC_API_KEY or OPENAI_API_KEY) is required',
        constraint: 'required'
      });
    }

    // Validate API keys if present
    if (config.ANTHROPIC_API_KEY) {
      const anthropicValidation = this.validateAPIKey(config.ANTHROPIC_API_KEY, 'anthropic');
      errors.push(...anthropicValidation.errors);
    }

    if (config.OPENAI_API_KEY) {
      const openaiValidation = this.validateAPIKey(config.OPENAI_API_KEY, 'openai');
      errors.push(...openaiValidation.errors);
    }

    // Validate other config values
    if (config.LOG_LEVEL && !['error', 'warn', 'info', 'debug'].includes(config.LOG_LEVEL)) {
      warnings.push({
        field: 'LOG_LEVEL',
        message: 'Invalid log level',
        suggestion: 'Use one of: error, warn, info, debug'
      });
    }

    if (config.CACHE_TTL && (isNaN(config.CACHE_TTL) || config.CACHE_TTL < 0)) {
      warnings.push({
        field: 'CACHE_TTL',
        message: 'Invalid cache TTL',
        suggestion: 'Use a positive number in seconds'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generic object validation
   */
  static validateObject(obj: any, schema: Record<string, any>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: any[] = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = obj?.[field];

      if (rules.required && (value === undefined || value === null)) {
        errors.push({
          field,
          message: `${field} is required`,
          constraint: 'required'
        });
        continue;
      }

      if (value !== undefined && value !== null) {
        if (rules.type && typeof value !== rules.type) {
          errors.push({
            field,
            message: `${field} must be of type ${rules.type}`,
            constraint: 'type'
          });
        }

        if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
          errors.push({
            field,
            message: `${field} must be at least ${rules.minLength} characters`,
            constraint: 'minLength'
          });
        }

        if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
          errors.push({
            field,
            message: `${field} must be at most ${rules.maxLength} characters`,
            constraint: 'maxLength'
          });
        }

        if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
          errors.push({
            field,
            message: `${field} format is invalid`,
            constraint: 'pattern'
          });
        }

        if (rules.enum && !rules.enum.includes(value)) {
          errors.push({
            field,
            message: `${field} must be one of: ${rules.enum.join(', ')}`,
            constraint: 'enum'
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
