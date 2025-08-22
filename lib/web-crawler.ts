import * as cheerio from 'cheerio';
import { URL } from 'url';

export interface CrawlOptions {
  maxDepth?: number;
  maxPages?: number;
  maxBreadth?: number;                    // NEW: Links per page level (Tavily-style)
  includePatterns?: string[];
  excludePatterns?: string[];
  selectPaths?: string[];                 // NEW: Specific path patterns to target
  selectDomains?: string[];               // NEW: Domain patterns to include
  excludeDomains?: string[];              // NEW: Domain patterns to exclude
  allowExternal?: boolean;                // NEW: Whether to crawl external domains
  instructions?: string;                  // NEW: Natural language crawling guidance
  categories?: string[];                  // NEW: Content category filters
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
    // Enhanced default patterns for comprehensive crawling
    const defaultExcludePatterns = [
      // Admin and authentication pages
      '/wp-admin/', '/admin/', '/login/', '/auth/', '/user/', '/account/', '/profile/',
      // Search and pagination (often duplicate content)
      '/search\\?', '/\\?.*page=', '/\\?.*p=', '/page/', '/\\?s=',
      // WordPress/CMS specific
      '/wp-content/uploads/', '/wp-includes/', '/tag/', '/category/', '/author/',
      // File extensions to skip
      '\\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|exe|dmg|pkg)$',
      '\\.(jpg|jpeg|png|gif|svg|ico|css|js|woff|woff2|ttf|eot)$',
      // Protocol prefixes to skip
      'mailto:', 'tel:', 'ftp:', 'javascript:', 'data:',
      // Fragment identifiers
      '#[^/]*$'
    ];

    this.options = {
      maxDepth: options.maxDepth ?? 5,        // Increased for comprehensive coverage
      maxPages: options.maxPages ?? 200,      // Increased for thorough crawling
      includePatterns: options.includePatterns ?? [],
      excludePatterns: options.excludePatterns?.length ? options.excludePatterns : defaultExcludePatterns,
      respectRobots: options.respectRobots ?? true,
      delay: options.delay ?? 500,            // Optimized for speed while being respectful
      timeout: options.timeout ?? 20000,      // Increased for complex pages
      followRedirects: options.followRedirects ?? true,
      userAgent: options.userAgent ?? 'AI-Knowledge-Base-Crawler/2.0 (+https://ai-crawler.info/bot)'
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

    console.log(`🚀 Starting comprehensive crawl of ${baseUrl} with enhanced options:`, {
      maxDepth: this.options.maxDepth,
      maxPages: this.options.maxPages,
      delay: this.options.delay
    });

    // Initialize crawl queue with base URL
    this.crawlQueue.push({ url: normalizedUrl, depth: 0 });

    // Try to discover and add sitemap URLs for comprehensive coverage
    try {
      const sitemapUrls = await this.discoverSitemapUrls(normalizedUrl);
      console.log(`📍 Discovered ${sitemapUrls.length} URLs from sitemaps`);
      
      // Add sitemap URLs to queue (with depth 1 to ensure they're crawled)
      for (const url of sitemapUrls.slice(0, Math.floor(this.options.maxPages / 2))) {
        if (!this.visitedUrls.has(url)) {
          this.crawlQueue.push({ url, depth: 1 });
        }
      }
    } catch (error) {
      console.log('⚠️ Sitemap discovery failed, continuing with standard crawl:', error instanceof Error ? error.message : 'Unknown error');
    }

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

    // Enhanced link extraction for comprehensive crawling
    const links: string[] = [];
    
    // Standard <a> links
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

    // Additional link sources for comprehensive discovery
    const additionalSelectors = [
      'area[href]',           // Image map areas
      'link[rel="canonical"]', // Canonical URLs (often point to main version)
      'link[rel="alternate"]', // Alternate versions
      '[data-href]',          // JavaScript-driven links
      '[data-url]',           // Data attributes
      '[onclick*="location"]', // JavaScript location redirects
    ];

    for (const selector of additionalSelectors) {
      $(selector).each((_, element) => {
        const href = $(element).attr('href') || $(element).attr('data-href') || $(element).attr('data-url');
        if (href) {
          try {
            const absoluteUrl = new URL(href, url).href;
            links.push(absoluteUrl);
          } catch {
            // Invalid URL, skip
          }
        }
      });
    }

    // Extract URLs from JavaScript (common patterns)
    const scriptContent = $('script').text();
    if (scriptContent) {
      // Match common URL patterns in JavaScript
      const jsUrlPatterns = [
        /(?:location\.href|window\.location)\s*=\s*['"](.*?)['"]/gi,
        /url:\s*['"](.*?)['"]/gi,
        /href:\s*['"](.*?)['"]/gi,
        /["'](\/[^"']*?)["']/gi // Relative URLs
      ];

      for (const pattern of jsUrlPatterns) {
        const matches = scriptContent.matchAll(pattern);
        for (const match of matches) {
          if (match[1]) {
            try {
              const absoluteUrl = new URL(match[1], url).href;
              links.push(absoluteUrl);
            } catch {
              // Invalid URL, skip
            }
          }
        }
      }
    }

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

  /**
   * Discover URLs from sitemap.xml for comprehensive crawling
   */
  private async discoverSitemapUrls(baseUrl: string): Promise<string[]> {
    const urls: string[] = [];
    const urlObj = new URL(baseUrl);
    const baseOrigin = urlObj.origin;

    // Common sitemap locations
    const sitemapCandidates = [
      `${baseOrigin}/sitemap.xml`,
      `${baseOrigin}/sitemap_index.xml`,
      `${baseOrigin}/sitemaps.xml`,
      `${baseOrigin}/sitemap.txt`,
      `${baseOrigin}/robots.txt` // Will extract sitemap URLs from robots.txt
    ];

    for (const sitemapUrl of sitemapCandidates) {
      try {
        console.log(`🗺️ Checking sitemap: ${sitemapUrl}`);
        const response = await fetch(sitemapUrl, {
          headers: { 'User-Agent': this.options.userAgent },
          signal: AbortSignal.timeout(this.options.timeout)
        });

        if (response.ok) {
          const content = await response.text();
          
          if (sitemapUrl.endsWith('robots.txt')) {
            // Extract sitemap URLs from robots.txt
            const sitemapMatches = content.match(/^sitemap:\s*(.+)$/gim);
            if (sitemapMatches) {
              for (const match of sitemapMatches) {
                const sitemapSubUrl = match.replace(/^sitemap:\s*/i, '').trim();
                try {
                  const subUrls = await this.parseSitemap(sitemapSubUrl);
                  urls.push(...subUrls);
                } catch {
                  console.log(`Failed to parse sitemap from robots.txt: ${sitemapSubUrl}`);
                }
              }
            }
          } else if (sitemapUrl.endsWith('.txt')) {
            // Plain text sitemap
            const lines = content.split('\n').map(line => line.trim()).filter(line => line && line.startsWith('http'));
            urls.push(...lines.slice(0, 100)); // Limit to prevent overwhelming
          } else {
            // XML sitemap
            const xmlUrls = await this.parseSitemap(sitemapUrl, content);
            urls.push(...xmlUrls);
          }
        }
      } catch (error) {
        console.log(`Failed to fetch sitemap ${sitemapUrl}:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // Filter and validate URLs
    return [...new Set(urls)]
      .filter(url => {
        try {
          const urlObj = new URL(url);
          return urlObj.origin === baseOrigin && this.shouldCrawlUrl(url);
        } catch {
          return false;
        }
      })
      .slice(0, Math.floor(this.options.maxPages * 0.7)); // Use up to 70% of max pages for sitemap URLs
  }

  /**
   * Parse XML sitemap to extract URLs
   */
  private async parseSitemap(sitemapUrl: string, content?: string): Promise<string[]> {
    if (!content) {
      const response = await fetch(sitemapUrl, {
        headers: { 'User-Agent': this.options.userAgent },
        signal: AbortSignal.timeout(this.options.timeout)
      });
      content = await response.text();
    }

    const urls: string[] = [];
    
    try {
      // Extract URLs from XML sitemap using regex (simpler than XML parser)
      const urlMatches = content.match(/<loc[^>]*>([^<]+)<\/loc>/gi);
      if (urlMatches) {
        for (const match of urlMatches) {
          const url = match.replace(/<\/?loc[^>]*>/g, '').trim();
          if (url.startsWith('http')) {
            urls.push(url);
          }
        }
      }

      // Check if this is a sitemap index (contains other sitemaps)
      const sitemapMatches = content.match(/<sitemap[^>]*>.*?<\/sitemap>/gis);
      if (sitemapMatches) {
        for (const sitemapMatch of sitemapMatches) {
          const locMatch = sitemapMatch.match(/<loc[^>]*>([^<]+)<\/loc>/i);
          if (locMatch) {
            const childSitemapUrl = locMatch[1].trim();
            try {
              const childUrls = await this.parseSitemap(childSitemapUrl);
              urls.push(...childUrls);
            } catch {
              console.log(`Failed to parse child sitemap: ${childSitemapUrl}`);
            }
          }
        }
      }
    } catch (error) {
      console.log(`Failed to parse sitemap XML:`, error instanceof Error ? error.message : 'Unknown error');
    }

    return urls;
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