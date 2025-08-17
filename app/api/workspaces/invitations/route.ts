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

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    console.log(`[Invitations] Getting invitations for workspace ${workspaceId} by user ${userId}`);

    // Get workspace invitations using Convex
    const invitations = await convex.query(api.workspaceInvitations.getWorkspaceInvitations, {
      workspaceId,
      userId
    });

    return NextResponse.json({
      success: true,
      invitations
    });

  } catch (error) {
    console.error('Invitations fetch error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch invitations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}