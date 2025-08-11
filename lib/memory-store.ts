/**
 * Redis-like In-Memory Data Store for Document Processing
 * Provides fast access to document metadata and real-time updates
 */

export interface DocumentMetadata {
  id: string;
  userId: string;
  name: string;
  type: string;
  size: number;
  status: 'uploading' | 'parsing' | 'processing' | 'generating' | 'completed' | 'failed';
  progress: number; // 0-100
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Processing details
  wordCount?: number;
  pages?: number;
  chunkCount?: number;
  
  // File info
  originalName: string;
  mimeType?: string;
  downloadUrl?: string;
  
  // Processing metadata
  textPreview?: string;
  embeddings?: {
    model: string;
    dimensions: number;
    chunks: number;
  };
  
  // Chat context
  messageCount: number;
  lastChatAt?: Date;
  
  // Document organization
  tags?: string[];
  folderId?: string;
  
  // Document versioning
  version?: number;
  parentDocumentId?: string;
  versionNotes?: string;
  
  // Analytics
  totalViews?: number;
  lastViewedAt?: Date;
}

export interface DocumentContent {
  id: string;
  fullText: string;
  chunks: DocumentChunk[];
  extractedData?: any;
}

export interface DocumentChunk {
  content: string;
  index: number;
  startChar: number;
  endChar: number;
  metadata?: Record<string, any>;
}

export interface ProcessingEvent {
  docId: string;
  userId: string;
  event: 'upload_start' | 'parse_start' | 'parse_complete' | 'embedding_start' | 'embedding_complete' | 'error' | 'complete';
  timestamp: Date;
  data?: any;
  error?: string;
}

/**
 * In-Memory Document Store
 * Similar to Redis with hash maps, sets, and pub/sub functionality
 */
class MemoryDocumentStore {
  // Hash Maps for different data types (like Redis hashes)
  private documents: Map<string, DocumentMetadata> = new Map();
  private documentContent: Map<string, DocumentContent> = new Map(); // docId -> content
  private userDocuments: Map<string, Set<string>> = new Map(); // userId -> Set<docId>
  private processingQueue: Map<string, ProcessingEvent[]> = new Map(); // docId -> events[]
  
  // Pub/Sub for real-time updates (like Redis pub/sub)
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();
  
  // TTL functionality (like Redis expire)
  private ttlTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    console.log('MemoryDocumentStore initialized');
  }

  // === Document CRUD Operations (like Redis HSET/HGET) ===
  
  /**
   * Store document metadata (like HSET in Redis)
   */
  setDocument(docId: string, metadata: DocumentMetadata): void {
    metadata.updatedAt = new Date();
    this.documents.set(docId, metadata);
    
    // Update user index
    if (!this.userDocuments.has(metadata.userId)) {
      this.userDocuments.set(metadata.userId, new Set());
    }
    this.userDocuments.get(metadata.userId)!.add(docId);
    
    // Publish update event
    this.publish(`document:${docId}`, { type: 'document_updated', document: metadata });
    this.publish(`user:${metadata.userId}:documents`, { type: 'document_updated', document: metadata });
    
    console.log(`Document stored: ${docId} (${metadata.status})`);
  }

  /**
   * Get document metadata (like HGET in Redis)
   */
  getDocument(docId: string): DocumentMetadata | null {
    return this.documents.get(docId) || null;
  }

  /**
   * Get all documents for a user (like SMEMBERS in Redis)
   */
  getUserDocuments(userId: string): DocumentMetadata[] {
    const userDocIds = this.userDocuments.get(userId);
    if (!userDocIds) return [];
    
    return Array.from(userDocIds)
      .map(docId => this.documents.get(docId))
      .filter((doc): doc is DocumentMetadata => doc !== undefined)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Update document status with progress (like HMSET in Redis)
   */
  updateDocumentStatus(docId: string, status: DocumentMetadata['status'], progress: number = 0, data?: any): void {
    const doc = this.documents.get(docId);
    if (!doc) return;

    doc.status = status;
    doc.progress = progress;
    doc.updatedAt = new Date();

    // Update specific fields if provided
    if (data) {
      Object.assign(doc, data);
    }

    this.documents.set(docId, doc);
    
    // Add to processing events
    this.addProcessingEvent(docId, {
      docId,
      userId: doc.userId,
      event: status === 'completed' ? 'complete' : status === 'failed' ? 'error' : 'parse_start',
      timestamp: new Date(),
      data
    });

    // Publish real-time update
    this.publish(`document:${docId}`, { 
      type: 'status_update', 
      docId, 
      status, 
      progress,
      data 
    });
    
    console.log(`Document ${docId} status updated: ${status} (${progress}%)`);
  }

  /**
   * Delete document (like DEL in Redis)
   */
  deleteDocument(docId: string): boolean {
    const doc = this.documents.get(docId);
    if (!doc) return false;

    // Remove from user index
    const userDocs = this.userDocuments.get(doc.userId);
    if (userDocs) {
      userDocs.delete(docId);
      if (userDocs.size === 0) {
        this.userDocuments.delete(doc.userId);
      }
    }

    // Remove document, content, and processing events
    this.documents.delete(docId);
    this.documentContent.delete(docId);
    this.processingQueue.delete(docId);
    
    // Clear TTL timer if exists
    const timer = this.ttlTimers.get(docId);
    if (timer) {
      clearTimeout(timer);
      this.ttlTimers.delete(docId);
    }

    // Publish deletion event
    this.publish(`document:${docId}`, { type: 'document_deleted', docId });
    this.publish(`user:${doc.userId}:documents`, { type: 'document_deleted', docId });

    console.log(`Document deleted: ${docId}`);
    return true;
  }

  // === Document Content Operations ===

  /**
   * Store document content (like HSET for content)
   */
  setDocumentContent(docId: string, content: DocumentContent): void {
    this.documentContent.set(docId, content);
    
    // Publish content update event
    this.publish(`document:${docId}:content`, { 
      type: 'content_stored', 
      docId, 
      fullTextLength: content.fullText.length,
      chunkCount: content.chunks.length
    });
    
    console.log(`Document content stored: ${docId} (${content.fullText.length} chars, ${content.chunks.length} chunks)`);
  }

  /**
   * Get document content (like HGET for content)
   */
  getDocumentContent(docId: string): DocumentContent | null {
    return this.documentContent.get(docId) || null;
  }

  /**
   * Get document with content (combined metadata and content)
   */
  getDocumentWithContent(docId: string): { metadata: DocumentMetadata; content: DocumentContent } | null {
    const metadata = this.documents.get(docId);
    const content = this.documentContent.get(docId);
    
    if (!metadata) return null;
    
    return {
      metadata,
      content: content || { id: docId, fullText: '', chunks: [] }
    };
  }

  /**
   * Search document content
   */
  searchDocumentContent(docId: string, query: string, limit: number = 5): DocumentChunk[] {
    const content = this.documentContent.get(docId);
    if (!content) return [];
    
    const queryLower = query.toLowerCase();
    return content.chunks
      .filter(chunk => chunk.content.toLowerCase().includes(queryLower))
      .slice(0, limit);
  }

  // === Processing Events (like Redis Lists) ===
  
  /**
   * Add processing event (like LPUSH in Redis)
   */
  addProcessingEvent(docId: string, event: ProcessingEvent): void {
    if (!this.processingQueue.has(docId)) {
      this.processingQueue.set(docId, []);
    }
    
    const events = this.processingQueue.get(docId)!;
    events.unshift(event); // Add to front (newest first)
    
    // Keep only last 100 events per document
    if (events.length > 100) {
      events.splice(100);
    }
    
    // Publish event
    this.publish(`processing:${docId}`, event);
  }

  /**
   * Get processing events for document (like LRANGE in Redis)
   */
  getProcessingEvents(docId: string, limit: number = 10): ProcessingEvent[] {
    const events = this.processingQueue.get(docId) || [];
    return events.slice(0, limit);
  }

  // === Pub/Sub System (like Redis pub/sub) ===
  
  /**
   * Subscribe to channel (like SUBSCRIBE in Redis)
   */
  subscribe(channel: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    
    this.subscribers.get(channel)!.add(callback);
    console.log(`Subscribed to channel: ${channel}`);
    
    // Return unsubscribe function
    return () => {
      const channelSubs = this.subscribers.get(channel);
      if (channelSubs) {
        channelSubs.delete(callback);
        if (channelSubs.size === 0) {
          this.subscribers.delete(channel);
        }
      }
    };
  }

  /**
   * Publish to channel (like PUBLISH in Redis)
   */
  publish(channel: string, data: any): number {
    const channelSubs = this.subscribers.get(channel);
    if (!channelSubs) return 0;
    
    let count = 0;
    channelSubs.forEach(callback => {
      try {
        callback(data);
        count++;
      } catch (error) {
        console.error('Pub/sub callback error:', error);
      }
    });
    
    return count;
  }

  // === TTL/Expiration (like Redis EXPIRE) ===
  
  /**
   * Set TTL for document (like EXPIRE in Redis)
   */
  setTTL(docId: string, seconds: number): void {
    // Clear existing timer
    const existingTimer = this.ttlTimers.get(docId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set new timer
    const timer = setTimeout(() => {
      this.deleteDocument(docId);
      this.ttlTimers.delete(docId);
      console.log(`Document expired: ${docId}`);
    }, seconds * 1000);
    
    this.ttlTimers.set(docId, timer);
    console.log(`TTL set for document ${docId}: ${seconds}s`);
  }

  // === Statistics and Monitoring ===
  
  /**
   * Get store statistics (like Redis INFO)
   */
  getStats() {
    const stats = {
      documents: {
        total: this.documents.size,
        byStatus: {} as Record<string, number>,
        byUser: this.userDocuments.size
      },
      processingQueue: {
        totalEvents: Array.from(this.processingQueue.values()).reduce((sum, events) => sum + events.length, 0),
        activeQueues: this.processingQueue.size
      },
      pubsub: {
        channels: this.subscribers.size,
        totalSubscribers: Array.from(this.subscribers.values()).reduce((sum, subs) => sum + subs.size, 0)
      },
      memory: {
        documentsSize: this.documents.size,
        ttlTimers: this.ttlTimers.size
      }
    };

    // Count documents by status
    this.documents.forEach(doc => {
      stats.documents.byStatus[doc.status] = (stats.documents.byStatus[doc.status] || 0) + 1;
    });

    return stats;
  }

  /**
   * Health check
   */
  healthCheck() {
    const stats = this.getStats();
    return {
      status: 'healthy',
      uptime: process.uptime(),
      stats,
      timestamp: new Date().toISOString()
    };
  }

  // === Bulk Operations ===
  
  /**
   * Get documents by status (like Redis SCAN with pattern)
   */
  getDocumentsByStatus(status: DocumentMetadata['status']): DocumentMetadata[] {
    return Array.from(this.documents.values()).filter(doc => doc.status === status);
  }

  /**
   * Cleanup expired or failed documents
   */
  cleanup(): number {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    let cleaned = 0;

    this.documents.forEach((doc, docId) => {
      // Remove failed documents older than 1 hour
      if (doc.status === 'failed' && doc.updatedAt < oneHourAgo) {
        this.deleteDocument(docId);
        cleaned++;
      }
      // Remove stuck processing documents older than 30 minutes
      else if (['uploading', 'parsing', 'processing'].includes(doc.status) && doc.updatedAt < new Date(now.getTime() - 30 * 60 * 1000)) {
        doc.status = 'failed';
        doc.error = 'Processing timeout';
        this.updateDocumentStatus(docId, 'failed', 0, { error: 'Processing timeout' });
        cleaned++;
      }
    });

    if (cleaned > 0) {
      console.log(`Cleanup completed: ${cleaned} documents processed`);
    }

    return cleaned;
  }
}

// Singleton instance (like Redis server)
export const documentStore = new MemoryDocumentStore();

// Auto-cleanup every 5 minutes
setInterval(() => {
  documentStore.cleanup();
}, 5 * 60 * 1000);

export default documentStore;