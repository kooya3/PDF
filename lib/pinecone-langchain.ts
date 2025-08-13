import { ChatOllama } from '@langchain/ollama';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { pineconeEmbeddingService } from './pinecone-embeddings';

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

export class PineconeLangChainService {
  private llm: ChatOllama;
  private conversationPrompt: PromptTemplate;

  constructor() {
    // Initialize Ollama LLM
    this.llm = new ChatOllama({
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'tinyllama',
      temperature: 0.7,
    });

    // Create conversation prompt template
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
  }

  async chatWithDocument(
    question: string,
    context: ChatContext
  ): Promise<string> {
    try {
      // Get relevant document chunks from Pinecone
      const relevantChunks = await pineconeEmbeddingService.searchSimilarDocuments(
        question,
        context.userId,
        context.documentId,
        5
      );

      // Extract content from chunks
      const documentContext = relevantChunks
        .map((chunk, index) => {
          const content = chunk.metadata?.content || '';
          const chunkIndex = chunk.metadata?.chunkIndex || index;
          return `[Chunk ${chunkIndex + 1}]: ${content}`;
        })
        .join('\n\n');

      // Format conversation history
      const historyText = context.history
        .slice(-6) // Keep last 6 messages for context
        .map(msg => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
        .join('\n');

      // Create the processing chain
      const chain = RunnableSequence.from([
        this.conversationPrompt,
        this.llm,
        new StringOutputParser(),
      ]);

      // Generate response
      const response = await chain.invoke({
        context: documentContext || 'No relevant document content found.',
        history: historyText || 'No previous conversation.',
        question,
      });

      return response;
    } catch (error) {
      console.error('Error in chat processing:', error);
      throw new Error(`Failed to process chat: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateDocumentSummary(
    documentId: string,
    userId: string,
    fileName: string
  ): Promise<string> {
    try {
      // Get document chunks for summary
      const allChunks = await pineconeEmbeddingService.searchSimilarDocuments(
        'document summary overview main points',
        userId,
        documentId,
        10
      );

      const fullContent = allChunks
        .map(chunk => chunk.metadata?.content || '')
        .join(' ');

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
        content: fullContent || 'No content available for summary.',
      });

      return summary;
    } catch (error) {
      console.error('Error generating summary:', error);
      throw new Error(`Failed to generate summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async extractKeyInformation(
    documentId: string,
    userId: string,
    fileName: string,
    extractionType: 'dates' | 'people' | 'places' | 'numbers' | 'action_items'
  ): Promise<string[]> {
    try {
      const searchQuery = {
        dates: 'dates times schedules deadlines when',
        people: 'names people persons individuals who',
        places: 'locations addresses places where',
        numbers: 'numbers statistics data amounts quantities',
        action_items: 'todo tasks actions requirements must should',
      }[extractionType];

      const relevantChunks = await pineconeEmbeddingService.searchSimilarDocuments(
        searchQuery,
        userId,
        documentId,
        8
      );

      const content = relevantChunks
        .map(chunk => chunk.metadata?.content || '')
        .join(' ');

      const extractionPrompt = PromptTemplate.fromTemplate(`
Extract all {extractionType} from this document content and return them as a list.

Document Content:
{content}

Instructions:
- Only extract information that clearly relates to {extractionType}
- Return each item on a new line
- Be specific and include context when helpful
- If none found, return "None found"

{extractionType}:`);

      const chain = RunnableSequence.from([
        extractionPrompt,
        this.llm,
        new StringOutputParser(),
      ]);

      const result = await chain.invoke({
        extractionType: extractionType.replace('_', ' '),
        content: content || 'No content available.',
      });

      return result
        .split('\n')
        .map(item => item.trim())
        .filter(item => item && item !== 'None found');
    } catch (error) {
      console.error('Error extracting information:', error);
      return [];
    }
  }
}

export const pineconeLangChainService = new PineconeLangChainService();