import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { documentComparisonEngine } from '@/lib/document-comparison-engine';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      documentId, 
      newContent, 
      commitMessage 
    }: {
      documentId: string;
      newContent: string;
      commitMessage?: string;
    } = body;

    if (!documentId || !newContent) {
      return NextResponse.json(
        { error: 'documentId and newContent are required' },
        { status: 400 }
      );
    }

    console.log(`[VersionManagement] Creating new version for document ${documentId}`);

    // Create new document version
    const version = await documentComparisonEngine.createDocumentVersion(
      documentId,
      newContent,
      userId,
      commitMessage
    );

    return NextResponse.json({
      success: true,
      version: {
        id: version.id,
        documentId: version.documentId,
        version: version.version,
        name: version.name,
        createdAt: version.createdAt,
        commitMessage: version.commitMessage,
        changeCount: version.changes?.length || 0,
        significantChanges: version.changes?.filter(c => 
          c.significance === 'major' || c.significance === 'critical'
        ).length || 0
      }
    });

  } catch (error) {
    console.error('Version creation error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to create document version',
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
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId parameter is required' },
        { status: 400 }
      );
    }

    console.log(`[VersionManagement] Getting version history for document ${documentId}`);

    // Get version history
    const versions = await documentComparisonEngine.getVersionHistory(documentId, userId);

    return NextResponse.json({
      success: true,
      documentId,
      versions: versions.map(v => ({
        id: v.id,
        version: v.version,
        name: v.name,
        createdAt: v.createdAt,
        commitMessage: v.commitMessage,
        changeCount: v.changes?.length || 0
      })),
      totalVersions: versions.length
    });

  } catch (error) {
    console.error('Version history error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to get version history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}