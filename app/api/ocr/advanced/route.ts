import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { advancedOCRService, AdvancedOCROptions } from '@/lib/advanced-ocr-service';
import { convex } from '@/lib/convex-client';
import { api } from '@/convex/_generated/api';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const options = formData.get('options') ? JSON.parse(formData.get('options') as string) : {};

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const supportedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/tiff', 'image/bmp', 'image/webp',
      'application/pdf'
    ];

    if (!supportedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload an image or PDF.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    // Determine input type
    const inputType = file.type.startsWith('image/') ? 'image' : 'pdf';

    // Set up advanced OCR options
    const advancedOptions: AdvancedOCROptions = {
      extractTables: options.extractTables ?? true,
      analyzeLayout: options.analyzeLayout ?? true,
      detectCharts: options.detectCharts ?? false,
      outputFormat: options.outputFormat ?? 'both',
      tableDetectionThreshold: options.tableDetectionThreshold ?? 0.7,
      minimumTableSize: options.minimumTableSize ?? { rows: 2, columns: 2 },
      language: options.language ?? 'eng',
      enhanceImage: options.enhanceImage ?? true,
      preserveLayout: true,
      dpi: options.dpi ?? 300
    };

    console.log(`[AdvancedOCR] Processing ${inputType} file: ${file.name} for user ${userId}`);

    // Process with advanced OCR
    const result = await advancedOCRService.extractAdvancedContent(
      fileBuffer,
      inputType,
      advancedOptions
    );

    // Store processing result in Convex if enabled
    try {
      const documentId = `ocr_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await convex.mutation(api.documents.upsertDocument, {
        id: documentId,
        userId,
        name: file.name,
        type: inputType === 'image' ? 'image' : 'pdf',
        size: file.size,
        status: 'completed',
        progress: 100,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        originalName: file.name,
        mimeType: file.type,
        wordCount: result.wordCount,
        messageCount: 0,
        fullText: result.text,
        
        // Advanced OCR specific data
        chunks: result.structuredData?.tables.map((table, index) => ({
          content: table.csv || '',
          index,
          startChar: 0,
          endChar: (table.csv || '').length,
          metadata: {
            type: 'table',
            tableId: table.id,
            rows: table.rows,
            columns: table.columns,
            confidence: table.confidence
          }
        })) || []
      });

      console.log(`[AdvancedOCR] Stored OCR result with ID: ${documentId}`);
    } catch (convexError) {
      console.warn('Failed to store OCR result in Convex:', convexError);
    }

    // Format response based on output preference
    const response = {
      success: true,
      result: {
        text: result.text,
        confidence: result.confidence,
        wordCount: result.wordCount,
        processingTime: result.processingTime,
        languages: result.languages
      },
      advanced: {
        tablesFound: result.tables?.length || 0,
        hasStructuredData: result.structuredData?.metadata.hasTabularData || false,
        layout: result.layout ? {
          textBlocks: result.layout.textBlocks.length,
          tables: result.layout.tables.length,
          images: result.layout.images.length,
          headers: result.layout.headers.length,
          footers: result.layout.footers.length
        } : null
      }
    };

    // Include structured data if requested
    if (advancedOptions.outputFormat === 'structured' || advancedOptions.outputFormat === 'both') {
      (response as any).structuredData = result.structuredData;
      (response as any).tables = result.tables?.map(table => ({
        id: table.id,
        dimensions: `${table.rows}x${table.columns}`,
        confidence: table.confidence,
        csvData: table.csvData,
        jsonData: table.jsonData,
        boundingBox: table.boundingBox
      }));
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Advanced OCR processing error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to process document with advanced OCR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return service capabilities and configuration
    return NextResponse.json({
      service: 'Advanced OCR with Table Extraction',
      version: '1.0.0',
      capabilities: {
        tableExtraction: true,
        layoutAnalysis: true,
        chartDetection: true,
        multiLanguage: true,
        structuredOutput: true
      },
      supportedFormats: [
        'image/jpeg', 'image/jpg', 'image/png', 'image/tiff', 
        'image/bmp', 'image/webp', 'application/pdf'
      ],
      languages: [
        'eng', 'spa', 'fra', 'deu', 'ita', 'por', 
        'rus', 'ara', 'chi_sim', 'chi_tra', 'jpn', 'kor'
      ],
      defaultOptions: {
        extractTables: true,
        analyzeLayout: true,
        detectCharts: false,
        outputFormat: 'both',
        tableDetectionThreshold: 0.7,
        minimumTableSize: { rows: 2, columns: 2 },
        language: 'eng',
        enhanceImage: true,
        dpi: 300
      },
      limits: {
        maxFileSize: '25MB',
        maxPages: 20,
        maxTablesPerDocument: 50,
        processingTimeout: '300 seconds'
      }
    });

  } catch (error) {
    console.error('Advanced OCR service info error:', error);
    return NextResponse.json(
      { error: 'Failed to get service information' },
      { status: 500 }
    );
  }
}