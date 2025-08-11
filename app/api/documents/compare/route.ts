import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { hybridDocumentStore } from '@/lib/hybrid-document-store';

// GET - Compare two document versions
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const docId1 = searchParams.get('docId1');
    const docId2 = searchParams.get('docId2');

    if (!docId1 || !docId2) {
      return NextResponse.json({ 
        error: 'Both docId1 and docId2 are required for comparison' 
      }, { status: 400 });
    }

    if (docId1 === docId2) {
      return NextResponse.json({ 
        error: 'Cannot compare document with itself' 
      }, { status: 400 });
    }

    // Get both documents with content
    const [doc1WithContent, doc2WithContent] = await Promise.all([
      hybridDocumentStore.getDocumentWithContent(docId1, userId),
      hybridDocumentStore.getDocumentWithContent(docId2, userId)
    ]);

    if (!doc1WithContent) {
      return NextResponse.json({ error: 'First document not found' }, { status: 404 });
    }

    if (!doc2WithContent) {
      return NextResponse.json({ error: 'Second document not found' }, { status: 404 });
    }

    // Verify user ownership
    if (doc1WithContent.metadata.userId !== userId || doc2WithContent.metadata.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized access to documents' }, { status: 403 });
    }

    // Check if documents are related (versions of same document)
    const areRelated = isRelatedDocuments(doc1WithContent.metadata, doc2WithContent.metadata);

    // Compare metadata
    const metadataComparison = compareMetadata(doc1WithContent.metadata, doc2WithContent.metadata);

    // Compare content
    const contentComparison = compareContent(
      doc1WithContent.content.fullText || '',
      doc2WithContent.content.fullText || ''
    );

    // Calculate similarity score
    const similarityScore = calculateSimilarity(contentComparison);

    return NextResponse.json({
      success: true,
      comparison: {
        documents: {
          document1: {
            id: doc1WithContent.metadata.id,
            name: doc1WithContent.metadata.name,
            version: doc1WithContent.metadata.version,
            createdAt: doc1WithContent.metadata.createdAt,
            size: doc1WithContent.metadata.size,
            wordCount: doc1WithContent.metadata.wordCount
          },
          document2: {
            id: doc2WithContent.metadata.id,
            name: doc2WithContent.metadata.name,
            version: doc2WithContent.metadata.version,
            createdAt: doc2WithContent.metadata.createdAt,
            size: doc2WithContent.metadata.size,
            wordCount: doc2WithContent.metadata.wordCount
          }
        },
        relationship: {
          areRelated,
          relationType: areRelated ? getRelationType(doc1WithContent.metadata, doc2WithContent.metadata) : 'unrelated'
        },
        metadata: metadataComparison,
        content: contentComparison,
        similarity: {
          score: similarityScore,
          level: getSimilarityLevel(similarityScore)
        }
      }
    });

  } catch (error) {
    console.error('Error comparing documents:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function isRelatedDocuments(doc1: any, doc2: any): boolean {
  return (
    doc1.id === doc2.parentDocumentId ||
    doc2.id === doc1.parentDocumentId ||
    (doc1.parentDocumentId && doc1.parentDocumentId === doc2.parentDocumentId)
  );
}

function getRelationType(doc1: any, doc2: any): string {
  if (doc1.id === doc2.parentDocumentId) return 'parent-child';
  if (doc2.id === doc1.parentDocumentId) return 'child-parent';
  if (doc1.parentDocumentId && doc1.parentDocumentId === doc2.parentDocumentId) return 'siblings';
  return 'unrelated';
}

function compareMetadata(doc1: any, doc2: any) {
  return {
    name: {
      doc1: doc1.name,
      doc2: doc2.name,
      changed: doc1.name !== doc2.name
    },
    size: {
      doc1: doc1.size,
      doc2: doc2.size,
      difference: doc2.size - doc1.size,
      percentChange: doc1.size > 0 ? Math.round(((doc2.size - doc1.size) / doc1.size) * 100) : 0
    },
    wordCount: {
      doc1: doc1.wordCount || 0,
      doc2: doc2.wordCount || 0,
      difference: (doc2.wordCount || 0) - (doc1.wordCount || 0),
      percentChange: (doc1.wordCount || 0) > 0 ? 
        Math.round((((doc2.wordCount || 0) - (doc1.wordCount || 0)) / (doc1.wordCount || 0)) * 100) : 0
    },
    chunkCount: {
      doc1: doc1.chunkCount || 0,
      doc2: doc2.chunkCount || 0,
      difference: (doc2.chunkCount || 0) - (doc1.chunkCount || 0)
    },
    tags: {
      doc1: doc1.tags || [],
      doc2: doc2.tags || [],
      added: (doc2.tags || []).filter((tag: string) => !(doc1.tags || []).includes(tag)),
      removed: (doc1.tags || []).filter((tag: string) => !(doc2.tags || []).includes(tag)),
      common: (doc1.tags || []).filter((tag: string) => (doc2.tags || []).includes(tag))
    },
    version: {
      doc1: doc1.version || 1,
      doc2: doc2.version || 1,
      isNewer: (doc2.version || 1) > (doc1.version || 1)
    }
  };
}

function compareContent(content1: string, content2: string) {
  const lines1 = content1.split('\n');
  const lines2 = content2.split('\n');
  
  // Simple line-by-line diff
  const maxLines = Math.max(lines1.length, lines2.length);
  const changes = [];
  let addedLines = 0;
  let removedLines = 0;
  let modifiedLines = 0;
  let unchangedLines = 0;

  for (let i = 0; i < maxLines; i++) {
    const line1 = lines1[i] || '';
    const line2 = lines2[i] || '';

    if (line1 === line2) {
      unchangedLines++;
    } else if (!line1 && line2) {
      addedLines++;
      changes.push({ type: 'added', lineNumber: i + 1, content: line2 });
    } else if (line1 && !line2) {
      removedLines++;
      changes.push({ type: 'removed', lineNumber: i + 1, content: line1 });
    } else {
      modifiedLines++;
      changes.push({ 
        type: 'modified', 
        lineNumber: i + 1, 
        oldContent: line1,
        newContent: line2 
      });
    }
  }

  // Character-level statistics
  const charDiff = content2.length - content1.length;
  const wordDiff = content2.split(/\s+/).length - content1.split(/\s+/).length;

  return {
    statistics: {
      totalLines1: lines1.length,
      totalLines2: lines2.length,
      unchangedLines,
      addedLines,
      removedLines,
      modifiedLines,
      totalChanges: addedLines + removedLines + modifiedLines,
      characterDifference: charDiff,
      wordDifference: wordDiff
    },
    changes: changes.slice(0, 100) // Limit to first 100 changes for performance
  };
}

function calculateSimilarity(contentComparison: any): number {
  const { statistics } = contentComparison;
  const totalLines = Math.max(statistics.totalLines1, statistics.totalLines2);
  
  if (totalLines === 0) return 100; // Both empty
  
  const similarity = (statistics.unchangedLines / totalLines) * 100;
  return Math.round(similarity * 100) / 100; // Round to 2 decimal places
}

function getSimilarityLevel(score: number): string {
  if (score >= 95) return 'identical';
  if (score >= 80) return 'very-similar';
  if (score >= 60) return 'similar';
  if (score >= 40) return 'somewhat-similar';
  if (score >= 20) return 'different';
  return 'very-different';
}