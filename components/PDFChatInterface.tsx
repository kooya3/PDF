'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import UniversalDocumentViewer from './UniversalDocumentViewer';
import EnhancedTTSControls from './EnhancedTTSControls';
import { useToast } from '@/components/ui/use-toast';
import {
  MessageCircle,
  Send,
  Loader2,
  FileText,
  Calendar,
  Users,
  MapPin,
  CheckSquare,
  X,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Settings
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface TTSSettings {
  enabled: boolean;
  autoPlay: boolean;
  quality: 'premium';
  voice_id?: string;
  rate: number;
  pitch: number;
  volume: number;
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}

interface DocumentData {
  id: string;
  fileName: string;
  fileUrl: string;
  content?: string;
  mimeType?: string;
}

interface DocumentChatInterfaceProps {
  document: DocumentData;
  userId: string;
}

const DocumentChatInterface: React.FC<DocumentChatInterfaceProps> = ({
  document,
  userId
}) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
  const [embeddingsGenerated, setEmbeddingsGenerated] = useState(false);
  const [embeddingStatus, setEmbeddingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  // TTS State - ElevenLabs with conversational voice
  const [ttsSettings, setTTSSettings] = useState<TTSSettings>({
    enabled: false, // Start disabled, user can enable with speaker button
    autoPlay: false, // Will be enabled when TTS is enabled
    quality: 'premium', // ElevenLabs only
    voice_id: 'EXAVITQu4vr4xnSDxMaL', // Rachel - warm, natural conversational voice
    rate: 1.0,
    pitch: 1.0,
    volume: 0.8,
    stability: 0.75,
    similarity_boost: 0.85,
    style: 0.2,
    use_speaker_boost: true,
  });
  const [showTTSSettings, setShowTTSSettings] = useState(false);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);

  // Generate embeddings on component mount
  useEffect(() => {
    if (document.content && !embeddingsGenerated) {
      generateEmbeddings();
    }
  }, [document.content, embeddingsGenerated]);

  // Handle auto-play for new AI messages
  useEffect(() => {
    if (ttsSettings.enabled && ttsSettings.autoPlay && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant' && !lastMessage.isLoading) {
        // Small delay to ensure the UI has updated
        const timer = setTimeout(() => {
          setCurrentlyPlayingId(lastMessage.id);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [messages, ttsSettings.enabled, ttsSettings.autoPlay]);

  const generateEmbeddings = useCallback(async () => {
    if (!document.content) return;

    setEmbeddingStatus('loading');
    try {
      const response = await fetch('/api/pinecone/embed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: document.content,
          documentId: document.id,
          fileName: document.fileName,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setEmbeddingsGenerated(true);
        setEmbeddingStatus('success');
        
        // Add welcome message
        const welcomeMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Hello! I've processed "${document.fileName}" and generated ${result.chunkCount} content chunks using ${result.method || 'vector embeddings'}. I'm ready to answer your questions about this document. You can ask me about specific content, request summaries, or extract key information like dates, people, places, and action items.`,
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate embeddings');
      }
    } catch (error) {
      console.error('Error generating embeddings:', error);
      setEmbeddingStatus('error');
      
      // Add fallback message even if embeddings fail
      const fallbackMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Hello! I'm having trouble processing "${document.fileName}" for semantic search, but I can still help answer questions about the document content using basic text analysis. Please ask me questions and I'll do my best to help!`,
        timestamp: new Date(),
      };
      setMessages([fallbackMessage]);
    }
  }, [document.content, document.id, document.fileName]);

  const sendMessage = useCallback(async () => {
    if (!currentMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: currentMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/pinecone/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userMessage.content,
          documentId: document.id,
          fileName: document.fileName,
          history: messages,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.response,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your message. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [currentMessage, isLoading, messages, document]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const performQuickAction = useCallback(async (action: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/pinecone/chat?documentId=${document.id}&fileName=${encodeURIComponent(document.fileName)}&action=${action}`,
        { method: 'GET' }
      );

      if (response.ok) {
        const result = await response.json();
        const actionMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: Array.isArray(result.result) 
            ? result.result.length > 0 
              ? result.result.join('\n')
              : `No ${action.replace('-', ' ')} found in this document.`
            : result.result,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, actionMessage]);
      }
    } catch (error) {
      console.error('Error performing quick action:', error);
    } finally {
      setIsLoading(false);
    }
  }, [document]);

  const quickActions = [
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: 'extract-dates', label: 'Dates', icon: Calendar },
    { id: 'extract-people', label: 'People', icon: Users },
    { id: 'extract-places', label: 'Places', icon: MapPin },
    { id: 'extract-action-items', label: 'Action Items', icon: CheckSquare },
  ];

  return (
    <div className="flex h-screen bg-transparent">
      {/* Document Viewer */}
      <div className={`transition-all duration-500 ease-in-out ${chatExpanded ? 'w-1/2' : 'w-full'} bg-black/30 backdrop-blur-xl border border-white/10 rounded-l-xl mx-4 mb-4 mt-2 overflow-hidden glass-morphism`}>
        <UniversalDocumentViewer 
          fileUrl={document.fileUrl} 
          fileName={document.fileName}
          mimeType={document.mimeType}
          content={document.content}
        />
      </div>

      {/* Chat Interface */}
      <div className={`transition-all duration-500 ease-in-out bg-black/30 backdrop-blur-xl border border-white/10 ${chatExpanded ? 'w-1/2 mr-4' : 'w-0'} flex flex-col rounded-r-xl mb-4 mt-2 overflow-hidden glass-morphism`}>
        {/* Chat Header */}
        {chatExpanded && (
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30">
                <MessageCircle className="h-5 w-5 text-purple-300" />
              </div>
              <div>
                <h3 className="font-semibold text-white">AI Assistant</h3>
                <p className="text-xs text-white/60">Powered by {embeddingStatus === 'success' ? 'Vector Search' : 'Local AI'}</p>
              </div>
              {embeddingStatus === 'loading' && (
                <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
              )}
            </div>
            <div className="flex items-center space-x-2">
              {/* TTS Toggle Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTTSSettings(prev => ({ 
                    ...prev, 
                    enabled: !prev.enabled,
                    autoPlay: !prev.enabled // Enable autoplay when TTS is enabled
                  }));
                  if (!ttsSettings.enabled) {
                    toast({
                      title: "TTS Enabled",
                      description: "Voice responses are now active with autoplay",
                      duration: 2000,
                    });
                  }
                }}
                className={`transition-all duration-200 ${
                  ttsSettings.enabled 
                    ? 'text-purple-300 hover:text-purple-200 hover:bg-purple-500/10 shadow-lg shadow-purple-500/20' 
                    : 'text-white/40 hover:text-white/60 hover:bg-white/10'
                }`}
                title={ttsSettings.enabled ? "Disable TTS & Autoplay" : "Enable TTS & Autoplay"}
              >
                {ttsSettings.enabled ? (
                  <Volume2 className="h-4 w-4 animate-pulse" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>

              {/* TTS Settings Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTTSSettings(!showTTSSettings)}
                className="text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200"
                title="TTS Settings"
              >
                <Settings className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setChatExpanded(false)}
                className="text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* TTS Settings Panel */}
        {chatExpanded && showTTSSettings && (
          <div className="p-4 bg-black/20 border-b border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-white">ElevenLabs TTS Settings</h4>
              <div className="text-xs text-white/60 flex items-center gap-1">
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span>
                Premium Voice
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Auto-play Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-white/80">Auto-play responses</label>
                <input
                  type="checkbox"
                  checked={ttsSettings.autoPlay}
                  onChange={(e) => setTTSSettings(prev => ({ ...prev, autoPlay: e.target.checked }))}
                  disabled={!ttsSettings.enabled}
                  className="rounded"
                />
              </div>

              {/* Voice Quality Indicator */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-white/80">Voice Quality</label>
                <div className="flex items-center gap-1 text-xs text-purple-300">
                  <span className="w-1 h-1 bg-purple-400 rounded-full animate-pulse"></span>
                  Premium
                </div>
              </div>
            </div>

            {/* Voice Selection */}
            <div className="space-y-2">
              <label className="text-xs text-white/80">Conversational Voice</label>
              <select
                value={ttsSettings.voice_id}
                onChange={(e) => setTTSSettings(prev => ({ ...prev, voice_id: e.target.value }))}
                disabled={!ttsSettings.enabled}
                className="w-full p-2 text-xs bg-black/30 border border-white/20 text-white rounded-lg backdrop-blur-sm"
              >
                <option value="EXAVITQu4vr4xnSDxMaL">🎵 Rachel (Warm, Natural)</option>
                <option value="pNInz6obpgDQGcFmaJgB">🎤 Adam (Deep, Engaging)</option>
                <option value="ErXwobaYiN019PkySvjV">👔 Antoni (Professional)</option>
                <option value="yoZ06aMxZJJ28mfd3POQ">😊 Sam (Casual, Friendly)</option>
              </select>
            </div>

            {/* Speed Control */}
            <div className="space-y-2">
              <label className="text-xs text-white/80">Speed: {ttsSettings.rate}x</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={ttsSettings.rate}
                onChange={(e) => setTTSSettings(prev => ({ ...prev, rate: parseFloat(e.target.value) }))}
                disabled={!ttsSettings.enabled}
                className="w-full accent-purple-500"
              />
            </div>

            {/* Volume Control */}
            <div className="space-y-2">
              <label className="text-xs text-white/80">Volume: {Math.round(ttsSettings.volume * 100)}%</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={ttsSettings.volume}
                onChange={(e) => setTTSSettings(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
                disabled={!ttsSettings.enabled}
                className="w-full accent-purple-500"
              />
            </div>

            {/* Info */}
            <div className="text-xs text-white/50 bg-black/20 p-2 rounded border border-white/10">
              <p><strong>ElevenLabs Premium TTS:</strong> Natural conversational voices</p>
              <p>• Rachel: Perfect for friendly conversations</p>
              <p>• Adam: Deep, professional male voice</p>
              <p>• Antoni: Clear, articulate narration</p>
              <p>• Sam: Casual, relaxed interactions</p>
            </div>
          </div>
        )}

        {chatExpanded && (
          <>
            {/* Embedding Status */}
            {embeddingStatus === 'loading' && (
              <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-white/10">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                    <div className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping"></div>
                  </div>
                  <div>
                    <span className="text-sm text-blue-300 font-medium">Processing document...</span>
                    <p className="text-xs text-white/60">Generating AI embeddings for intelligent search</p>
                  </div>
                </div>
              </div>
            )}

            {embeddingStatus === 'error' && (
              <div className="p-4 bg-gradient-to-r from-red-500/10 to-orange-500/10 border-b border-white/10">
                <div className="flex items-center space-x-3">
                  <div className="h-5 w-5 rounded-full bg-red-400/20 flex items-center justify-center">
                    <div className="h-2 w-2 bg-red-400 rounded-full"></div>
                  </div>
                  <div>
                    <p className="text-sm text-red-300 font-medium">Processing incomplete</p>
                    <p className="text-xs text-white/60">Using fallback mode - basic features available</p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            {embeddingStatus === 'success' && (
              <div className="p-4 border-b border-white/10 bg-black/10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-white/80 font-medium">Quick Actions</p>
                  <div className="h-1 w-1 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Button
                        key={action.id}
                        variant="outline"
                        size="sm"
                        onClick={() => performQuickAction(action.id)}
                        disabled={isLoading}
                        className="flex items-center space-x-2 bg-white/5 border-white/20 text-white/80 hover:bg-white/10 hover:text-white hover:border-white/30 transition-all duration-200 group"
                      >
                        <Icon className="h-3 w-3 group-hover:scale-110 transition-transform duration-200" />
                        <span className="text-xs">{action.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}
                >
                  <div
                    className={`max-w-[85%] p-4 rounded-2xl backdrop-blur-sm border transition-all duration-200 hover:scale-[1.02] ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-purple-600/80 to-pink-600/80 text-white border-purple-400/30 shadow-lg shadow-purple-500/20'
                        : 'bg-black/30 text-white border-white/20 shadow-lg shadow-black/20'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    
                    {/* TTS Controls for Assistant Messages */}
                    {message.role === 'assistant' && ttsSettings.enabled && !message.isLoading && (
                      <div className="mt-3 border-t border-white/20 pt-3 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-lg p-3 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Volume2 className="h-4 w-4 text-blue-400" />
                            <span className="text-xs font-medium text-white/80">Voice Response</span>
                            {ttsSettings.autoPlay && (
                              <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full border border-green-500/30">
                                Auto-play ON
                              </span>
                            )}
                            {currentlyPlayingId === message.id && (
                              <div className="flex items-center space-x-1">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span className="text-xs text-green-300">Playing</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <EnhancedTTSControls
                          text={message.content}
                          autoPlay={ttsSettings.autoPlay && message.id === messages[messages.length - 1]?.id}
                          onPlay={(provider) => {
                            setCurrentlyPlayingId(message.id);
                            console.log(`Playing message ${message.id} with ${provider}`);
                          }}
                          onStop={() => setCurrentlyPlayingId(null)}
                          onError={(error) => {
                            toast({
                              title: "TTS Error",
                              description: error,
                              variant: "destructive",
                            });
                          }}
                          className="scale-95"
                          enableAdvanced={false} // Simplified view in chat
                        />
                      </div>
                    )}
                    
                    <p className={`text-xs mt-2 ${
                      message.role === 'user' ? 'text-purple-100' : 'text-white/60'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                      {currentlyPlayingId === message.id && (
                        <span className="ml-2 inline-flex items-center">
                          <Volume2 className="w-3 h-3 mr-1" />
                          Playing
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start animate-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-black/30 border border-white/20 p-4 rounded-2xl backdrop-blur-sm">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Message Input */}
            {embeddingStatus === 'success' && (
              <div className="p-4 border-t border-white/10 bg-black/10 backdrop-blur-sm">
                <div className="flex space-x-3">
                  <div className="flex-1 relative">
                    <Textarea
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask me anything about this document..."
                      className="bg-black/30 border-white/20 text-white placeholder:text-white/50 focus:border-purple-400/50 focus:ring-purple-400/20 min-h-[60px] resize-none rounded-xl backdrop-blur-sm"
                      disabled={isLoading}
                    />
                    <div className="absolute bottom-2 right-2 text-xs text-white/40">
                      {currentMessage.length}/1000
                    </div>
                  </div>
                  <Button
                    onClick={sendMessage}
                    disabled={!currentMessage.trim() || isLoading}
                    className="px-5 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 rounded-xl shadow-lg shadow-purple-500/25 transition-all duration-200 hover:scale-105 hover:shadow-purple-500/40 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-white/60">
                  <span>Press Enter to send, Shift+Enter for new line</span>
                  <span className="flex items-center space-x-1">
                    <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
                    <span>AI Ready</span>
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Chat Toggle Button */}
      {!chatExpanded && (
        <Button
          onClick={() => setChatExpanded(true)}
          className="fixed right-6 bottom-6 rounded-full p-5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-2xl shadow-purple-500/50 transition-all duration-300 hover:scale-110 hover:shadow-purple-500/70 animate-pulse"
          size="lg"
        >
          <MessageCircle className="h-7 w-7" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"></div>
        </Button>
      )}
    </div>
  );
};

export default DocumentChatInterface;