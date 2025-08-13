export interface TTSVoice {
  id: string;
  name: string;
  lang: string;
  gender?: 'male' | 'female' | 'neutral';
  engine: 'web-speech' | 'piper' | 'espeak';
  quality?: 'low' | 'medium' | 'high';
  isDefault?: boolean;
}

export interface TTSOptions {
  voice?: string;
  rate?: number; // 0.1 - 10
  pitch?: number; // 0 - 2
  volume?: number; // 0 - 1
  lang?: string;
}

export interface TTSStatus {
  isSupported: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  currentText?: string;
  currentPosition?: number;
  duration?: number;
  error?: string;
}

export class TTSClient {
  private synthesis: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private onStatusChange?: (status: TTSStatus) => void;
  private onError?: (error: string) => void;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    }
  }

  // Check if TTS is supported
  isSupported(): boolean {
    return this.synthesis !== null;
  }

  // Get available voices
  async getVoices(): Promise<TTSVoice[]> {
    if (!this.synthesis) return [];

    return new Promise((resolve) => {
      let voices = this.synthesis!.getVoices();
      
      if (voices.length > 0) {
        resolve(this.formatVoices(voices));
      } else {
        // Some browsers load voices asynchronously
        this.synthesis!.onvoiceschanged = () => {
          voices = this.synthesis!.getVoices();
          resolve(this.formatVoices(voices));
        };
      }
    });
  }

  private formatVoices(voices: SpeechSynthesisVoice[]): TTSVoice[] {
    return voices.map((voice, index) => ({
      id: voice.voiceURI || `voice-${index}`,
      name: voice.name,
      lang: voice.lang,
      engine: 'web-speech' as const,
      quality: voice.localService ? 'high' : 'medium',
      isDefault: voice.default,
    }));
  }

  // Speak text
  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    if (!this.synthesis) {
      throw new Error('Text-to-speech is not supported in this browser');
    }

    // Stop any current speech
    this.stop();

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set options
      if (options.rate) utterance.rate = Math.max(0.1, Math.min(10, options.rate));
      if (options.pitch) utterance.pitch = Math.max(0, Math.min(2, options.pitch));
      if (options.volume) utterance.volume = Math.max(0, Math.min(1, options.volume));
      if (options.lang) utterance.lang = options.lang;

      // Set voice
      if (options.voice) {
        const voices = this.synthesis!.getVoices();
        const selectedVoice = voices.find(v => 
          v.voiceURI === options.voice || v.name === options.voice
        );
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      // Event listeners
      utterance.onstart = () => {
        this.notifyStatusChange({
          isSupported: true,
          isPlaying: true,
          isPaused: false,
          currentText: text,
        });
      };

      utterance.onend = () => {
        this.currentUtterance = null;
        this.notifyStatusChange({
          isSupported: true,
          isPlaying: false,
          isPaused: false,
        });
        resolve();
      };

      utterance.onerror = (event) => {
        this.currentUtterance = null;
        const error = `TTS Error: ${event.error}`;
        this.notifyStatusChange({
          isSupported: true,
          isPlaying: false,
          isPaused: false,
          error,
        });
        this.onError?.(error);
        reject(new Error(error));
      };

      utterance.onpause = () => {
        this.notifyStatusChange({
          isSupported: true,
          isPlaying: false,
          isPaused: true,
          currentText: text,
        });
      };

      utterance.onresume = () => {
        this.notifyStatusChange({
          isSupported: true,
          isPlaying: true,
          isPaused: false,
          currentText: text,
        });
      };

      this.currentUtterance = utterance;
      this.synthesis!.speak(utterance);
    });
  }

  // Pause current speech
  pause(): void {
    if (this.synthesis && this.synthesis.speaking && !this.synthesis.paused) {
      this.synthesis.pause();
    }
  }

  // Resume paused speech
  resume(): void {
    if (this.synthesis && this.synthesis.paused) {
      this.synthesis.resume();
    }
  }

  // Stop current speech
  stop(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.currentUtterance = null;
      this.notifyStatusChange({
        isSupported: true,
        isPlaying: false,
        isPaused: false,
      });
    }
  }

  // Get current status
  getStatus(): TTSStatus {
    if (!this.synthesis) {
      return {
        isSupported: false,
        isPlaying: false,
        isPaused: false,
      };
    }

    return {
      isSupported: true,
      isPlaying: this.synthesis.speaking && !this.synthesis.paused,
      isPaused: this.synthesis.paused,
      currentText: this.currentUtterance?.text,
    };
  }

  // Set status change callback
  setStatusChangeCallback(callback: (status: TTSStatus) => void): void {
    this.onStatusChange = callback;
  }

  // Set error callback
  onErrorCallback(callback: (error: string) => void): void {
    this.onError = callback;
  }

  private notifyStatusChange(status: TTSStatus): void {
    if (this.onStatusChange && typeof this.onStatusChange === 'function') {
      try {
        this.onStatusChange(status);
      } catch (error) {
        console.warn('TTS status change callback error:', error);
      }
    }
  }

  // Server-side TTS support (for Piper TTS)
  async speakWithServer(text: string, options: TTSOptions = {}): Promise<AudioBuffer> {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          ...options,
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.statusText}`);
      }

      const audioArrayBuffer = await response.arrayBuffer();
      const audioContext = new AudioContext();
      return await audioContext.decodeAudioData(audioArrayBuffer);
    } catch (error) {
      throw new Error(`Server TTS failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Play audio buffer
  async playAudioBuffer(audioBuffer: AudioBuffer): Promise<void> {
    const audioContext = new AudioContext();
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);

    return new Promise((resolve) => {
      source.onended = () => resolve();
      source.start();
    });
  }
}

// Utility functions for text processing
export class TTSTextProcessor {
  // Split long text into chunks suitable for TTS
  static splitText(text: string, maxLength: number = 200): string[] {
    const sentences = text.match(/[^\.!?]+[\.!?]+/g) || [text];
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      
      if (currentChunk.length + trimmedSentence.length <= maxLength) {
        currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        
        // If single sentence is too long, split by words
        if (trimmedSentence.length > maxLength) {
          const words = trimmedSentence.split(' ');
          let wordChunk = '';
          
          for (const word of words) {
            if (wordChunk.length + word.length + 1 <= maxLength) {
              wordChunk += (wordChunk ? ' ' : '') + word;
            } else {
              if (wordChunk) {
                chunks.push(wordChunk);
              }
              wordChunk = word;
            }
          }
          
          if (wordChunk) {
            chunks.push(wordChunk);
          }
          currentChunk = '';
        } else {
          currentChunk = trimmedSentence;
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  // Clean text for better TTS pronunciation
  static cleanTextForTTS(text: string): string {
    return text
      // Replace URLs with "link"
      .replace(/https?:\/\/\S+/g, 'link')
      // Replace email addresses with "email"
      .replace(/\S+@\S+\.\S+/g, 'email')
      // Replace numbers with written form for common cases
      .replace(/\b(\d{1,3}),(\d{3})\b/g, '$1 thousand $2')
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove markdown formatting
      .replace(/[*_`#]/g, '')
      // Clean up punctuation
      .replace(/([.!?])\1+/g, '$1')
      .trim();
  }
}

// Default TTS client instance
export const ttsClient = new TTSClient();

// React hook for TTS functionality
export const useTTS = () => {
  if (typeof window === 'undefined') {
    return {
      speak: async () => {},
      pause: () => {},
      resume: () => {},
      stop: () => {},
      getStatus: () => ({
        isSupported: false,
        isPlaying: false,
        isPaused: false,
      }),
      getVoices: async () => [],
      isSupported: false,
    };
  }

  return {
    speak: (text: string, options?: TTSOptions) => ttsClient.speak(text, options),
    pause: () => ttsClient.pause(),
    resume: () => ttsClient.resume(),
    stop: () => ttsClient.stop(),
    getStatus: () => ttsClient.getStatus(),
    getVoices: () => ttsClient.getVoices(),
    setStatusChangeCallback: (callback: (status: TTSStatus) => void) => ttsClient.setStatusChangeCallback(callback),
    setErrorCallback: (callback: (error: string) => void) => ttsClient.onErrorCallback(callback),
    isSupported: ttsClient.isSupported(),
  };
};