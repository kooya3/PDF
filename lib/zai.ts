interface ZAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ZAIResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
  }>;
}

export class ZAIClient {
  private apiKey: string;
  private baseUrl = 'https://api.z.ai/api/paas/v4';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }

        // Check if it's a rate limit error
        if (error instanceof Error && error.message.includes('429')) {
          const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
          console.log(`Rate limited, retrying in ${delay}ms...`);
          await this.delay(delay);
          continue;
        }

        // For other errors, don't retry
        throw error;
      }
    }

    throw lastError!;
  }

  async chatCompletion(
    messages: ZAIMessage[],
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    } = {}
  ): Promise<ZAIResponse> {
    const {
      model = 'glm-4.5',
      temperature = 0.6,
      maxTokens = 1024,
      stream = false
    } = options;

    return this.retryWithBackoff(async () => {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept-Language': 'en-US,en'
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ZAI API error: ${response.status} - ${response.statusText}. ${errorText}`);
      }

      return response.json();
    });
  }
}

export const zaiClient = new ZAIClient(process.env.ZAI_API_KEY || '');