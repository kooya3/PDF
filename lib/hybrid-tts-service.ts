/**
 * ElevenLabs-Only TTS Service
 * Premium TTS service using only ElevenLabs for natural, conversational speech
 */

import { elevenLabsClient, ElevenLabsClient, type ElevenLabsVoice } from './elevenlabs-client';

export type TTSProvider = 'elevenlabs';
export type TTSQualityLevel = 'premium';

export interface HybridTTSOptions {
  voice_id?: string; // For ElevenLabs
  model_id?: string; // For ElevenLabs
  rate?: number; // Speech rate (0.5-2.0)
  pitch?: number; // Pitch adjustment
  volume?: number; // Volume level (0-1)
  stability?: number; // Voice stability (0-1)
  similarity_boost?: number; // Voice similarity boost (0-1)
  style?: number; // Style exaggeration (0-1)
  use_speaker_boost?: boolean; // Enable speaker boost
  streaming?: boolean; // Use streaming mode
  maxCharacters?: number; // Maximum characters per request
}

export interface TTSProviderCapabilities {
  provider: TTSProvider;
  available: boolean;
  quality: TTSQualityLevel;
  streaming: boolean;
  offline: boolean;
  cost: 'paid';
  maxCharacters: number;
  languages: string[];
  voiceCount: number;
  latency: 'low';
}

export interface HybridTTSResponse {
  audioData: ArrayBuffer;
  provider: TTSProvider;
  voice: {
    id: string;
    name: string;
  };
  metadata: {
    quality: TTSQualityLevel;
    characterCount: number;
    cost?: number;
    processingTime: number;
    streaming: boolean;
  };
}

// Natural conversational voices - optimized for chat and document reading
const CONVERSATIONAL_VOICES = {
  // Primary conversational voices
  'rachel': {
    voice_id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Rachel (Conversational)',
    description: 'Warm, natural female voice perfect for conversations',
    settings: {
      stability: 0.75,
      similarity_boost: 0.85,
      style: 0.2,
      use_speaker_boost: true,
    }
  },
  'adam': {
    voice_id: 'pNInz6obpgDQGcFmaJgB', 
    name: 'Adam (Natural Male)',
    description: 'Deep, engaging male voice with natural conversation flow',
    settings: {
      stability: 0.8,
      similarity_boost: 0.9,
      style: 0.15,
      use_speaker_boost: true,
    }
  },
  'bella': {
    voice_id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella (Friendly)',
    description: 'Young, friendly female voice with expressive delivery',
    settings: {
      stability: 0.7,
      similarity_boost: 0.8,
      style: 0.3,
      use_speaker_boost: true,
    }
  },
  'antoni': {
    voice_id: 'ErXwobaYiN019PkySvjV',
    name: 'Antoni (Professional)',
    description: 'Professional male voice, clear and articulate',
    settings: {
      stability: 0.85,
      similarity_boost: 0.85,
      style: 0.1,
      use_speaker_boost: true,
    }
  },
  'sam': {
    voice_id: 'yoZ06aMxZJJ28mfd3POQ',
    name: 'Sam (Casual)',
    description: 'Casual, relaxed male voice perfect for friendly conversations',
    settings: {
      stability: 0.7,
      similarity_boost: 0.8,
      style: 0.25,
      use_speaker_boost: true,
    }
  }
};

// Default voice for natural conversation
const DEFAULT_CONVERSATIONAL_VOICE = 'rachel';

export class HybridTTSService {
  private static instance: HybridTTSService;

  private constructor() {
    // ElevenLabs-only service
  }

  static getInstance(): HybridTTSService {
    if (!HybridTTSService.instance) {
      HybridTTSService.instance = new HybridTTSService();
    }
    return HybridTTSService.instance;
  }

  /**
   * Get capabilities of ElevenLabs TTS
   */
  async getProviderCapabilities(): Promise<TTSProviderCapabilities[]> {
    const elevenLabsAvailable = await elevenLabsClient.isAvailable();
    const elevenLabsVoices = elevenLabsAvailable ? await elevenLabsClient.getVoices().catch(() => []) : [];
    
    return [{
      provider: 'elevenlabs',
      available: elevenLabsAvailable,
      quality: 'premium',
      streaming: true,
      offline: false,
      cost: 'paid',
      maxCharacters: 5000, // Per request limit
      languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'pl', 'hi', 'ar', 'zh', 'ja', 'ko'],
      voiceCount: elevenLabsVoices.length || Object.keys(CONVERSATIONAL_VOICES).length,
      latency: 'low'
    }];
  }

  /**
   * Get available conversational voices
   */
  getConversationalVoices() {
    return CONVERSATIONAL_VOICES;
  }

  /**
   * Get recommended voice for conversation type
   */
  getRecommendedVoice(context: 'chat' | 'document' | 'summary' | 'casual' = 'chat') {
    switch (context) {
      case 'chat':
      case 'casual':
        return CONVERSATIONAL_VOICES.rachel;
      case 'document':
      case 'summary':
        return CONVERSATIONAL_VOICES.antoni;
      default:
        return CONVERSATIONAL_VOICES[DEFAULT_CONVERSATIONAL_VOICE];
    }
  }

  /**
   * Generate speech using ElevenLabs with optimized conversational settings
   */
  async generateSpeech(
    text: string,
    options: HybridTTSOptions = {}
  ): Promise<HybridTTSResponse> {
    const startTime = Date.now();
    
    // Clean and validate text
    const cleanText = this.cleanTextForTTS(text);
    
    if (!cleanText.trim()) {
      throw new Error('No valid text provided for TTS');
    }

    // Check character limits
    const maxChars = options.maxCharacters || 5000;
    if (cleanText.length > maxChars) {
      throw new Error(`Text too long: ${cleanText.length} characters (max: ${maxChars})`);
    }

    // Check if ElevenLabs is available
    let elevenLabsAvailable = true;
    try {
      const capabilities = await this.getProviderCapabilities();
      const elevenLabsCap = capabilities.find(c => c.provider === 'elevenlabs');
      elevenLabsAvailable = elevenLabsCap?.available || false;
    } catch (error) {
      console.warn('Failed to check ElevenLabs availability, proceeding anyway:', error);
      // If availability check fails, try to proceed anyway
      elevenLabsAvailable = true;
    }
    
    try {
      const result = await this.generateWithElevenLabs(cleanText, options);
      const processingTime = Date.now() - startTime;

      return {
        audioData: result.audioData,
        provider: 'elevenlabs',
        voice: result.voiceInfo,
        metadata: {
          quality: 'premium',
          characterCount: cleanText.length,
          cost: result.cost,
          processingTime,
          streaming: options.streaming || false
        }
      };

    } catch (error) {
      console.error('ElevenLabs TTS generation failed:', error);
      
      // If we failed but haven't checked availability yet, try to provide a helpful error message
      if (!elevenLabsAvailable) {
        throw new Error('ElevenLabs TTS service is not available. Please check your API key configuration.');
      }
      
      // For other errors, provide the actual error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Handle specific ElevenLabs API errors
      if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
        throw new Error('ElevenLabs authentication failed. Please verify your API key is correct.');
      } else if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
        throw new Error('ElevenLabs API key does not have permission for this operation.');
      } else if (errorMessage.includes('429')) {
        throw new Error('ElevenLabs rate limit exceeded. Please wait and try again.');
      } else if (errorMessage.includes('insufficient credits') || errorMessage.includes('quota')) {
        throw new Error('ElevenLabs account has insufficient credits. Please check your account.');
      }
      
      throw new Error(`TTS generation failed: ${errorMessage}`);
    }
  }

  /**
   * Generate speech using ElevenLabs with conversational optimizations
   */
  private async generateWithElevenLabs(
    text: string,
    options: HybridTTSOptions
  ): Promise<{ audioData: ArrayBuffer; voiceInfo: { id: string; name: string }; cost: number }> {
    // Get the best conversational voice
    const defaultVoice = this.getRecommendedVoice('chat');
    const voice_id = options.voice_id || defaultVoice.voice_id;
    
    // Use conversational voice settings if available
    const voiceConfig = Object.values(CONVERSATIONAL_VOICES).find(v => v.voice_id === voice_id) || defaultVoice;
    
    const elevenLabsOptions = {
      model_id: options.model_id || 'eleven_multilingual_v2',
      voice_settings: {
        stability: options.stability ?? voiceConfig.settings.stability,
        similarity_boost: options.similarity_boost ?? voiceConfig.settings.similarity_boost,
        style: options.style ?? voiceConfig.settings.style,
        use_speaker_boost: options.use_speaker_boost ?? voiceConfig.settings.use_speaker_boost,
      }
    };

    const audioData = options.streaming 
      ? await this.generateStreamingSpeech(text, voice_id, elevenLabsOptions)
      : await elevenLabsClient.generateSpeech(text, voice_id, elevenLabsOptions);
    
    // Get voice name
    let voiceName = voiceConfig.name;
    try {
      const voices = await elevenLabsClient.getVoices();
      const voice = voices.find(v => v.voice_id === voice_id);
      if (voice?.name) {
        voiceName = voice.name;
      }
    } catch (error) {
      console.warn('Could not fetch voice name, using default:', error);
    }

    // Estimate cost (ElevenLabs charges per character)
    const characterCount = ElevenLabsClient.estimateCharacterUsage(text);
    const estimatedCost = characterCount * 0.00015; // Approximate cost per character

    return {
      audioData,
      voiceInfo: { id: voice_id, name: voiceName },
      cost: estimatedCost
    };
  }

  /**
   * Generate streaming speech for real-time playback
   */
  private async generateStreamingSpeech(
    text: string,
    voice_id: string,
    options: any
  ): Promise<ArrayBuffer> {
    try {
      const stream = await elevenLabsClient.generateSpeechStream(text, voice_id, options);
      
      // Convert streaming response to ArrayBuffer
      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      // Combine all chunks into a single ArrayBuffer
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      
      return result.buffer;
    } catch (error) {
      console.warn('Streaming failed, falling back to regular generation:', error);
      return await elevenLabsClient.generateSpeech(text, voice_id, options);
    }
  }

  /**
   * Clean text for optimal TTS processing
   */
  private cleanTextForTTS(text: string): string {
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Fix common abbreviations for better pronunciation
      .replace(/\bDr\./g, 'Doctor')
      .replace(/\bMr\./g, 'Mister')
      .replace(/\bMrs\./g, 'Missus')
      .replace(/\bMs\./g, 'Miss')
      .replace(/\bProf\./g, 'Professor')
      // Add pauses for better flow
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
      // Handle ellipsis
      .replace(/\.{3,}/g, '... ')
      // Clean up markdown artifacts
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      // Remove URLs for cleaner speech
      .replace(/https?:\/\/[^\s]+/g, 'link')
      .trim();
  }

  /**
   * Get system health status
   */
  async getSystemStatus(): Promise<{
    providers: TTSProviderCapabilities[];
    recommendations: string[];
    totalVoices: number;
    healthScore: number;
    conversationalVoices: typeof CONVERSATIONAL_VOICES;
  }> {
    const providers = await this.getProviderCapabilities();
    const available = providers[0]?.available || false;
    
    const recommendations: string[] = [];
    
    if (!available) {
      recommendations.push('ElevenLabs API is not available. Please check your API key configuration.');
      recommendations.push('Verify your ElevenLabs API key is valid and has sufficient credits.');
    } else {
      recommendations.push('ElevenLabs TTS is ready with premium conversational voices.');
      recommendations.push('Try different conversational voices for various contexts (chat, document reading, etc.).');
    }

    const totalVoices = available ? providers[0].voiceCount : 0;
    const healthScore = available ? 100 : 0;

    return {
      providers,
      recommendations,
      totalVoices,
      healthScore,
      conversationalVoices: CONVERSATIONAL_VOICES
    };
  }

  /**
   * Test voice with sample text
   */
  async testVoice(voiceKey: keyof typeof CONVERSATIONAL_VOICES = 'rachel'): Promise<HybridTTSResponse> {
    const sampleText = "Hello! I'm your AI assistant, ready to help you with your documents. How can I assist you today?";
    const voice = CONVERSATIONAL_VOICES[voiceKey];
    
    return await this.generateSpeech(sampleText, {
      voice_id: voice.voice_id,
      ...voice.settings
    });
  }
}

// Export singleton instance
export const hybridTTSService = HybridTTSService.getInstance();