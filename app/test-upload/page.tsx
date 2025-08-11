"use client";

import { useState } from "react";

export default function TestUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log('Uploading file:', file.name);

      const response = await fetch('/api/test-upload', {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      const responseText = await response.text();
      console.log('Response text:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        setError(`Invalid JSON response: ${responseText.substring(0, 200)}...`);
        return;
      }

      if (!response.ok) {
        setError(data.error || `HTTP ${response.status}`);
        return;
      }

      setResult(data);

    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      setError(fetchError instanceof Error ? fetchError.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Test File Upload</h1>
      
      <div className="space-y-4">
        <div>
          <input
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.docx,.txt,.md,.csv,.xlsx,.html,.json"
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {file && (
          <div className="p-4 bg-gray-50 rounded">
            <p><strong>File:</strong> {file.name}</p>
            <p><strong>Type:</strong> {file.type}</p>
            <p><strong>Size:</strong> {(file.size / 1024).toFixed(2)} KB</p>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300 hover:bg-blue-600"
        >
          {loading ? 'Processing...' : 'Test Upload'}
        </button>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <h3 className="font-semibold text-red-800">Error:</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {result && (
          <div className="p-4 bg-green-50 border border-green-200 rounded">
            <h3 className="font-semibold text-green-800">Success!</h3>
            <pre className="mt-2 text-sm bg-white p-2 rounded overflow-x-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded">
        <h3 className="font-semibold text-blue-800">Debug Info</h3>
        <p className="text-sm text-blue-700 mt-2">
          This page tests the document processing pipeline without authentication or full system dependencies.
        </p>
        <p className="text-sm text-blue-700 mt-1">
          Open browser devtools to see detailed logs.
        </p>
      </div>
    </div>
  );
}