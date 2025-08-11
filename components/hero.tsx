"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { FileText, Sparkles, Upload, CheckCircle, AlertCircle, Loader2, MessageCircle } from "lucide-react"
import { FloatingPaper } from "@/components/floating-paper"
import { RoboAnimation } from "@/components/robo-animation"
import { useRef, useState } from "react"
import { validatePDFFile, formatFileSize } from "@/lib/file-utils"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface ProcessedFile {
  id: string
  originalName: string
  size: number
  pages: number
  uploadedAt: string
  textPreview: string
  metadata?: {
    title?: string
    author?: string
    subject?: string
  }
}

interface UploadState {
  isUploading: boolean
  error: string | null
  success: string | null
}

export default function Hero() {
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([])
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    error: null,
    success: null
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Poll for processing completion
  const pollProcessingStatus = async (docId: string) => {
    const maxAttempts = 30 // 30 seconds max
    let attempts = 0
    
    const poll = async () => {
      try {
        const response = await fetch(`/api/upload-document-simple?docId=${docId}`)
        if (response.ok) {
          const data = await response.json()
          const document = data.document
          
          if (document) {
            // Update the processed file with real data
            setProcessedFiles(prev => prev.map(file => 
              file.id === docId 
                ? {
                    ...file,
                    pages: document.pages || 0,
                    textPreview: document.textPreview || "Document processed successfully",
                    metadata: {
                      ...file.metadata,
                      title: document.name?.replace(/\.[^/.]+$/, "") || file.metadata?.title || "Unknown"
                    }
                  }
                : file
            ))
            
            // If completed, stop polling
            if (document.status === 'completed' || document.status === 'failed') {
              return
            }
          }
        }
        
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000) // Poll every second
        }
      } catch (error) {
        console.error('Error polling status:', error)
      }
    }
    
    setTimeout(poll, 1000) // Start polling after 1 second
  }

  // Handle file upload with real processing
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    // Process each file
    for (const file of files) {
      // Validate file for supported formats (not just PDF)
      const supportedFormats = ['txt', 'md', 'csv', 'html', 'json']
      const fileExtension = file.name.toLowerCase().split('.').pop()
      
      if (!fileExtension || !supportedFormats.includes(fileExtension)) {
        setUploadState({
          isUploading: false,
          error: `Unsupported file format. Please upload: ${supportedFormats.join(', ')} files`,
          success: null
        })
        continue
      }
      
      if (file.size > 10 * 1024 * 1024) {
        setUploadState({
          isUploading: false,
          error: 'File too large (max 10MB)',
          success: null
        })
        continue
      }

      setUploadState({
        isUploading: true,
        error: null,
        success: null
      })

      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/upload-document-simple', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Upload failed')
        }

        const result = await response.json()
        
        if (result.success) {
          // Store the document ID and initial info
          const processedFile: ProcessedFile = {
            id: result.docId,
            originalName: result.fileName,
            size: result.fileSize,
            pages: 0, // Will be updated when processing completes
            uploadedAt: new Date().toISOString(),
            textPreview: "Processing in progress...",
            metadata: {
              title: result.fileName.replace(/\.[^/.]+$/, ""),
              author: "Unknown",
              subject: "Uploaded Document"
            }
          }
          
          setProcessedFiles(prev => [...prev, processedFile])
          setUploadState({
            isUploading: false,
            error: null,
            success: `Successfully uploaded ${file.name} - processing in background`
          })

          // Clear success message after 5 seconds
          setTimeout(() => {
            setUploadState(prev => ({ ...prev, success: null }))
          }, 5000)
          
          // Start polling for processing completion
          pollProcessingStatus(result.docId)
        }
      } catch (error) {
        setUploadState({
          isUploading: false,
          error: error instanceof Error ? error.message : 'Upload failed',
          success: null
        })
      }
    }

    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Trigger file input click
  const handleUploadClick = () => {
    if (uploadState.isUploading) return
    fileInputRef.current?.click()
  }

  // Clear error message
  const clearError = () => {
    setUploadState(prev => ({ ...prev, error: null }))
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center">
      {/* Floating papers background */}
      <div className="absolute inset-0 overflow-hidden">
        <FloatingPaper count={8} />
      </div>

      {/* Gradient overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-pink-900/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
            <div className="mb-6">
              <span className="inline-flex items-center px-4 py-2 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-sm font-medium mb-8">
                <Sparkles className="w-4 h-4 mr-2" />
                Powered by Advanced AI
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-8 leading-tight">
              Transform Your Research with
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 animate-pulse">
                AI Power
              </span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="text-gray-300 text-xl md:text-2xl mb-12 max-w-3xl mx-auto leading-relaxed"
          >
            Upload your documents (text, markdown, CSV, HTML, JSON) and let our AI provide intelligent analysis, 
            summaries, and insights through natural conversation.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12"
          >
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".txt,.md,.csv,.html,.json"
              multiple
            />

            <Button 
              size="lg" 
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-10 py-6 text-lg font-semibold shadow-2xl shadow-purple-500/25 transition-all duration-300 hover:scale-105 hover:shadow-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100" 
              onClick={handleUploadClick}
              disabled={uploadState.isUploading}
            >
              {uploadState.isUploading ? (
                <>
                  <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                  Processing PDF...
                </>
              ) : (
                <>
                  <Upload className="mr-3 h-6 w-6" />
                  Upload Document
                </>
              )}
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-white border-2 border-purple-400/50 hover:bg-purple-500/20 hover:border-purple-400 px-10 py-6 text-lg backdrop-blur-sm transition-all duration-300 hover:scale-105"
            >
              <Sparkles className="mr-3 h-6 w-6" />
              See Examples
            </Button>
          </motion.div>

          {/* Status Messages */}
          {(uploadState.error || uploadState.success) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-md mx-auto mb-8"
            >
              {uploadState.error && (
                <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
                    <span className="text-red-200">{uploadState.error}</span>
                  </div>
                  <button 
                    onClick={clearError}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    ×
                  </button>
                </div>
              )}
              
              {uploadState.success && (
                <div className="bg-green-500/20 border border-green-400/30 rounded-xl p-4 flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  <span className="text-green-200">{uploadState.success}</span>
                </div>
              )}
            </motion.div>
          )}

          {/* Feature highlights */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12"
          >
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <FileText className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Smart Analysis</h3>
              <p className="text-gray-400 text-sm">AI reads and understands your research content</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
              <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Sparkles className="w-6 h-6 text-pink-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Multi-Format Output</h3>
              <p className="text-gray-400 text-sm">Generate presentations, podcasts, and visuals</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <FileText className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Lightning Fast</h3>
              <p className="text-gray-400 text-sm">Transform hours of work into minutes</p>
            </div>
          </motion.div>

          {/* Display processed files */}
          {processedFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
            >
              <h3 className="text-white font-semibold mb-4 flex items-center">
                <FileText className="mr-2 h-5 w-5 text-purple-400" />
                Processed Files ({processedFiles.length})
              </h3>
              <div className="space-y-4">
                {processedFiles.map((file, index) => (
                  <motion.div 
                    key={file.id} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300 cursor-pointer group"
                    onClick={() => router.push(`/dashboard/files/${file.id}`)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <FileText className="mr-3 h-5 w-5 text-purple-400" />
                        <div>
                          <p className="text-white font-medium truncate group-hover:text-purple-300 transition-colors">{file.originalName}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-400">
                            <span>{formatFileSize(file.size)}</span>
                            <span>{file.pages || 0} pages</span>
                            <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                        <MessageCircle className="h-5 w-5 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    
                    {file.metadata?.title && (
                      <p className="text-sm text-purple-300 mb-2 font-medium">
                        Title: {file.metadata.title}
                      </p>
                    )}
                    
                    <div className="bg-white/5 rounded-lg p-3 mb-3">
                      <p className="text-xs text-gray-400 mb-1">Text Preview:</p>
                      <p className="text-sm text-gray-300 leading-relaxed line-clamp-3">
                        {file.textPreview}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      {file.metadata?.author && (
                        <p className="text-xs text-gray-400">
                          Author: {file.metadata.author}
                        </p>
                      )}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          size="sm" 
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/dashboard/files/${file.id}`)
                          }}
                        >
                          <MessageCircle className="w-3 h-3 mr-1" />
                          Chat
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Animated robot - made more subtle */}
      <div className="absolute bottom-8 right-8 w-64 h-64 opacity-30">
        <RoboAnimation />
      </div>
    </div>
  )
}

