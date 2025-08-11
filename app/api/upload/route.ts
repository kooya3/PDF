import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Basic file validation
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    const allowedTypes = ['application/pdf', 'text/plain', 'application/msword'];
    if (file.type && !allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a PDF, text, or Word document.' },
        { status: 400 }
      );
    }

    // Generate a unique file ID
    const fileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`Processing file: ${file.name} (${file.size} bytes)`);

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    return NextResponse.json({
      success: true,
      file: {
        id: fileId,
        originalName: file.name,
        size: file.size,
        pages: Math.ceil(file.size / 2000), // Rough estimate
        uploadedAt: new Date().toISOString(),
        textPreview: `This is a preview of ${file.name}. The document has been processed successfully in demo mode.`,
        metadata: {
          title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
          author: "Unknown",
          subject: "Uploaded Document"
        }
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process file upload' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Upload API is working',
    timestamp: new Date().toISOString()
  });
}