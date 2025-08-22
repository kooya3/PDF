import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new project in workspace
export const createProject = mutation({
  args: {
    id: v.string(),
    workspaceId: v.string(),
    name: v.string(),
    description: v.string(),
    createdBy: v.string(),
    documentIds: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string()))
  },
  handler: async (ctx, args) => {
    // Check if user is a member with project creation permissions
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) => 
        q.eq("workspaceId", args.workspaceId).eq("userId", args.createdBy)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership || !membership.permissions.canCreateProjects) {
      throw new Error("Access denied: Insufficient permissions to create projects");
    }

    const now = Date.now();
    const documentIds = args.documentIds || [];

    // Create project
    const projectId = await ctx.db.insert("workspaceProjects", {
      id: args.id,
      workspaceId: args.workspaceId,
      name: args.name,
      description: args.description,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
      documentIds,
      collaborators: [args.createdBy],
      status: "active",
      tags: args.tags || [],
      metadata: {
        documentCount: documentIds.length,
        totalWordCount: 0, // Will be calculated later
        analysisProgress: 0
      }
    });

    // Update workspace project count
    const workspace = await ctx.db
      .query("workspaces")
      .filter((q) => q.eq(q.field("id"), args.workspaceId))
      .first();

    if (workspace) {
      // Create a completely clean stats object, ignoring any corrupted fields
      const cleanStats = {
        activeMembers: workspace.stats?.activeMembers || 1,
        totalProjects: (workspace.stats?.totalProjects || 0) + 1,
        totalDocuments: workspace.stats?.totalDocuments || 0,
        storageUsedMB: workspace.stats?.storageUsedMB || 0,
        analysisCount: workspace.stats?.analysisCount || 0,
        lastActivity: now
      };

      const updateData = {
        stats: cleanStats,
        updatedAt: now
      };
      
      console.log('Defensive workspace update - clean stats:', JSON.stringify(cleanStats, null, 2));
      console.log('Original workspace had fields:', Object.keys(workspace).filter(k => k.startsWith('stats')));
      
      await ctx.db.patch(workspace._id, updateData);
    }

    // Log activity
    await ctx.db.insert("workspaceActivities", {
      id: `act_${now}_${Math.random().toString(36).substr(2, 9)}`,
      workspaceId: args.workspaceId,
      userId: args.createdBy,
      userName: membership.name,
      action: "project_created",
      targetId: args.id,
      targetName: args.name,
      description: `Created project "${args.name}"`,
      timestamp: now
    });

    return projectId;
  }
});

// Get projects in workspace
export const getWorkspaceProjects = query({
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

    const projects = await ctx.db
      .query("workspaceProjects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .collect();

    return projects.map(project => ({
      ...project,
      createdAt: new Date(project.createdAt).toISOString(),
      updatedAt: new Date(project.updatedAt).toISOString(),
      documentCount: project.documentIds.length,
      collaboratorCount: project.collaborators.length
    }));
  }
});

// Update project
export const updateProject = mutation({
  args: {
    projectId: v.string(),
    workspaceId: v.string(),
    userId: v.string(),
    updates: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      status: v.optional(v.union(v.literal("active"), v.literal("completed"), v.literal("archived"))),
      documentIds: v.optional(v.array(v.string())),
      collaborators: v.optional(v.array(v.string())),
      tags: v.optional(v.array(v.string())),
      metadata: v.optional(v.object({
        documentCount: v.optional(v.number()),
        totalWordCount: v.optional(v.number()),
        analysisProgress: v.optional(v.number())
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

    if (!membership) {
      throw new Error("Access denied: User is not a member of this workspace");
    }

    const project = await ctx.db
      .query("workspaceProjects")
      .filter((q) => 
        q.eq(q.field("id"), args.projectId) &&
        q.eq(q.field("workspaceId"), args.workspaceId)
      )
      .first();

    if (!project) {
      throw new Error("Project not found");
    }

    // Check if user can edit this project
    const canEdit = project.createdBy === args.userId || 
                   membership.role === "owner" || 
                   membership.role === "admin" ||
                   project.collaborators.includes(args.userId);

    if (!canEdit) {
      throw new Error("Access denied: Insufficient permissions to edit this project");
    }

    const now = Date.now();
    
    // Build update object
    const updateData: any = {
      updatedAt: now
    };

    if (args.updates.name) updateData.name = args.updates.name;
    if (args.updates.description) updateData.description = args.updates.description;
    if (args.updates.status) updateData.status = args.updates.status;
    if (args.updates.documentIds) updateData.documentIds = args.updates.documentIds;
    if (args.updates.collaborators) updateData.collaborators = args.updates.collaborators;
    if (args.updates.tags) updateData.tags = args.updates.tags;
    if (args.updates.metadata) {
      Object.entries(args.updates.metadata).forEach(([key, value]) => {
        if (value !== undefined) {
          updateData[`metadata.${key}`] = value;
        }
      });
    }

    await ctx.db.patch(project._id, updateData);

    // Update workspace last activity
    const workspace = await ctx.db
      .query("workspaces")
      .filter((q) => q.eq(q.field("id"), args.workspaceId))
      .first();

    if (workspace) {
      await ctx.db.patch(workspace._id, {
        stats: {
          ...workspace.stats,
          lastActivity: now
        },
        updatedAt: now
      });
    }

    // Log activity
    await ctx.db.insert("workspaceActivities", {
      id: `act_${now}_${Math.random().toString(36).substr(2, 9)}`,
      workspaceId: args.workspaceId,
      userId: args.userId,
      userName: membership.name,
      action: "project_updated",
      targetId: args.projectId,
      targetName: project.name,
      description: `Updated project "${project.name}"`,
      timestamp: now
    });

    return true;
  }
});

// Delete project
export const deleteProject = mutation({
  args: {
    projectId: v.string(),
    workspaceId: v.string(),
    userId: v.string()
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

    if (!membership || !membership.permissions.canDeleteProjects) {
      throw new Error("Access denied: Insufficient permissions to delete projects");
    }

    const project = await ctx.db
      .query("workspaceProjects")
      .filter((q) => 
        q.eq(q.field("id"), args.projectId) &&
        q.eq(q.field("workspaceId"), args.workspaceId)
      )
      .first();

    if (!project) {
      throw new Error("Project not found");
    }

    // Only project creator, workspace owner, or admin can delete
    const canDelete = project.createdBy === args.userId || 
                     membership.role === "owner" || 
                     membership.role === "admin";

    if (!canDelete) {
      throw new Error("Access denied: Only project creator, workspace owner, or admin can delete projects");
    }

    await ctx.db.delete(project._id);

    // Update workspace project count
    const workspace = await ctx.db
      .query("workspaces")
      .filter((q) => q.eq(q.field("id"), args.workspaceId))
      .first();

    if (workspace) {
      const now = Date.now();
      await ctx.db.patch(workspace._id, {
        stats: {
          ...workspace.stats,
          totalProjects: Math.max(0, workspace.stats.totalProjects - 1),
          lastActivity: now
        },
        updatedAt: now
      });
    }

    // Log activity
    await ctx.db.insert("workspaceActivities", {
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workspaceId: args.workspaceId,
      userId: args.userId,
      userName: membership.name,
      action: "project_updated",
      targetId: args.projectId,
      targetName: project.name,
      description: `Deleted project "${project.name}"`,
      timestamp: Date.now()
    });

    return true;
  }
});

// Add collaborator to project
export const addCollaborator = mutation({
  args: {
    projectId: v.string(),
    workspaceId: v.string(),
    userId: v.string(),
    collaboratorId: v.string()
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

    if (!membership) {
      throw new Error("Access denied: User is not a member of this workspace");
    }

    // Check if collaborator is a workspace member
    const collaboratorMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) => 
        q.eq("workspaceId", args.workspaceId).eq("userId", args.collaboratorId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!collaboratorMembership) {
      throw new Error("Collaborator must be a workspace member");
    }

    const project = await ctx.db
      .query("workspaceProjects")
      .filter((q) => 
        q.eq(q.field("id"), args.projectId) &&
        q.eq(q.field("workspaceId"), args.workspaceId)
      )
      .first();

    if (!project) {
      throw new Error("Project not found");
    }

    // Check if already a collaborator
    if (project.collaborators.includes(args.collaboratorId)) {
      throw new Error("User is already a collaborator");
    }

    // Add collaborator
    await ctx.db.patch(project._id, {
      collaborators: [...project.collaborators, args.collaboratorId],
      updatedAt: Date.now()
    });

    // Log activity
    await ctx.db.insert("workspaceActivities", {
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workspaceId: args.workspaceId,
      userId: args.userId,
      userName: membership.name,
      action: "member_added",
      targetId: args.projectId,
      targetName: project.name,
      description: `Added ${collaboratorMembership.name} as collaborator to "${project.name}"`,
      timestamp: Date.now()
    });

    return true;
  }
});