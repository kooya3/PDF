import { ollamaAIService } from './ollama-ai-service';
import { chromaKnowledgeBase } from './chroma-knowledge-base';

export interface RoutingDecision {
  target: 'document' | 'knowledge_base' | 'both' | 'general';
  confidence: number;
  reasoning: string;
  suggestedSources?: Array<{
    type: 'document' | 'knowledge_base';
    id: string;
    name: string;
    relevance: number;
  }>;
}

export interface QueryContext {
  userId: string;
  workspaceId?: string;
  currentDocument?: {
    id: string;
    name: string;
    type: string;
  };
  currentKnowledgeBase?: {
    id: string;
    name: string;
    sourceUrl: string;
  };
  availableDocuments?: Array<{
    id: string;
    name: string;
    type: string;
    lastAccessed?: string;
  }>;
  availableKnowledgeBases?: Array<{
    id: string;
    name: string;
    sourceUrl: string;
    status: string;
  }>;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
    sources?: Array<{ type: string; reference: string }>;
  }>;
}

export interface SearchResult {
  source: {
    type: 'document' | 'knowledge_base';
    id: string;
    name: string;
    reference?: string;
  };
  content: string;
  relevance: number;
  metadata: any;
}

export class SmartRoutingService {
  private static instance: SmartRoutingService;

  public static getInstance(): SmartRoutingService {
    if (!SmartRoutingService.instance) {
      SmartRoutingService.instance = new SmartRoutingService();
    }
    return SmartRoutingService.instance;
  }

  async routeQuery(query: string, context: QueryContext): Promise<RoutingDecision> {
    try {
      // Classify the query intent first
      const classification = await ollamaAIService.classifyQuery(query);
      
      // Analyze query for routing signals
      const routingSignals = this.analyzeRoutingSignals(query, context);
      
      // Make routing decision based on multiple factors
      const decision = this.makeRoutingDecision(query, classification, routingSignals, context);
      
      console.log(`Smart routing decision for "${query}": ${decision.target} (confidence: ${decision.confidence})`);
      
      return decision;

    } catch (error) {
      console.error('Smart routing failed:', error);
      
      // Fallback to simple heuristic routing
      return this.fallbackRouting(query, context);
    }
  }

  async searchMultipleSources(
    query: string, 
    decision: RoutingDecision, 
    context: QueryContext
  ): Promise<SearchResult[]> {
    const allResults: SearchResult[] = [];

    try {
      // Search documents if needed
      if (decision.target === 'document' || decision.target === 'both') {
        if (context.currentDocument) {
          const documentResults = await this.searchDocument(query, context.currentDocument.id);
          allResults.push(...documentResults);
        } else if (context.availableDocuments) {
          // Search across multiple documents
          for (const doc of context.availableDocuments.slice(0, 3)) { // Limit to top 3
            const documentResults = await this.searchDocument(query, doc.id);
            allResults.push(...documentResults);
          }
        }
      }

      // Search knowledge bases if needed
      if (decision.target === 'knowledge_base' || decision.target === 'both') {
        if (context.currentKnowledgeBase) {
          const kbResults = await this.searchKnowledgeBase(query, context.currentKnowledgeBase.id);
          allResults.push(...kbResults);
        } else if (context.availableKnowledgeBases) {
          // Search across multiple knowledge bases
          for (const kb of context.availableKnowledgeBases.filter(kb => kb.status === 'completed').slice(0, 3)) {
            const kbResults = await this.searchKnowledgeBase(query, kb.id);
            allResults.push(...kbResults);
          }
        }
      }

      // Sort by relevance and remove duplicates
      return this.deduplicateAndRank(allResults);

    } catch (error) {
      console.error('Multi-source search failed:', error);
      return [];
    }
  }

  private analyzeRoutingSignals(query: string, context: QueryContext): {
    documentSignals: number;
    knowledgeBaseSignals: number;
    generalSignals: number;
    contextualHints: string[];
  } {
    const queryLower = query.toLowerCase();
    let documentSignals = 0;
    let knowledgeBaseSignals = 0;
    let generalSignals = 0;
    const contextualHints: string[] = [];

    // Document-specific keywords
    const documentKeywords = [
      'document', 'file', 'pdf', 'page', 'chapter', 'section', 
      'attachment', 'uploaded', 'my document', 'this file'
    ];
    
    documentKeywords.forEach(keyword => {
      if (queryLower.includes(keyword)) {
        documentSignals += 1;
        contextualHints.push(`Contains document keyword: "${keyword}"`);
      }
    });

    // Knowledge base-specific keywords
    const knowledgeBaseKeywords = [
      'website', 'site', 'web', 'online', 'link', 'url', 'blog', 
      'article', 'page', 'portal', 'documentation', 'knowledge base'
    ];
    
    knowledgeBaseKeywords.forEach(keyword => {
      if (queryLower.includes(keyword)) {
        knowledgeBaseSignals += 1;
        contextualHints.push(`Contains knowledge base keyword: "${keyword}"`);
      }
    });

    // General question patterns
    const generalPatterns = [
      /^(what|how|why|when|where|who)\s/i,
      /^(can you|could you|please)\s/i,
      /^(tell me|explain|describe|summarize)\s/i
    ];

    generalPatterns.forEach(pattern => {
      if (pattern.test(query)) {
        generalSignals += 1;
        contextualHints.push(`Matches general question pattern`);
      }
    });

    // Context-based signals
    if (context.currentDocument) {
      documentSignals += 2; // Strong preference for current document
      contextualHints.push(`Current document context: ${context.currentDocument.name}`);
    }

    if (context.currentKnowledgeBase) {
      knowledgeBaseSignals += 2; // Strong preference for current knowledge base
      contextualHints.push(`Current knowledge base context: ${context.currentKnowledgeBase.name}`);
    }

    // Conversation history signals
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      const recentSources = context.conversationHistory
        .slice(-3) // Last 3 messages
        .flatMap(msg => msg.sources || []);
      
      const documentSourceCount = recentSources.filter(s => s.type === 'document').length;
      const kbSourceCount = recentSources.filter(s => s.type === 'knowledge_base').length;
      
      if (documentSourceCount > kbSourceCount) {
        documentSignals += 1;
        contextualHints.push('Recent conversation focused on documents');
      } else if (kbSourceCount > documentSourceCount) {
        knowledgeBaseSignals += 1;
        contextualHints.push('Recent conversation focused on knowledge bases');
      }
    }

    return {
      documentSignals,
      knowledgeBaseSignals,
      generalSignals,
      contextualHints
    };
  }

  private makeRoutingDecision(
    query: string,
    classification: any,
    signals: ReturnType<typeof SmartRoutingService.prototype.analyzeRoutingSignals>,
    context: QueryContext
  ): RoutingDecision {
    const { documentSignals, knowledgeBaseSignals, generalSignals, contextualHints } = signals;
    
    // Calculate base scores
    let documentScore = documentSignals * 0.3;
    let knowledgeBaseScore = knowledgeBaseSignals * 0.3;
    let bothScore = Math.min(documentSignals, knowledgeBaseSignals) * 0.4; // Both sources relevant
    let generalScore = generalSignals * 0.2;

    // Adjust based on AI classification
    if (classification.intent === 'search') {
      bothScore += 0.2;
    } else if (classification.intent === 'question') {
      if (context.currentDocument) documentScore += 0.2;
      if (context.currentKnowledgeBase) knowledgeBaseScore += 0.2;
    }

    // Availability adjustments
    const hasDocuments = (context.currentDocument || (context.availableDocuments && context.availableDocuments.length > 0));
    const hasKnowledgeBases = (context.currentKnowledgeBase || (context.availableKnowledgeBases && context.availableKnowledgeBases.some(kb => kb.status === 'completed')));

    if (!hasDocuments) documentScore = 0;
    if (!hasKnowledgeBases) knowledgeBaseScore = 0;

    // Determine winner
    const maxScore = Math.max(documentScore, knowledgeBaseScore, bothScore, generalScore);
    const confidence = Math.min(0.95, maxScore + 0.5);

    let target: RoutingDecision['target'];
    let reasoning: string;

    if (bothScore === maxScore && bothScore > 0.3) {
      target = 'both';
      reasoning = `Query suggests searching both documents and knowledge bases. Signals: ${contextualHints.join(', ')}`;
    } else if (documentScore === maxScore && documentScore > 0.2) {
      target = 'document';
      reasoning = `Query suggests document search. Signals: ${contextualHints.join(', ')}`;
    } else if (knowledgeBaseScore === maxScore && knowledgeBaseScore > 0.2) {
      target = 'knowledge_base';
      reasoning = `Query suggests knowledge base search. Signals: ${contextualHints.join(', ')}`;
    } else {
      target = 'general';
      reasoning = `General query or insufficient context for specific routing. Signals: ${contextualHints.join(', ')}`;
    }

    return {
      target,
      confidence,
      reasoning
    };
  }

  private fallbackRouting(query: string, context: QueryContext): RoutingDecision {
    // Simple heuristic fallback
    if (context.currentDocument && context.currentKnowledgeBase) {
      return {
        target: 'both',
        confidence: 0.6,
        reasoning: 'Fallback: Both document and knowledge base available'
      };
    } else if (context.currentDocument) {
      return {
        target: 'document',
        confidence: 0.7,
        reasoning: 'Fallback: Current document available'
      };
    } else if (context.currentKnowledgeBase) {
      return {
        target: 'knowledge_base',
        confidence: 0.7,
        reasoning: 'Fallback: Current knowledge base available'
      };
    } else {
      return {
        target: 'general',
        confidence: 0.5,
        reasoning: 'Fallback: No specific context available'
      };
    }
  }

  private async searchDocument(query: string, documentId: string): Promise<SearchResult[]> {
    try {
      // This would integrate with your existing document search API
      const response = await fetch(`/api/documents/${documentId}/search?q=${encodeURIComponent(query)}&limit=5`);
      
      if (!response.ok) {
        console.warn(`Document search failed for ${documentId}`);
        return [];
      }

      const data = await response.json();
      
      return (data.results || []).map((result: any) => ({
        source: {
          type: 'document' as const,
          id: documentId,
          name: result.documentName || 'Document',
          reference: `Page ${result.pageNumber || 'N/A'}`
        },
        content: result.content || result.text,
        relevance: result.score || result.relevance || 0.5,
        metadata: result.metadata || {}
      }));

    } catch (error) {
      console.error(`Document search error for ${documentId}:`, error);
      return [];
    }
  }

  private async searchKnowledgeBase(query: string, knowledgeBaseId: string): Promise<SearchResult[]> {
    try {
      const searchResults = await chromaKnowledgeBase.searchKnowledgeBase(
        knowledgeBaseId,
        query,
        { limit: 5, minScore: 0.3 }
      );

      return searchResults.map(result => ({
        source: {
          type: 'knowledge_base' as const,
          id: knowledgeBaseId,
          name: result.metadata.knowledgeBaseId || 'Knowledge Base',
          reference: result.metadata.pageTitle || result.metadata.pageUrl
        },
        content: result.content,
        relevance: result.score,
        metadata: result.metadata
      }));

    } catch (error) {
      console.error(`Knowledge base search error for ${knowledgeBaseId}:`, error);
      return [];
    }
  }

  private deduplicateAndRank(results: SearchResult[]): SearchResult[] {
    // Simple deduplication based on content similarity
    const deduped: SearchResult[] = [];
    const seenContent = new Set<string>();

    for (const result of results) {
      const contentHash = result.content.substring(0, 100).toLowerCase().replace(/\s+/g, ' ').trim();
      
      if (!seenContent.has(contentHash)) {
        seenContent.add(contentHash);
        deduped.push(result);
      }
    }

    // Sort by relevance
    return deduped.sort((a, b) => b.relevance - a.relevance);
  }

  // Method to get routing statistics for analytics
  getRoutingStatistics(decisions: RoutingDecision[]): {
    documentQueries: number;
    knowledgeBaseQueries: number;
    bothQueries: number;
    generalQueries: number;
    averageConfidence: number;
  } {
    const stats = {
      documentQueries: 0,
      knowledgeBaseQueries: 0,
      bothQueries: 0,
      generalQueries: 0,
      averageConfidence: 0
    };

    if (decisions.length === 0) return stats;

    let totalConfidence = 0;

    decisions.forEach(decision => {
      switch (decision.target) {
        case 'document': stats.documentQueries++; break;
        case 'knowledge_base': stats.knowledgeBaseQueries++; break;
        case 'both': stats.bothQueries++; break;
        case 'general': stats.generalQueries++; break;
      }
      totalConfidence += decision.confidence;
    });

    stats.averageConfidence = totalConfidence / decisions.length;

    return stats;
  }
}

// Singleton instance
export const smartRoutingService = SmartRoutingService.getInstance();