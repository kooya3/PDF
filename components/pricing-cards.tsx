"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Check, Sparkles, Zap, Shield, Clock, Users } from "lucide-react"
import { useSchematicFlag, useSchematicEvents } from "@schematichq/schematic-react"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { createCheckoutSession } from "@/lib/checkout-session"

interface PricingTier {
  name: string
  id: string
  priceMonthly: number
  description: string
  features: string[]
  icon: React.ElementType
  popular?: boolean
}

const tiers: PricingTier[] = [
  {
    name: "Personal",
    id: "personal",
    priceMonthly: 19,
    description: "Perfect for individuals and freelancers",
    icon: Zap,
    features: [
      "100 documents per month",
      "All document formats (PDF, DOCX, etc.)",
      "Local AI processing (100% private)",
      "Basic TTS voices",
      "Email support",
      "2GB storage",
      "1 user account",
    ],
  },
  {
    name: "Professional",
    id: "professional",
    priceMonthly: 49,
    description: "For professionals and small teams",
    icon: Shield,
    popular: true,
    features: [
      "500 documents per month",
      "Premium ElevenLabs TTS (5 voices)",
      "Advanced AI analysis",
      "OCR for scanned documents",
      "Priority support",
      "Team collaboration (up to 5 users)",
      "10GB storage",
      "API access (1,000 calls/day)",
      "Custom voice settings",
    ],
  },
  {
    name: "Enterprise",
    id: "enterprise",
    priceMonthly: 149,
    description: "For large organizations and institutions",
    icon: Users,
    features: [
      "Unlimited documents",
      "Custom AI model fine-tuning",
      "24/7 priority support",
      "Advanced analytics dashboard",
      "Unlimited API access",
      "Custom integrations",
      "Dedicated account manager",
      "On-premise deployment option",
      "Custom training sessions",
      "99.9% SLA guarantee",
    ],
  },
]

export default function PricingCards() {
  const { user } = useUser()
  const { identify } = useSchematicEvents()
  const [selectedTier, setSelectedTier] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const showNewFeatures = useSchematicFlag("new-pricing-features")

  useEffect(() => {
    if (user) {
      identify({
        company: {
          keys: { id: user.id },
          attributes: {
            name: user.fullName || "",
            email: user.primaryEmailAddress?.emailAddress || "",
          },
        },
      })
    }
  }, [user, identify])

  const handleSubscribe = async (tier: PricingTier) => {
    if (!user) {
      window.location.href = "/sign-in?redirect=/pricing"
      return
    }

    setIsLoading(true)
    setSelectedTier(tier.id)

    try {
      const checkoutUrl = await createCheckoutSession(
        [
          {
            product: {
              _id: tier.id,
              name: tier.name,
              images: [],
            },
            quantity: 1,
            selectedSizeDetails: {
              size: "default",
              stock: 999,
              price: tier.priceMonthly,
            },
          },
        ],
        {
          orderNumber: `${Date.now()}`,
          customerName: user.fullName || "",
          customerEmail: user.primaryEmailAddress?.emailAddress || "",
          clerkUserId: user.id,
        },
      )

      if (checkoutUrl) {
        window.location.href = checkoutUrl
      }
    } catch (error) {
      console.error("Error creating checkout session:", error)
    } finally {
      setIsLoading(false)
      setSelectedTier(null)
    }
  }

  return (
    <div className="mt-16 grid gap-8 lg:grid-cols-3 relative">
      {/* Decorative background elements */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full h-full max-w-lg bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-purple-500/30 blur-[120px] rounded-full" />
      </div>

      {tiers.map((tier) => (
        <motion.div
          key={tier.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`
            relative rounded-2xl backdrop-blur-xl border transition-all duration-300
            ${
              tier.popular
                ? "bg-white/10 border-purple-500 shadow-lg shadow-purple-500/20"
                : "bg-white/5 border-white/10 hover:border-purple-500/50"
            }
          `}
        >
          {tier.popular && (
            <div className="absolute -top-5 left-0 right-0 mx-auto w-32 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 text-sm font-medium text-white text-center">
              Most Popular
            </div>
          )}

          <div className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">{tier.name}</h3>
                <p className="text-gray-400 text-sm">{tier.description}</p>
              </div>
              <tier.icon className={`w-8 h-8 ${tier.popular ? "text-purple-400" : "text-gray-400"}`} />
            </div>

            <div className="mt-6 flex items-baseline">
              <span className="text-5xl font-extrabold text-white">${tier.priceMonthly}</span>
              <span className="ml-2 text-gray-400">/month</span>
            </div>

            <ul className="mt-8 space-y-4">
              {tier.features.map((feature) => (
                <motion.li
                  key={feature}
                  className="flex items-center text-gray-300"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Check className={`h-5 w-5 mr-3 ${tier.popular ? "text-purple-400" : "text-gray-400"}`} />
                  {feature}
                </motion.li>
              ))}
              {showNewFeatures && tier.name !== "Starter" && (
                <motion.li
                  className="flex items-center text-purple-400"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: 0.5 }}
                >
                  <Sparkles className="h-5 w-5 mr-3" />
                  Beta Features Access
                </motion.li>
              )}
            </ul>

            <Button
              className={`
                mt-8 w-full h-12 text-base font-medium transition-all duration-300
                ${
                  tier.popular
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/25"
                    : "bg-white/10 hover:bg-white/20 text-white"
                }
              `}
              onClick={() => handleSubscribe(tier)}
              disabled={isLoading && selectedTier === tier.id}
            >
              {isLoading && selectedTier === tier.id ? (
                <div className="flex items-center">
                  <Clock className="animate-spin mr-2 h-5 w-5" />
                  Processing...
                </div>
              ) : (
                "Subscribe Now"
              )}
            </Button>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

