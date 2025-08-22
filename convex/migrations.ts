import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Migration to fix ISO date strings in workspaces and members
export const fixWorkspaceDateFormats = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("Starting workspace date format migration...");
    
    // Get all workspaces
    const workspaces = await ctx.db.query("workspaces").collect();
    
    let workspacesFixed = 0;
    let membersFixed = 0;
    
    for (const workspace of workspaces) {
      let needsUpdate = false;
      const updates: any = {};
      
      // Fix createdAt if it's a string
      if (typeof workspace.createdAt === 'string') {
        updates.createdAt = new Date(workspace.createdAt).getTime();
        needsUpdate = true;
      }
      
      // Fix updatedAt if it's a string
      if (typeof workspace.updatedAt === 'string') {
        updates.updatedAt = new Date(workspace.updatedAt).getTime();
        needsUpdate = true;
      }
      
      // Fix stats.lastActivity if it's a string
      if (workspace.stats && typeof workspace.stats.lastActivity === 'string') {
        updates.stats = {
          ...workspace.stats,
          lastActivity: new Date(workspace.stats.lastActivity).getTime()
        };
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await ctx.db.patch(workspace._id, updates);
        workspacesFixed++;
        console.log(`Fixed workspace ${workspace.id} date formats`);
      }
    }
    
    // Get all workspace members
    const members = await ctx.db.query("workspaceMembers").collect();
    
    for (const member of members) {
      let needsUpdate = false;
      const updates: any = {};
      
      // Fix joinedAt if it's a string
      if (typeof member.joinedAt === 'string') {
        updates.joinedAt = new Date(member.joinedAt).getTime();
        needsUpdate = true;
      }
      
      // Fix lastActive if it's a string
      if (typeof member.lastActive === 'string') {
        updates.lastActive = new Date(member.lastActive).getTime();
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await ctx.db.patch(member._id, updates);
        membersFixed++;
        console.log(`Fixed member ${member.userId} date formats`);
      }
    }
    
    // Fix workspace projects if any exist
    const projects = await ctx.db.query("workspaceProjects").collect();
    let projectsFixed = 0;
    
    for (const project of projects) {
      let needsUpdate = false;
      const updates: any = {};
      
      if (typeof project.createdAt === 'string') {
        updates.createdAt = new Date(project.createdAt).getTime();
        needsUpdate = true;
      }
      
      if (typeof project.updatedAt === 'string') {
        updates.updatedAt = new Date(project.updatedAt).getTime();
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await ctx.db.patch(project._id, updates);
        projectsFixed++;
        console.log(`Fixed project ${project.id} date formats`);
      }
    }
    
    // Fix workspace activities if any exist
    const activities = await ctx.db.query("workspaceActivities").collect();
    let activitiesFixed = 0;
    
    for (const activity of activities) {
      if (typeof activity.timestamp === 'string') {
        await ctx.db.patch(activity._id, {
          timestamp: new Date(activity.timestamp).getTime()
        });
        activitiesFixed++;
        console.log(`Fixed activity ${activity.id} date format`);
      }
    }
    
    // Fix workspace invitations if any exist
    const invitations = await ctx.db.query("workspaceInvitations").collect();
    let invitationsFixed = 0;
    
    for (const invitation of invitations) {
      let needsUpdate = false;
      const updates: any = {};
      
      if (typeof invitation.createdAt === 'string') {
        updates.createdAt = new Date(invitation.createdAt).getTime();
        needsUpdate = true;
      }
      
      if (typeof invitation.expiresAt === 'string') {
        updates.expiresAt = new Date(invitation.expiresAt).getTime();
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await ctx.db.patch(invitation._id, updates);
        invitationsFixed++;
        console.log(`Fixed invitation ${invitation.id} date formats`);
      }
    }
    
    const result = {
      workspacesFixed,
      membersFixed,
      projectsFixed,
      activitiesFixed,
      invitationsFixed,
      message: "Migration completed successfully"
    };
    
    console.log("Migration completed:", result);
    return result;
  },
});

// Query to check date format issues
export const checkDateFormats = query({
  args: {},
  handler: async (ctx) => {
    const workspaces = await ctx.db.query("workspaces").collect();
    const members = await ctx.db.query("workspaceMembers").collect();
    
    const issues = {
      workspaces: workspaces.filter(w => 
        typeof w.createdAt === 'string' || 
        typeof w.updatedAt === 'string' ||
        (w.stats && typeof w.stats.lastActivity === 'string')
      ).length,
      members: members.filter(m => 
        typeof m.joinedAt === 'string' || 
        typeof m.lastActive === 'string'
      ).length
    };
    
    return issues;
  },
});