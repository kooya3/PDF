'use client';

import React, { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  ZoomIn, 
  ZoomOut, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  Maximize,
  Minimize,
  FileText,
  Image as ImageIcon,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface UniversalDocumentViewerProps {
  fileUrl: string;
  fileName?: string;
  mimeType?: string;
  content?: string;
}

const UniversalDocumentViewer: React.FC<UniversalDocumentViewerProps> = ({ 
  fileUrl, 
  fileName = 'document',
  mimeType = '',
  content = ''
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const isPDF = mimeType?.includes('pdf') || fileName?.toLowerCase().endsWith('.pdf');
  const isImage = mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|bmp|webp|tiff)$/i.test(fileName);
  const isText = mimeType?.startsWith('text/') || /\.(txt|md|csv|json|html|xml|rtf)$/i.test(fileName);
  const isMarkdown = mimeType?.includes('markdown') || fileName?.toLowerCase().endsWith('.md');

  // Handle loading state based on content availability
  React.useEffect(() => {
    if (content && !fileUrl) {
      // If we have content but no file URL, we can show it immediately
      setLoading(false);
    } else if (!content && !fileUrl) {
      // If we have neither content nor file URL, this is an error state
      setError('No content or file URL provided');
      setLoading(false);
    }
    // If we have a fileUrl, let the individual components handle loading (PDF, Image, etc.)
  }, [content, fileUrl]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError('');
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    setError(`Failed to load document: ${error.message}`);
    setLoading(false);
  }, []);

  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.25, 3.0));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  const handlePreviousPage = useCallback(() => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setPageNumber(prev => Math.min(prev + 1, numPages));
  }, [numPages]);

  const handlePageJump = useCallback((page: number) => {
    if (page >= 1 && page <= numPages) {
      setPageNumber(page);
    }
  }, [numPages]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const handleDownload = useCallback(() => {
    if (!fileUrl) return;
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [fileUrl, fileName]);

  const renderDocumentContent = () => {
    if (error) {
      return (
        <div className="flex items-center justify-center min-h-96 p-8">
          <div className="bg-black/60 backdrop-blur-md border border-red-500/30 rounded-2xl p-8 shadow-2xl shadow-red-500/20 text-center max-w-md">
            <div className="w-16 h-16 mx-auto bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-400/30 rounded-2xl flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-300" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Error Loading Document</h3>
            <p className="text-red-300 mb-4 font-medium">Unable to load document content</p>
            <p className="text-sm text-white/70 leading-relaxed bg-red-500/10 p-3 rounded-lg">
              {error}
            </p>
          </div>
        </div>
      );
    }

    if (loading && !content) {
      return (
        <div className="flex items-center justify-center min-h-96 p-8">
          <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl shadow-black/50 text-center">
            <div className="relative mb-6">
              <div className="w-16 h-16 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin mx-auto"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-pink-400 rounded-full animate-spin mx-auto" style={{animationDirection: 'reverse', animationDuration: '0.8s'}}></div>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Loading Document</h3>
            <p className="text-white/70">Please wait while we prepare your document...</p>
          </div>
        </div>
      );
    }

    // If we have content but no fileUrl, show content directly
    if (content && !fileUrl) {
      return (
        <div className="p-8 max-w-5xl mx-auto">
          {/* Content wrapper with enhanced contrast */}
          <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl shadow-black/50">
            <div 
              style={{ 
                fontSize: `${scale}em`,
                lineHeight: 1.8
              }}
              className="text-white"
            >
              {isMarkdown ? (
                <div className="prose prose-invert prose-lg max-w-none">
                  <ReactMarkdown 
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-4xl font-bold mb-8 text-white bg-gradient-to-r from-purple-300 via-pink-300 to-purple-400 bg-clip-text text-transparent leading-tight">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-2xl font-semibold mb-6 text-white border-b-2 border-gradient-to-r from-purple-400/50 to-pink-400/50 pb-3 mt-8">
                          <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                            {children}
                          </span>
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-xl font-semibold mb-4 text-white/95 mt-6">
                          {children}
                        </h3>
                      ),
                      h4: ({ children }) => (
                        <h4 className="text-lg font-medium mb-3 text-white/90 mt-4">
                          {children}
                        </h4>
                      ),
                      p: ({ children }) => (
                        <p className="mb-5 text-white/85 leading-relaxed text-base">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc ml-6 mb-5 space-y-2 text-white/85">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal ml-6 mb-5 space-y-2 text-white/85">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="text-white/85 leading-relaxed">
                          {children}
                        </li>
                      ),
                      code: ({ children }) => (
                        <code className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 px-3 py-1 rounded-md text-sm text-purple-200 font-mono shadow-sm">
                          {children}
                        </code>
                      ),
                      pre: ({ children }) => (
                        <pre className="bg-black/70 border border-white/30 p-6 rounded-xl overflow-x-auto mb-6 text-white/95 shadow-xl backdrop-blur-sm">
                          {children}
                        </pre>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-gradient-to-b from-purple-400 to-pink-400 bg-white/5 pl-6 py-3 italic text-white/80 mb-6 rounded-r-lg backdrop-blur-sm">
                          {children}
                        </blockquote>
                      ),
                      strong: ({ children }) => (
                        <strong className="text-white font-bold">
                          {children}
                        </strong>
                      ),
                      em: ({ children }) => (
                        <em className="text-purple-200 font-medium">
                          {children}
                        </em>
                      ),
                      a: ({ children, href }) => (
                        <a 
                          href={href} 
                          className="text-purple-300 hover:text-purple-200 underline decoration-purple-400/50 hover:decoration-purple-300 transition-colors duration-200"
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          {children}
                        </a>
                      ),
                      table: ({ children }) => (
                        <div className="overflow-x-auto mb-6">
                          <table className="min-w-full border border-white/20 rounded-lg overflow-hidden">
                            {children}
                          </table>
                        </div>
                      ),
                      th: ({ children }) => (
                        <th className="bg-white/10 border border-white/20 px-4 py-3 text-white font-semibold text-left">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="bg-white/5 border border-white/20 px-4 py-3 text-white/85">
                          {children}
                        </td>
                      ),
                    }}
                  >
                    {content}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="bg-black/40 border border-white/30 p-6 rounded-xl backdrop-blur-sm shadow-xl">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-white/90 leading-relaxed">
                    {content}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // PDF Viewer
    if (isPDF) {
      return (
        <div className="flex justify-center p-8 min-h-full">
          <div className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-2xl shadow-black/50 max-w-full">
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-pink-400 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '0.8s'}}></div>
                  </div>
                  <p className="text-white/80 mt-4 font-medium">Loading PDF...</p>
                  <p className="text-white/60 text-sm mt-1">Please wait while we prepare your document</p>
                </div>
              }
              className="flex justify-center"
            >
              <div 
                style={{ 
                  transform: `scale(${scale})`, 
                  transformOrigin: 'top center',
                  filter: 'drop-shadow(0 10px 25px rgba(0,0,0,0.3))'
                }}
                className="bg-white rounded-lg overflow-hidden shadow-2xl border border-gray-200"
              >
                <Page
                  pageNumber={pageNumber}
                  renderAnnotationLayer={true}
                  renderTextLayer={true}
                  className="max-w-full"
                />
              </div>
            </Document>
          </div>
        </div>
      );
    }

    // Image Viewer
    if (isImage) {
      return (
        <div className="flex justify-center p-8 min-h-full">
          <div className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-2xl shadow-black/50 max-w-full">
            <div className="flex justify-center">
              <img
                src={fileUrl}
                alt={fileName}
                style={{ 
                  transform: `scale(${scale})`, 
                  transformOrigin: 'center',
                  maxWidth: '100%',
                  height: 'auto',
                  filter: 'drop-shadow(0 10px 25px rgba(0,0,0,0.3))'
                }}
                className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm"
                onLoad={() => setLoading(false)}
                onError={() => {
                  setError('Failed to load image');
                  setLoading(false);
                }}
              />
            </div>
          </div>
        </div>
      );
    }

    // Text/Content Viewer (when fileUrl exists but we also have content)
    if (isText && content) {
      return (
        <div className="p-8 max-w-5xl mx-auto">
          {/* Content wrapper with enhanced contrast */}
          <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl shadow-black/50">
            <div 
              style={{ 
                fontSize: `${scale}em`,
                lineHeight: 1.8
              }}
              className="text-white"
            >
              {isMarkdown ? (
                <div className="prose prose-invert prose-lg max-w-none">
                  <ReactMarkdown 
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-4xl font-bold mb-8 text-white bg-gradient-to-r from-purple-300 via-pink-300 to-purple-400 bg-clip-text text-transparent leading-tight">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-2xl font-semibold mb-6 text-white border-b-2 border-gradient-to-r from-purple-400/50 to-pink-400/50 pb-3 mt-8">
                          <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                            {children}
                          </span>
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-xl font-semibold mb-4 text-white/95 mt-6">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="mb-5 text-white/85 leading-relaxed text-base">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc ml-6 mb-5 space-y-2 text-white/85">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal ml-6 mb-5 space-y-2 text-white/85">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="text-white/85 leading-relaxed">
                          {children}
                        </li>
                      ),
                      code: ({ children }) => (
                        <code className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 px-3 py-1 rounded-md text-sm text-purple-200 font-mono shadow-sm">
                          {children}
                        </code>
                      ),
                      pre: ({ children }) => (
                        <pre className="bg-black/70 border border-white/30 p-6 rounded-xl overflow-x-auto mb-6 text-white/95 shadow-xl backdrop-blur-sm">
                          {children}
                        </pre>
                      ),
                    }}
                  >
                    {content}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="bg-black/40 border border-white/30 p-6 rounded-xl backdrop-blur-sm shadow-xl">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-white/90 leading-relaxed">
                    {content}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Default fallback for unsupported types
    return (
      <div className="flex items-center justify-center min-h-96 p-8">
        <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-2xl p-12 shadow-2xl shadow-black/50 text-center max-w-md">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 rounded-2xl flex items-center justify-center mb-4">
              <FileText className="h-10 w-10 text-purple-300" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-white mb-2">Document Preview</h3>
              <p className="text-white/80 font-medium">{fileName}</p>
              <p className="text-sm text-white/60 bg-white/10 px-3 py-1 rounded-full inline-block">
                {mimeType || 'Unknown type'}
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            <p className="text-white/70 text-sm leading-relaxed">
              This file type is not directly previewable in the browser. Download it to view the content with your preferred application.
            </p>
            
            <Button 
              onClick={handleDownload}
              disabled={!fileUrl}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg shadow-purple-500/25 transition-all duration-200 hover:scale-105 hover:shadow-purple-500/40 disabled:opacity-50 disabled:hover:scale-100"
            >
              <Download className="h-4 w-4 mr-2" />
              {fileUrl ? 'Download to View' : 'Download Unavailable'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const getDocumentIcon = () => {
    if (isPDF) return <FileText className="h-5 w-5 text-red-300" />;
    if (isImage) return <ImageIcon className="h-5 w-5 text-blue-300" />;
    return <FileText className="h-5 w-5 text-purple-300" />;
  };

  return (
    <div className={`bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl shadow-2xl ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center space-x-4">
          <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30">
            {getDocumentIcon()}
          </div>
          <div>
            <h3 className="font-semibold text-white">{fileName}</h3>
            <p className="text-sm text-white/60">{mimeType || 'Unknown type'}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* PDF-specific navigation */}
          {isPDF && numPages > 1 && (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={pageNumber <= 1}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all duration-200"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={pageNumber}
                  onChange={(e) => handlePageJump(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-1 text-sm bg-white/10 border border-white/20 rounded text-center text-white placeholder:text-white/50 focus:bg-white/20 focus:border-white/40"
                  min={1}
                  max={numPages}
                />
                <span className="text-sm text-white/80">/ {numPages}</span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={pageNumber >= numPages}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all duration-200"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Zoom Controls */}
          {(isPDF || isImage || isText) && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all duration-200"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              
              <span className="text-sm text-white/80 min-w-[60px] text-center font-medium">
                {Math.round(scale * 100)}%
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={scale >= 3.0}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all duration-200"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* Utility Controls */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all duration-200"
          >
            {isFullscreen ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={!fileUrl}
            title={fileUrl ? "Download file" : "Download not available"}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 disabled:opacity-50 transition-all duration-200"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Document Viewer */}
      <div className={`overflow-auto bg-gradient-to-br from-black/40 via-black/20 to-purple-900/10 backdrop-blur-sm ${isFullscreen ? 'h-screen' : 'h-96'} scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20 relative`}>
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-5 bg-grid-white/[0.02] pointer-events-none"></div>
        <div className="relative z-10">
          {renderDocumentContent()}
        </div>
      </div>

      {/* Status Bar */}
      {(isPDF || isImage || isText) && (
        <div className="px-4 py-3 border-t border-white/10 bg-black/20 backdrop-blur-sm text-sm text-white/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="font-medium">{fileName}</span>
            </div>
            <div className="flex items-center space-x-4 text-xs">
              <span className="flex items-center space-x-1">
                <span className="text-white/60">Zoom:</span>
                <span className="text-purple-300 font-medium">{Math.round(scale * 100)}%</span>
              </span>
              {isPDF && numPages > 0 && (
                <span className="flex items-center space-x-1">
                  <span className="text-white/60">Page:</span>
                  <span className="text-purple-300 font-medium">{pageNumber} of {numPages}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UniversalDocumentViewer;