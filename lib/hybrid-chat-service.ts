import { ChatOllama } from '@langchain/ollama';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { pineconeEmbeddingService } from './pinecone-embeddings';
import { localEmbeddingFallback } from './local-embedding-fallback';
import { mistralClient, MistralClient, MistralMessage } from './mistral-client';
import { ollamaClient } from './ollama-client';

export type ModelProvider = 'ollama' | 'mistral';
export type QueryComplexity = 'simple' | 'medium' | 'complex';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatContext {
  documentId: string;
  userId: string;
  fileName: string;
  history: ChatMessage[];
}

interface ModelSelectionStrategy {
  provider: ModelProvider;
  model: string;
  reason: string;
}

export class HybridChatService {
  private llm: ChatOllama;
  private conversationPrompt: PromptTemplate;
  private basicPrompt: PromptTemplate;
  private static instance: HybridChatService;

  constructor() {
    // Initialize Ollama LLM (kept for backward compatibility)
    this.llm = new ChatOllama({
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'tinyllama',
      temperature: 0.7,
      requestOptions: {
        timeout: 120000, // 2 minutes timeout for long responses
      },
    });

    // Advanced prompt with document context
    this.conversationPrompt = PromptTemplate.fromTemplate(`
You are an intelligent document assistant. You help users understand and analyze their documents by answering questions based on the document content.

Document Context:
{context}

Conversation History:
{history}

Current Question: {question}

Instructions:
1. Answer the question based primarily on the provided document context
2. If the context doesn't contain relevant information, say so clearly
3. Be concise but comprehensive in your answers
4. Reference specific parts of the document when possible
5. If asked to summarize, provide key points and insights
6. Maintain conversational flow by considering the chat history

Answer:`);

    // Basic prompt for when no context is available
    this.basicPrompt = PromptTemplate.fromTemplate(`
You are a helpful AI assistant. A user is asking about a document called "{fileName}".

Conversation History:
{history}

Current Question: {question}

Instructions:
1. Be helpful and conversational
2. Since you don't have the full document context, be honest about limitations
3. Try to provide general guidance where possible
4. Suggest specific questions the user might ask
5. Maintain a friendly and professional tone

Answer:`);
  }

  async chatWithDocument(
    question: string,
    context: ChatContext
  ): Promise<string> {
    try {
      // Try to get relevant chunks from Pinecone first
      let relevantChunks: any[] = [];
      let usingFallback = false;

      try {
        relevantChunks = await pineconeEmbeddingService.searchSimilarDocuments(
          question,
          context.userId,
          context.documentId,
          5
        );
        console.log(`Found ${relevantChunks.length} relevant chunks from Pinecone`);
      } catch (error) {
        console.log('Pinecone search failed, trying local fallback:', error);
        relevantChunks = await localEmbeddingFallback.searchSimilarDocuments(
          question,
          context.userId,
          context.documentId,
          5
        );
        usingFallback = true;
        console.log(`Found ${relevantChunks.length} relevant chunks from local fallback`);
      }

      // Format conversation history
      const historyText = context.history
        .slice(-6) // Keep last 6 messages for context
        .map(msg => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
        .join('\n');

      let chain;
      let response;

      if (relevantChunks.length > 0) {
        // We have document context - use advanced prompt
        const documentContext = relevantChunks
          .map((chunk, index) => {
            const content = chunk.metadata?.content || '';
            const chunkIndex = chunk.metadata?.chunkIndex || index;
            return `[Chunk ${chunkIndex + 1}]: ${content}`;
          })
          .join('\n\n');

        chain = RunnableSequence.from([
          this.conversationPrompt,
          this.llm,
          new StringOutputParser(),
        ]);

        response = await chain.invoke({
          context: documentContext,
          history: historyText || 'No previous conversation.',
          question,
        });

        if (usingFallback) {
          response += '\n\n*Note: Using local text search (Pinecone unavailable)*';
        }
      } else {
        // No context available - use basic prompt
        console.log('No relevant chunks found, using basic conversation mode');
        
        chain = RunnableSequence.from([
          this.basicPrompt,
          this.llm,
          new StringOutputParser(),
        ]);

        response = await chain.invoke({
          fileName: context.fileName,
          history: historyText || 'No previous conversation.',
          question,
        });

        response += '\n\n*Note: I don\'t have access to the full document content for this search. Please try asking more specific questions or check if the document was processed correctly.*';
      }

      return response;
    } catch (error) {
      console.error('Error in hybrid chat processing:', error);
      throw new Error(`Failed to process chat: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateDocumentSummary(
    documentId: string,
    userId: string,
    fileName: string
  ): Promise<string> {
    try {
      // Try both services to get document chunks
      let allChunks: any[] = [];
      
      try {
        allChunks = await pineconeEmbeddingService.searchSimilarDocuments(
          'document summary overview main points',
          userId,
          documentId,
          10
        );
      } catch (error) {
        console.log('Using local fallback for summary');
        allChunks = await localEmbeddingFallback.searchSimilarDocuments(
          'summary overview content',
          userId,
          documentId,
          10
        );
      }

      const fullContent = allChunks
        .map(chunk => chunk.metadata?.content || '')
        .join(' ');

      if (!fullContent.trim()) {
        return 'Unable to generate summary - no document content found. Please ensure the document was processed correctly.';
      }

      // Limit content length to prevent timeout with smaller models
      const MAX_CONTENT_LENGTH = 3000; // Reasonable limit for tinyllama
      const truncatedContent = fullContent.length > MAX_CONTENT_LENGTH 
        ? fullContent.substring(0, MAX_CONTENT_LENGTH) + '\n\n[Content truncated due to length]'
        : fullContent;

      const summaryPrompt = PromptTemplate.fromTemplate(`
Please provide a comprehensive summary of this document: "{fileName}"

Document Content:
{content}

Create a summary that includes:
1. Main topic and purpose
2. Key points and findings
3. Important details or conclusions
4. Overall structure and organization

Summary:`);

      const chain = RunnableSequence.from([
        summaryPrompt,
        this.llm,
        new StringOutputParser(),
      ]);

      const summary = await chain.invoke({
        fileName,
        content: truncatedContent,
      });

      return summary;
    } catch (error) {
      console.error('Error generating summary:', error);
      
      // Provide more helpful error messages based on error type
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('Timeout')) {
          return `Summary generation timed out. The document may be too large or the AI service is slow. Please try again or try with a smaller section of the document.`;
        }
        if (error.message.includes('fetch failed') || error.message.includes('connection')) {
          return `Unable to connect to AI service. Please check that Ollama is running on http://localhost:11434 and try again.`;
        }
        return `Failed to generate summary: ${error.message}`;
      }
      
      return 'Failed to generate summary due to an unknown error. Please try again.';
    }
  }

  /**
   * Intelligent model selection based on query complexity and system availability
   */
  async selectModel(query: string, forceProvider?: ModelProvider): Promise<ModelSelectionStrategy> {
    // If provider is forced, use it
    if (forceProvider) {
      const model = forceProvider === 'ollama' ? 'llama3.2' : 'mistral-small-latest';
      return {
        provider: forceProvider,
        model,
        reason: 'User-specified provider'
      };
    }

    // Check system availability
    const [ollamaAvailable, mistralAvailable] = await Promise.all([
      ollamaClient.isAvailable(),
      mistralClient.isAvailable()
    ]);

    // If only one is available, use it
    if (!ollamaAvailable && mistralAvailable) {
      return {
        provider: 'mistral',
        model: 'mistral-small-latest',
        reason: 'Ollama unavailable, using Mistral'
      };
    }

    if (ollamaAvailable && !mistralAvailable) {
      return {
        provider: 'ollama',
        model: 'llama3.2',
        reason: 'Mistral unavailable, using Ollama'
      };
    }

    if (!ollamaAvailable && !mistralAvailable) {
      throw new Error('Neither Ollama nor Mistral are available');
    }

    // Both are available - make intelligent decision based on query complexity
    const complexity = MistralClient.estimateQueryComplexity(query);
    
    switch (complexity) {
      case 'simple':
        // For simple queries, prefer fast local Ollama
        return {
          provider: 'ollama',
          model: 'llama3.2',
          reason: 'Simple query - using fast local Ollama'
        };
      
      case 'medium':
        // For medium complexity, use Mistral for better quality
        return {
          provider: 'mistral',
          model: 'mistral-small-latest',
          reason: 'Medium complexity - using Mistral for better quality'
        };
      
      case 'complex':
        // For complex queries, use Mistral's larger model
        return {
          provider: 'mistral',
          model: 'mistral-medium-latest',
          reason: 'Complex query - using Mistral medium model'
        };
      
      default:
        return {
          provider: 'ollama',
          model: 'llama3.2',
          reason: 'Default fallback to Ollama'
        };
    }
  }

  /**
   * Enhanced chat method with intelligent model routing
   */
  async chatWithIntelligentRouting(
    question: string,
    context: ChatContext,
    options?: {
      forceProvider?: ModelProvider;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<{
    response: string;
    provider: ModelProvider;
    model: string;
    reasoning: string;
  }> {
    try {
      // Select the best model for this query
      const selection = await this.selectModel(question, options?.forceProvider);
      
      // Get relevant document chunks (existing logic)
      let relevantChunks: any[] = [];
      let usingFallback = false;

      try {
        relevantChunks = await pineconeEmbeddingService.searchSimilarDocuments(
          question,
          context.userId,
          context.documentId,
          5
        );
        console.log(`Found ${relevantChunks.length} relevant chunks from Pinecone`);
      } catch (error) {
        console.log('Pinecone search failed, trying local fallback:', error);
        relevantChunks = await localEmbeddingFallback.searchSimilarDocuments(
          question,
          context.userId,
          context.documentId,
          5
        );
        usingFallback = true;
        console.log(`Found ${relevantChunks.length} relevant chunks from local fallback`);
      }

      // Format conversation history
      const historyText = context.history
        .slice(-6)
        .map(msg => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
        .join('\n');

      let response: string;

      if (relevantChunks.length > 0) {
        // We have document context
        const documentContext = relevantChunks
          .map((chunk, index) => {
            const content = chunk.metadata?.content || '';
            const chunkIndex = chunk.metadata?.chunkIndex || index;
            return `[Chunk ${chunkIndex + 1}]: ${content}`;
          })
          .join('\n\n');

        const contextPrompt = `You are an intelligent document assistant. You help users understand and analyze their documents by answering questions based on the document content.

Document Context:
${documentContext}

Conversation History:
${historyText || 'No previous conversation.'}

Current Question: ${question}

Instructions:
1. Answer the question based primarily on the provided document context
2. If the context doesn't contain relevant information, say so clearly
3. Be concise but comprehensive in your answers
4. Reference specific parts of the document when possible
5. If asked to summarize, provide key points and insights
6. Maintain conversational flow by considering the chat history

Answer:`;

        if (selection.provider === 'ollama') {
          // Use Ollama
          const ollamaResponse = await ollamaClient.chat([
            { role: 'system', content: contextPrompt },
            { role: 'user', content: question }
          ], selection.model, {
            temperature: options?.temperature || 0.7,
            num_predict: options?.maxTokens || 1000,
          });
          response = ollamaResponse.message.content;
        } else {
          // Use Mistral
          const mistralMessages: MistralMessage[] = [
            { role: 'system', content: contextPrompt },
            { role: 'user', content: question }
          ];
          response = await mistralClient.chat(mistralMessages, selection.model, {
            temperature: options?.temperature || 0.7,
            max_tokens: options?.maxTokens || 1000,
          });
        }

        if (usingFallback) {
          response += '\n\n*Note: Using local text search (Pinecone unavailable)*';
        }
      } else {
        // No context available - use basic prompt
        const basicPrompt = `You are a helpful AI assistant. A user is asking about a document called "${context.fileName}".

Conversation History:
${historyText || 'No previous conversation.'}

Current Question: ${question}

Instructions:
1. Be helpful and conversational
2. Since you don't have the full document context, be honest about limitations
3. Try to provide general guidance where possible
4. Suggest specific questions the user might ask
5. Maintain a friendly and professional tone

Answer:`;

        if (selection.provider === 'ollama') {
          const ollamaResponse = await ollamaClient.chat([
            { role: 'system', content: basicPrompt },
            { role: 'user', content: question }
          ], selection.model, {
            temperature: options?.temperature || 0.7,
            num_predict: options?.maxTokens || 1000,
          });
          response = ollamaResponse.message.content;
        } else {
          const mistralMessages: MistralMessage[] = [
            { role: 'system', content: basicPrompt },
            { role: 'user', content: question }
          ];
          response = await mistralClient.chat(mistralMessages, selection.model, {
            temperature: options?.temperature || 0.7,
            max_tokens: options?.maxTokens || 1000,
          });
        }

        response += '\n\n*Note: I don\'t have access to the full document content for this search. Please try asking more specific questions or check if the document was processed correctly.*';
      }

      return {
        response,
        provider: selection.provider,
        model: selection.model,
        reasoning: selection.reason
      };

    } catch (error) {
      // Fallback logic if primary choice fails
      console.error(`Primary model failed: ${error}`);
      
      try {
        // Try the other provider as fallback
        const fallbackProvider: ModelProvider = 
          (await this.selectModel(question, options?.forceProvider)).provider === 'ollama' ? 'mistral' : 'ollama';
        
        const fallbackResult = await this.chatWithIntelligentRouting(
          question, 
          context, 
          { ...options, forceProvider: fallbackProvider }
        );

        return {
          ...fallbackResult,
          reasoning: `Fallback to ${fallbackResult.provider} after primary failure`
        };

      } catch (fallbackError) {
        throw new Error(`Both providers failed. Primary: ${error}. Fallback: ${fallbackError}`);
      }
    }
  }

  /**
   * Get system health status for both providers
   */
  async getSystemStatus(): Promise<{
    ollama: { available: boolean; models: string[]; error?: string };
    mistral: { available: boolean; models: string[]; error?: string };
    recommendations: string[];
  }> {
    const [ollamaAvailable, mistralAvailable] = await Promise.all([
      ollamaClient.isAvailable(),
      mistralClient.isAvailable()
    ]);

    const [ollamaModels, mistralModels] = await Promise.all([
      ollamaAvailable ? ollamaClient.listModels() : Promise.resolve([]),
      mistralAvailable ? mistralClient.listModels() : Promise.resolve([])
    ]);

    const recommendations: string[] = [];
    
    if (!ollamaAvailable) {
      recommendations.push('Start Ollama with: ollama serve');
    }
    
    if (!mistralAvailable) {
      recommendations.push('Check Mistral API key configuration');
    }
    
    if (ollamaModels.length === 0 && ollamaAvailable) {
      recommendations.push('Install Ollama model with: ollama pull llama3.2');
    }

    return {
      ollama: {
        available: ollamaAvailable,
        models: ollamaModels.map(m => m.name),
        error: !ollamaAvailable ? 'Ollama service not running' : undefined
      },
      mistral: {
        available: mistralAvailable,
        models: mistralModels,
        error: !mistralAvailable ? 'Mistral API not accessible' : undefined
      },
      recommendations
    };
  }

  /**
   * Singleton pattern for global access
   */
  static getInstance(): HybridChatService {
    if (!HybridChatService.instance) {
      HybridChatService.instance = new HybridChatService();
    }
    return HybridChatService.instance;
  }
}

export const hybridChatService = new HybridChatService();