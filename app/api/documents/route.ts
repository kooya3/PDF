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
    const status = searchParams.get('status'); // Optional filter by status
    const limit = parseInt(searchParams.get('limit') || '50');

    try {
      const documents = await convex.query(api.documents.getUserDocuments, { 
        userId 
      });

      // Apply filters if provided
      let filteredDocuments = documents;
      
      if (status) {
        filteredDocuments = documents.filter(doc => doc.status === status);
      }

      // Limit results
      filteredDocuments = filteredDocuments.slice(0, Math.min(limit, 100));

      // Transform to expected format
      const formattedDocuments = filteredDocuments.map(doc => ({
        id: doc.id || doc._id, // Use the custom document ID, fallback to Convex ID
        name: doc.name,
        status: doc.status,
        type: doc.type || 'unknown',
        wordCount: doc.wordCount || 0,
        createdAt: new Date(doc._creationTime).toISOString(),
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date(doc._creationTime).toISOString()
      }));

      return NextResponse.json({
        success: true,
        documents: formattedDocuments,
        total: documents.length,
        filtered: filteredDocuments.length
      });

    } catch (convexError) {
      console.error('Convex query error:', convexError);
      
      // Fallback: return empty documents array
      return NextResponse.json({
        success: true,
        documents: [],
        total: 0,
        filtered: 0,
        note: 'Documents service temporarily unavailable'
      });
    }

  } catch (error) {
    console.error('Documents API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve documents',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET single document by ID
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { documentId } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      );
    }

    try {
      const document = await convex.query(api.documents.getDocument, {
        docId: documentId,
        userId
      });

      if (!document) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }

      const formattedDocument = {
        id: document.id || document._id, // Use the custom document ID, fallback to Convex ID
        name: document.name,
        status: document.status,
        type: document.type || 'unknown',
        wordCount: document.wordCount || 0,
        createdAt: new Date(document._creationTime).toISOString(),
        updatedAt: document.updatedAt ? new Date(document.updatedAt).toISOString() : new Date(document._creationTime).toISOString()
      };

      return NextResponse.json({
        success: true,
        document: formattedDocument
      });

    } catch (convexError) {
      console.error('Convex document query error:', convexError);
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('Document fetch error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}