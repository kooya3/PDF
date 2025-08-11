import { documentStore, DocumentMetadata, DocumentContent } from './memory-store';

/**
 * Memory-Only Hybrid Document Store
 * Uses only memory store until Convex is properly configured
 */
export class MemoryOnlyHybridStore {
  
  /**
   * Store document in memory only
   */
  async setDocument(docId: string, metadata: DocumentMetadata): Promise<void> {
    documentStore.setDocument(docId, metadata);
  }

  /**
   * Set document content in memory only
   */
  async setDocumentContent(docId: string, content: DocumentContent): Promise<void> {
    documentStore.setDocumentContent(docId, content);
  }

  /**
   * Get document from memory
   */
  async getDocument(docId: string, userId?: string): Promise<DocumentMetadata | null> {
    return documentStore.getDocument(docId);
  }

  /**
   * Get document with content
   */
  async getDocumentWithContent(docId: string, userId?: string): Promise<{ metadata: DocumentMetadata; content: DocumentContent } | null> {
    const metadata = await this.getDocument(docId, userId);
    if (!metadata) return null;
    
    const content = documentStore.getDocumentContent(docId);
    
    return {
      metadata,
      content: content || { id: docId, fullText: '', chunks: [] }
    };
  }

  /**
   * Get user documents from memory
   */
  async getUserDocuments(userId: string): Promise<DocumentMetadata[]> {
    return documentStore.getUserDocuments(userId);
  }

  /**
   * Update document status in memory
   */
  async updateDocumentStatus(docId: string, status: DocumentMetadata['status'], progress: number = 0, data?: any): Promise<void> {
    documentStore.updateDocumentStatus(docId, status, progress, data);
  }

  /**
   * Delete document from memory
   */
  async deleteDocument(docId: string, userId: string): Promise<boolean> {
    return documentStore.deleteDocument(docId);
  }

  /**
   * Increment message count
   */
  async incrementMessageCount(docId: string, userId: string): Promise<void> {
    const doc = documentStore.getDocument(docId);
    if (doc) {
      doc.messageCount = (doc.messageCount || 0) + 1;
      doc.lastChatAt = new Date();
      documentStore.setDocument(docId, doc);
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
export const hybridDocumentStore = new MemoryOnlyHybridStore();