import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

interface TTSRequest {
  text: string;
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
  engine?: 'espeak' | 'piper' | 'auto';
}

// Check if espeak is available
function isESpeakAvailable(): boolean {
  try {
    execSync('which espeak', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Check if piper is available
function isPiperAvailable(): boolean {
  try {
    execSync('which piper', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Generate speech using eSpeak
async function generateWithESpeak(text: string, options: TTSRequest): Promise<Buffer> {
  const tempFile = join(tmpdir(), `tts_${Date.now()}.wav`);
  
  try {
    // Build eSpeak command
    const args = [
      '-w', tempFile, // Write to file
      '-s', (options.rate ? Math.round(options.rate * 175) : 175).toString(), // Speed (words per minute)
      '-p', (options.pitch ? Math.round(options.pitch * 50) : 50).toString(), // Pitch (0-99)
      '-a', (options.volume ? Math.round(options.volume * 100) : 100).toString(), // Amplitude (0-200)
    ];

    // Add voice if specified
    if (options.voice) {
      args.push('-v', options.voice);
    } else if (options.lang) {
      args.push('-v', options.lang);
    }

    // Add text
    args.push(text);

    // Execute eSpeak
    execSync(`espeak ${args.join(' ')}`, { 
      stdio: 'ignore',
      timeout: 30000, // 30 second timeout
    });

    // Read the generated file
    const audioBuffer = readFileSync(tempFile);
    
    // Clean up temp file
    unlinkSync(tempFile);
    
    return audioBuffer;
  } catch (error) {
    // Clean up temp file on error
    try {
      unlinkSync(tempFile);
    } catch {}
    
    throw new Error(`eSpeak generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Generate speech using Piper (if available)
async function generateWithPiper(text: string, options: TTSRequest): Promise<Buffer> {
  const tempInputFile = join(tmpdir(), `tts_input_${Date.now()}.txt`);
  const tempOutputFile = join(tmpdir(), `tts_output_${Date.now()}.wav`);
  
  try {
    // Write text to temp file
    writeFileSync(tempInputFile, text, 'utf-8');
    
    // Build Piper command
    const args = [
      '--model', options.voice || 'en_US-lessac-medium', // Default model
      '--output_file', tempOutputFile,
      tempInputFile
    ];

    // Execute Piper
    execSync(`piper ${args.join(' ')}`, { 
      stdio: 'ignore',
      timeout: 60000, // 60 second timeout
    });

    // Read the generated file
    const audioBuffer = readFileSync(tempOutputFile);
    
    // Clean up temp files
    unlinkSync(tempInputFile);
    unlinkSync(tempOutputFile);
    
    return audioBuffer;
  } catch (error) {
    // Clean up temp files on error
    try {
      unlinkSync(tempInputFile);
      unlinkSync(tempOutputFile);
    } catch {}
    
    throw new Error(`Piper generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: TTSRequest = await request.json();
    const { text, engine = 'auto' } = body;

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

    let audioBuffer: Buffer;
    let usedEngine: string;

    // Determine which engine to use
    if (engine === 'piper' && isPiperAvailable()) {
      audioBuffer = await generateWithPiper(text, body);
      usedEngine = 'piper';
    } else if (engine === 'espeak' && isESpeakAvailable()) {
      audioBuffer = await generateWithESpeak(text, body);
      usedEngine = 'espeak';
    } else if (engine === 'auto') {
      // Try Piper first, fallback to eSpeak
      if (isPiperAvailable()) {
        audioBuffer = await generateWithPiper(text, body);
        usedEngine = 'piper';
      } else if (isESpeakAvailable()) {
        audioBuffer = await generateWithESpeak(text, body);
        usedEngine = 'espeak';
      } else {
        return NextResponse.json(
          { 
            error: 'No TTS engine available',
            details: 'Please install eSpeak or Piper TTS'
          },
          { status: 503 }
        );
      }
    } else {
      return NextResponse.json(
        { 
          error: `Requested engine '${engine}' is not available`,
          availableEngines: {
            piper: isPiperAvailable(),
            espeak: isESpeakAvailable(),
          }
        },
        { status: 400 }
      );
    }

    // Return audio file
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': audioBuffer.length.toString(),
        'X-TTS-Engine': usedEngine,
      },
    });

  } catch (error) {
    console.error('TTS generation error:', error);
    return NextResponse.json(
      { 
        error: 'TTS generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check available TTS engines and voices
export async function GET() {
  const engines = {
    espeak: {
      available: isESpeakAvailable(),
      voices: [],
    },
    piper: {
      available: isPiperAvailable(),
      models: [],
    },
  };

  // Get eSpeak voices if available
  if (engines.espeak.available) {
    try {
      const output = execSync('espeak --voices', { encoding: 'utf-8' });
      const lines = output.split('\n').slice(1); // Skip header
      
      engines.espeak.voices = lines
        .filter(line => line.trim())
        .map(line => {
          const parts = line.trim().split(/\s+/);
          return {
            code: parts[1],
            name: parts.slice(3).join(' '),
            language: parts[2],
          };
        });
    } catch (error) {
      console.warn('Failed to get eSpeak voices:', error);
    }
  }

  // Get Piper models if available
  if (engines.piper.available) {
    // Common Piper models (this could be made dynamic by checking installed models)
    engines.piper.models = [
      { name: 'en_US-lessac-medium', language: 'English (US)', quality: 'medium' },
      { name: 'en_GB-cori-medium', language: 'English (UK)', quality: 'medium' },
      { name: 'de_DE-thorsten-medium', language: 'German', quality: 'medium' },
      { name: 'fr_FR-upmc-medium', language: 'French', quality: 'medium' },
      { name: 'es_ES-sharvard-medium', language: 'Spanish', quality: 'medium' },
    ];
  }

  return NextResponse.json({
    engines,
    recommendations: {
      installation: {
        espeak: 'sudo apt-get install espeak (Linux) or brew install espeak (macOS)',
        piper: 'Download from https://github.com/rhasspy/piper/releases',
      },
      usage: {
        webSpeech: 'Use Web Speech API for client-side TTS (recommended for most use cases)',
        serverSide: 'Use server-side TTS for consistent voice across devices or offline usage',
      },
    },
  });
}