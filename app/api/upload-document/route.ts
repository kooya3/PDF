import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { documentStore } from '@/lib/memory-store';
import { DocumentParser } from '@/lib/document-parser';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SUPPORTED_FORMATS = ['pdf', 'docx', 'doc', 'txt', 'md', 'csv', 'xlsx', 'html', 'json'];

// Simplified system health check
async function checkBasicSystemHealth() {
  try {
    const [ollamaResponse, chromaResponse] = await Promise.all([
      fetch('http://localhost:11434/api/version').catch(() => null),
      fetch('http://localhost:8000/api/v1/heartbeat').catch(() => null)
    ]);
    
    return {
      ollama: { available: !!ollamaResponse },
      vectorStore: { available: !!chromaResponse }
    };
  } catch (error) {
    return {
      ollama: { available: false },
      vectorStore: { available: false }
    };
  }
}

// Simple file type detection
function detectFileType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop() || '';
  return SUPPORTED_FORMATS.includes(ext) ? ext : 'unknown';
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check system health before processing
    const systemHealth = await checkBasicSystemHealth();
    if (!systemHealth.ollama.available) {
      return NextResponse.json(
        { 
          error: 'Ollama service unavailable', 
          details: 'Please ensure Ollama is running on localhost:11434'
        },
        { status: 503 }
      );
    }

    if (!systemHealth.vectorStore.available) {
      return NextResponse.json(
        { 
          error: 'Vector store unavailable', 
          details: 'Please ensure ChromaDB is running on localhost:8000'
        },
        { status: 503 }
      );
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

    // Validate file type
    const documentType = detectFileType(file.name);
    if (documentType === 'unknown') {
      return NextResponse.json(
        { 
          error: 'Unsupported file format',
          supportedFormats: SUPPORTED_FORMATS 
        },
        { status: 400 }
      );
    }

    // Generate unique document ID
    const docId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`Processing ${documentType} document: ${file.name} (${file.size} bytes)`);

    // Create initial document metadata in memory store
    const documentMetadata = {
      id: docId,
      userId,
      name: file.name,
      type: documentType,
      size: file.size,
      status: 'uploading' as const,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      originalName: file.name,
      mimeType: file.type,
      messageCount: 0
    };

    // Store in memory store for real-time updates
    documentStore.setDocument(docId, documentMetadata);
    
    // Process document with real content extraction
    setTimeout(async () => {
      try {
        // Step 1: Parsing
        documentStore.updateDocumentStatus(docId, 'parsing', 25);
        
        // Get file buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Parse document content
        const parser = new DocumentParser();
        const parsedDoc = await parser.parseDocument(buffer, file.name);
        
        documentStore.updateDocumentStatus(docId, 'processing', 50);
        
        // Store document content in memory store
        const documentContent = {
          id: docId,
          fullText: parsedDoc.content,
          chunks: parsedDoc.chunks || [],
          extractedData: parsedDoc.metadata
        };
        
        documentStore.setDocumentContent(docId, documentContent);
        
        // Step 3: Generating embeddings (placeholder for now)
        documentStore.updateDocumentStatus(docId, 'generating', 75);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Step 4: Complete with real metadata
        const textPreview = parsedDoc.content.length > 200 ? 
          parsedDoc.content.substring(0, 200) + '...' : 
          parsedDoc.content;

        documentStore.updateDocumentStatus(docId, 'completed', 100, {
          wordCount: parsedDoc.metadata.wordCount,
          pages: parsedDoc.metadata.pages,
          chunkCount: parsedDoc.chunks?.length || 0,
          textPreview,
          embeddings: {
            model: 'llama3.2',
            dimensions: 4096,
            chunks: parsedDoc.chunks?.length || 0
          }
        });
        
        console.log(`Document processing completed: ${docId} - ${parsedDoc.metadata.wordCount} words, ${parsedDoc.chunks?.length || 0} chunks`);
      } catch (error) {
        console.error(`Error processing document ${docId}:`, error);
        documentStore.updateDocumentStatus(docId, 'failed', 0, {
          error: error instanceof Error ? error.message : 'Processing failed'
        });
      }
    }, 100);

    return NextResponse.json({
      success: true,
      docId,
      documentType,
      fileName: file.name,
      fileSize: file.size,
      status: 'uploading',
      message: 'Document upload initiated - processing in background'
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
      const document = documentStore.getDocument(docId);
      if (!document) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
      
      // Ensure user owns the document
      if (document.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      
      return NextResponse.json({
        document,
        processingEvents: documentStore.getProcessingEvents(docId, 5)
      });
    }
    
    // Get all user documents
    const documents = documentStore.getUserDocuments(userId);
    const systemHealth = await checkBasicSystemHealth();
    
    return NextResponse.json({ 
      documents,
      systemHealth,
      stats: documentStore.getStats()
    });

  } catch (error) {
    console.error('Error in GET /api/upload-document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove documents
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const docId = searchParams.get('docId');
    
    if (!docId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }
    
    // Check if document exists and user owns it
    const document = documentStore.getDocument(docId);
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    if (document.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Delete from memory store
    const deleted = documentStore.deleteDocument(docId);
    
    if (deleted) {
      return NextResponse.json({ success: true, message: 'Document deleted' });
    } else {
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in DELETE /api/upload-document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}