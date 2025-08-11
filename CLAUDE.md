# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev --turbopack`: Start development server with Turbopack
- `npm run build`: Build the application for production
- `npm run start`: Start the production server
- `npm run lint`: Run ESLint for code linting

## 🚀 Complete AI-Powered Document Chat System

This application is a **comprehensive document processing and chat system** that uses **100% local, open-source AI** for complete privacy and zero API costs.

## ✨ Key Features

### 📄 Universal Document Support
- **PDF, DOCX, DOC** - Word processors and PDFs
- **TXT, MD, HTML** - Text and markup formats  
- **CSV, XLSX, XLS** - Spreadsheets and data files
- **JSON, XML** - Structured data formats
- **RTF** - Rich text format support

### 🤖 Local AI Processing
- **Ollama Integration** - Local LLM processing with llama3.2
- **ChromaDB Vector Store** - Local document embeddings
- **No API Keys Required** - Everything runs on your machine
- **Complete Privacy** - Your documents never leave your device

### 💬 Advanced Chat Features
- **Context-Aware Conversations** - AI remembers chat history
- **Document-Specific Knowledge** - AI understands your documents
- **Real-Time Streaming** - Fast response generation
- **Multi-Format Understanding** - AI adapts to different document types

### 🔊 Text-to-Speech Integration
- **Web Speech API** - Built-in browser TTS
- **Server-Side TTS** - eSpeak and Piper TTS support
- **Voice Controls** - Play, pause, speed adjustment
- **Auto-Play Options** - Automatic speech for AI responses

### 📱 Modern UI/UX
- **Responsive Design** - Works on all devices
- **Real-Time Upload Progress** - Visual feedback during processing
- **System Health Monitoring** - Check AI service status
- **Document Analytics** - Word counts, processing stats

## 🛠️ System Requirements & Setup

### 1. Core Dependencies

```bash
# Install application dependencies
npm install

# Key packages installed:
# - @langchain/ollama: Ollama integration
# - chromadb: Local vector storage
# - mammoth: DOCX processing
# - pdf-parse: PDF extraction
# - xlsx: Excel file processing
# - marked: Markdown processing
# - cheerio: HTML processing
```

### 2. Ollama Setup (Required)

**Install Ollama:**
```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows - Download from: https://ollama.com/download/windows
```

**Start Ollama Service:**
```bash
ollama serve
```

**Install AI Models:**
```bash
# Primary model (recommended)
ollama pull llama3.2

# Alternative models:
ollama pull gemma2:2b      # Fastest (1.6GB)
ollama pull qwen2.5:3b     # Balanced (1.9GB)  
ollama pull mistral:7b     # Most capable (4.1GB)
```

**Verify Installation:**
```bash
ollama list
ollama run llama3.2
```

### 3. ChromaDB Setup (Required)

**Install ChromaDB:**
```bash
# Using pip
pip install chromadb

# Using conda
conda install -c conda-forge chromadb
```

**Start ChromaDB Server:**
```bash
chroma run --host localhost --port 8000
```

**Alternative Docker Setup:**
```bash
docker run -p 8000:8000 chromadb/chroma
```

### 4. Optional TTS Setup

**For Enhanced TTS (Optional):**
```bash
# Install eSpeak (Linux/macOS)
sudo apt-get install espeak  # Linux
brew install espeak          # macOS

# Install Piper TTS (Advanced)
# Download from: https://github.com/rhasspy/piper/releases
```

## 🏗️ Architecture Overview

### Backend Services
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js API   │    │     Ollama      │    │    ChromaDB     │
│   (Document     │────│   (AI Model)    │    │ (Vector Store)  │
│   Processing)   │    │  localhost:11434│    │ localhost:8000  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Firebase      │    │     Clerk       │    │   File Storage  │
│  (User Data)    │    │  (Auth)         │    │   (Firebase)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Document Processing Pipeline
1. **File Upload** → Multi-format validation and parsing
2. **Content Extraction** → Text extraction per document type  
3. **Text Chunking** → Smart splitting for better AI processing
4. **Vector Generation** → Local embeddings with Ollama
5. **Storage** → ChromaDB vector storage + Firebase metadata
6. **Chat Ready** → Real-time AI conversations

### Key Components

#### Document Parser (`lib/document-parser.ts`)
- Universal document format detection
- Type-specific content extraction
- Intelligent text chunking
- Metadata extraction

#### Ollama Integration (`lib/ollama-client.ts`, `lib/ollama-langchain.ts`)
- Direct Ollama API communication
- LangChain integration for advanced RAG
- Context-aware conversation handling
- Streaming response support

#### Vector Store (`lib/vector-store.ts`)
- Local ChromaDB integration
- Document embedding management
- Similarity search for RAG
- User-specific collections

#### TTS System (`lib/tts-client.ts`)
- Web Speech API integration
- Server-side TTS support
- Voice control management
- Text preprocessing for speech

## 📊 API Endpoints

### Document Management
- `POST /api/upload-document` - Upload and process documents
- `GET /api/upload-document` - Get document status/list
- `DELETE /api/upload-document` - Remove documents

### Chat System  
- `POST /api/chat/message` - Send chat messages
- `GET /api/chat/history` - Retrieve chat history

### System Monitoring
- `GET /api/system-status` - Check service health
- `POST /api/system-status` - Perform system actions

### Text-to-Speech
- `POST /api/tts` - Generate speech audio
- `GET /api/tts` - Get available voices/engines

## 🎯 Usage Instructions

### 1. Start Development Environment
```bash
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Start ChromaDB  
chroma run --host localhost --port 8000

# Terminal 3: Start Next.js
npm run dev --turbopack
```

### 2. Upload Documents
1. Navigate to `/dashboard/upload`
2. Upload any supported document format
3. Monitor processing progress
4. Wait for "completed" status

### 3. Chat with Documents
1. Go to `/dashboard/files/[document-id]`
2. Ask questions about your document
3. Use TTS controls to hear responses
4. Enable voice input for hands-free interaction

### 4. System Monitoring
- Check `/dashboard` for system health status
- Monitor processing statistics
- View document analytics

## 🔧 Configuration

### Environment Variables
```bash
# Authentication (Required)
CLERK_SECRET_KEY=your_clerk_secret
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key

# Firebase (Required) 
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_service_account_email

# Optional Integrations
STRIPE_SECRET_KEY=your_stripe_key
NEXT_PUBLIC_SCHEMATIC_PUBLISHABLE_KEY=your_schematic_key
```

### System Settings
- **Ollama URL**: `http://localhost:11434` (default)
- **ChromaDB URL**: `http://localhost:8000` (default)
- **Default Model**: `llama3.2`
- **Max File Size**: 10MB
- **Chunk Size**: 1000 characters
- **Chunk Overlap**: 200 characters

## 🚨 Troubleshooting

### Common Issues

**"Ollama service unavailable"**
```bash
# Check if Ollama is running
ollama list
# If not running:
ollama serve
```

**"Vector store unavailable"**  
```bash
# Check ChromaDB status
curl http://localhost:8000/api/v1/heartbeat
# If not running:
chroma run --host localhost --port 8000
```

**"Model not found"**
```bash
# Install default model
ollama pull llama3.2
```

**Document processing fails**
- Check file format support
- Verify file size under 10MB
- Ensure all services are running
- Check system status at `/dashboard`

### Performance Optimization
- Use SSD storage for better vector DB performance
- Allocate sufficient RAM (8GB+ recommended)
- Consider GPU acceleration for Ollama models
- Monitor system resources during processing

## ✅ Benefits Summary

### 🔒 Privacy & Security
- **100% Local Processing** - No data leaves your machine
- **No API Keys Required** - No external service dependencies  
- **Offline Capable** - Works without internet connection
- **Open Source Stack** - Full transparency and control

### 💰 Cost Efficiency
- **Zero API Costs** - No per-request charges
- **One-Time Setup** - No recurring fees
- **Unlimited Usage** - Process as many documents as needed
- **No Rate Limits** - Chat without restrictions

### 🚀 Performance
- **Fast Local Processing** - No network latency
- **Real-Time Responses** - Streaming chat interface
- **Scalable Storage** - Local vector database
- **Multi-Format Support** - Handle any document type

This system provides enterprise-grade document AI capabilities while maintaining complete privacy and control over your data.