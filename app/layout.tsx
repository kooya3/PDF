import type React from "react"
import type { Metadata } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { SchematicProviderWrapper } from "@/components/providers/schematic-provider"
import ConvexProviderWrapper from "@/components/providers/convex-provider"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"
import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ResearchAI - Transform Your Research with AI Power",
  description: "Upload your research papers and let our AI transform them into engaging presentations, podcasts, and visual content.",
  keywords: ["AI", "research", "presentations", "podcasts", "automation"],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased`}>
        <ClerkProvider>
          <ConvexProviderWrapper>
            <SchematicProviderWrapper>
              {children}
              <Toaster />
            </SchematicProviderWrapper>
          </ConvexProviderWrapper>
        </ClerkProvider>
      </body>
    </html>
  )
}

