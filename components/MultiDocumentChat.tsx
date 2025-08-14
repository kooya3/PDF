'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, Send, MessageSquare, BookOpen, GitCompare, Loader2, FileText, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: DocumentReference[];
  confidence?: number;
  metadata?: any;
}

interface DocumentReference {
  documentId: string;
  documentName: string;
  chunkIndex: number;
  content: string;
  relevanceScore: number;
}

interface Props {
  userId: string;
  documents: Array<{
    id: string;
    name: string;
    status: string;
    wordCount?: number;
  }>;
}

export default function MultiDocumentChat({ userId, documents }: Props) {
  const [activeMode, setActiveMode] = useState<'unified' | 'search' | 'compare'>('unified');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compare mode specific state
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const availableDocuments = documents.filter(doc => doc.status === 'completed');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      const response = await fetch('/api/chat/multi-document');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.history) {
          setMessages(data.history.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp).toISOString()
          })));
        }
      }
    } catch (err) {
      console.warn('Could not load chat history');
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || loading) return;

    // Validate for compare mode
    if (activeMode === 'compare' && selectedDocs.length !== 2) {
      setError('Compare mode requires exactly 2 documents to be selected');
      return;
    }

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: currentMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setLoading(true);
    setError(null);

    try {
      const requestBody: any = {
        message: currentMessage,
        chatMode: activeMode,
        maxSources: 8,
        includeConflicts: true,
        minConfidence: 0.3
      };

      if (activeMode === 'compare') {
        requestBody.documentIds = selectedDocs;
      }

      const response = await fetch('/api/chat/multi-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: ChatMessage = {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString(),
          sources: data.sources,
          confidence: data.confidence,
          metadata: data.metadata
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        setError(data.error || 'Failed to send message');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleDocumentSelection = (docId: string) => {
    setSelectedDocs(prev => {
      if (prev.includes(docId)) {
        return prev.filter(id => id !== docId);
      } else if (prev.length < 2) {
        return [...prev, docId];
      } else {
        // Replace the first selected document
        return [prev[1], docId];
      }
    });
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'unified': return <BookOpen className="h-4 w-4" />;
      case 'search': return <MessageSquare className="h-4 w-4" />;
      case 'compare': return <GitCompare className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getModeDescription = (mode: string) => {
    switch (mode) {
      case 'unified': return 'Ask questions across all your documents with AI synthesis';
      case 'search': return 'Search for information across documents with detailed results';
      case 'compare': return 'Compare specific documents to find similarities and differences';
      default: return '';
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {availableDocuments.length < 2 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You need at least 2 processed documents to use multi-document chat.
            Current processed documents: {availableDocuments.length}
          </AlertDescription>
        </Alert>
      )}

      {/* Mode Selection */}
      <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-sm glass-morphism">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-white">
            <Users className="h-5 w-5 text-purple-400" />
            Multi-Document Chat
          </CardTitle>
          <CardDescription className="text-gray-400">
            Chat with multiple documents simultaneously using different analysis modes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeMode} onValueChange={(value) => setActiveMode(value as any)}>
            <TabsList className="grid w-full grid-cols-3 bg-gray-900/50 border-gray-700">
              <TabsTrigger value="unified" className="flex items-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-300">
                {getModeIcon('unified')}
                Unified
              </TabsTrigger>
              <TabsTrigger value="search" className="flex items-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-300">
                {getModeIcon('search')}
                Search
              </TabsTrigger>
              <TabsTrigger value="compare" className="flex items-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-300">
                {getModeIcon('compare')}
                Compare
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeMode} className="mt-4">
              <div className="text-sm text-gray-400 mb-4">
                {getModeDescription(activeMode)}
              </div>

              {/* Document Selection for Compare Mode */}
              {activeMode === 'compare' && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-white">Select 2 documents to compare:</div>
                  <div className="flex flex-wrap gap-2">
                    {availableDocuments.map(doc => (
                      <Badge
                        key={doc.id}
                        variant={selectedDocs.includes(doc.id) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleDocumentSelection(doc.id)}
                      >
                        {doc.name}
                        {selectedDocs.includes(doc.id) && (
                          <span className="ml-1 text-xs">
                            ({selectedDocs.indexOf(doc.id) + 1})
                          </span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Document Overview for Other Modes */}
              {activeMode !== 'compare' && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">
                    Available documents ({availableDocuments.length}):
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableDocuments.map(doc => (
                      <Badge key={doc.id} variant="outline">
                        {doc.name}
                        {doc.wordCount && (
                          <span className="ml-1 text-xs">
                            ({doc.wordCount.toLocaleString()} words)
                          </span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Chat Messages */}
      <Card className="flex-1 flex flex-col bg-gray-900/40 border-gray-700 backdrop-blur-sm glass-morphism">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-white">
            {getModeIcon(activeMode)}
            {activeMode.charAt(0).toUpperCase() + activeMode.slice(1)} Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Start a conversation across your documents</p>
                  <p className="text-sm">
                    Ask questions, compare content, or search for specific information
                  </p>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] space-y-2`}>
                    <div
                      className={`rounded-lg p-4 ${
                        message.role === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-900 border'
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">
                        {message.content}
                      </div>

                      {message.role === 'assistant' && message.confidence !== undefined && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Confidence: {(message.confidence * 100).toFixed(1)}%</span>
                            {message.metadata?.processingTime && (
                              <span>
                                Processed in {message.metadata.processingTime}ms
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sources */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-gray-600">
                          Sources ({message.sources.length}):
                        </div>
                        <div className="space-y-1">
                          {message.sources.slice(0, 3).map((source, index) => (
                            <div
                              key={index}
                              className="text-xs bg-white border rounded p-2 text-gray-700"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <FileText className="h-3 w-3" />
                                <span className="font-medium">{source.documentName}</span>
                                <Badge variant="outline" className="text-xs">
                                  {(source.relevanceScore * 100).toFixed(1)}%
                                </Badge>
                              </div>
                              <div className="line-clamp-2">
                                {source.content.substring(0, 150)}...
                              </div>
                            </div>
                          ))}
                          {message.sources.length > 3 && (
                            <div className="text-xs text-gray-500 text-center">
                              and {message.sources.length - 3} more sources...
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-gray-500">
                      {formatTimestamp(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 border rounded-lg p-4 max-w-[80%]">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-gray-600">
                        {activeMode === 'unified' && 'Analyzing across documents...'}
                        {activeMode === 'search' && 'Searching documents...'}
                        {activeMode === 'compare' && 'Comparing documents...'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Input Area */}
          <div className="mt-4 space-y-2">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder={
                  activeMode === 'unified'
                    ? 'Ask a question across all documents...'
                    : activeMode === 'search'
                    ? 'Search for specific information...'
                    : 'What would you like to know about these documents?'
                }
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading || availableDocuments.length < 2}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={
                  loading || 
                  !currentMessage.trim() || 
                  availableDocuments.length < 2 ||
                  (activeMode === 'compare' && selectedDocs.length !== 2)
                }
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            <div className="text-xs text-gray-500">
              {activeMode === 'compare' && selectedDocs.length !== 2 && (
                'Please select exactly 2 documents to compare'
              )}
              {availableDocuments.length < 2 && (
                'You need at least 2 processed documents to use multi-document chat'
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}