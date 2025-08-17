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
      limit = 10,
      minRelevanceScore = 0.3,
      excludeDocuments = [],
      includeDocuments = []
    } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    if (query.length > 500) {
      return NextResponse.json(
        { error: 'Query too long (max 500 characters)' },
        { status: 400 }
      );
    }

    const results = await crossDocumentAnalyzer.searchAcrossDocuments(
      query,
      userId,
      {
        limit: Math.min(limit, 50), // Cap at 50 for performance
        minRelevanceScore: Math.max(0, Math.min(1, minRelevanceScore)),
        excludeDocuments: Array.isArray(excludeDocuments) ? excludeDocuments : [],
        includeDocuments: Array.isArray(includeDocuments) ? includeDocuments : []
      }
    );

    return NextResponse.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Cross-document search error:', error);
    return NextResponse.json(
      {
        error: 'Failed to search across documents',
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
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    const limit = parseInt(searchParams.get('limit') || '10');
    const minRelevanceScore = parseFloat(searchParams.get('minRelevanceScore') || '0.3');

    const results = await crossDocumentAnalyzer.searchAcrossDocuments(
      query,
      userId,
      {
        limit: Math.min(limit, 50),
        minRelevanceScore: Math.max(0, Math.min(1, minRelevanceScore))
      }
    );

    return NextResponse.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Cross-document search error:', error);
    return NextResponse.json(
      {
        error: 'Failed to search across documents',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}