import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { hybridDocumentStore } from '@/lib/hybrid-document-store';
import { convex } from '@/lib/convex-client';
import { api } from '@/convex/api';

const MAX_FILES = 10; // Maximum files per bulk upload
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const SUPPORTED_FORMATS = ['txt', 'md', 'csv', 'json', 'html'];

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user limits
    const userLimits = await convex.query(api.userSettings.checkUserLimits, { userId });
    if (userLimits.documents.exceeded) {
      return NextResponse.json({ 
        error: 'Document limit exceeded',
        current: userLimits.documents.current,
        limit: userLimits.documents.limit 
      }, { status: 429 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const folderId = formData.get('folderId') as string | null;
    const tags = formData.get('tags') ? JSON.parse(formData.get('tags') as string) : [];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json({ 
        error: `Too many files. Maximum ${MAX_FILES} files per batch` 
      }, { status: 400 });
    }

    // Validate folder exists if specified
    if (folderId) {
      const folder = await convex.query(api.folders.getFolderPath, { 
        folderId, 
        userId 
      });
      if (!folder) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
      }
    }

    // Validate files
    const validationErrors: string[] = [];
    const processedFiles: { file: File; docId: string; metadata: any }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (file.size > MAX_FILE_SIZE) {
        validationErrors.push(`File ${file.name}: exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
        continue;
      }

      const fileExtension = file.name.toLowerCase().split('.').pop();
      if (!fileExtension || !SUPPORTED_FORMATS.includes(fileExtension)) {
        validationErrors.push(`File ${file.name}: unsupported format (${fileExtension})`);
        continue;
      }

      // Create document metadata
      const docId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const metadata = {
        id: docId,
        userId,
        name: file.name,
        type: fileExtension,
        size: file.size,
        status: 'uploading' as const,
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        originalName: file.name,
        mimeType: file.type,
        messageCount: 0,
        folderId: folderId || undefined,
        tags: tags.length > 0 ? tags : undefined,
        version: 1
      };

      processedFiles.push({ file, docId, metadata });
    }

    if (validationErrors.length > 0 && processedFiles.length === 0) {
      return NextResponse.json({ 
        error: 'All files failed validation',
        validationErrors 
      }, { status: 400 });
    }

    // Store initial metadata for all files
    const uploadResults = [];
    for (const { docId, metadata } of processedFiles) {
      await hybridDocumentStore.setDocument(docId, metadata);
      uploadResults.push({
        docId,
        fileName: metadata.name,
        status: 'uploading',
        size: metadata.size
      });
    }

    // Process files asynchronously
    setTimeout(async () => {
      const processingPromises = processedFiles.map(async ({ file, docId, metadata }) => {
        try {
          await hybridDocumentStore.updateDocumentStatus(docId, 'parsing', 25);
          
          // Extract content
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const content = buffer.toString('utf-8');
          const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
          
          await hybridDocumentStore.updateDocumentStatus(docId, 'processing', 50);
          
          // Create chunks
          const chunks = chunkText(content);
          
          // Store content
          const documentContent = {
            id: docId,
            fullText: content,
            chunks: chunks,
            extractedData: {
              type: metadata.type,
              wordCount,
              fileName: file.name
            }
          };
          
          await hybridDocumentStore.setDocumentContent(docId, documentContent);
          await hybridDocumentStore.updateDocumentStatus(docId, 'generating', 75);
          
          // Complete processing
          const textPreview = content.length > 200 ? 
            content.substring(0, 200) + '...' : content;

          await hybridDocumentStore.updateDocumentStatus(docId, 'completed', 100, {
            wordCount,
            pages: Math.ceil(content.length / 3000),
            chunkCount: chunks.length,
            textPreview,
            embeddings: {
              model: 'simple-text',
              dimensions: 0,
              chunks: chunks.length
            }
          });

          console.log(`Bulk upload - Document processed: ${docId} - ${wordCount} words`);
          return { docId, status: 'completed', wordCount, chunks: chunks.length };
        } catch (error) {
          console.error(`Bulk upload - Error processing ${docId}:`, error);
          await hybridDocumentStore.updateDocumentStatus(docId, 'failed', 0, {
            error: error instanceof Error ? error.message : 'Processing failed'
          });
          return { docId, status: 'failed', error: String(error) };
        }
      });

      // Wait for all files to process
      const results = await Promise.allSettled(processingPromises);
      
      // Track bulk upload analytics
      try {
        await convex.mutation(api.analytics.trackEvent, {
          userId,
          eventType: 'bulk_upload',
          eventData: {
            totalFiles: files.length,
            successfulFiles: results.filter(r => r.status === 'fulfilled').length,
            failedFiles: results.filter(r => r.status === 'rejected').length,
            folderId,
            tags,
            totalSize: files.reduce((sum, f) => sum + f.size, 0)
          }
        });
      } catch (analyticsError) {
        console.error('Error tracking bulk upload analytics:', analyticsError);
      }
    }, 100);

    // Track analytics for bulk upload initiation
    try {
      await convex.mutation(api.analytics.trackEvent, {
        userId,
        eventType: 'bulk_upload',
        eventData: {
          filesCount: processedFiles.length,
          totalSize: processedFiles.reduce((sum, { file }) => sum + file.size, 0),
          folderId,
          tagsCount: tags.length,
          stage: 'initiated'
        }
      });
    } catch (analyticsError) {
      console.error('Error tracking bulk upload initiation:', analyticsError);
    }

    return NextResponse.json({
      success: true,
      uploadedFiles: uploadResults,
      validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
      folderId,
      tags,
      message: `${processedFiles.length} files uploaded successfully and processing in background`
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Simple text chunking function (copied from upload-document-simple)
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