import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { documentComparisonEngine } from '@/lib/document-comparison-engine';
import type { ComparisonType } from '@/lib/document-comparison-engine';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sourceDocumentId, targetDocumentId, comparisonType = 'comprehensive', options = {} } = body;

    // Validate required parameters
    if (!sourceDocumentId || !targetDocumentId) {
      return NextResponse.json(
        { error: 'Both sourceDocumentId and targetDocumentId are required' },
        { status: 400 }
      );
    }

    if (sourceDocumentId === targetDocumentId) {
      return NextResponse.json(
        { error: 'Cannot compare a document with itself' },
        { status: 400 }
      );
    }

    // Validate comparison type
    const validTypes: ComparisonType[] = ['semantic', 'structural', 'textual', 'comprehensive'];
    if (!validTypes.includes(comparisonType)) {
      return NextResponse.json(
        { error: 'Invalid comparison type. Must be one of: semantic, structural, textual, comprehensive' },
        { status: 400 }
      );
    }

    // Perform comparison
    const comparison = await documentComparisonEngine.compareDocuments(
      sourceDocumentId,
      targetDocumentId,
      comparisonType,
      { ...options, userId }
    );

    return NextResponse.json({
      success: true,
      data: comparison,
      message: 'Document comparison completed successfully'
    });

  } catch (error) {
    console.error('Document comparison API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to compare documents',
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
    const comparisonId = searchParams.get('id');
    const action = searchParams.get('action') || 'list';

    switch (action) {
      case 'get':
        if (!comparisonId) {
          return NextResponse.json(
            { error: 'Comparison ID is required for get action' },
            { status: 400 }
          );
        }

        const comparison = documentComparisonEngine.getComparison(comparisonId);
        if (!comparison) {
          return NextResponse.json(
            { error: 'Comparison not found' },
            { status: 404 }
          );
        }

        if (comparison.userId !== userId) {
          return NextResponse.json(
            { error: 'Unauthorized to access this comparison' },
            { status: 403 }
          );
        }

        return NextResponse.json({
          success: true,
          data: comparison
        });

      case 'list':
      default:
        const userComparisons = documentComparisonEngine.getUserComparisons(userId);
        
        return NextResponse.json({
          success: true,
          data: {
            comparisons: userComparisons,
            total: userComparisons.length,
            userId
          }
        });
    }

  } catch (error) {
    console.error('Document comparison GET API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve comparison data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const comparisonId = searchParams.get('id');

    if (!comparisonId) {
      return NextResponse.json(
        { error: 'Comparison ID is required' },
        { status: 400 }
      );
    }

    // Check if comparison exists and user owns it
    const comparison = documentComparisonEngine.getComparison(comparisonId);
    if (!comparison) {
      return NextResponse.json(
        { error: 'Comparison not found' },
        { status: 404 }
      );
    }

    if (comparison.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this comparison' },
        { status: 403 }
      );
    }

    // Delete comparison
    const deleted = documentComparisonEngine.deleteComparison(comparisonId);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete comparison' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Comparison deleted successfully',
      comparisonId
    });

  } catch (error) {
    console.error('Document comparison DELETE API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete comparison',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}