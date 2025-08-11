'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { 
  MessageCircle, 
  Send, 
  FileText, 
  ArrowLeft, 
  Loader2, 
  AlertCircle, 
  Sparkles,
  User,
  Bot,
  Clock,
  Hash,
  BarChart3,
  Brain
} from 'lucide-react';
import Link from 'next/link';
import { SparklesCore } from "@/components/sparkles";
import { FloatingPaper } from "@/components/floating-paper";
import Navbar from "@/components/navbar";

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

export default function DocumentChatPageThemed({ docId }: DocumentChatPageProps) {
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
    "What insights can you provide?"
  ];

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!document) {
    return (
      <main className="min-h-screen bg-black/[0.96] antialiased bg-grid-white/[0.02] relative overflow-hidden flex items-center justify-center">
        {/* Ambient background */}
        <div className="h-full w-full absolute inset-0 z-0">
          <SparklesCore
            id="loading-sparkles"
            background="transparent"
            minSize={0.6}
            maxSize={1.4}
            particleDensity={30}
            className="w-full h-full"
            particleColor="#FFFFFF"
          />
        </div>

        <div className="relative z-10 text-center">
          <Loader2 className="w-12 h-12 text-purple-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-300 text-lg">Loading document...</p>
        </div>
      </main>
    );
  }

  if (document.status !== 'completed') {
    return (
      <main className="min-h-screen bg-black/[0.96] antialiased bg-grid-white/[0.02] relative overflow-hidden flex items-center justify-center">
        {/* Ambient background */}
        <div className="h-full w-full absolute inset-0 z-0">
          <SparklesCore
            id="processing-sparkles"
            background="transparent"
            minSize={0.6}
            maxSize={1.4}
            particleDensity={30}
            className="w-full h-full"
            particleColor="#FFFFFF"
          />
        </div>

        <div className="relative z-10 text-center max-w-md">
          <div className="text-yellow-400 mb-6">
            <Clock className="w-16 h-16 mx-auto animate-pulse" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Document Processing</h2>
          <p className="text-gray-300 mb-8 leading-relaxed">
            Your document "{document.name}" is still being processed. Please wait a moment and refresh the page.
          </p>
          <div className="flex space-x-4 justify-center">
            <Link href="/dashboard">
              <Button variant="outline" className="text-white border-white/30 hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <Button 
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              🔄 Refresh
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black/[0.96] antialiased bg-grid-white/[0.02] relative overflow-hidden">
      {/* Ambient background with moving particles */}
      <div className="h-full w-full absolute inset-0 z-0">
        <SparklesCore
          id="chat-sparkles"
          background="transparent"
          minSize={0.6}
          maxSize={1.4}
          particleDensity={40}
          className="w-full h-full"
          particleColor="#FFFFFF"
        />
      </div>

      {/* Floating papers background */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <FloatingPaper count={4} />
      </div>

      {/* Gradient overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-transparent to-pink-900/10 z-0" />

      <div className="relative z-10">
        <Navbar />
        
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 pt-8"
          >
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <Link href="/dashboard">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-white border-white/30 hover:bg-white/10"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <MessageCircle className="w-4 h-4" />
                  <span>{document.messageCount} messages</span>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-white mb-2">{document.name}</h1>
                  <div className="flex items-center space-x-6 text-sm text-gray-400">
                    <div className="flex items-center space-x-1">
                      <BarChart3 className="w-4 h-4" />
                      <span>{formatFileSize(document.size)}</span>
                    </div>
                    {document.wordCount && (
                      <div className="flex items-center space-x-1">
                        <Hash className="w-4 h-4" />
                        <span>{document.wordCount} words</span>
                      </div>
                    )}
                    {document.chunkCount && (
                      <div className="flex items-center space-x-1">
                        <Brain className="w-4 h-4" />
                        <span>{document.chunkCount} chunks</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pb-8">
            {/* Suggested Questions Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-1"
            >
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sticky top-8">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-purple-400" />
                  Suggestions
                </h3>
                <div className="space-y-2">
                  {suggestedQuestions.map((question, index) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + index * 0.05 }}
                      onClick={() => setInputMessage(question)}
                      className="w-full text-left p-3 text-sm text-gray-300 bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-200 hover:text-white border border-transparent hover:border-white/10"
                    >
                      {question}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Chat Area */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-3"
            >
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
                {/* Messages Area */}
                <div className="h-[600px] overflow-y-auto p-6 space-y-6">
                  {messages.length === 0 ? (
                    <div className="text-center py-20">
                      <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4 opacity-50" />
                      <p className="text-gray-400 text-lg">Start a conversation</p>
                      <p className="text-gray-500 text-sm mt-2">Ask questions about your document to get insights</p>
                    </div>
                  ) : (
                    messages.map((message, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                          <div className="flex items-center mb-2">
                            {message.role === 'user' ? (
                              <User className="w-4 h-4 text-blue-400 mr-2" />
                            ) : (
                              <Bot className="w-4 h-4 text-purple-400 mr-2" />
                            )}
                            <span className="text-xs text-gray-400">
                              {formatTime(message.timestamp)}
                            </span>
                          </div>
                          <div
                            className={`px-4 py-3 rounded-xl ${
                              message.role === 'user'
                                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white ml-8'
                                : 'bg-white/10 text-gray-100 mr-8 border border-white/10'
                            }`}
                          >
                            <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                  {loading && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="max-w-[80%]">
                        <div className="flex items-center mb-2">
                          <Bot className="w-4 h-4 text-purple-400 mr-2" />
                          <span className="text-xs text-gray-400">AI is thinking...</span>
                        </div>
                        <div className="bg-white/10 border border-white/10 px-4 py-3 rounded-xl mr-8">
                          <div className="flex items-center space-x-2">
                            <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                            <span className="text-gray-300">Processing your question...</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-6 pb-4"
                  >
                    <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-4 flex items-center">
                      <AlertCircle className="w-5 h-5 text-red-400 mr-3 flex-shrink-0" />
                      <span className="text-red-200">{error}</span>
                      <button
                        onClick={() => setError(null)}
                        className="ml-auto text-red-400 hover:text-red-300"
                      >
                        ×
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Input Area */}
                <div className="p-6 border-t border-white/10">
                  <div className="flex space-x-4">
                    <Input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask a question about your document..."
                      disabled={loading}
                      className="flex-1 bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-400/50 focus:ring-purple-400/20"
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={loading || !inputMessage.trim()}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}