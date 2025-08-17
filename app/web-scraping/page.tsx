'use client';

import React from 'react';
import { WebScrapingInterface } from '@/components/WebScrapingInterface';
import { FeatureLayout } from '@/components/layouts/MainLayout';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import Link from 'next/link';
import { 
  ArrowLeft,
  Globe,
  Zap,
  Shield,
  Brain,
  FileText,
  Database,
  Search,
  Download,
  Sparkles,
  CheckCircle
} from 'lucide-react';

const WebScrapingPage = () => {
  return (
    <FeatureLayout 
      title="AI-Powered Web Scraping"
      description="Transform any web page into intelligent documents. Extract, process, and chat with web content using advanced AI-powered scraping and analysis."
    >
      <WebScrapingContent />
    </FeatureLayout>
  );
};

const WebScrapingContent = () => {
  const features = [
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Universal Web Scraping",
      description: "Extract content from any website with advanced parsing and cleaning"
    },
    {
      icon: <Brain className="w-6 h-6" />,
      title: "AI-Ready Processing",
      description: "Content automatically formatted for optimal AI conversation and analysis"
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "Smart Document Creation",
      description: "Transform web content into searchable, chat-ready documents"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Privacy-First Scraping",
      description: "All processing happens locally - scraped content never leaves your device"
    },
    {
      icon: <Database className="w-6 h-6" />,
      title: "Instant Knowledge Base",
      description: "Scraped content is immediately available for AI-powered chat and search"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Real-Time Processing",
      description: "Fast extraction and processing with live status updates"
    }
  ];

  const useCases = [
    {
      title: "Research & Analysis",
      description: "Extract articles, papers, and research content for AI-powered analysis",
      examples: ["Academic papers", "News articles", "Blog posts", "Documentation"]
    },
    {
      title: "Competitive Intelligence",
      description: "Monitor competitor websites and analyze their content strategies",
      examples: ["Product pages", "Pricing information", "Company updates", "Press releases"]
    },
    {
      title: "Content Curation", 
      description: "Collect and organize content from multiple sources for comprehensive insights",
      examples: ["Industry trends", "Market research", "Technical guides", "Best practices"]
    },
    {
      title: "Knowledge Management",
      description: "Build comprehensive knowledge bases from web resources",
      examples: ["FAQ collections", "Support documentation", "Training materials", "Reference guides"]
    }
  ];

  return (
    <>
      {/* Back Navigation */}
      <div className="mb-8">
        <Link 
          href="/" 
          className="inline-flex items-center text-purple-200 hover:text-white transition-colors duration-200"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Home
        </Link>
      </div>

      {/* Main Web Scraping Interface */}
      <div className="mb-16">
        <EnhancedCard variant="glass">
          <div className="p-8">
            <WebScrapingInterface />
          </div>
        </EnhancedCard>
      </div>

      {/* Features Grid */}
      <div className="mb-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4 mr-2" />
            Advanced Capabilities
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">
            Why Choose Our Web Scraping?
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Built with privacy, intelligence, and user experience at the core
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <EnhancedCard key={index} variant="gradient" hover>
              <div className="p-6">
                <div className="p-3 bg-white/10 rounded-xl inline-flex mb-4">
                  <div className="text-purple-300">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-300">
                  {feature.description}
                </p>
              </div>
            </EnhancedCard>
          ))}
        </div>
      </div>

      {/* Use Cases */}
      <div className="mb-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            Perfect For Every Use Case
          </h2>
          <p className="text-xl text-gray-300">
            From research to competitive analysis - we&apos;ve got you covered
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {useCases.map((useCase, index) => (
            <EnhancedCard key={index} variant="glass" hover>
              <div className="p-8">
                <h3 className="text-2xl font-semibold text-white mb-4">
                  {useCase.title}
                </h3>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  {useCase.description}
                </p>
                <div>
                  <h4 className="text-sm font-semibold text-purple-300 mb-3 uppercase tracking-wide">
                    Examples:
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {useCase.examples.map((example, exampleIndex) => (
                      <div key={exampleIndex} className="flex items-center text-sm text-gray-400">
                        <CheckCircle className="w-4 h-4 text-green-400 mr-2 flex-shrink-0" />
                        <span>{example}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </EnhancedCard>
          ))}
        </div>
      </div>

      {/* Technical Specifications */}
      <div className="mb-20">
        <EnhancedCard variant="glass">
          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">
                Technical Specifications
              </h2>
              <p className="text-gray-300">
                Enterprise-grade web scraping with advanced AI integration
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="p-4 bg-blue-500/20 rounded-2xl inline-flex mb-4">
                  <Globe className="w-8 h-8 text-blue-300" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Scraping Engine</h3>
                <ul className="text-gray-300 space-y-1 text-sm">
                  <li>JavaScript-enabled scraping</li>
                  <li>Dynamic content handling</li>
                  <li>Anti-bot detection bypass</li>
                  <li>Rate limiting protection</li>
                </ul>
              </div>

              <div className="text-center">
                <div className="p-4 bg-purple-500/20 rounded-2xl inline-flex mb-4">
                  <Brain className="w-8 h-8 text-purple-300" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">AI Processing</h3>
                <ul className="text-gray-300 space-y-1 text-sm">
                  <li>Content cleaning & formatting</li>
                  <li>Automatic summarization</li>
                  <li>Topic extraction</li>
                  <li>Semantic analysis</li>
                </ul>
              </div>

              <div className="text-center">
                <div className="p-4 bg-green-500/20 rounded-2xl inline-flex mb-4">
                  <Shield className="w-8 h-8 text-green-300" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Privacy & Security</h3>
                <ul className="text-gray-300 space-y-1 text-sm">
                  <li>Local processing only</li>
                  <li>No data storage on servers</li>
                  <li>Encrypted content handling</li>
                  <li>GDPR compliant</li>
                </ul>
              </div>
            </div>
          </div>
        </EnhancedCard>
      </div>

      {/* How It Works */}
      <div className="mb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            How It Works
          </h2>
          <p className="text-gray-300">
            Simple 3-step process from URL to intelligent document
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mx-auto mb-6 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">1</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Enter URL</h3>
            <p className="text-gray-300">
              Simply paste any web page URL into the scraping interface above
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl mx-auto mb-6 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">2</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">AI Processing</h3>
            <p className="text-gray-300">
              Our AI extracts, cleans, and formats the content for optimal analysis
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl mx-auto mb-6 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">3</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Chat & Analyze</h3>
            <p className="text-gray-300">
              Start chatting with the scraped content immediately in your dashboard
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default WebScrapingPage;