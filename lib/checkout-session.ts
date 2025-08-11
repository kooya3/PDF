"use server"

import stripe from "@/lib/stripe"
import type { Metadata, GroupedBasketItem } from "./types"

export async function createCheckoutSession(items: GroupedBasketItem[], metadata: Metadata) {
  try {
    const itemsWithoutPrice = items.filter((item) => !item.selectedSizeDetails?.price)

    if (itemsWithoutPrice.length > 0) {
      throw new Error("Some items don't have a price")
    }

    // Search for existing customer by email
    const customers = await stripe.customers.list({
      email: metadata.customerEmail,
      limit: 1,
    })

    let customerId: string | undefined
    if (customers.data.length > 0) {
      customerId = customers.data[0].id
    }

    const baseUrl =
      process.env.NODE_ENV === "production"
        ? `https://${process.env.VERCEL_URL}`
        : `${process.env.NEXT_PUBLIC_BASE_URL}`

    const successUrl = `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&orderNumber=${metadata.orderNumber}`
    const cancelUrl = `${baseUrl}/pricing`

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_creation: customerId ? undefined : "always",
      customer_email: !customerId ? metadata.customerEmail : undefined,
      metadata,
      mode: "subscription", // Changed to subscription
      allow_promotion_codes: true,
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: items.map((item) => ({
        price_data: {
          currency: "usd",
          unit_amount: item.selectedSizeDetails ? Math.round(item.selectedSizeDetails.price * 100) : 0,
          product_data: {
            name: item.product.name || "Unnamed Product",
            description: `Subscription plan: ${item.product.name}`,
            metadata: {
              id: item.product._id,
            },
          },
          recurring: {
            interval: "month",
          },
        },
        quantity: item.quantity,
      })),
    })

    return session.url
  } catch (error) {
    console.error("Error creating checkout session:", error)
    throw error
  }
}

