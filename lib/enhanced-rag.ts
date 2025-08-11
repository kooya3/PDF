import { ChatOllama } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { documentStore, DocumentChunk } from './memory-store';

// Enhanced RAG implementation using our existing infrastructure
export class EnhancedRAG {
  private model: ChatOllama;
  private embeddingModel: string;

  constructor() {
    this.model = new ChatOllama({
      baseUrl: "http://localhost:11434",
      model: "tinyllama",
      temperature: 0.7,
      numPredict: 512,
    });
    this.embeddingModel = "tinyllama";
  }

  /**
   * Generate embeddings using Ollama
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch('http://localhost:11434/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.embeddingModel,
          prompt: text
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.embedding || [];
      }
    } catch (error) {
      console.error('Error generating embedding:', error);
    }
    return [];
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Enhanced semantic search using embeddings
   */
  async findRelevantChunks(
    docId: string, 
    query: string, 
    topK: number = 3
  ): Promise<{ chunk: DocumentChunk; score: number }[]> {
    // Get document content from memory store
    const docContent = documentStore.getDocumentContent(docId);
    if (!docContent || !docContent.chunks.length) {
      return [];
    }

    // Generate embedding for the query
    const queryEmbedding = await this.generateEmbedding(query);
    if (queryEmbedding.length === 0) {
      // Fallback to keyword matching if embeddings fail
      return this.fallbackKeywordSearch(docContent.chunks, query, topK);
    }

    // Generate embeddings for chunks and calculate similarity
    const scoredChunks: { chunk: DocumentChunk; score: number }[] = [];
    
    for (const chunk of docContent.chunks) {
      const chunkEmbedding = await this.generateEmbedding(chunk.content);
      if (chunkEmbedding.length > 0) {
        const score = this.cosineSimilarity(queryEmbedding, chunkEmbedding);
        scoredChunks.push({ chunk, score });
      }
    }

    // Sort by similarity score and return top K
    return scoredChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Fallback keyword-based search
   */
  private fallbackKeywordSearch(
    chunks: DocumentChunk[], 
    query: string, 
    topK: number
  ): { chunk: DocumentChunk; score: number }[] {
    const keywords = query.toLowerCase().split(' ').filter(word => word.length > 2);
    
    const scoredChunks = chunks.map(chunk => {
      const content = chunk.content.toLowerCase();
      let score = 0;
      
      keywords.forEach(keyword => {
        const regex = new RegExp(keyword, 'gi');
        const matches = content.match(regex);
        if (matches) {
          score += matches.length;
        }
      });
      
      // Normalize score by chunk length
      score = score / (chunk.content.length / 100);
      
      return { chunk, score };
    });

    return scoredChunks
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Enhanced context-aware response generation
   */
  async generateResponse(
    docId: string, 
    question: string, 
    chatHistory: Array<{role: string; content: string}> = []
  ): Promise<string> {
    try {
      // Find most relevant chunks
      const relevantChunks = await this.findRelevantChunks(docId, question, 4);
      
      if (relevantChunks.length === 0) {
        return "I couldn't find relevant information in the document to answer your question. Could you try rephrasing your question or asking about specific topics from the document?";
      }

      // Build context from relevant chunks
      const context = relevantChunks
        .map((item, index) => `Section ${index + 1} (relevance: ${Math.round(item.score * 100)}%):\n${item.chunk.content}`)
        .join('\n\n---\n\n');

      // Build chat history context
      const historyContext = chatHistory.length > 0 
        ? chatHistory.slice(-4).map(msg => `${msg.role}: ${msg.content}`).join('\n')
        : '';

      // Create enhanced prompt template
      const promptTemplate = ChatPromptTemplate.fromTemplate(`
You are an AI assistant that helps users understand and analyze documents. You have access to relevant sections from a document and should provide accurate, helpful responses based on that content.

Document Context:
{context}

${historyContext ? `Previous Conversation:\n${historyContext}\n` : ''}

Current Question: {question}

Instructions:
1. Answer based primarily on the provided document context
2. Be specific and cite relevant information from the document sections
3. If the context doesn't fully answer the question, acknowledge what you can and cannot determine
4. Maintain a helpful, conversational tone
5. If asked for summaries, structure your response clearly
6. For complex questions, break down your answer into logical parts

Answer:
      `);

      // Generate response using LangChain
      const chain = promptTemplate.pipe(this.model).pipe(new StringOutputParser());
      
      const response = await chain.invoke({
        context: context,
        question: question
      });

      return response.trim();

    } catch (error) {
      console.error('Error generating enhanced response:', error);
      
      // Fallback to simple response
      const docContent = documentStore.getDocumentContent(docId);
      if (docContent) {
        const preview = docContent.fullText.substring(0, 800);
        return `I encountered an error while analyzing the document, but I can see it contains information about various topics. Here's a preview of the content:\n\n${preview}...\n\nPlease try asking your question again, and I'll do my best to help based on the document content.`;
      }
      
      return "I apologize, but I encountered an error while processing your question. Please try again.";
    }
  }

  /**
   * Generate document summary
   */
  async summarizeDocument(docId: string): Promise<string> {
    const docContent = documentStore.getDocumentContent(docId);
    const docMetadata = documentStore.getDocument(docId);
    
    if (!docContent || !docMetadata) {
      return "Document not found or not processed yet.";
    }

    const promptTemplate = ChatPromptTemplate.fromTemplate(`
Please provide a comprehensive summary of the following document:

Document Name: {fileName}
Word Count: {wordCount}
Content:
{content}

Please provide:
1. A brief overview (2-3 sentences)
2. Key topics covered
3. Main points or conclusions
4. Any notable data, dates, or figures mentioned

Summary:
    `);

    try {
      const chain = promptTemplate.pipe(this.model).pipe(new StringOutputParser());
      
      const response = await chain.invoke({
        fileName: docMetadata.name,
        wordCount: docMetadata.wordCount,
        content: docContent.fullText.substring(0, 4000) // Limit for token efficiency
      });

      return response.trim();
    } catch (error) {
      console.error('Error generating summary:', error);
      return `I can provide a basic summary of "${docMetadata.name}": This document contains ${docMetadata.wordCount} words and covers various topics. For a detailed summary, please try asking specific questions about the content.`;
    }
  }

  /**
   * Extract key information from document
   */
  async extractKeyInfo(docId: string, infoType: 'dates' | 'numbers' | 'people' | 'topics' | 'actions'): Promise<string> {
    const docContent = documentStore.getDocumentContent(docId);
    
    if (!docContent) {
      return "Document not found or not processed yet.";
    }

    const prompts = {
      dates: "Extract all dates, time periods, and temporal references mentioned in this document:",
      numbers: "Extract all numbers, statistics, measurements, and quantitative data from this document:",
      people: "Extract all names of people, organizations, and entities mentioned in this document:",
      topics: "Extract the main topics, themes, and subject areas covered in this document:",
      actions: "Extract action items, tasks, recommendations, or next steps mentioned in this document:"
    };

    const promptTemplate = ChatPromptTemplate.fromTemplate(`
${prompts[infoType]}

Document Content:
{content}

Please format your response as a clear, organized list with brief context for each item found.

Extracted Information:
    `);

    try {
      const chain = promptTemplate.pipe(this.model).pipe(new StringOutputParser());
      
      const response = await chain.invoke({
        content: docContent.fullText
      });

      return response.trim();
    } catch (error) {
      console.error(`Error extracting ${infoType}:`, error);
      return `I encountered an error while extracting ${infoType} from the document. Please try asking a more specific question.`;
    }
  }
}

// Export singleton instance
export const enhancedRAG = new EnhancedRAG();