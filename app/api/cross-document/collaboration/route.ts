import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { enhancedCrossDocumentEngine } from '@/lib/enhanced-cross-document-engine';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, sessionName, documentIds, sessionId, annotation } = body;

    switch (action) {
      case 'create_session':
        if (!sessionName || !documentIds || !Array.isArray(documentIds)) {
          return NextResponse.json(
            { error: 'Session name and document IDs are required' },
            { status: 400 }
          );
        }

        const newSessionId = await enhancedCrossDocumentEngine.createCollaborativeSession(
          sessionName,
          userId,
          'User', // In production, get actual user name
          documentIds
        );

        return NextResponse.json({
          success: true,
          sessionId: newSessionId,
          message: 'Collaborative session created successfully',
          joinUrl: `/dashboard/cross-document/collaborate/${newSessionId}`
        });

      case 'add_annotation':
        if (!sessionId || !annotation) {
          return NextResponse.json(
            { error: 'Session ID and annotation data are required' },
            { status: 400 }
          );
        }

        const annotationId = await enhancedCrossDocumentEngine.addAnnotation(
          sessionId,
          userId,
          annotation
        );

        return NextResponse.json({
          success: true,
          annotationId,
          message: 'Annotation added successfully'
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: create_session, add_annotation' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Collaboration error:', error);
    return NextResponse.json(
      {
        error: 'Collaboration action failed',
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
    const sessionId = searchParams.get('sessionId');

    if (sessionId) {
      // Get specific session details
      // For now, return placeholder
      return NextResponse.json({
        success: true,
        session: {
          id: sessionId,
          name: 'Sample Collaboration Session',
          participants: [
            {
              userId,
              userName: 'Current User',
              role: 'owner',
              joinedAt: new Date().toISOString(),
              lastActive: new Date().toISOString()
            }
          ],
          documents: [],
          annotations: [],
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        }
      });
    }

    // Return user's collaborative sessions
    return NextResponse.json({
      success: true,
      sessions: [], // In production, fetch from database
      message: 'Collaborative sessions for user'
    });

  } catch (error) {
    console.error('Get collaboration sessions error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get collaboration sessions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}