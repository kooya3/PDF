import { NextRequest, NextResponse } from 'next/server';
import { DocumentParser } from '@/lib/document-parser';

export async function POST(request: NextRequest) {
  try {
    console.log('Test upload endpoint hit');
    
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('File received:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Test document parsing
    try {
      const parsedDocument = await DocumentParser.parseDocument(file, file.name, {
        enableChunking: true,
        chunkSize: 1000,
        chunkOverlap: 200,
        extractMetadata: true,
      });

      console.log('Document parsed successfully:', {
        type: parsedDocument.metadata.type,
        wordCount: parsedDocument.metadata.wordCount,
        chunkCount: parsedDocument.chunks?.length || 0
      });

      return NextResponse.json({
        success: true,
        file: {
          name: file.name,
          type: file.type,
          size: file.size,
        },
        parsed: {
          documentType: parsedDocument.metadata.type,
          wordCount: parsedDocument.metadata.wordCount,
          chunkCount: parsedDocument.chunks?.length || 0,
          contentPreview: parsedDocument.content.substring(0, 200) + '...',
        }
      });

    } catch (parseError) {
      console.error('Parse error:', parseError);
      return NextResponse.json({ 
        error: 'Failed to parse document',
        details: parseError instanceof Error ? parseError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Test upload error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Test upload endpoint is working',
    timestamp: new Date().toISOString() 
  });
}