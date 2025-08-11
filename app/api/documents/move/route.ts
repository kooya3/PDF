import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { convex } from '@/lib/convex-client';
import { api } from '@/convex/api';

// POST - Move document(s) to folder
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { documentIds, folderId } = body;

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json({ 
        error: 'Document IDs array is required and must not be empty' 
      }, { status: 400 });
    }

    // Validate folder exists if specified
    if (folderId) {
      try {
        const folderPath = await convex.query(api.folders.getFolderPath, { 
          folderId, 
          userId 
        });
        if (!folderPath || folderPath.length === 0) {
          return NextResponse.json({ error: 'Target folder not found' }, { status: 404 });
        }
      } catch (error) {
        return NextResponse.json({ error: 'Target folder not found' }, { status: 404 });
      }
    }

    // Move each document
    const moveResults = [];
    const errors = [];

    for (const documentId of documentIds) {
      try {
        await convex.mutation(api.folders.moveDocumentToFolder, {
          documentId,
          userId,
          folderId: folderId || undefined
        });
        
        moveResults.push({ documentId, status: 'moved' });
      } catch (error) {
        console.error(`Error moving document ${documentId}:`, error);
        errors.push({ 
          documentId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return NextResponse.json({
      success: moveResults.length > 0,
      movedCount: moveResults.length,
      totalCount: documentIds.length,
      results: moveResults,
      errors: errors.length > 0 ? errors : undefined,
      targetFolder: folderId || 'root',
      message: `${moveResults.length} of ${documentIds.length} documents moved successfully`
    });

  } catch (error) {
    console.error('Error moving documents:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}