"use client";

import Link from "next/link";
import { FileText, MessageCircle, Clock, Database, Upload, Sparkles, Activity, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { SparklesCore } from "@/components/sparkles";
import Navbar from "@/components/navbar";

function getStatusColor(status: string) {
  switch (status) {
    case 'completed': return 'bg-green-500/20 text-green-300 border-green-400/30';
    case 'processing': return 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30';
    case 'failed': return 'bg-red-500/20 text-red-300 border-red-400/30';
    default: return 'bg-gray-500/20 text-gray-300 border-gray-400/30';
  }
}

function getFileIcon(type: string) {
  switch (type?.toLowerCase()) {
    case 'pdf': return '📄';
    case 'docx': case 'doc': return '📝';
    case 'xlsx': case 'xls': return '📊';
    case 'csv': return '📋';
    case 'txt': return '📄';
    case 'md': return '📄';
    case 'html': return '🌐';
    case 'json': return '🔧';
    default: return '📎';
  }
}

interface DashboardClientProps {
  documents: any[];
  isAuthenticated: boolean;
}

export default function DashboardClient({ documents, isAuthenticated }: DashboardClientProps) {
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-black/[0.96] antialiased bg-grid-white/[0.02] relative overflow-hidden">
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
        <div className="relative z-10">
          <Navbar />
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-white mb-4">Access Denied</h1>
              <p className="text-gray-300 mb-6">Please sign in to access your dashboard</p>
              <Link href="/" className="text-purple-400 hover:text-purple-300 transition-colors">
                Return to Home
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black/[0.96] antialiased bg-grid-white/[0.02] relative overflow-hidden">
      {/* Ambient background with moving particles */}
      <div className="h-full w-full absolute inset-0 z-0">
        <SparklesCore
          id="dashboard-sparkles"
          background="transparent"
          minSize={0.4}
          maxSize={1.0}
          particleDensity={50}
          className="w-full h-full"
          particleColor="#FFFFFF"
        />
      </div>

      {/* Gradient overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-pink-900/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

      <div className="relative z-10">
        <Navbar />
        
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12 text-center"
          >
            <div className="mb-6">
              <span className="inline-flex items-center px-4 py-2 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-sm font-medium mb-6">
                <Activity className="w-4 h-4 mr-2" />
                AI-Powered Document Management
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Your Research
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600">
                Dashboard
              </span>
            </h1>
            <p className="text-gray-300 text-xl max-w-2xl mx-auto">
              Manage your documents and chat with them using advanced local AI
            </p>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12"
          >
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 group">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-3xl font-bold text-white">{documents.length}</p>
                  <p className="text-gray-300">Documents</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 group">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageCircle className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-3xl font-bold text-white">
                    {documents.reduce((sum, doc) => sum + (doc.messageCount || 0), 0)}
                  </p>
                  <p className="text-gray-300">Total Messages</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 group">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Database className="h-6 w-6 text-purple-400" />
                </div>
                <div className="ml-4">
                  <p className="text-3xl font-bold text-white">
                    {documents.filter(doc => doc.status === 'completed').length}
                  </p>
                  <p className="text-gray-300">Processed</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 group">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock className="h-6 w-6 text-orange-400" />
                </div>
                <div className="ml-4">
                  <p className="text-3xl font-bold text-white">
                    {documents.filter(doc => doc.status === 'processing').length}
                  </p>
                  <p className="text-gray-300">Processing</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
          >
            <Link href="/dashboard/upload">
              <motion.div 
                whileHover={{ scale: 1.02, y: -5 }}
                className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-400/30 p-8 rounded-2xl transition-all duration-300 cursor-pointer hover:border-purple-400/50 group"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-white text-lg mb-2">Upload Document</h3>
                  <p className="text-purple-200 text-sm">Add a new document to chat with</p>
                </div>
              </motion.div>
            </Link>
            
            <motion.div 
              whileHover={{ scale: 1.02, y: -5 }}
              className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm border border-green-400/30 p-8 rounded-2xl transition-all duration-300 cursor-pointer hover:border-green-400/50 group"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Activity className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="font-semibold text-white text-lg mb-2">System Status</h3>
                <p className="text-green-200 text-sm">Check AI system health</p>
              </div>
            </motion.div>
            
            <motion.div 
              whileHover={{ scale: 1.02, y: -5 }}
              className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 backdrop-blur-sm border border-pink-400/30 p-8 rounded-2xl transition-all duration-300 cursor-pointer hover:border-pink-400/50 group"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-pink-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-8 h-8 text-pink-400" />
                </div>
                <h3 className="font-semibold text-white text-lg mb-2">Analytics</h3>
                <p className="text-pink-200 text-sm">View usage statistics</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Documents List */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl overflow-hidden"
          >
            <div className="px-8 py-6 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
              <h2 className="text-2xl font-semibold text-white flex items-center">
                <FileText className="mr-3 h-6 w-6 text-purple-400" />
                Your Documents
              </h2>
            </div>
            
            {documents.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-12 h-12 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">No documents yet</h3>
                <p className="text-gray-300 mb-8 max-w-md mx-auto">Upload your first document to start chatting with AI about your research</p>
                <Link href="/dashboard/upload">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 rounded-xl font-medium shadow-lg shadow-purple-500/25 transition-all duration-300"
                  >
                    <Upload className="mr-2 h-5 w-5 inline" />
                    Upload Document
                  </motion.button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {documents.map((doc: any, index: number) => (
                  <motion.div 
                    key={doc.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="px-8 py-6 hover:bg-white/5 transition-all duration-300 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-3xl group-hover:scale-110 transition-transform">{getFileIcon(doc.type)}</div>
                        <div>
                          <h3 className="font-semibold text-white text-lg group-hover:text-purple-300 transition-colors">{doc.name}</h3>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                            <span className="bg-white/10 px-2 py-1 rounded-lg">{doc.type?.toUpperCase()}</span>
                            <span>{Math.round(doc.size / 1024)} KB</span>
                            {doc.wordCount && <span>{doc.wordCount.toLocaleString()} words</span>}
                            {doc.messageCount > 0 && <span>{doc.messageCount} messages</span>}
                            <span>{new Date(doc.createdAt?.toDate?.() || doc.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <span className={`px-3 py-1 rounded-xl text-sm font-medium border ${getStatusColor(doc.status)}`}>
                          {doc.status}
                        </span>
                        
                        {doc.status === 'completed' ? (
                          <Link href={`/dashboard/files/${doc.id}`}>
                            <motion.button 
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-2 rounded-xl text-sm font-medium transition-all duration-300 shadow-lg shadow-purple-500/25"
                            >
                              <MessageCircle className="mr-2 h-4 w-4 inline" />
                              Chat
                            </motion.button>
                          </Link>
                        ) : doc.status === 'processing' ? (
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-400"></div>
                            <span className="text-sm text-purple-300">Processing...</span>
                          </div>
                        ) : (
                          <span className="text-sm text-red-400">Failed</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* System Info */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-12 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 backdrop-blur-sm border border-purple-400/20 rounded-2xl p-8"
          >
            <h3 className="font-semibold text-white text-xl mb-6 flex items-center">
              <Sparkles className="mr-3 h-6 w-6 text-purple-400" />
              System Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-6 h-6 text-purple-400" />
                </div>
                <h4 className="font-medium text-white mb-2">AI Processing</h4>
                <p className="text-purple-200 text-sm mb-1">Ollama with tinyllama model</p>
                <p className="text-gray-400 text-xs">Local, private, and free</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Database className="w-6 h-6 text-green-400" />
                </div>
                <h4 className="font-medium text-white mb-2">Vector Storage</h4>
                <p className="text-green-200 text-sm mb-1">ChromaDB local instance</p>
                <p className="text-gray-400 text-xs">Fast document search</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-pink-400" />
                </div>
                <h4 className="font-medium text-white mb-2">Supported Formats</h4>
                <p className="text-pink-200 text-sm mb-1">PDF, DOCX, TXT, MD, CSV, XLSX</p>
                <p className="text-gray-400 text-xs">More formats coming soon</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}