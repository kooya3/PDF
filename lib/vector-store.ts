import { ChromaClient, Collection } from 'chromadb';
// Ollama client will be imported dynamically when needed
import { DocumentChunk } from './document-parser-client';

export interface DocumentEmbedding {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

export class LocalVectorStore {
  private chroma: ChromaClient;
  private embeddingModel: string;
  
  constructor(
    chromaUrl: string = 'http://localhost:8000',
    embeddingModel: string = 'tinyllama'
  ) {
    this.chroma = new ChromaClient({
      path: chromaUrl,
    });
    this.embeddingModel = embeddingModel;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.chroma.heartbeat();
      return true;
    } catch {
      return false;
    }
  }

  async ensureCollection(collectionName: string): Promise<Collection> {
    try {
      // Try to get existing collection
      return await this.chroma.getCollection({
        name: collectionName,
        embeddingFunction: new OllamaEmbeddingFunction({
          url: 'http://localhost:11434',
          model: this.embeddingModel,
        }),
      });
    } catch {
      // Create new collection if it doesn't exist
      return await this.chroma.createCollection({
        name: collectionName,
        embeddingFunction: new OllamaEmbeddingFunction({
          url: 'http://localhost:11434',
          model: this.embeddingModel,
        }),
      });
    }
  }

  async addDocumentChunks(
    collectionName: string,
    documentId: string,
    chunks: DocumentChunk[],
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    const collection = await this.ensureCollection(collectionName);
    
    const ids = chunks.map((_, index) => `${documentId}_chunk_${index}`);
    const documents = chunks.map(chunk => chunk.content);
    const metadatas = chunks.map(chunk => ({
      ...metadata,
      documentId,
      chunkIndex: chunk.index,
      startChar: chunk.startChar,
      endChar: chunk.endChar,
      ...chunk.metadata,
    }));

    await collection.add({
      ids,
      documents,
      metadatas,
    });
  }

  async searchSimilar(
    collectionName: string,
    query: string,
    limit: number = 5,
    filter?: Record<string, unknown>
  ): Promise<SearchResult[]> {
    const collection = await this.ensureCollection(collectionName);
    
    const results = await collection.query({
      queryTexts: [query],
      nResults: limit,
      where: filter,
    });

    const searchResults: SearchResult[] = [];
    
    if (results.ids?.[0] && results.documents?.[0] && results.distances?.[0] && results.metadatas?.[0]) {
      for (let i = 0; i < results.ids[0].length; i++) {
        searchResults.push({
          id: results.ids[0][i],
          content: results.documents[0][i] as string,
          score: 1 - (results.distances[0][i] || 0), // Convert distance to similarity score
          metadata: (results.metadatas[0][i] as Record<string, unknown>) || {},
        });
      }
    }

    return searchResults;
  }

  async deleteDocument(collectionName: string, documentId: string): Promise<void> {
    const collection = await this.ensureCollection(collectionName);
    
    // Find all chunks belonging to this document
    const results = await collection.query({
      queryTexts: [''], // Empty query to get all
      nResults: 1000, // Large number to get all chunks
      where: { documentId },
    });

    if (results.ids?.[0]) {
      await collection.delete({
        ids: results.ids[0],
      });
    }
  }

  async getCollectionStats(collectionName: string): Promise<{
    totalDocuments: number;
    totalChunks: number;
  }> {
    try {
      const collection = await this.ensureCollection(collectionName);
      const count = await collection.count();
      
      // Get a sample to count unique documents
      const results = await collection.query({
        queryTexts: [''],
        nResults: 1000,
      });
      
      const uniqueDocuments = new Set();
      if (results.metadatas?.[0]) {
        for (const metadata of results.metadatas[0]) {
          const meta = metadata as Record<string, unknown>;
          if (meta.documentId) {
            uniqueDocuments.add(meta.documentId);
          }
        }
      }

      return {
        totalDocuments: uniqueDocuments.size,
        totalChunks: count,
      };
    } catch {
      return {
        totalDocuments: 0,
        totalChunks: 0,
      };
    }
  }

  async listCollections(): Promise<string[]> {
    const collections = await this.chroma.listCollections();
    return collections.map(collection => collection.name);
  }

  async deleteCollection(collectionName: string): Promise<void> {
    await this.chroma.deleteCollection({ name: collectionName });
  }
}

// Custom Ollama embedding function for ChromaDB
class OllamaEmbeddingFunction {
  private url: string;
  private model: string;

  constructor(options: { url: string; model: string }) {
    this.url = options.url;
    this.model = options.model;
  }

  async generate(texts: string[]): Promise<number[][]> {
    const client = new (await import('./ollama-client')).OllamaClient(this.url, this.model);
    
    const embeddings: number[][] = [];
    
    for (const text of texts) {
      try {
        const embedding = await client.embeddings(text, this.model);
        embeddings.push(embedding);
      } catch (error) {
        console.error(`Failed to generate embedding for text: ${text}`, error);
        // Return zero vector as fallback
        embeddings.push(new Array(384).fill(0)); // Assuming 384 dimensions for llama3.2
      }
    }
    
    return embeddings;
  }
}

// Create default instance
export const vectorStore = new LocalVectorStore();

// Helper function to check if vector store is set up
export async function checkVectorStoreSetup(): Promise<{
  available: boolean;
  collections: string[];
  error?: string;
}> {
  try {
    const available = await vectorStore.isAvailable();
    
    if (!available) {
      return {
        available: false,
        collections: [],
        error: 'ChromaDB is not running. Please start it with: chroma run --host localhost --port 8000'
      };
    }

    const collections = await vectorStore.listCollections();

    return {
      available: true,
      collections,
    };
  } catch (error) {
    return {
      available: false,
      collections: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}