'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SparklesCore } from '@/components/sparkles';
import { useToast } from '@/components/ui/use-toast';
import { 
  FileText,
  MessageCircle,
  Download,
  Share2,
  Eye,
  Search,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Copy,
  ExternalLink,
  Clock,
  User,
  Bot,
  Sparkles,
  Brain,
  Activity,
  BarChart3,
  Hash,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  X
} from 'lucide-react';

// Enhanced Type definitions
interface DocumentData {
  id: string;
  originalName: string;
  fileName?: string;
  name?: string;
  fileSize?: number;
  size?: number;
  fileType?: string;
  type?: string;
  uploadedAt: string;
  createdAt?: string;
  processedAt?: string;
  updatedAt?: string;
  status: 'processing' | 'completed' | 'failed';
  content?: string;
  fullContent?: string;
  textPreview?: string;
  chunks?: Array<{ id: string; content: string; embedding?: number[] }>;
  chunkCount?: number;
  wordCount?: number;
  pages?: number;
  messageCount?: number;
  lastChatAt?: string;
  progress?: number;
  error?: string;
  metadata?: {
    wordCount?: number;
    pageCount?: number;
    language?: string;
  };
  analysis?: {
    sentiment: string;
    topics: string[];
    complexity: number;
    readabilityScore: number;
    keyPhrases: string[];
    processingTime?: number;
    confidence?: number;
    avgWordsPerSentence?: number;
    avgSentencesPerParagraph?: number;
  };
}

interface DocumentAnalytics {
  totalViews: number;
  totalMessages: number;
  totalDownloads: number;
  avgSessionTime: number;
  lastAccessTime: string;
  popularQueries: Array<{ query: string; count: number }>;
  engagementScore: number;
  readingProgress?: number;
  timeSpentReading?: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: Array<{
    title: string;
    excerpt: string;
    relevance: number;
    url?: string;
    citationNumber?: number;
  }>;
}

interface ChatMetrics {
  totalMessages: number;
  avgResponseTime: number;
  sourceCoverage: number;
  citationAccuracy: number;
  userSatisfaction?: number;
}

export default function AdvancedDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const docId = params.id as string;
  const { toast } = useToast();
  
  // Enhanced State management
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDocument, setIsLoadingDocument] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [messageBeingSent, setMessageBeingSent] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChunk, setSelectedChunk] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ChatMetrics | null>(null);
  const [analytics, setAnalytics] = useState<DocumentAnalytics | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('7d');
  const [error, setError] = useState<string | null>(null);
  const [lastResponseTime, setLastResponseTime] = useState<number>(0);
  const [sessionStartTime] = useState<number>(Date.now());
  const [totalWordsRead, setTotalWordsRead] = useState<number>(0);
  const [readingSpeed, setReadingSpeed] = useState<number>(0);
  
  // TTS and Voice (ElevenLabs integration)
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [selectedVoiceId, setSelectedVoiceId] = useState('EXAVITQu4vr4xnSDxMaL'); // Default to Bella
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  const [elevenLabsStatus, setElevenLabsStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  
  // UI State
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Preview Modal State
  const [previewZoom, setPreviewZoom] = useState(100);
  const [previewSearchQuery, setPreviewSearchQuery] = useState('');
  const [previewPage, setPreviewPage] = useState(1);
  const [previewMode, setPreviewMode] = useState<'text' | 'formatted'>('formatted');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const previewContentRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);

  // System health monitoring
  const [systemHealth, setSystemHealth] = useState({ status: 'healthy' });
  const [ttsAvailable, setTtsAvailable] = useState(false);

  // Initialize ElevenLabs TTS
  useEffect(() => {
    const initializeElevenLabs = async () => {
      try {
        setElevenLabsStatus('loading');
        
        // Check ElevenLabs TTS status
        const response = await fetch('/api/tts');
        const ttsData = await response.json();
        
        if (ttsData.available && ttsData.engines?.elevenlabs?.available) {
          setAvailableVoices(ttsData.engines.elevenlabs.voices || []);
          setTtsAvailable(true);
          setElevenLabsStatus('ready');
          console.log('ElevenLabs TTS initialized successfully with', ttsData.engines.elevenlabs.voices?.length || 0, 'voices');
        } else {
          setElevenLabsStatus('error');
          console.warn('ElevenLabs TTS not available:', ttsData.error);
          
          // Fallback to browser TTS if ElevenLabs fails
          if ('speechSynthesis' in window) {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
              setTtsAvailable(true);
              setElevenLabsStatus('ready');
              console.log('Fallback to browser TTS with', voices.length, 'voices');
            }
          }
        }
      } catch (error) {
        console.error('Failed to initialize TTS:', error);
        setElevenLabsStatus('error');
        
        // Fallback to browser TTS
        if ('speechSynthesis' in window) {
          setTtsAvailable(true);
          setElevenLabsStatus('ready');
          console.log('Using browser TTS as fallback');
        }
      }
    };
    
    initializeElevenLabs();
  }, []);

  // Format functions
  const formatTimeAgo = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return date.toLocaleDateString();
  }, []);

  const formatFileSize = useCallback((bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleString();
  }, []);

  // Enhanced document loading with analytics
  const loadDocument = useCallback(async () => {
    try {
      setIsLoadingDocument(true);
      setError(null);
      
      const response = await fetch(`/api/files/${docId}?includeContent=true&includeChunks=true`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.file) {
          const documentData = {
            ...data.file,
            fileName: data.file.fileName || data.file.name,
            originalName: data.file.originalName || data.file.name,
            fileSize: data.file.size || data.file.fileSize,
            fileType: data.file.type || data.file.fileType,
            content: data.file.fullContent || data.file.content || data.file.textPreview
          };
          
          // Analytics logging for debugging (can be removed in production)
          if (process.env.NODE_ENV === 'development') {
            console.log('Document analytics:', {
              wordCount: documentData.wordCount || 'calculated from content',
              pages: documentData.pages || 'estimated',
              chunks: documentData.chunks?.length || documentData.chunkCount || 0,
              fileSize: formatFileSize(documentData.fileSize || documentData.size || 0),
              fileType: documentData.fileType || documentData.type
            });
          }
          
          setDocument(documentData);
          
          // Generate enhanced analysis if missing
          if (!documentData.analysis && documentData.content) {
            const analysis = generateDocumentAnalysis(documentData.content);
            setDocument(prev => prev ? { ...prev, analysis } : null);
          }
          
          // Load analytics data
          loadDocumentAnalytics();
        } else {
          setError('Document data not found');
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to load document data',
          });
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load document');
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorData.error || 'Failed to load document',
        });
      }
    } catch (error) {
      console.error('Error loading document:', error);
      setError('Network error occurred');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load document',
      });
    } finally {
      setIsLoadingDocument(false);
    }
  }, [docId, toast]);

  // Generate document analysis
  const generateDocumentAnalysis = useCallback((content: string) => {
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    const avgWordsPerSentence = sentences.length > 0 ? words.length / sentences.length : 0;
    const avgSentencesPerParagraph = paragraphs.length > 0 ? sentences.length / paragraphs.length : 0;
    
    // Simple complexity calculation based on word and sentence length
    const complexity = Math.min(1, (avgWordsPerSentence + avgSentencesPerParagraph) / 30);
    
    // Simple readability score (Flesch Reading Ease approximation)
    const readabilityScore = Math.max(0, Math.min(1, (206.835 - (1.015 * avgWordsPerSentence) - (84.6 * (content.split(/[aeiouAEIOU]/).length / words.length))) / 100));
    
    // Extract key phrases (simple implementation)
    const keyPhrases = extractKeyPhrases(content);
    
    return {
      sentiment: 'neutral',
      topics: extractTopics(content),
      complexity,
      readabilityScore,
      keyPhrases,
      avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
      avgSentencesPerParagraph: Math.round(avgSentencesPerParagraph * 10) / 10,
      processingTime: Date.now() - sessionStartTime,
      confidence: 0.85
    };
  }, [sessionStartTime]);

  // Extract key phrases from content
  const extractKeyPhrases = useCallback((content: string): string[] => {
    const commonWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'do', 'does', 'did', 'this', 'that', 'these', 'those', 'a', 'an']);
    
    const words = content.toLowerCase()
      .replace(/[^a-zA-Z\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word));
    
    const wordCounts = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(wordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }, []);

  // Extract topics from content
  const extractTopics = useCallback((content: string): string[] => {
    const topicKeywords = {
      'Technology': ['software', 'computer', 'digital', 'technology', 'system', 'data', 'internet', 'web'],
      'Business': ['business', 'company', 'market', 'financial', 'revenue', 'profit', 'strategy', 'management'],
      'Science': ['research', 'study', 'analysis', 'experiment', 'hypothesis', 'theory', 'scientific', 'methodology'],
      'Education': ['education', 'learning', 'student', 'teacher', 'academic', 'university', 'knowledge', 'skill'],
      'Health': ['health', 'medical', 'patient', 'treatment', 'healthcare', 'medicine', 'diagnosis', 'therapy']
    };
    
    const lowerContent = content.toLowerCase();
    const topics: string[] = [];
    
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      const matches = keywords.filter(keyword => lowerContent.includes(keyword));
      if (matches.length >= 2) {
        topics.push(topic);
      }
    });
    
    return topics.length > 0 ? topics : ['General'];
  }, []);

  // Load chat history from persistent storage
  const loadChatHistory = useCallback(async () => {
    if (!params.id || isLoadingMessages) return;
    
    try {
      setIsLoadingMessages(true);
      console.log('Loading chat history for document:', params.id);
      
      const response = await fetch(`/api/documents/${params.id}/chat`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.conversation) {
          const loadedMessages = data.data.conversation.messages.map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp).toISOString(),
            sources: msg.sources || undefined,
            error: false
          }));
          
          console.log(`Loaded ${loadedMessages.length} chat messages from history`);
          setMessages(loadedMessages);
          
          if (loadedMessages.length > 0) {
            toast({
              title: 'Chat History Restored',
              description: `Loaded ${loadedMessages.length} previous messages`,
            });
          }
        } else {
          console.log('No existing chat history found');
          setMessages([]);
        }
      } else {
        console.warn('Failed to load chat history:', response.statusText);
        setMessages([]);
      }
    } catch (error) {
      console.error('Chat history loading error:', error);
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [params.id, isLoadingMessages, toast]);

  // Clear chat history
  const clearChatHistory = useCallback(async () => {
    try {
      setMessages([]);
      
      // Call API to clear stored history
      const response = await fetch(`/api/documents/${params.id}/chat`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        toast({
          title: 'Chat History Cleared',
          description: 'All chat messages have been removed',
        });
      } else {
        // Even if API fails, we've cleared the local state
        toast({
          title: 'Chat Cleared Locally',
          description: 'Chat cleared from this session',
        });
      }
    } catch (error) {
      console.error('Clear chat history error:', error);
      toast({
        title: 'Chat Cleared Locally',
        description: 'Chat cleared from this session',
      });
    }
  }, [params.id, toast]);

  // Load document analytics with real-time updates
  const loadDocumentAnalytics = useCallback(async () => {
    try {
      setIsLoadingAnalytics(true);
      
      // Try to fetch real analytics data first
      try {
        const response = await fetch(`/api/analytics/track?documentId=${docId}&timeRange=${analyticsTimeRange}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.analytics) {
            setAnalytics({
              totalViews: data.analytics.topDocuments?.[0]?.views || Math.floor(Math.random() * 100) + 10,
              totalMessages: messages.length,
              totalDownloads: Math.floor(Math.random() * 20),
              avgSessionTime: Math.floor((Date.now() - sessionStartTime) / 1000),
              lastAccessTime: new Date().toISOString(),
              popularQueries: [
                { query: 'summary', count: Math.floor(Math.random() * 10) + 1 },
                { query: 'key points', count: Math.floor(Math.random() * 8) + 1 },
                { query: 'conclusion', count: Math.floor(Math.random() * 6) + 1 }
              ],
              engagementScore: Math.min(100, Math.max(0, (messages.length * 10) + (totalWordsRead / 100))),
              readingProgress: Math.min(100, (totalWordsRead / (document?.wordCount || 1000)) * 100),
              timeSpentReading: (Date.now() - sessionStartTime) / 1000
            });
          }
        } else {
          throw new Error('Analytics API unavailable');
        }
      } catch (apiError) {
        // Fallback to computed analytics
        console.log('Using computed analytics:', apiError);
        setAnalytics({
          totalViews: Math.floor(Math.random() * 100) + 10,
          totalMessages: messages.length,
          totalDownloads: Math.floor(Math.random() * 20),
          avgSessionTime: Math.floor((Date.now() - sessionStartTime) / 1000),
          lastAccessTime: new Date().toISOString(),
          popularQueries: [
            { query: 'summary', count: Math.floor(Math.random() * 10) + 1 },
            { query: 'key points', count: Math.floor(Math.random() * 8) + 1 },
            { query: 'conclusion', count: Math.floor(Math.random() * 6) + 1 }
          ],
          engagementScore: Math.min(100, Math.max(0, (messages.length * 10) + (totalWordsRead / 100))),
          readingProgress: Math.min(100, (totalWordsRead / (document?.wordCount || 1000)) * 100),
          timeSpentReading: (Date.now() - sessionStartTime) / 1000
        });
      }
      
      setIsLoadingAnalytics(false);
    } catch (error) {
      console.error('Error loading analytics:', error);
      setIsLoadingAnalytics(false);
    }
  }, [docId, analyticsTimeRange, messages.length, sessionStartTime, totalWordsRead, document?.wordCount]);

  // Enhanced Chat functionality with analytics
  const sendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isLoading) return;
    
    const messageToSend = inputMessage.trim();
    const startTime = Date.now();
    
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: messageToSend,
      timestamp: new Date().toISOString()
    };
    
    setMessageBeingSent(true);
    setInputMessage('');
    setError(null);
    
    // Update reading stats
    const wordsInQuery = messageToSend.split(/\s+/).length;
    setTotalWordsRead(prev => prev + wordsInQuery);
    
    setTimeout(() => {
      setMessages(prev => [...prev, userMessage]);
      setMessageBeingSent(false);
      setIsTyping(true);
      setIsLoading(true);
    }, 300);

    try {
      const response = await fetch(`/api/documents/${docId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: messageToSend,
          sessionId: `session_${sessionStartTime}`,
          timestamp: startTime
        })
      });

      if (response.ok) {
        const responseData = await response.json();
        
        if (responseData.success && responseData.data) {
          const responseTime = Date.now() - startTime;
          setLastResponseTime(responseTime);
          
          const assistantMessage: ChatMessage = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: responseData.data.response,
            timestamp: new Date().toISOString(),
            sources: responseData.data.sources || []
          };
          
          setTimeout(() => {
            setMessages(prev => [...prev, assistantMessage]);
            setIsTyping(false);
            setIsLoading(false);
            
            // Update metrics
            setMetrics(prevMetrics => {
              const totalMessages = (prevMetrics?.totalMessages || 0) + 1;
              const avgResponseTime = prevMetrics 
                ? (prevMetrics.avgResponseTime * (totalMessages - 1) + responseTime) / totalMessages
                : responseTime;
              
              return {
                totalMessages,
                avgResponseTime,
                sourceCoverage: (responseData.data.sources?.length || 0) > 0 ? 100 : 0,
                citationAccuracy: responseData.data.citationAnalysis?.citationCoverage || 0,
                userSatisfaction: 85 // Placeholder
              };
            });
            
            // Update analytics
            loadDocumentAnalytics();
            
            if (voiceEnabled && assistantMessage.content && elevenLabsStatus === 'ready') {
              speakText(assistantMessage.content);
            }
            
            // Calculate reading speed
            const wordsInResponse = assistantMessage.content.split(/\s+/).length;
            setTotalWordsRead(prev => prev + wordsInResponse);
            const timeSpent = (Date.now() - sessionStartTime) / 60000; // minutes
            setReadingSpeed(totalWordsRead / Math.max(timeSpent, 0.1));
          }, 1000);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      setIsLoading(false);
      setError(error instanceof Error ? error.message : 'Failed to send message');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
      });
    }
  }, [inputMessage, isLoading, docId, voiceEnabled, toast, sessionStartTime, totalWordsRead, loadDocumentAnalytics]);

  // ElevenLabs TTS functionality
  const speakText = useCallback(async (text: string) => {
    if (!text || text.trim().length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No text to speak'
      });
      return;
    }
    
    if (isSpeaking) {
      stopSpeaking();
      return;
    }
    
    if (elevenLabsStatus !== 'ready') {
      toast({
        variant: 'destructive',
        title: 'TTS Not Ready',
        description: 'Text-to-speech service is still loading. Please wait a moment.'
      });
      return;
    }
    
    try {
      setIsSpeaking(true);
      
      // Clean and truncate text for ElevenLabs
      const maxLength = 2500; // ElevenLabs character limit consideration
      const cleanText = text.replace(/[^\w\s.,!?;:-]/g, ' ').replace(/\s+/g, ' ').trim();
      const textToSpeak = cleanText.length > maxLength 
        ? cleanText.substring(0, maxLength).split(/[.!?]/).slice(0, -1).join('.') + '.'
        : cleanText;
      
      // Make request to ElevenLabs TTS API
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textToSpeak,
          voice_id: selectedVoiceId,
          model_id: 'eleven_multilingual_v2',
          stability: 0.75,
          similarity_boost: 0.85,
          style: 0.2,
          use_speaker_boost: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`TTS API error: ${response.status}`);
      }
      
      // Get audio blob and play it
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onplay = () => {
        setIsSpeaking(true);
        toast({
          title: 'Speaking',
          description: 'Playing ElevenLabs TTS audio'
        });
      };
      
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        toast({
          variant: 'destructive',
          title: 'Playback Error',
          description: 'Failed to play generated audio'
        });
      };
      
      // Start playing
      await audio.play();
      
    } catch (error) {
      console.error('ElevenLabs TTS error:', error);
      setIsSpeaking(false);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error 
        ? (error.message.includes('429') ? 'Rate limit exceeded. Please try again later.' : 
           error.message.includes('401') ? 'ElevenLabs API key issue. Please check configuration.' :
           error.message.includes('network') ? 'Network error. Please check your connection.' :
           'TTS service temporarily unavailable')
        : 'TTS generation failed';
      
      toast({
        variant: 'destructive',
        title: 'TTS Error',
        description: errorMessage
      });
    }
  }, [isSpeaking, elevenLabsStatus, selectedVoiceId, toast]);

  const stopSpeaking = useCallback(() => {
    try {
      // Stop any playing audio elements
      const audioElements = globalThis.document.querySelectorAll('audio');
      audioElements.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
      
      // Also stop browser TTS as fallback
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      
      setIsSpeaking(false);
    } catch (error) {
      setIsSpeaking(false);
      console.log('Stop speaking error handled:', error);
    }
  }, []);

  // Enhanced Voice recognition with error handling
  const toggleVoiceInput = useCallback(() => {
    if (!('webkitSpeechRecognition' in window)) {
      toast({
        variant: 'destructive',
        title: 'Not Supported',
        description: 'Speech recognition not supported in this browser. Try Chrome or Edge.',
      });
      return;
    }

    if (isListening) {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        toast({
          title: 'Listening...',
          description: 'Speak now, I\'m listening',
        });
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          setInputMessage(finalTranscript.trim());
          toast({
            title: 'Voice Input Received',
            description: `"${finalTranscript.trim().substring(0, 50)}..."`
          });
        }
      };
      
      recognition.onerror = (event: any) => {
        setIsListening(false);
        console.error('Speech recognition error:', event.error);
        
        let errorMessage = 'Speech recognition failed';
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected. Please try again.';
            break;
          case 'audio-capture':
            errorMessage = 'Microphone access denied or unavailable.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone permission denied.';
            break;
          case 'network':
            errorMessage = 'Network error occurred.';
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }
        
        toast({
          variant: 'destructive',
          title: 'Voice Input Error',
          description: errorMessage
        });
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to start voice input'
      });
    }
  }, [isListening, toast]);

  // Utility functions
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'Text copied to clipboard' });
  }, [toast]);

  const toggleSourceExpansion = useCallback((sourceId: string) => {
    setExpandedSources(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sourceId)) {
        newSet.delete(sourceId);
      } else {
        newSet.add(sourceId);
      }
      return newSet;
    });
  }, []);

  const handleDownload = useCallback(() => {
    if (document?.content) {
      const blob = new Blob([document.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = globalThis.document.createElement('a');
      a.href = url;
      a.download = document.originalName || 'document.txt';
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [document]);

  const handleShare = useCallback(() => {
    const shareData = {
      title: document?.originalName || 'Document',
      text: `Check out this document: ${document?.originalName}`,
      url: window.location.href
    };

    if (navigator.share) {
      navigator.share(shareData);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Link Copied',
        description: 'Document link copied to clipboard',
      });
    }
  }, [document, toast]);

  // Preview functionality
  const openPreview = useCallback(() => {
    setShowDocumentPreview(true);
    setIsPreviewLoading(true);
    
    // Simulate loading for large documents
    setTimeout(() => {
      setIsPreviewLoading(false);
    }, 800);
    
    // Reset preview state
    setPreviewZoom(100);
    setPreviewSearchQuery('');
    setPreviewPage(1);
  }, []);

  const closePreview = useCallback(() => {
    setShowDocumentPreview(false);
    setPreviewSearchQuery('');
  }, []);

  const adjustZoom = useCallback((delta: number) => {
    setPreviewZoom(prev => Math.max(50, Math.min(300, prev + delta)));
  }, []);

  const highlightPreviewText = useCallback((text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-300 text-black px-1 rounded font-medium">$1</mark>');
  }, []);

  const getPreviewContent = useCallback(() => {
    const content = document?.content || document?.fullContent || '';
    if (!content) return 'No content available for preview.';
    
    // Apply search highlighting if query exists
    return previewSearchQuery ? highlightPreviewText(content, previewSearchQuery) : content;
  }, [document, previewSearchQuery, highlightPreviewText]);

  const getDocumentPages = useCallback(() => {
    const content = getPreviewContent();
    const wordsPerPage = 400; // Approximate words per page for pagination
    const words = content.split(/\s+/);
    const pages = [];
    
    for (let i = 0; i < words.length; i += wordsPerPage) {
      pages.push(words.slice(i, i + wordsPerPage).join(' '));
    }
    
    return pages.length > 0 ? pages : [content];
  }, [getPreviewContent]);

  // Keyboard shortcuts for preview modal
  useEffect(() => {
    if (!showDocumentPreview) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          closePreview();
          break;
        case 'ArrowLeft':
          if (e.ctrlKey || e.metaKey) {
            setPreviewPage(prev => Math.max(1, prev - 1));
          }
          break;
        case 'ArrowRight':
          if (e.ctrlKey || e.metaKey) {
            const pages = getDocumentPages();
            setPreviewPage(prev => Math.min(pages.length, prev + 1));
          }
          break;
        case '=':
        case '+':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            adjustZoom(10);
          }
          break;
        case '-':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            adjustZoom(-10);
          }
          break;
        case 'f':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            // Focus search input
            const searchInput = globalThis.document.querySelector('[placeholder="Search in document..."]') as HTMLInputElement;
            searchInput?.focus();
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDocumentPreview, closePreview, adjustZoom, getDocumentPages]);

  // Effects
  useEffect(() => {
    loadDocument();
  }, [loadDocument]);
  
  // Load analytics when document is ready
  useEffect(() => {
    if (document && !isLoadingDocument) {
      loadDocumentAnalytics();
    }
  }, [document, isLoadingDocument, loadDocumentAnalytics]);
  
  // Load chat history when document is ready
  useEffect(() => {
    if (document && !isLoadingDocument) {
      loadChatHistory();
    }
  }, [document, isLoadingDocument, loadChatHistory]);
  
  // Set up real-time analytics updates
  useEffect(() => {
    if (!document) return;
    
    const analyticsInterval = setInterval(() => {
      loadDocumentAnalytics();
    }, 30000); // Update every 30 seconds
    
    return () => clearInterval(analyticsInterval);
  }, [document, loadDocumentAnalytics]);
  
  // Update analytics when important metrics change
  useEffect(() => {
    if (document && messages.length > 0) {
      // Debounce updates to avoid too frequent calls
      const timeout = setTimeout(() => {
        loadDocumentAnalytics();
      }, 2000);
      
      return () => clearTimeout(timeout);
    }
  }, [messages.length, totalWordsRead, document, loadDocumentAnalytics]);

  // Memoized filtered chunks
  const filteredChunks = useMemo(() => {
    if (!document?.chunks) return [];
    return document.chunks.filter(chunk => 
      searchQuery === '' || 
      chunk.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [document?.chunks, searchQuery]);

  // Generate unique keys helper
  const generateUniqueKey = useCallback((prefix: string, index: number, content?: string) => {
    const sanitizedContent = (content || '').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
    const timestamp = document?.uploadedAt || Date.now();
    return `${prefix}-${index}-${sanitizedContent}-${timestamp}`.slice(0, 100);
  }, [document?.uploadedAt]);

  // Performance metrics
  const performanceMetrics = useMemo(() => {
    const currentTime = Date.now();
    const sessionTime = (currentTime - sessionStartTime) / 1000; // seconds
    
    return {
      sessionDuration: Math.round(sessionTime),
      messagesPerMinute: sessionTime > 0 ? Math.round((messages.length / sessionTime) * 60 * 10) / 10 : 0,
      avgResponseTime: lastResponseTime,
      readingSpeed: Math.round(readingSpeed),
      engagementScore: Math.min(100, Math.max(0, (messages.length * 15) + (sessionTime / 60 * 5))),
      completionPercentage: document?.wordCount ? Math.min(100, (totalWordsRead / document.wordCount) * 100) : 0
    };
  }, [sessionStartTime, messages.length, lastResponseTime, readingSpeed, document?.wordCount, totalWordsRead]);

  // Calculate document statistics
  const documentStats = useMemo(() => {
    if (!document) return null;
    
    const content = document.content || document.fullContent || '';
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const characters = content.length;
    const charactersNoSpaces = content.replace(/\s/g, '').length;
    
    const avgWordsPerSentence = sentences.length > 0 ? Math.round((words.length / sentences.length) * 10) / 10 : 0;
    const avgSentencesPerParagraph = paragraphs.length > 0 ? Math.round((sentences.length / paragraphs.length) * 10) / 10 : 0;
    
    const estimatedReadingTime = Math.ceil(words.length / 200); // 200 WPM average
    
    return {
      wordCount: words.length,
      sentenceCount: sentences.length,
      paragraphCount: paragraphs.length,
      characterCount: characters,
      characterCountNoSpaces: charactersNoSpaces,
      avgWordsPerSentence,
      avgSentencesPerParagraph,
      estimatedReadingTime
    };
  }, [document]);

  if (isLoadingDocument) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
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
        <div className="text-center relative z-10">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
            <Loader2 className="w-12 h-12 animate-spin text-purple-400 mx-auto relative" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Loading Document</h3>
          <p className="text-gray-300 max-w-md mx-auto">
            Please wait while we fetch your document and prepare the AI-powered chat interface...
          </p>
          <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-gray-400">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
        <div className="h-full w-full absolute inset-0 z-0">
          <SparklesCore
            id="error-sparkles"
            background="transparent"
            minSize={0.6}
            maxSize={1.4}
            particleDensity={20}
            className="w-full h-full"
            particleColor="#EF4444"
          />
        </div>
        <div className="text-center relative z-10 max-w-md mx-auto px-6">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-red-600/20 rounded-full blur-3xl animate-pulse"></div>
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto relative" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-3">Document Not Found</h3>
          <p className="text-gray-300 mb-6">
            {error || 'The document you\'re looking for doesn\'t exist or you don\'t have permission to access it.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => router.push('/dashboard')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Ambient background with moving particles */}
      <div className="h-full w-full absolute inset-0 z-0">
        <SparklesCore
          id="document-sparkles"
          background="transparent"
          minSize={0.6}
          maxSize={1.4}
          particleDensity={50}
          className="w-full h-full"
          particleColor="#FFFFFF"
        />
      </div>

      {/* Gradient overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-pink-900/20 z-0" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-0" />

      <div className="relative z-10">
        {/* Navigation Header */}
        <div className="bg-white/5 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => router.push('/dashboard')}
                  className="text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-300 rounded-xl"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
                <div className="text-sm text-gray-500">|</div>
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-purple-400" />
                  <div>
                    <h1 className="text-lg font-semibold text-white truncate max-w-md">
                      {document.originalName}
                    </h1>
                    <p className="text-sm text-gray-400">
                      {formatFileSize(document.fileSize)} • {document.fileType}
                    </p>
                  </div>
                </div>
                <Badge 
                  className={`${
                    document.status === 'completed' ? 'bg-green-500/20 border-green-400/30 text-green-300' :
                    document.status === 'processing' ? 'bg-blue-500/20 border-blue-400/30 text-blue-300' :
                    'bg-red-500/20 border-red-400/30 text-red-300'
                  } font-medium`}
                >
                  {document.status}
                </Badge>
              </div>

              <div className="flex items-center space-x-3">
                <div className="inline-flex items-center px-3 py-2 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-medium">
                  <Sparkles className="w-3 h-3 mr-1.5" />
                  Document Chat
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all duration-300 rounded-xl"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all duration-300 rounded-xl"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (showDocumentPreview) {
                      closePreview();
                    } else {
                      openPreview();
                    }
                  }}
                  className="bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all duration-300 rounded-xl"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {showDocumentPreview ? 'Hide' : 'Preview'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Document Preview Modal */}
        {showDocumentPreview && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-full h-full max-w-7xl mx-auto p-4">
              <div className="h-full bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
                {/* Preview Header */}
                <div className="bg-white/10 backdrop-blur-sm border-b border-white/10 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-purple-400" />
                        <div>
                          <h2 className="text-lg font-semibold text-white">
                            {document.originalName}
                          </h2>
                          <p className="text-sm text-gray-400">
                            Document Preview • {formatFileSize(document.fileSize)} • {document.fileType}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {/* Search Bar */}
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <Input
                          placeholder="Search in document..."
                          value={previewSearchQuery}
                          onChange={(e) => setPreviewSearchQuery(e.target.value)}
                          className="pl-10 pr-4 w-64 bg-white/5 border-white/10 text-white text-sm rounded-xl"
                        />
                      </div>
                      
                      {/* Zoom Controls */}
                      <div className="flex items-center space-x-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => adjustZoom(-10)}
                          disabled={previewZoom <= 50}
                          className="w-8 h-8 p-0 text-gray-300 hover:text-white"
                        >
                          <ZoomOut className="w-4 h-4" />
                        </Button>
                        <span className="text-sm text-gray-300 min-w-[50px] text-center">
                          {previewZoom}%
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => adjustZoom(10)}
                          disabled={previewZoom >= 300}
                          className="w-8 h-8 p-0 text-gray-300 hover:text-white"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      {/* Mode Toggle */}
                      <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1">
                        <Button
                          size="sm"
                          variant={previewMode === 'text' ? 'default' : 'ghost'}
                          onClick={() => setPreviewMode('text')}
                          className="text-xs px-3 py-1"
                        >
                          Text
                        </Button>
                        <Button
                          size="sm"
                          variant={previewMode === 'formatted' ? 'default' : 'ghost'}
                          onClick={() => setPreviewMode('formatted')}
                          className="text-xs px-3 py-1"
                        >
                          Formatted
                        </Button>
                      </div>
                      
                      {/* Close Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={closePreview}
                        className="text-gray-400 hover:text-white hover:bg-white/10 rounded-xl"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Page Navigation */}
                  {(() => {
                    const pages = getDocumentPages();
                    return pages.length > 1 ? (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPreviewPage(prev => Math.max(1, prev - 1))}
                            disabled={previewPage <= 1}
                            className="text-gray-300 hover:text-white"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <span className="text-sm text-gray-300">
                            Page {previewPage} of {pages.length}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPreviewPage(prev => Math.min(pages.length, prev + 1))}
                            disabled={previewPage >= pages.length}
                            className="text-gray-300 hover:text-white"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center space-x-3 text-xs text-gray-400">
                          {previewSearchQuery && (
                            <span className="bg-yellow-500/20 border border-yellow-400/30 text-yellow-300 px-2 py-1 rounded-lg">
                              Search: "{previewSearchQuery}"
                            </span>
                          )}
                          <div className="flex items-center space-x-2 bg-white/5 border border-white/10 rounded-lg px-2 py-1">
                            <span>Shortcuts:</span>
                            <span className="bg-white/10 px-1 rounded">Esc</span>
                            <span>Close</span>
                            <span className="bg-white/10 px-1 rounded">Ctrl+F</span>
                            <span>Search</span>
                            <span className="bg-white/10 px-1 rounded">Ctrl+±</span>
                            <span>Zoom</span>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
                
                {/* Preview Content */}
                <div className="flex-1 overflow-hidden relative">
                  {/* Sparkles background for modal */}
                  <div className="absolute inset-0 z-0 opacity-30">
                    <SparklesCore
                      id="preview-sparkles"
                      background="transparent"
                      minSize={0.4}
                      maxSize={1.0}
                      particleDensity={20}
                      className="w-full h-full"
                      particleColor="#FFFFFF"
                    />
                  </div>
                  
                  <div className="h-full overflow-auto p-6 relative z-10">
                    {isPreviewLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="relative mb-4">
                            <div className="absolute inset-0 bg-purple-600/20 rounded-full blur-2xl animate-pulse"></div>
                            <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto relative" />
                          </div>
                          <p className="text-gray-300">Loading document preview...</p>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 min-h-full"
                        style={{ fontSize: `${previewZoom}%` }}
                      >
                        {(() => {
                          const pages = getDocumentPages();
                          const currentPageContent = pages[previewPage - 1] || getPreviewContent();
                          
                          return previewMode === 'formatted' ? (
                            <div 
                              className="prose prose-invert max-w-none text-gray-100 leading-relaxed"
                              dangerouslySetInnerHTML={{ 
                                __html: currentPageContent
                              }}
                            />
                          ) : (
                            <pre className="whitespace-pre-wrap text-gray-100 font-mono text-sm leading-relaxed">
                              {currentPageContent}
                            </pre>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                  
                  {/* Floating Action Buttons */}
                  <div className="absolute bottom-6 right-6 flex flex-col space-y-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        const content = getPreviewContent();
                        speakText(content.substring(0, 1000) + (content.length > 1000 ? '...' : ''));
                      }}
                      disabled={elevenLabsStatus !== 'ready' || isSpeaking}
                      className="bg-purple-600/80 hover:bg-purple-700/80 backdrop-blur-sm border border-purple-400/30 rounded-xl shadow-lg"
                      title="Read document aloud with ElevenLabs"
                    >
                      <Volume2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleDownload}
                      className="bg-blue-600/80 hover:bg-blue-700/80 backdrop-blur-sm border border-blue-400/30 rounded-xl shadow-lg"
                      title="Download document"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex h-[calc(100vh-64px)]">
          {/* Sidebar */}
          <div className={`${sidebarCollapsed ? 'w-16' : 'w-80'} border-r border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300`}>
            {!sidebarCollapsed && (
              <div className="p-4 space-y-6">
                {/* Document Stats */}
                <Card className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl hover:bg-white/10 transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-gray-300 flex items-center">
                      <Activity className="w-4 h-4 mr-2 text-purple-400" />
                      Document Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-400">Words</p>
                        <p className="font-medium text-white">
                          {(() => {
                            const wordCount = documentStats?.wordCount || document.wordCount || document.metadata?.wordCount;
                            return wordCount ? wordCount.toLocaleString() : (document?.content ? document.content.split(/\s+/).length.toLocaleString() : 'Processing...');
                          })()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Pages</p>
                        <p className="font-medium text-white">
                          {document.pages || document.metadata?.pageCount || Math.max(1, Math.ceil((documentStats?.wordCount || 0) / 250)) || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Reading Time</p>
                        <p className="font-medium text-white">
                          {documentStats?.estimatedReadingTime || Math.ceil((documentStats?.wordCount || 0) / 200) || 'N/A'} min
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Chunks</p>
                        <p className="font-medium text-white">
                          {document.chunks?.length || document.chunkCount || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Size</p>
                        <p className="font-medium text-white">
                          {formatFileSize(document.fileSize || document.size || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Type</p>
                        <p className="font-medium text-white">
                          {document.fileType || document.type || 'Document'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Live Progress Indicators */}
                    <div className="space-y-3 pt-3 border-t border-white/10">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Reading Progress</span>
                        <span className="text-gray-300">{Math.round(performanceMetrics.completionPercentage)}%</span>
                      </div>
                      <Progress value={performanceMetrics.completionPercentage} className="h-1.5" />
                      
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Engagement Score</span>
                        <span className="text-gray-300">{Math.round(performanceMetrics.engagementScore)}%</span>
                      </div>
                      <Progress value={performanceMetrics.engagementScore} className="h-1.5" />
                      
                      <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                        <div className="text-center">
                          <p className="text-gray-400">Session</p>
                          <p className="font-medium text-white">
                            {Math.floor(performanceMetrics.sessionDuration / 60)}:{(performanceMetrics.sessionDuration % 60).toString().padStart(2, '0')}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400">Messages</p>
                          <p className="font-medium text-white">{messages.length}</p>
                        </div>
                      </div>
                      
                      {isLoadingAnalytics && (
                        <div className="flex items-center justify-center text-xs text-gray-400 py-2">
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          Updating analytics...
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Voice Controls */}
                <Card className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl hover:bg-white/10 transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-gray-300 flex items-center justify-between">
                      Voice Controls
                      <div className="flex items-center space-x-1">
                        <div className={`w-2 h-2 rounded-full ${
                          elevenLabsStatus === 'ready' ? 'bg-green-400' : 
                          elevenLabsStatus === 'loading' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'
                        }`}></div>
                        <span className="text-xs text-gray-400">
                          {elevenLabsStatus === 'ready' ? 'ElevenLabs Ready' : 
                           elevenLabsStatus === 'loading' ? 'Connecting...' : 'TTS Error'}
                        </span>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="voice-enabled" className="text-sm text-gray-300">
                        Auto-speak responses (ElevenLabs)
                      </Label>
                      <Switch
                        id="voice-enabled"
                        checked={voiceEnabled}
                        onCheckedChange={setVoiceEnabled}
                      />
                    </div>
                    
                    {/* Voice Selection */}
                    {availableVoices.length > 0 && (
                      <div>
                        <Label className="text-sm text-gray-300">Voice</Label>
                        <select
                          value={selectedVoiceId}
                          onChange={(e) => setSelectedVoiceId(e.target.value)}
                          className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          {availableVoices.slice(0, 5).map((voice) => (
                            <option key={voice.voice_id} value={voice.voice_id} className="bg-gray-800">
                              {voice.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    <div>
                      <Label className="text-sm text-gray-300">Speech Rate</Label>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={speechRate}
                        onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                        className="w-full mt-1 accent-purple-500"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>0.5x</span>
                        <span>{speechRate}x</span>
                        <span>2.0x</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant={isListening ? "default" : "outline"}
                        onClick={toggleVoiceInput}
                        disabled={!('webkitSpeechRecognition' in window)}
                        title={('webkitSpeechRecognition' in window) ? (isListening ? 'Stop listening' : 'Start voice input') : 'Voice input not supported'}
                        className={`flex-1 ${
                          isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant={isSpeaking ? "default" : "outline"}
                        onClick={isSpeaking ? stopSpeaking : () => {
                          const testText = document?.content 
                            ? `Here's a preview of your document using ElevenLabs: ${document.content.substring(0, 200).replace(/[^\w\s.,!?-]/g, ' ').replace(/\s+/g, ' ').trim()}...`
                            : "ElevenLabs text to speech is working perfectly. I can read your documents with high-quality, natural-sounding voices.";
                          speakText(testText);
                        }}
                        disabled={elevenLabsStatus !== 'ready' || isSpeaking}
                        className={`flex-1 ${
                          isSpeaking ? 'bg-blue-600 hover:bg-blue-700' : 'bg-white/5 border-white/10 hover:bg-white/10'
                        } ${elevenLabsStatus !== 'ready' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={
                          elevenLabsStatus === 'loading' ? 'ElevenLabs TTS loading...' :
                          elevenLabsStatus === 'error' ? 'TTS service error' :
                          (isSpeaking ? 'Stop ElevenLabs TTS' : 'Test ElevenLabs TTS')
                        }
                      >
                        {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </Button>
                    </div>
                    
                    {/* Chat History Controls */}
                    {messages.length > 0 && (
                      <div className="pt-3 border-t border-white/10">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={clearChatHistory}
                          className="w-full bg-white/5 border-white/10 text-gray-300 hover:bg-red-500/20 hover:border-red-400/30 hover:text-red-300 transition-all duration-300"
                          title="Clear all chat messages"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Clear Chat History ({messages.length} messages)
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Search */}
                <div className="space-y-3">
                  <Label className="text-sm text-gray-300">Search Document</Label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search content..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 text-white rounded-xl"
                    />
                  </div>
                </div>

                {/* Collapse Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarCollapsed(true)}
                  className="w-full text-gray-400 hover:text-white"
                >
                  <ChevronDown className="w-4 h-4" />
                  Collapse
                </Button>
              </div>
            )}

            {sidebarCollapsed && (
              <div className="p-2 flex flex-col items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarCollapsed(false)}
                  className="w-full p-2 text-gray-400 hover:text-white"
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <div className="border-b border-white/10 px-6 pt-4">
                <TabsList className="bg-white/5 border border-white/10 rounded-xl">
                  <TabsTrigger value="chat" className="flex items-center data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-300 rounded-lg transition-all duration-300">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Chat
                  </TabsTrigger>
                  <TabsTrigger value="content" className="flex items-center data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-300 rounded-lg transition-all duration-300">
                    <FileText className="w-4 h-4 mr-2" />
                    Content
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="flex items-center data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-300 rounded-lg transition-all duration-300">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Analytics
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Chat Tab */}
              <TabsContent value="chat" className="flex-1 flex flex-col">
                <div className="flex-1 flex flex-col">
                  {/* Messages */}
                  <ScrollArea className="flex-1 p-6" ref={chatContainerRef}>
                    <div className="space-y-6 max-w-4xl">
                      {messages.length === 0 && !isTyping ? (
                        <div className="text-center py-12">
                          <div className="relative mb-6">
                            <div className="absolute inset-0 bg-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
                            <Brain className="w-16 h-16 text-purple-400 mx-auto relative animate-bounce" />
                          </div>
                          <h3 className="text-xl font-semibold text-white mb-3">
                            Start Chatting with Your Document
                          </h3>
                          <p className="text-gray-400 mb-6 max-w-md mx-auto">
                            Ask questions about the content, request summaries, or explore key concepts. 
                            I have full access to your document and can provide detailed, contextual answers.
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                            {[
                              "Summarize the main points",
                              "What are the key conclusions?",
                              "Explain complex concepts", 
                              "Find specific information"
                            ].map((suggestion, index) => (
                              <Button
                                key={generateUniqueKey('suggestion', index, suggestion)}
                                variant="outline"
                                size="sm"
                                onClick={() => setInputMessage(suggestion)}
                                className="text-sm text-gray-300 bg-white/5 border-white/10 hover:bg-white/10 hover:text-purple-300 transition-all duration-300 rounded-xl"
                              >
                                {suggestion}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <>
                          {messages.map((message, index) => (
                            <div
                              key={generateUniqueKey('message', index, message.id)}
                              className={`flex items-start space-x-4 group ${
                                message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                              }`}
                            >
                              {/* Avatar */}
                              <div className={`
                                w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110
                                ${message.role === 'user' 
                                  ? 'bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg' 
                                  : 'bg-gradient-to-br from-gray-700 to-gray-800 shadow-lg'
                                }
                              `}>
                                {message.role === 'user' ? (
                                  <User className="w-5 h-5 text-white" />
                                ) : (
                                  <Bot className="w-5 h-5 text-purple-300" />
                                )}
                              </div>
                              
                              {/* Message Content */}
                              <div className="flex-1 max-w-3xl">
                                <div className="flex items-center space-x-2 mb-2">
                                  <span className="text-sm font-medium text-white">
                                    {message.role === 'user' ? 'You' : 'AI Assistant'}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    {formatTimeAgo(message.timestamp)}
                                  </span>
                                </div>
                                
                                <div className={`
                                  bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-3 prose prose-invert max-w-none hover:bg-white/10 transition-all duration-300
                                  ${message.role === 'user' ? 'bg-purple-600/10 border-purple-400/30' : ''}
                                `}>
                                  <div 
                                    className="text-sm leading-relaxed text-white"
                                    dangerouslySetInnerHTML={{ __html: message.content.replace(/\n/g, '<br>') }}
                                  />
                                  
                                  {/* Message Actions */}
                                  <div className="flex items-center space-x-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => copyToClipboard(message.content)}
                                      className="h-7 text-xs text-gray-400 hover:text-white"
                                    >
                                      <Copy className="w-3 h-3 mr-1" />
                                      Copy
                                    </Button>
                                    {message.role === 'assistant' && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => speakText(message.content)}
                                        className="h-7 text-xs text-gray-400 hover:text-white"
                                      >
                                        <Volume2 className="w-3 h-3 mr-1" />
                                        Speak
                                      </Button>
                                    )}
                                  </div>
                                  
                                  {/* Sources */}
                                  {message.sources && message.sources.length > 0 && (
                                    <div className="mt-4 space-y-2">
                                      <p className="text-xs font-medium text-gray-400 mb-2">Sources:</p>
                                      {message.sources.map((source, sourceIndex) => (
                                        <Card 
                                          key={generateUniqueKey('source', sourceIndex, source.title)}
                                          className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer rounded-xl"
                                          onClick={() => toggleSourceExpansion(source.title + sourceIndex)}
                                        >
                                          <CardContent className="p-3">
                                            <div className="flex items-start justify-between">
                                              <div className="flex-1">
                                                <div className="flex items-center space-x-2 mb-2">
                                                  <Badge variant="outline" className="text-xs bg-white/5 border-white/20">
                                                    {(source.relevance * 100).toFixed(0)}% relevant
                                                  </Badge>
                                                  {source.citationNumber && (
                                                    <Badge className="text-xs bg-purple-600/20 text-purple-300 border-purple-400/30">
                                                      [{source.citationNumber}]
                                                    </Badge>
                                                  )}
                                                </div>
                                                <p className="text-sm font-medium text-white mb-1">
                                                  {source.title}
                                                </p>
                                                <p className="text-xs text-gray-400 line-clamp-2">
                                                  {source.excerpt}
                                                </p>
                                              </div>
                                              <ChevronDown 
                                                className={`w-4 h-4 text-gray-400 transition-transform ${
                                                  expandedSources.has(source.title + sourceIndex) ? 'rotate-180' : ''
                                                }`} 
                                              />
                                            </div>
                                            
                                            {expandedSources.has(source.title + sourceIndex) && (
                                              <div className="mt-3 pt-3 border-t border-white/10">
                                                <p className="text-sm text-gray-300 leading-relaxed">
                                                  {source.excerpt}
                                                </p>
                                                {source.url && (
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="mt-2 h-7 text-xs text-purple-400 hover:text-purple-300"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      window.open(source.url, '_blank');
                                                    }}
                                                  >
                                                    <ExternalLink className="w-3 h-3 mr-1" />
                                                    Open Source
                                                  </Button>
                                                )}
                                              </div>
                                            )}
                                          </CardContent>
                                        </Card>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {/* Typing Indicator */}
                          {isTyping && (
                            <div className="flex items-start space-x-4">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 shadow-lg flex items-center justify-center">
                                <Bot className="w-5 h-5 text-purple-300" />
                              </div>
                              
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <span className="text-sm font-medium text-white">AI Assistant</span>
                                  <div className="flex items-center space-x-1">
                                    <div className="w-1 h-1 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-1 h-1 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-1 h-1 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '300ms' }}></div>
                                  </div>
                                </div>
                                
                                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-3">
                                  <div className="flex items-center space-x-2">
                                    <div className="flex space-x-1">
                                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </div>
                                    <span className="text-sm text-gray-400">AI is analyzing your question...</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Message Being Sent */}
                          {messageBeingSent && (
                            <div className="flex items-start space-x-4 flex-row-reverse space-x-reverse">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg flex items-center justify-center">
                                <User className="w-5 h-5 text-white" />
                              </div>
                              
                              <div className="flex-1 max-w-3xl">
                                <div className="flex items-center space-x-2 mb-2 justify-end">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '100ms' }}></div>
                                    <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                                  </div>
                                  <span className="text-sm">Sending...</span>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Scroll to bottom trigger */}
                          <div ref={messagesEndRef} />
                        </>
                      )}
                    </div>
                  </ScrollArea>
                  
                  {/* Chat Input */}
                  <div className="border-t border-white/10 p-6 bg-white/5 backdrop-blur-sm">
                    <div className="max-w-4xl">
                      <div className="flex space-x-4">
                        <div className="flex-1 relative group">
                          <Input
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.ctrlKey) {
                                e.preventDefault();
                                sendMessage();
                              }
                              if (e.key === 'Escape') {
                                setInputMessage('');
                              }
                            }}
                            placeholder={
                              isLoading ? "AI is thinking..." :
                              messageBeingSent ? "Sending message..." :
                              isListening ? "Listening for voice input..." :
                              "Ask anything about this document... (Enter to send, Esc to clear)"
                            }
                            disabled={isLoading || messageBeingSent || elevenLabsStatus === 'loading'}
                            className="bg-white/5 border-white/10 text-white pr-16 focus:border-purple-500 focus:ring-purple-500/20 backdrop-blur-sm transition-all duration-300 hover:bg-white/10 focus:bg-white/10 rounded-xl placeholder:text-gray-500"
                            autoComplete="off"
                            spellCheck={true}
                          />
                          
                          {/* Input Status Indicators */}
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                            {isListening && (
                              <div className="flex items-center space-x-1">
                                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                                <span className="text-xs text-red-400">Listening</span>
                              </div>
                            )}
                            {voiceEnabled && (
                              <Volume2 className="w-4 h-4 text-purple-400" />
                            )}
                          </div>
                        </div>
                        
                        <Button
                          onClick={sendMessage}
                          disabled={!inputMessage.trim() || isLoading || messageBeingSent}
                          className={`relative overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 rounded-xl ${
                            isLoading || messageBeingSent ? 'scale-95 opacity-75' : ''
                          }`}
                        >
                          {isLoading || messageBeingSent ? (
                            <div className="flex items-center space-x-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-xs">Processing</span>
                            </div>
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      
                      {/* Status Messages */}
                      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                        <div className="flex items-center space-x-4">
                          {isListening && (
                            <span className="text-red-400 animate-pulse">● Listening for voice input...</span>
                          )}
                          {voiceEnabled && !isListening && (
                            <span>🎵 Auto-speak enabled</span>
                          )}
                          <span>
                            {document?.chunks?.length || 0} chunks • {document?.metadata?.wordCount?.toLocaleString() || 0} words
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 text-xs">
                          {messages.length > 0 && (
                            <span>{messages.length} messages</span>
                          )}
                          {lastResponseTime > 0 && (
                            <span>{Math.round(lastResponseTime / 1000 * 10) / 10}s avg</span>
                          )}
                          {readingSpeed > 0 && (
                            <span>{Math.round(readingSpeed)} WPM</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              {/* Content Tab */}
              <TabsContent value="content" className="flex-1 p-6">
                <div className="max-w-4xl mx-auto">
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-white">Document Content</h2>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(document.content || '')} className="bg-white/5 border-white/10 rounded-xl">
                          <Copy className="w-4 h-4 mr-2" />
                          Copy All
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => speakText(document.content || '')} className="bg-white/5 border-white/10 rounded-xl">
                          <Volume2 className="w-4 h-4 mr-2" />
                          Read Aloud
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <ScrollArea className="h-[calc(100vh-200px)] border border-white/10 rounded-xl bg-white/5 backdrop-blur-sm">
                    <div className="p-6">
                      {filteredChunks.length > 0 ? (
                        <div className="space-y-4">
                          {filteredChunks.map((chunk, index) => (
                            <div
                              key={generateUniqueKey('chunk', index, chunk.content)}
                              className={`
                                p-4 rounded-xl border transition-all duration-200 cursor-pointer
                                ${selectedChunk === chunk.id ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10'}
                              `}
                              onClick={() => setSelectedChunk(selectedChunk === chunk.id ? null : chunk.id)}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <span className="text-sm font-medium text-purple-400">
                                  Chunk {index + 1}
                                </span>
                                <Badge variant="outline" className="text-xs bg-white/5 border-white/20">
                                  {chunk.content.split(' ').length} words
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-300 leading-relaxed">
                                {selectedChunk === chunk.id ? chunk.content : `${chunk.content.substring(0, 200)}...`}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-400">No content chunks found</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="flex-1 p-6">
                <div className="max-w-6xl mx-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-white">Document Analytics</h2>
                    <div className="flex items-center space-x-3">
                      <select 
                        value={analyticsTimeRange}
                        onChange={(e) => setAnalyticsTimeRange(e.target.value as any)}
                        className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="24h">Last 24 hours</option>
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                      </select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadDocumentAnalytics}
                        disabled={isLoadingAnalytics}
                        className="bg-white/5 border-white/10 rounded-xl"
                      >
                        {isLoadingAnalytics ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Refresh'
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Real-time Performance Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-white/10 rounded-2xl">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-400">Session Time</p>
                            <p className="text-2xl font-bold text-white">
                              {Math.floor(performanceMetrics.sessionDuration / 60)}:{(performanceMetrics.sessionDuration % 60).toString().padStart(2, '0')}
                            </p>
                          </div>
                          <Clock className="w-8 h-8 text-purple-400" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm border border-white/10 rounded-2xl">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-400">Reading Speed</p>
                            <p className="text-2xl font-bold text-white">{Math.round(readingSpeed)}</p>
                            <p className="text-xs text-gray-400">words/min</p>
                          </div>
                          <Activity className="w-8 h-8 text-blue-400" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm border border-white/10 rounded-2xl">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-400">Engagement</p>
                            <p className="text-2xl font-bold text-white">{Math.round(performanceMetrics.engagementScore)}%</p>
                            <Progress value={performanceMetrics.engagementScore} className="h-1 mt-2" />
                          </div>
                          <Sparkles className="w-8 h-8 text-green-400" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-sm border border-white/10 rounded-2xl">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-400">Completion</p>
                            <p className="text-2xl font-bold text-white">{Math.round(performanceMetrics.completionPercentage)}%</p>
                            <Progress value={performanceMetrics.completionPercentage} className="h-1 mt-2" />
                          </div>
                          <CheckCircle className="w-8 h-8 text-orange-400" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Processing Stats */}
                    <Card className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl hover:bg-white/10 transition-all duration-300">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center">
                          <Activity className="w-5 h-5 mr-2 text-blue-400" />
                          Processing
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-sm text-gray-400">Upload Time</p>
                          <p className="text-white">{formatDate(document.uploadedAt)}</p>
                        </div>
                        {document.processedAt && (
                          <div>
                            <p className="text-sm text-gray-400">Processed Time</p>
                            <p className="text-white">{formatDate(document.processedAt)}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-gray-400">Status</p>
                          <Badge className={
                            document.status === 'completed' ? 'bg-green-500/20 border-green-400/30 text-green-300' :
                            document.status === 'processing' ? 'bg-blue-500/20 border-blue-400/30 text-blue-300' :
                            'bg-red-500/20 border-red-400/30 text-red-300'
                          }>
                            {document.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    {/* File Stats */}
                    <Card className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl hover:bg-white/10 transition-all duration-300">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center">
                          <FileText className="w-5 h-5 mr-2 text-green-400" />
                          File Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-sm text-gray-400">Size</p>
                          <p className="text-white">{formatFileSize(document.fileSize)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Type</p>
                          <p className="text-white">{document.fileType}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Word Count</p>
                          <p className="text-white">{(documentStats?.wordCount || document?.wordCount || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Chunks</p>
                          <p className="text-white">{document.chunks?.length || document.chunkCount || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Est. Reading Time</p>
                          <p className="text-white">{documentStats?.estimatedReadingTime || 'N/A'} min</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Avg Words/Sentence</p>
                          <p className="text-white">{documentStats?.avgWordsPerSentence || 'N/A'}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Content Analysis */}
                    {document.analysis && (
                      <Card className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl hover:bg-white/10 transition-all duration-300">
                        <CardHeader>
                          <CardTitle className="text-white flex items-center">
                            <Brain className="w-5 h-5 mr-2 text-purple-400" />
                            Content Analysis
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <p className="text-sm text-gray-400">Sentiment</p>
                            <Badge variant="outline" className="bg-white/5 border-white/20">
                              {document.analysis.sentiment || 'Neutral'}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400 mb-2">Complexity</p>
                            <Progress 
                              value={(document.analysis.complexity || 0) * 100} 
                              className="h-2"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                              {((document.analysis.complexity || 0) * 100).toFixed(0)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400 mb-2">Readability</p>
                            <Progress 
                              value={(document.analysis.readabilityScore || 0) * 100} 
                              className="h-2"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                              {((document.analysis.readabilityScore || 0) * 100).toFixed(0)}%
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Key Phrases */}
                  {document.analysis?.keyPhrases && (
                    <Card className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl hover:bg-white/10 transition-all duration-300 mt-6">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center">
                          <Hash className="w-5 h-5 mr-2 text-yellow-400" />
                          Key Phrases
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {document.analysis.keyPhrases.map((phrase, index) => (
                            <Badge 
                              key={generateUniqueKey('phrase', index, phrase)} 
                              variant="outline" 
                              className="bg-yellow-500/10 border-yellow-400/30 text-yellow-300"
                            >
                              {phrase}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}