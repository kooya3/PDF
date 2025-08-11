import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Create or update conversation
export const upsertConversation = mutation({
  args: {
    documentId: v.string(),
    userId: v.string(),
    message: v.object({
      id: v.string(),
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
      timestamp: v.number(),
      metadata: v.optional(v.object({
        processingTime: v.optional(v.number()),
        tokensUsed: v.optional(v.number()),
        relevantChunks: v.optional(v.array(v.number())),
        confidence: v.optional(v.number())
      }))
    })
  },
  handler: async (ctx, args) => {
    // Check if conversation already exists
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_user_document", (q) =>
        q.eq("userId", args.userId).eq("documentId", args.documentId)
      )
      .first();

    if (existing) {
      // Add message to existing conversation
      const updatedMessages = [...existing.messages, args.message];
      
      return await ctx.db.patch(existing._id, {
        messages: updatedMessages,
        updatedAt: Date.now(),
        messageCount: updatedMessages.length,
        // Auto-generate title from first user message if not set
        title: existing.title || (args.message.role === "user" ? 
          args.message.content.substring(0, 50) + "..." : undefined)
      });
    } else {
      // Create new conversation
      return await ctx.db.insert("conversations", {
        documentId: args.documentId,
        userId: args.userId,
        messages: [args.message],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messageCount: 1,
        title: args.message.role === "user" ? 
          args.message.content.substring(0, 50) + "..." : undefined
      });
    }
  },
});

// Get conversation for a document
export const getConversation = query({
  args: { documentId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conversations")
      .withIndex("by_user_document", (q) =>
        q.eq("userId", args.userId).eq("documentId", args.documentId)
      )
      .first();
  },
});

// Get user's recent conversations
export const getUserConversations = query({
  args: { userId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit || 20);

    return conversations.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

// Update conversation title
export const updateConversationTitle = mutation({
  args: { 
    documentId: v.string(), 
    userId: v.string(), 
    title: v.string() 
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_user_document", (q) =>
        q.eq("userId", args.userId).eq("documentId", args.documentId)
      )
      .first();

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    return await ctx.db.patch(conversation._id, {
      title: args.title,
      updatedAt: Date.now()
    });
  },
});

// Clear conversation history
export const clearConversation = mutation({
  args: { documentId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_user_document", (q) =>
        q.eq("userId", args.userId).eq("documentId", args.documentId)
      )
      .first();

    if (!conversation) {
      return { success: true };
    }

    await ctx.db.delete(conversation._id);
    return { success: true };
  },
});