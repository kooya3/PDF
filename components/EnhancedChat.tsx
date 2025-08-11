"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { 
  Send, 
  Volume2, 
  VolumeX, 
  Pause, 
  Play, 
  Square,
  Settings,
  Mic,
  MicOff 
} from "lucide-react";
import { useToast } from "./ui/use-toast";
import { useTTS, TTSTextProcessor } from "@/lib/tts-client";
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  content: string;
  role: "human" | "ai";
  timestamp: Date;
  isStreaming?: boolean;
}

interface TTSSettings {
  enabled: boolean;
  autoPlay: boolean;
  voice?: string;
  rate: number;
  pitch: number;
  volume: number;
}

interface EnhancedChatProps {
  docId: string;
  docName: string;
}

export default function EnhancedChat({ docId, docName }: EnhancedChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [ttsSettings, setTTSSettings] = useState<TTSSettings>({
    enabled: true,
    autoPlay: false,
    rate: 1,
    pitch: 1,
    volume: 1,
  });
  const [showTTSSettings, setShowTTSSettings] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { speak, pause, resume, stop, getStatus, isSupported: ttsSupported } = useTTS();
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast({
          variant: "destructive",
          title: "Speech Recognition Error",
          description: "Failed to recognize speech. Please try again.",
        });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [toast]);

  // Load chat history on component mount
  useEffect(() => {
    loadChatHistory();
  }, [docId]);

  const loadChatHistory = async () => {
    try {
      const response = await fetch(`/api/chat/history?docId=${docId}`);
      if (response.ok) {
        const history = await response.json();
        setMessages(history.messages || []);
      }
    } catch (error) {
      console.error("Failed to load chat history:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: inputValue,
      role: "human",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: inputValue,
          docId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();
      
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        content: data.response,
        role: "ai",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);

      // Auto-play TTS if enabled
      if (ttsSettings.enabled && ttsSettings.autoPlay) {
        await handleTTSPlay(aiMessage.content, aiMessage.id);
      }

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTTSPlay = async (text: string, messageId: string) => {
    try {
      if (currentlyPlaying === messageId) {
        const status = getStatus();
        if (status.isPaused) {
          resume();
        } else if (status.isPlaying) {
          pause();
        }
        return;
      }

      // Stop any current playback
      stop();
      setCurrentlyPlaying(messageId);

      // Clean and split text for better TTS
      const cleanText = TTSTextProcessor.cleanTextForTTS(text);
      const chunks = TTSTextProcessor.splitText(cleanText, 200);

      // Play each chunk
      for (const chunk of chunks) {
        if (currentlyPlaying !== messageId) break; // User stopped playback
        
        await speak(chunk, {
          rate: ttsSettings.rate,
          pitch: ttsSettings.pitch,
          volume: ttsSettings.volume,
        });
      }

      setCurrentlyPlaying(null);

    } catch (error) {
      setCurrentlyPlaying(null);
      toast({
        variant: "destructive",
        title: "TTS Error",
        description: "Failed to play text-to-speech.",
      });
    }
  };

  const handleTTSStop = () => {
    stop();
    setCurrentlyPlaying(null);
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[600px] border rounded-lg bg-white">
      {/* Chat Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold">Chat with {docName}</h3>
            <p className="text-sm text-gray-500">{messages.length} messages</p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* TTS Settings Button */}
            {ttsSupported && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTTSSettings(!showTTSSettings)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
            
            {/* Global TTS Stop Button */}
            {currentlyPlaying && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleTTSStop}
              >
                <Square className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* TTS Settings Panel */}
        {showTTSSettings && ttsSupported && (
          <div className="mt-4 p-3 bg-white rounded border space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Text-to-Speech</label>
              <input
                type="checkbox"
                checked={ttsSettings.enabled}
                onChange={(e) => setTTSSettings(prev => ({ ...prev, enabled: e.target.checked }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Auto-play AI responses</label>
              <input
                type="checkbox"
                checked={ttsSettings.autoPlay}
                onChange={(e) => setTTSSettings(prev => ({ ...prev, autoPlay: e.target.checked }))}
                disabled={!ttsSettings.enabled}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Speed: {ttsSettings.rate}x</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={ttsSettings.rate}
                onChange={(e) => setTTSSettings(prev => ({ ...prev, rate: parseFloat(e.target.value) }))}
                className="w-full"
                disabled={!ttsSettings.enabled}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Pitch: {ttsSettings.pitch}x</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={ttsSettings.pitch}
                onChange={(e) => setTTSSettings(prev => ({ ...prev, pitch: parseFloat(e.target.value) }))}
                className="w-full"
                disabled={!ttsSettings.enabled}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Volume: {Math.round(ttsSettings.volume * 100)}%</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={ttsSettings.volume}
                onChange={(e) => setTTSSettings(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
                className="w-full"
                disabled={!ttsSettings.enabled}
              />
            </div>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>Start a conversation about your document!</p>
            <p className="text-sm mt-2">Ask questions, request summaries, or explore the content.</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "human" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === "human"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    {message.role === "ai" ? (
                      <ReactMarkdown className="prose prose-sm max-w-none">
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      <p>{message.content}</p>
                    )}
                  </div>
                  
                  {/* TTS Controls for AI messages */}
                  {message.role === "ai" && ttsSettings.enabled && ttsSupported && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTTSPlay(message.content, message.id)}
                      className="ml-2 p-1 h-8 w-8"
                    >
                      {currentlyPlaying === message.id ? (
                        getStatus().isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />
                      ) : (
                        <Volume2 className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </div>
                
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                <span className="text-gray-600">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about your document..."
              disabled={isLoading}
              className="min-h-[40px]"
            />
          </div>
          
          {/* Voice Input Button */}
          {recognitionRef.current && (
            <Button
              variant="outline"
              onClick={isListening ? stopListening : startListening}
              disabled={isLoading}
              className={`${isListening ? 'bg-red-500 text-white' : ''}`}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          )}
          
          {/* Send Button */}
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {!ttsSupported && (
          <p className="text-xs text-gray-500 mt-2">
            💡 Your browser doesn't support text-to-speech
          </p>
        )}
      </div>
    </div>
  );
}