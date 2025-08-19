import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new workspace invitation
export const createInvitation = mutation({
  args: {
    workspaceId: v.string(),
    invitedBy: v.string(),
    invitedEmail: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("editor"),
      v.literal("viewer")
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = now + (7 * 24 * 60 * 60 * 1000); // 7 days
    const token = `inv_${now}_${Math.random().toString(36).substr(2, 16)}`;
    const invitationId = `inv_${now}_${Math.random().toString(36).substr(2, 9)}`;

    // Check if invitation already exists for this email
    const existingInvitation = await ctx.db
      .query("workspaceInvitations")
      .withIndex("by_workspace_email", (q) => 
        q.eq("workspaceId", args.workspaceId).eq("invitedEmail", args.invitedEmail)
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (existingInvitation) {
      // Update existing invitation instead of throwing error
      await ctx.db.patch(existingInvitation._id, {
        role: args.role,
        invitedBy: args.invitedBy,
        expiresAt,
        createdAt: now
      });

      return {
        id: existingInvitation.id,
        token: existingInvitation.token,
        expiresAt,
        updated: true
      };
    }

    // Create invitation
    await ctx.db.insert("workspaceInvitations", {
      id: invitationId,
      workspaceId: args.workspaceId,
      invitedBy: args.invitedBy,
      invitedEmail: args.invitedEmail,
      role: args.role,
      token,
      expiresAt,
      createdAt: now,
      status: "pending"
    });

    // Log activity
    await ctx.db.insert("workspaceActivities", {
      id: `act_${now}_${Math.random().toString(36).substr(2, 9)}`,
      workspaceId: args.workspaceId,
      userId: args.invitedBy,
      userName: "", // Will be filled from user data
      action: "member_added",
      targetName: args.invitedEmail,
      description: `Invited ${args.invitedEmail} as ${args.role}`,
      timestamp: now
    });

    return {
      id: invitationId,
      token,
      expiresAt
    };
  },
});

// Get invitation by token
export const getInvitation = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("workspaceInvitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new Error("Invitation is no longer valid");
    }

    if (invitation.expiresAt < Date.now()) {
      // Mark as expired
      await ctx.db.patch(invitation._id, { status: "expired" });
      throw new Error("Invitation has expired");
    }

    // Get workspace details
    const workspace = await ctx.db
      .query("workspaces")
      .filter((q) => q.eq(q.field("id"), invitation.workspaceId))
      .first();

    return {
      ...invitation,
      createdAt: new Date(invitation.createdAt).toISOString(),
      expiresAt: new Date(invitation.expiresAt).toISOString(),
      workspace: workspace ? {
        id: workspace.id,
        name: workspace.name,
        description: workspace.description
      } : null
    };
  },
});

// Get workspace invitations
export const getWorkspaceInvitations = query({
  args: { 
    workspaceId: v.string(),
    userId: v.string()
  },
  handler: async (ctx, args) => {
    // Check if user has permission to view invitations
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) => 
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership || !membership.permissions.canInviteMembers) {
      throw new Error("Access denied: Insufficient permissions");
    }

    const invitations = await ctx.db
      .query("workspaceInvitations")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .order("desc")
      .collect();

    return invitations.map(invitation => ({
      ...invitation,
      createdAt: new Date(invitation.createdAt).toISOString(),
      expiresAt: new Date(invitation.expiresAt).toISOString()
    }));
  },
});

// Accept invitation
export const acceptInvitation = mutation({
  args: {
    token: v.string(),
    userId: v.string(),
    userEmail: v.string(),
    userName: v.string()
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("workspaceInvitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new Error("Invitation is no longer valid");
    }

    if (invitation.expiresAt < Date.now()) {
      await ctx.db.patch(invitation._id, { status: "expired" });
      throw new Error("Invitation has expired");
    }

    // Check if user is already a member
    const existingMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) => 
        q.eq("workspaceId", invitation.workspaceId).eq("userId", args.userId)
      )
      .first();

    if (existingMembership) {
      await ctx.db.patch(invitation._id, { status: "accepted" });
      throw new Error("User is already a member of this workspace");
    }

    const now = Date.now();

    // Add user as member
    await ctx.db.insert("workspaceMembers", {
      workspaceId: invitation.workspaceId,
      userId: args.userId,
      email: args.userEmail || invitation.invitedEmail,
      name: args.userName,
      role: invitation.role,
      joinedAt: now,
      lastActive: now,
      permissions: {
        canUploadDocuments: true,
        canDeleteDocuments: invitation.role !== "viewer",
        canInviteMembers: invitation.role === "admin",
        canManageMembers: invitation.role === "admin",
        canExportData: true,
        canAccessSettings: invitation.role === "admin",
        canCreateProjects: invitation.role !== "viewer",
        canDeleteProjects: invitation.role === "admin"
      },
      status: "active"
    });

    // Mark invitation as accepted
    await ctx.db.patch(invitation._id, { status: "accepted" });

    // Update workspace stats
    const workspace = await ctx.db
      .query("workspaces")
      .filter((q) => q.eq(q.field("id"), invitation.workspaceId))
      .first();

    if (workspace) {
      await ctx.db.patch(workspace._id, {
        stats: {
          ...workspace.stats,
          activeMembers: (workspace.stats.activeMembers || 0) + 1,
          lastActivity: now
        },
        updatedAt: now
      });
    }

    // Log activity
    await ctx.db.insert("workspaceActivities", {
      id: `act_${now}_${Math.random().toString(36).substr(2, 9)}`,
      workspaceId: invitation.workspaceId,
      userId: args.userId,
      userName: args.userName,
      action: "member_added",
      description: `${args.userName} joined the workspace`,
      timestamp: now
    });

    return {
      success: true,
      workspaceId: invitation.workspaceId
    };
  },
});

// Cancel invitation
export const cancelInvitation = mutation({
  args: {
    invitationId: v.string(),
    userId: v.string()
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("workspaceInvitations")
      .filter((q) => q.eq(q.field("id"), args.invitationId))
      .first();

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Check permissions
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) => 
        q.eq("workspaceId", invitation.workspaceId).eq("userId", args.userId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!membership || !membership.permissions.canInviteMembers) {
      throw new Error("Access denied: Insufficient permissions");
    }

    await ctx.db.patch(invitation._id, { status: "cancelled" });

    // Log activity
    const now = Date.now();
    await ctx.db.insert("workspaceActivities", {
      id: `act_${now}_${Math.random().toString(36).substr(2, 9)}`,
      workspaceId: invitation.workspaceId,
      userId: args.userId,
      userName: membership.name,
      action: "member_removed",
      targetName: invitation.invitedEmail,
      description: `Cancelled invitation for ${invitation.invitedEmail}`,
      timestamp: now
    });

    return true;
  },
});

// Clean up expired invitations (maintenance function)
export const cleanupExpiredInvitations = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    const expiredInvitations = await ctx.db
      .query("workspaceInvitations")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    await Promise.all(
      expiredInvitations.map((invitation) =>
        ctx.db.patch(invitation._id, { status: "expired" })
      )
    );

    return expiredInvitations.length;
  },
});