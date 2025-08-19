'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import {
  CheckCircle,
  Sparkles,
  ArrowRight,
  Download,
  Play,
  FileText,
  Mic,
  Brain,
  Shield,
  Zap,
  Calendar,
  CreditCard,
  Users,
  Settings,
  Star,
  Gift,
  BookOpen,
  MessageCircle
} from 'lucide-react';

interface SubscriptionDetails {
  planName: string;
  amount: number;
  features: string[];
  documentsLimit: number;
  nextBilling: string;
  orderNumber: string;
}

const SuccessPageContent = () => {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Extract parameters from URL (typically passed from payment processor)
  const sessionId = searchParams.get('session_id');
  const planId = searchParams.get('plan_id');
  const amount = searchParams.get('amount');

  useEffect(() => {
    // In a real implementation, you'd fetch subscription details from your API
    // using the session_id or other parameters
    const fetchSubscriptionDetails = async () => {
      try {
        // Mock data based on plan_id - replace with actual API call
        let details: SubscriptionDetails;
        
        switch (planId) {
          case 'professional':
            details = {
              planName: 'Professional',
              amount: 49,
              features: [
                '500 documents per month',
                'Premium ElevenLabs TTS (5 voices)',
                'Advanced AI analysis',
                'OCR for scanned documents',
                'Priority support',
                'Team collaboration (up to 5 users)',
                '10GB storage',
                'API access (1,000 calls/day)',
                'Custom voice settings'
              ],
              documentsLimit: 500,
              nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              orderNumber: `ORD-${Date.now()}`
            };
            break;
          case 'enterprise':
            details = {
              planName: 'Enterprise',
              amount: 149,
              features: [
                'Unlimited documents',
                'Custom AI model fine-tuning',
                '24/7 priority support',
                'Advanced analytics dashboard',
                'Unlimited API access',
                'Custom integrations',
                'Dedicated account manager',
                'On-premise deployment option',
                'Custom training sessions',
                '99.9% SLA guarantee'
              ],
              documentsLimit: -1,
              nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              orderNumber: `ORD-${Date.now()}`
            };
            break;
          default:
            details = {
              planName: 'Personal',
              amount: 19,
              features: [
                '100 documents per month',
                'All document formats (PDF, DOCX, etc.)',
                'Local AI processing (100% private)',
                'Basic TTS voices',
                'Email support',
                '2GB storage',
                '1 user account'
              ],
              documentsLimit: 100,
              nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              orderNumber: `ORD-${Date.now()}`
            };
        }
        
        setSubscriptionDetails(details);
      } catch (error) {
        console.error('Error fetching subscription details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptionDetails();
  }, [sessionId, planId, amount]);

  const nextSteps = [
    {
      icon: <FileText className="w-6 h-6" />,
      title: "Upload Your First Document",
      description: "Start by uploading any PDF, DOCX, or image file to begin processing",
      action: "Go to Dashboard",
      href: "/dashboard"
    },
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: "Have Your First Conversation",
      description: "Ask questions about your document and experience AI-powered insights",
      action: "Try Chat",
      href: "/dashboard"
    },
    {
      icon: <Mic className="w-6 h-6" />,
      title: "Explore Premium Voices",
      description: "Test our 5 ElevenLabs conversational voices for the best experience",
      action: "Voice Settings",
      href: "/dashboard"
    },
    {
      icon: <Settings className="w-6 h-6" />,
      title: "Customize Your Experience",
      description: "Adjust AI models, voice preferences, and processing settings",
      action: "Settings",
      href: "/dashboard"
    }
  ];

  const tips = [
    {
      icon: <Brain className="w-5 h-5 text-blue-500" />,
      title: "Try Different AI Models",
      description: "Experiment with tinyllama for speed or llama3.2 for complex analysis"
    },
    {
      icon: <Shield className="w-5 h-5 text-green-500" />,
      title: "Everything Stays Private",
      description: "Your documents are processed locally - nothing leaves your device"
    },
    {
      icon: <Zap className="w-5 h-5 text-yellow-500" />,
      title: "Use Smart Questions",
      description: "Ask for summaries, key points, dates, or specific information extraction"
    },
    {
      icon: <Sparkles className="w-5 h-5 text-purple-500" />,
      title: "Voice Controls",
      description: "Adjust stability, similarity, and expression for perfect voice output"
    }
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing your subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Success Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-8 shadow-xl">
            <CheckCircle className="w-12 h-12 text-emerald-600" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Welcome to DocuMind AI!
          </h1>
          
          <p className="text-xl text-emerald-100 mb-8 max-w-2xl mx-auto">
            Your subscription has been activated successfully. You now have access to premium 
            document intelligence with local AI processing and professional voice synthesis.
          </p>

          {subscriptionDetails && (
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/30">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-white">
                <div>
                  <p className="text-emerald-100 text-sm mb-1">Plan</p>
                  <p className="text-2xl font-bold">{subscriptionDetails.planName}</p>
                </div>
                <div>
                  <p className="text-emerald-100 text-sm mb-1">Monthly Cost</p>
                  <p className="text-2xl font-bold">${subscriptionDetails.amount}</p>
                </div>
                <div>
                  <p className="text-emerald-100 text-sm mb-1">Next Billing</p>
                  <p className="text-lg font-semibold">{formatDate(subscriptionDetails.nextBilling)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-xl text-emerald-700 bg-white hover:bg-gray-50 transition-all duration-200 hover:scale-105 hover:shadow-lg"
            >
              Start Using DocuMind AI
              <Play className="ml-2 w-5 h-5" />
            </Link>
            <Link
              href="/orders"
              className="inline-flex items-center px-8 py-4 border-2 border-white/30 text-lg font-medium rounded-xl text-white hover:bg-white/10 transition-all duration-200 hover:scale-105"
            >
              View Order Details
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Subscription Features */}
      {subscriptionDetails && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Your {subscriptionDetails.planName} Features</h2>
            <p className="text-xl text-gray-600">
              Everything you need for intelligent document processing and conversation
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 mb-16">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subscriptionDetails.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Next Steps */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Get Started in 4 Easy Steps</h2>
            <p className="text-xl text-gray-600">
              Follow these steps to make the most of your new subscription
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {nextSteps.map((step, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 relative"
              >
                <div className="absolute -top-4 left-6 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <div className="pt-4">
                  <div className="inline-flex items-center justify-center p-3 bg-indigo-100 rounded-lg text-indigo-600 mb-4">
                    {step.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-600 mb-6">{step.description}</p>
                  <Link
                    href={step.href}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    {step.action}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pro Tips */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Pro Tips for Success</h2>
          <p className="text-xl text-gray-600">
            Expert recommendations to maximize your document intelligence experience
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {tips.map((tip, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-2 bg-gray-50 rounded-lg">
                  {tip.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{tip.title}</h3>
                  <p className="text-gray-600">{tip.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Receipt/Invoice Section */}
      {subscriptionDetails && (
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold">Payment Confirmation</h3>
                    <p className="text-indigo-100">Order #{subscriptionDetails.orderNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-indigo-100">Amount Paid</p>
                    <p className="text-3xl font-bold">${subscriptionDetails.amount}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">Billing Information</h4>
                    <div className="space-y-2 text-gray-600">
                      <p><strong>Customer:</strong> {user?.fullName || 'N/A'}</p>
                      <p><strong>Email:</strong> {user?.primaryEmailAddress?.emailAddress || 'N/A'}</p>
                      <p><strong>Plan:</strong> {subscriptionDetails.planName}</p>
                      <p><strong>Billing Cycle:</strong> Monthly</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">Next Steps</h4>
                    <div className="space-y-3">
                      <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                        <Download className="w-4 h-4 mr-2" />
                        Download Receipt
                      </button>
                      <Link
                        href="/orders"
                        className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Manage Subscription
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Support Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-700 rounded-2xl p-12 text-center text-white">
          <Gift className="w-16 h-16 mx-auto mb-6 text-yellow-300" />
          <h2 className="text-3xl font-bold mb-4">Welcome Bonus!</h2>
          <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
            As a thank you for joining DocuMind AI, you get access to our exclusive getting started guide 
            and priority onboarding support for your first week.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center px-6 py-3 bg-white text-indigo-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              <BookOpen className="w-5 h-5 mr-2" />
              Access Getting Started Guide
            </Link>
            <button className="inline-flex items-center px-6 py-3 border-2 border-white/30 text-white rounded-lg hover:bg-white/10 transition-colors font-medium">
              <Users className="w-5 h-5 mr-2" />
              Contact Priority Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SuccessPage = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <SuccessPageContent />
    </Suspense>
  );
};

export default SuccessPage;