import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { documentStore } from '@/lib/memory-store';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all user documents from memory store
    const documents = documentStore.getUserDocuments(userId);
    
    // Return file list with preview data
    const fileList = documents.map(doc => ({
      id: doc.id,
      name: doc.name,
      originalName: doc.originalName,
      type: doc.type,
      size: doc.size,
      status: doc.status,
      progress: doc.progress,
      pages: doc.pages,
      wordCount: doc.wordCount,
      chunkCount: doc.chunkCount,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      messageCount: doc.messageCount,
      lastChatAt: doc.lastChatAt,
      textPreview: doc.textPreview,
      error: doc.error
    }));

    return NextResponse.json({
      success: true,
      files: fileList,
      count: fileList.length,
      stats: documentStore.getStats()
    });

  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch files',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}