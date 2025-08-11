#!/bin/bash

# Test document upload and processing workflow
echo "Testing Document Upload and Chat Workflow"
echo "========================================"

# Create a test document
cat > /tmp/test-document.txt << EOF
This is a test document for the AI-powered document chat system.

The document contains information about artificial intelligence, machine learning, and natural language processing. AI systems can understand and process human language to provide intelligent responses.

Machine learning algorithms help computers learn patterns from data without being explicitly programmed. This enables AI systems to improve their performance over time.

Natural language processing allows computers to understand, interpret, and generate human language in a way that is valuable for various applications.
EOF

echo "1. Created test document: /tmp/test-document.txt"

# Test upload (this would need authentication in real scenario)
echo "2. Testing document upload endpoint..."
echo "   (Note: This test requires authentication, so it will likely return 401)"

curl -X POST \
  -F "file=@/tmp/test-document.txt" \
  http://localhost:3000/api/upload-document-simple \
  -w "\nHTTP Status: %{http_code}\n"

echo -e "\n3. Testing system health..."
curl -s http://localhost:3000/api/system-status | python3 -m json.tool | head -20

echo -e "\n4. Workflow test completed."
echo "   - To fully test: Login to the app and upload the test document"
echo "   - Check real-time progress updates work"
echo "   - Test chat functionality with the processed document"

# Clean up
rm -f /tmp/test-document.txt