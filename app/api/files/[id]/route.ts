import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { hybridDocumentStore } from '@/lib/hybrid-document-store';
import { convex } from '@/lib/convex-client';
import { api } from '@/convex/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // Get document with content from hybrid store
    const documentWithContent = await hybridDocumentStore.getDocumentWithContent(id, userId);
    
    if (!documentWithContent) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Verify user ownership
    if (documentWithContent.metadata.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized - you do not own this file' },
        { status: 403 }
      );
    }

    // Track document view analytics
    try {
      await convex.mutation(api.analytics.trackEvent, {
        userId,
        eventType: 'document_view',
        documentId: id,
        eventData: {
          documentName: documentWithContent.metadata.name,
          viewType: request.nextUrl.searchParams.get('includeContent') === 'true' ? 'full' : 'metadata',
          documentType: documentWithContent.metadata.type
        }
      });
    } catch (analyticsError) {
      console.error('Error tracking document view:', analyticsError);
    }

    return NextResponse.json({
      success: true,
      file: {
        id: documentWithContent.metadata.id,
        name: documentWithContent.metadata.name,
        originalName: documentWithContent.metadata.originalName,
        type: documentWithContent.metadata.type,
        size: documentWithContent.metadata.size,
        status: documentWithContent.metadata.status,
        progress: documentWithContent.metadata.progress,
        pages: documentWithContent.metadata.pages,
        wordCount: documentWithContent.metadata.wordCount,
        chunkCount: documentWithContent.metadata.chunkCount,
        createdAt: documentWithContent.metadata.createdAt,
        updatedAt: documentWithContent.metadata.updatedAt,
        messageCount: documentWithContent.metadata.messageCount,
        lastChatAt: documentWithContent.metadata.lastChatAt,
        textPreview: documentWithContent.metadata.textPreview,
        // Only include full content if specifically requested
        fullContent: request.nextUrl.searchParams.get('includeContent') === 'true' 
          ? documentWithContent.content.fullText 
          : undefined,
        chunks: request.nextUrl.searchParams.get('includeChunks') === 'true'
          ? documentWithContent.content.chunks
          : undefined
      }
    });

  } catch (error) {
    console.error('Error fetching file:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch file',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}