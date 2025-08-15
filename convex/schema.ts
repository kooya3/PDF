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
  .index("by_user", ["userId"]),

  // Collaborative workspaces
  workspaces: defineTable({
    id: v.string(),
    name: v.string(),
    description: v.string(),
    ownerId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    settings: v.object({
      isPublic: v.boolean(),
      allowMemberInvites: v.boolean(),
      requireApprovalForNewMembers: v.boolean(),
      maxMembers: v.number(),
      maxStorageGB: v.number(),
      enableRealTimeCollaboration: v.boolean(),
      defaultMemberRole: v.union(v.literal("editor"), v.literal("viewer")),
      allowGuestAccess: v.boolean(),
      dataRetentionDays: v.number()
    }),
    stats: v.object({
      totalDocuments: v.number(),
      totalProjects: v.number(),
      activeMembers: v.number(),
      storageUsedMB: v.number(),
      analysisCount: v.number(),
      lastActivity: v.number()
    })
  })
  .index("by_owner", ["ownerId"])
  .index("by_created", ["createdAt"])
  .index("by_updated", ["updatedAt"])
  .index("by_public", ["settings.isPublic"])
  .searchIndex("search_workspaces", {
    searchField: "name",
    filterFields: ["ownerId", "settings.isPublic"]
  }),

  // Workspace members
  workspaceMembers: defineTable({
    workspaceId: v.string(),
    userId: v.string(),
    email: v.string(),
    name: v.string(),
    role: v.union(
      v.literal("owner"), 
      v.literal("admin"), 
      v.literal("editor"), 
      v.literal("viewer")
    ),
    joinedAt: v.number(),
    lastActive: v.number(),
    permissions: v.object({
      canUploadDocuments: v.boolean(),
      canDeleteDocuments: v.boolean(),
      canInviteMembers: v.boolean(),
      canManageMembers: v.boolean(),
      canExportData: v.boolean(),
      canAccessSettings: v.boolean(),
      canCreateProjects: v.boolean(),
      canDeleteProjects: v.boolean()
    }),
    status: v.union(v.literal("active"), v.literal("inactive"), v.literal("pending"))
  })
  .index("by_workspace", ["workspaceId"])
  .index("by_user", ["userId"])
  .index("by_workspace_user", ["workspaceId", "userId"])
  .index("by_workspace_role", ["workspaceId", "role"])
  .index("by_status", ["status"]),

  // Workspace projects
  workspaceProjects: defineTable({
    id: v.string(),
    workspaceId: v.string(),
    name: v.string(),
    description: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    documentIds: v.array(v.string()),
    collaborators: v.array(v.string()),
    status: v.union(v.literal("active"), v.literal("completed"), v.literal("archived")),
    tags: v.array(v.string()),
    metadata: v.object({
      documentCount: v.number(),
      totalWordCount: v.number(),
      analysisProgress: v.number()
    })
  })
  .index("by_workspace", ["workspaceId"])
  .index("by_creator", ["createdBy"])
  .index("by_workspace_status", ["workspaceId", "status"])
  .index("by_created", ["createdAt"])
  .index("by_updated", ["updatedAt"])
  .searchIndex("search_projects", {
    searchField: "name",
    filterFields: ["workspaceId", "status", "createdBy"]
  }),

  // Workspace invitations
  workspaceInvitations: defineTable({
    id: v.string(),
    workspaceId: v.string(),
    invitedBy: v.string(),
    invitedEmail: v.string(),
    role: v.union(v.literal("admin"), v.literal("editor"), v.literal("viewer")),
    token: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
    status: v.union(
      v.literal("pending"), 
      v.literal("accepted"), 
      v.literal("expired"), 
      v.literal("cancelled")
    )
  })
  .index("by_workspace", ["workspaceId"])
  .index("by_token", ["token"])
  .index("by_email", ["invitedEmail"])
  .index("by_status", ["status"])
  .index("by_workspace_email", ["workspaceId", "invitedEmail"])
  .index("by_expires", ["expiresAt"]),

  // Workspace activity feed
  workspaceActivities: defineTable({
    id: v.string(),
    workspaceId: v.string(),
    userId: v.string(),
    userName: v.string(),
    action: v.union(
      v.literal("document_uploaded"),
      v.literal("document_deleted"),
      v.literal("project_created"),
      v.literal("project_updated"),
      v.literal("member_added"),
      v.literal("member_removed"),
      v.literal("analysis_completed"),
      v.literal("settings_changed"),
      v.literal("workspace_created")
    ),
    targetId: v.optional(v.string()),
    targetName: v.optional(v.string()),
    description: v.string(),
    timestamp: v.number(),
    metadata: v.optional(v.any())
  })
  .index("by_workspace", ["workspaceId"])
  .index("by_user", ["userId"])
  .index("by_workspace_timestamp", ["workspaceId", "timestamp"])
  .index("by_action", ["action"])
  .index("by_timestamp", ["timestamp"])
});