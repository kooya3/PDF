import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { marked } from 'marked';
import * as cheerio from 'cheerio';
import * as pdfParse from 'pdf-parse';

export interface ParsedDocument {
  content: string;
  metadata: {
    type: DocumentType;
    pages?: number;
    wordCount: number;
    fileSize: number;
    fileName: string;
    title?: string;
    author?: string;
    createdAt?: Date;
    modifiedAt?: Date;
  };
  chunks?: DocumentChunk[];
}

export interface DocumentChunk {
  content: string;
  index: number;
  startChar: number;
  endChar: number;
  metadata?: Record<string, any>;
}

export enum DocumentType {
  PDF = 'pdf',
  DOCX = 'docx',
  DOC = 'doc',
  TXT = 'txt',
  MD = 'md',
  RTF = 'rtf',
  HTML = 'html',
  CSV = 'csv',
  XLSX = 'xlsx',
  XLS = 'xls',
  JSON = 'json',
  XML = 'xml',
  UNKNOWN = 'unknown'
}

export class DocumentParser {
  private static readonly CHUNK_SIZE = 1000;
  private static readonly CHUNK_OVERLAP = 200;

  static detectDocumentType(fileName: string, mimeType?: string): DocumentType {
    const extension = fileName.toLowerCase().split('.').pop();
    
    // Primary detection by file extension
    switch (extension) {
      case 'pdf': return DocumentType.PDF;
      case 'docx': return DocumentType.DOCX;
      case 'doc': return DocumentType.DOC;
      case 'txt': return DocumentType.TXT;
      case 'md': case 'markdown': return DocumentType.MD;
      case 'rtf': return DocumentType.RTF;
      case 'html': case 'htm': return DocumentType.HTML;
      case 'csv': return DocumentType.CSV;
      case 'xlsx': return DocumentType.XLSX;
      case 'xls': return DocumentType.XLS;
      case 'json': return DocumentType.JSON;
      case 'xml': return DocumentType.XML;
    }

    // Fallback to MIME type detection
    if (mimeType) {
      switch (mimeType) {
        case 'application/pdf': return DocumentType.PDF;
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': return DocumentType.DOCX;
        case 'application/msword': return DocumentType.DOC;
        case 'text/plain': return DocumentType.TXT;
        case 'text/markdown': return DocumentType.MD;
        case 'text/rtf': return DocumentType.RTF;
        case 'text/html': return DocumentType.HTML;
        case 'text/csv': return DocumentType.CSV;
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': return DocumentType.XLSX;
        case 'application/vnd.ms-excel': return DocumentType.XLS;
        case 'application/json': return DocumentType.JSON;
        case 'application/xml': case 'text/xml': return DocumentType.XML;
      }
    }

    return DocumentType.UNKNOWN;
  }

  static async parseDocument(
    file: File | Blob,
    fileName: string,
    options: {
      enableChunking?: boolean;
      chunkSize?: number;
      chunkOverlap?: number;
      extractMetadata?: boolean;
    } = {}
  ): Promise<ParsedDocument> {
    const {
      enableChunking = true,
      chunkSize = this.CHUNK_SIZE,
      chunkOverlap = this.CHUNK_OVERLAP,
      extractMetadata = true
    } = options;

    const documentType = this.detectDocumentType(fileName, file.type);
    const fileSize = file.size;

    try {
      let content = '';
      let metadata: ParsedDocument['metadata'] = {
        type: documentType,
        wordCount: 0,
        fileSize,
        fileName,
      };

      // Parse content based on document type
      switch (documentType) {
        case DocumentType.PDF:
          ({ content, metadata } = await this.parsePDF(file, metadata));
          break;
        case DocumentType.DOCX:
          ({ content, metadata } = await this.parseDOCX(file, metadata));
          break;
        case DocumentType.TXT:
          content = await this.parseText(file);
          break;
        case DocumentType.MD:
          content = await this.parseMarkdown(file);
          break;
        case DocumentType.HTML:
          content = await this.parseHTML(file);
          break;
        case DocumentType.CSV:
          content = await this.parseCSV(file);
          break;
        case DocumentType.XLSX:
        case DocumentType.XLS:
          content = await this.parseExcel(file);
          break;
        case DocumentType.JSON:
          content = await this.parseJSON(file);
          break;
        case DocumentType.XML:
          content = await this.parseXML(file);
          break;
        default:
          // Try to parse as text for unknown formats
          content = await this.parseText(file);
          break;
      }

      // Calculate word count
      metadata.wordCount = content.split(/\s+/).filter(word => word.length > 0).length;

      // Generate chunks if requested
      const chunks = enableChunking ? this.createChunks(content, chunkSize, chunkOverlap) : undefined;

      return {
        content,
        metadata,
        chunks
      };
    } catch (error) {
      throw new Error(`Failed to parse document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async parsePDF(file: File | Blob, metadata: ParsedDocument['metadata']): Promise<{ content: string; metadata: ParsedDocument['metadata'] }> {
    const buffer = await file.arrayBuffer();
    const data = await pdfParse(Buffer.from(buffer));
    
    return {
      content: data.text,
      metadata: {
        ...metadata,
        pages: data.numpages,
      }
    };
  }

  private static async parseDOCX(file: File | Blob, metadata: ParsedDocument['metadata']): Promise<{ content: string; metadata: ParsedDocument['metadata'] }> {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    return {
      content: result.value,
      metadata
    };
  }

  private static async parseText(file: File | Blob): Promise<string> {
    return await file.text();
  }

  private static async parseMarkdown(file: File | Blob): Promise<string> {
    const text = await file.text();
    // Convert markdown to plain text by parsing HTML and extracting text
    const html = marked(text);
    const $ = cheerio.load(html);
    return $.text();
  }

  private static async parseHTML(file: File | Blob): Promise<string> {
    const html = await file.text();
    const $ = cheerio.load(html);
    
    // Remove script and style elements
    $('script, style').remove();
    
    return $.text().replace(/\s+/g, ' ').trim();
  }

  private static async parseCSV(file: File | Blob): Promise<string> {
    const text = await file.text();
    const lines = text.split('\n');
    const headers = lines[0]?.split(',') || [];
    
    let content = `CSV Document with ${headers.length} columns:\n`;
    content += `Headers: ${headers.join(', ')}\n\n`;
    
    // Convert CSV to readable text format
    for (let i = 1; i < Math.min(lines.length, 100); i++) { // Limit to first 100 rows for performance
      const row = lines[i]?.split(',') || [];
      if (row.length > 0 && row[0]?.trim()) {
        content += `Row ${i}: ${row.join(' | ')}\n`;
      }
    }
    
    if (lines.length > 100) {
      content += `\n... and ${lines.length - 100} more rows`;
    }
    
    return content;
  }

  private static async parseExcel(file: File | Blob): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    let content = `Excel Document with ${workbook.SheetNames.length} sheets:\n\n`;
    
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      content += `Sheet: ${sheetName}\n`;
      
      // Convert first few rows to readable format
      for (let i = 0; i < Math.min(jsonData.length, 50); i++) {
        const row = jsonData[i] as any[];
        if (row && row.length > 0) {
          content += `Row ${i + 1}: ${row.join(' | ')}\n`;
        }
      }
      
      if (jsonData.length > 50) {
        content += `... and ${jsonData.length - 50} more rows\n`;
      }
      content += '\n';
    }
    
    return content;
  }

  private static async parseJSON(file: File | Blob): Promise<string> {
    const text = await file.text();
    try {
      const jsonData = JSON.parse(text);
      return `JSON Document:\n${JSON.stringify(jsonData, null, 2)}`;
    } catch (error) {
      return text; // Fallback to raw text if JSON parsing fails
    }
  }

  private static async parseXML(file: File | Blob): Promise<string> {
    const xml = await file.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    return $.text().replace(/\s+/g, ' ').trim();
  }

  private static createChunks(
    content: string, 
    chunkSize: number, 
    chunkOverlap: number
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const words = content.split(/\s+/);
    
    if (words.length <= chunkSize) {
      return [{
        content,
        index: 0,
        startChar: 0,
        endChar: content.length,
      }];
    }

    let startIndex = 0;
    let chunkIndex = 0;
    
    while (startIndex < words.length) {
      const endIndex = Math.min(startIndex + chunkSize, words.length);
      const chunkWords = words.slice(startIndex, endIndex);
      const chunkContent = chunkWords.join(' ');
      
      const startChar = words.slice(0, startIndex).join(' ').length;
      const endChar = startChar + chunkContent.length;
      
      chunks.push({
        content: chunkContent,
        index: chunkIndex,
        startChar: startChar > 0 ? startChar + 1 : 0, // Account for space
        endChar,
      });
      
      // Move start index, accounting for overlap
      startIndex = endIndex - chunkOverlap;
      chunkIndex++;
    }
    
    return chunks;
  }

  static getSupportedFormats(): string[] {
    return [
      'pdf', 'docx', 'doc', 'txt', 'md', 'markdown',
      'rtf', 'html', 'htm', 'csv', 'xlsx', 'xls',
      'json', 'xml'
    ];
  }

  static getSupportedMimeTypes(): string[] {
    return [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/markdown',
      'text/rtf',
      'text/html',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/json',
      'application/xml',
      'text/xml'
    ];
  }
}