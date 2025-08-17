'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Search, FileText, BarChart3, Network, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DocumentReference {
  documentId: string;
  documentName: string;
  chunkIndex: number;
  content: string;
  relevanceScore: number;
}

interface CrossDocumentSearchResult {
  query: string;
  totalResults: number;
  documentsSearched: number;
  results: DocumentReference[];
  processingTime: number;
}

interface DocumentComparison {
  document1: { id: string; name: string };
  document2: { id: string; name: string };
  similarity: number;
  commonThemes: string[];
  uniqueToDoc1: string[];
  uniqueToDoc2: string[];
  keyDifferences: string[];
}

interface DocumentRelationship {
  sourceDocId: string;
  targetDocId: string;
  relationshipType: 'similar' | 'references' | 'contradicts' | 'supplements';
  strength: number;
  evidence: string[];
}

interface CrossDocumentStats {
  totalDocuments: number;
  processedDocuments: number;
  totalRelationships: number;
  averageSimilarity: number;
  topThemes: string[];
}

interface Props {
  userId: string;
  documents: Array<{
    id: string;
    name: string;
    status: string;
    wordCount?: number;
  }>;
}

export default function CrossDocumentAnalysis({ userId, documents }: Props) {
  const [activeTab, setActiveTab] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CrossDocumentSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Comparison state
  const [doc1Id, setDoc1Id] = useState('');
  const [doc2Id, setDoc2Id] = useState('');
  const [comparison, setComparison] = useState<DocumentComparison | null>(null);

  // Relationships state
  const [relationships, setRelationships] = useState<DocumentRelationship[]>([]);
  const [stats, setStats] = useState<CrossDocumentStats | null>(null);

  const availableDocuments = documents.filter(doc => doc.status === 'completed');

  useEffect(() => {
    if (activeTab === 'relationships') {
      loadRelationships();
    }
    if (activeTab === 'analytics') {
      loadStats();
    }
  }, [activeTab]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/cross-document/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          limit: 20,
          minRelevanceScore: 0.3
        })
      });

      const data = await response.json();

      if (data.success) {
        setSearchResults(data.data);
      } else {
        setError(data.error || 'Search failed');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!doc1Id || !doc2Id || doc1Id === doc2Id) {
      setError('Please select two different documents to compare');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/cross-document/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc1Id, doc2Id })
      });

      const data = await response.json();

      if (data.success) {
        setComparison(data.data);
      } else {
        setError(data.error || 'Comparison failed');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadRelationships = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/cross-document/relationships');
      const data = await response.json();

      if (data.success) {
        setRelationships(data.data.relationships);
      }
    } catch (err) {
      console.error('Failed to load relationships:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/cross-document/stats');
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const getRelationshipColor = (type: string) => {
    const colors = {
      similar: 'bg-blue-100 text-blue-800',
      references: 'bg-green-100 text-green-800',
      contradicts: 'bg-red-100 text-red-800',
      supplements: 'bg-purple-100 text-purple-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {availableDocuments.length < 2 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You need at least 2 processed documents to use cross-document analysis features.
            Current processed documents: {availableDocuments.length}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search
          </TabsTrigger>
          <TabsTrigger value="compare" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Compare
          </TabsTrigger>
          <TabsTrigger value="relationships" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            Relationships
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cross-Document Search</CardTitle>
              <CardDescription>
                Search for similar content across all your documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search across all documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSearch} 
                  disabled={loading || !searchQuery.trim()}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {searchResults && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      Found {searchResults.totalResults} results across {searchResults.documentsSearched} documents
                    </span>
                    <span>
                      Processed in {searchResults.processingTime}ms
                    </span>
                  </div>

                  <div className="space-y-3">
                    {searchResults.results.map((result, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{result.documentName}</Badge>
                            <Badge variant="outline">
                              Score: {(result.relevanceScore * 100).toFixed(1)}%
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-3">
                          {result.content}
                        </p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compare" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Comparison</CardTitle>
              <CardDescription>
                Compare two documents to find similarities and differences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Document 1</label>
                  <select
                    value={doc1Id}
                    onChange={(e) => setDoc1Id(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select first document...</option>
                    {availableDocuments.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Document 2</label>
                  <select
                    value={doc2Id}
                    onChange={(e) => setDoc2Id(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select second document...</option>
                    {availableDocuments
                      .filter((doc) => doc.id !== doc1Id)
                      .map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <Button 
                onClick={handleCompare} 
                disabled={loading || !doc1Id || !doc2Id}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Comparing...
                  </>
                ) : (
                  'Compare Documents'
                )}
              </Button>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {comparison && (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {(comparison.similarity * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Similarity Score</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="p-4">
                      <h4 className="font-semibold mb-2 text-green-700">Common Themes</h4>
                      <div className="space-y-1">
                        {comparison.commonThemes.map((theme, index) => (
                          <Badge key={index} variant="secondary" className="mr-1 mb-1">
                            {theme}
                          </Badge>
                        ))}
                      </div>
                    </Card>

                    <Card className="p-4">
                      <h4 className="font-semibold mb-2 text-red-700">Key Differences</h4>
                      <ul className="text-sm space-y-1">
                        {comparison.keyDifferences.map((diff, index) => (
                          <li key={index} className="flex items-start">
                            <span className="w-2 h-2 bg-red-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                            {diff}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="p-4">
                      <h4 className="font-semibold mb-2">Unique to {comparison.document1.name}</h4>
                      <ul className="text-sm space-y-1">
                        {comparison.uniqueToDoc1.map((item, index) => (
                          <li key={index} className="flex items-start">
                            <span className="w-2 h-2 bg-blue-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </Card>

                    <Card className="p-4">
                      <h4 className="font-semibold mb-2">Unique to {comparison.document2.name}</h4>
                      <ul className="text-sm space-y-1">
                        {comparison.uniqueToDoc2.map((item, index) => (
                          <li key={index} className="flex items-start">
                            <span className="w-2 h-2 bg-purple-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relationships" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Relationships</CardTitle>
              <CardDescription>
                Discover how your documents relate to each other
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Analyzing relationships...</span>
                </div>
              ) : relationships.length > 0 ? (
                <div className="space-y-3">
                  {relationships.map((rel, index) => {
                    const sourceDoc = availableDocuments.find(d => d.id === rel.sourceDocId);
                    const targetDoc = availableDocuments.find(d => d.id === rel.targetDocId);
                    
                    return (
                      <Card key={index} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge className={getRelationshipColor(rel.relationshipType)}>
                              {rel.relationshipType}
                            </Badge>
                            <Badge variant="outline">
                              {(rel.strength * 100).toFixed(1)}% strength
                            </Badge>
                          </div>
                        </div>
                        <div className="text-sm mb-2">
                          <strong>{sourceDoc?.name}</strong> → <strong>{targetDoc?.name}</strong>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Evidence: {rel.evidence.join(', ')}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No significant relationships found between your documents.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-2xl font-bold">{stats?.totalDocuments || 0}</div>
              <div className="text-sm text-muted-foreground">Total Documents</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold">{stats?.processedDocuments || 0}</div>
              <div className="text-sm text-muted-foreground">Processed</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold">{stats?.totalRelationships || 0}</div>
              <div className="text-sm text-muted-foreground">Relationships</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold">
                {stats?.averageSimilarity ? (stats.averageSimilarity * 100).toFixed(1) + '%' : '0%'}
              </div>
              <div className="text-sm text-muted-foreground">Avg Similarity</div>
            </Card>
          </div>

          {stats?.topThemes && stats.topThemes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Themes Across Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {stats.topThemes.map((theme, index) => (
                    <Badge key={index} variant="secondary">
                      {theme}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}