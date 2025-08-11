import { SparklesCore } from "@/components/sparkles"
import PricingCards from "@/components/pricing-cards"

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-black/[0.96] antialiased bg-grid-white/[0.02] relative overflow-hidden">
      {/* Ambient background with moving particles */}
      <div className="h-full w-full absolute inset-0 z-0">
        <SparklesCore
          id="tsparticlesfullpage"
          background="transparent"
          minSize={0.6}
          maxSize={1.4}
          particleDensity={100}
          className="w-full h-full"
          particleColor="#FFFFFF"
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600">
              Research Smarter,
            </span>{" "}
            Not Harder
          </h2>
          <p className="mt-4 text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
            Choose the perfect plan for your research needs. All plans include our core AI features and seamless
            integration with popular research tools.
          </p>
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
            Contact our team for enterprise pricing and custom integrations tailored to your organization's needs.
          </p>
          <button className="inline-flex items-center px-6 py-3 border border-purple-500 text-purple-400 rounded-lg hover:bg-purple-500/10 transition-colors">
            Contact Sales
          </button>
        </div>
      </div>
    </div>
  )
}

