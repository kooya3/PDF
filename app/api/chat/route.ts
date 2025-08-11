import { NextRequest, NextResponse } from 'next/server';
import { ollamaClient } from '@/lib/ollama';
import { getDemoResponse } from '@/lib/demo-responses';

export async function POST(request: NextRequest) {
  let messages: any[] = [];
  
  try {
    const { messages: requestMessages, model, temperature, maxTokens } = await request.json();
    messages = requestMessages;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // First check if Ollama is available
    const isOllamaAvailable = await ollamaClient.isAvailable();
    
    if (!isOllamaAvailable) {
      // Fallback to demo response if Ollama is not available
      const lastUserMessage = messages[messages.length - 1];
      const demoResponse = getDemoResponse(lastUserMessage?.content || '');
      
      return NextResponse.json({
        choices: [{
          message: {
            content: `${demoResponse}\n\n*⚠️ Demo Mode: Ollama is not running. Please install and start Ollama to use real AI models.*`,
            role: 'assistant'
          }
        }]
      });
    }

    const response = await ollamaClient.chatCompletion(messages, {
      model: model || 'tinyllama',
      temperature,
      stream: false
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Ollama API error:', error);
    
    let errorMessage = 'Failed to process chat completion';
    let statusCode = 500;
    
    if (error instanceof Error) {
      const errorText = error.message;
      
      if (errorText.includes('Failed to connect') || errorText.includes('ECONNREFUSED')) {
        // Use demo response when Ollama is not running
        const lastUserMessage = messages[messages.length - 1];
        const demoResponse = getDemoResponse(lastUserMessage?.content || '');
        
        return NextResponse.json({
          choices: [{
            message: {
              content: `${demoResponse}\n\n*⚠️ Demo Mode: Ollama is not running. Please install and start Ollama to use real AI models.*`,
              role: 'assistant'
            }
          }]
        });
      } else if (errorText.includes('model')) {
        errorMessage = 'Requested model not found. Please install the model in Ollama first.';
        statusCode = 404;
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        type: statusCode === 402 ? 'balance_insufficient' : 'api_error'
      },
      { status: statusCode }
    );
  }
}