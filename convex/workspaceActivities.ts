import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get workspace activity feed
export const getWorkspaceActivity = query({
  args: { 
    workspaceId: v.string(),
    userId: v.string(),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    // Check if user is a member
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) => 
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership) {
      throw new Error("Access denied: User is not a member of this workspace");
    }

    const limit = args.limit || 50;
    
    const activities = await ctx.db
      .query("workspaceActivities")
      .withIndex("by_workspace_timestamp", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .take(limit);

    return activities.map(activity => ({
      ...activity,
      timestamp: new Date(activity.timestamp).toISOString()
    }));
  }
});

// Log a new activity
export const logActivity = mutation({
  args: {
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
    metadata: v.optional(v.any())
  },
  handler: async (ctx, args) => {
    // Check if user is a member (for most actions)
    if (args.action !== "workspace_created") {
      const membership = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspace_user", (q) => 
          q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
        )
        .filter((q) => q.eq(q.field("status"), "active"))
        .first();

      if (!membership) {
        throw new Error("Access denied: User is not a member of this workspace");
      }
    }

    const now = Date.now();
    
    const activityId = await ctx.db.insert("workspaceActivities", {
      id: `act_${now}_${Math.random().toString(36).substr(2, 9)}`,
      workspaceId: args.workspaceId,
      userId: args.userId,
      userName: args.userName,
      action: args.action,
      targetId: args.targetId,
      targetName: args.targetName,
      description: args.description,
      timestamp: now,
      metadata: args.metadata
    });

    // Update workspace last activity
    const workspace = await ctx.db
      .query("workspaces")
      .filter((q) => q.eq(q.field("id"), args.workspaceId))
      .first();

    if (workspace) {
      await ctx.db.patch(workspace._id, {
        "stats.lastActivity": now,
        updatedAt: now
      });
    }

    return activityId;
  }
});

// Get activities by action type
export const getActivitiesByAction = query({
  args: {
    workspaceId: v.string(),
    userId: v.string(),
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
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    // Check if user is a member
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) => 
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership) {
      throw new Error("Access denied: User is not a member of this workspace");
    }

    const limit = args.limit || 20;
    
    const activities = await ctx.db
      .query("workspaceActivities")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("action"), args.action))
      .order("desc")
      .take(limit);

    return activities.map(activity => ({
      ...activity,
      timestamp: new Date(activity.timestamp).toISOString()
    }));
  }
});

// Clean old activities (keep only recent ones)
export const cleanOldActivities = mutation({
  args: {
    workspaceId: v.string(),
    retentionDays: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const retentionDays = args.retentionDays || 90; // Default 90 days
    const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    
    const oldActivities = await ctx.db
      .query("workspaceActivities")
      .withIndex("by_workspace_timestamp", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.lt(q.field("timestamp"), cutoffTime))
      .collect();

    // Delete old activities in batches
    const batchSize = 100;
    for (let i = 0; i < oldActivities.length; i += batchSize) {
      const batch = oldActivities.slice(i, i + batchSize);
      await Promise.all(batch.map(activity => ctx.db.delete(activity._id)));
    }

    return oldActivities.length;
  }
});

// Get activity statistics
export const getActivityStats = query({
  args: {
    workspaceId: v.string(),
    userId: v.string(),
    days: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    // Check if user is a member
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) => 
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership) {
      throw new Error("Access denied: User is not a member of this workspace");
    }

    const days = args.days || 30; // Default 30 days
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    const activities = await ctx.db
      .query("workspaceActivities")
      .withIndex("by_workspace_timestamp", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.gte(q.field("timestamp"), cutoffTime))
      .collect();

    // Group by action type
    const actionCounts = activities.reduce((acc, activity) => {
      acc[activity.action] = (acc[activity.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by day
    const dailyActivity = activities.reduce((acc, activity) => {
      const day = new Date(activity.timestamp).toISOString().split('T')[0];
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Most active users
    const userActivity = activities.reduce((acc, activity) => {
      const key = `${activity.userId}:${activity.userName}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topUsers = Object.entries(userActivity)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([userKey, count]) => {
        const [userId, userName] = userKey.split(':');
        return { userId, userName, activityCount: count };
      });

    return {
      totalActivities: activities.length,
      actionCounts,
      dailyActivity,
      topUsers,
      period: `${days} days`
    };
  }
});