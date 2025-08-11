'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
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

export default function RealtimeDashboard() {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [connected, setConnected] = useState(false);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [events, setEvents] = useState<RealtimeEvent[]>([]);

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
                  updated.unshift(data.document!);
                }
                return updated;
              });
            }
            break;

          case 'document_status':
            if (data.docId && data.status && data.progress !== undefined) {
              setDocuments(prev => {
                return prev.map(doc => {
                  if (doc.id === data.docId) {
                    return {
                      ...doc,
                      status: data.status as any,
                      progress: data.progress!,
                      updatedAt: data.timestamp,
                      ...(data.data || {})
                    };
                  }
                  return doc;
                });
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

    es.onerror = (error) => {
      console.error('Realtime connection error:', error);
      setConnected(false);
      es.close();
    };

    setEventSource(es);

    return () => {
      es.close();
      setConnected(false);
    };
  }, []);

  const disconnectFromRealtime = useCallback(() => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
      setConnected(false);
    }
  }, [eventSource]);

  useEffect(() => {
    const cleanup = connectToRealtime();
    return cleanup;
  }, [connectToRealtime]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'uploading': case 'parsing': case 'processing': case 'generating': return 'text-blue-600 bg-blue-50';
      case 'failed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getProgressBar = (progress: number, status: string) => {
    const width = Math.min(100, Math.max(0, progress));
    const colorClass = status === 'failed' ? 'bg-red-500' : 
                      status === 'completed' ? 'bg-green-500' : 'bg-blue-500';
    
    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
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

  // Handle file upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload-document-simple', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Upload successful:', result);
        // The real-time updates will show the processing automatically
      } else {
        const error = await response.json();
        alert(`Upload failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Upload Area */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-lg shadow text-white">
        <h2 className="text-xl font-bold mb-3">🚀 AI Document Chat - Enhanced RAG System</h2>
        <p className="mb-4 opacity-90">
          Upload documents for intelligent analysis with semantic search, embeddings, and context-aware responses. 
          Ask questions, get summaries, extract key information!
        </p>
        
        <div 
          className="border-2 border-dashed border-white/50 rounded-lg p-8 text-center hover:border-white/80 transition-colors cursor-pointer bg-white/10"
          onDrop={(e) => {
            e.preventDefault();
            handleFileUpload(e.dataTransfer.files);
          }}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => {
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
          <div className="text-4xl mb-2">📄</div>
          <div className="font-medium">Drop your document here or click to browse</div>
          <div className="text-sm opacity-75 mt-2">
            Supports: Text (.txt), Markdown (.md), CSV, HTML, JSON
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="font-medium">
            {connected ? 'Connected to realtime updates' : 'Disconnected'}
          </span>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={connectToRealtime}
            disabled={connected}
            size="sm"
            variant="outline"
          >
            Connect
          </Button>
          <Button
            onClick={disconnectFromRealtime}
            disabled={!connected}
            size="sm"
            variant="outline"
          >
            Disconnect
          </Button>
        </div>
      </div>

      {/* Memory Store Statistics */}
      {stats && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Memory Store Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.documents.total}</div>
              <div className="text-sm text-gray-600">Total Documents</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.processingQueue.totalEvents}</div>
              <div className="text-sm text-gray-600">Processing Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.pubsub.channels}</div>
              <div className="text-sm text-gray-600">Active Channels</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.pubsub.totalSubscribers}</div>
              <div className="text-sm text-gray-600">Subscribers</div>
            </div>
          </div>
          
          {/* Status breakdown */}
          {stats.documents.byStatus && Object.keys(stats.documents.byStatus).length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-700 mb-2">Documents by Status</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.documents.byStatus).map(([status, count]) => (
                  <span
                    key={status}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}
                  >
                    {status}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Documents List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Documents ({documents.length})</h3>
        </div>
        
        {documents.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No documents found. Upload a document to see real-time processing updates.
          </div>
        ) : (
          <div className="divide-y">
            {documents.map((doc) => (
              <div key={doc.id} className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{doc.originalName}</h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="uppercase">{doc.type}</span>
                      <span>{formatFileSize(doc.size)}</span>
                      <span>{new Date(doc.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(doc.status)}`}>
                    {doc.status}
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{doc.progress}%</span>
                  </div>
                  {getProgressBar(doc.progress, doc.status)}
                </div>

                {/* Document metadata */}
                {(doc.wordCount || doc.pages || doc.chunkCount) && (
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    {doc.wordCount && <span>{doc.wordCount} words</span>}
                    {doc.pages && <span>{doc.pages} pages</span>}
                    {doc.chunkCount && <span>{doc.chunkCount} chunks</span>}
                    {doc.embeddings && <span>{doc.embeddings.model} embeddings</span>}
                  </div>
                )}

                {/* Error message */}
                {doc.error && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {doc.error}
                  </div>
                )}

                {/* Action buttons */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {doc.status === 'completed' && (
                      <>
                        <Link href={`/dashboard/files/${doc.id}`}>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            💬 Chat with Document
                          </Button>
                        </Link>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            // Preview functionality - show first 500 chars
                            if (doc.textPreview) {
                              alert(`Document Preview:\n\n${doc.textPreview}`);
                            }
                          }}
                        >
                          👁️ Preview
                        </Button>
                      </>
                    )}
                    {doc.status === 'failed' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          // Retry upload - you could implement this
                          console.log('Retry upload for:', doc.id);
                        }}
                      >
                        🔄 Retry
                      </Button>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    {doc.messageCount > 0 && `${doc.messageCount} messages`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Events Log */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Recent Events ({events.length})</h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {events.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No events yet. Connect to start receiving real-time updates.
            </div>
          ) : (
            <div className="divide-y">
              {events.map((event, index) => (
                <div key={index} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{event.type}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto">
                    {JSON.stringify(event, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}