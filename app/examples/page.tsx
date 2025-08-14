'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  MessageCircle,
  Mic,
  Play,
  Book,
  Briefcase,
  GraduationCap,
  Users,
  Building,
  Heart,
  Scale,
  Cpu,
  ArrowRight,
  CheckCircle,
  Zap,
  Brain,
  Search,
  BarChart3,
  Clock,
  Star
} from 'lucide-react';

const ExamplesPage = () => {
  const [activeCategory, setActiveCategory] = useState('business');
  const [activeExample, setActiveExample] = useState(0);

  const categories = [
    { id: 'business', label: 'Business', icon: <Briefcase className="w-5 h-5" /> },
    { id: 'research', label: 'Research', icon: <GraduationCap className="w-5 h-5" /> },
    { id: 'legal', label: 'Legal', icon: <Scale className="w-5 h-5" /> },
    { id: 'healthcare', label: 'Healthcare', icon: <Heart className="w-5 h-5" /> },
    { id: 'education', label: 'Education', icon: <Book className="w-5 h-5" /> },
    { id: 'technical', label: 'Technical', icon: <Cpu className="w-5 h-5" /> }
  ];

  const examples = {
    business: [
      {
        title: "Annual Report Analysis",
        description: "Extract key financial metrics and strategic insights from 100+ page annual reports",
        document: "2023-Annual-Report.pdf (127 pages)",
        conversation: [
          { user: "What were the key revenue drivers this year?", ai: "Based on the annual report, the three main revenue drivers were: 1) Cloud services growth of 34% YoY ($2.8B), 2) International expansion contributing $1.2B in new revenue, and 3) Product licensing agreements worth $800M. These segments collectively represent 67% of total revenue growth." },
          { user: "What are the biggest risks mentioned?", ai: "The report identifies five critical risk factors: 1) Supply chain disruptions, 2) Cybersecurity threats, 3) Regulatory changes in key markets, 4) Currency fluctuations, and 5) Competition from emerging technologies. Management has allocated $150M for risk mitigation strategies." }
        ],
        insights: ["Revenue analysis", "Risk assessment", "Strategic planning", "Competitive positioning"],
        processingTime: "3.2 seconds"
      },
      {
        title: "Market Research Report",
        description: "Analyze customer feedback and market trends from comprehensive research documents",
        document: "Q4-Market-Research.docx (45 pages)",
        conversation: [
          { user: "What are customers saying about our pricing?", ai: "Customer sentiment analysis reveals mixed feedback on pricing: 67% find our premium tier 'expensive but justified' due to feature richness, 23% consider switching to competitors for cost reasons, and 10% request more flexible payment options. The report suggests introducing a mid-tier option." },
          { user: "Which features are most requested?", ai: "Top 5 feature requests from 2,847 survey responses: 1) Better mobile experience (78%), 2) Advanced analytics dashboard (61%), 3) Third-party integrations (54%), 4) Automated reporting (47%), 5) Multi-language support (41%)." }
        ],
        insights: ["Customer sentiment", "Feature prioritization", "Pricing strategy", "Market positioning"],
        processingTime: "2.1 seconds"
      }
    ],
    research: [
      {
        title: "Academic Paper Analysis",
        description: "Deep dive into research methodologies and findings from scientific papers",
        document: "Machine-Learning-Healthcare-2024.pdf (32 pages)",
        conversation: [
          { user: "What methodology did they use for the study?", ai: "The researchers employed a multi-phase approach: 1) Retrospective cohort study with 15,847 patients, 2) Random forest algorithm for predictive modeling, 3) 5-fold cross-validation for model validation, 4) Statistical analysis using SPSS 28.0, and 5) Ethical approval from three institutional review boards." },
          { user: "What were the main limitations?", ai: "The study acknowledges five key limitations: 1) Single-center design limiting generalizability, 2) Retrospective nature potentially introducing selection bias, 3) Missing data for 12% of patients, 4) Limited follow-up period of 18 months, and 5) Inability to control for all confounding variables." }
        ],
        insights: ["Research methodology", "Statistical analysis", "Study limitations", "Clinical implications"],
        processingTime: "4.1 seconds"
      }
    ],
    legal: [
      {
        title: "Contract Review",
        description: "Analyze complex legal agreements and identify key terms and potential risks",
        document: "Software-License-Agreement.pdf (67 pages)",
        conversation: [
          { user: "What are the termination clauses?", ai: "The agreement contains three termination mechanisms: 1) Either party may terminate with 90 days written notice, 2) Immediate termination for material breach if not cured within 30 days, 3) Automatic termination upon bankruptcy or insolvency. Sections 12.2-12.4 detail post-termination obligations including data return and IP cessation." },
          { user: "Are there any liability caps?", ai: "Yes, liability is limited in Section 15: 1) Total liability capped at 12 months of fees paid, 2) No consequential or indirect damages, 3) Exceptions for IP infringement, confidentiality breaches, and gross negligence, 4) Indemnification obligations in Section 16 for third-party claims." }
        ],
        insights: ["Contract terms", "Risk assessment", "Liability analysis", "Compliance requirements"],
        processingTime: "5.3 seconds"
      }
    ],
    healthcare: [
      {
        title: "Clinical Guidelines",
        description: "Process medical protocols and treatment guidelines for healthcare professionals",
        document: "Diabetes-Treatment-Protocol.pdf (89 pages)",
        conversation: [
          { user: "What's the first-line treatment for Type 2 diabetes?", ai: "According to the guidelines, first-line treatment follows this hierarchy: 1) Metformin 500mg twice daily (unless contraindicated), 2) Lifestyle modifications including 150 minutes weekly exercise, 3) Nutritional counseling with carbohydrate counting, 4) HbA1c monitoring every 3 months, 5) Annual comprehensive diabetes evaluation." },
          { user: "When should insulin be considered?", ai: "Insulin initiation is recommended in these scenarios: 1) HbA1c >10% at diagnosis, 2) Blood glucose >300 mg/dL with symptoms, 3) Failure to reach target HbA1c <7% after 3 months on dual therapy, 4) Pregnancy planning or pregnancy, 5) Acute illness or surgery requiring glucose control." }
        ],
        insights: ["Treatment protocols", "Drug interactions", "Patient monitoring", "Clinical decision support"],
        processingTime: "3.8 seconds"
      }
    ],
    education: [
      {
        title: "Course Material Processing",
        description: "Transform textbooks and lecture notes into interactive learning experiences",
        document: "Advanced-Physics-Textbook.pdf (423 pages)",
        conversation: [
          { user: "Explain quantum entanglement in simple terms", ai: "Quantum entanglement is like having two magical coins that are forever connected. When you flip one and it lands heads, the other instantly becomes tails, no matter how far apart they are. In quantum physics, particles can become 'entangled' so their properties remain connected - measuring one particle instantly affects its partner, even across vast distances. Einstein called this 'spooky action at a distance.'" },
          { user: "What are the key equations in Chapter 12?", ai: "Chapter 12 presents five fundamental equations: 1) Schrödinger's equation (Ψ = iℏ∂Ψ/∂t), 2) Heisenberg uncertainty principle (ΔxΔp ≥ ℏ/2), 3) Wave function normalization (∫|Ψ|²dx = 1), 4) Expectation value formula (<A> = ∫Ψ*ÂΨdx), 5) Time evolution operator (U = e^(-iĤt/ℏ))." }
        ],
        insights: ["Concept explanation", "Formula reference", "Learning objectives", "Practice problems"],
        processingTime: "6.2 seconds"
      }
    ],
    technical: [
      {
        title: "API Documentation",
        description: "Navigate complex technical documentation and implementation guides",
        document: "REST-API-Documentation.pdf (156 pages)",
        conversation: [
          { user: "How do I authenticate API requests?", ai: "The API supports three authentication methods: 1) OAuth 2.0 with bearer tokens (recommended for production), 2) API key authentication via X-API-Key header, 3) JWT tokens for user-specific operations. Include your token in the Authorization header: 'Authorization: Bearer {your-token}'. Tokens expire after 24 hours." },
          { user: "What's the rate limiting policy?", ai: "Rate limits vary by endpoint tier: 1) Free tier: 100 requests/hour, 2) Basic plan: 1,000 requests/hour, 3) Pro plan: 10,000 requests/hour, 4) Enterprise: Custom limits. Rate limit headers are returned: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset. HTTP 429 status code indicates limit exceeded." }
        ],
        insights: ["Implementation details", "Error handling", "Best practices", "Code examples"],
        processingTime: "2.9 seconds"
      }
    ]
  };

  const demoQuestions = [
    "What are the key findings?",
    "Summarize the main points",
    "What are the risks mentioned?",
    "Extract all dates and deadlines",
    "Who are the key stakeholders?",
    "What actions need to be taken?",
    "Compare this with industry standards",
    "Identify any contradictions",
    "What's the financial impact?",
    "Highlight urgent items"
  ];

  const voicePersonas = [
    { name: "Rachel", style: "Conversational", best: "General discussions" },
    { name: "Adam", style: "Professional", best: "Business reports" },
    { name: "Antoni", style: "Clear", best: "Technical content" },
    { name: "Sam", style: "Casual", best: "Educational material" },
    { name: "Bella", style: "Expressive", best: "Creative content" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-700">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Real-World
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
                Examples
              </span>
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto mb-8">
              See how professionals across industries use our AI-powered document intelligence system 
              to transform complex documents into actionable insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-xl text-indigo-700 bg-white hover:bg-gray-50 transition-all duration-200 hover:scale-105 hover:shadow-lg"
              >
                Try With Your Documents
                <Play className="ml-2 w-5 h-5" />
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex items-center px-8 py-4 border-2 border-white/30 text-lg font-medium rounded-xl text-white hover:bg-white/10 transition-all duration-200 hover:scale-105"
              >
                How It Works
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all duration-200 ${
                activeCategory === category.id
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
              }`}
            >
              {category.icon}
              {category.label}
            </button>
          ))}
        </div>

        {/* Examples Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {examples[activeCategory as keyof typeof examples]?.map((example, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
                <h3 className="text-2xl font-bold mb-2">{example.title}</h3>
                <p className="text-indigo-100 mb-4">{example.description}</p>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                    <FileText className="w-4 h-4" />
                    {example.document}
                  </div>
                  <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                    <Clock className="w-4 h-4" />
                    {example.processingTime}
                  </div>
                </div>
              </div>

              {/* Conversation */}
              <div className="p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-indigo-600" />
                  AI Conversation Example
                </h4>
                <div className="space-y-4 mb-6">
                  {example.conversation.map((exchange, exchIndex) => (
                    <div key={exchIndex} className="space-y-2">
                      <div className="bg-indigo-50 p-4 rounded-lg">
                        <div className="font-medium text-indigo-900 mb-1">User Question:</div>
                        <div className="text-indigo-700">"{exchange.user}"</div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="font-medium text-gray-900 mb-1 flex items-center gap-2">
                          <Brain className="w-4 h-4" />
                          AI Response:
                        </div>
                        <div className="text-gray-700 text-sm leading-relaxed">{exchange.ai}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Insights */}
                <div className="border-t pt-4">
                  <h5 className="font-medium text-gray-900 mb-3">Key Capabilities Demonstrated:</h5>
                  <div className="flex flex-wrap gap-2">
                    {example.insights.map((insight, insightIndex) => (
                      <span
                        key={insightIndex}
                        className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium"
                      >
                        {insight}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Demo Questions Section */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Popular Questions to Ask</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get inspired by these commonly used questions that work great with any document type
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {demoQuestions.map((question, index) => (
              <div
                key={index}
                className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <MessageCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-200" />
                  <span className="text-gray-700 group-hover:text-indigo-700 transition-colors duration-200">
                    "{question}"
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Voice Personas */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Voice Personas</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose from 5 professional voices, each optimized for different content types and contexts
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {voicePersonas.map((persona, index) => (
            <div
              key={index}
              className="text-center bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
            >
              <div className="inline-flex items-center justify-center p-4 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full text-white mb-4">
                <Mic className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{persona.name}</h3>
              <div className="text-sm text-indigo-600 font-medium mb-2">{persona.style}</div>
              <div className="text-sm text-gray-600">{persona.best}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Stats */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Performance Highlights</h2>
            <p className="text-xl text-gray-600">
              Real metrics from actual usage across different document types
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center bg-white rounded-xl p-8 shadow-lg">
              <div className="text-4xl font-bold text-indigo-600 mb-2">2.3s</div>
              <div className="text-gray-600">Average Processing Time</div>
              <div className="text-sm text-gray-500 mt-2">for 50-page documents</div>
            </div>
            <div className="text-center bg-white rounded-xl p-8 shadow-lg">
              <div className="text-4xl font-bold text-emerald-600 mb-2">98.7%</div>
              <div className="text-gray-600">Text Extraction Accuracy</div>
              <div className="text-sm text-gray-500 mt-2">including OCR processing</div>
            </div>
            <div className="text-center bg-white rounded-xl p-8 shadow-lg">
              <div className="text-4xl font-bold text-purple-600 mb-2">25MB</div>
              <div className="text-gray-600">Maximum File Size</div>
              <div className="text-sm text-gray-500 mt-2">per document upload</div>
            </div>
            <div className="text-center bg-white rounded-xl p-8 shadow-lg">
              <div className="text-4xl font-bold text-amber-600 mb-2">15+</div>
              <div className="text-gray-600">Supported Formats</div>
              <div className="text-sm text-gray-500 mt-2">PDF, DOCX, images, and more</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-700 py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Try It With Your Documents?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Upload any document and start having intelligent conversations in seconds. 
            Experience the power of AI-driven document analysis with premium voice responses.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-xl text-indigo-700 bg-white hover:bg-gray-50 transition-all duration-200 hover:scale-105 hover:shadow-lg"
            >
              Upload Your First Document
              <FileText className="ml-2 w-5 h-5" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center px-8 py-4 border-2 border-white/30 text-lg font-medium rounded-xl text-white hover:bg-white/10 transition-all duration-200 hover:scale-105"
            >
              View Pricing Plans
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamplesPage;