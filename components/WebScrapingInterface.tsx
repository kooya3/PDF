'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe,
  Download,
  FileText,
  Search,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Link as LinkIcon,
  Image,
  Brain,
  Zap,
  Settings,
  Eye,
  Code,
  RefreshCw
} from 'lucide-react';

interface ScrapingOptions {
  action: 'scrape' | 'crawl' | 'extract';
  formats: string[];
  onlyMainContent: boolean;
  screenshot: boolean;
  limit?: number;
  maxDepth?: number;
  extractPrompt?: string;
}

interface FirecrawlDocument {
  id: string;
  url: string;
  title: string;
  content: string;
  metadata: {
    title?: string;
    description?: string;
    sourceURL: string;
    statusCode: number;
  };
  processingTime: number;
  links?: string[];
  images?: string[];
}

export const WebScrapingInterface: React.FC = () => {
  const [url, setUrl] = useState('');
  const [options, setOptions] = useState<ScrapingOptions>({
    action: 'scrape',
    formats: ['markdown'],
    onlyMainContent: true,
    screenshot: false,
    limit: 5,
    maxDepth: 1
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [serviceStatus, setServiceStatus] = useState<any>(null);

  useEffect(() => {
    checkServiceStatus();
  }, []);

  const checkServiceStatus = async () => {
    try {
      const response = await fetch('/api/firecrawl');
      const data = await response.json();
      setServiceStatus(data.firecrawl);
    } catch (error) {
      console.error('Failed to check service status:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/firecrawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url.trim(),
          ...options
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.details || data.error || 'Scraping failed');
      }

      setResult(data.data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessDocument = async (document: FirecrawlDocument) => {
    try {
      // Send to web content processing system
      const response = await fetch('/api/process-web-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: `${document.title || 'Web Page'}.md`,
          content: document.content,
          metadata: {
            source: 'web_scraping',
            url: document.url,
            scrapedAt: new Date().toISOString(),
            ...document.metadata
          }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Show success message with option to view
          const userChoice = confirm(
            `Document processed successfully! You can now chat with it.\n\nWould you like to view the document now?`
          );
          
          if (userChoice && result.viewUrl) {
            window.open(result.viewUrl, '_blank');
          }
        } else {
          throw new Error(result.error || 'Processing failed');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Processing error:', error);
      alert('Failed to process document: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const sampleUrls = [
    'https://docs.firecrawl.dev',
    'https://en.wikipedia.org/wiki/Artificial_intelligence',
    'https://github.com/microsoft/TypeScript',
    'https://nextjs.org/docs'
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl mb-4">
          <Globe className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Web Scraping & Document Processing</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Extract content from any website and convert it into AI-ready documents for intelligent conversation.
        </p>
      </div>

      {/* Service Status */}
      {serviceStatus && (
        <div className={`rounded-xl p-4 border ${
          serviceStatus.available 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-3">
            {serviceStatus.available ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            <div>
              <span className={`font-medium ${
                serviceStatus.available ? 'text-green-800' : 'text-red-800'
              }`}>
                Firecrawl Service: {serviceStatus.available ? 'Available' : 'Unavailable'}
              </span>
              {serviceStatus.error && (
                <p className="text-sm text-red-600 mt-1">{serviceStatus.error}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Form */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Web Content Extraction</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website URL
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              {/* Sample URLs */}
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-2">Try these examples:</p>
                <div className="flex flex-wrap gap-2">
                  {sampleUrls.map((sampleUrl, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setUrl(sampleUrl)}
                      className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                    >
                      {sampleUrl.replace('https://', '')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Action
                </label>
                <select
                  value={options.action}
                  onChange={(e) => setOptions(prev => ({ ...prev, action: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="scrape">Scrape Single Page</option>
                  <option value="crawl">Crawl Website</option>
                  <option value="extract">Extract Structured Data</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Output Format
                </label>
                <select
                  value={options.formats[0]}
                  onChange={(e) => setOptions(prev => ({ ...prev, formats: [e.target.value] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="markdown">Markdown</option>
                  <option value="html">HTML</option>
                  <option value="json">Structured JSON</option>
                </select>
              </div>

              {options.action === 'crawl' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Page Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={options.limit}
                    onChange={(e) => setOptions(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
            </div>

            {options.action === 'extract' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Extraction Prompt
                </label>
                <textarea
                  value={options.extractPrompt || ''}
                  onChange={(e) => setOptions(prev => ({ ...prev, extractPrompt: e.target.value }))}
                  placeholder="e.g., Extract the company name, contact information, and key services"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.onlyMainContent}
                  onChange={(e) => setOptions(prev => ({ ...prev, onlyMainContent: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Main content only</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.screenshot}
                  onChange={(e) => setOptions(prev => ({ ...prev, screenshot: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Take screenshot</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !serviceStatus?.available}
              className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5 mr-2" />
                  {options.action === 'scrape' ? 'Scrape Page' : 
                   options.action === 'crawl' ? 'Crawl Website' : 'Extract Data'}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200">
            <div className="flex items-center gap-3 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Error:</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="p-6 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Extraction Complete
            </h3>

            {/* Summary Stats */}
            {result.summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{result.summary.total_pages}</div>
                  <div className="text-sm text-blue-600">Pages Processed</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{Math.round(result.summary.processing_time / 1000)}s</div>
                  <div className="text-sm text-green-600">Processing Time</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{Math.round(result.summary.total_content_length / 1000)}K</div>
                  <div className="text-sm text-purple-600">Total Characters</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600">{result.summary.status}</div>
                  <div className="text-sm text-amber-600">Status</div>
                </div>
              </div>
            )}

            {/* Single Document Result */}
            {result.document && (
              <DocumentCard 
                document={result.document} 
                onProcess={() => handleProcessDocument(result.document)} 
              />
            )}

            {/* Multiple Documents Result */}
            {result.documents && result.documents.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Extracted Documents ({result.documents.length})</h4>
                {result.documents.map((document: FirecrawlDocument, index: number) => (
                  <DocumentCard 
                    key={index} 
                    document={document} 
                    onProcess={() => handleProcessDocument(document)} 
                  />
                ))}
              </div>
            )}

            {/* Extracted Data */}
            {result.extracted_data && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  Extracted Structured Data
                </h4>
                <pre className="bg-white p-4 rounded border overflow-auto text-sm">
                  {JSON.stringify(result.extracted_data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const DocumentCard: React.FC<{
  document: FirecrawlDocument;
  onProcess: () => void;
}> = ({ document, onProcess }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleProcess = async () => {
    setProcessing(true);
    try {
      await onProcess();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="p-4 bg-gray-50">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 mb-1">{document.title}</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                <a href={document.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                  {document.url}
                </a>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span>{document.content.length.toLocaleString()} characters</span>
                <span>{document.processingTime}ms processing time</span>
                {document.links && <span>{document.links.length} links</span>}
                {document.images && <span>{document.images.length} images</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 flex items-center gap-1"
            >
              <Eye className="w-4 h-4" />
              {showPreview ? 'Hide' : 'Preview'}
            </button>
            <button
              onClick={handleProcess}
              disabled={processing}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
            >
              {processing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4" />
                  Process for AI Chat
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {showPreview && (
        <div className="p-4 border-t bg-white">
          <div className="prose max-w-none text-sm">
            <pre className="whitespace-pre-wrap text-gray-700 max-h-96 overflow-auto">
              {document.content.slice(0, 2000)}
              {document.content.length > 2000 && '...\n\n[Content truncated - full content will be processed]'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebScrapingInterface;