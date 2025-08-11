import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ocrService } from '@/lib/ocr-service';

// GET - Get OCR service status and capabilities
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supportedLanguages = ocrService.getSupportedLanguages();
    
    // Test if OCR service is working (optional quick test)
    const { searchParams } = new URL(request.url);
    const testService = searchParams.get('test') === 'true';
    
    let serviceStatus = 'unknown';
    let testResult = null;
    
    if (testService) {
      try {
        // Create a simple test image with text (1x1 white pixel as minimal test)
        const testBuffer = Buffer.from([
          0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
          0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
          0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
          0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
          0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59, 0xE7, 0x00, 0x00, 0x00,
          0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ]);
        
        // This would normally fail with no text, but if service responds, it's working
        await ocrService.extractTextFromImage(testBuffer, { 
          language: 'eng',
          enhanceImage: false 
        });
        
        serviceStatus = 'healthy';
        testResult = { success: true, message: 'OCR service responding' };
      } catch (error) {
        serviceStatus = 'degraded';
        testResult = { 
          success: false, 
          error: error instanceof Error ? error.message : 'Test failed' 
        };
      }
    } else {
      serviceStatus = 'available';
    }

    return NextResponse.json({
      success: true,
      ocr: {
        status: serviceStatus,
        available: true,
        engines: ['tesseract'],
        supportedFormats: {
          images: ['jpg', 'jpeg', 'png', 'tiff', 'bmp', 'webp'],
          documents: ['pdf']
        },
        supportedLanguages: supportedLanguages.map(code => ({
          code,
          name: getLanguageName(code)
        })),
        features: {
          imageEnhancement: true,
          multiPagePDF: true,
          layoutPreservation: true,
          confidenceScoring: true,
          boundingBoxes: false // Not implemented in current version
        },
        limitations: {
          maxFileSize: '25MB',
          recommendedDPI: '200-300',
          bestResults: 'High contrast text, clear fonts, minimal noise'
        },
        testResult
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting OCR status:', error);
    return NextResponse.json({
      success: false,
      ocr: {
        status: 'error',
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
}

// Helper function to get human-readable language names
function getLanguageName(code: string): string {
  const languageMap: Record<string, string> = {
    'eng': 'English',
    'spa': 'Spanish',
    'fra': 'French', 
    'deu': 'German',
    'ita': 'Italian',
    'por': 'Portuguese',
    'rus': 'Russian',
    'ara': 'Arabic',
    'chi_sim': 'Chinese (Simplified)',
    'chi_tra': 'Chinese (Traditional)',
    'jpn': 'Japanese',
    'kor': 'Korean'
  };
  
  return languageMap[code] || code.toUpperCase();
}