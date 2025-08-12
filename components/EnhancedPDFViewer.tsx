'use client';

import React, { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  RotateCcw, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  Maximize,
  Minimize
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface EnhancedPDFViewerProps {
  fileUrl: string;
  fileName?: string;
}

const EnhancedPDFViewer: React.FC<EnhancedPDFViewerProps> = ({ 
  fileUrl, 
  fileName = 'document.pdf' 
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError('');
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    setError(`Failed to load PDF: ${error.message}`);
    setLoading(false);
  }, []);

  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.25, 3.0));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleRotateClockwise = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  const handleRotateCounterClockwise = useCallback(() => {
    setRotation(prev => (prev - 90 + 360) % 360);
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
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [fileUrl, fileName]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading PDF</p>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border rounded-lg shadow-sm ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center space-x-2">
          {/* Navigation Controls */}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={pageNumber}
              onChange={(e) => handlePageJump(parseInt(e.target.value) || 1)}
              className="w-16 px-2 py-1 text-sm border rounded text-center"
              min={1}
              max={numPages}
            />
            <span className="text-sm text-gray-600">/ {numPages}</span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={pageNumber >= numPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          {/* Zoom Controls */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          
          <span className="text-sm text-gray-600 min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={scale >= 3.0}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          {/* Rotation Controls */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRotateCounterClockwise}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRotateClockwise}
          >
            <RotateCw className="h-4 w-4" />
          </Button>

          {/* Utility Controls */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
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
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className={`overflow-auto bg-gray-100 ${isFullscreen ? 'h-screen' : 'h-96'}`}>
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading PDF...</p>
            </div>
          </div>
        )}
        
        <div className="flex justify-center p-4">
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading=""
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              rotate={rotation}
              renderAnnotationLayer={true}
              renderTextLayer={true}
            />
          </Document>
        </div>
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2 border-t bg-gray-50 text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <span>{fileName}</span>
          <div className="flex items-center space-x-4">
            <span>Zoom: {Math.round(scale * 100)}%</span>
            <span>Rotation: {rotation}°</span>
            <span>Page {pageNumber} of {numPages}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedPDFViewer;