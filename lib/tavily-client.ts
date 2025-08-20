interface TavilyConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

interface TavilySearchResult {
  url: string;
  title: string;
  content: string;
  score: number;
  published_date?: string;
}

interface TavilyResponse {
  query: string;
  answer: string;
  results: TavilySearchResult[];
  follow_up_questions?: string[];
  images?: string[];
  response_time: number;
}

interface TavilyExtractResult {
  url: string;
  domain: string;
  title: string;
  content: string;
  links: string[];
  images: string[];
  published_date?: string;
  author?: string;
  language?: string;
  word_count: number;
}

export class TavilyClient {
  private config: Required<TavilyConfig>;

  constructor(config: TavilyConfig) {
    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || 'https://api.tavily.com',
      timeout: config.timeout || 30000
    };

    if (!this.config.apiKey) {
      throw new Error('Tavily API key is required');
    }
  }

  async search(
    query: string, 
    options: {
      searchDepth?: 'basic' | 'advanced';
      includeImages?: boolean;
      includeDomains?: string[];
      excludeDomains?: string[];
      maxResults?: number;
      includeRawContent?: boolean;
    } = {}
  ): Promise<TavilyResponse> {
    const {
      searchDepth = 'basic',
      includeImages = false,
      includeDomains = [],
      excludeDomains = [],
      maxResults = 5,
      includeRawContent = false
    } = options;

    const body = {
      api_key: this.config.apiKey,
      query,
      search_depth: searchDepth,
      include_images: includeImages,
      include_domains: includeDomains,
      exclude_domains: excludeDomains,
      max_results: maxResults,
      include_raw_content: includeRawContent
    };

    const response = await fetch(`${this.config.baseUrl}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      throw new Error(`Tavily search failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async extract(url: string): Promise<TavilyExtractResult> {
    const body = {
      api_key: this.config.apiKey,
      urls: [url]
    };

    const response = await fetch(`${this.config.baseUrl}/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      throw new Error(`Tavily extract failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.results[0]; // Return the first (and should be only) result
  }

  async qnaSearch(
    query: string,
    searchDepth: 'basic' | 'advanced' = 'basic'
  ): Promise<string> {
    const body = {
      api_key: this.config.apiKey,
      query,
      search_depth: searchDepth
    };

    const response = await fetch(`${this.config.baseUrl}/qna`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      throw new Error(`Tavily QnA search failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.answer;
  }

  async crawlWebsite(
    baseUrl: string,
    options: {
      maxPages?: number;
      followLinks?: boolean;
      includePatterns?: string[];
      excludePatterns?: string[];
    } = {}
  ): Promise<TavilyExtractResult[]> {
    const {
      maxPages = 10,
      followLinks = true,
      includePatterns = [],
      excludePatterns = []
    } = options;

    console.log(`Starting Tavily crawl of ${baseUrl} (max ${maxPages} pages)`);

    // Start with the base URL
    const results: TavilyExtractResult[] = [];
    const processedUrls = new Set<string>();
    const urlQueue = [baseUrl];

    while (urlQueue.length > 0 && results.length < maxPages) {
      const currentUrl = urlQueue.shift()!;
      
      if (processedUrls.has(currentUrl)) {
        continue;
      }
      
      processedUrls.add(currentUrl);

      try {
        console.log(`Extracting content from: ${currentUrl}`);
        const extracted = await this.extract(currentUrl);
        results.push(extracted);

        // Add discovered links to queue if following links
        if (followLinks && results.length < maxPages) {
          const relevantLinks = extracted.links
            .filter(link => {
              // Only include links from the same domain
              const baseDomin = new URL(baseUrl).hostname;
              try {
                const linkDomain = new URL(link, baseUrl).hostname;
                return linkDomain === baseDomin;
              } catch {
                return false;
              }
            })
            .filter(link => {
              // Apply include/exclude patterns
              const shouldInclude = includePatterns.length === 0 || 
                includePatterns.some(pattern => link.includes(pattern));
              const shouldExclude = excludePatterns.some(pattern => link.includes(pattern));
              return shouldInclude && !shouldExclude;
            })
            .slice(0, maxPages - results.length); // Don't add more than we can process

          urlQueue.push(...relevantLinks);
        }

        // Small delay to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Failed to extract ${currentUrl}:`, error);
        continue;
      }
    }

    console.log(`Tavily crawl completed: ${results.length} pages extracted`);
    return results;
  }
}

// Create singleton instance
export const tavilyClient = new TavilyClient({
  apiKey: process.env.TAVILY_API_KEY || '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'
});