/**
 * OCR Service for extracting text from images and scanned PDFs
 * Supports multiple OCR engines with fallback options
 */

import { createWorker, Worker } from 'tesseract.js';
import sharp from 'sharp';

export interface OCRResult {
  text: string;
  confidence: number;
  wordCount: number;
  engine: string;
  processingTime: number;
  languages: string[];
  pages?: OCRPageResult[];
}

export interface OCRPageResult {
  pageNumber: number;
  text: string;
  confidence: number;
  boundingBoxes?: BoundingBox[];
}

export interface BoundingBox {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export interface OCROptions {
  language?: string;
  engine?: 'tesseract' | 'auto';
  enhanceImage?: boolean;
  preserveLayout?: boolean;
  dpi?: number;
}

class OCRService {
  private tesseractWorker: Worker | null = null;
  private isInitialized = false;

  /**
   * Initialize Tesseract.js worker
   */
  private async initializeTesseract(): Promise<void> {
    if (this.isInitialized && this.tesseractWorker) {
      return;
    }

    try {
      this.tesseractWorker = await createWorker({
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      await this.tesseractWorker.loadLanguage('eng');
      await this.tesseractWorker.initialize('eng');
      
      this.isInitialized = true;
      console.log('Tesseract.js initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Tesseract.js:', error);
      throw new Error('OCR engine initialization failed');
    }
  }

  /**
   * Extract text from image buffer using OCR
   */
  async extractTextFromImage(
    imageBuffer: Buffer,
    options: OCROptions = {}
  ): Promise<OCRResult> {
    const startTime = Date.now();
    const {
      language = 'eng',
      engine = 'tesseract',
      enhanceImage = true,
      preserveLayout = true,
      dpi = 300
    } = options;

    try {
      // Enhance image for better OCR results
      let processedBuffer = imageBuffer;
      if (enhanceImage) {
        processedBuffer = await this.enhanceImageForOCR(imageBuffer, dpi);
      }

      // Use Tesseract.js for OCR
      if (engine === 'tesseract' || engine === 'auto') {
        return await this.extractWithTesseract(
          processedBuffer,
          language,
          preserveLayout,
          startTime
        );
      }

      throw new Error(`Unsupported OCR engine: ${engine}`);
    } catch (error) {
      console.error('OCR extraction failed:', error);
      throw new Error(`OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from PDF using OCR (for scanned PDFs)
   */
  async extractTextFromPDF(
    pdfBuffer: Buffer,
    options: OCROptions = {}
  ): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      // For scanned PDFs, we need to convert PDF pages to images first
      // This is a simplified implementation - in production, you'd use pdf-poppler or pdf2pic
      const pdfImages = await this.convertPDFToImages(pdfBuffer);
      
      if (pdfImages.length === 0) {
        throw new Error('No images found in PDF or PDF conversion failed');
      }

      // Process each page
      const pageResults: OCRPageResult[] = [];
      let allText = '';
      let totalConfidence = 0;
      let totalWordCount = 0;

      for (let i = 0; i < pdfImages.length; i++) {
        const imageBuffer = pdfImages[i];
        const pageResult = await this.extractTextFromImage(imageBuffer, options);
        
        const pageOCR: OCRPageResult = {
          pageNumber: i + 1,
          text: pageResult.text,
          confidence: pageResult.confidence
        };
        
        pageResults.push(pageOCR);
        allText += `\n--- Page ${i + 1} ---\n${pageResult.text}\n`;
        totalConfidence += pageResult.confidence;
        totalWordCount += pageResult.wordCount;
      }

      const avgConfidence = pageResults.length > 0 ? totalConfidence / pageResults.length : 0;
      const processingTime = Date.now() - startTime;

      return {
        text: allText.trim(),
        confidence: avgConfidence,
        wordCount: totalWordCount,
        engine: options.engine || 'tesseract',
        processingTime,
        languages: [options.language || 'eng'],
        pages: pageResults
      };

    } catch (error) {
      console.error('PDF OCR extraction failed:', error);
      throw new Error(`PDF OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text using Tesseract.js
   */
  private async extractWithTesseract(
    imageBuffer: Buffer,
    language: string,
    preserveLayout: boolean,
    startTime: number
  ): Promise<OCRResult> {
    await this.initializeTesseract();
    
    if (!this.tesseractWorker) {
      throw new Error('Tesseract worker not initialized');
    }

    // Set language
    if (language !== 'eng') {
      try {
        await this.tesseractWorker.loadLanguage(language);
        await this.tesseractWorker.initialize(language);
      } catch (error) {
        console.warn(`Failed to load language ${language}, falling back to English`);
        language = 'eng';
      }
    }

    // Configure Tesseract parameters
    const tesseractOptions: any = {
      tessedit_pageseg_mode: preserveLayout ? '1' : '3', // 1 = automatic page segmentation with OSD, 3 = fully automatic
      tessedit_char_whitelist: '', // Allow all characters
      tessjs_create_hocr: '1',      // Generate hOCR output for layout info
      tessjs_create_tsv: '1'        // Generate TSV output for word-level data
    };

    // Perform OCR
    const result = await this.tesseractWorker.recognize(imageBuffer, {
      rectangle: undefined, // Process entire image
    });

    const processingTime = Date.now() - startTime;
    const wordCount = result.data.text.split(/\s+/).filter(word => word.length > 0).length;

    return {
      text: result.data.text.trim(),
      confidence: result.data.confidence,
      wordCount,
      engine: 'tesseract',
      processingTime,
      languages: [language]
    };
  }

  /**
   * Enhance image for better OCR results
   */
  private async enhanceImageForOCR(imageBuffer: Buffer, dpi: number): Promise<Buffer> {
    try {
      return await sharp(imageBuffer)
        .resize({ width: null, height: null, withoutEnlargement: false })
        .density(dpi)
        .grayscale() // Convert to grayscale
        .normalize() // Normalize contrast
        .sharpen() // Sharpen the image
        .png({ quality: 100, compressionLevel: 0 }) // High quality PNG
        .toBuffer();
    } catch (error) {
      console.warn('Image enhancement failed, using original:', error);
      return imageBuffer;
    }
  }

  /**
   * Convert PDF to images (simplified implementation)
   * In production, use libraries like pdf-poppler or pdf2pic
   */
  private async convertPDFToImages(pdfBuffer: Buffer): Promise<Buffer[]> {
    // This is a placeholder implementation
    // In a real application, you would use:
    // - pdf-poppler: Convert PDF to images using Poppler
    // - pdf2pic: Convert PDF pages to images
    // - pdf-lib: Extract images from PDF if they exist
    
    console.warn('PDF to image conversion not fully implemented. Use pdf-poppler or pdf2pic for production.');
    
    // For now, return empty array which will cause a fallback error
    // This allows the rest of the OCR system to work with direct image uploads
    return [];
  }

  /**
   * Detect if an image contains text (useful for filtering non-text images)
   */
  async detectTextInImage(imageBuffer: Buffer): Promise<boolean> {
    try {
      const result = await this.extractTextFromImage(imageBuffer, {
        enhanceImage: false // Skip enhancement for quick detection
      });
      
      // Consider image to contain text if:
      // 1. Confidence is above 30%
      // 2. Word count is above 5
      // 3. Text length is above 20 characters
      return result.confidence > 30 && 
             result.wordCount >= 5 && 
             result.text.length >= 20;
    } catch (error) {
      console.error('Text detection failed:', error);
      return false;
    }
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return [
      'eng', // English
      'spa', // Spanish
      'fra', // French
      'deu', // German
      'ita', // Italian
      'por', // Portuguese
      'rus', // Russian
      'ara', // Arabic
      'chi_sim', // Chinese Simplified
      'chi_tra', // Chinese Traditional
      'jpn', // Japanese
      'kor'  // Korean
    ];
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.tesseractWorker) {
      await this.tesseractWorker.terminate();
      this.tesseractWorker = null;
      this.isInitialized = false;
    }
  }
}

// Export singleton instance
export const ocrService = new OCRService();

// Cleanup on process exit
process.on('exit', () => {
  ocrService.cleanup();
});

process.on('SIGINT', async () => {
  await ocrService.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await ocrService.cleanup();
  process.exit(0);
});