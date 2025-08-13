import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { hybridChatService } from '@/lib/hybrid-chat-service';
import { pineconeLangChainService } from '@/lib/pinecone-langchain';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { 
      question, 
      documentId, 
      fileName, 
      history = [] 
    } = await request.json();

    if (!question || !documentId || !fileName) {
      return NextResponse.json(
        { error: 'Missing required fields: question, documentId, fileName' },
        { status: 400 }
      );
    }

    // Process chat with document context using hybrid service
    const response = await hybridChatService.chatWithDocument(
      question,
      {
        documentId,
        userId,
        fileName,
        history: history.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }
    );

    return NextResponse.json({
      response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Pinecone chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    const fileName = searchParams.get('fileName');
    const action = searchParams.get('action');

    if (!documentId || !fileName) {
      return NextResponse.json(
        { error: 'Missing documentId or fileName parameters' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'summary':
        result = await hybridChatService.generateDocumentSummary(
          documentId,
          userId,
          fileName
        );
        break;
      
      case 'extract-dates':
        result = await pineconeLangChainService.extractKeyInformation(
          documentId,
          userId,
          fileName,
          'dates'
        );
        break;
      
      case 'extract-people':
        result = await pineconeLangChainService.extractKeyInformation(
          documentId,
          userId,
          fileName,
          'people'
        );
        break;
      
      case 'extract-places':
        result = await pineconeLangChainService.extractKeyInformation(
          documentId,
          userId,
          fileName,
          'places'
        );
        break;
      
      case 'extract-action-items':
        result = await pineconeLangChainService.extractKeyInformation(
          documentId,
          userId,
          fileName,
          'action_items'
        );
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      result,
      action,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Pinecone analysis API error:', error);
    return NextResponse.json(
      { error: 'Failed to process analysis request' },
      { status: 500 }
    );
  }
}