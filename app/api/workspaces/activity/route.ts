import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { convex } from '@/lib/convex-client';
import { api } from '@/convex/_generated/api';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId parameter is required' },
        { status: 400 }
      );
    }

    console.log(`[Workspaces] Getting activity for workspace ${workspaceId} by user ${userId}`);

    // Get workspace activity using Convex
    const activities = await convex.query(api.workspaceActivities.getWorkspaceActivity, {
      workspaceId,
      userId,
      limit: Math.min(limit, 100) // Cap at 100 activities
    });

    return NextResponse.json({
      success: true,
      workspaceId,
      activities,
      totalActivities: activities.length
    });

  } catch (error) {
    console.error('Workspace activity error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to get workspace activity',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}