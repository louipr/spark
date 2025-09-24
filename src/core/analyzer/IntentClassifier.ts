// Intent Classifier - Classifies user intent from natural language input

import {
  Intent,
  RequestContext
} from '../../models/index.js';

export class IntentClassifier {
  private intentPatterns: Map<Intent, IntentPattern>;

  constructor() {
    this.intentPatterns = this.initializeIntentPatterns();
  }

  /**
   * Classifies the intent from user input
   */
  async classify(input: string, context?: RequestContext): Promise<Intent> {
    const cleanInput = input.toLowerCase().trim();
    
    // Consider context for more accurate classification
    if (context?.currentPRD && context.iterationCount > 0) {
      const iterationIntent = this.classifyIterationIntent(cleanInput);
      if (iterationIntent) {
        return iterationIntent;
      }
    }

    // Score each intent based on patterns
    const intentScores = new Map<Intent, number>();
    
    for (const [intent, pattern] of this.intentPatterns) {
      const score = this.calculateIntentScore(cleanInput, pattern, context);
      intentScores.set(intent, score);
    }

    // Return intent with highest score
    const maxScore = Math.max(...intentScores.values());
    if (maxScore === 0) {
      return Intent.CREATE_NEW; // Default intent
    }

    for (const [intent, score] of intentScores) {
      if (score === maxScore) {
        return intent;
      }
    }

    return Intent.CREATE_NEW;
  }

  /**
   * Classifies intent for iteration scenarios
   */
  private classifyIterationIntent(input: string): Intent | null {
    const iterationPatterns = {
      [Intent.ITERATE]: [
        'change', 'modify', 'update', 'add', 'remove', 'improve',
        'enhance', 'refine', 'adjust', 'revise', 'edit', 'alter'
      ],
      [Intent.EXPORT]: [
        'export', 'download', 'save', 'generate', 'output'
      ],
      [Intent.DEPLOY]: [
        'deploy', 'publish', 'launch', 'release', 'go live'
      ]
    };

    for (const [intent, keywords] of Object.entries(iterationPatterns)) {
      if (keywords.some(keyword => input.includes(keyword))) {
        return intent as Intent;
      }
    }

    return null;
  }

  /**
   * Calculates intent score based on pattern matching
   */
  private calculateIntentScore(
    input: string, 
    pattern: IntentPattern, 
    context?: RequestContext
  ): number {
    let score = 0;

    // Keyword matching
    const keywordMatches = pattern.keywords.filter(keyword => 
      input.includes(keyword.toLowerCase())
    );
    score += keywordMatches.length * pattern.keywordWeight;

    // Phrase matching (higher weight)
    const phraseMatches = pattern.phrases.filter(phrase => 
      input.includes(phrase.toLowerCase())
    );
    score += phraseMatches.length * pattern.phraseWeight;

    // Pattern matching with regex
    const regexMatches = pattern.patterns.filter(regex => regex.test(input));
    score += regexMatches.length * pattern.patternWeight;

    // Context-based adjustments
    if (context) {
      score += this.getContextualScore(pattern.intent, context);
    }

    // Negative indicators (reduce score)
    const negativeMatches = pattern.negativeIndicators?.filter(indicator => 
      input.includes(indicator.toLowerCase())
    ) || [];
    score -= negativeMatches.length * 2;

    return Math.max(score, 0);
  }

  /**
   * Gets contextual score adjustments
   */
  private getContextualScore(intent: Intent, context: RequestContext): number {
    let adjustment = 0;

    switch (intent) {
      case Intent.CREATE_NEW:
        // Boost if no current PRD
        if (!context.currentPRD) adjustment += 1;
        // Reduce if in iteration mode
        if (context.iterationCount > 0) adjustment -= 2;
        break;

      case Intent.ITERATE:
        // Boost if PRD exists
        if (context.currentPRD) adjustment += 2;
        // Boost based on iteration count
        adjustment += Math.min(context.iterationCount * 0.5, 2);
        break;

      case Intent.EXPORT:
        // Boost if PRD exists
        if (context.currentPRD) adjustment += 1;
        break;

      case Intent.DEPLOY:
        // Boost if PRD exists and is mature
        if (context.currentPRD && context.iterationCount > 1) adjustment += 1;
        break;

      case Intent.CONFIGURE:
        // Neutral - configuration can happen anytime
        break;

      case Intent.PREVIEW:
        // Boost if PRD exists
        if (context.currentPRD) adjustment += 1;
        break;
    }

    return adjustment;
  }

  /**
   * Initializes intent recognition patterns
   */
  private initializeIntentPatterns(): Map<Intent, IntentPattern> {
    const patterns = new Map<Intent, IntentPattern>();

    patterns.set(Intent.CREATE_NEW, {
      intent: Intent.CREATE_NEW,
      keywords: [
        'create', 'build', 'make', 'develop', 'new', 'start',
        'generate', 'design', 'app', 'application', 'system'
      ],
      phrases: [
        'create a', 'build a', 'make a', 'develop a', 'new app',
        'new application', 'i want to create', 'i need a',
        'build me', 'create me', 'develop me'
      ],
      patterns: [
        /^(create|build|make|develop)\s+(a|an|me)?\s*\w+/i,
        /^i\s+(want|need)\s+to\s+(create|build|make)/i,
        /^(let's|lets)\s+(create|build|make)/i
      ],
      negativeIndicators: [
        'change', 'modify', 'update', 'edit', 'export', 'deploy', 'configure'
      ],
      keywordWeight: 0.3,
      phraseWeight: 0.5,
      patternWeight: 0.7
    });

    patterns.set(Intent.ITERATE, {
      intent: Intent.ITERATE,
      keywords: [
        'change', 'modify', 'update', 'add', 'remove', 'improve',
        'enhance', 'refine', 'adjust', 'revise', 'edit', 'alter',
        'fix', 'correct', 'replace', 'extend'
      ],
      phrases: [
        'change the', 'modify the', 'update the', 'add a', 'remove the',
        'improve the', 'make it', 'i want to change', 'can you add',
        'please update', 'also add', 'but change', 'however modify'
      ],
      patterns: [
        /^(change|modify|update|add|remove|improve)\s+/i,
        /^(i\s+want\s+to\s+|can\s+you\s+|please\s+)?(change|modify|update|add|remove)/i,
        /\b(also|additionally|furthermore|moreover|plus)\s+(add|include|change)/i
      ],
      negativeIndicators: ['create new', 'start fresh', 'from scratch'],
      keywordWeight: 0.4,
      phraseWeight: 0.6,
      patternWeight: 0.8
    });

    patterns.set(Intent.EXPORT, {
      intent: Intent.EXPORT,
      keywords: [
        'export', 'download', 'save', 'generate', 'output', 'file',
        'document', 'pdf', 'json', 'yaml', 'markdown'
      ],
      phrases: [
        'export the', 'download the', 'save the', 'generate file',
        'output the', 'give me the', 'show me the', 'print the'
      ],
      patterns: [
        /^(export|download|save|generate)\s+/i,
        /^(give|show)\s+me\s+the\s+/i,
        /\b(as|to|in)\s+(pdf|json|yaml|markdown|file)/i
      ],
      negativeIndicators: ['create', 'build', 'new'],
      keywordWeight: 0.5,
      phraseWeight: 0.7,
      patternWeight: 0.9
    });

    patterns.set(Intent.DEPLOY, {
      intent: Intent.DEPLOY,
      keywords: [
        'deploy', 'publish', 'launch', 'release', 'go live', 'host',
        'production', 'staging', 'server', 'cloud'
      ],
      phrases: [
        'deploy the', 'publish the', 'launch the', 'go live',
        'put online', 'make live', 'release it', 'host it'
      ],
      patterns: [
        /^(deploy|publish|launch|release)\s+/i,
        /\bgo\s+live/i,
        /\b(put|make)\s+(online|live)/i
      ],
      negativeIndicators: ['create', 'build', 'design'],
      keywordWeight: 0.5,
      phraseWeight: 0.8,
      patternWeight: 1.0
    });

    patterns.set(Intent.PREVIEW, {
      intent: Intent.PREVIEW,
      keywords: [
        'preview', 'show', 'display', 'view', 'see', 'demo',
        'test', 'try', 'run', 'browse'
      ],
      phrases: [
        'show me', 'let me see', 'preview the', 'display the',
        'i want to see', 'can i see', 'demo the'
      ],
      patterns: [
        /^(show|display|preview)\s+/i,
        /^(let\s+me|i\s+want\s+to|can\s+i)\s+see/i,
        /\bdemo\s+/i
      ],
      negativeIndicators: ['create', 'build', 'deploy'],
      keywordWeight: 0.3,
      phraseWeight: 0.6,
      patternWeight: 0.8
    });

    patterns.set(Intent.CONFIGURE, {
      intent: Intent.CONFIGURE,
      keywords: [
        'configure', 'config', 'setting', 'settings', 'option',
        'preference', 'setup', 'set', 'change settings'
      ],
      phrases: [
        'configure the', 'change settings', 'set the', 'setup the',
        'change config', 'update settings'
      ],
      patterns: [
        /^(configure|config|setup|set)\s+/i,
        /\b(change|update)\s+(settings?|config|configuration)/i,
        /\bset\s+.+\s+to\s+/i
      ],
      negativeIndicators: ['create app', 'build app'],
      keywordWeight: 0.4,
      phraseWeight: 0.7,
      patternWeight: 0.9
    });

    return patterns;
  }

  /**
   * Gets confidence score for classified intent
   */
  getIntentConfidence(input: string, intent: Intent, context?: RequestContext): number {
    const pattern = this.intentPatterns.get(intent);
    if (!pattern) return 0;

    const score = this.calculateIntentScore(input.toLowerCase(), pattern, context);
    
    // Normalize to 0-1 range
    const maxPossibleScore = 
      pattern.keywords.length * pattern.keywordWeight +
      pattern.phrases.length * pattern.phraseWeight +
      pattern.patterns.length * pattern.patternWeight + 3; // max context bonus

    return Math.min(score / maxPossibleScore, 1.0);
  }

  /**
   * Gets detailed intent analysis
   */
  async getIntentAnalysis(input: string, context?: RequestContext): Promise<IntentAnalysis> {
    const cleanInput = input.toLowerCase().trim();
    const scores = new Map<Intent, number>();
    const matchDetails = new Map<Intent, IntentMatchDetails>();

    for (const [intent, pattern] of this.intentPatterns) {
      const keywordMatches = pattern.keywords.filter(k => cleanInput.includes(k));
      const phraseMatches = pattern.phrases.filter(p => cleanInput.includes(p));
      const patternMatches = pattern.patterns.filter(r => r.test(cleanInput));
      
      const score = this.calculateIntentScore(cleanInput, pattern, context);
      scores.set(intent, score);
      
      matchDetails.set(intent, {
        keywordMatches,
        phraseMatches,
        patternMatches: patternMatches.map(p => p.toString()),
        score,
        confidence: this.getIntentConfidence(input, intent, context)
      });
    }

    const primaryIntent = await this.classify(input, context);
    const alternativeIntents = Array.from(scores.entries())
      .filter(([intent]) => intent !== primaryIntent)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([intent]) => intent);

    return {
      primaryIntent,
      alternativeIntents,
      confidence: this.getIntentConfidence(input, primaryIntent, context),
      matchDetails: Object.fromEntries(matchDetails)
    };
  }
}

interface IntentPattern {
  intent: Intent;
  keywords: string[];
  phrases: string[];
  patterns: RegExp[];
  negativeIndicators?: string[];
  keywordWeight: number;
  phraseWeight: number;
  patternWeight: number;
}

interface IntentMatchDetails {
  keywordMatches: string[];
  phraseMatches: string[];
  patternMatches: string[];
  score: number;
  confidence: number;
}

export interface IntentAnalysis {
  primaryIntent: Intent;
  alternativeIntents: Intent[];
  confidence: number;
  matchDetails: Record<string, IntentMatchDetails>;
}
