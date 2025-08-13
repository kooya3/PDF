'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  VolumeX, 
  Settings, 
  Sparkles,
  Zap,
  Mic,
  Download,
  RotateCcw
} from 'lucide-react';
import { hybridTTSService, type TTSProvider, type TTSQualityLevel } from '@/lib/hybrid-tts-service';
import { useTTS } from '@/lib/tts-client';

export interface TTSControlsProps {
  text: string;
  onPlay?: (provider: TTSProvider) => void;
  onStop?: () => void;
  onError?: (error: string) => void;
  className?: string;
  autoPlay?: boolean;
  enableAdvanced?: boolean;
}

export interface TTSSettings {
  voice_id?: string;
  quality: TTSQualityLevel;
  rate: number;
  pitch: number;
  volume: number;
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
  streaming: boolean;
}

export const EnhancedTTSControls: React.FC<TTSControlsProps> = ({
  text,
  onPlay,
  onStop,
  onError,
  className = '',
  autoPlay = false,
  enableAdvanced = true,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentProvider, setCurrentProvider] = useState<TTSProvider>('elevenlabs');
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const { speak, pause, resume, stop, isSupported } = useTTS();

  const [settings, setSettings] = useState<TTSSettings>({
    quality: 'premium', // ElevenLabs only
    voice_id: 'EXAVITQu4vr4xnSDxMaL', // Rachel - natural conversational voice
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    stability: 0.75,
    similarity_boost: 0.85,
    style: 0.2,
    use_speaker_boost: true,
    streaming: false,
  });

  const [voices, setVoices] = useState<Array<{ id: string; name: string; description: string }>>([]);
  const [providers, setProviders] = useState<Array<{ provider: TTSProvider; available: boolean; quality: TTSQualityLevel }>>([]);

  // Load available providers and voices
  useEffect(() => {
    const loadTTSInfo = async () => {
      try {
        const response = await fetch('/api/tts');
        const data = await response.json();
        
        if (data.hybrid?.status?.providers) {
          setProviders(data.hybrid.status.providers.map((p: any) => ({
            provider: p.provider,
            available: p.available,
            quality: p.quality,
          })));
        }

        // Load conversational voices
        if (data.hybrid?.status?.conversationalVoices) {
          const conversationalVoices = Object.entries(data.hybrid.status.conversationalVoices).map(([key, voice]: [string, any]) => ({
            id: voice.voice_id,
            name: voice.name,
            description: voice.description,
          }));
          setVoices(conversationalVoices);
        } else {
          // Fallback to default conversational voices
          setVoices([
            { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Rachel (Conversational)', description: 'Warm, natural female voice' },
            { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (Natural Male)', description: 'Deep, engaging male voice' },
            { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (Professional)', description: 'Professional, clear voice' },
            { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam (Casual)', description: 'Casual, relaxed voice' },
          ]);
        }
      } catch (error) {
        console.error('Failed to load TTS info:', error);
        // Set default voices on error
        setVoices([
          { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Rachel (Conversational)', description: 'Warm, natural female voice' },
          { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (Natural Male)', description: 'Deep, engaging male voice' },
        ]);
      }
    };

    loadTTSInfo();
  }, []);

  // Auto-play functionality
  useEffect(() => {
    if (autoPlay && text && !isPlaying) {
      handlePlay();
    }
  }, [autoPlay, text]);

  const handlePlay = async () => {
    if (!text.trim()) {
      setError('No text to speak');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await playWithElevenLabs();
      
      setIsPlaying(true);
      setIsPaused(false);
      onPlay?.(currentProvider);
    } catch (error) {
      console.error('TTS Error:', error);
      
      let errorMessage = 'TTS generation failed';
      if (error instanceof Error) {
        if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
          errorMessage = 'ElevenLabs is busy. Please wait a moment and try again.';
        } else if (error.message.includes('concurrent_requests')) {
          errorMessage = 'Too many requests at once. Trying again automatically...';
        } else if (error.message.includes('quota') || error.message.includes('credits')) {
          errorMessage = 'ElevenLabs quota exceeded. Please check your account.';
        } else if (error.message.includes('API key')) {
          errorMessage = 'ElevenLabs authentication failed. Please check API key.';
        } else {
          errorMessage = `TTS Error: ${error.message.split(':').pop()?.trim() || 'Unknown error'}`;
        }
      }
      
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const playWithElevenLabs = async () => {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice_id: settings.voice_id,
          quality: settings.quality,
          rate: settings.rate,
          pitch: settings.pitch,
          volume: settings.volume,
          stability: settings.stability,
          similarity_boost: settings.similarity_boost,
          style: settings.style,
          use_speaker_boost: settings.use_speaker_boost,
          streaming: settings.streaming,
        }),
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs TTS error: ${response.statusText}`);
      }

      // Set provider to ElevenLabs
      setCurrentProvider('elevenlabs');

      // Create audio URL from response
      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

      // Play audio
      if (audioRef.current) {
        audioRef.current.src = url;
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('ElevenLabs TTS failed:', error);
      throw error;
    }
  };

  const handlePause = () => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    } else {
      pause();
    }
    setIsPaused(true);
    setIsPlaying(false);
  };

  const handleResume = () => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play();
    } else {
      resume();
    }
    setIsPaused(false);
    setIsPlaying(true);
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    stop();
    setIsPlaying(false);
    setIsPaused(false);
    onStop?.();
    
    // Clean up audio URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  };

  const handleDownload = () => {
    if (audioUrl) {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `tts-audio-${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const getQualityIcon = (quality: TTSQualityLevel) => {
    switch (quality) {
      case 'premium': return <Sparkles className="w-4 h-4" />;
      case 'good': return <Zap className="w-4 h-4" />;
      case 'basic': return <Mic className="w-4 h-4" />;
      default: return <Mic className="w-4 h-4" />;
    }
  };

  const getProviderColor = (provider: TTSProvider) => {
    return 'bg-purple-500'; // ElevenLabs only
  };

  const getProviderTextColor = (provider: TTSProvider) => {
    return 'text-purple-700'; // ElevenLabs only
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Main Controls */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-white/30 backdrop-blur-sm shadow-sm">
        {/* Play/Pause/Stop Controls */}
        <div className="flex items-center gap-2">
          {!isPlaying && !isPaused ? (
            <button
              onClick={handlePlay}
              disabled={isLoading || !text.trim()}
              className="group relative p-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white transition-all duration-200 hover:scale-105 hover:shadow-lg shadow-blue-500/25 disabled:hover:scale-100"
              title="Play with TTS"
            >
              {isLoading ? (
                <div className="relative">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse"></div>
                  </div>
                </div>
              ) : (
                <Play className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
              )}
              {!isLoading && (
                <div className="absolute inset-0 rounded-full bg-white/20 scale-0 group-hover:scale-100 transition-transform duration-300"></div>
              )}
            </button>
          ) : isPaused ? (
            <button
              onClick={handleResume}
              className="group relative p-3 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white transition-all duration-200 hover:scale-105 hover:shadow-lg shadow-emerald-500/25"
              title="Resume"
            >
              <Play className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
              <div className="absolute inset-0 rounded-full bg-white/20 scale-0 group-hover:scale-100 transition-transform duration-300"></div>
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="group relative p-3 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white transition-all duration-200 hover:scale-105 hover:shadow-lg shadow-amber-500/25"
              title="Pause"
            >
              <Pause className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
              <div className="absolute inset-0 rounded-full bg-white/20 scale-0 group-hover:scale-100 transition-transform duration-300"></div>
            </button>
          )}

          <button
            onClick={handleStop}
            disabled={!isPlaying && !isPaused}
            className="group relative p-3 rounded-full bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white transition-all duration-200 hover:scale-105 hover:shadow-lg shadow-rose-500/25 disabled:hover:scale-100"
            title="Stop"
          >
            <Square className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
            {!(!isPlaying && !isPaused) && (
              <div className="absolute inset-0 rounded-full bg-white/20 scale-0 group-hover:scale-100 transition-transform duration-300"></div>
            )}
          </button>
        </div>

        {/* Provider & Quality Status */}
        <div className="flex items-center gap-3">
          {/* Provider Indicator */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white/70 backdrop-blur-sm rounded-lg border border-white/50 shadow-sm">
            <div className={`w-2 h-2 rounded-full ${getProviderColor(currentProvider)} animate-pulse`}></div>
            <span className={`text-sm font-semibold ${getProviderTextColor(currentProvider)}`}>
              ElevenLabs
            </span>
          </div>
          
          {/* Quality Badge */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white/70 backdrop-blur-sm rounded-lg border border-white/50 shadow-sm">
            <div className="text-indigo-600">{getQualityIcon(settings.quality)}</div>
            <span className="text-sm font-medium text-indigo-700 capitalize">{settings.quality}</span>
            {isLoading ? (
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 bg-orange-500 rounded-full animate-bounce"></div>
                <div className="w-1 h-1 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-1 h-1 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            ) : (
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Advanced Settings */}
          {enableAdvanced && (
            <>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2.5 rounded-lg transition-all duration-200 hover:scale-105 ${
                  showSettings 
                    ? 'bg-indigo-100 text-indigo-700 shadow-sm' 
                    : 'bg-white/70 text-gray-600 hover:bg-white/90 hover:text-indigo-600'
                }`}
                title="TTS Settings"
              >
                <Settings className="w-4 h-4" />
              </button>

              {audioUrl && (
                <button
                  onClick={handleDownload}
                  className="p-2.5 rounded-lg bg-white/70 text-gray-600 hover:bg-white/90 hover:text-green-600 transition-all duration-200 hover:scale-105"
                  title="Download Audio"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
            </>
          )}

          {/* Volume Control */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white/70 backdrop-blur-sm rounded-lg border border-white/50 shadow-sm">
            {settings.volume > 0.7 ? (
              <Volume2 className="w-4 h-4 text-indigo-600" />
            ) : settings.volume > 0.3 ? (
              <Volume2 className="w-4 h-4 text-amber-500" />
            ) : (
              <VolumeX className="w-4 h-4 text-gray-400" />
            )}
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.volume}
              onChange={(e) => setSettings(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
              className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${settings.volume * 100}%, #e5e7eb ${settings.volume * 100}%, #e5e7eb 100%)`
              }}
            />
            <span className="text-xs font-medium text-indigo-700 min-w-[3ch]">{Math.round(settings.volume * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center justify-between gap-3 p-4 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/60 rounded-xl text-red-700 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <VolumeX className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-red-800">TTS Error</div>
              <div className="text-sm text-red-600">{error}</div>
              {(error.includes('busy') || error.includes('requests')) && (
                <div className="text-xs text-red-500 mt-1 bg-red-50 p-2 rounded border border-red-200">
                  💡 <strong>Tip:</strong> ElevenLabs free accounts have a limit of 2 concurrent requests. 
                  The system will automatically retry with proper queuing.
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setError(null)}
            className="flex-shrink-0 p-2 hover:bg-red-100 rounded-lg transition-colors duration-200 group"
            title="Dismiss error"
          >
            <RotateCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
          </button>
        </div>
      )}

      {/* Advanced Settings Panel */}
      {showSettings && (
        <div className="p-5 border border-white/30 rounded-xl bg-gradient-to-br from-white/80 to-indigo-50/80 backdrop-blur-sm shadow-lg space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {/* Voice Selection */}
            <div className="space-y-2 col-span-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-indigo-800">
                <Mic className="w-4 h-4" />
                Conversational Voice
              </label>
              <select
                value={settings.voice_id}
                onChange={(e) => setSettings(prev => ({ ...prev, voice_id: e.target.value }))}
                className="w-full p-3 border border-indigo-200/60 rounded-lg bg-white/80 backdrop-blur-sm text-gray-800 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/50 transition-all duration-200 hover:border-indigo-300"
              >
                {voices.map(voice => (
                  <option key={voice.id} value={voice.id}>
                    🎵 {voice.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-indigo-600 mt-1">
                {voices.find(v => v.id === settings.voice_id)?.description || 'Natural conversational voice'}
              </p>
            </div>


            {/* Rate Control */}
            <div className="space-y-2">
              <label className="flex items-center justify-between text-sm font-semibold text-indigo-800">
                <span className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Speed
                </span>
                <span className="text-indigo-600 font-mono bg-indigo-100 px-2 py-1 rounded text-xs">{settings.rate}x</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={settings.rate}
                onChange={(e) => setSettings(prev => ({ ...prev, rate: parseFloat(e.target.value) }))}
                className="w-full h-2 bg-gradient-to-r from-indigo-200 to-purple-200 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${((settings.rate - 0.5) / 1.5) * 100}%, #e0e7ff ${((settings.rate - 0.5) / 1.5) * 100}%, #e0e7ff 100%)`
                }}
              />
            </div>

            {/* Stability Control */}
            <div className="space-y-2">
              <label className="flex items-center justify-between text-sm font-semibold text-indigo-800">
                <span className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Stability
                </span>
                <span className="text-indigo-600 font-mono bg-indigo-100 px-2 py-1 rounded text-xs">{settings.stability.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.stability}
                onChange={(e) => setSettings(prev => ({ ...prev, stability: parseFloat(e.target.value) }))}
                className="w-full h-2 bg-gradient-to-r from-indigo-200 to-purple-200 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${settings.stability * 100}%, #e0e7ff ${settings.stability * 100}%, #e0e7ff 100%)`
                }}
              />
              <p className="text-xs text-indigo-600">Higher values = more consistent voice</p>
            </div>
          </div>

          {/* Advanced Voice Controls */}
          <div className="grid grid-cols-2 gap-4">
            {/* Similarity Boost */}
            <div className="space-y-2">
              <label className="flex items-center justify-between text-sm font-semibold text-indigo-800">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Similarity
                </span>
                <span className="text-indigo-600 font-mono bg-indigo-100 px-2 py-1 rounded text-xs">{settings.similarity_boost.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.similarity_boost}
                onChange={(e) => setSettings(prev => ({ ...prev, similarity_boost: parseFloat(e.target.value) }))}
                className="w-full h-2 bg-gradient-to-r from-indigo-200 to-purple-200 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${settings.similarity_boost * 100}%, #e0e7ff ${settings.similarity_boost * 100}%, #e0e7ff 100%)`
                }}
              />
              <p className="text-xs text-indigo-600">Voice similarity enhancement</p>
            </div>

            {/* Style Control */}
            <div className="space-y-2">
              <label className="flex items-center justify-between text-sm font-semibold text-indigo-800">
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Expression
                </span>
                <span className="text-indigo-600 font-mono bg-indigo-100 px-2 py-1 rounded text-xs">{settings.style.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.style}
                onChange={(e) => setSettings(prev => ({ ...prev, style: parseFloat(e.target.value) }))}
                className="w-full h-2 bg-gradient-to-r from-indigo-200 to-purple-200 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${settings.style * 100}%, #e0e7ff ${settings.style * 100}%, #e0e7ff 100%)`
                }}
              />
              <p className="text-xs text-indigo-600">Higher values = more expressive</p>
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-3 bg-white/60 rounded-lg border border-indigo-200/40 hover:bg-white/80 transition-all duration-200 cursor-pointer group">
              <input
                type="checkbox"
                checked={settings.use_speaker_boost}
                onChange={(e) => setSettings(prev => ({ ...prev, use_speaker_boost: e.target.checked }))}
                className="w-4 h-4 text-indigo-600 bg-white border-indigo-300 rounded focus:ring-indigo-500 focus:ring-2"
              />
              <div>
                <span className="text-sm font-medium text-indigo-800 group-hover:text-indigo-900">Speaker Boost</span>
                <div className="text-xs text-indigo-600">Enhanced voice clarity</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-white/60 rounded-lg border border-indigo-200/40 hover:bg-white/80 transition-all duration-200 cursor-pointer group">
              <input
                type="checkbox"
                checked={settings.streaming}
                onChange={(e) => setSettings(prev => ({ ...prev, streaming: e.target.checked }))}
                className="w-4 h-4 text-indigo-600 bg-white border-indigo-300 rounded focus:ring-indigo-500 focus:ring-2"
              />
              <div>
                <span className="text-sm font-medium text-indigo-800 group-hover:text-indigo-900">Streaming</span>
                <div className="text-xs text-indigo-600">Real-time audio generation</div>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onEnded={() => {
          setIsPlaying(false);
          setIsPaused(false);
          onStop?.();
        }}
        onError={() => {
          setError('Audio playback failed');
          setIsPlaying(false);
          setIsPaused(false);
        }}
        hidden
      />
    </div>
  );
};

export default EnhancedTTSControls;