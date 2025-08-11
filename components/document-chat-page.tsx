'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

interface DocumentMetadata {
  id: string;
  name: string;
  type: string;
  size: number;
  status: string;
  wordCount?: number;
  pages?: number;
  chunkCount?: number;
  messageCount: number;
  lastChatAt?: string;
  textPreview?: string;
  createdAt: string;
}

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
}

interface DocumentChatPageProps {
  docId: string;
}

export default function DocumentChatPage({ docId }: DocumentChatPageProps) {
  const [document, setDocument] = useState<DocumentMetadata | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load document info
  useEffect(() => {
    fetchDocumentInfo();
  }, [docId]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchDocumentInfo = async () => {
    try {
      const response = await fetch(`/api/upload-document-simple?docId=${docId}`);
      if (response.ok) {
        const data = await response.json();
        setDocument(data.document);
      } else {
        setError('Failed to load document information');
      }
    } catch (err) {
      console.error('Error fetching document:', err);
      setError('Failed to load document');
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: inputMessage,
          docId
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        const aiMessage: ChatMessage = {
          role: 'ai',
          content: data.response,
          timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, aiMessage]);

        // Update document info with new message count
        if (document) {
          setDocument(prev => prev ? { ...prev, messageCount: data.messageCount } : null);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to get AI response');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestedQuestions = [
    "Summarize this document",
    "What are the main topics covered?",
    "Extract important dates and numbers",
    "Find action items or next steps",
    "Extract key people or organizations",
    "What insights can you provide?",
    "Identify the main conclusions",
    "What data or statistics are mentioned?"
  ];

  if (!document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading document...</p>
        </div>
      </div>
    );
  }

  if (document.status !== 'completed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-yellow-500 mb-4">
            <svg className="h-16 w-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">Document Processing</h2>
          <p className="text-gray-500 mb-4">
            Your document "{document.name}" is still being processed. Please wait a moment and refresh the page.
          </p>
          <div className="flex space-x-3 justify-center">
            <Link href="/dashboard">
              <Button variant="outline">← Back to Dashboard</Button>
            </Link>
            <Button onClick={() => window.location.reload()}>🔄 Refresh</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm">← Back</Button>
                </Link>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{document.name}</h1>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>{document.type.toUpperCase()}</span>
                    <span>{Math.round(document.size / 1024)} KB</span>
                    {document.wordCount && <span>{document.wordCount.toLocaleString()} words</span>}
                    {document.chunkCount && <span>{document.chunkCount} chunks</span>}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                ✅ Ready for Chat
              </span>
              <span className="text-sm text-gray-500">
                {document.messageCount} messages
              </span>
            </div>
          </div>
        </div>

        <div className="flex h-[calc(100vh-120px)]">
          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-white">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">💬</div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    Start chatting with your document!
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Ask questions about the content, request summaries, or explore specific topics.
                  </p>
                  
                  {/* Suggested Questions */}
                  <div className="max-w-md mx-auto">
                    <p className="text-sm font-medium text-gray-600 mb-3">Try these questions:</p>
                    <div className="space-y-2">
                      {suggestedQuestions.map((question, index) => (
                        <button
                          key={index}
                          onClick={() => setInputMessage(question)}
                          className="w-full p-2 text-left text-sm bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-2xl px-4 py-2 rounded-lg ${
                      message.role === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <div className={`text-xs mt-1 ${
                        message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-4 py-2">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      <span className="text-gray-600">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Error Display */}
            {error && (
              <div className="px-6 py-2">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm">{error}</p>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setError(null)}
                    className="mt-2 text-red-600 hover:text-red-700"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="border-t bg-gray-50 p-4">
              <div className="flex space-x-3">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about this document..."
                  disabled={loading}
                  className="flex-1"
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={!inputMessage.trim() || loading}
                  className="px-6"
                >
                  Send
                </Button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 bg-gray-50 border-l p-6 space-y-6 overflow-y-auto">
            {/* Document Preview */}
            {document.textPreview && (
              <div className="bg-white rounded-lg p-4">
                <h3 className="font-semibold mb-3">Document Preview</h3>
                <div className="text-sm text-gray-700 leading-relaxed">
                  <p>{document.textPreview}</p>
                </div>
              </div>
            )}

            {/* Document Stats */}
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-semibold mb-3">Document Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium">{document.type.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Size:</span>
                  <span className="font-medium">{Math.round(document.size / 1024)} KB</span>
                </div>
                {document.wordCount && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Words:</span>
                    <span className="font-medium">{document.wordCount.toLocaleString()}</span>
                  </div>
                )}
                {document.pages && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pages:</span>
                    <span className="font-medium">{document.pages}</span>
                  </div>
                )}
                {document.chunkCount && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Chunks:</span>
                    <span className="font-medium">{document.chunkCount}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-semibold mb-3">Quick Actions</h3>
              <div className="space-y-2">
                {suggestedQuestions.slice(0, 3).map((question, index) => (
                  <button
                    key={index}
                    onClick={() => setInputMessage(question)}
                    className="w-full text-left px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Stats */}
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-semibold mb-3">Chat Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Messages:</span>
                  <span className="font-medium">{document.messageCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium text-green-600">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}