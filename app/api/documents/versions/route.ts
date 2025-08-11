import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { convex } from '@/lib/convex-client';
import { api } from '@/convex/api';
import { hybridDocumentStore } from '@/lib/hybrid-document-store';

// POST - Create a new version of a document
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const originalDocId = formData.get('originalDocId') as string;
    const file = formData.get('file') as File;
    const versionNotes = formData.get('versionNotes') as string;
    
    if (!originalDocId) {
      return NextResponse.json({ error: 'Original document ID is required' }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: 'New file version is required' }, { status: 400 });
    }

    // Validate file size and format
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const SUPPORTED_FORMATS = ['txt', 'md', 'csv', 'json', 'html'];
    
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`
      }, { status: 400 });
    }

    const fileExtension = file.name.toLowerCase().split('.').pop();
    if (!fileExtension || !SUPPORTED_FORMATS.includes(fileExtension)) {
      return NextResponse.json({
        error: 'Unsupported file format',
        supportedFormats: SUPPORTED_FORMATS
      }, { status: 400 });
    }

    // Get original document to verify ownership
    const originalDoc = await hybridDocumentStore.getDocument(originalDocId, userId);
    if (!originalDoc) {
      return NextResponse.json({ error: 'Original document not found' }, { status: 404 });
    }

    if (originalDoc.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized - you do not own this document' }, { status: 403 });
    }

    // Generate new version ID
    const newVersionId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_v`;
    
    // Process the new file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const content = buffer.toString('utf-8');
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;

    // Create chunks
    const chunks = chunkText(content);
    const textPreview = content.length > 200 ? content.substring(0, 200) + '...' : content;

    // Create new version document
    const newVersionMetadata = {
      id: newVersionId,
      userId,
      name: file.name,
      type: fileExtension,
      size: file.size,
      status: 'completed' as const,
      progress: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
      originalName: file.name,
      mimeType: file.type,
      messageCount: 0,
      parentDocumentId: originalDocId,
      versionNotes: versionNotes || undefined,
      wordCount,
      pages: Math.ceil(content.length / 3000),
      chunkCount: chunks.length,
      textPreview,
      embeddings: {
        model: 'simple-text',
        dimensions: 0,
        chunks: chunks.length
      },
      // Inherit organization from original
      folderId: originalDoc.folderId,
      tags: originalDoc.tags,
      version: await getNextVersionNumber(originalDocId),
      totalViews: 0
    };

    // Store the new version
    await hybridDocumentStore.setDocument(newVersionId, newVersionMetadata);
    
    // Store document content
    const documentContent = {
      id: newVersionId,
      fullText: content,
      chunks: chunks,
      extractedData: {
        type: fileExtension,
        wordCount,
        fileName: file.name,
        isVersion: true,
        originalDocId
      }
    };
    
    await hybridDocumentStore.setDocumentContent(newVersionId, documentContent);

    // Create version using Convex
    try {
      await convex.mutation(api.documents.createDocumentVersion, {
        originalDocId,
        userId,
        newDocumentData: {
          ...newVersionMetadata,
          createdAt: newVersionMetadata.createdAt.getTime(),
          updatedAt: newVersionMetadata.updatedAt.getTime(),
          lastChatAt: undefined,
          lastViewedAt: undefined,
          fullText: content,
          chunks: chunks
        },
        versionNotes
      });
    } catch (convexError) {
      console.error('Error creating version in Convex:', convexError);
    }

    return NextResponse.json({
      success: true,
      versionId: newVersionId,
      originalDocId,
      version: newVersionMetadata.version,
      fileName: file.name,
      fileSize: file.size,
      wordCount,
      chunkCount: chunks.length,
      versionNotes,
      createdAt: newVersionMetadata.createdAt.toISOString(),
      message: 'Document version created successfully'
    });

  } catch (error) {
    console.error('Error creating document version:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Get versions of a document
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const docId = searchParams.get('docId');

    if (!docId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    // Get document versions
    const versions = await convex.query(api.documents.getDocumentVersions, {
      docId,
      userId
    });

    return NextResponse.json({
      success: true,
      documentId: docId,
      versions: versions.sort((a, b) => a.version - b.version),
      totalVersions: versions.length
    });

  } catch (error) {
    console.error('Error fetching document versions:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to get the next version number
async function getNextVersionNumber(originalDocId: string): Promise<number> {
  try {
    // Get all existing versions from memory store
    const allDocs = Array.from((hybridDocumentStore as any).documentStore.documents.values());
    const versions = allDocs.filter((doc: any) => 
      doc.parentDocumentId === originalDocId || doc.id === originalDocId
    );
    
    const maxVersion = Math.max(
      1, // Original is version 1
      ...versions.map((doc: any) => doc.version || 1)
    );
    
    return maxVersion + 1;
  } catch (error) {
    console.error('Error getting next version number:', error);
    return 2; // Default to version 2 if there's an error
  }
}

// Simple text chunking function
function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200) {
  const chunks = [];
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  let currentChunk = '';
  let index = 0;
  let currentStart = 0;

  for (const paragraph of paragraphs) {
    const paragraphWithNewlines = paragraph.trim() + '\n\n';
    
    if (currentChunk.length + paragraphWithNewlines.length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        index: index++,
        startChar: currentStart,
        endChar: currentStart + currentChunk.length,
        metadata: {
          paragraphCount: currentChunk.split(/\n\s*\n/).length,
          wordCount: currentChunk.split(/\s+/).filter(w => w.length > 0).length
        }
      });
      
      // Start new chunk with overlap
      const overlapText = currentChunk.length > overlap ? 
        currentChunk.substring(currentChunk.length - overlap) : 
        currentChunk;
      currentStart = currentStart + currentChunk.length - overlapText.length;
      currentChunk = overlapText + paragraphWithNewlines;
    } else {
      currentChunk += paragraphWithNewlines;
    }
  }

  // Add the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      index: index++,
      startChar: currentStart,
      endChar: currentStart + currentChunk.length,
      metadata: {
        paragraphCount: currentChunk.split(/\n\s*\n/).length,
        wordCount: currentChunk.split(/\s+/).filter(w => w.length > 0).length
      }
    });
  }

  return chunks;
}