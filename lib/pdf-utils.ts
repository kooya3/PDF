import pdf from 'pdf-parse'

export interface ExtractedPDFData {
  text: string
  pages: number
  info?: {
    title?: string
    author?: string
    subject?: string
    creator?: string
    producer?: string
    creationDate?: Date
    modificationDate?: Date
  }
  metadata?: Record<string, unknown>
}

export async function extractTextFromPDF(buffer: Buffer): Promise<ExtractedPDFData> {
  try {
    const data = await pdf(buffer, {
      // Options for better text extraction
      max: 0, // Extract all pages
      version: 'v1.10.100',
      normalizeWhitespace: false,
      disableCombineTextItems: false
    })

    return {
      text: data.text,
      pages: data.numpages,
      info: data.info ? {
        title: data.info.Title,
        author: data.info.Author,
        subject: data.info.Subject,
        creator: data.info.Creator,
        producer: data.info.Producer,
        creationDate: data.info.CreationDate ? new Date(data.info.CreationDate) : undefined,
        modificationDate: data.info.ModDate ? new Date(data.info.ModDate) : undefined,
      } : undefined,
      metadata: data.metadata
    }
  } catch (error) {
    console.error('Error extracting text from PDF:', error)
    throw new Error('Failed to extract text from PDF')
  }
}

export function generateFileHash(buffer: Buffer): string {
  const crypto = require('crypto') as typeof import('crypto')
  return crypto.createHash('md5').update(buffer).digest('hex')
}