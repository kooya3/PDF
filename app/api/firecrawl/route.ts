import { NextRequest, NextResponse } from 'next/server';
import { firecrawlHttpClient, checkFirecrawlHttpSetup } from '@/lib/firecrawl-http-client';

export async function GET() {
  try {
    const status = await checkFirecrawlHttpSetup();
    
    return NextResponse.json({
      success: true,
      firecrawl: {
        available: status.available,
        service: 'Firecrawl Web Scraping',
        features: [
          'URL scraping to markdown',
          'Website crawling',
          'Structured data extraction',
          'PDF and media parsing',
          'Screenshot capture',
          'LLM-ready content formatting'
        ],
        usage: status.usage,
        error: status.error
      }
    });
  } catch (error) {
    console.error('Firecrawl status check failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check Firecrawl status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, url, options = {} } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'scrape':
        return await handleScrape(url, options);
      
      case 'crawl':
        return await handleCrawl(url, options);
      
      case 'extract':
        return await handleExtract(url, options);
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use: scrape, crawl, or extract' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Firecrawl API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function handleScrape(url: string, options: any) {
  try {
    const document = await firecrawlHttpClient.scrapeUrl(url, {
      formats: options.formats || ['markdown'],
      onlyMainContent: options.onlyMainContent ?? true,
      extractPrompt: options.extractPrompt,
      ...options
    });

    return NextResponse.json({
      success: true,
      action: 'scrape',
      data: {
        document,
        ready_for_ai: true,
        processing_time: document.processingTime,
        content_length: document.content.length,
        has_images: (document.images?.length || 0) > 0,
        has_links: (document.links?.length || 0) > 0
      }
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Scraping failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function handleCrawl(url: string, options: any) {
  try {
    const result = await firecrawlHttpClient.crawlWebsite(url, {
      limit: options.limit || 5,
      maxDepth: options.maxDepth || 1,
      ...options
    });

    return NextResponse.json({
      success: true,
      action: 'crawl',
      data: {
        documents: result.documents,
        summary: {
          total_pages: result.totalPages,
          status: result.status,
          total_content_length: result.documents.reduce((sum, doc) => sum + doc.content.length, 0),
          average_content_length: result.documents.length > 0 
            ? Math.round(result.documents.reduce((sum, doc) => sum + doc.content.length, 0) / result.documents.length)
            : 0
        },
        ready_for_ai: true
      }
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Crawling failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function handleExtract(url: string, options: any) {
  try {
    const { prompt } = options;
    
    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required for extraction' },
        { status: 400 }
      );
    }

    const document = await firecrawlHttpClient.scrapeUrl(url, {
      extractPrompt: prompt,
      formats: ['json', 'markdown']
    });

    return NextResponse.json({
      success: true,
      action: 'extract',
      data: {
        document,
        ready_for_ai: true,
        processing_time: document.processingTime
      }
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Extraction failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}