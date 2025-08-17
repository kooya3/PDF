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
    const {
      query,
      maxSources = 8,
      includeConflicts = true,
      minConfidence = 0.3
    } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    if (query.length > 1000) {
      return NextResponse.json(
        { error: 'Query too long (max 1000 characters)' },
        { status: 400 }
      );
    }

    const result = await crossDocumentAnalyzer.queryUnifiedKnowledgeBase(
      query,
      userId,
      {
        maxSources: Math.min(maxSources, 20), // Cap at 20 for performance
        includeConflicts: Boolean(includeConflicts),
        minConfidence: Math.max(0, Math.min(1, minConfidence))
      }
    );

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Unified knowledge base query error:', error);
    return NextResponse.json(
      {
        error: 'Failed to query unified knowledge base',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}