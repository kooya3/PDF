import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get or create user settings
export const getUserSettings = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    let settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    // Create default settings if none exist
    if (!settings) {
      const defaultSettings = {
        userId: args.userId,
        preferences: {
          theme: "dark" as const,
          language: "en",
          aiModel: "tinyllama",
          autoSave: true,
          notifications: {
            email: true,
            push: true,
            processing: true
          },
          viewMode: "grid" as const,
          itemsPerPage: 20
        },
        usage: {
          documentsUploaded: 0,
          totalMessagesCount: 0,
          storageUsed: 0,
          accountCreatedAt: Date.now()
        },
        limits: {
          maxDocuments: 100,
          maxStorageBytes: 1024 * 1024 * 1024, // 1GB
          maxMessagesPerDay: 1000
        },
        updatedAt: Date.now()
      };

      const insertedId = await ctx.db.insert("userSettings", defaultSettings);
      settings = await ctx.db.get(insertedId);
    }

    return settings;
  },
});

// Update user preferences
export const updatePreferences = mutation({
  args: {
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
    })
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!settings) {
      throw new Error("User settings not found");
    }

    // Merge preferences
    const updatedPreferences = { ...settings.preferences };
    Object.entries(args.preferences).forEach(([key, value]) => {
      if (value !== undefined) {
        (updatedPreferences as any)[key] = value;
      }
    });

    return await ctx.db.patch(settings._id, {
      preferences: updatedPreferences,
      updatedAt: Date.now()
    });
  },
});

// Update usage statistics
export const updateUsageStats = mutation({
  args: {
    userId: v.string(),
    documentsUploaded: v.optional(v.number()),
    messagesCount: v.optional(v.number()),
    storageUsed: v.optional(v.number()),
    lastLoginAt: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!settings) {
      throw new Error("User settings not found");
    }

    const updatedUsage = { ...settings.usage };
    
    if (args.documentsUploaded !== undefined) {
      updatedUsage.documentsUploaded += args.documentsUploaded;
    }
    if (args.messagesCount !== undefined) {
      updatedUsage.totalMessagesCount += args.messagesCount;
    }
    if (args.storageUsed !== undefined) {
      updatedUsage.storageUsed = args.storageUsed;
    }
    if (args.lastLoginAt !== undefined) {
      updatedUsage.lastLoginAt = args.lastLoginAt;
    }

    return await ctx.db.patch(settings._id, {
      usage: updatedUsage,
      updatedAt: Date.now()
    });
  },
});

// Check user limits
export const checkUserLimits = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!settings) {
      throw new Error("User settings not found");
    }

    // Check document count
    const documentCount = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect()
      .then(docs => docs.length);

    // Check today's message count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();

    const todayMessages = await ctx.db
      .query("analytics")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", args.userId).eq("eventType", "chat_message")
      )
      .filter((q) => q.gte(q.field("timestamp"), todayStart))
      .collect()
      .then(events => events.length);

    return {
      documents: {
        current: documentCount,
        limit: settings.limits.maxDocuments,
        remaining: Math.max(0, settings.limits.maxDocuments - documentCount),
        exceeded: documentCount >= settings.limits.maxDocuments
      },
      storage: {
        current: settings.usage.storageUsed,
        limit: settings.limits.maxStorageBytes,
        remaining: Math.max(0, settings.limits.maxStorageBytes - settings.usage.storageUsed),
        exceeded: settings.usage.storageUsed >= settings.limits.maxStorageBytes
      },
      dailyMessages: {
        current: todayMessages,
        limit: settings.limits.maxMessagesPerDay,
        remaining: Math.max(0, settings.limits.maxMessagesPerDay - todayMessages),
        exceeded: todayMessages >= settings.limits.maxMessagesPerDay
      }
    };
  },
});

// Update user limits (admin function)
export const updateUserLimits = mutation({
  args: {
    userId: v.string(),
    limits: v.object({
      maxDocuments: v.optional(v.number()),
      maxStorageBytes: v.optional(v.number()),
      maxMessagesPerDay: v.optional(v.number())
    })
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!settings) {
      throw new Error("User settings not found");
    }

    const updatedLimits = { ...settings.limits };
    Object.entries(args.limits).forEach(([key, value]) => {
      if (value !== undefined) {
        (updatedLimits as any)[key] = value;
      }
    });

    return await ctx.db.patch(settings._id, {
      limits: updatedLimits,
      updatedAt: Date.now()
    });
  },
});