import { documentStore, DocumentMetadata, DocumentContent } from './memory-store';
import { convex } from './convex-client';
import { api } from '@/convex/api';

/**
 * Hybrid Document Store - Full Convex Integration
 * Combines fast in-memory access with persistent Convex storage
 */
export class HybridDocumentStore {
  
  /**
   * Store document with both memory and persistent storage
   */
  async setDocument(docId: string, metadata: DocumentMetadata): Promise<void> {
    // Store in memory for fast access
    documentStore.setDocument(docId, metadata);
    
    // Store in Convex for persistence
    try {
      await convex.mutation(api.documents.upsertDocument, {
        id: docId,
        userId: metadata.userId,
        name: metadata.name,
        type: metadata.type,
        size: metadata.size,
        status: metadata.status,
        progress: metadata.progress,
        error: metadata.error,
        createdAt: metadata.createdAt.getTime(),
        updatedAt: metadata.updatedAt.getTime(),
        originalName: metadata.originalName,
        mimeType: metadata.mimeType,
        wordCount: metadata.wordCount,
        pages: metadata.pages,
        chunkCount: metadata.chunkCount,
        textPreview: metadata.textPreview,
        messageCount: metadata.messageCount,
        lastChatAt: metadata.lastChatAt?.getTime(),
        embeddings: metadata.embeddings
      });
    } catch (error) {
      console.error('Error storing document in Convex:', error);
      // Continue with memory-only storage if Convex fails
    }
  }

  /**
   * Set document content with both storages
   */
  async setDocumentContent(docId: string, content: DocumentContent): Promise<void> {
    // Store in memory
    documentStore.setDocumentContent(docId, content);
    
    // Update Convex with content
    try {
      const metadata = documentStore.getDocument(docId);
      if (metadata) {
        await convex.mutation(api.documents.upsertDocument, {
          id: docId,
          userId: metadata.userId,
          name: metadata.name,
          type: metadata.type,
          size: metadata.size,
          status: metadata.status,
          progress: metadata.progress,
          error: metadata.error,
          createdAt: metadata.createdAt.getTime(),
          updatedAt: metadata.updatedAt.getTime(),
          originalName: metadata.originalName,
          mimeType: metadata.mimeType,
          wordCount: metadata.wordCount,
          pages: metadata.pages,
          chunkCount: metadata.chunkCount,
          textPreview: metadata.textPreview,
          messageCount: metadata.messageCount,
          lastChatAt: metadata.lastChatAt?.getTime(),
          embeddings: metadata.embeddings,
          fullText: content.fullText,
          chunks: content.chunks
        });
      }
    } catch (error) {
      console.error('Error storing document content in Convex:', error);
    }
  }

  /**
   * Get document with fallback from Convex if not in memory
   */
  async getDocument(docId: string, userId?: string): Promise<DocumentMetadata | null> {
    // Try memory first
    let doc = documentStore.getDocument(docId);
    
    if (!doc && userId) {
      // Fallback to Convex
      try {
        const convexDoc = await convex.query(api.documents.getDocument, {
          docId,
          userId
        });
        
        if (convexDoc) {
          // Convert Convex document back to memory store format
          doc = {
            id: convexDoc.id,
            userId: convexDoc.userId,
            name: convexDoc.name,
            type: convexDoc.type,
            size: convexDoc.size,
            status: convexDoc.status,
            progress: convexDoc.progress,
            error: convexDoc.error,
            createdAt: new Date(convexDoc.createdAt),
            updatedAt: new Date(convexDoc.updatedAt),
            originalName: convexDoc.originalName,
            mimeType: convexDoc.mimeType,
            wordCount: convexDoc.wordCount,
            pages: convexDoc.pages,
            chunkCount: convexDoc.chunkCount,
            textPreview: convexDoc.textPreview,
            messageCount: convexDoc.messageCount,
            lastChatAt: convexDoc.lastChatAt ? new Date(convexDoc.lastChatAt) : undefined,
            embeddings: convexDoc.embeddings
          };
          
          // Store in memory for next time
          documentStore.setDocument(docId, doc);
          
          // Also restore content if available
          if (convexDoc.fullText) {
            const content: DocumentContent = {
              id: docId,
              fullText: convexDoc.fullText,
              chunks: convexDoc.chunks || [],
              extractedData: convexDoc
            };
            documentStore.setDocumentContent(docId, content);
          }
        }
      } catch (error) {
        console.error('Error fetching document from Convex:', error);
      }
    }
    
    return doc;
  }

  /**
   * Get document with content
   */
  async getDocumentWithContent(docId: string, userId?: string): Promise<{ metadata: DocumentMetadata; content: DocumentContent } | null> {
    const metadata = await this.getDocument(docId, userId);
    if (!metadata) return null;
    
    let content = documentStore.getDocumentContent(docId);
    
    // If no content in memory and we have userId, try Convex
    if (!content && userId) {
      try {
        const convexDoc = await convex.query(api.documents.getDocument, {
          docId,
          userId
        });
        
        if (convexDoc && convexDoc.fullText) {
          content = {
            id: docId,
            fullText: convexDoc.fullText,
            chunks: convexDoc.chunks || [],
            extractedData: convexDoc
          };
          
          // Store in memory for next time
          documentStore.setDocumentContent(docId, content);
        }
      } catch (error) {
        console.error('Error fetching document content from Convex:', error);
      }
    }
    
    return {
      metadata,
      content: content || { id: docId, fullText: '', chunks: [] }
    };
  }

  /**
   * Get user documents with Convex fallback
   */
  async getUserDocuments(userId: string): Promise<DocumentMetadata[]> {
    // Try memory first
    let docs = documentStore.getUserDocuments(userId);
    
    // Also get from Convex to ensure we have all documents
    try {
      const convexDocs = await convex.query(api.documents.getUserDocuments, {
        userId
      });
      
      // Convert and merge with memory docs
      const convexDocsConverted = convexDocs.map(doc => ({
        id: doc.id,
        userId: doc.userId,
        name: doc.name,
        type: doc.type,
        size: doc.size,
        status: doc.status,
        progress: doc.progress,
        error: doc.error,
        createdAt: new Date(doc.createdAt),
        updatedAt: new Date(doc.updatedAt),
        originalName: doc.originalName,
        mimeType: doc.mimeType,
        wordCount: doc.wordCount,
        pages: doc.pages,
        chunkCount: doc.chunkCount,
        textPreview: doc.textPreview,
        messageCount: doc.messageCount,
        lastChatAt: doc.lastChatAt ? new Date(doc.lastChatAt) : undefined,
        embeddings: doc.embeddings
      }));
      
      // Merge docs, preferring memory versions but including Convex-only docs
      const memoryDocIds = new Set(docs.map(d => d.id));
      const additionalDocs = convexDocsConverted.filter(d => !memoryDocIds.has(d.id));
      
      docs = [...docs, ...additionalDocs].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      // Update memory store with any missing documents
      additionalDocs.forEach(doc => {
        documentStore.setDocument(doc.id, doc);
      });
      
    } catch (error) {
      console.error('Error fetching user documents from Convex:', error);
    }
    
    return docs;
  }

  /**
   * Update document status in both storages
   */
  async updateDocumentStatus(docId: string, status: DocumentMetadata['status'], progress: number = 0, data?: any): Promise<void> {
    // Update memory store
    documentStore.updateDocumentStatus(docId, status, progress, data);
    
    // Update Convex
    try {
      const doc = documentStore.getDocument(docId);
      if (doc) {
        await convex.mutation(api.documents.updateDocumentStatus, {
          docId,
          userId: doc.userId,
          status,
          progress,
          data
        });
      }
    } catch (error) {
      console.error('Error updating document status in Convex:', error);
    }
  }

  /**
   * Delete document from both storages
   */
  async deleteDocument(docId: string, userId: string): Promise<boolean> {
    // Delete from memory
    const deleted = documentStore.deleteDocument(docId);
    
    // Delete from Convex
    try {
      await convex.mutation(api.documents.deleteDocument, {
        docId,
        userId
      });
    } catch (error) {
      console.error('Error deleting document from Convex:', error);
    }
    
    return deleted;
  }

  /**
   * Increment message count
   */
  async incrementMessageCount(docId: string, userId: string): Promise<void> {
    // Update memory store
    const doc = documentStore.getDocument(docId);
    if (doc) {
      doc.messageCount = (doc.messageCount || 0) + 1;
      doc.lastChatAt = new Date();
      documentStore.setDocument(docId, doc);
    }
    
    // Update Convex
    try {
      await convex.mutation(api.documents.incrementMessageCount, {
        docId,
        userId
      });
    } catch (error) {
      console.error('Error incrementing message count in Convex:', error);
    }
  }

  // Proxy other methods to memory store
  subscribe = documentStore.subscribe.bind(documentStore);
  publish = documentStore.publish.bind(documentStore);
  getStats = documentStore.getStats.bind(documentStore);
  healthCheck = documentStore.healthCheck.bind(documentStore);
  getProcessingEvents = documentStore.getProcessingEvents.bind(documentStore);
  searchDocumentContent = documentStore.searchDocumentContent.bind(documentStore);
  cleanup = documentStore.cleanup.bind(documentStore);
}

// Export singleton instance
export const hybridDocumentStore = new HybridDocumentStore();