'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  FileText, 
  Table, 
  Settings, 
  Download, 
  Eye, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Grid3X3,
  FileImage,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AdvancedOCRResult {
  success: boolean;
  result: {
    text: string;
    confidence: number;
    wordCount: number;
    processingTime: number;
    languages: string[];
  };
  advanced: {
    tablesFound: number;
    hasStructuredData: boolean;
    layout: {
      textBlocks: number;
      tables: number;
      images: number;
      headers: number;
      footers: number;
    } | null;
  };
  structuredData?: {
    tables: any[];
    metadata: {
      hasTabularData: boolean;
      tableCount: number;
      totalCells: number;
    };
  };
  tables?: Array<{
    id: string;
    dimensions: string;
    confidence: number;
    csvData: string;
    jsonData: any[][];
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
}

interface OCROptions {
  extractTables: boolean;
  analyzeLayout: boolean;
  detectCharts: boolean;
  outputFormat: 'text' | 'structured' | 'both';
  tableDetectionThreshold: number;
  minimumTableSize: { rows: number; columns: number };
  language: string;
  enhanceImage: boolean;
  dpi: number;
}

export default function AdvancedOCRInterface() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<AdvancedOCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<OCROptions>({
    extractTables: true,
    analyzeLayout: true,
    detectCharts: false,
    outputFormat: 'both',
    tableDetectionThreshold: 0.7,
    minimumTableSize: { rows: 2, columns: 2 },
    language: 'eng',
    enhanceImage: true,
    dpi: 300
  });
  const [activeTab, setActiveTab] = useState('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      setError(null);
      setResult(null);
      setActiveTab('options');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.tiff', '.bmp', '.webp'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 25 * 1024 * 1024 // 25MB
  });

  const processDocument = async () => {
    if (!file) return;

    setProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('options', JSON.stringify(options));

      const response = await fetch('/api/ocr/advanced', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Processing failed');
      }

      const resultData: AdvancedOCRResult = await response.json();
      setResult(resultData);
      setActiveTab('results');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const downloadCSV = (tableData: string, tableId: string) => {
    const blob = new Blob([tableData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `table_${tableId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadJSON = (jsonData: any[][], tableId: string) => {
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `table_${tableId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-black/[0.96] antialiased bg-grid-white/[0.02] relative overflow-hidden">
      {/* Background */}
      <div className="h-full w-full absolute inset-0 z-0">
        <div className="w-full h-full opacity-20">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
        </div>
      </div>

      <div className="relative z-10 container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 text-white">Advanced OCR with Table Extraction</h1>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Extract text, tables, and structured data from images and PDFs using advanced OCR technology
          </p>
        </div>

        {/* Main Interface */}
        <Card className="max-w-6xl mx-auto bg-gray-900/40 border-gray-700 backdrop-blur-sm glass-morphism">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 bg-gray-900/50 border-gray-700">
              <TabsTrigger value="upload" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-300">
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="options" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-300" disabled={!file}>
                <Settings className="w-4 h-4 mr-2" />
                Options
              </TabsTrigger>
              <TabsTrigger value="process" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-300" disabled={!file}>
                <FileText className="w-4 h-4 mr-2" />
                Process
              </TabsTrigger>
              <TabsTrigger value="results" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-300" disabled={!result}>
                <Eye className="w-4 h-4 mr-2" />
                Results
              </TabsTrigger>
            </TabsList>

            {/* Upload Tab */}
            <TabsContent value="upload" className="mt-6">
              <CardContent>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
                    isDragActive 
                      ? 'border-purple-500 bg-purple-500/10' 
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <input {...getInputProps()} ref={fileInputRef} />
                  <FileImage className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-semibold mb-2 text-white">
                    {isDragActive ? 'Drop your file here' : 'Drag & drop or click to select'}
                  </h3>
                  <p className="text-gray-400 mb-4">
                    Supports images (JPEG, PNG, TIFF, BMP, WebP) and PDF files up to 25MB
                  </p>
                  <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                    Choose File
                  </Button>
                </div>

                {file && (
                  <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-white">{file.name}</h4>
                        <p className="text-sm text-gray-400">
                          {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type}
                        </p>
                      </div>
                      <Button 
                        onClick={() => setActiveTab('options')}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        Configure Options
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </TabsContent>

            {/* Options Tab */}
            <TabsContent value="options" className="mt-6">
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Processing Options */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Processing Options</h3>
                    
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={options.extractTables}
                          onChange={(e) => setOptions(prev => ({ ...prev, extractTables: e.target.checked }))}
                          className="rounded border-gray-600"
                        />
                        <span className="text-gray-300">Extract Tables</span>
                      </label>

                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={options.analyzeLayout}
                          onChange={(e) => setOptions(prev => ({ ...prev, analyzeLayout: e.target.checked }))}
                          className="rounded border-gray-600"
                        />
                        <span className="text-gray-300">Analyze Layout</span>
                      </label>

                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={options.detectCharts}
                          onChange={(e) => setOptions(prev => ({ ...prev, detectCharts: e.target.checked }))}
                          className="rounded border-gray-600"
                        />
                        <span className="text-gray-300">Detect Charts</span>
                      </label>

                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={options.enhanceImage}
                          onChange={(e) => setOptions(prev => ({ ...prev, enhanceImage: e.target.checked }))}
                          className="rounded border-gray-600"
                        />
                        <span className="text-gray-300">Enhance Image Quality</span>
                      </label>
                    </div>
                  </div>

                  {/* Advanced Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Advanced Settings</h3>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Language</label>
                        <select
                          value={options.language}
                          onChange={(e) => setOptions(prev => ({ ...prev, language: e.target.value }))}
                          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                        >
                          <option value="eng">English</option>
                          <option value="spa">Spanish</option>
                          <option value="fra">French</option>
                          <option value="deu">German</option>
                          <option value="ita">Italian</option>
                          <option value="por">Portuguese</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Output Format</label>
                        <select
                          value={options.outputFormat}
                          onChange={(e) => setOptions(prev => ({ ...prev, outputFormat: e.target.value as any }))}
                          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                        >
                          <option value="text">Text Only</option>
                          <option value="structured">Structured Data Only</option>
                          <option value="both">Text + Structured Data</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm text-gray-300 mb-1">
                          Table Detection Threshold: {options.tableDetectionThreshold}
                        </label>
                        <input
                          type="range"
                          min="0.1"
                          max="1"
                          step="0.1"
                          value={options.tableDetectionThreshold}
                          onChange={(e) => setOptions(prev => ({ ...prev, tableDetectionThreshold: parseFloat(e.target.value) }))}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={() => setActiveTab('process')}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Start Processing
                  </Button>
                </div>
              </CardContent>
            </TabsContent>

            {/* Process Tab */}
            <TabsContent value="process" className="mt-6">
              <CardContent className="text-center py-12">
                {!processing && !result && (
                  <div className="space-y-6">
                    <Grid3X3 className="w-24 h-24 mx-auto text-purple-400" />
                    <div>
                      <h3 className="text-2xl font-semibold mb-2 text-white">Ready to Process</h3>
                      <p className="text-gray-400 mb-6">
                        Click the button below to start advanced OCR processing with table extraction
                      </p>
                      <Button 
                        onClick={processDocument}
                        size="lg"
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <FileText className="w-5 h-5 mr-2" />
                        Process Document
                      </Button>
                    </div>
                  </div>
                )}

                {processing && (
                  <div className="space-y-6">
                    <Loader2 className="w-24 h-24 mx-auto text-purple-400 animate-spin" />
                    <div>
                      <h3 className="text-2xl font-semibold mb-2 text-white">Processing Document</h3>
                      <p className="text-gray-400">
                        Extracting text, analyzing layout, and detecting tables...
                      </p>
                    </div>
                  </div>
                )}

                {error && (
                  <Alert className="bg-red-900/20 border-red-500/50 max-w-md mx-auto">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <AlertDescription className="text-red-200">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </TabsContent>

            {/* Results Tab */}
            <TabsContent value="results" className="mt-6">
              {result && (
                <CardContent className="space-y-6">
                  {/* Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="p-4 bg-gray-800/50 border-gray-700">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-8 w-8 text-green-400" />
                        <div>
                          <div className="text-2xl font-bold text-white">{result.result.confidence.toFixed(1)}%</div>
                          <div className="text-sm text-gray-400">Confidence</div>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4 bg-gray-800/50 border-gray-700">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-blue-400" />
                        <div>
                          <div className="text-2xl font-bold text-white">{result.result.wordCount}</div>
                          <div className="text-sm text-gray-400">Words</div>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4 bg-gray-800/50 border-gray-700">
                      <div className="flex items-center gap-3">
                        <Table className="h-8 w-8 text-purple-400" />
                        <div>
                          <div className="text-2xl font-bold text-white">{result.advanced.tablesFound}</div>
                          <div className="text-sm text-gray-400">Tables Found</div>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4 bg-gray-800/50 border-gray-700">
                      <div className="flex items-center gap-3">
                        <BarChart3 className="h-8 w-8 text-orange-400" />
                        <div>
                          <div className="text-2xl font-bold text-white">{(result.result.processingTime / 1000).toFixed(1)}s</div>
                          <div className="text-sm text-gray-400">Processing Time</div>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Results Tabs */}
                  <Tabs defaultValue="text" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-gray-900/50 border-gray-700">
                      <TabsTrigger value="text" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-300">
                        Extracted Text
                      </TabsTrigger>
                      <TabsTrigger value="tables" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-300">
                        Tables ({result.advanced.tablesFound})
                      </TabsTrigger>
                      <TabsTrigger value="layout" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-300">
                        Layout Analysis
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="text" className="mt-4">
                      <Card className="bg-gray-800/50 border-gray-700">
                        <CardHeader>
                          <CardTitle className="text-white">Extracted Text</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-gray-900/50 p-4 rounded-lg max-h-96 overflow-y-auto">
                            <pre className="text-gray-300 whitespace-pre-wrap text-sm">
                              {result.result.text}
                            </pre>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="tables" className="mt-4">
                      {result.tables && result.tables.length > 0 ? (
                        <div className="space-y-4">
                          {result.tables.map((table, index) => (
                            <Card key={table.id} className="bg-gray-800/50 border-gray-700">
                              <CardHeader>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <CardTitle className="text-white">Table {index + 1}</CardTitle>
                                    <CardDescription className="text-gray-400">
                                      {table.dimensions} • {table.confidence.toFixed(1)}% confidence
                                    </CardDescription>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => downloadCSV(table.csvData, table.id)}
                                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                                    >
                                      <Download className="w-4 h-4 mr-1" />
                                      CSV
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => downloadJSON(table.jsonData, table.id)}
                                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                                    >
                                      <Download className="w-4 h-4 mr-1" />
                                      JSON
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="bg-gray-900/50 p-4 rounded-lg overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <tbody>
                                      {table.jsonData.map((row, rowIndex) => (
                                        <tr key={rowIndex} className="border-b border-gray-700">
                                          {row.map((cell, cellIndex) => (
                                            <td key={cellIndex} className="p-2 text-gray-300 border-r border-gray-700">
                                              {cell}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <Card className="bg-gray-800/50 border-gray-700">
                          <CardContent className="text-center py-8">
                            <Table className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                            <p className="text-gray-400">No tables detected in this document</p>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>

                    <TabsContent value="layout" className="mt-4">
                      <Card className="bg-gray-800/50 border-gray-700">
                        <CardHeader>
                          <CardTitle className="text-white">Document Layout Analysis</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {result.advanced.layout ? (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-white">{result.advanced.layout.textBlocks}</div>
                                <div className="text-sm text-gray-400">Text Blocks</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-white">{result.advanced.layout.tables}</div>
                                <div className="text-sm text-gray-400">Tables</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-white">{result.advanced.layout.images}</div>
                                <div className="text-sm text-gray-400">Images</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-white">{result.advanced.layout.headers}</div>
                                <div className="text-sm text-gray-400">Headers</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-white">{result.advanced.layout.footers}</div>
                                <div className="text-sm text-gray-400">Footers</div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-400 text-center">Layout analysis not performed</p>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}