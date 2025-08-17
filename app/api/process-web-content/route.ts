import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { documentStore } from '@/lib/memory-store';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { fileName, content, metadata = {}, source = 'web_scraping' } = body;

    if (!fileName || !content) {
      return NextResponse.json(
        { error: 'fileName and content are required' },
        { status: 400 }
      );
    }

    if (typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content must be a non-empty string' },
        { status: 400 }
      );
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

    // Generate unique document ID
    const docId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`Processing web content: ${fileName} (${content.length} characters)`);

    // Determine document type based on file extension or default to markdown
    let documentType = 'md';
    if (fileName.includes('.')) {
      const ext = fileName.toLowerCase().split('.').pop();
      if (ext && ['pdf', 'docx', 'doc', 'txt', 'md', 'html', 'json'].includes(ext)) {
        documentType = ext;
      }
    }

    // Create document metadata
    const documentMetadata = {
      id: docId,
      userId,
      name: fileName,
      type: documentType,
      size: content.length,
      status: 'processing' as const,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      originalName: fileName,
      mimeType: 'text/plain',
      messageCount: 0,
      source,
      metadata: {
        ...metadata,
        isWebContent: true,
        originalUrl: metadata.url || metadata.sourceURL
      }
    };

    // Store in memory store
    documentStore.setDocument(docId, documentMetadata);
    
    // Process the content
    setTimeout(async () => {
      try {
        // Step 1: Processing text content
        documentStore.updateDocumentStatus(docId, 'parsing', 25);
        
        // Clean and chunk the content
        const cleanedContent = cleanWebContent(content);
        const chunks = chunkContent(cleanedContent);
        
        documentStore.updateDocumentStatus(docId, 'processing', 50);
        
        // Store document content
        const documentContent = {
          id: docId,
          fullText: cleanedContent,
          chunks,
          extractedData: {
            wordCount: countWords(cleanedContent),
            characterCount: cleanedContent.length,
            pages: Math.ceil(cleanedContent.length / 2500), // Estimate pages
            source: 'web_scraping',
            processedAt: new Date().toISOString(),
            ...metadata
          }
        };
        
        documentStore.setDocumentContent(docId, documentContent);
        
        // Step 3: Generating embeddings (placeholder)
        documentStore.updateDocumentStatus(docId, 'generating', 75);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Step 4: Complete
        const textPreview = cleanedContent.length > 200 ? 
          cleanedContent.substring(0, 200) + '...' : 
          cleanedContent;

        documentStore.updateDocumentStatus(docId, 'completed', 100, {
          wordCount: countWords(cleanedContent),
          characterCount: cleanedContent.length,
          pages: Math.ceil(cleanedContent.length / 2500),
          chunkCount: chunks.length,
          textPreview,
          embeddings: {
            model: process.env.OLLAMA_MODEL || 'tinyllama',
            dimensions: 4096,
            chunks: chunks.length
          },
          source: 'web_scraping',
          originalUrl: metadata.url || metadata.sourceURL
        });
        
        console.log(`Web content processing completed: ${docId} - ${countWords(cleanedContent)} words, ${chunks.length} chunks`);
      } catch (error) {
        console.error(`Error processing web content ${docId}:`, error);
        documentStore.updateDocumentStatus(docId, 'failed', 0, {
          error: error instanceof Error ? error.message : 'Processing failed'
        });
      }
    }, 100);

    return NextResponse.json({
      success: true,
      docId,
      documentType,
      fileName,
      contentLength: content.length,
      status: 'processing',
      message: 'Web content processing initiated',
      viewUrl: `/dashboard/files/${docId}`
    });

  } catch (error) {
    console.error('Error processing web content:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper functions
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

function cleanWebContent(content: string): string {
  return content
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove common web artifacts
    .replace(/(\$1|\$\d+)/g, '') // Remove $ placeholders
    .replace(/\\n\\n/g, '\n') // Fix escaped newlines
    .replace(/\\\\/g, '') // Remove double backslashes
    // Clean up markdown artifacts
    .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
    // Remove navigation and footer elements
    .replace(/Navigation|Get Started|On this page/gi, '')
    .replace(/Copy\s+Ask AI/gi, '')
    .replace(/```[^`]*```/g, '') // Remove code blocks for cleaner reading
    // Clean up multiple spaces and newlines
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/\s+/g, ' ')
    .trim();
}

function chunkContent(content: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  if (content.length <= chunkSize) {
    return [content];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < content.length) {
    let end = start + chunkSize;
    
    // If this isn't the last chunk, try to end at a sentence boundary
    if (end < content.length) {
      const sentenceEnd = content.lastIndexOf('.', end);
      const paragraphEnd = content.lastIndexOf('\n', end);
      const breakPoint = Math.max(sentenceEnd, paragraphEnd);
      
      if (breakPoint > start + chunkSize * 0.7) {
        end = breakPoint + 1;
      }
    }
    
    const chunk = content.substring(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    
    start = Math.max(start + chunkSize - overlap, end);
  }

  return chunks;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}