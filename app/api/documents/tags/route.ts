import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { convex } from '@/lib/convex-client';
import { api } from '@/convex/api';

// GET - Search documents by tags
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tagsParam = searchParams.get('tags');
    const matchAll = searchParams.get('matchAll') === 'true';

    if (!tagsParam) {
      return NextResponse.json({ error: 'Tags parameter is required' }, { status: 400 });
    }

    const tags = tagsParam.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    
    if (tags.length === 0) {
      return NextResponse.json({ error: 'At least one tag is required' }, { status: 400 });
    }

    // Search documents by tags
    const documents = await convex.query(api.documents.getDocumentsByTags, {
      userId,
      tags,
      matchAll
    });

    return NextResponse.json({
      success: true,
      documents: documents.map(doc => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        size: doc.size,
        status: doc.status,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        tags: doc.tags,
        wordCount: doc.wordCount,
        messageCount: doc.messageCount,
        textPreview: doc.textPreview
      })),
      query: { tags, matchAll },
      totalResults: documents.length
    });

  } catch (error) {
    console.error('Error searching documents by tags:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Add tags to document
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { documentId, tags } = body;

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json({ error: 'Tags array is required and must not be empty' }, { status: 400 });
    }

    // Validate tags
    const validTags = tags
      .filter(tag => typeof tag === 'string' && tag.trim().length > 0)
      .map(tag => tag.trim().toLowerCase())
      .slice(0, 20); // Limit to 20 tags per document

    if (validTags.length === 0) {
      return NextResponse.json({ error: 'No valid tags provided' }, { status: 400 });
    }

    // Add tags to document
    await convex.mutation(api.documents.addDocumentTags, {
      docId: documentId,
      userId,
      tags: validTags
    });

    return NextResponse.json({
      success: true,
      documentId,
      addedTags: validTags,
      message: `${validTags.length} tags added successfully`
    });

  } catch (error) {
    console.error('Error adding tags to document:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE - Remove tags from document
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { documentId, tags } = body;

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json({ error: 'Tags array is required and must not be empty' }, { status: 400 });
    }

    // Validate tags
    const validTags = tags
      .filter(tag => typeof tag === 'string' && tag.trim().length > 0)
      .map(tag => tag.trim().toLowerCase());

    if (validTags.length === 0) {
      return NextResponse.json({ error: 'No valid tags provided' }, { status: 400 });
    }

    // Remove tags from document
    await convex.mutation(api.documents.removeDocumentTags, {
      docId: documentId,
      userId,
      tags: validTags
    });

    return NextResponse.json({
      success: true,
      documentId,
      removedTags: validTags,
      message: `${validTags.length} tags removed successfully`
    });

  } catch (error) {
    console.error('Error removing tags from document:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}