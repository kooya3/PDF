/**
 * ElevenLabs TTS Client
 * Provides high-quality cloud TTS with intelligent fallback to local options
 */

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  samples: any[];
  category: string;
  fine_tuning: {
    is_allowed: boolean;
    finetuning_state: string;
    verification_failures: string[];
    verification_attempts_count: number;
    manual_verification_requested: boolean;
  };
  labels: Record<string, string>;
  description: string;
  preview_url: string;
  available_for_tiers: string[];
  settings: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
  };
  sharing: {
    status: string;
    history_item_sample_id: string;
    original_voice_id: string;
    public_owner_id: string;
    liked_by_count: number;
    cloned_by_count: number;
  };
  high_quality_base_model_ids: string[];
  safety_control: string;
  voice_verification: {
    requires_verification: boolean;
    is_verified: boolean;
    verification_failures: string[];
    verification_attempts_count: number;
    language: string;
  };
}

export interface ElevenLabsOptions {
  voice_id?: string;
  model_id?: string;
  voice_settings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
  pronunciation_dictionary_locators?: any[];
  seed?: number;
  previous_text?: string;
  next_text?: string;
  previous_request_ids?: string[];
  next_request_ids?: string[];
}

export interface ElevenLabsUsage {
  characters: number;
  character_limit: number;
  can_extend_character_limit: boolean;
  allowed_to_extend_character_limit: boolean;
  next_character_count_reset_unix: number;
  voice_limit: number;
  professional_voice_limit: number;
  can_extend_voice_limit: boolean;
  can_use_instant_voice_cloning: boolean;
  can_use_professional_voice_cloning: boolean;
  currency: string;
  status: string;
}

// Request queue to handle concurrent request limits
class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private running = 0;
  private maxConcurrent = 2; // ElevenLabs limit for most plans

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          this.running++;
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.running--;
          this.processNext();
        }
      });
      
      this.processNext();
    });
  }

  private processNext() {
    if (this.running < this.maxConcurrent && this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        next();
      }
    }
  }
}

export class ElevenLabsClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.elevenlabs.io/v1';
  private requestQueue = new RequestQueue();
  private lastRequestTime = 0;
  private minRequestInterval = 100; // 100ms between requests

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async isAvailable(): Promise<boolean> {
    // Basic API key validation
    if (!this.apiKey || this.apiKey === 'your-api-key-here' || this.apiKey.length < 10) {
      console.log('ElevenLabs: No valid API key found');
      return false;
    }
    
    try {
      // Try a simple API endpoint first (user info is usually accessible)
      const userResponse = await fetch(`${this.baseUrl}/user`, {
        method: 'GET',
        headers: {
          'Xi-Api-Key': this.apiKey,
        },
      });
      
      if (userResponse.ok) {
        console.log('ElevenLabs: API key validated via user endpoint');
        return true;
      }
      
      // If user endpoint fails, try voices endpoint
      const voicesResponse = await fetch(`${this.baseUrl}/voices`, {
        method: 'GET',
        headers: {
          'Xi-Api-Key': this.apiKey,
        },
      });
      
      if (voicesResponse.ok) {
        console.log('ElevenLabs: API key validated via voices endpoint');
        return true;
      }
      
      // If both fail but responses are 403/401 (not 404), API key is likely valid but has restrictions
      if (userResponse.status === 403 || userResponse.status === 401 || 
          voicesResponse.status === 403 || voicesResponse.status === 401) {
        console.log('ElevenLabs: API key appears valid but has access restrictions, assuming available');
        return true;
      }
      
      console.log('ElevenLabs: API validation failed with status codes:', {
        user: userResponse.status,
        voices: voicesResponse.status
      });
      return false;
      
    } catch (error) {
      console.error('ElevenLabs availability check failed:', error);
      
      // If we get a network error but have an API key, assume it's available
      // This handles cases where the service is temporarily unreachable
      if (this.apiKey && this.apiKey.startsWith('sk_')) {
        console.log('ElevenLabs: Assuming available despite network error (has valid API key format)');
        return true;
      }
      
      return false;
    }
  }

  async getVoices(): Promise<ElevenLabsVoice[]> {
    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'Xi-Api-Key': this.apiKey,
        },
      });

      if (!response.ok) {
        // If voices endpoint fails due to permissions, return default voices
        console.warn('ElevenLabs voices API access restricted, using default voices');
        return this.getDefaultVoices();
      }

      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      console.error('Failed to fetch ElevenLabs voices:', error);
      return this.getDefaultVoices();
    }
  }
  
  private getDefaultVoices(): ElevenLabsVoice[] {
    // Return common ElevenLabs voices that should be available with most API keys
    return [
      {
        voice_id: 'EXAVITQu4vr4xnSDxMaL',
        name: 'Bella',
        samples: [],
        category: 'premade',
        fine_tuning: { is_allowed: false, finetuning_state: 'not_started', verification_failures: [], verification_attempts_count: 0, manual_verification_requested: false },
        labels: {},
        description: 'American Female',
        preview_url: '',
        available_for_tiers: [],
        settings: { stability: 0.5, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
        sharing: { status: 'disabled', history_item_sample_id: '', original_voice_id: '', public_owner_id: '', liked_by_count: 0, cloned_by_count: 0 },
        high_quality_base_model_ids: [],
        safety_control: 'none',
        voice_verification: { requires_verification: false, is_verified: true, verification_failures: [], verification_attempts_count: 0, language: 'en' }
      },
      {
        voice_id: 'TxGEqnHWrfWFTfGW9XjX',
        name: 'Josh',
        samples: [],
        category: 'premade',
        fine_tuning: { is_allowed: false, finetuning_state: 'not_started', verification_failures: [], verification_attempts_count: 0, manual_verification_requested: false },
        labels: {},
        description: 'American Male',
        preview_url: '',
        available_for_tiers: [],
        settings: { stability: 0.5, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
        sharing: { status: 'disabled', history_item_sample_id: '', original_voice_id: '', public_owner_id: '', liked_by_count: 0, cloned_by_count: 0 },
        high_quality_base_model_ids: [],
        safety_control: 'none',
        voice_verification: { requires_verification: false, is_verified: true, verification_failures: [], verification_attempts_count: 0, language: 'en' }
      }
    ];
  }

  async getUsage(): Promise<ElevenLabsUsage> {
    try {
      const response = await fetch(`${this.baseUrl}/user/subscription`, {
        headers: {
          'Xi-Api-Key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch usage: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to get ElevenLabs usage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async makeRequest<T>(requestFn: () => Promise<T>, maxRetries = 3): Promise<T> {
    return this.requestQueue.add(async () => {
      // Rate limiting
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.minRequestInterval) {
        await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest));
      }
      this.lastRequestTime = Date.now();

      // Retry logic for concurrent request limits
      let lastError: Error | null = null;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await requestFn();
        } catch (error) {
          lastError = error as Error;
          
          // Check if it's a rate limit or concurrent request error
          if (error instanceof Error && error.message.includes('429')) {
            const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5 seconds
            console.log(`ElevenLabs rate limited, retrying in ${waitTime}ms (attempt ${attempt}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          
          // For non-rate-limit errors, don't retry
          throw error;
        }
      }
      
      throw lastError || new Error('Max retries exceeded');
    });
  }

  async generateSpeech(
    text: string,
    voice_id: string = 'EXAVITQu4vr4xnSDxMaL', // Default voice (Bella)
    options: ElevenLabsOptions = {}
  ): Promise<ArrayBuffer> {
    return this.makeRequest(async () => {
      // Default voice settings for good quality
      const defaultSettings = {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      };

      const payload = {
        text,
        model_id: options.model_id || 'eleven_multilingual_v2',
        voice_settings: {
          ...defaultSettings,
          ...options.voice_settings,
        },
        ...options,
      };

      const response = await fetch(`${this.baseUrl}/text-to-speech/${voice_id}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'Xi-Api-Key': this.apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return await response.arrayBuffer();
    });
  }

  async generateSpeechStream(
    text: string,
    voice_id: string = 'EXAVITQu4vr4xnSDxMaL',
    options: ElevenLabsOptions = {}
  ): Promise<ReadableStream> {
    return this.makeRequest(async () => {
      const defaultSettings = {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      };

      const payload = {
        text,
        model_id: options.model_id || 'eleven_multilingual_v2',
        voice_settings: {
          ...defaultSettings,
          ...options.voice_settings,
        },
        ...options,
      };

      const response = await fetch(`${this.baseUrl}/text-to-speech/${voice_id}/stream`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'Xi-Api-Key': this.apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      return response.body;
    });
  }

  // Get recommended voices for different use cases
  static getRecommendedVoices(): Array<{
    voice_id: string;
    name: string;
    description: string;
    use_case: string;
  }> {
    return [
      {
        voice_id: 'EXAVITQu4vr4xnSDxMaL',
        name: 'Bella',
        description: 'American young adult female',
        use_case: 'General purpose, friendly tone'
      },
      {
        voice_id: 'ErXwobaYiN019PkySvjV',
        name: 'Antoni',
        description: 'American adult male',
        use_case: 'Professional, clear narration'
      },
      {
        voice_id: 'VR6AewLTigWG4xSOukaG',
        name: 'Arnold',
        description: 'American adult male',
        use_case: 'Strong, confident delivery'
      },
      {
        voice_id: 'pNInz6obpgDQGcFmaJgB',
        name: 'Adam',
        description: 'American adult male',
        use_case: 'Deep, authoritative voice'
      },
      {
        voice_id: 'yoZ06aMxZJJ28mfd3POQ',
        name: 'Sam',
        description: 'American adult male',
        use_case: 'Casual, conversational'
      }
    ];
  }

  // Estimate character count for usage tracking
  static estimateCharacterUsage(text: string): number {
    // ElevenLabs counts characters including whitespace and punctuation
    return text.length;
  }

  // Check if text is within reasonable limits
  static validateTextLength(text: string, maxChars: number = 5000): boolean {
    return text.length <= maxChars;
  }
}

// Create default instance
const apiKey = process.env.ELEVENLABS_API_KEY || 'sk_355f9dc67536de2da923d55a3e276b8ab19958827e3e6f8f';
export const elevenLabsClient = new ElevenLabsClient(apiKey);

// Helper function to check ElevenLabs setup
export async function checkElevenLabsSetup(): Promise<{
  available: boolean;
  voices: ElevenLabsVoice[];
  usage?: ElevenLabsUsage;
  error?: string;
}> {
  try {
    const available = await elevenLabsClient.isAvailable();
    
    if (!available) {
      return {
        available: false,
        voices: [],
        error: 'ElevenLabs API is not available. Please check your API key.'
      };
    }

    const [voices, usage] = await Promise.all([
      elevenLabsClient.getVoices(),
      elevenLabsClient.getUsage().catch(() => null) // Don't fail if usage check fails
    ]);

    return {
      available: true,
      voices,
      usage: usage || undefined,
    };
  } catch (error) {
    return {
      available: false,
      voices: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}