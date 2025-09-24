// Request Analyzer - Analyzes natural language requests to extract features, complexity, and intent

import {
  UserRequest,
  AnalysisResult,
  AppType,
  ComplexityLevel,
  Intent,
  Feature,
  Entity,
  TechStack,
  FeatureType
} from '../../models/index.js';
import { FeatureDetector } from './FeatureDetector.js';
import { ComplexityAssessor } from './ComplexityAssessor.js';
import { IntentClassifier } from './IntentClassifier.js';
import { TechStackSelector } from '../generator/TechStackSelector.js';

export class RequestAnalyzer {
  private featureDetector: FeatureDetector;
  private complexityAssessor: ComplexityAssessor;
  private intentClassifier: IntentClassifier;
  private techStackSelector: TechStackSelector;

  constructor() {
    this.featureDetector = new FeatureDetector();
    this.complexityAssessor = new ComplexityAssessor();
    this.intentClassifier = new IntentClassifier();
    this.techStackSelector = new TechStackSelector();
  }

  /**
   * Analyzes a user request to extract comprehensive analysis results
   */
  async analyze(request: UserRequest): Promise<AnalysisResult> {
    try {
      // Step 1: Tokenize and clean input
      const cleanedInput = this.preprocessInput(request.rawInput);
      
      // Step 2: Extract entities and keywords
      const entities = this.extractEntities(cleanedInput);
      const keywords = this.extractKeywords(cleanedInput);
      
      // Step 3: Classify intent
      const intent = await this.intentClassifier.classify(cleanedInput, request.context);
      
      // Step 4: Determine app type
      const appType = this.determineAppType(cleanedInput, keywords, entities);
      
      // Step 5: Detect features
      const features = await this.featureDetector.detectFeatures(cleanedInput, appType, keywords);
      
      // Step 6: Assess complexity
      const complexity = await this.complexityAssessor.assess(features, cleanedInput, appType);
      
      // Step 7: Suggest tech stack
      const suggestedTechStack = await this.techStackSelector.suggest(appType, features, complexity);
      
      // Step 8: Calculate confidence score
      const confidence = this.calculateConfidence(features, entities, keywords, appType);
      
      // Step 9: Generate reasoning
      const reasoning = this.generateReasoning(appType, features, complexity, confidence);

      return {
        appType,
        features,
        complexity,
        intent,
        entities,
        suggestedTechStack,
        confidence,
        reasoning
      };
    } catch (error) {
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Preprocesses input text by cleaning and normalizing
   */
  private preprocessInput(input: string): string {
    return input
      .trim()
      .toLowerCase()
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Remove special characters that don't add meaning
      .replace(/[^\w\s.,!?-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extracts named entities from the input text
   */
  private extractEntities(text: string): Entity[] {
    const entities: Entity[] = [];
    
    // Domain entities (business domains)
    const domainPatterns = {
      'e-commerce': /\b(shop|store|cart|checkout|payment|product|inventory|order)\b/gi,
      'social': /\b(social|friend|follow|like|share|post|comment|message)\b/gi,
      'finance': /\b(bank|financial|money|transaction|account|budget|investment)\b/gi,
      'health': /\b(health|medical|patient|doctor|appointment|prescription)\b/gi,
      'education': /\b(education|school|student|teacher|course|lesson|grade)\b/gi,
      'gaming': /\b(game|player|score|level|achievement|multiplayer)\b/gi,
      'productivity': /\b(task|todo|project|deadline|calendar|schedule)\b/gi,
      'content': /\b(blog|article|content|cms|publish|author)\b/gi
    };

    for (const [domain, pattern] of Object.entries(domainPatterns)) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          text: match[0],
          type: domain,
          confidence: 0.8,
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
      }
    }

    // Technology entities
    const techPatterns = {
      'frontend_framework': /\b(react|vue|angular|svelte|nextjs|nuxt)\b/gi,
      'backend_framework': /\b(express|fastify|nestjs|django|flask|rails)\b/gi,
      'database': /\b(mongodb|postgresql|mysql|sqlite|redis|firebase)\b/gi,
      'deployment': /\b(aws|gcp|azure|vercel|netlify|heroku)\b/gi
    };

    for (const [tech, pattern] of Object.entries(techPatterns)) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          text: match[0],
          type: tech,
          confidence: 0.9,
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
      }
    }

    return entities;
  }

  /**
   * Extracts important keywords from the input
   */
  private extractKeywords(text: string): string[] {
    // Common stop words to filter out
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
      'before', 'after', 'above', 'below', 'between', 'among', 'i', 'me', 'my',
      'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'want', 'need'
    ]);

    const words = text.split(/\s+/)
      .map(word => word.replace(/[^\w]/g, ''))
      .filter(word => word.length > 2)
      .filter(word => !stopWords.has(word))
      .filter(word => word !== '');

    // Count frequency and return most common
    const frequency = new Map<string, number>();
    words.forEach(word => {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    });

    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
  }

  /**
   * Determines the primary app type based on analysis
   */
  private determineAppType(input: string, keywords: string[], entities: Entity[]): AppType {
    const appTypeScores = new Map<AppType, number>();

    // Initialize scores
    Object.values(AppType).forEach(type => appTypeScores.set(type, 0));

    // Keyword-based scoring
    const keywordPatterns = {
      [AppType.WEB_APP]: ['web', 'website', 'app', 'application', 'frontend', 'backend'],
      [AppType.MOBILE_APP]: ['mobile', 'ios', 'android', 'phone', 'tablet', 'app'],
      [AppType.API_SERVICE]: ['api', 'service', 'rest', 'graphql', 'endpoint', 'microservice'],
      [AppType.DASHBOARD]: ['dashboard', 'analytics', 'metrics', 'chart', 'graph', 'admin'],
      [AppType.CLI_TOOL]: ['cli', 'command', 'terminal', 'script', 'tool', 'automation'],
      [AppType.AUTOMATION]: ['automate', 'script', 'workflow', 'batch', 'cron', 'schedule'],
      [AppType.GAME]: ['game', 'play', 'player', 'level', 'score', 'multiplayer']
    };

    for (const [appType, patterns] of Object.entries(keywordPatterns)) {
      const score = patterns.reduce((sum, pattern) => {
        return sum + (keywords.includes(pattern) ? 1 : 0) + 
               (input.includes(pattern) ? 0.5 : 0);
      }, 0);
      appTypeScores.set(appType as AppType, score);
    }

    // Entity-based scoring
    entities.forEach(entity => {
      if (entity.type === 'frontend_framework' || entity.type === 'backend_framework') {
        appTypeScores.set(AppType.WEB_APP, appTypeScores.get(AppType.WEB_APP)! + 2);
      }
    });

    // Default to WEB_APP if no clear winner
    const maxScore = Math.max(...appTypeScores.values());
    if (maxScore === 0) {
      return AppType.WEB_APP;
    }

    // Return app type with highest score
    for (const [appType, score] of appTypeScores) {
      if (score === maxScore) {
        return appType;
      }
    }

    return AppType.WEB_APP;
  }

  /**
   * Calculates confidence score based on analysis quality
   */
  private calculateConfidence(
    features: Feature[], 
    entities: Entity[], 
    keywords: string[], 
    appType: AppType
  ): number {
    let confidence = 0;

    // Base confidence from features detected
    confidence += Math.min(features.length * 0.1, 0.4);

    // Confidence from entities
    confidence += Math.min(entities.length * 0.05, 0.3);

    // Confidence from keywords
    confidence += Math.min(keywords.length * 0.02, 0.2);

    // Bonus for clear app type indicators
    const appTypeKeywords = this.getAppTypeKeywords(appType);
    const matchingKeywords = keywords.filter(k => appTypeKeywords.includes(k));
    confidence += Math.min(matchingKeywords.length * 0.05, 0.1);

    // Ensure confidence is between 0 and 1
    return Math.min(Math.max(confidence, 0.1), 1.0);
  }

  /**
   * Gets keywords associated with a specific app type
   */
  private getAppTypeKeywords(appType: AppType): string[] {
    const keywordMap = {
      [AppType.WEB_APP]: ['web', 'website', 'frontend', 'backend', 'browser'],
      [AppType.MOBILE_APP]: ['mobile', 'ios', 'android', 'phone', 'tablet'],
      [AppType.API_SERVICE]: ['api', 'rest', 'graphql', 'service', 'endpoint'],
      [AppType.DASHBOARD]: ['dashboard', 'analytics', 'admin', 'metrics'],
      [AppType.CLI_TOOL]: ['cli', 'command', 'terminal', 'tool'],
      [AppType.AUTOMATION]: ['automation', 'script', 'workflow'],
      [AppType.GAME]: ['game', 'play', 'player', 'gaming']
    };

    return keywordMap[appType] || [];
  }

  /**
   * Generates human-readable reasoning for the analysis
   */
  private generateReasoning(
    appType: AppType,
    features: Feature[],
    complexity: ComplexityLevel,
    confidence: number
  ): string {
    const parts: string[] = [];

    parts.push(`Identified as a ${appType.replace('_', ' ')} based on the request content.`);

    if (features.length > 0) {
      const featureTypes = [...new Set(features.map(f => f.type))];
      parts.push(`Detected ${features.length} key features including: ${featureTypes.slice(0, 3).join(', ')}.`);
    }

    parts.push(`Complexity assessed as ${complexity} level.`);

    if (confidence >= 0.8) {
      parts.push('High confidence in this analysis.');
    } else if (confidence >= 0.6) {
      parts.push('Moderate confidence in this analysis.');
    } else {
      parts.push('Low confidence - may need clarification.');
    }

    return parts.join(' ');
  }
}
