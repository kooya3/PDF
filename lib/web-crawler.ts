import * as cheerio from 'cheerio';
import { URL } from 'url';

export interface CrawlOptions {
  maxDepth?: number;
  maxPages?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
  respectRobots?: boolean;
  delay?: number;
  timeout?: number;
  followRedirects?: boolean;
  userAgent?: string;
}

export interface CrawledPage {
  url: string;
  title: string;
  content: string;
  excerpt: string;
  wordCount: number;
  links: string[];
  metadata: {
    description?: string;
    keywords?: string[];
    author?: string;
    publishedDate?: string;
    lastModified?: string;
    language?: string;
    contentType?: string;
  };
  crawledAt: string;
  depth: number;
  status: number;
  error?: string;
}

export interface CrawlResult {
  baseUrl: string;
  pages: CrawledPage[];
  totalPages: number;
  successCount: number;
  errorCount: number;
  startedAt: string;
  completedAt: string;
  duration: number;
  errors: Array<{
    url: string;
    error: string;
    status?: number;
  }>;
}

export class WebCrawler {
  private visitedUrls = new Set<string>();
  private crawlQueue: Array<{ url: string; depth: number }> = [];
  private results: CrawledPage[] = [];
  private errors: Array<{ url: string; error: string; status?: number }> = [];
  private options: Required<CrawlOptions>;

  constructor(options: CrawlOptions = {}) {
    this.options = {
      maxDepth: options.maxDepth ?? 3,
      maxPages: options.maxPages ?? 50,
      includePatterns: options.includePatterns ?? [],
      excludePatterns: options.excludePatterns ?? [],
      respectRobots: options.respectRobots ?? true,
      delay: options.delay ?? 1000,
      timeout: options.timeout ?? 30000,
      followRedirects: options.followRedirects ?? true,
      userAgent: options.userAgent ?? 'WebCrawler/1.0 (+https://example.com/bot)'
    };
  }

  async crawl(baseUrl: string): Promise<CrawlResult> {
    const startTime = Date.now();
    const startedAt = new Date().toISOString();

    // Reset state
    this.visitedUrls.clear();
    this.crawlQueue = [];
    this.results = [];
    this.errors = [];

    // Validate and normalize base URL
    const normalizedUrl = this.normalizeUrl(baseUrl);
    if (!normalizedUrl) {
      throw new Error('Invalid base URL provided');
    }

    // Initialize crawl queue
    this.crawlQueue.push({ url: normalizedUrl, depth: 0 });

    console.log(`Starting crawl of ${baseUrl} with options:`, this.options);

    // Process queue
    while (this.crawlQueue.length > 0 && this.results.length < this.options.maxPages) {
      const { url, depth } = this.crawlQueue.shift()!;
      
      // Skip if already visited or depth exceeded
      if (this.visitedUrls.has(url) || depth > this.options.maxDepth) {
        continue;
      }

      // Skip if URL doesn't match include/exclude patterns
      if (!this.shouldCrawlUrl(url)) {
        continue;
      }

      this.visitedUrls.add(url);
      
      try {
        console.log(`Crawling: ${url} (depth: ${depth})`);
        const page = await this.crawlPage(url, depth);
        this.results.push(page);

        // Add discovered links to queue if within depth limit
        if (depth < this.options.maxDepth) {
          const internalLinks = this.filterInternalLinks(page.links, baseUrl);
          for (const link of internalLinks) {
            if (!this.visitedUrls.has(link)) {
              this.crawlQueue.push({ url: link, depth: depth + 1 });
            }
          }
        }

        // Respect delay between requests
        if (this.options.delay > 0) {
          await this.sleep(this.options.delay);
        }

      } catch (error) {
        console.error(`Failed to crawl ${url}:`, error);
        this.errors.push({
          url,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const completedAt = new Date().toISOString();
    const duration = Date.now() - startTime;

    console.log(`Crawl completed: ${this.results.length} pages, ${this.errors.length} errors, ${duration}ms`);

    return {
      baseUrl: normalizedUrl,
      pages: this.results,
      totalPages: this.results.length,
      successCount: this.results.length,
      errorCount: this.errors.length,
      startedAt,
      completedAt,
      duration,
      errors: this.errors
    };
  }

  private async crawlPage(url: string, depth: number): Promise<CrawledPage> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': this.options.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        redirect: this.options.followRedirects ? 'follow' : 'manual'
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        throw new Error(`Unsupported content type: ${contentType}`);
      }

      const html = await response.text();
      return this.parsePage(url, html, depth, response.status);

    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private parsePage(url: string, html: string, depth: number, status: number): CrawledPage {
    const $ = cheerio.load(html);
    
    // Remove script and style elements
    $('script, style, nav, footer, aside, .navigation, .menu, .sidebar, .advertisement, .ads').remove();

    // Extract title
    const title = $('title').first().text().trim() || $('h1').first().text().trim() || 'Untitled';

    // Extract main content
    const contentSelectors = [
      'main', 'article', '.content', '.post-content', '.entry-content',
      '.article-body', '.post-body', '#content', '.main-content'
    ];
    
    let content = '';
    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length) {
        content = element.text().trim();
        break;
      }
    }

    // Fallback to body content if no specific content area found
    if (!content) {
      content = $('body').text().trim();
    }

    // Clean up content
    content = content.replace(/\s+/g, ' ').trim();

    // Extract metadata
    const description = $('meta[name="description"]').attr('content') ||
                      $('meta[property="og:description"]').attr('content') || '';
    
    const keywords = $('meta[name="keywords"]').attr('content')?.split(',').map(k => k.trim()) || [];
    
    const author = $('meta[name="author"]').attr('content') ||
                  $('meta[property="article:author"]').attr('content') || '';
    
    const publishedDate = $('meta[property="article:published_time"]').attr('content') ||
                         $('meta[name="date"]').attr('content') ||
                         $('time[datetime]').attr('datetime') || '';
    
    const lastModified = $('meta[property="article:modified_time"]').attr('content') ||
                        $('meta[name="last-modified"]').attr('content') || '';
    
    const language = $('html').attr('lang') || 
                    $('meta[http-equiv="content-language"]').attr('content') || 'en';

    // Extract links
    const links: string[] = [];
    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (href) {
        try {
          const absoluteUrl = new URL(href, url).href;
          links.push(absoluteUrl);
        } catch {
          // Invalid URL, skip
        }
      }
    });

    // Create excerpt
    const excerpt = content.substring(0, 300).trim();
    const wordCount = content.split(/\s+/).length;

    return {
      url,
      title,
      content,
      excerpt,
      wordCount,
      links: Array.from(new Set(links)), // Remove duplicates
      metadata: {
        description,
        keywords,
        author,
        publishedDate,
        lastModified,
        language,
        contentType: 'text/html'
      },
      crawledAt: new Date().toISOString(),
      depth,
      status
    };
  }

  private normalizeUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      // Remove fragment and normalize
      urlObj.hash = '';
      return urlObj.href;
    } catch {
      return null;
    }
  }

  private shouldCrawlUrl(url: string): boolean {
    // Check exclude patterns first
    if (this.options.excludePatterns.length > 0) {
      for (const pattern of this.options.excludePatterns) {
        if (url.match(new RegExp(pattern, 'i'))) {
          return false;
        }
      }
    }

    // Check include patterns
    if (this.options.includePatterns.length > 0) {
      for (const pattern of this.options.includePatterns) {
        if (url.match(new RegExp(pattern, 'i'))) {
          return true;
        }
      }
      return false; // No include pattern matched
    }

    // Default to crawling URLs from the same domain
    return true;
  }

  private filterInternalLinks(links: string[], baseUrl: string): string[] {
    try {
      const baseUrlObj = new URL(baseUrl);
      const baseDomain = baseUrlObj.hostname;

      return links.filter(link => {
        try {
          const linkObj = new URL(link);
          return linkObj.hostname === baseDomain;
        } catch {
          return false;
        }
      });
    } catch {
      return [];
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Utility method to get robots.txt (for future enhancement)
  private async getRobotsTxt(baseUrl: string): Promise<string | null> {
    try {
      const robotsUrl = new URL('/robots.txt', baseUrl).href;
      const response = await fetch(robotsUrl, {
        headers: { 'User-Agent': this.options.userAgent }
      });
      
      if (response.ok) {
        return await response.text();
      }
    } catch {
      // Robots.txt not available or accessible
    }
    return null;
  }

  // Method to validate if crawling is allowed for a URL (for future enhancement)
  private async isAllowedByRobots(url: string, robotsTxt: string): Promise<boolean> {
    // Simple robots.txt parsing - in production, use a proper robots.txt parser
    if (!this.options.respectRobots) return true;
    
    const lines = robotsTxt.split('\n');
    let isUserAgentSection = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('User-agent:')) {
        const userAgent = trimmedLine.substring(11).trim();
        isUserAgentSection = userAgent === '*' || this.options.userAgent.includes(userAgent);
      } else if (isUserAgentSection && trimmedLine.startsWith('Disallow:')) {
        const disallowPath = trimmedLine.substring(9).trim();
        if (disallowPath && url.includes(disallowPath)) {
          return false;
        }
      }
    }
    
    return true;
  }
}

// Factory function for easy usage
export function createWebCrawler(options?: CrawlOptions): WebCrawler {
  return new WebCrawler(options);
}

// Default crawler instance
export const webCrawler = new WebCrawler();