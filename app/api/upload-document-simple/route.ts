import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { hybridDocumentStore } from '@/lib/hybrid-document-store';
import { convex } from '@/lib/convex-client';
import { api } from '@/convex/api';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SUPPORTED_FORMATS = ['txt', 'md', 'csv', 'json', 'html'];

// Simple text content extraction
async function extractTextContent(buffer: Buffer, fileName: string): Promise<{content: string, wordCount: number}> {
  const fileExtension = fileName.toLowerCase().split('.').pop();
  
  try {
    switch (fileExtension) {
      case 'txt':
      case 'md':
      case 'csv':
      case 'html':
        const content = buffer.toString('utf-8');
        const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
        return { content, wordCount };
      
      case 'json':
        const jsonContent = JSON.parse(buffer.toString('utf-8'));
        const jsonString = JSON.stringify(jsonContent, null, 2);
        const jsonWordCount = jsonString.split(/\s+/).filter(word => word.length > 0).length;
        return { content: jsonString, wordCount: jsonWordCount };
      
      default:
        return { content: 'Unsupported file type for simple parsing', wordCount: 0 };
    }
  } catch (error) {
    console.error('Error extracting content:', error);
    return { content: `Error parsing ${fileExtension} file`, wordCount: 0 };
  }
}

// Enhanced intelligent text chunking
function chunkText(text: string, chunkSize: number = 800, overlap: number = 150) {
  const chunks = [];
  let index = 0;

  // First, split by paragraphs to maintain semantic boundaries
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  let currentChunk = '';
  let currentStart = 0;

  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed chunk size
    if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
      // Save current chunk
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
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText + '\n\n' + paragraph;
      currentStart += currentChunk.length - overlapText.length - paragraph.length - 2;
    } else {
      // Add paragraph to current chunk
      if (currentChunk.length > 0) {
        currentChunk += '\n\n' + paragraph;
      } else {
        currentChunk = paragraph;
        currentStart = text.indexOf(paragraph);
      }
    }
  }

  // Don't forget the last chunk
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

  // If we have very few chunks, try sentence-based chunking for better granularity
  if (chunks.length <= 2 && text.length > chunkSize) {
    return chunkBySentences(text, chunkSize, overlap);
  }

  return chunks;
}

// Fallback sentence-based chunking
function chunkBySentences(text: string, chunkSize: number = 800, overlap: number = 150) {
  const chunks = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  let currentChunk = '';
  let index = 0;
  let currentStart = 0;

  for (const sentence of sentences) {
    const sentenceWithPunc = sentence.trim() + '.';
    
    if (currentChunk.length + sentenceWithPunc.length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        index: index++,
        startChar: currentStart,
        endChar: currentStart + currentChunk.length,
        metadata: {
          sentenceCount: currentChunk.split(/[.!?]+/).length - 1,
          wordCount: currentChunk.split(/\s+/).filter(w => w.length > 0).length
        }
      });

      // Start new chunk with overlap
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText + ' ' + sentenceWithPunc;
      currentStart += currentChunk.length - overlapText.length - sentenceWithPunc.length - 1;
    } else {
      currentChunk += (currentChunk.length > 0 ? ' ' : '') + sentenceWithPunc;
      if (currentStart === 0) {
        currentStart = text.indexOf(sentence.trim());
      }
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      index: index++,
      startChar: currentStart,
      endChar: currentStart + currentChunk.length,
      metadata: {
        sentenceCount: currentChunk.split(/[.!?]+/).length - 1,
        wordCount: currentChunk.split(/\s+/).filter(w => w.length > 0).length
      }
    });
  }

  return chunks;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    // Get file extension
    const fileExtension = file.name.toLowerCase().split('.').pop();
    if (!fileExtension || !SUPPORTED_FORMATS.includes(fileExtension)) {
      return NextResponse.json(
        { 
          error: 'Unsupported file format',
          supportedFormats: SUPPORTED_FORMATS,
          note: 'This simplified endpoint supports basic text formats only'
        },
        { status: 400 }
      );
    }

    // Generate unique document ID
    const docId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`Processing ${fileExtension} document: ${file.name} (${file.size} bytes)`);

    // Create initial document metadata in memory store
    const documentMetadata = {
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
      messageCount: 0
    };

    // Store in hybrid store for real-time updates and persistence
    await hybridDocumentStore.setDocument(docId, documentMetadata);
    
    // Process document with real content extraction
    setTimeout(async () => {
      try {
        // Step 1: Parsing
        await hybridDocumentStore.updateDocumentStatus(docId, 'parsing', 25);
        
        // Get file buffer and extract content
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        const { content, wordCount } = await extractTextContent(buffer, file.name);
        
        await hybridDocumentStore.updateDocumentStatus(docId, 'processing', 50);
        
        // Create text chunks
        const chunks = chunkText(content);
        
        // Store document content in hybrid store
        const documentContent = {
          id: docId,
          fullText: content,
          chunks: chunks,
          extractedData: {
            type: fileExtension,
            wordCount,
            fileName: file.name
          }
        };
        
        await hybridDocumentStore.setDocumentContent(docId, documentContent);
        
        // Step 3: Generating embeddings (placeholder for now)
        await hybridDocumentStore.updateDocumentStatus(docId, 'generating', 75);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Step 4: Complete with real metadata
        const textPreview = content.length > 200 ? 
          content.substring(0, 200) + '...' : 
          content;

        await hybridDocumentStore.updateDocumentStatus(docId, 'completed', 100, {
          wordCount: wordCount,
          pages: Math.ceil(content.length / 3000), // Rough estimate
          chunkCount: chunks.length,
          textPreview,
          embeddings: {
            model: 'simple-text',
            dimensions: 0,
            chunks: chunks.length
          }
        });
        
        console.log(`Document processing completed: ${docId} - ${wordCount} words, ${chunks.length} chunks`);
        
        // Track analytics event
        try {
          await convex.mutation(api.analytics.trackEvent, {
            userId,
            eventType: 'document_upload',
            documentId: docId,
            eventData: {
              fileName: file.name,
              fileSize: file.size,
              fileType: fileExtension,
              wordCount,
              chunkCount: chunks.length,
              processingTime: Date.now() - documentMetadata.createdAt.getTime()
            }
          });
        } catch (analyticsError) {
          console.error('Error tracking analytics:', analyticsError);
        }
      } catch (error) {
        console.error(`Error processing document ${docId}:`, error);
        await hybridDocumentStore.updateDocumentStatus(docId, 'failed', 0, {
          error: error instanceof Error ? error.message : 'Processing failed'
        });
      }
    }, 100);

    return NextResponse.json({
      success: true,
      docId,
      documentType: fileExtension,
      fileName: file.name,
      fileSize: file.size,
      status: 'uploading',
      message: 'Document upload initiated - processing in background',
      note: 'Using simplified parser for basic text formats'
    });

  } catch (error) {
    console.error('Error processing document upload:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve user documents from memory store
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const docId = searchParams.get('docId');
    
    if (docId) {
      // Get specific document
      const document = await hybridDocumentStore.getDocument(docId, userId);
      if (!document) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
      
      // Ensure user owns the document
      if (document.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      
      return NextResponse.json({
        document,
        processingEvents: hybridDocumentStore.getProcessingEvents(docId, 5)
      });
    }
    
    // Get all user documents
    const documents = await hybridDocumentStore.getUserDocuments(userId);
    
    return NextResponse.json({ 
      documents,
      stats: hybridDocumentStore.getStats()
    });

  } catch (error) {
    console.error('Error in GET /api/upload-document-simple:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}