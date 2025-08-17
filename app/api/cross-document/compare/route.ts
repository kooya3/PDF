import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { crossDocumentAnalyzer } from '@/lib/cross-document-analyzer';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { doc1Id, doc2Id } = body;

    if (!doc1Id || !doc2Id) {
      return NextResponse.json(
        { error: 'Both doc1Id and doc2Id are required' },
        { status: 400 }
      );
    }

    if (doc1Id === doc2Id) {
      return NextResponse.json(
        { error: 'Cannot compare a document with itself' },
        { status: 400 }
      );
    }

    const comparison = await crossDocumentAnalyzer.compareDocuments(
      doc1Id,
      doc2Id,
      userId
    );

    return NextResponse.json({
      success: true,
      data: comparison
    });

  } catch (error) {
    console.error('Document comparison error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'One or both documents not found' },
          { status: 404 }
        );
      }
      
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Unauthorized access to documents' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to compare documents',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}