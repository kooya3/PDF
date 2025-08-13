import { NextRequest, NextResponse } from 'next/server';
import { hybridTTSService } from '@/lib/hybrid-tts-service';
import { checkElevenLabsSetup } from '@/lib/elevenlabs-client';

interface TTSRequest {
  text: string;
  voice_id?: string;
  model_id?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  stability?: number;
  similarity_boost?: number;
  style?: number;
  use_speaker_boost?: boolean;
  streaming?: boolean;
  maxCharacters?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: TTSRequest = await request.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    if (text.length > 5000) {
      return NextResponse.json(
        { error: 'Text too long (max 5000 characters)' },
        { status: 400 }
      );
    }

    try {
      // Use ElevenLabs-only TTS service
      const result = await hybridTTSService.generateSpeech(text, {
        voice_id: body.voice_id,
        model_id: body.model_id,
        rate: body.rate,
        pitch: body.pitch,
        volume: body.volume,
        stability: body.stability,
        similarity_boost: body.similarity_boost,
        style: body.style,
        use_speaker_boost: body.use_speaker_boost,
        streaming: body.streaming,
        maxCharacters: body.maxCharacters,
      });

      // Convert ArrayBuffer to Buffer
      const audioBuffer = Buffer.from(result.audioData);

      return new NextResponse(audioBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.length.toString(),
          'X-TTS-Provider': result.provider,
          'X-TTS-Voice': result.voice.name,
          'X-TTS-Voice-ID': result.voice.id,
          'X-TTS-Quality': result.metadata.quality,
          'X-TTS-Characters': result.metadata.characterCount.toString(),
          'X-TTS-Processing-Time': result.metadata.processingTime.toString(),
          ...(result.metadata.cost && { 'X-TTS-Cost': result.metadata.cost.toString() }),
        },
      });
    } catch (error) {
      console.error('ElevenLabs TTS generation failed:', error);
      
      return NextResponse.json(
        { 
          error: 'TTS generation failed',
          details: error instanceof Error ? error.message : 'Unknown error',
          provider: 'elevenlabs'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json(
      { 
        error: 'TTS request processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check ElevenLabs TTS status and available voices
export async function GET() {
  try {
    // Get hybrid system status (ElevenLabs only)
    const hybridStatus = await hybridTTSService.getSystemStatus();
    const elevenLabsSetup = await checkElevenLabsSetup();

    return NextResponse.json({
      provider: 'elevenlabs',
      available: elevenLabsSetup.available,
      engines: {
        elevenlabs: {
          available: elevenLabsSetup.available,
          voices: elevenLabsSetup.voices,
          usage: elevenLabsSetup.usage,
          error: elevenLabsSetup.error,
        },
      },
      hybrid: {
        enabled: true,
        status: {
          providers: hybridStatus.providers,
          totalVoices: hybridStatus.totalVoices,
          healthScore: hybridStatus.healthScore,
          recommendations: hybridStatus.recommendations,
          conversationalVoices: hybridStatus.conversationalVoices,
        },
        features: {
          provider: 'ElevenLabs Only',
          qualityLevels: ['premium'],
          voiceOptimization: 'Conversational voices optimized for natural speech',
          streaming: 'Real-time audio generation supported',
          fallback: 'Enhanced error handling with detailed feedback',
        }
      },
      conversationalVoices: hybridStatus.conversationalVoices,
      recommendations: {
        setup: {
          elevenlabs: 'ElevenLabs API key configured and working',
        },
        usage: {
          chatMessages: 'Use Rachel or Adam voice for conversational responses',
          documentReading: 'Use Antoni voice for professional document narration',
          casualMode: 'Use Sam voice for friendly, relaxed interactions',
          settings: 'Adjust stability, similarity, and style for different contexts',
        },
        optimization: {
          naturalSpeech: 'Conversational voices are pre-optimized for natural flow',
          textCleaning: 'Automatic text preprocessing for better pronunciation',
          voiceSelection: 'Context-aware voice recommendations (chat, document, etc.)',
          errorHandling: 'Graceful degradation with detailed error messages',
        }
      },
    });
  } catch (error) {
    console.error('TTS status check failed:', error);
    return NextResponse.json(
      {
        provider: 'elevenlabs',
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        recommendations: {
          setup: 'Please check your ElevenLabs API key configuration in environment variables'
        }
      },
      { status: 500 }
    );
  }
}