import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { pineconeEmbeddingService } from '@/lib/pinecone-embeddings';
import { localEmbeddingFallback } from '@/lib/local-embedding-fallback';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { text, documentId, fileName } = await request.json();

    if (!text || !documentId || !fileName) {
      return NextResponse.json(
        { error: 'Missing required fields: text, documentId, fileName' },
        { status: 400 }
      );
    }

    // Try Pinecone first, fallback to local storage
    let result = await pineconeEmbeddingService.generateEmbeddings(
      text,
      documentId,
      userId,
      fileName
    );

    // If Pinecone fails, use local fallback
    if (!result.success) {
      console.log('Pinecone failed, using local fallback:', result.error);
      result = await localEmbeddingFallback.generateEmbeddings(
        text,
        documentId,
        userId,
        fileName
      );
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to generate embeddings' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      chunkCount: result.chunkCount,
      method: result.success && !result.error ? 'Pinecone vector database' : 'local text processing',
      message: `Successfully generated embeddings for ${result.chunkCount} chunks`
    });
  } catch (error) {
    console.error('Embedding API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { error: 'Missing documentId parameter' },
        { status: 400 }
      );
    }

    // Delete embeddings
    const success = await pineconeEmbeddingService.deleteDocumentEmbeddings(
      documentId,
      userId
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete embeddings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Embeddings deleted successfully'
    });
  } catch (error) {
    console.error('Delete embeddings API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}