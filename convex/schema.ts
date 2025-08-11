import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Enhanced documents table with comprehensive indexes
  documents: defineTable({
    // Core document metadata
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
    
    // Document analysis
    wordCount: v.optional(v.number()),
    pages: v.optional(v.number()),
    chunkCount: v.optional(v.number()),
    textPreview: v.optional(v.string()),
    
    // Chat tracking
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
    lastViewedAt: v.optional(v.number()),
  })
  // Optimized indexes for fast queries
  .index("by_user", ["userId"])
  .index("by_user_and_id", ["userId", "id"])
  .index("by_user_status", ["userId", "status"])
  .index("by_user_created", ["userId", "createdAt"])
  .index("by_user_updated", ["userId", "updatedAt"])
  .index("by_user_last_chat", ["userId", "lastChatAt"])
  .index("by_status", ["status"])
  .index("by_created", ["createdAt"])
  .index("by_type", ["type"])
  .index("by_folder", ["folderId"])
  .index("by_parent_version", ["parentDocumentId", "version"])
  .searchIndex("search_content", {
    searchField: "fullText",
    filterFields: ["userId", "status", "type"]
  })
  .searchIndex("search_name", {
    searchField: "name",
    filterFields: ["userId", "status"]
  }),

  // Chat conversations for persistent chat history
  conversations: defineTable({
    documentId: v.string(),
    userId: v.string(),
    messages: v.array(v.object({
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
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
    messageCount: v.number(),
    title: v.optional(v.string()),
  })
  .index("by_document", ["documentId"])
  .index("by_user", ["userId"])
  .index("by_user_document", ["userId", "documentId"])
  .index("by_updated", ["updatedAt"]),

  // Document folders for organization
  folders: defineTable({
    id: v.string(),
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    parentFolderId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    color: v.optional(v.string()),
    documentCount: v.optional(v.number()),
  })
  .index("by_user", ["userId"])
  .index("by_parent", ["parentFolderId"])
  .index("by_user_parent", ["userId", "parentFolderId"]),

  // Usage analytics for tracking engagement
  analytics: defineTable({
    userId: v.string(),
    documentId: v.optional(v.string()),
    eventType: v.union(
      v.literal("document_upload"),
      v.literal("document_view"),
      v.literal("chat_message"),
      v.literal("document_download"),
      v.literal("search_query"),
      v.literal("folder_create"),
      v.literal("bulk_upload")
    ),
    eventData: v.optional(v.any()),
    timestamp: v.number(),
    sessionId: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  })
  .index("by_user", ["userId"])
  .index("by_event_type", ["eventType"])
  .index("by_timestamp", ["timestamp"])
  .index("by_user_event", ["userId", "eventType"])
  .index("by_document", ["documentId"])
  .index("by_session", ["sessionId"]),

  // User settings and preferences
  userSettings: defineTable({
    userId: v.string(),
    preferences: v.object({
      theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("auto"))),
      language: v.optional(v.string()),
      aiModel: v.optional(v.string()),
      autoSave: v.optional(v.boolean()),
      notifications: v.optional(v.object({
        email: v.boolean(),
        push: v.boolean(),
        processing: v.boolean()
      })),
      defaultFolderId: v.optional(v.string()),
      viewMode: v.optional(v.union(v.literal("grid"), v.literal("list"))),
      itemsPerPage: v.optional(v.number())
    }),
    usage: v.object({
      documentsUploaded: v.number(),
      totalMessagesCount: v.number(),
      storageUsed: v.number(),
      lastLoginAt: v.optional(v.number()),
      accountCreatedAt: v.number()
    }),
    limits: v.object({
      maxDocuments: v.number(),
      maxStorageBytes: v.number(),
      maxMessagesPerDay: v.number()
    }),
    updatedAt: v.number()
  })
  .index("by_user", ["userId"])
});