import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';
import { getPineconeIndex } from './pinecone-client';
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

export class PineconeEmbeddingService {
  private embeddings: OpenAIEmbeddings;
  private textSplitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY || 'dummy-key', // Use dummy key for Ollama
      modelName: 'text-embedding-ada-002',
    });

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

      // Generate embeddings for each chunk
      const vectors = [];
      for (const chunk of documentChunks) {
        const embedding = await this.embeddings.embedQuery(chunk.content);
        vectors.push({
          id: chunk.id,
          values: embedding,
          metadata: {
            ...chunk.metadata,
            content: chunk.content,
          },
        });
      }

      // Store in Pinecone
      const index = await getPineconeIndex();
      await index.upsert(vectors);

      return {
        success: true,
        chunkCount: documentChunks.length,
      };
    } catch (error) {
      console.error('Error generating embeddings:', error);
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
      // Generate embedding for the query
      const queryEmbedding = await this.embeddings.embedQuery(query);

      // Search in Pinecone
      const index = await getPineconeIndex();
      
      const filter: any = { userId };
      if (documentId) {
        filter.documentId = documentId;
      }

      const searchResult = await index.query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
        filter,
      });

      return searchResult.matches || [];
    } catch (error) {
      console.error('Error searching documents:', error);
      return [];
    }
  }

  async deleteDocumentEmbeddings(documentId: string, userId: string): Promise<boolean> {
    try {
      const index = await getPineconeIndex();
      
      // First, find all vectors for this document
      const searchResult = await index.query({
        vector: new Array(1536).fill(0), // Dummy vector
        topK: 1000, // Get many results
        includeMetadata: true,
        filter: {
          documentId,
          userId,
        },
      });

      if (searchResult.matches && searchResult.matches.length > 0) {
        const vectorIds = searchResult.matches.map(match => match.id);
        await index.deleteMany(vectorIds);
      }

      return true;
    } catch (error) {
      console.error('Error deleting document embeddings:', error);
      return false;
    }
  }

  async getDocumentStats(documentId: string, userId: string): Promise<{
    totalChunks: number;
    totalTokens: number;
  }> {
    try {
      const index = await getPineconeIndex();
      
      const searchResult = await index.query({
        vector: new Array(1536).fill(0), // Dummy vector
        topK: 1000,
        includeMetadata: true,
        filter: {
          documentId,
          userId,
        },
      });

      const chunks = searchResult.matches || [];
      const totalTokens = chunks.reduce((sum, match) => {
        const content = match.metadata?.content as string || '';
        return sum + this.estimateTokenCount(content);
      }, 0);

      return {
        totalChunks: chunks.length,
        totalTokens,
      };
    } catch (error) {
      console.error('Error getting document stats:', error);
      return { totalChunks: 0, totalTokens: 0 };
    }
  }

  private estimateTokenCount(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}

export const pineconeEmbeddingService = new PineconeEmbeddingService();