import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { v4 as uuidv4 } from 'uuid';

interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    documentId: string;
    userId: string;
    fileName: string;
    pageNumber?: number;
    chunkIndex: number;
    timestamp: string;
  };
}

interface EmbeddingResult {
  success: boolean;
  chunkCount?: number;
  error?: string;
}

/**
 * Local fallback embedding service that stores chunks in memory
 * for when Pinecone or external embedding services are unavailable
 */
export class LocalEmbeddingFallback {
  private textSplitter: RecursiveCharacterTextSplitter;
  private documentChunks: Map<string, DocumentChunk[]> = new Map();

  constructor() {
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', '.', '!', '?', ',', ' ', ''],
    });
  }

  async generateEmbeddings(
    text: string,
    documentId: string,
    userId: string,
    fileName: string
  ): Promise<EmbeddingResult> {
    try {
      console.log('Using local fallback embedding service');
      
      // Split text into chunks
      const textChunks = await this.textSplitter.splitText(text);
      
      if (textChunks.length === 0) {
        return { success: false, error: 'No text chunks generated' };
      }

      // Create document chunks with metadata
      const documentChunks: DocumentChunk[] = textChunks.map((chunk, index) => ({
        id: uuidv4(),
        content: chunk,
        metadata: {
          documentId,
          userId,
          fileName,
          chunkIndex: index,
          timestamp: new Date().toISOString(),
        },
      }));

      // Store chunks in memory
      const key = `${userId}:${documentId}`;
      this.documentChunks.set(key, documentChunks);

      console.log(`Stored ${documentChunks.length} chunks locally for document ${documentId}`);

      return {
        success: true,
        chunkCount: documentChunks.length,
      };
    } catch (error) {
      console.error('Error in local fallback embedding:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async searchSimilarDocuments(
    query: string,
    userId: string,
    documentId?: string,
    topK: number = 5
  ): Promise<any[]> {
    try {
      console.log('Searching with local fallback (simple text matching)');
      
      const results: any[] = [];
      const queryLower = query.toLowerCase();

      // Simple keyword-based search through stored chunks
      for (const [key, chunks] of this.documentChunks.entries()) {
        const [keyUserId, keyDocId] = key.split(':');
        
        // Filter by user and optionally by document
        if (keyUserId !== userId || (documentId && keyDocId !== documentId)) {
          continue;
        }

        for (const chunk of chunks) {
          const contentLower = chunk.content.toLowerCase();
          
          // Simple relevance scoring based on keyword matches
          const words = queryLower.split(' ').filter(w => w.length > 2);
          let score = 0;
          
          for (const word of words) {
            const matches = (contentLower.match(new RegExp(word, 'g')) || []).length;
            score += matches;
          }

          if (score > 0) {
            results.push({
              id: chunk.id,
              score,
              metadata: {
                ...chunk.metadata,
                content: chunk.content,
              }
            });
          }
        }
      }

      // Sort by score and return top results
      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    } catch (error) {
      console.error('Error in local fallback search:', error);
      return [];
    }
  }

  async deleteDocumentEmbeddings(documentId: string, userId: string): Promise<boolean> {
    try {
      const key = `${userId}:${documentId}`;
      const deleted = this.documentChunks.delete(key);
      console.log(`Local fallback: ${deleted ? 'Deleted' : 'No'} chunks for document ${documentId}`);
      return true;
    } catch (error) {
      console.error('Error deleting from local fallback:', error);
      return false;
    }
  }

  async getDocumentStats(documentId: string, userId: string): Promise<{
    totalChunks: number;
    totalTokens: number;
  }> {
    try {
      const key = `${userId}:${documentId}`;
      const chunks = this.documentChunks.get(key) || [];
      
      const totalTokens = chunks.reduce((sum, chunk) => {
        return sum + this.estimateTokenCount(chunk.content);
      }, 0);

      return {
        totalChunks: chunks.length,
        totalTokens,
      };
    } catch (error) {
      console.error('Error getting local fallback stats:', error);
      return { totalChunks: 0, totalTokens: 0 };
    }
  }

  private estimateTokenCount(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}

export const localEmbeddingFallback = new LocalEmbeddingFallback();