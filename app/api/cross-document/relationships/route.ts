import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { crossDocumentAnalyzer } from '@/lib/cross-document-analyzer';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const minSimilarity = parseFloat(searchParams.get('minSimilarity') || '0.4');
    const maxRelationships = parseInt(searchParams.get('maxRelationships') || '50');

    const relationships = await crossDocumentAnalyzer.findDocumentRelationships(
      userId,
      {
        minSimilarity: Math.max(0, Math.min(1, minSimilarity)),
        maxRelationships: Math.min(maxRelationships, 100) // Cap at 100
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        relationships,
        totalFound: relationships.length
      }
    });

  } catch (error) {
    console.error('Document relationships error:', error);
    return NextResponse.json(
      {
        error: 'Failed to find document relationships',
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
      minSimilarity = 0.4,
      maxRelationships = 50
    } = body;

    // For POST, we can add additional processing or caching logic
    const relationships = await crossDocumentAnalyzer.findDocumentRelationships(
      userId,
      {
        minSimilarity: Math.max(0, Math.min(1, minSimilarity)),
        maxRelationships: Math.min(maxRelationships, 100)
      }
    );

    // Get additional stats
    const stats = await crossDocumentAnalyzer.getCrossDocumentStats(userId);

    return NextResponse.json({
      success: true,
      data: {
        relationships,
        stats,
        metadata: {
          generatedAt: new Date().toISOString(),
          parameters: {
            minSimilarity,
            maxRelationships
          }
        }
      }
    });

  } catch (error) {
    console.error('Document relationships error:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze document relationships',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}