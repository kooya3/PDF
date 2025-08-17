import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { convex } from '@/lib/convex-client';
import { api } from '@/convex/_generated/api';

// Helper function to safely convert dates to ISO strings
const safeToISOString = (dateValue: any): string => {
  if (typeof dateValue === 'string') {
    // Already an ISO string
    return dateValue;
  }
  if (typeof dateValue === 'number') {
    // Convert timestamp to ISO string
    return new Date(dateValue).toISOString();
  }
  if (dateValue instanceof Date) {
    // Convert Date object to ISO string
    return dateValue.toISOString();
  }
  // Fallback for invalid data
  return new Date().toISOString();
};

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      name, 
      description, 
      settings 
    }: {
      name: string;
      description: string;
      settings?: any;
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Workspace name is required' },
        { status: 400 }
      );
    }

    console.log(`[Workspaces] Creating workspace "${name}" for user ${userId}`);

    const workspaceId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create workspace using Convex
    const convexId = await convex.mutation(api.workspaces.createWorkspace, {
      id: workspaceId,
      name,
      description: description || '',
      ownerId: userId,
      settings
    });

    return NextResponse.json({
      success: true,
      workspace: {
        id: workspaceId,
        name,
        description: description || '',
        ownerId: userId,
        createdAt: new Date().toISOString(),
        memberCount: 1,
        projectCount: 0,
        settings: settings || {}
      }
    });

  } catch (error) {
    console.error('Workspace creation error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to create workspace',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    // Handle member role update
    if (body.action === 'updateMemberRole') {
      const { targetUserId, newRole } = body;
      
      if (!targetUserId || !newRole) {
        return NextResponse.json(
          { error: 'targetUserId and newRole are required' },
          { status: 400 }
        );
      }

      console.log(`[Workspaces] User ${userId} updating member ${targetUserId} role to ${newRole} in workspace ${workspaceId}`);

      await convex.mutation(api.workspaces.updateMemberRole, {
        workspaceId,
        targetUserId,
        newRole,
        userId
      });

      return NextResponse.json({
        success: true,
        message: 'Member role updated successfully'
      });
    }

    // Handle workspace settings update
    const updates = {
      name: body.name,
      description: body.description,
      settings: body.settings
    };

    console.log(`[Workspaces] User ${userId} updating workspace ${workspaceId}`);

    await convex.mutation(api.workspaces.updateWorkspace, {
      workspaceId,
      userId,
      updates
    });

    // Get updated workspace
    const workspace = await convex.query(api.workspaces.getWorkspace, {
      workspaceId,
      userId
    });

    return NextResponse.json({
      success: true,
      workspace: {
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        ownerId: workspace.ownerId,
        createdAt: safeToISOString(workspace.createdAt),
        updatedAt: safeToISOString(workspace.updatedAt),
        settings: workspace.settings,
        stats: {
          ...workspace.stats,
          lastActivity: safeToISOString(workspace.stats.lastActivity)
        }
      }
    });

  } catch (error) {
    console.error('Workspace update error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to update workspace',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    console.log(`[Workspaces] User ${userId} deleting workspace ${workspaceId}`);

    await convex.mutation(api.workspaces.deleteWorkspace, {
      workspaceId,
      userId
    });

    return NextResponse.json({
      success: true,
      message: 'Workspace deleted successfully'
    });

  } catch (error) {
    console.error('Workspace deletion error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to delete workspace',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (workspaceId) {
      // Get specific workspace
      console.log(`[Workspaces] Getting workspace ${workspaceId} for user ${userId}`);
      
      const workspace = await convex.query(api.workspaces.getWorkspace, {
        workspaceId,
        userId
      });

      if (!workspace) {
        return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        workspace: {
          id: workspace.id,
          name: workspace.name,
          description: workspace.description,
          ownerId: workspace.ownerId,
          createdAt: safeToISOString(workspace.createdAt),
          updatedAt: safeToISOString(workspace.updatedAt),
          members: workspace.members.map(m => ({
            userId: m.userId,
            email: m.email,
            name: m.name,
            role: m.role,
            joinedAt: safeToISOString(m.joinedAt),
            lastActive: safeToISOString(m.lastActive),
            permissions: m.permissions
          })),
          projects: workspace.projects.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            createdBy: p.createdBy,
            createdAt: safeToISOString(p.createdAt),
            updatedAt: safeToISOString(p.updatedAt),
            documentCount: p.documentIds.length,
            collaboratorCount: p.collaborators.length,
            status: p.status,
            tags: p.tags,
            metadata: p.metadata
          })),
          settings: workspace.settings,
          stats: {
            ...workspace.stats,
            lastActivity: safeToISOString(workspace.stats.lastActivity)
          }
        }
      });

    } else {
      // Get user's workspaces
      console.log(`[Workspaces] Getting workspaces for user ${userId}`);
      
      const workspaces = await convex.query(api.workspaces.getUserWorkspaces, {
        userId
      });

      // Map workspaces to ensure they have the correct structure
      const mappedWorkspaces = workspaces.map(workspace => ({
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        ownerId: workspace.ownerId,
        createdAt: workspace.createdAt,
        memberCount: workspace.memberCount || 0,
        projectCount: workspace.projectCount || 0,
        role: workspace.role || 'viewer',
        stats: workspace.stats || {
          totalDocuments: 0,
          totalProjects: 0,
          activeMembers: 0,
          storageUsedMB: 0,
          lastActivity: new Date().toISOString()
        }
      }));

      return NextResponse.json({
        success: true,
        workspaces: mappedWorkspaces
      });
    }

  } catch (error) {
    console.error('Workspace retrieval error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to get workspaces',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}