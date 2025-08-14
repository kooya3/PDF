import { FeatureLayout } from '@/components/layouts/MainLayout';
import PricingCards from "@/components/pricing-cards";

export default function PricingPage() {
  return (
    <FeatureLayout 
      title="Simple, Transparent Pricing"
      description="Choose the perfect plan for your document AI needs. All plans include local processing, premium voice synthesis, and enterprise-grade security."
    >
      <div className="relative z-10">

        {/* Key Benefits */}
        <div className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="text-2xl mb-2">🔒</div>
            <div className="text-white font-medium">100% Private</div>
            <div className="text-gray-400 text-sm">Local AI processing</div>
          </div>
          <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="text-2xl mb-2">🎵</div>
            <div className="text-white font-medium">Premium Voice</div>
            <div className="text-gray-400 text-sm">ElevenLabs TTS</div>
          </div>
          <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="text-2xl mb-2">⚡</div>
            <div className="text-white font-medium">Universal Support</div>
            <div className="text-gray-400 text-sm">15+ document formats</div>
          </div>
        </div>

        {/* Pricing toggle */}
        <div className="mt-12 sm:mt-16 relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center">
            <span className="px-3 bg-black/[0.96] text-sm text-gray-400">All plans include a 14-day free trial</span>
          </div>
        </div>

        <PricingCards />

        {/* Bottom CTA */}
        <div className="mt-20 text-center">
          <h3 className="text-xl text-gray-300 mb-4">Need a custom solution?</h3>
          <p className="text-gray-400 max-w-2xl mx-auto mb-8">
            Contact our team for enterprise pricing, custom AI model training, and specialized integrations 
            tailored to your organization's document processing needs.
          </p>
          <button className="inline-flex items-center px-6 py-3 border border-purple-500 text-purple-400 rounded-lg hover:bg-purple-500/10 transition-colors">
            Contact Sales
          </button>
        </div>
      </div>
    </FeatureLayout>
  )
}

