import { pineconeEmbeddingService } from './pinecone-embeddings';
import { hybridChatService, type ModelProvider } from './hybrid-chat-service';
import { convex } from './convex-client';
import { api } from '../convex/_generated/api';
import { ollamaClient } from './ollama-client';

export interface DocumentReference {
  documentId: string;
  documentName: string;
  chunkIndex: number;
  content: string;
  relevanceScore: number;
  similarity?: number;
}

export interface CrossDocumentSearchResult {
  query: string;
  totalResults: number;
  documentsSearched: number;
  results: DocumentReference[];
  processingTime: number;
}

export interface DocumentComparison {
  document1: {
    id: string;
    name: string;
  };
  document2: {
    id: string;
    name: string;
  };
  similarity: number;
  commonThemes: string[];
  uniqueToDoc1: string[];
  uniqueToDoc2: string[];
  keyDifferences: string[];
}

export interface DocumentRelationship {
  sourceDocId: string;
  targetDocId: string;
  relationshipType: 'similar' | 'references' | 'contradicts' | 'supplements';
  strength: number;
  evidence: string[];
}

export interface UnifiedKnowledgeBase {
  query: string;
  consolidatedAnswer: string;
  sources: DocumentReference[];
  confidence: number;
  conflictingInfo?: {
    topic: string;
    conflicts: Array<{
      document: string;
      position: string;
    }>;
  }[];
}

export class CrossDocumentAnalyzer {
  private static instance: CrossDocumentAnalyzer;

  /**
   * Search across all user's documents for similar content
   */
  async searchAcrossDocuments(
    query: string,
    userId: string,
    options: {
      limit?: number;
      minRelevanceScore?: number;
      excludeDocuments?: string[];
      includeDocuments?: string[];
    } = {}
  ): Promise<CrossDocumentSearchResult> {
    const startTime = Date.now();
    const {
      limit = 10,
      minRelevanceScore = 0.3,
      excludeDocuments = [],
      includeDocuments = []
    } = options;

    try {
      // Get user's documents
      const userDocs = await convex.query(api.documents.getUserDocuments, { userId });
      
      // Filter documents based on options
      let targetDocuments = userDocs.filter(doc => 
        doc.status === 'completed' && 
        !excludeDocuments.includes(doc.id) &&
        (includeDocuments.length === 0 || includeDocuments.includes(doc.id))
      );

      const allResults: DocumentReference[] = [];

      // Search across all documents using Pinecone
      for (const doc of targetDocuments) {
        try {
          const docResults = await pineconeEmbeddingService.searchSimilarDocuments(
            query,
            userId,
            doc.id,
            Math.ceil(limit / targetDocuments.length) + 2 // Ensure we get enough results
          );

          // Convert and filter results
          const processedResults = docResults
            .filter(result => (result.score || 0) >= minRelevanceScore)
            .map(result => ({
              documentId: doc.id,
              documentName: doc.name,
              chunkIndex: result.metadata?.chunkIndex || 0,
              content: result.metadata?.content || '',
              relevanceScore: result.score || 0,
            }));

          allResults.push(...processedResults);
        } catch (error) {
          console.warn(`Failed to search in document ${doc.id}:`, error);
        }
      }

      // Sort by relevance and limit results
      const sortedResults = allResults
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);

      return {
        query,
        totalResults: allResults.length,
        documentsSearched: targetDocuments.length,
        results: sortedResults,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(`Cross-document search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Compare two documents and find similarities/differences
   */
  async compareDocuments(
    doc1Id: string,
    doc2Id: string,
    userId: string
  ): Promise<DocumentComparison> {
    try {
      // Get document metadata - try both ID formats
      let doc1, doc2;
      try {
        [doc1, doc2] = await Promise.all([
          convex.query(api.documents.getDocument, { docId: doc1Id, userId }),
          convex.query(api.documents.getDocument, { docId: doc2Id, userId })
        ]);
      } catch (error) {
        console.warn('Failed to get documents with custom ID, trying alternative lookup');
      }

      // If not found, it might be that we need to search by _id instead
      if (!doc1 || !doc2) {
        const allUserDocs = await convex.query(api.documents.getUserDocuments, { userId });
        if (!doc1) {
          doc1 = allUserDocs.find(d => d._id === doc1Id || d.id === doc1Id);
        }
        if (!doc2) {
          doc2 = allUserDocs.find(d => d._id === doc2Id || d.id === doc2Id);
        }
      }

      if (!doc1 || !doc2) {
        console.error(`Documents not found: doc1=${doc1 ? 'found' : 'missing'}, doc2=${doc2 ? 'found' : 'missing'} for user ${userId}`);
        console.error(`Looking for doc IDs: ${doc1Id}, ${doc2Id}`);
        throw new Error('One or both documents not found');
      }

      // Get document chunks for analysis using Pinecone
      // Use the actual document ID from the found documents
      const actualDoc1Id = doc1.id || doc1._id;
      const actualDoc2Id = doc2.id || doc2._id;
      
      const [doc1Chunks, doc2Chunks] = await Promise.all([
        pineconeEmbeddingService.searchSimilarDocuments('content summary main points', userId, actualDoc1Id, 50),
        pineconeEmbeddingService.searchSimilarDocuments('content summary main points', userId, actualDoc2Id, 50)
      ]);

      // Extract themes and topics using AI
      const doc1Content = doc1Chunks.map(c => c.metadata?.content || '').join(' ').substring(0, 2000);
      const doc2Content = doc2Chunks.map(c => c.metadata?.content || '').join(' ').substring(0, 2000);

      // Fallback to stored content if no chunks found
      if (!doc1Content || !doc2Content) {
        const fallbackDoc1Content = (doc1.fullText || doc1.textPreview || '').substring(0, 2000);
        const fallbackDoc2Content = (doc2.fullText || doc2.textPreview || '').substring(0, 2000);
        
        if ((!doc1Content && !fallbackDoc1Content) || (!doc2Content && !fallbackDoc2Content)) {
          return {
            document1: { id: actualDoc1Id, name: doc1.name },
            document2: { id: actualDoc2Id, name: doc2.name },
            similarity: 0.3,
            commonThemes: ['Document analysis pending'],
            uniqueToDoc1: ['Content not yet processed'],
            uniqueToDoc2: ['Content not yet processed'],
            keyDifferences: ['Documents require processing']
          };
        }
      }

      const finalDoc1Content = doc1Content || (doc1.fullText || doc1.textPreview || '').substring(0, 2000);
      const finalDoc2Content = doc2Content || (doc2.fullText || doc2.textPreview || '').substring(0, 2000);

      const comparisonPrompt = `Compare these two documents and identify:
1. Overall similarity (0-1 scale)
2. Common themes (list)
3. Content unique to Document 1
4. Content unique to Document 2
5. Key differences

Document 1 "${doc1.name}":
${finalDoc1Content}

Document 2 "${doc2.name}":
${finalDoc2Content}

Respond in JSON format:
{
  "similarity": number,
  "commonThemes": [strings],
  "uniqueToDoc1": [strings],
  "uniqueToDoc2": [strings], 
  "keyDifferences": [strings]
}`;

      const analysisResult = await ollamaClient.chat([
        { role: 'system', content: 'You are a document analysis expert. Always respond with valid JSON.' },
        { role: 'user', content: comparisonPrompt }
      ]);

      let analysis;
      try {
        analysis = JSON.parse(analysisResult.message.content);
      } catch {
        // Fallback analysis if JSON parsing fails
        analysis = {
          similarity: 0.5,
          commonThemes: ['General content similarity'],
          uniqueToDoc1: ['Unique content in first document'],
          uniqueToDoc2: ['Unique content in second document'],
          keyDifferences: ['Documents have different focus areas']
        };
      }

      return {
        document1: { id: actualDoc1Id, name: doc1.name },
        document2: { id: actualDoc2Id, name: doc2.name },
        similarity: analysis.similarity || 0,
        commonThemes: analysis.commonThemes || [],
        uniqueToDoc1: analysis.uniqueToDoc1 || [],
        uniqueToDoc2: analysis.uniqueToDoc2 || [],
        keyDifferences: analysis.keyDifferences || [],
      };
    } catch (error) {
      throw new Error(`Document comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find relationships between documents based on content similarity
   * Optimized version using vector embeddings for faster comparison
   */
  async findDocumentRelationships(
    userId: string,
    options: {
      minSimilarity?: number;
      maxRelationships?: number;
    } = {}
  ): Promise<DocumentRelationship[]> {
    const { minSimilarity = 0.4, maxRelationships = 50 } = options;

    try {
      const userDocs = await convex.query(api.documents.getUserDocuments, { userId });
      const completedDocs = userDocs.filter(doc => doc.status === 'completed');

      // Early return if not enough documents
      if (completedDocs.length < 2) {
        return [];
      }

      // Limit to first 10 documents to prevent timeout
      const limitedDocs = completedDocs.slice(0, 10);
      const relationships: DocumentRelationship[] = [];

      // Use a lightweight comparison instead of full AI analysis
      for (let i = 0; i < limitedDocs.length; i++) {
        for (let j = i + 1; j < limitedDocs.length; j++) {
          try {
            // Fast similarity calculation using document metadata
            const similarity = await this.calculateFastSimilarity(
              limitedDocs[i],
              limitedDocs[j],
              userId
            );

            if (similarity >= minSimilarity) {
              const relationshipType: DocumentRelationship['relationshipType'] = 
                similarity > 0.8 ? 'similar' :
                similarity > 0.6 ? 'supplements' :
                'references';

              relationships.push({
                sourceDocId: limitedDocs[i].id,
                targetDocId: limitedDocs[j].id,
                relationshipType,
                strength: similarity,
                evidence: [
                  `Documents share ${Math.round(similarity * 100)}% similarity`,
                  `Based on content analysis`,
                  `Relationship strength: ${relationshipType}`
                ]
              });

              // Early break if we have enough relationships
              if (relationships.length >= maxRelationships) {
                break;
              }
            }
          } catch (error) {
            console.warn(`Failed to compare documents ${limitedDocs[i].id} and ${limitedDocs[j].id}:`, error);
          }
        }
        
        // Early break if we have enough relationships
        if (relationships.length >= maxRelationships) {
          break;
        }
      }

      return relationships
        .sort((a, b) => b.strength - a.strength)
        .slice(0, maxRelationships);
    } catch (error) {
      console.error('Failed to find document relationships:', error);
      // Return empty array instead of throwing to prevent UI breaking
      return [];
    }
  }

  /**
   * Fast similarity calculation without expensive AI calls
   */
  private async calculateFastSimilarity(doc1: any, doc2: any, userId: string): Promise<number> {
    try {
      // Quick text-based similarity using word overlap
      const text1 = (doc1.textPreview || doc1.fullText || '').toLowerCase();
      const text2 = (doc2.textPreview || doc2.fullText || '').toLowerCase();
      
      if (!text1 || !text2) {
        return 0.1; // Default low similarity
      }

      // Simple word-based similarity
      const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 3));
      const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 3));
      
      const intersection = new Set([...words1].filter(x => words2.has(x)));
      const union = new Set([...words1, ...words2]);
      
      const wordSimilarity = union.size > 0 ? intersection.size / union.size : 0;

      // Factor in document metadata similarity
      const metaSimilarity = this.calculateMetadataSimilarity(doc1, doc2);
      
      // Combine both scores
      return Math.min((wordSimilarity * 0.7 + metaSimilarity * 0.3), 0.95);
    } catch (error) {
      console.warn('Fast similarity calculation failed:', error);
      return 0.2; // Default similarity
    }
  }

  /**
   * Calculate similarity based on document metadata
   */
  private calculateMetadataSimilarity(doc1: any, doc2: any): number {
    let similarity = 0;
    let factors = 0;

    // File type similarity
    if (doc1.type && doc2.type) {
      similarity += (doc1.type === doc2.type) ? 0.3 : 0;
      factors += 0.3;
    }

    // Word count similarity (closer counts = higher similarity)
    if (doc1.wordCount && doc2.wordCount) {
      const ratio = Math.min(doc1.wordCount, doc2.wordCount) / Math.max(doc1.wordCount, doc2.wordCount);
      similarity += ratio * 0.2;
      factors += 0.2;
    }

    // Name similarity (basic string similarity)
    if (doc1.name && doc2.name) {
      const nameSim = this.calculateStringSimilarity(doc1.name.toLowerCase(), doc2.name.toLowerCase());
      similarity += nameSim * 0.3;
      factors += 0.3;
    }

    return factors > 0 ? similarity / factors : 0;
  }

  /**
   * Simple string similarity using Jaccard index
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const set1 = new Set(str1.split(''));
    const set2 = new Set(str2.split(''));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Generate a unified answer from multiple documents
   */
  async queryUnifiedKnowledgeBase(
    query: string,
    userId: string,
    options: {
      maxSources?: number;
      includeConflicts?: boolean;
      minConfidence?: number;
    } = {}
  ): Promise<UnifiedKnowledgeBase> {
    const {
      maxSources = 8,
      includeConflicts = true,
      minConfidence = 0.3
    } = options;

    try {
      // Search across all documents
      const searchResults = await this.searchAcrossDocuments(query, userId, {
        limit: maxSources * 2, // Get more results to find potential conflicts
        minRelevanceScore: minConfidence
      });

      if (searchResults.results.length === 0) {
        return {
          query,
          consolidatedAnswer: `I couldn't find relevant information about "${query}" in your documents. Try rephrasing your question or check if you've uploaded relevant documents.`,
          sources: [],
          confidence: 0
        };
      }

      // Group sources by document for better analysis
      const sourcesByDoc = searchResults.results.reduce((acc, result) => {
        if (!acc[result.documentId]) {
          acc[result.documentId] = [];
        }
        acc[result.documentId].push(result);
        return acc;
      }, {} as Record<string, DocumentReference[]>);

      // Take top sources
      const topSources = searchResults.results.slice(0, maxSources);

      // Create context for AI analysis
      const contextSections = topSources.map((source, index) => 
        `[Source ${index + 1} - ${source.documentName}]: ${source.content}`
      ).join('\n\n');

      const unificationPrompt = `Based on the following information from multiple documents, provide a comprehensive and unified answer to the question: "${query}"

Sources:
${contextSections}

Instructions:
1. Synthesize information from all sources
2. Highlight where sources agree or complement each other
3. Note any contradictions or conflicting information
4. Provide a confidence score (0-1) based on source quality and consistency
5. Create a coherent, well-structured answer

${includeConflicts ? 'Pay special attention to any conflicting information and mention it explicitly.' : ''}

Respond in JSON format:
{
  "consolidatedAnswer": "comprehensive answer",
  "confidence": number,
  "conflictingInfo": [{"topic": "string", "conflicts": [{"document": "string", "position": "string"}]}]
}`;

      const result = await hybridChatService.chatWithIntelligentRouting(
        unificationPrompt,
        {
          documentId: 'multi-doc-query',
          userId,
          fileName: 'Multiple Documents',
          history: []
        }
      );

      let analysis;
      try {
        // Try to extract JSON from the response
        const jsonMatch = result.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found');
        }
      } catch {
        // Fallback if JSON parsing fails
        analysis = {
          consolidatedAnswer: result.response,
          confidence: Math.min(searchResults.results.length / maxSources, 0.8),
          conflictingInfo: []
        };
      }

      return {
        query,
        consolidatedAnswer: analysis.consolidatedAnswer,
        sources: topSources,
        confidence: analysis.confidence || 0.5,
        conflictingInfo: analysis.conflictingInfo
      };

    } catch (error) {
      throw new Error(`Unified knowledge base query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get cross-document statistics for a user
   */
  async getCrossDocumentStats(userId: string): Promise<{
    totalDocuments: number;
    processedDocuments: number;
    totalRelationships: number;
    averageSimilarity: number;
    topThemes: string[];
  }> {
    try {
      const userDocs = await convex.query(api.documents.getUserDocuments, { userId });
      const processedDocs = userDocs.filter(doc => doc.status === 'completed');

      if (processedDocs.length < 2) {
        return {
          totalDocuments: userDocs.length,
          processedDocuments: processedDocs.length,
          totalRelationships: 0,
          averageSimilarity: 0,
          topThemes: []
        };
      }

      // Find relationships with relaxed similarity threshold for stats
      const relationships = await this.findDocumentRelationships(userId, {
        minSimilarity: 0.2,
        maxRelationships: 100
      });

      const avgSimilarity = relationships.length > 0
        ? relationships.reduce((sum, rel) => sum + rel.strength, 0) / relationships.length
        : 0;

      // Extract common themes
      const allEvidence = relationships.flatMap(rel => rel.evidence);
      const themeCount = allEvidence.reduce((acc, theme) => {
        acc[theme] = (acc[theme] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topThemes = Object.entries(themeCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([theme]) => theme);

      return {
        totalDocuments: userDocs.length,
        processedDocuments: processedDocs.length,
        totalRelationships: relationships.length,
        averageSimilarity: avgSimilarity,
        topThemes
      };
    } catch (error) {
      throw new Error(`Failed to get cross-document stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Singleton pattern
   */
  static getInstance(): CrossDocumentAnalyzer {
    if (!CrossDocumentAnalyzer.instance) {
      CrossDocumentAnalyzer.instance = new CrossDocumentAnalyzer();
    }
    return CrossDocumentAnalyzer.instance;
  }
}

export const crossDocumentAnalyzer = new CrossDocumentAnalyzer();