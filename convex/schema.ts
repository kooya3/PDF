import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  documents: defineTable({
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
  })
    .index("by_user", ["userId"])
    .index("by_user_and_id", ["userId", "id"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),
});