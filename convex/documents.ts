import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Document schema
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
  }))
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