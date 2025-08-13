import { Mistral } from '@mistralai/mistralai';

export interface MistralMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface MistralResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class MistralClient {
  private client: Mistral;
  private defaultModel: string;

  constructor(apiKey: string, defaultModel: string = 'mistral-small-latest') {
    this.client = new Mistral({
      apiKey: apiKey,
    });
    this.defaultModel = defaultModel;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.client.models.list();
      return !!response.data && response.data.length > 0;
    } catch (error) {
      console.error('Mistral availability check failed:', error);
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await this.client.models.list();
      return response.data?.map(model => model.id) || [];
    } catch (error) {
      console.error('Failed to list Mistral models:', error);
      return [];
    }
  }

  async chat(
    messages: MistralMessage[], 
    model?: string, 
    options?: {
      temperature?: number;
      max_tokens?: number;
      top_p?: number;
      stream?: boolean;
    }
  ): Promise<string> {
    try {
      const response = await this.client.chat.complete({
        model: model || this.defaultModel,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: options?.temperature || 0.7,
        max_tokens: options?.max_tokens || 1000,
        top_p: options?.top_p || 1,
        stream: false,
      });

      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No content in Mistral response');
      }

      return content;
    } catch (error) {
      throw new Error(`Failed to get Mistral response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async *chatStream(
    messages: MistralMessage[], 
    model?: string, 
    options?: {
      temperature?: number;
      max_tokens?: number;
      top_p?: number;
    }
  ): AsyncGenerator<string, void, unknown> {
    try {
      const response = await this.client.chat.stream({
        model: model || this.defaultModel,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: options?.temperature || 0.7,
        max_tokens: options?.max_tokens || 1000,
        top_p: options?.top_p || 1,
      });

      for await (const chunk of response) {
        const content = chunk.data?.choices?.[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      throw new Error(`Failed to stream Mistral response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async embeddings(text: string, model?: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: model || 'mistral-embed',
        inputs: [text],
      });

      const embedding = response.data?.[0]?.embedding;
      if (!embedding) {
        throw new Error('No embedding in Mistral response');
      }

      return embedding;
    } catch (error) {
      throw new Error(`Failed to generate Mistral embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Utility method to estimate query complexity for model selection
  static estimateQueryComplexity(query: string): 'simple' | 'medium' | 'complex' {
    const wordCount = query.trim().split(/\s+/).length;
    const hasComplexPatterns = /\b(analyze|compare|explain|summarize|detailed|comprehensive|how does|why does|what are the implications)\b/i.test(query);
    const hasMultipleQuestions = (query.match(/\?/g) || []).length > 1;

    if (wordCount < 10 && !hasComplexPatterns && !hasMultipleQuestions) {
      return 'simple';
    } else if (wordCount < 25 && !hasMultipleQuestions) {
      return 'medium';
    } else {
      return 'complex';
    }
  }

  // Get recommended models for different complexity levels
  static getModelRecommendations(): {
    simple: string[];
    medium: string[];
    complex: string[];
  } {
    return {
      simple: ['mistral-small-latest', 'mistral-7b-instruct'],
      medium: ['mistral-small-latest', 'mistral-medium-latest'],
      complex: ['mistral-large-latest', 'mistral-medium-latest'],
    };
  }
}

// Create default instance
const apiKey = process.env.MISTRAL_API_KEY || 'jl0y7qh9Ip7TecGi8JWjZ7VNTPT42KEA';
export const mistralClient = new MistralClient(apiKey);

// Helper function to check if Mistral is set up
export async function checkMistralSetup(): Promise<{
  available: boolean;
  models: string[];
  error?: string;
}> {
  try {
    const available = await mistralClient.isAvailable();
    
    if (!available) {
      return {
        available: false,
        models: [],
        error: 'Mistral API is not available. Please check your API key.'
      };
    }

    const models = await mistralClient.listModels();

    return {
      available: true,
      models,
    };
  } catch (error) {
    return {
      available: false,
      models: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}