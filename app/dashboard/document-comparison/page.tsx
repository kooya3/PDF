'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  FileText, 
  GitBranch, 
  ArrowRight, 
  Settings, 
  Upload,
  Search,
  Clock,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import DocumentComparison from '@/components/DocumentComparison';
import { Loading } from '@/components/ui/loading';
import Navbar from '@/components/navbar';

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
  wordCount: number;
}

function DocumentComparisonContent() {
  const searchParams = useSearchParams();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDoc1, setSelectedDoc1] = useState<string>('');
  const [selectedDoc2, setSelectedDoc2] = useState<string>('');
  const [showComparison, setShowComparison] = useState(false);

  // Get documents from URL params if provided
  useEffect(() => {
    const doc1 = searchParams.get('doc1');
    const doc2 = searchParams.get('doc2');
    
    if (doc1) setSelectedDoc1(doc1);
    if (doc2) setSelectedDoc2(doc2);
    
    if (doc1 && doc2) {
      setShowComparison(true);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/documents');
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();
      setDocuments(data.documents || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleStartComparison = () => {
    if (selectedDoc1 && selectedDoc2 && selectedDoc1 !== selectedDoc2) {
      setShowComparison(true);
    }
  };

  const getDocumentName = (docId: string) => {
    const doc = documents.find(d => d.id === docId);
    return doc?.name || `Document ${docId}`;
  };

  const resetComparison = () => {
    setShowComparison(false);
    setSelectedDoc1('');
    setSelectedDoc2('');
  };

  if (showComparison && selectedDoc1 && selectedDoc2) {
    return (
      <div className="min-h-screen bg-black/[0.96] antialiased bg-grid-white/[0.02] relative overflow-hidden">
        {/* Background */}
        <div className="h-full w-full absolute inset-0 z-0">
          <div className="w-full h-full opacity-20">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
          </div>
        </div>

        <div className="relative z-10">
          <Navbar />
          <div className="container mx-auto p-6">
          <div className="mb-6">
            <Button
              onClick={resetComparison}
              variant="outline"
              className="bg-gray-800/50 border-gray-600 text-white hover:bg-gray-700/50 mb-4"
            >
              ← Back to Document Selection
            </Button>
          </div>

          <DocumentComparison
            document1Id={selectedDoc1}
            document2Id={selectedDoc2}
            document1Name={getDocumentName(selectedDoc1)}
            document2Name={getDocumentName(selectedDoc2)}
          />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black/[0.96] antialiased bg-grid-white/[0.02] relative overflow-hidden">
      {/* Background */}
      <div className="h-full w-full absolute inset-0 z-0">
        <div className="w-full h-full opacity-20">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
        </div>
      </div>

      <div className="relative z-10">
        <Navbar />
        <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Document Comparison
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Compare two documents side-by-side with AI-powered analysis. 
            Identify changes, similarities, and semantic differences between document versions.
          </p>
        </div>

        {/* Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-sm glass-morphism">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-4">
                <GitBranch className="w-12 h-12 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Visual Diff</h3>
              <p className="text-gray-400 text-sm">
                Side-by-side comparison with highlighted changes, additions, and deletions
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-sm glass-morphism">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-4">
                <TrendingUp className="w-12 h-12 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Smart Analysis</h3>
              <p className="text-gray-400 text-sm">
                AI-powered semantic comparison to understand meaning changes
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-sm glass-morphism">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-4">
                <Clock className="w-12 h-12 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Change Tracking</h3>
              <p className="text-gray-400 text-sm">
                Detailed change history with significance levels and confidence scores
              </p>
            </CardContent>
          </Card>
        </div>

        {error && (
          <Alert className="bg-red-900/20 border-red-500/50">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-200">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Document Selection */}
        <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-sm glass-morphism">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Select Documents to Compare
            </CardTitle>
            <CardDescription className="text-gray-400">
              Choose two documents from your library to perform a detailed comparison
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loading />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Document Selectors */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Document 1 Selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Document 1 (Original)
                    </label>
                    <select
                      value={selectedDoc1}
                      onChange={(e) => setSelectedDoc1(e.target.value)}
                      className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select first document...</option>
                      {documents.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.name} ({doc.wordCount} words)
                        </option>
                      ))}
                    </select>
                    {selectedDoc1 && (
                      <div className="mt-2">
                        {(() => {
                          const doc = documents.find(d => d.id === selectedDoc1);
                          return doc ? (
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                              <Badge variant="outline" className="border-gray-600 text-gray-300">
                                {doc.type.toUpperCase()}
                              </Badge>
                              <span>{doc.wordCount} words</span>
                              <span>{(doc.size / 1024).toFixed(1)} KB</span>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Document 2 Selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Document 2 (Comparison)
                    </label>
                    <select
                      value={selectedDoc2}
                      onChange={(e) => setSelectedDoc2(e.target.value)}
                      className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select second document...</option>
                      {documents
                        .filter(doc => doc.id !== selectedDoc1)
                        .map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            {doc.name} ({doc.wordCount} words)
                          </option>
                        ))}
                    </select>
                    {selectedDoc2 && (
                      <div className="mt-2">
                        {(() => {
                          const doc = documents.find(d => d.id === selectedDoc2);
                          return doc ? (
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                              <Badge variant="outline" className="border-gray-600 text-gray-300">
                                {doc.type.toUpperCase()}
                              </Badge>
                              <span>{doc.wordCount} words</span>
                              <span>{(doc.size / 1024).toFixed(1)} KB</span>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Comparison Arrow */}
                {selectedDoc1 && selectedDoc2 && (
                  <div className="flex items-center justify-center py-4">
                    <div className="flex items-center gap-4 text-gray-400">
                      <span className="text-sm">{getDocumentName(selectedDoc1)}</span>
                      <ArrowRight className="w-6 h-6 text-purple-400" />
                      <span className="text-sm">{getDocumentName(selectedDoc2)}</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Settings className="w-4 h-4" />
                    <span>Advanced comparison settings available after selection</span>
                  </div>
                  
                  <Button
                    onClick={handleStartComparison}
                    disabled={!selectedDoc1 || !selectedDoc2 || selectedDoc1 === selectedDoc2}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-400"
                  >
                    Start Comparison
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>

                {selectedDoc1 === selectedDoc2 && selectedDoc1 && (
                  <Alert className="bg-yellow-900/20 border-yellow-500/50">
                    <AlertCircle className="h-4 w-4 text-yellow-400" />
                    <AlertDescription className="text-yellow-200">
                      Please select two different documents to compare.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-sm glass-morphism">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Upload className="w-8 h-8 text-blue-400" />
                <div>
                  <h3 className="text-lg font-semibold text-white">Upload New Document</h3>
                  <p className="text-gray-400 text-sm">Add a new document to compare</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full bg-gray-800/50 border-gray-600 text-white hover:bg-gray-700/50"
                onClick={() => window.location.href = '/dashboard/upload'}
              >
                Go to Upload
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-sm glass-morphism">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Search className="w-8 h-8 text-green-400" />
                <div>
                  <h3 className="text-lg font-semibold text-white">Browse Documents</h3>
                  <p className="text-gray-400 text-sm">View your document library</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full bg-gray-800/50 border-gray-600 text-white hover:bg-gray-700/50"
                onClick={() => window.location.href = '/dashboard'}
              >
                Browse Library
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Document Grid */}
        {!loading && documents.length > 0 && (
          <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-sm glass-morphism">
            <CardHeader>
              <CardTitle className="text-white">Your Documents</CardTitle>
              <CardDescription className="text-gray-400">
                {documents.length} documents available for comparison
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.slice(0, 6).map((doc) => (
                  <div
                    key={doc.id}
                    className={`p-4 border rounded-lg transition-all cursor-pointer ${
                      selectedDoc1 === doc.id || selectedDoc2 === doc.id
                        ? 'border-purple-500 bg-purple-900/20'
                        : 'border-gray-600 bg-gray-800/30 hover:border-gray-500'
                    }`}
                    onClick={() => {
                      if (!selectedDoc1) {
                        setSelectedDoc1(doc.id);
                      } else if (!selectedDoc2 && selectedDoc1 !== doc.id) {
                        setSelectedDoc2(doc.id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                      {(selectedDoc1 === doc.id || selectedDoc2 === doc.id) && (
                        <Badge className="bg-purple-600 text-white text-xs">
                          {selectedDoc1 === doc.id ? 'Doc 1' : 'Doc 2'}
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-medium text-white text-sm mb-1 line-clamp-2">
                      {doc.name}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Badge variant="outline" className="border-gray-600 text-gray-400 text-xs">
                        {doc.type.toUpperCase()}
                      </Badge>
                      <span>{doc.wordCount} words</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {documents.length > 6 && (
                <div className="mt-4 text-center">
                  <Button 
                    variant="outline"
                    className="bg-gray-800/50 border-gray-600 text-white hover:bg-gray-700/50"
                    onClick={() => window.location.href = '/dashboard'}
                  >
                    View All {documents.length} Documents
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </div>
  );
}

export default function DocumentComparisonPage() {
  return (
    <Suspense fallback={<Loading />}>
      <DocumentComparisonContent />
    </Suspense>
  );
}