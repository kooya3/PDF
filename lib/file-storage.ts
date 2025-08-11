import fs from 'fs/promises'
import path from 'path'
import { generateFileHash } from './pdf-utils'

export interface StoredFile {
  id: string
  originalName: string
  fileName: string
  size: number
  mimeType: string
  uploadedAt: Date
  hash: string
  path: string
}

export interface ProcessedPDF extends StoredFile {
  extractedText: string
  pages: number
  metadata?: {
    title?: string
    author?: string
    subject?: string
  }
}

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')
const PROCESSED_DIR = path.join(process.cwd(), 'processed')

export async function ensureUploadDirectories() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
    await fs.mkdir(PROCESSED_DIR, { recursive: true })
  } catch (error) {
    console.error('Error creating upload directories:', error)
    throw error
  }
}

export async function storeFile(buffer: Buffer, originalName: string, mimeType: string): Promise<StoredFile> {
  await ensureUploadDirectories()
  
  const hash = generateFileHash(buffer)
  const id = `${Date.now()}-${Math.random().toString(36).substring(7)}`
  const fileName = `${id}-${originalName}`
  const filePath = path.join(UPLOAD_DIR, fileName)
  
  try {
    await fs.writeFile(filePath, buffer)
    
    const storedFile: StoredFile = {
      id,
      originalName,
      fileName,
      size: buffer.length,
      mimeType,
      uploadedAt: new Date(),
      hash,
      path: filePath
    }
    
    // Store metadata in JSON file
    const metadataPath = path.join(PROCESSED_DIR, `${id}.json`)
    await fs.writeFile(metadataPath, JSON.stringify(storedFile, null, 2))
    
    return storedFile
  } catch (error) {
    console.error('Error storing file:', error)
    throw new Error('Failed to store file')
  }
}

export async function getStoredFile(id: string): Promise<StoredFile | null> {
  try {
    const metadataPath = path.join(PROCESSED_DIR, `${id}.json`)
    const metadata = await fs.readFile(metadataPath, 'utf-8')
    return JSON.parse(metadata)
  } catch (error) {
    return null
  }
}

export async function getFileBuffer(id: string): Promise<Buffer | null> {
  try {
    const storedFile = await getStoredFile(id)
    if (!storedFile) return null
    
    return await fs.readFile(storedFile.path)
  } catch (error) {
    return null
  }
}

export async function storeProcessedPDF(storedFile: StoredFile, extractedText: string, pages: number, metadata?: any): Promise<ProcessedPDF> {
  const processedPDF: ProcessedPDF = {
    ...storedFile,
    extractedText,
    pages,
    metadata
  }
  
  try {
    const processedPath = path.join(PROCESSED_DIR, `${storedFile.id}-processed.json`)
    await fs.writeFile(processedPath, JSON.stringify(processedPDF, null, 2))
    
    return processedPDF
  } catch (error) {
    console.error('Error storing processed PDF:', error)
    throw new Error('Failed to store processed PDF data')
  }
}

export async function getProcessedPDF(id: string): Promise<ProcessedPDF | null> {
  try {
    const processedPath = path.join(PROCESSED_DIR, `${id}-processed.json`)
    const data = await fs.readFile(processedPath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    return null
  }
}

export async function listProcessedPDFs(): Promise<ProcessedPDF[]> {
  try {
    const files = await fs.readdir(PROCESSED_DIR)
    const processedFiles = files.filter(file => file.endsWith('-processed.json'))
    
    const pdfs: ProcessedPDF[] = []
    for (const file of processedFiles) {
      try {
        const data = await fs.readFile(path.join(PROCESSED_DIR, file), 'utf-8')
        pdfs.push(JSON.parse(data))
      } catch (error) {
        console.error(`Error reading processed file ${file}:`, error)
      }
    }
    
    return pdfs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
  } catch (error) {
    console.error('Error listing processed PDFs:', error)
    return []
  }
}