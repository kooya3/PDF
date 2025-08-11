import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ocrService } from '@/lib/ocr-service';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB for text detection
const SUPPORTED_FORMATS = ['jpg', 'jpeg', 'png', 'tiff', 'bmp', 'webp'];

// POST - Detect if an image contains readable text
export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json({
        error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit for text detection`
      }, { status: 400 });
    }

    // Validate file format
    const fileExtension = file.name.toLowerCase().split('.').pop();
    if (!fileExtension || !SUPPORTED_FORMATS.includes(fileExtension)) {
      return NextResponse.json({
        error: 'Unsupported file format for text detection',
        supportedFormats: SUPPORTED_FORMATS
      }, { status: 400 });
    }

    // Get file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Perform text detection
    const startTime = Date.now();
    const hasText = await ocrService.detectTextInImage(buffer);
    const processingTime = Date.now() - startTime;

    // If text is detected, get a quick preview
    let textPreview = null;
    let confidence = 0;
    let wordCount = 0;

    if (hasText) {
      try {
        const quickOCR = await ocrService.extractTextFromImage(buffer, {
          language: 'eng',
          enhanceImage: false // Quick detection, no enhancement
        });
        
        textPreview = quickOCR.text.substring(0, 200);
        if (quickOCR.text.length > 200) textPreview += '...';
        
        confidence = quickOCR.confidence;
        wordCount = quickOCR.wordCount;
      } catch (error) {
        console.warn('Error getting text preview:', error);
      }
    }

    return NextResponse.json({
      success: true,
      textDetection: {
        hasText,
        confidence: hasText ? confidence : 0,
        wordCount: hasText ? wordCount : 0,
        processingTime,
        file: {
          name: file.name,
          size: file.size,
          type: fileExtension
        }
      },
      textPreview: hasText ? textPreview : null,
      recommendation: hasText ? {
        suitable: true,
        message: 'Image contains readable text and is suitable for OCR processing',
        suggestedLanguage: 'eng', // Could be enhanced with language detection
        suggestedSettings: {
          enhanceImage: confidence < 70,
          preserveLayout: wordCount > 50
        }
      } : {
        suitable: false,
        message: 'Image may not contain readable text or quality is too low for OCR',
        suggestions: [
          'Ensure image has clear, high-contrast text',
          'Check that image resolution is adequate (minimum 150 DPI)',
          'Avoid images with complex backgrounds or handwritten text',
          'Consider image enhancement if text is faint or blurry'
        ]
      }
    });

  } catch (error) {
    console.error('Error in text detection:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}