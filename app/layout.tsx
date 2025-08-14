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
  title: "AI Document Intelligence - Local AI Processing with Premium Voice",
  description: "Upload any document and have intelligent conversations powered by local AI processing. Complete privacy, premium voice synthesis, and universal document support.",
  keywords: ["AI", "document processing", "text-to-speech", "local AI", "document intelligence", "privacy", "ElevenLabs", "OCR", "conversation AI"],
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

