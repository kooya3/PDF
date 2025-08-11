import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { hybridDocumentStore } from '@/lib/hybrid-document-store';
import { ocrService } from '@/lib/ocr-service';
import { convex } from '@/lib/convex-client';
import { api } from '@/convex/api';
import pdf2pic from 'pdf2pic';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB for images/PDFs
const SUPPORTED_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'tiff', 'bmp', 'webp'];
const SUPPORTED_PDF_FORMATS = ['pdf'];
const ALL_SUPPORTED_FORMATS = [...SUPPORTED_IMAGE_FORMATS, ...SUPPORTED_PDF_FORMATS];

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const language = formData.get('language') as string || 'eng';
    const enhanceImage = formData.get('enhanceImage') === 'true';
    const folderId = formData.get('folderId') as string | null;
    const tags = formData.get('tags') ? JSON.parse(formData.get('tags') as string) : [];

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit for OCR processing`
      }, { status: 400 });
    }

    // Get file extension
    const fileExtension = file.name.toLowerCase().split('.').pop();
    if (!fileExtension || !ALL_SUPPORTED_FORMATS.includes(fileExtension)) {
      return NextResponse.json({
        error: 'Unsupported file format for OCR',
        supportedFormats: ALL_SUPPORTED_FORMATS,
        note: 'This endpoint supports images and scanned PDFs only'
      }, { status: 400 });
    }

    // Validate language
    const supportedLanguages = ocrService.getSupportedLanguages();
    if (!supportedLanguages.includes(language)) {
      return NextResponse.json({
        error: 'Unsupported language',
        providedLanguage: language,
        supportedLanguages
      }, { status: 400 });
    }

    // Generate unique document ID
    const docId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_ocr`;
    
    console.log(`Processing ${fileExtension} document with OCR: ${file.name} (${file.size} bytes)`);

    // Create initial document metadata
    const documentMetadata = {
      id: docId,
      userId,
      name: `${file.name} (OCR)`,
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
      version: 1,
      totalViews: 0
    };

    // Store in hybrid store for real-time updates
    await hybridDocumentStore.setDocument(docId, documentMetadata);

    // Process document with OCR asynchronously
    setTimeout(async () => {
      try {
        // Step 1: Parsing/OCR Recognition
        await hybridDocumentStore.updateDocumentStatus(docId, 'parsing', 20);
        
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        let ocrResult;
        const isImage = SUPPORTED_IMAGE_FORMATS.includes(fileExtension);
        const isPDF = SUPPORTED_PDF_FORMATS.includes(fileExtension);

        if (isImage) {
          // Direct image OCR
          ocrResult = await ocrService.extractTextFromImage(buffer, {
            language,
            enhanceImage,
            preserveLayout: true
          });
        } else if (isPDF) {
          // PDF OCR (convert to images first)
          ocrResult = await extractTextFromPDFWithOCR(buffer, {
            language,
            enhanceImage
          });
        } else {
          throw new Error(`Unsupported file format: ${fileExtension}`);
        }

        await hybridDocumentStore.updateDocumentStatus(docId, 'processing', 60);

        // Step 2: Process OCR results
        const { text, confidence, wordCount, pages } = ocrResult;
        
        if (confidence < 30) {
          console.warn(`Low OCR confidence (${confidence}%) for document ${docId}`);
        }

        if (wordCount < 5) {
          console.warn(`Very few words extracted (${wordCount}) from document ${docId}`);
        }

        // Create text chunks from OCR text
        const chunks = chunkText(text);
        
        // Store document content
        const documentContent = {
          id: docId,
          fullText: text,
          chunks: chunks,
          extractedData: {
            type: fileExtension,
            wordCount,
            fileName: file.name,
            ocrData: {
              engine: ocrResult.engine,
              confidence,
              language,
              processingTime: ocrResult.processingTime,
              pages: pages?.length || 1,
              enhancedImage: enhanceImage
            }
          }
        };
        
        await hybridDocumentStore.setDocumentContent(docId, documentContent);
        
        await hybridDocumentStore.updateDocumentStatus(docId, 'generating', 80);

        // Step 3: Complete with OCR metadata
        const textPreview = text.length > 300 ? 
          text.substring(0, 300) + '...' : text;

        const pages_count = pages?.length || Math.ceil(text.length / 3000);

        await hybridDocumentStore.updateDocumentStatus(docId, 'completed', 100, {
          wordCount,
          pages: pages_count,
          chunkCount: chunks.length,
          textPreview,
          embeddings: {
            model: 'ocr-extracted',
            dimensions: 0,
            chunks: chunks.length
          },
          ocrMetadata: {
            confidence,
            language,
            engine: ocrResult.engine,
            processingTime: ocrResult.processingTime,
            enhancedImage
          }
        });
        
        console.log(`OCR processing completed: ${docId} - ${wordCount} words, confidence: ${confidence}%`);

        // Track analytics
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
              processingTime: ocrResult.processingTime,
              ocrConfidence: confidence,
              ocrLanguage: language,
              isOCR: true
            }
          });
        } catch (analyticsError) {
          console.error('Error tracking OCR analytics:', analyticsError);
        }

      } catch (error) {
        console.error(`Error processing OCR document ${docId}:`, error);
        await hybridDocumentStore.updateDocumentStatus(docId, 'failed', 0, {
          error: error instanceof Error ? error.message : 'OCR processing failed'
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
      ocrSettings: {
        language,
        enhanceImage,
        supportedLanguages: ocrService.getSupportedLanguages()
      },
      message: 'OCR document processing initiated - this may take longer than regular uploads',
      estimatedTime: `${Math.ceil(file.size / (1024 * 1024)) * 30} seconds`,
      note: 'OCR processing time depends on image quality and text density'
    });

  } catch (error) {
    console.error('Error processing OCR upload:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to extract text from PDF using OCR
async function extractTextFromPDFWithOCR(pdfBuffer: Buffer, options: any) {
  try {
    // Configure pdf2pic
    const pdf2picOptions = {
      density: options.enhanceImage ? 300 : 200, // DPI
      saveFilename: "page",
      savePath: "/tmp", // Temporary directory
      format: "png",
      width: 2000,
      height: 2000
    };

    // Convert PDF to images
    const convert = pdf2pic.fromBuffer(pdfBuffer, pdf2picOptions);
    const pages = await convert.bulk(-1, { responseType: "buffer" }); // Convert all pages

    if (!pages || pages.length === 0) {
      throw new Error('Failed to convert PDF pages to images');
    }

    console.log(`Converting ${pages.length} PDF pages to text using OCR`);

    // Process each page with OCR
    const startTime = Date.now();
    const pageResults = [];
    let allText = '';
    let totalConfidence = 0;
    let totalWordCount = 0;

    for (let i = 0; i < pages.length; i++) {
      const pageBuffer = pages[i].buffer;
      
      try {
        const pageOCR = await ocrService.extractTextFromImage(pageBuffer, {
          language: options.language,
          enhanceImage: false, // Already processed by pdf2pic
          preserveLayout: true
        });

        const pageText = pageOCR.text.trim();
        if (pageText.length > 0) {
          allText += `\n--- Page ${i + 1} ---\n${pageText}\n`;
          totalConfidence += pageOCR.confidence;
          totalWordCount += pageOCR.wordCount;
        }

        pageResults.push({
          pageNumber: i + 1,
          text: pageText,
          confidence: pageOCR.confidence
        });

        console.log(`OCR Page ${i + 1}/${pages.length}: ${pageOCR.wordCount} words, ${pageOCR.confidence}% confidence`);
      } catch (pageError) {
        console.error(`Error processing page ${i + 1}:`, pageError);
        pageResults.push({
          pageNumber: i + 1,
          text: `[Error processing page ${i + 1}]`,
          confidence: 0
        });
      }
    }

    const avgConfidence = pageResults.length > 0 ? totalConfidence / pageResults.length : 0;
    const processingTime = Date.now() - startTime;

    return {
      text: allText.trim(),
      confidence: Math.round(avgConfidence * 100) / 100,
      wordCount: totalWordCount,
      engine: 'tesseract',
      processingTime,
      languages: [options.language || 'eng'],
      pages: pageResults
    };

  } catch (error) {
    console.error('PDF OCR conversion failed:', error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
          wordCount: currentChunk.split(/\s+/).filter(w => w.length > 0).length,
          isOCR: true
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
        wordCount: currentChunk.split(/\s+/).filter(w => w.length > 0).length,
        isOCR: true
      }
    });
  }

  return chunks;
}