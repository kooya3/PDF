import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { crossDocumentAnalyzer } from '@/lib/cross-document-analyzer';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await crossDocumentAnalyzer.getCrossDocumentStats(userId);

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Cross-document stats error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get cross-document statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}