interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaResponse {
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  model: string;
}

interface OllamaGenerateResponse {
  response: string;
  done: boolean;
  model: string;
}

export class OllamaClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.models?.map((model: { name: string }) => model.name) || [];
    } catch (error) {
      console.error('Error listing Ollama models:', error);
      return [];
    }
  }

  async chatCompletion(
    messages: OllamaMessage[],
    options: {
      model?: string;
      temperature?: number;
      stream?: boolean;
    } = {}
  ): Promise<{ choices: [{ message: { content: string; role: string } }] }> {
    const {
      model = 'tinyllama', // Default to tinyllama for low-memory systems
      temperature = 0.7,
      stream = false
    } = options;

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          stream,
          options: {
            temperature
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} - ${response.statusText}`);
      }

      const data: OllamaResponse = await response.json();
      
      // Convert Ollama format to OpenAI-compatible format
      return {
        choices: [{
          message: {
            content: data.message.content,
            role: data.message.role
          }
        }]
      };
    } catch (error) {
      throw new Error(`Failed to connect to Ollama: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateCompletion(
    prompt: string,
    options: {
      model?: string;
      temperature?: number;
      stream?: boolean;
    } = {}
  ): Promise<string> {
    const {
      model = 'tinyllama',
      temperature = 0.7,
      stream = false
    } = options;

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt,
          stream,
          options: {
            temperature
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} - ${response.statusText}`);
      }

      const data: OllamaGenerateResponse = await response.json();
      return data.response;
    } catch (error) {
      throw new Error(`Failed to connect to Ollama: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const ollamaClient = new OllamaClient();