import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { pineconeKnowledgeBase } from '@/lib/pinecone-knowledge-base';
import { Ollama } from '@langchain/ollama';

interface SystemStatus {
  overall: 'healthy' | 'degraded' | 'down';
  services: {
    pinecone: {
      status: 'healthy' | 'down';
      url: string;
      responseTime?: number;
      error?: string;
    };
    ollama: {
      status: 'healthy' | 'down';
      url: string;
      models?: string[];
      responseTime?: number;
      error?: string;
    };
    convex: {
      status: 'healthy' | 'down';
      url: string;
      responseTime?: number;
      error?: string;
    };
  };
  timestamp: string;
  version: string;
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    
    console.log('Checking system status...');

    // Initialize status object
    const status: SystemStatus = {
      overall: 'healthy',
      services: {
        pinecone: {
          status: 'down',
          url: 'https://api.pinecone.io'
        },
        ollama: {
          status: 'down',
          url: process.env.OLLAMA_URL || 'http://localhost:11434'
        },
        convex: {
          status: 'down',
          url: process.env.NEXT_PUBLIC_CONVEX_URL || 'unknown'
        }
      },
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };

    // Test ChromaDB connection
    try {
      const chromaStart = Date.now();
      const pineconeHealthy = await pineconeKnowledgeBase.testConnection();
      const chromaTime = Date.now() - chromaStart;

      status.services.pinecone.status = pineconeHealthy ? 'healthy' : 'down';
      status.services.pinecone.responseTime = chromaTime;

      if (!pineconeHealthy) {
        status.services.pinecone.error = 'Connection failed';
      }
    } catch (error) {
      status.services.pinecone.status = 'down';
      status.services.pinecone.error = error instanceof Error ? error.message : 'Unknown error';
    }

    // Test Ollama connection
    try {
      const ollamaStart = Date.now();
      
      // Try to connect to Ollama
      const response = await fetch(`${status.services.ollama.url}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      const ollamaTime = Date.now() - ollamaStart;
      status.services.ollama.responseTime = ollamaTime;

      if (response.ok) {
        const data = await response.json();
        status.services.ollama.status = 'healthy';
        status.services.ollama.models = data.models?.map((model: any) => model.name) || [];
      } else {
        status.services.ollama.status = 'down';
        status.services.ollama.error = `HTTP ${response.status}: ${response.statusText}`;
      }
    } catch (error) {
      status.services.ollama.status = 'down';
      status.services.ollama.error = error instanceof Error ? error.message : 'Connection failed';
    }

    // Test Convex connection (basic check)
    try {
      const convexStart = Date.now();
      
      // Simple check - if we have a URL, assume it's working (more thorough check would require actual query)
      if (status.services.convex.url && status.services.convex.url !== 'unknown') {
        status.services.convex.status = 'healthy';
        status.services.convex.responseTime = Date.now() - convexStart;
      } else {
        status.services.convex.status = 'down';
        status.services.convex.error = 'Convex URL not configured';
      }
    } catch (error) {
      status.services.convex.status = 'down';
      status.services.convex.error = error instanceof Error ? error.message : 'Unknown error';
    }

    // Determine overall status
    const serviceStatuses = Object.values(status.services).map(service => service.status);
    const downServices = serviceStatuses.filter(s => s === 'down').length;

    if (downServices === 0) {
      status.overall = 'healthy';
    } else if (downServices < serviceStatuses.length) {
      status.overall = 'degraded';
    } else {
      status.overall = 'down';
    }

    console.log(`System status check completed in ${Date.now() - startTime}ms: ${status.overall}`);

    return NextResponse.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('System status check failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to check system status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'test-ollama-model':
        try {
          const model = body.model || 'llama3.2';
          console.log(`Testing Ollama model: ${model}`);

          const ollama = new Ollama({
            baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
            model,
            temperature: 0.1,
          });

          const testPrompt = 'Hello, please respond with "AI system test successful"';
          const startTime = Date.now();
          const response = await ollama.invoke(testPrompt);
          const responseTime = Date.now() - startTime;

          return NextResponse.json({
            success: true,
            data: {
              model,
              response: response.substring(0, 200),
              responseTime,
              status: 'healthy'
            },
            message: `Model ${model} test completed successfully`
          });

        } catch (error) {
          return NextResponse.json({
            success: false,
            error: `Model test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }

      case 'test-pinecone':
        try {
          console.log('Testing Pinecone connection...');
          
          const startTime = Date.now();
          const healthy = await pineconeKnowledgeBase.testConnection();
          const responseTime = Date.now() - startTime;

          if (healthy) {
            
            return NextResponse.json({
              success: true,
              data: {
                status: 'healthy',
                responseTime,
                collections: collections.length,
                knowledgeBases: collections
              },
              message: 'ChromaDB test completed successfully'
            });
          } else {
            return NextResponse.json({
              success: false,
              error: 'ChromaDB connection failed'
            });
          }

        } catch (error) {
          return NextResponse.json({
            success: false,
            error: `ChromaDB test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }

      case 'health-check':
        const healthCheck = await GET(request);
        return healthCheck;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: test-ollama-model, test-chromadb, health-check' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('System action failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to perform system action',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}