import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Create a new workspace
export const createWorkspace = mutation({
  args: {
    id: v.string(),
    name: v.string(),
    description: v.string(),
    ownerId: v.string(),
    settings: v.optional(v.object({
      isPublic: v.boolean(),
      allowMemberInvites: v.boolean(),
      requireApprovalForNewMembers: v.boolean(),
      maxMembers: v.number(),
      maxStorageGB: v.number(),
      enableRealTimeCollaboration: v.boolean(),
      defaultMemberRole: v.union(v.literal("editor"), v.literal("viewer")),
      allowGuestAccess: v.boolean(),
      dataRetentionDays: v.number()
    }))
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Default settings if not provided
    const defaultSettings = {
      isPublic: false,
      allowMemberInvites: true,
      requireApprovalForNewMembers: false,
      maxMembers: 50,
      maxStorageGB: 10,
      enableRealTimeCollaboration: true,
      defaultMemberRole: "editor" as const,
      allowGuestAccess: false,
      dataRetentionDays: 365
    };

    const settings = args.settings || defaultSettings;

    // Create workspace
    const workspaceId = await ctx.db.insert("workspaces", {
      id: args.id,
      name: args.name,
      description: args.description,
      ownerId: args.ownerId,
      createdAt: now,
      updatedAt: now,
      settings,
      stats: {
        totalDocuments: 0,
        totalProjects: 0,
        activeMembers: 1,
        storageUsedMB: 0,
        analysisCount: 0,
        lastActivity: now
      }
    });

    // Add owner as member
    await ctx.db.insert("workspaceMembers", {
      workspaceId: args.id,
      userId: args.ownerId,
      email: "", // Will be updated when user data is available
      name: "", // Will be updated when user data is available
      role: "owner",
      joinedAt: now,
      lastActive: now,
      permissions: {
        canUploadDocuments: true,
        canDeleteDocuments: true,
        canInviteMembers: true,
        canManageMembers: true,
        canExportData: true,
        canAccessSettings: true,
        canCreateProjects: true,
        canDeleteProjects: true
      },
      status: "active"
    });

    // Log activity
    await ctx.db.insert("workspaceActivities", {
      id: `act_${now}_${Math.random().toString(36).substr(2, 9)}`,
      workspaceId: args.id,
      userId: args.ownerId,
      userName: "", // Will be updated when user data is available
      action: "workspace_created",
      description: `Created workspace "${args.name}"`,
      timestamp: now
    });

    return workspaceId;
  }
});

// Get user's workspaces
export const getUserWorkspaces = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Get all workspace memberships for the user
    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Get workspace details for each membership
    const workspaces = await Promise.all(
      memberships.map(async (membership) => {
        const workspace = await ctx.db
          .query("workspaces")
          .filter((q) => q.eq(q.field("id"), membership.workspaceId))
          .first();

        if (!workspace) return null;

        // Get member count
        const memberCount = await ctx.db
          .query("workspaceMembers")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace.id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect();

        // Get project count
        const projectCount = await ctx.db
          .query("workspaceProjects")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace.id))
          .collect();

        // Helper function to safely convert to ISO string
        const toISOString = (timestamp: any) => {
          if (typeof timestamp === 'string') {
            // Already an ISO string
            return timestamp;
          }
          if (typeof timestamp === 'number') {
            // Convert timestamp to ISO string
            return new Date(timestamp).toISOString();
          }
          // Fallback for invalid data
          return new Date().toISOString();
        };

        return {
          id: workspace.id,
          name: workspace.name,
          description: workspace.description,
          ownerId: workspace.ownerId,
          createdAt: toISOString(workspace.createdAt),
          memberCount: memberCount.length,
          projectCount: projectCount.length,
          role: membership.role,
          stats: {
            ...workspace.stats,
            lastActivity: toISOString(workspace.stats.lastActivity)
          }
        };
      })
    );

    return workspaces.filter(Boolean);
  }
});

// Get workspace by ID
export const getWorkspace = query({
  args: { 
    workspaceId: v.string(),
    userId: v.string()
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

    const workspace = await ctx.db
      .query("workspaces")
      .filter((q) => q.eq(q.field("id"), args.workspaceId))
      .first();

    if (!workspace) {
      throw new Error("Workspace not found");
    }

    // Get all members
    const members = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace.id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Get all projects
    const projects = await ctx.db
      .query("workspaceProjects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace.id))
      .collect();

    // Helper function to safely convert to ISO string
    const toISOString = (timestamp: any) => {
      if (typeof timestamp === 'string') {
        // Already an ISO string
        return timestamp;
      }
      if (typeof timestamp === 'number') {
        // Convert timestamp to ISO string
        return new Date(timestamp).toISOString();
      }
      // Fallback for invalid data
      return new Date().toISOString();
    };

    return {
      ...workspace,
      createdAt: toISOString(workspace.createdAt),
      updatedAt: toISOString(workspace.updatedAt),
      members: members.map(m => ({
        ...m,
        joinedAt: toISOString(m.joinedAt),
        lastActive: toISOString(m.lastActive)
      })),
      projects: projects.map(p => ({
        ...p,
        createdAt: toISOString(p.createdAt),
        updatedAt: toISOString(p.updatedAt)
      })),
      stats: {
        ...workspace.stats,
        lastActivity: toISOString(workspace.stats.lastActivity)
      }
    };
  }
});

// Update workspace
export const updateWorkspace = mutation({
  args: {
    workspaceId: v.string(),
    userId: v.string(),
    updates: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      settings: v.optional(v.object({
        isPublic: v.optional(v.boolean()),
        allowMemberInvites: v.optional(v.boolean()),
        requireApprovalForNewMembers: v.optional(v.boolean()),
        maxMembers: v.optional(v.number()),
        maxStorageGB: v.optional(v.number()),
        enableRealTimeCollaboration: v.optional(v.boolean()),
        defaultMemberRole: v.optional(v.union(v.literal("editor"), v.literal("viewer"))),
        allowGuestAccess: v.optional(v.boolean()),
        dataRetentionDays: v.optional(v.number())
      }))
    })
  },
  handler: async (ctx, args) => {
    // Check permissions
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) => 
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership || !membership.permissions.canAccessSettings) {
      throw new Error("Access denied: Insufficient permissions");
    }

    const workspace = await ctx.db
      .query("workspaces")
      .filter((q) => q.eq(q.field("id"), args.workspaceId))
      .first();

    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const now = Date.now();
    
    // Build update object
    const updateData: any = {
      updatedAt: now,
      stats: {
        ...workspace.stats,
        lastActivity: now
      }
    };

    if (args.updates.name) updateData.name = args.updates.name;
    if (args.updates.description) updateData.description = args.updates.description;
    if (args.updates.settings) {
      updateData.settings = {
        ...workspace.settings,
        ...args.updates.settings
      };
    }

    await ctx.db.patch(workspace._id, updateData);

    // Log activity
    await ctx.db.insert("workspaceActivities", {
      id: `act_${now}_${Math.random().toString(36).substr(2, 9)}`,
      workspaceId: args.workspaceId,
      userId: args.userId,
      userName: membership.name,
      action: "settings_changed",
      description: "Updated workspace settings",
      timestamp: now
    });

    return true;
  }
});

// Delete workspace
export const deleteWorkspace = mutation({
  args: {
    workspaceId: v.string(),
    userId: v.string()
  },
  handler: async (ctx, args) => {
    const workspace = await ctx.db
      .query("workspaces")
      .filter((q) => q.eq(q.field("id"), args.workspaceId))
      .first();

    if (!workspace) {
      throw new Error("Workspace not found");
    }

    // Only owner can delete workspace
    if (workspace.ownerId !== args.userId) {
      throw new Error("Access denied: Only workspace owner can delete workspace");
    }

    // Delete all related data
    const members = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    const projects = await ctx.db
      .query("workspaceProjects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    const invitations = await ctx.db
      .query("workspaceInvitations")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    const activities = await ctx.db
      .query("workspaceActivities")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    // Delete all related records
    await Promise.all([
      ...members.map(m => ctx.db.delete(m._id)),
      ...projects.map(p => ctx.db.delete(p._id)),
      ...invitations.map(i => ctx.db.delete(i._id)),
      ...activities.map(a => ctx.db.delete(a._id)),
      ctx.db.delete(workspace._id)
    ]);

    return true;
  }
});

// Update workspace stats
export const updateWorkspaceStats = mutation({
  args: {
    workspaceId: v.string(),
    stats: v.object({
      totalDocuments: v.optional(v.number()),
      totalProjects: v.optional(v.number()),
      activeMembers: v.optional(v.number()),
      storageUsedMB: v.optional(v.number()),
      analysisCount: v.optional(v.number())
    })
  },
  handler: async (ctx, args) => {
    const workspace = await ctx.db
      .query("workspaces")
      .filter((q) => q.eq(q.field("id"), args.workspaceId))
      .first();

    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const now = Date.now();
    const newStats = {
      ...workspace.stats,
      lastActivity: now
    };

    Object.entries(args.stats).forEach(([key, value]) => {
      if (value !== undefined) {
        newStats[key] = value;
      }
    });

    await ctx.db.patch(workspace._id, {
      updatedAt: now,
      stats: newStats
    });
    return true;
  }
});

// Emergency cleanup function for workspace schema issues
export const cleanupWorkspaceFields = mutation({
  args: {
    workspaceId: v.string(),
    userId: v.string()
  },
  handler: async (ctx, args) => {
    // Check if requesting user has permissions
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) => 
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership || !membership.permissions.canAccessSettings) {
      throw new Error("Access denied: Insufficient permissions");
    }

    const workspace = await ctx.db
      .query("workspaces")
      .filter((q) => q.eq(q.field("id"), args.workspaceId))
      .first();

    if (!workspace) {
      throw new Error("Workspace not found");
    }

    console.log('Before cleanup - workspace keys:', Object.keys(workspace));
    console.log('Corrupted fields found:', Object.keys(workspace).filter(k => k.includes('.')));
    
    // Create a completely clean workspace object with only valid schema fields
    const cleanWorkspace = {
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      ownerId: workspace.ownerId,
      createdAt: workspace.createdAt,
      updatedAt: Date.now(),
      settings: {
        allowGuestAccess: workspace.settings?.allowGuestAccess ?? false,
        allowMemberInvites: workspace.settings?.allowMemberInvites ?? true,
        dataRetentionDays: workspace.settings?.dataRetentionDays ?? 365,
        defaultMemberRole: workspace.settings?.defaultMemberRole ?? 'editor',
        enableRealTimeCollaboration: workspace.settings?.enableRealTimeCollaboration ?? true,
        isPublic: workspace.settings?.isPublic ?? true,
        maxMembers: workspace.settings?.maxMembers ?? 50,
        maxStorageGB: workspace.settings?.maxStorageGB ?? 10,
        requireApprovalForNewMembers: workspace.settings?.requireApprovalForNewMembers ?? false
      },
      stats: {
        activeMembers: workspace.stats?.activeMembers || 1,
        totalProjects: workspace.stats?.totalProjects || 0,
        totalDocuments: workspace.stats?.totalDocuments || 0,
        storageUsedMB: workspace.stats?.storageUsedMB || 0,
        analysisCount: workspace.stats?.analysisCount || 0,
        lastActivity: workspace.stats?.lastActivity || Date.now()
      }
    };

    console.log('Clean workspace structure:', Object.keys(cleanWorkspace));
    console.log('Clean stats:', JSON.stringify(cleanWorkspace.stats, null, 2));

    // Use replace to completely overwrite the corrupted document
    await ctx.db.replace(workspace._id, cleanWorkspace);
    
    console.log('Workspace cleanup completed successfully');
    return true;
  }
});

// Update member role
export const updateMemberRole = mutation({
  args: {
    workspaceId: v.string(),
    targetUserId: v.string(),
    newRole: v.union(
      v.literal("admin"),
      v.literal("editor"), 
      v.literal("viewer")
    ),
    userId: v.string()
  },
  handler: async (ctx, args) => {
    // Check if requesting user has permissions
    const requesterMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) => 
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!requesterMembership || !requesterMembership.permissions.canManageMembers) {
      throw new Error("Access denied: Insufficient permissions");
    }

    // Find target member
    const targetMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) => 
        q.eq("workspaceId", args.workspaceId).eq("userId", args.targetUserId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!targetMembership) {
      throw new Error("Member not found");
    }

    // Get workspace to check ownership
    const workspace = await ctx.db
      .query("workspaces")
      .filter((q) => q.eq(q.field("id"), args.workspaceId))
      .first();

    if (!workspace) {
      throw new Error("Workspace not found");
    }

    // Cannot change role of workspace owner
    if (workspace.ownerId === args.targetUserId) {
      throw new Error("Cannot change role of workspace owner");
    }

    // Cannot demote yourself if you're the only admin
    if (args.userId === args.targetUserId && requesterMembership.role === "admin" && args.newRole !== "admin") {
      const adminCount = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
        .filter((q) => q.eq(q.field("status"), "active"))
        .filter((q) => q.eq(q.field("role"), "admin"))
        .collect();

      if (adminCount.length <= 1) {
        throw new Error("Cannot demote yourself as the only admin");
      }
    }

    const now = Date.now();

    // Update member role and permissions
    const newPermissions = {
      canUploadDocuments: true,
      canDeleteDocuments: args.newRole !== "viewer",
      canInviteMembers: args.newRole === "admin",
      canManageMembers: args.newRole === "admin", 
      canExportData: true,
      canAccessSettings: args.newRole === "admin",
      canCreateProjects: args.newRole !== "viewer",
      canDeleteProjects: args.newRole === "admin"
    };

    await ctx.db.patch(targetMembership._id, {
      role: args.newRole,
      permissions: newPermissions,
      lastActive: now
    });

    // Log activity
    await ctx.db.insert("workspaceActivities", {
      id: `act_${now}_${Math.random().toString(36).substr(2, 9)}`,
      workspaceId: args.workspaceId,
      userId: args.userId,
      userName: requesterMembership.name,
      action: "member_role_changed",
      targetName: targetMembership.name,
      description: `Changed ${targetMembership.name}'s role from ${targetMembership.role} to ${args.newRole}`,
      timestamp: now
    });

    return true;
  }
});