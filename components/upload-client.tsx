"use client";

import { motion } from "framer-motion";
import { SparklesCore } from "@/components/sparkles";
import Navbar from "@/components/navbar";
import EnhancedFileUploader from "@/components/EnhancedFileUploader";
import { Upload, Activity, Database, FileText, Terminal, Server, Sparkles } from "lucide-react";

export default function UploadClient() {
  return (
    <main className="min-h-screen bg-black/[0.96] antialiased bg-grid-white/[0.02] relative overflow-hidden">
      {/* Ambient background with moving particles */}
      <div className="h-full w-full absolute inset-0 z-0">
        <SparklesCore
          id="upload-sparkles"
          background="transparent"
          minSize={0.4}
          maxSize={1.0}
          particleDensity={40}
          className="w-full h-full"
          particleColor="#FFFFFF"
        />
      </div>

      {/* Gradient overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-pink-900/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

      <div className="relative z-10">
        <Navbar />
        
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12 text-center"
          >
            <div className="mb-6">
              <span className="inline-flex items-center px-4 py-2 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-sm font-medium mb-6">
                <Upload className="w-4 h-4 mr-2" />
                AI-Powered Document Processing
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Upload Your
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600">
                Document
              </span>
            </h1>
            <p className="text-gray-300 text-xl max-w-3xl mx-auto leading-relaxed">
              Upload your documents to start chatting with them using advanced local AI. 
              We support PDF, Word, Excel, text files, and more.
            </p>
          </motion.div>

          {/* Main Upload Area */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl overflow-hidden mb-12"
          >
            <div className="px-8 py-6 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
              <h2 className="text-2xl font-semibold text-white flex items-center">
                <FileText className="mr-3 h-6 w-6 text-purple-400" />
                Document Upload Center
              </h2>
              <p className="text-gray-300 mt-2">
                Drop your files here or click to browse. Processing happens locally with complete privacy.
              </p>
            </div>
            
            <div className="p-8">
              <EnhancedFileUploader />
            </div>
          </motion.div>
          
          {/* System Setup Guide */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-sm border border-blue-400/20 rounded-2xl p-8 mb-12"
          >
            <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
              <Sparkles className="mr-3 h-6 w-6 text-blue-400" />
              Getting Started Guide
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* System Requirements */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mr-4">
                    <Server className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">System Requirements</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center text-blue-200">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                    <span>Ollama server running locally</span>
                  </div>
                  <div className="flex items-center text-blue-200">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                    <span>ChromaDB for document storage</span>
                  </div>
                  <div className="flex items-center text-blue-200">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                    <span>llama3.2 model downloaded</span>
                  </div>
                </div>
              </div>

              {/* Setup Commands */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mr-4">
                    <Terminal className="w-6 h-6 text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Setup Commands</h3>
                </div>
                <div className="bg-black/40 rounded-lg p-4 font-mono text-sm space-y-2">
                  <div className="text-green-400">
                    <span className="text-gray-500">$</span> ollama serve
                  </div>
                  <div className="text-green-400">
                    <span className="text-gray-500">$</span> ollama pull llama3.2
                  </div>
                  <div className="text-green-400">
                    <span className="text-gray-500">$</span> chroma run --host localhost --port 8000
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Feature Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <motion.div 
              whileHover={{ scale: 1.02, y: -5 }}
              className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-400/30 p-8 rounded-2xl transition-all duration-300 group"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Activity className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="font-semibold text-white text-lg mb-2">Local Processing</h3>
                <p className="text-purple-200 text-sm leading-relaxed">
                  All processing happens on your machine. Your documents never leave your computer, ensuring complete privacy.
                </p>
              </div>
            </motion.div>
            
            <motion.div 
              whileHover={{ scale: 1.02, y: -5 }}
              className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm border border-green-400/30 p-8 rounded-2xl transition-all duration-300 group"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Database className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="font-semibold text-white text-lg mb-2">Vector Search</h3>
                <p className="text-green-200 text-sm leading-relaxed">
                  Advanced ChromaDB integration for lightning-fast semantic search through your documents.
                </p>
              </div>
            </motion.div>
            
            <motion.div 
              whileHover={{ scale: 1.02, y: -5 }}
              className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm border border-blue-400/30 p-8 rounded-2xl transition-all duration-300 group"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <FileText className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="font-semibold text-white text-lg mb-2">Multi-Format Support</h3>
                <p className="text-blue-200 text-sm leading-relaxed">
                  Support for PDF, DOCX, TXT, MD, CSV, XLSX, and more document formats with intelligent parsing.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}