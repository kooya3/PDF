import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Enhanced document schema with new fields
export const documentSchema = v.object({
  id: v.string(),
  userId: v.string(),
  name: v.string(),
  type: v.string(),
  size: v.number(),
  status: v.union(
    v.literal("uploading"),
    v.literal("parsing"),
    v.literal("processing"),
    v.literal("generating"),
    v.literal("completed"),
    v.literal("failed")
  ),
  progress: v.number(),
  error: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
  originalName: v.string(),
  mimeType: v.optional(v.string()),
  wordCount: v.optional(v.number()),
  pages: v.optional(v.number()),
  chunkCount: v.optional(v.number()),
  textPreview: v.optional(v.string()),
  messageCount: v.number(),
  lastChatAt: v.optional(v.number()),
  
  // Document content
  fullText: v.optional(v.string()),
  chunks: v.optional(v.array(v.object({
    content: v.string(),
    index: v.number(),
    startChar: v.number(),
    endChar: v.number(),
    metadata: v.optional(v.any())
  }))),
  
  // Embeddings
  embeddings: v.optional(v.object({
    model: v.string(),
    dimensions: v.number(),
    chunks: v.number()
  })),
  
  // Document organization (new fields)
  tags: v.optional(v.array(v.string())),
  folderId: v.optional(v.string()),
  
  // Document versioning (new fields)
  version: v.optional(v.number()),
  parentDocumentId: v.optional(v.string()),
  versionNotes: v.optional(v.string()),
  
  // Analytics (new fields)
  totalViews: v.optional(v.number()),
  lastViewedAt: v.optional(v.number())
});

// Create or update document
export const upsertDocument = mutation({
  args: documentSchema,
  handler: async (ctx, args) => {
    // Check if document already exists
    const existing = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();

    if (existing) {
      // Update existing document
      return await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: Date.now()
      });
    } else {
      // Create new document
      return await ctx.db.insert("documents", {
        ...args,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
  },
});

// Get document by ID
export const getDocument = query({
  args: { docId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const document = await ctx.db
      .query("documents")
      .filter((q) => 
        q.and(
          q.eq(q.field("id"), args.docId),
          q.eq(q.field("userId"), args.userId)
        )
      )
      .first();
    
    return document;
  },
});

// Get all documents for a user
export const getUserDocuments = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .order("desc")
      .collect();
    
    return documents.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Update document status
export const updateDocumentStatus = mutation({
  args: { 
    docId: v.string(),
    userId: v.string(),
    status: v.union(
      v.literal("uploading"),
      v.literal("parsing"), 
      v.literal("processing"),
      v.literal("generating"),
      v.literal("completed"),
      v.literal("failed")
    ),
    progress: v.number(),
    data: v.optional(v.any())
  },
  handler: async (ctx, args) => {
    const document = await ctx.db
      .query("documents")
      .filter((q) => 
        q.and(
          q.eq(q.field("id"), args.docId),
          q.eq(q.field("userId"), args.userId)
        )
      )
      .first();

    if (!document) {
      throw new Error("Document not found");
    }

    const updateData = {
      status: args.status,
      progress: args.progress,
      updatedAt: Date.now(),
      ...(args.data || {})
    };

    return await ctx.db.patch(document._id, updateData);
  },
});

// Delete document
export const deleteDocument = mutation({
  args: { docId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const document = await ctx.db
      .query("documents")
      .filter((q) => 
        q.and(
          q.eq(q.field("id"), args.docId),
          q.eq(q.field("userId"), args.userId)
        )
      )
      .first();

    if (!document) {
      throw new Error("Document not found");
    }

    await ctx.db.delete(document._id);
    return { success: true };
  },
});

// Search documents by content
export const searchDocuments = query({
  args: { 
    userId: v.string(), 
    query: v.string(),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    // Simple text search in content and name
    const queryLower = args.query.toLowerCase();
    const matching = documents.filter(doc => 
      doc.name.toLowerCase().includes(queryLower) ||
      doc.fullText?.toLowerCase().includes(queryLower) ||
      doc.textPreview?.toLowerCase().includes(queryLower)
    );

    const limit = args.limit || 10;
    return matching.slice(0, limit);
  },
});

// Add chat message count
export const incrementMessageCount = mutation({
  args: { docId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const document = await ctx.db
      .query("documents")
      .filter((q) => 
        q.and(
          q.eq(q.field("id"), args.docId),
          q.eq(q.field("userId"), args.userId)
        )
      )
      .first();

    if (!document) {
      throw new Error("Document not found");
    }

    await ctx.db.patch(document._id, {
      messageCount: (document.messageCount || 0) + 1,
      lastChatAt: Date.now(),
      updatedAt: Date.now()
    });

    return { success: true };
  },
});

// Track document view
export const trackDocumentView = mutation({
  args: { docId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const document = await ctx.db
      .query("documents")
      .filter((q) => 
        q.and(
          q.eq(q.field("id"), args.docId),
          q.eq(q.field("userId"), args.userId)
        )
      )
      .first();

    if (!document) {
      throw new Error("Document not found");
    }

    await ctx.db.patch(document._id, {
      totalViews: (document.totalViews || 0) + 1,
      lastViewedAt: Date.now(),
      updatedAt: Date.now()
    });

    return { success: true };
  },
});

// Add tags to document
export const addDocumentTags = mutation({
  args: { 
    docId: v.string(), 
    userId: v.string(), 
    tags: v.array(v.string()) 
  },
  handler: async (ctx, args) => {
    const document = await ctx.db
      .query("documents")
      .filter((q) => 
        q.and(
          q.eq(q.field("id"), args.docId),
          q.eq(q.field("userId"), args.userId)
        )
      )
      .first();

    if (!document) {
      throw new Error("Document not found");
    }

    const currentTags = new Set(document.tags || []);
    args.tags.forEach(tag => currentTags.add(tag.toLowerCase().trim()));

    await ctx.db.patch(document._id, {
      tags: Array.from(currentTags),
      updatedAt: Date.now()
    });

    return { success: true };
  },
});

// Remove tags from document
export const removeDocumentTags = mutation({
  args: { 
    docId: v.string(), 
    userId: v.string(), 
    tags: v.array(v.string()) 
  },
  handler: async (ctx, args) => {
    const document = await ctx.db
      .query("documents")
      .filter((q) => 
        q.and(
          q.eq(q.field("id"), args.docId),
          q.eq(q.field("userId"), args.userId)
        )
      )
      .first();

    if (!document) {
      throw new Error("Document not found");
    }

    const currentTags = new Set(document.tags || []);
    args.tags.forEach(tag => currentTags.delete(tag.toLowerCase().trim()));

    await ctx.db.patch(document._id, {
      tags: Array.from(currentTags),
      updatedAt: Date.now()
    });

    return { success: true };
  },
});

// Get documents by tags
export const getDocumentsByTags = query({
  args: { 
    userId: v.string(), 
    tags: v.array(v.string()),
    matchAll: v.optional(v.boolean()) // true = match ALL tags, false = match ANY tag
  },
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    const searchTags = args.tags.map(tag => tag.toLowerCase().trim());
    const matchAll = args.matchAll || false;

    return documents.filter(doc => {
      const docTags = doc.tags || [];
      if (matchAll) {
        return searchTags.every(tag => docTags.includes(tag));
      } else {
        return searchTags.some(tag => docTags.includes(tag));
      }
    }).sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Create document version
export const createDocumentVersion = mutation({
  args: {
    originalDocId: v.string(),
    userId: v.string(),
    newDocumentData: documentSchema,
    versionNotes: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const originalDoc = await ctx.db
      .query("documents")
      .filter((q) => 
        q.and(
          q.eq(q.field("id"), args.originalDocId),
          q.eq(q.field("userId"), args.userId)
        )
      )
      .first();

    if (!originalDoc) {
      throw new Error("Original document not found");
    }

    // Get current version count for this document
    const versions = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("parentDocumentId"), args.originalDocId))
      .collect();

    const newVersion = versions.length + 2; // +1 for new version, +1 because original is version 1

    // Create new version
    return await ctx.db.insert("documents", {
      ...args.newDocumentData,
      parentDocumentId: args.originalDocId,
      version: newVersion,
      versionNotes: args.versionNotes,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  },
});

// Get document versions
export const getDocumentVersions = query({
  args: { docId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    // Get the main document
    const mainDoc = await ctx.db
      .query("documents")
      .filter((q) => 
        q.and(
          q.eq(q.field("id"), args.docId),
          q.eq(q.field("userId"), args.userId)
        )
      )
      .first();

    if (!mainDoc) {
      throw new Error("Document not found");
    }

    // Get all versions (including the original)
    const versions = await ctx.db
      .query("documents")
      .filter((q) => 
        q.or(
          q.eq(q.field("id"), args.docId),
          q.eq(q.field("parentDocumentId"), args.docId)
        )
      )
      .collect();

    return versions
      .sort((a, b) => (a.version || 1) - (b.version || 1))
      .map(doc => ({
        id: doc.id,
        version: doc.version || 1,
        name: doc.name,
        createdAt: doc.createdAt,
        versionNotes: doc.versionNotes,
        size: doc.size,
        wordCount: doc.wordCount,
        isOriginal: doc.id === args.docId
      }));
  },
});