"use client"

import { Button } from "@/components/ui/button"
import { Bot, Menu } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { ClerkLoaded, SignedIn, SignInButton, UserButton, useUser } from "@clerk/nextjs"
import type React from "react"

export default function Navbar() {
  const { user } = useUser()

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="flex items-center justify-between px-6 py-5 backdrop-blur-lg bg-black/20 border-b border-white/10 sticky top-0 z-50"
    >
      <Link href="/" className="flex items-center space-x-3 group">
        <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-400/30 group-hover:border-purple-400/50 transition-all duration-300">
          <Bot className="w-6 h-6 text-purple-400 group-hover:text-purple-300 transition-colors" />
        </div>
        <span className="text-white font-bold text-xl bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">DocuMind AI</span>
      </Link>

      <div className="hidden lg:flex items-center space-x-6">
        <NavLink href="/features">Features</NavLink>
        <NavLink href="/how-it-works">How it Works</NavLink>
        <NavLink href="/web-scraping">Web Scraping</NavLink>
      </div>

      {/* User area */}
      <ClerkLoaded>
        <div className="flex items-center space-x-3">
          <SignedIn>
            <div className="hidden lg:flex items-center space-x-3">
              <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors text-sm">
                Dashboard
              </Link>
              <Link href="/dashboard/knowledge-bases" className="text-gray-300 hover:text-white transition-colors text-sm">
                Knowledge Bases
              </Link>
              <Link href="/dashboard/cross-document" className="text-gray-300 hover:text-white transition-colors text-sm">
                Cross-Document
              </Link>
              <Link href="/dashboard/document-comparison" className="text-gray-300 hover:text-white transition-colors text-sm">
                Compare
              </Link>
              <Link href="/dashboard/workspaces" className="text-gray-300 hover:text-white transition-colors text-sm">
                Workspaces
              </Link>
            </div>
            <div className="flex items-center space-x-2">
              <UserButton afterSignOutUrl="/" />
              <div className="hidden sm:block text-xs">
                <p className="text-gray-400">Welcome Back</p>
                <p className="font-bold text-white">{user?.fullName}</p>
              </div>
            </div>
          </SignedIn>

          {!user && (
            <SignInButton mode="modal">
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-2 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300 hover:scale-105">
                Sign In
              </Button>
            </SignInButton>
          )}
        </div>
      </ClerkLoaded>

      {/* Mobile menu button */}
      <Button variant="ghost" size="icon" className="md:hidden text-white">
        <Menu className="w-6 h-6" />
      </Button>
    </motion.nav>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-gray-300 hover:text-white transition-colors relative group">
      {children}
      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-purple-500 transition-all group-hover:w-full" />
    </Link>
  )
}

