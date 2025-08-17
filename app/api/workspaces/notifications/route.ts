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
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    console.log(`[Notifications] Getting notifications for workspace ${workspaceId}`);

    // Fetch notifications from Convex
    const result = await convex.query(api.workspaceNotifications.getNotifications, {
      workspaceId,
      userId,
      limit
    });

    return NextResponse.json({
      success: true,
      notifications: result.notifications,
      unreadCount: result.unreadCount
    });

  } catch (error) {
    console.error('Notifications fetch error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch notifications',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      workspaceId,
      type,
      title,
      message,
      targetName,
      priority = 'medium'
    } = body;

    if (!workspaceId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'workspaceId, type, title, and message are required' },
        { status: 400 }
      );
    }

    console.log(`[Notifications] Creating notification for workspace ${workspaceId}`);

    // Create notification using Convex
    const notification = await convex.mutation(api.workspaceNotifications.createNotification, {
      workspaceId,
      type,
      title,
      message,
      actorId: userId,
      targetName,
      priority
    });

    return NextResponse.json({
      success: true,
      notification
    });

  } catch (error) {
    console.error('Notification creation error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to create notification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}