import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { convex } from '@/lib/convex-client';
import { api } from '@/convex/_generated/api';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      workspaceId, 
      name, 
      description, 
      documentIds 
    }: {
      workspaceId: string;
      name: string;
      description: string;
      documentIds?: string[];
    } = body;

    if (!workspaceId || !name) {
      return NextResponse.json(
        { error: 'workspaceId and name are required' },
        { status: 400 }
      );
    }

    console.log(`[Workspaces] Creating project "${name}" in workspace ${workspaceId} by user ${userId}`);

    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create project using Convex
    const convexId = await convex.mutation(api.workspaceProjects.createProject, {
      id: projectId,
      workspaceId,
      name,
      description: description || '',
      createdBy: userId,
      documentIds,
      tags: []
    });

    return NextResponse.json({
      success: true,
      project: {
        id: projectId,
        name,
        description: description || '',
        createdBy: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        documentCount: (documentIds || []).length,
        collaboratorCount: 1,
        status: 'active',
        tags: [],
        metadata: {
          documentCount: (documentIds || []).length,
          totalWordCount: 0,
          analysisProgress: 0
        }
      }
    });

  } catch (error) {
    console.error('Project creation error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to create project',
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

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId parameter is required' },
        { status: 400 }
      );
    }

    console.log(`[Workspaces] Getting projects for workspace ${workspaceId} by user ${userId}`);

    // Get projects using Convex
    const projects = await convex.query(api.workspaceProjects.getWorkspaceProjects, {
      workspaceId,
      userId
    });

    return NextResponse.json({
      success: true,
      workspaceId,
      projects,
      totalProjects: projects.length
    });

  } catch (error) {
    console.error('Project retrieval error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to get projects',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}