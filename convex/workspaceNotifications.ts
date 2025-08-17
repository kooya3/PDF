import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new workspace notification
export const createNotification = mutation({
  args: {
    workspaceId: v.string(),
    type: v.union(
      v.literal("member_joined"),
      v.literal("project_created"),
      v.literal("document_added"),
      v.literal("workspace_updated"),
      v.literal("invitation_sent")
    ),
    title: v.string(),
    message: v.string(),
    actorId: v.string(),
    targetName: v.optional(v.string()),
    priority: v.optional(v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high")
    )),
  },
  handler: async (ctx, args) => {
    // Get actor's name from users table (assuming you have one)
    let actorName = "Unknown User";
    try {
      // In a real implementation, fetch from users table
      actorName = args.actorId; // Simplified for now
    } catch (error) {
      console.log("Could not fetch actor name:", error);
    }

    const notification = await ctx.db.insert("workspaceNotifications", {
      workspaceId: args.workspaceId,
      type: args.type,
      title: args.title,
      message: args.message,
      actorId: args.actorId,
      actorName,
      targetName: args.targetName,
      timestamp: new Date().toISOString(),
      read: false,
      priority: args.priority || "medium",
    });

    return notification;
  },
});

// Get notifications for a workspace
export const getNotifications = query({
  args: {
    workspaceId: v.string(),
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    
    // Get all notifications for the workspace
    const notifications = await ctx.db
      .query("workspaceNotifications")
      .filter((q) => q.eq(q.field("workspaceId"), args.workspaceId))
      .order("desc")
      .take(limit);

    // Count unread notifications for this user
    const unreadCount = notifications.filter(n => !n.read).length;

    return {
      notifications,
      unreadCount,
    };
  },
});

// Mark a notification as read
export const markAsRead = mutation({
  args: {
    notificationId: v.id("workspaceNotifications"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, {
      read: true,
    });
  },
});

// Mark all notifications as read for a user in a workspace
export const markAllAsRead = mutation({
  args: {
    workspaceId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("workspaceNotifications")
      .filter((q) => q.eq(q.field("workspaceId"), args.workspaceId))
      .filter((q) => q.eq(q.field("read"), false))
      .collect();

    await Promise.all(
      notifications.map((notification) =>
        ctx.db.patch(notification._id, {
          read: true,
        })
      )
    );
  },
});

// Clean up old notifications (optional maintenance function)
export const cleanupOldNotifications = mutation({
  args: {
    olderThanDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysToKeep = args.olderThanDays || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const oldNotifications = await ctx.db
      .query("workspaceNotifications")
      .filter((q) => q.lt(q.field("timestamp"), cutoffDate.toISOString()))
      .collect();

    await Promise.all(
      oldNotifications.map((notification) =>
        ctx.db.delete(notification._id)
      )
    );

    return oldNotifications.length;
  },
});