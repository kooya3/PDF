export interface OllamaModelInfo {
  name: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
  modified_at: string;
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaEmbeddingResponse {
  embedding: number[];
}

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaClient {
  private baseUrl: string;
  private defaultModel: string;

  constructor(baseUrl: string = 'http://localhost:11434', defaultModel: string = 'tinyllama') {
    this.baseUrl = baseUrl;
    this.defaultModel = defaultModel;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/version`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async listModels(): Promise<OllamaModelInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      throw new Error(`Failed to list models: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async hasModel(modelName: string): Promise<boolean> {
    try {
      const models = await this.listModels();
      return models.some(model => model.name.includes(modelName));
    } catch (error) {
      return false;
    }
  }

  async pullModel(modelName: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Stream the response to handle the pull progress
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.error) {
              throw new Error(data.error);
            }
            // You can add progress tracking here if needed
            console.log('Pull progress:', data.status || data);
          } catch (e) {
            // Ignore JSON parse errors for streaming responses
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to pull model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generate(prompt: string, model?: string, options?: {
    stream?: boolean;
    context?: number[];
    temperature?: number;
    num_predict?: number;
    stop?: string[];
  }): Promise<OllamaResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || this.defaultModel,
          prompt,
          stream: false,
          ...options,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async chat(messages: OllamaChatMessage[], model?: string, options?: {
    stream?: boolean;
    temperature?: number;
    num_predict?: number;
    stop?: string[];
  }): Promise<OllamaChatResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || this.defaultModel,
          messages,
          stream: false,
          ...options,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to chat: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async embeddings(text: string, model?: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || this.defaultModel,
          prompt: text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data: OllamaEmbeddingResponse = await response.json();
      return data.embedding;
    } catch (error) {
      throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async *generateStream(prompt: string, model?: string, options?: {
    context?: number[];
    temperature?: number;
    num_predict?: number;
    stop?: string[];
  }): AsyncGenerator<Partial<OllamaResponse>, void, unknown> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || this.defaultModel,
          prompt,
          stream: true,
          ...options,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data: Partial<OllamaResponse> = JSON.parse(line);
            yield data;
            if (data.done) return;
          } catch (e) {
            // Ignore JSON parse errors for streaming responses
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to generate stream: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async *chatStream(messages: OllamaChatMessage[], model?: string, options?: {
    temperature?: number;
    num_predict?: number;
    stop?: string[];
  }): AsyncGenerator<Partial<OllamaChatResponse>, void, unknown> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || this.defaultModel,
          messages,
          stream: true,
          ...options,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data: Partial<OllamaChatResponse> = JSON.parse(line);
            yield data;
            if (data.done) return;
          } catch (e) {
            // Ignore JSON parse errors for streaming responses
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to chat stream: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async ensureModel(modelName?: string): Promise<void> {
    const targetModel = modelName || this.defaultModel;
    
    if (!(await this.hasModel(targetModel))) {
      console.log(`Model ${targetModel} not found, pulling...`);
      await this.pullModel(targetModel);
      console.log(`Model ${targetModel} pulled successfully`);
    }
  }

  // Convenience method to get recommended models
  static getRecommendedModels(): { name: string; description: string; size: string }[] {
    return [
      {
        name: 'tinyllama',
        description: 'Fast, lightweight model (recommended for this setup)',
        size: '~637MB'
      },
      {
        name: 'gemma2:2b',
        description: 'Fastest, smallest model',
        size: '~1.6GB'
      },
      {
        name: 'qwen2.5:3b',
        description: 'Good balance of speed and quality',
        size: '~1.9GB'
      },
      {
        name: 'mistral:7b',
        description: 'More capable but slower',
        size: '~4.1GB'
      }
    ];
  }
}

// Create default instance
export const ollamaClient = new OllamaClient();

// Helper function to check if Ollama is set up
export async function checkOllamaSetup(): Promise<{
  available: boolean;
  hasDefaultModel: boolean;
  models: OllamaModelInfo[];
  error?: string;
}> {
  try {
    const available = await ollamaClient.isAvailable();
    
    if (!available) {
      return {
        available: false,
        hasDefaultModel: false,
        models: [],
        error: 'Ollama is not running. Please start Ollama with: ollama serve'
      };
    }

    const models = await ollamaClient.listModels();
    const defaultModel = process.env.OLLAMA_MODEL || 'tinyllama';
    const hasDefaultModel = await ollamaClient.hasModel(defaultModel);

    return {
      available: true,
      hasDefaultModel,
      models,
      error: hasDefaultModel ? undefined : `Default model (${defaultModel}) not found. Pull it with: ollama pull ${defaultModel}`
    };
  } catch (error) {
    return {
      available: false,
      hasDefaultModel: false,
      models: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}