'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  Sparkles, 
  MessageCircle, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Activity,
  Database,
  Users
} from 'lucide-react';
import Link from 'next/link';

interface DocumentMetadata {
  id: string;
  userId: string;
  name: string;
  type: string;
  size: number;
  status: 'uploading' | 'parsing' | 'processing' | 'generating' | 'completed' | 'failed';
  progress: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
  originalName: string;
  mimeType?: string;
  wordCount?: number;
  pages?: number;
  chunkCount?: number;
  messageCount: number;
  textPreview?: string;
  embeddings?: {
    model: string;
    dimensions: number;
    chunks: number;
  };
}

interface RealtimeEvent {
  type: 'initial_documents' | 'document_update' | 'document_status' | 'heartbeat';
  timestamp: string;
  documents?: DocumentMetadata[];
  document?: DocumentMetadata;
  docId?: string;
  status?: string;
  progress?: number;
  data?: any;
  stats?: any;
}

interface SystemStats {
  documents: {
    total: number;
    byStatus: Record<string, number>;
    byUser: number;
  };
  processingQueue: {
    totalEvents: number;
    activeQueues: number;
  };
  pubsub: {
    channels: number;
    totalSubscribers: number;
  };
  memory: {
    documentsSize: number;
    ttlTimers: number;
  };
}

export default function RealtimeDashboardThemed() {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [connected, setConnected] = useState(false);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [uploadState, setUploadState] = useState<{
    isUploading: boolean;
    error: string | null;
    success: string | null;
  }>({
    isUploading: false,
    error: null,
    success: null
  });

  const connectToRealtime = useCallback(() => {
    const es = new EventSource('/api/realtime/documents');

    es.onopen = () => {
      console.log('Connected to realtime updates');
      setConnected(true);
    };

    es.onmessage = (event) => {
      try {
        const data: RealtimeEvent = JSON.parse(event.data);
        console.log('Realtime event:', data);

        // Add to events log (keep only last 20)
        setEvents(prev => [data, ...prev].slice(0, 20));

        switch (data.type) {
          case 'initial_documents':
            if (data.documents) {
              setDocuments(data.documents);
            }
            break;

          case 'document_update':
            if (data.document) {
              setDocuments(prev => {
                const updated = [...prev];
                const index = updated.findIndex(doc => doc.id === data.document!.id);
                if (index >= 0) {
                  updated[index] = data.document!;
                } else {
                  updated.push(data.document!);
                }
                return updated;
              });
            }
            break;

          case 'document_status':
            if (data.docId && data.status !== undefined) {
              setDocuments(prev => {
                const updated = [...prev];
                const index = updated.findIndex(doc => doc.id === data.docId);
                if (index >= 0) {
                  updated[index] = { 
                    ...updated[index], 
                    status: data.status as any,
                    progress: data.progress || updated[index].progress,
                    ...(data.data || {})
                  };
                }
                return updated;
              });
            }
            break;

          case 'heartbeat':
            if (data.stats) {
              setStats(data.stats);
            }
            break;
        }
      } catch (error) {
        console.error('Error parsing realtime event:', error);
      }
    };

    es.onerror = () => {
      console.error('EventSource error');
      setConnected(false);
      es.close();
      
      // Retry connection after 5 seconds
      setTimeout(() => {
        if (eventSource === es) {
          connectToRealtime();
        }
      }, 5000);
    };

    setEventSource(es);

    return () => {
      es.close();
      setConnected(false);
    };
  }, []);

  useEffect(() => {
    const cleanup = connectToRealtime();
    return cleanup;
  }, [connectToRealtime]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'failed': return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'uploading': 
      case 'parsing': 
      case 'processing': 
      case 'generating': 
        return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-500/20 border-green-400/30';
      case 'uploading': 
      case 'parsing': 
      case 'processing': 
      case 'generating': 
        return 'text-blue-400 bg-blue-500/20 border-blue-400/30';
      case 'failed': return 'text-red-400 bg-red-500/20 border-red-400/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-400/30';
    }
  };

  const getProgressBar = (progress: number, status: string) => {
    const width = Math.min(100, Math.max(0, progress));
    const colorClass = status === 'failed' ? 'bg-red-500' : 
                      status === 'completed' ? 'bg-green-500' : 'bg-gradient-to-r from-purple-500 to-pink-500';
    
    return (
      <div className="w-full bg-white/10 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${width}%` }}
        />
      </div>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploadState({ isUploading: true, error: null, success: null });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload-document-simple', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setUploadState({
          isUploading: false,
          error: null,
          success: `Successfully uploaded ${file.name}`
        });
        
        setTimeout(() => {
          setUploadState(prev => ({ ...prev, success: null }));
        }, 3000);
      } else {
        const error = await response.json();
        setUploadState({
          isUploading: false,
          error: error.error || 'Upload failed',
          success: null
        });
      }
    } catch (error) {
      setUploadState({
        isUploading: false,
        error: 'Upload failed. Please try again.',
        success: null
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Quick Upload Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300"
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 text-purple-300 text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Document Chat - Enhanced RAG System
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Upload & Process Documents</h2>
          <p className="text-gray-300">
            Upload documents for intelligent analysis with semantic search and context-aware responses
          </p>
        </div>
        
        <div 
          className="border-2 border-dashed border-purple-400/30 rounded-xl p-8 text-center hover:border-purple-400/50 transition-all duration-300 cursor-pointer bg-gradient-to-br from-purple-500/5 to-pink-500/5 hover:from-purple-500/10 hover:to-pink-500/10"
          onDrop={(e) => {
            e.preventDefault();
            handleFileUpload(e.dataTransfer.files);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add('border-purple-400/70', 'from-purple-500/20', 'to-pink-500/20');
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('border-purple-400/70', 'from-purple-500/20', 'to-pink-500/20');
          }}
          onClick={() => {
            if (uploadState.isUploading) return;
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.txt,.md,.csv,.html,.json';
            input.onchange = (e) => {
              const target = e.target as HTMLInputElement;
              handleFileUpload(target.files);
            };
            input.click();
          }}
        >
          {uploadState.isUploading ? (
            <>
              <Loader2 className="w-12 h-12 text-purple-400 mx-auto mb-4 animate-spin" />
              <div className="font-medium text-white">Processing your document...</div>
              <div className="text-sm text-gray-400 mt-2">This may take a few moments</div>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <div className="font-medium text-white">Drop your document here or click to browse</div>
              <div className="text-sm text-gray-400 mt-2">
                Supports: Text (.txt), Markdown (.md), CSV, HTML, JSON
              </div>
            </>
          )}
        </div>

        {/* Status Messages */}
        {(uploadState.error || uploadState.success) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            {uploadState.error && (
              <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-4 flex items-center">
                <AlertCircle className="w-5 h-5 text-red-400 mr-3 flex-shrink-0" />
                <span className="text-red-200">{uploadState.error}</span>
              </div>
            )}
            
            {uploadState.success && (
              <div className="bg-green-500/20 border border-green-400/30 rounded-xl p-4 flex items-center">
                <CheckCircle className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                <span className="text-green-200">{uploadState.success}</span>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Connection Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="font-medium text-white">
              {connected ? 'Connected to real-time updates' : 'Disconnected'}
            </span>
            <Activity className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-sm text-gray-400">
            {events.length} events received
          </div>
        </div>
      </motion.div>

      {/* Memory Store Statistics */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
        >
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
            <Database className="w-5 h-5 mr-2 text-purple-400" />
            Memory Store Statistics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center bg-blue-500/10 rounded-xl p-4">
              <div className="text-3xl font-bold text-blue-400">{stats.documents.total}</div>
              <div className="text-sm text-gray-400 mt-1">Total Documents</div>
            </div>
            <div className="text-center bg-green-500/10 rounded-xl p-4">
              <div className="text-3xl font-bold text-green-400">{stats.processingQueue.totalEvents}</div>
              <div className="text-sm text-gray-400 mt-1">Processing Events</div>
            </div>
            <div className="text-center bg-purple-500/10 rounded-xl p-4">
              <div className="text-3xl font-bold text-purple-400">{stats.pubsub.channels}</div>
              <div className="text-sm text-gray-400 mt-1">Active Channels</div>
            </div>
            <div className="text-center bg-pink-500/10 rounded-xl p-4">
              <div className="text-3xl font-bold text-pink-400">{stats.pubsub.totalSubscribers}</div>
              <div className="text-sm text-gray-400 mt-1">Subscribers</div>
            </div>
          </div>
          
          {/* Status breakdown */}
          {stats.documents.byStatus && Object.keys(stats.documents.byStatus).length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-gray-300 mb-3">Documents by Status</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.documents.byStatus).map(([status, count]) => (
                  <span
                    key={status}
                    className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(status)}`}
                  >
                    {status}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Documents List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
      >
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-purple-400" />
          Your Documents ({documents.length})
        </h3>
        
        {documents.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4 opacity-50" />
            <p className="text-gray-400 text-lg">No documents uploaded yet</p>
            <p className="text-gray-500 text-sm mt-2">Upload your first document to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc, index) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/5 rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(doc.status)}
                    <div>
                      <h4 className="text-white font-medium truncate max-w-md">{doc.originalName}</h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span>{formatFileSize(doc.size)}</span>
                        {doc.wordCount && <span>{doc.wordCount} words</span>}
                        {doc.chunkCount && <span>{doc.chunkCount} chunks</span>}
                        <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(doc.status)}`}>
                      {doc.status}
                    </span>
                    {doc.messageCount > 0 && (
                      <div className="flex items-center text-sm text-gray-400">
                        <MessageCircle className="w-4 h-4 mr-1" />
                        {doc.messageCount}
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  {getProgressBar(doc.progress, doc.status)}
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{doc.status}</span>
                    <span>{doc.progress}%</span>
                  </div>
                </div>

                {/* Error message */}
                {doc.error && (
                  <div className="mb-4 bg-red-500/20 border border-red-400/30 rounded-lg p-3">
                    <p className="text-red-200 text-sm">{doc.error}</p>
                  </div>
                )}

                {/* Text preview */}
                {doc.textPreview && (
                  <div className="mb-4 bg-white/5 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-2">Preview:</p>
                    <p className="text-sm text-gray-300 line-clamp-3">{doc.textPreview}</p>
                  </div>
                )}

                {/* Actions */}
                {doc.status === 'completed' && (
                  <div className="flex justify-end">
                    <Link href={`/dashboard/files/${doc.id}`}>
                      <Button 
                        size="sm" 
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Chat with Document
                      </Button>
                    </Link>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}