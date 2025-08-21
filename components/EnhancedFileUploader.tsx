"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  CheckCircleIcon,
  CircleArrowDown,
  FileText,
  RocketIcon,
  SaveIcon,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "./ui/use-toast";
import { DocumentType } from "@/lib/document-parser-client";

interface UploadStatus {
  progress: number | null;
  status: StatusText | null;
  fileId: string | null;
  jobId: string | null;
  currentStep: string | null;
  error: string | null;
  estimatedTimeRemaining: number | null;
}

enum StatusText {
  UPLOADING = "Uploading...",
  QUEUED = "Queued for processing...",
  PARSING = "Parsing document...",
  PROCESSING = "Processing content...",
  GENERATING = "Generating embeddings...",
  STORING = "Storing in database...",
  INDEXING = "Creating search indices...",
  COMPLETED = "Upload complete!",
  ERROR = "Upload failed",
}

const SUPPORTED_FORMATS = [
  { ext: "pdf", type: DocumentType.PDF, icon: "📄", desc: "PDF Documents" },
  { ext: "docx", type: DocumentType.DOCX, icon: "📝", desc: "Word Documents" },
  { ext: "txt", type: DocumentType.TXT, icon: "📄", desc: "Text Files" },
  { ext: "md", type: DocumentType.MD, icon: "📋", desc: "Markdown Files" },
  { ext: "csv", type: DocumentType.CSV, icon: "📊", desc: "CSV Files" },
  { ext: "xlsx", type: DocumentType.XLSX, icon: "📈", desc: "Excel Files" },
  { ext: "html", type: DocumentType.HTML, icon: "🌐", desc: "HTML Files" },
  { ext: "json", type: DocumentType.JSON, icon: "🔧", desc: "JSON Files" },
];

export default function EnhancedFileUploader() {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    progress: null,
    status: null,
    fileId: null,
    jobId: null,
    currentStep: null,
    error: null,
    estimatedTimeRemaining: null,
  });
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [checkingSystem, setCheckingSystem] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // Check system status on mount
  useEffect(() => {
    checkSystemStatus();
  }, []);

  // Redirect when upload completes successfully
  useEffect(() => {
    if (uploadStatus.fileId && uploadStatus.status === StatusText.COMPLETED) {
      setTimeout(() => {
        router.push(`/dashboard/files/${uploadStatus.fileId}`);
      }, 1500);
    }
  }, [uploadStatus.fileId, uploadStatus.status, router]);

  const checkSystemStatus = async () => {
    setCheckingSystem(true);
    try {
      const response = await fetch('/api/system-status');
      const status = await response.json();
      setSystemStatus(status);
      
      if (status.overall !== 'healthy') {
        toast({
          variant: "destructive",
          title: "System Not Ready",
          description: "Some services are not available. Check the status panel below.",
        });
      }
    } catch (error) {
      console.error('Failed to check system status:', error);
      toast({
        variant: "destructive",
        title: "System Check Failed",
        description: "Unable to verify system status.",
      });
    } finally {
      setCheckingSystem(false);
    }
  };

  // Real-time status polling
  const pollJobStatus = useCallback(async (docId: string) => {
    try {
      const response = await fetch(`/api/job-status?docId=${docId}`);
      if (!response.ok) return;

      const data = await response.json();
      if (!data.success || !data.document) return;

      const { document } = data;
      
      // Map document status to UI status
      const statusMap: Record<string, StatusText> = {
        'uploading': StatusText.UPLOADING,
        'parsing': StatusText.PARSING,
        'processing': StatusText.PROCESSING,
        'generating': StatusText.GENERATING,
        'completed': StatusText.COMPLETED,
        'failed': StatusText.ERROR
      };

      const uiStatus = statusMap[document.status] || StatusText.PROCESSING;

      setUploadStatus(prev => ({
        ...prev,
        progress: document.progress,
        status: uiStatus,
        currentStep: document.status === 'processing' ? 'Processing content...' : 
                     document.status === 'generating' ? 'Generating AI embeddings...' :
                     document.status === 'parsing' ? 'Extracting text content...' : null,
        error: document.error || null
      }));

      // Continue polling if not completed or failed
      if (document.status !== 'completed' && document.status !== 'failed') {
        setTimeout(() => pollJobStatus(docId), 1500); // Poll every 1.5 seconds
      } else if (document.status === 'completed') {
        // Show completion message
        toast({
          title: "Processing Complete!",
          description: `${document.name} has been processed successfully. ${document.wordCount || 0} words, ${document.chunkCount || 0} chunks.`,
        });
      } else if (document.status === 'failed') {
        toast({
          variant: "destructive",
          title: "Processing Failed",
          description: document.error || "Document processing failed",
        });
      }

    } catch (error) {
      console.warn('Error polling job status:', error);
    }
  }, [toast]);

  const handleUpload = async (file: File) => {
    setUploadStatus({
      progress: 0,
      status: StatusText.UPLOADING,
      fileId: null,
      jobId: null,
      currentStep: 'Uploading file...',
      error: null,
      estimatedTimeRemaining: null,
    });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-document', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();

      // Update status with job information
      setUploadStatus(prev => ({
        ...prev,
        progress: 10,
        status: StatusText.QUEUED,
        fileId: result.docId,
        currentStep: 'Queued for background processing...',
        estimatedTimeRemaining: 60000 // 1 minute estimate
      }));

      toast({
        title: "Upload Successful!",
        description: `${file.name} uploaded and queued for processing.`,
      });

      // Start real-time polling for progress
      setTimeout(() => pollJobStatus(result.docId), 2000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setUploadStatus({
        progress: null,
        status: StatusText.ERROR,
        fileId: null,
        jobId: null,
        currentStep: null,
        error: errorMessage,
        estimatedTimeRemaining: null,
      });

      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: errorMessage,
      });
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: any[]) => {
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        toast({
          variant: "destructive",
          title: "File Rejected",
          description: rejection.errors?.[0]?.message || "Unsupported file format",
        });
        return;
      }

      const file = acceptedFiles[0];
      if (file) {
        // Check system status before upload
        if (systemStatus?.overall !== 'healthy') {
          toast({
            variant: "destructive",
            title: "System Not Ready",
            description: "Please ensure Ollama and ChromaDB are running before uploading.",
          });
          return;
        }

        await handleUpload(file);
      }
    },
    [systemStatus, toast]
  );

  const statusIcons: { [key in StatusText]: JSX.Element } = {
    [StatusText.UPLOADING]: <RocketIcon className="h-20 w-20 text-blue-600 animate-pulse" />,
    [StatusText.QUEUED]: <CircleArrowDown className="h-20 w-20 text-purple-600 animate-bounce" />,
    [StatusText.PARSING]: <FileText className="h-20 w-20 text-yellow-600 animate-spin" />,
    [StatusText.PROCESSING]: <RefreshCw className="h-20 w-20 text-orange-600 animate-spin" />,
    [StatusText.GENERATING]: <SaveIcon className="h-20 w-20 text-indigo-600 animate-bounce" />,
    [StatusText.STORING]: <SaveIcon className="h-20 w-20 text-teal-600 animate-pulse" />,
    [StatusText.INDEXING]: <RefreshCw className="h-20 w-20 text-cyan-600 animate-spin" />,
    [StatusText.COMPLETED]: <CheckCircleIcon className="h-20 w-20 text-green-600" />,
    [StatusText.ERROR]: <AlertTriangle className="h-20 w-20 text-red-600" />,
  };

  const { getRootProps, getInputProps, isDragActive, isFocused, isDragAccept } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/html': ['.html', '.htm'],
      'application/json': ['.json'],
      'application/xml': ['.xml'],
      'text/xml': ['.xml'],
    },
  });

  const uploadInProgress = uploadStatus.progress !== null && uploadStatus.status !== StatusText.ERROR;

  return (
    <div className="flex flex-col gap-6 items-center max-w-4xl mx-auto p-6">
      {/* System Status Panel */}
      {systemStatus && systemStatus.overall !== 'healthy' && (
        <div className="w-full bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-800">System Status: {systemStatus.overall}</h3>
            <button
              onClick={checkSystemStatus}
              disabled={checkingSystem}
              className="ml-auto p-1 hover:bg-yellow-100 rounded"
            >
              <RefreshCw className={`h-4 w-4 ${checkingSystem ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span>Ollama (AI Processing):</span>
              <span className={`font-medium ${systemStatus.components.ollama.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
                {systemStatus.components.ollama.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Vector Store (ChromaDB):</span>
              <span className={`font-medium ${systemStatus.components.vectorStore.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
                {systemStatus.components.vectorStore.status}
              </span>
            </div>
          </div>

          {systemStatus.overall !== 'healthy' && (
            <div className="mt-3 p-3 bg-yellow-100 rounded text-xs">
              <p className="font-medium mb-1">Setup Instructions:</p>
              {systemStatus.components.ollama.recommendations?.map((rec: string, i: number) => (
                <p key={i}>• {rec}</p>
              ))}
              {systemStatus.components.vectorStore.recommendations?.map((rec: string, i: number) => (
                <p key={i}>• {rec}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload Progress */}
      {uploadInProgress && (
        <div className="w-full max-w-md flex flex-col items-center gap-6 py-8">
          {uploadStatus.progress !== null && uploadStatus.progress < 100 && (
            <div className="w-full">
              <div className="flex justify-between text-sm mb-2">
                <span>Progress</span>
                <span>{Math.round(uploadStatus.progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadStatus.progress}%` }}
                />
              </div>
            </div>
          )}

          {uploadStatus.status && statusIcons[uploadStatus.status]}
          
          <p className="text-center text-lg font-medium animate-pulse">
            {uploadStatus.status}
          </p>

          {uploadStatus.error && (
            <div className="w-full p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{uploadStatus.error}</p>
            </div>
          )}
        </div>
      )}

      {/* Upload Area */}
      {!uploadInProgress && (
        <>
          <div
            {...getRootProps()}
            className={`w-full p-12 border-2 border-dashed rounded-xl h-80 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
              isFocused || isDragAccept 
                ? "border-blue-500 bg-blue-50" 
                : "border-gray-300 bg-gray-50 hover:bg-gray-100"
            }`}
          >
            <input {...getInputProps()} />
            
            <div className="flex flex-col items-center justify-center text-center">
              {isDragActive ? (
                <>
                  <RocketIcon className="h-16 w-16 text-blue-500 animate-bounce mb-4" />
                  <p className="text-xl font-semibold text-blue-600">Drop your document here!</p>
                </>
              ) : (
                <>
                  <CircleArrowDown className="h-16 w-16 text-gray-400 animate-bounce mb-4" />
                  <p className="text-xl font-semibold text-gray-700 mb-2">
                    Upload your document
                  </p>
                  <p className="text-gray-500 mb-4">
                    Drag and drop a file here, or click to browse
                  </p>
                  <p className="text-sm text-gray-400">
                    Max file size: 10MB
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Supported Formats */}
          <div className="w-full">
            <h3 className="text-lg font-semibold text-center mb-4">Supported Formats</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {SUPPORTED_FORMATS.map((format) => (
                <div
                  key={format.ext}
                  className="flex items-center gap-2 p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow"
                >
                  <span className="text-2xl">{format.icon}</span>
                  <div>
                    <p className="font-medium text-sm">.{format.ext.toUpperCase()}</p>
                    <p className="text-xs text-gray-500">{format.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}