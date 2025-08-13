'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import DocumentChatInterface from './PDFChatInterface';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Document {
  id: string;
  fileName: string;
  fileUrl: string;
  content?: string;
  mimeType?: string;
}

interface PineconeDocumentPageProps {
  docId: string;
}

const PineconeDocumentPage: React.FC<PineconeDocumentPageProps> = ({ docId }) => {
  const { user } = useUser();
  const router = useRouter();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    fetchDocument();
  }, [docId]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      setError(''); // Clear previous errors
      
      console.log('Fetching document:', docId);
      
      // Add timeout to prevent infinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`/api/files/${docId}?includeContent=true`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Document data received:', data);
      
      // Validate that we have the expected data structure
      if (!data.success || !data.file) {
        throw new Error('Invalid API response format');
      }
      
      // Map API response to expected document format
      const doc = {
        id: data.file.id,
        fileName: data.file.name || data.file.originalName || 'Unknown Document',
        fileUrl: data.file.fileUrl || data.file.downloadUrl || '', // Use existing fileUrl, downloadUrl, or empty string
        content: data.file.fullContent || '',
        mimeType: data.file.type || data.file.mimeType || 'application/octet-stream'
      };
      
      console.log('Mapped document:', doc);
      setDocument(doc);
    } catch (error) {
      console.error('Error fetching document:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        setError('Request timed out. The server might be overloaded.');
      } else {
        setError(error instanceof Error ? error.message : 'Failed to load document. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchDocument();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Unable to Load Document
          </h2>
          <p className="text-gray-600 mb-6">
            {error || 'Document not found or access denied.'}
          </p>
          <div className="flex space-x-3">
            <Button onClick={handleRetry} variant="default">
              Retry ({retryCount > 0 ? retryCount + 1 : 1})
            </Button>
            <Button onClick={handleGoBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600">
            Please sign in to access this document.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black/[0.96] antialiased bg-grid-white/[0.02] relative overflow-hidden">
      {/* Ambient background with moving particles */}
      <div className="h-full w-full absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-pink-900/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      </div>

      {/* Header */}
      <div className="relative z-10 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleGoBack}
                className="text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-bold text-white mb-1">
                  {document.fileName}
                </h1>
                <p className="text-sm text-white/60">
                  AI-Powered Document Analysis • {document.mimeType || 'Unknown type'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 text-green-300">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                Pinecone AI
              </div>
              <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-400/30 text-blue-300">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                LangChain
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Document Chat Interface */}
      <div className="relative z-10">
        <DocumentChatInterface 
          document={document} 
          userId={user.id}
        />
      </div>
    </div>
  );
};

export default PineconeDocumentPage;