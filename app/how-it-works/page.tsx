'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FeatureLayout } from '@/components/layouts/MainLayout';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import {
  Upload,
  FileText,
  Brain,
  MessageCircle,
  Mic,
  CheckCircle,
  ArrowRight,
  Play,
  Zap,
  Shield,
  Database,
  Settings,
  Users,
  Cloud,
  Monitor,
  ChevronRight,
  Clock,
  Star,
  Sparkles
} from 'lucide-react';

const HowItWorksPage = () => {
  return (
    <FeatureLayout 
      title="How DocuMind AI Works"
      description="Discover the simple 3-step process to transform your documents into intelligent, conversational knowledge bases with premium AI-powered features."
    >
      <HowItWorksContent />
    </FeatureLayout>
  );
};

const HowItWorksContent = () => {
  const [activeStep, setActiveStep] = useState(0);

  const mainSteps = [
    {
      number: "01",
      title: "Upload Your Documents",
      description: "Simply drag and drop your files or select them from your device. We support all major document formats.",
      icon: <Upload className="w-8 h-8" />,
      details: [
        "Supports 10+ file formats including PDF, DOCX, TXT, CSV",
        "Intelligent OCR for scanned documents and images",
        "Real-time upload progress with detailed status updates",
        "Secure local processing - files never leave your device",
        "Batch upload for multiple documents simultaneously"
      ],
      color: "from-blue-500 to-indigo-600",
      image: "/api/placeholder/600/400"
    },
    {
      number: "02", 
      title: "AI Processing & Analysis",
      description: "Our local AI models analyze your documents, extract key information, and create a smart knowledge base.",
      icon: <Brain className="w-8 h-8" />,
      details: [
        "100% local AI processing with tinyllama, gemma2, or qwen2.5",
        "Advanced text chunking and semantic understanding",
        "Vector embeddings for intelligent content search",
        "Automatic topic extraction and categorization",
        "Multi-language support with native comprehension"
      ],
      color: "from-purple-500 to-pink-600", 
      image: "/api/placeholder/600/400"
    },
    {
      number: "03",
      title: "Chat & Discover",
      description: "Ask questions, get insights, and explore your documents through natural conversations with premium voice responses.",
      icon: <MessageCircle className="w-8 h-8" />,
      details: [
        "Natural language conversations about your content",
        "Context-aware responses with source citations",
        "ElevenLabs premium TTS with 5 voice personalities",
        "Cross-document analysis and comparison",
        "Export insights and conversation history"
      ],
      color: "from-emerald-500 to-green-600",
      image: "/api/placeholder/600/400"
    }
  ];

  const features = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: "100% Private",
      description: "All processing happens locally on your device"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Lightning Fast",
      description: "Sub-second responses with optimized AI models"
    },
    {
      icon: <Database className="w-6 h-6" />,
      title: "Smart Storage",
      description: "Efficient vector storage with ChromaDB integration"
    },
    {
      icon: <Mic className="w-6 h-6" />,
      title: "Premium Voice",
      description: "Natural TTS with ElevenLabs professional voices"
    }
  ];

  const technicalSpecs = [
    {
      category: "AI Models",
      specs: [
        "TinyLlama (1.1B parameters) - Ultra-fast responses",
        "Gemma2:2B (2B parameters) - Balanced performance", 
        "Qwen2.5:3B (3B parameters) - Advanced understanding",
        "Mistral:7B (7B parameters) - Maximum capability"
      ]
    },
    {
      category: "Document Processing",
      specs: [
        "Intelligent text chunking with 200-word overlap",
        "Vector embeddings with 384-dimensional space",
        "OCR with 99%+ accuracy on scanned documents",
        "Multi-format parser with metadata extraction"
      ]
    },
    {
      category: "Voice & Audio",
      specs: [
        "ElevenLabs premium TTS integration",
        "5 professional voice personalities",
        "Real-time audio streaming",
        "Advanced voice controls (speed, pause, replay)"
      ]
    }
  ];

  return (
    <>
      {/* Quick Demo CTA */}
      <div className="text-center mb-16">
        <Link href="/dashboard">
          <EnhancedButton gradient glow className="px-8 py-4 text-lg">
            <Play className="mr-2 w-5 h-5" />
            Try Interactive Demo
          </EnhancedButton>
        </Link>
      </div>

      {/* Main Process Steps */}
      <div className="mb-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4 mr-2" />
            Simple 3-Step Process
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">
            From Upload to Intelligence in Minutes
          </h2>
        </div>

        {/* Step Navigation */}
        <div className="flex justify-center mb-12">
          <div className="flex space-x-4">
            {mainSteps.map((step, index) => (
              <button
                key={index}
                onClick={() => setActiveStep(index)}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeStep === index
                    ? 'bg-purple-500 text-white shadow-lg'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {step.number}. {step.title}
              </button>
            ))}
          </div>
        </div>

        {/* Active Step Detail */}
        <EnhancedCard variant="glass" hover>
          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="flex items-center mb-6">
                  <div className={`p-4 rounded-2xl bg-gradient-to-r ${mainSteps[activeStep].color} mr-4`}>
                    <div className="text-white">
                      {mainSteps[activeStep].icon}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-mono text-purple-300 mb-1">
                      Step {mainSteps[activeStep].number}
                    </div>
                    <h3 className="text-3xl font-bold text-white">
                      {mainSteps[activeStep].title}
                    </h3>
                  </div>
                </div>

                <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                  {mainSteps[activeStep].description}
                </p>

                <ul className="space-y-4">
                  {mainSteps[activeStep].details.map((detail, index) => (
                    <li key={index} className="flex items-start text-gray-300">
                      <CheckCircle className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="bg-gray-800/50 rounded-2xl p-8 text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                    <div className={`p-4 rounded-xl bg-gradient-to-r ${mainSteps[activeStep].color}`}>
                      <div className="text-white">
                        {mainSteps[activeStep].icon}
                      </div>
                    </div>
                  </div>
                  <h4 className="text-xl font-semibold text-white mb-2">
                    Interactive Demo Available
                  </h4>
                  <p className="text-gray-400 mb-6">
                    See this step in action with our live demo
                  </p>
                  <Link href="/dashboard">
                    <EnhancedButton variant="outline" className="border-purple-300 text-purple-200">
                      View Demo
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </EnhancedButton>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </EnhancedCard>
      </div>

      {/* Key Features Grid */}
      <div className="mb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            Why Choose DocuMind AI?
          </h2>
          <p className="text-xl text-gray-300">
            Built with privacy, performance, and user experience in mind
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <EnhancedCard key={index} variant="gradient" hover>
              <div className="p-6 text-center">
                <div className="p-3 bg-white/10 rounded-xl inline-flex mb-4">
                  <div className="text-purple-300">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-300 text-sm">
                  {feature.description}
                </p>
              </div>
            </EnhancedCard>
          ))}
        </div>
      </div>

      {/* Technical Architecture */}
      <div className="mb-20">
        <EnhancedCard variant="glass">
          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">
                Technical Architecture
              </h2>
              <p className="text-gray-300">
                Enterprise-grade technology stack for maximum performance and security
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {technicalSpecs.map((section, index) => (
                <div key={index}>
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                    {section.category}
                  </h3>
                  <ul className="space-y-3">
                    {section.specs.map((spec, specIndex) => (
                      <li key={specIndex} className="text-gray-300 text-sm flex items-start">
                        <ChevronRight className="w-4 h-4 text-purple-400 mr-2 mt-0.5 flex-shrink-0" />
                        <span>{spec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </EnhancedCard>
      </div>

      {/* Performance Metrics */}
      <div className="mb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            Performance That Delivers
          </h2>
          <p className="text-gray-300">
            Optimized for speed, accuracy, and user satisfaction
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <EnhancedCard variant="glass" hover>
            <div className="p-6 text-center">
              <div className="text-4xl font-bold text-purple-300 mb-2">
                &lt;1s
              </div>
              <div className="text-white font-medium mb-1">Response Time</div>
              <div className="text-gray-400 text-sm">Average AI response</div>
            </div>
          </EnhancedCard>

          <EnhancedCard variant="glass" hover>
            <div className="p-6 text-center">
              <div className="text-4xl font-bold text-green-400 mb-2">
                99%
              </div>
              <div className="text-white font-medium mb-1">Accuracy</div>
              <div className="text-gray-400 text-sm">OCR & text extraction</div>
            </div>
          </EnhancedCard>

          <EnhancedCard variant="glass" hover>
            <div className="p-6 text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">
                50+
              </div>
              <div className="text-white font-medium mb-1">Languages</div>
              <div className="text-gray-400 text-sm">Multi-language support</div>
            </div>
          </EnhancedCard>

          <EnhancedCard variant="glass" hover>
            <div className="p-6 text-center">
              <div className="text-4xl font-bold text-amber-400 mb-2">
                0%
              </div>
              <div className="text-white font-medium mb-1">Data Sharing</div>
              <div className="text-gray-400 text-sm">100% local processing</div>
            </div>
          </EnhancedCard>
        </div>
      </div>

      {/* Getting Started CTA */}
      <div className="text-center">
        <EnhancedCard variant="gradient" glow>
          <div className="p-12">
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to Experience the Future of Document AI?
            </h2>
            <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
              Join thousands of professionals who have transformed their workflow with intelligent document processing and premium AI-powered conversations.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link href="/dashboard">
                <EnhancedButton gradient glow className="px-8 py-4 text-lg">
                  <Play className="mr-2 w-5 h-5" />
                  Start Free Trial
                </EnhancedButton>
              </Link>
              <Link href="/features">
                <EnhancedButton variant="outline" className="px-8 py-4 text-lg border-purple-300 text-purple-200 hover:bg-purple-500/10">
                  Explore Features
                  <ArrowRight className="ml-2 w-5 h-5" />
                </EnhancedButton>
              </Link>
            </div>

            <div className="flex items-center justify-center space-x-6 text-sm text-gray-300">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                2-minute setup
              </div>
              <div className="flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                100% private
              </div>
              <div className="flex items-center">
                <Star className="w-4 h-4 mr-2" />
                No credit card required
              </div>
            </div>
          </div>
        </EnhancedCard>
      </div>
    </>
  );
};

export default HowItWorksPage;