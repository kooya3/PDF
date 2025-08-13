# 🤖 AI-Powered Document Chat System

[![Next.js](https://img.shields.io/badge/Next.js-15.1.7-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Ollama](https://img.shields.io/badge/Ollama-Local_AI-green)](https://ollama.com/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector_Store-orange)](https://www.trychroma.com/)
[![ElevenLabs](https://img.shields.io/badge/ElevenLabs-Premium_TTS-purple)](https://elevenlabs.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.17-38B2AC)](https://tailwindcss.com/)

A **comprehensive document processing and chat system** that combines **local AI processing** with **premium cloud TTS** for the ultimate document intelligence experience. Upload any document format, extract content with OCR, and have natural conversations powered by local AI models with professional voice synthesis.

![Privacy](https://img.shields.io/badge/Privacy-Local_AI-red)
![Voice Quality](https://img.shields.io/badge/Voice-Premium_Quality-purple)
![Architecture](https://img.shields.io/badge/Architecture-Full_Stack-brightgreen)

---

## ✨ Key Features

### 📄 **Universal Document Support**
- **PDF, DOCX, DOC** - Word processors and PDFs with full text extraction
- **TXT, MD, HTML** - Text and markup formats  
- **CSV, XLSX, XLS** - Spreadsheets and data files with table understanding
- **JSON, XML** - Structured data formats
- **RTF** - Rich text format support
- **Images** - JPG, PNG, TIFF, BMP, WebP with advanced OCR

### 🤖 **Hybrid AI Processing**
- **Local LLM (Ollama)** - Private document analysis with tinyllama model
- **ChromaDB Vector Store** - Advanced semantic search and similarity matching
- **Smart Text Processing** - Automatic content cleaning and optimization
- **Context-Aware Responses** - AI maintains conversation history and document understanding
- **Complete Document Privacy** - All document processing happens locally

### 🎵 **Premium Voice Experience**
- **ElevenLabs TTS** - Professional, natural-sounding voice synthesis
- **Conversational Voices** - 5 optimized voices for different contexts:
  - **Rachel** - Warm, natural female voice (perfect for conversations)
  - **Adam** - Deep, engaging male voice (professional content)
  - **Antoni** - Clear, articulate voice (document narration)
  - **Sam** - Casual, friendly voice (relaxed interactions)
  - **Bella** - Expressive, dynamic voice (engaging content)
- **Advanced Voice Controls** - Stability, similarity boost, expression tuning
- **Smart Request Management** - Automatic rate limiting and queue handling
- **Auto-Play Support** - Seamless voice responses for chat messages

### 💬 **Intelligent Chat System**
- **Document-Specific Knowledge** - AI understands your document content
- **Real-Time Streaming** - Fast response generation
- **Smart Commands** - Extract dates, people, places, action items
- **Context Preservation** - Maintains conversation flow across sessions
- **Multi-Format Understanding** - Adapts responses based on document type

### 🗂️ **Professional Document Management**
- **Hierarchical Organization** - Folder structure with nested categories
- **Advanced Search** - Semantic search across all documents
- **Tag System** - Custom tagging and categorization
- **Processing Analytics** - Track usage and performance metrics
- **Real-Time Status** - Live processing updates and health monitoring

### 📱 **Modern User Experience**
- **Responsive Design** - Optimized for desktop, tablet, and mobile
- **Glass Morphism UI** - Beautiful, modern interface design
- **Dark/Light Themes** - Customizable appearance
- **Real-Time Updates** - Live document processing and chat updates
- **Progressive Enhancement** - Works offline with cached content

---

## 🛠️ Technology Stack

### **Frontend Architecture**
- **Next.js 15.1.7** - React framework with App Router and RSC
- **TypeScript 5.x** - Full type safety and IntelliSense
- **Tailwind CSS 3.4.17** - Utility-first styling with custom components
- **Framer Motion** - Smooth animations and transitions
- **Radix UI** - Accessible, unstyled component primitives

### **AI & Processing**
- **Ollama (tinyllama)** - Local LLM for document analysis
- **LangChain** - AI application framework and prompt management
- **ChromaDB** - Vector database for semantic search
- **ElevenLabs API** - Premium text-to-speech synthesis
- **Pinecone** - Cloud vector database for embeddings

### **Authentication & Storage**
- **Clerk** - User authentication and session management
- **Firebase** - Document metadata and user data storage
- **Hybrid Document Store** - In-memory + persistent storage strategy

### **Document Processing**
- **Mammoth.js** - Advanced DOCX processing and conversion
- **PDF-Parse** - PDF text extraction and metadata
- **Sharp** - High-performance image processing
- **XLSX** - Excel file parsing and data extraction
- **Cheerio** - HTML parsing and content extraction

---

## 🚀 Quick Start Guide

### 1. **Prerequisites & Installation**

#### **Node.js Environment**
```bash
node --version  # v18+ required
npm --version   # v9+ required
```

#### **Install Ollama (Required for Local AI)**
```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows - Download from: https://ollama.com/download/windows
```

#### **Install ChromaDB (Required for Vector Search)**
```bash
# Using pip (recommended)
pip install chromadb

# Using conda
conda install -c conda-forge chromadb

# Using Docker
docker run -p 8000:8000 chromadb/chroma
```

### 2. **Project Setup**

```bash
# Clone the repository
git clone https://github.com/your-username/ai-challenge.git
cd ai-challenge

# Install all dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your configuration
```

### 3. **Environment Configuration**

Create `.env.local` with the following configuration:

```bash
# Authentication (Required)
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# Firebase Configuration (Required)
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY="your_firebase_private_key"
FIREBASE_CLIENT_EMAIL=your_firebase_client_email

# AI Configuration (Required)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=tinyllama:latest

# Vector Database (Required) 
PINECONE_API_KEY=your_pinecone_api_key

# Premium TTS (Required for voice features)
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Optional: Payment Integration
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_SCHEMATIC_PUBLISHABLE_KEY=your_schematic_key
```

### 4. **Start All Services**

Open **3 separate terminals**:

```bash
# Terminal 1: Start Ollama Service
ollama serve

# Terminal 2: Start ChromaDB Server
chroma run --host localhost --port 8000

# Terminal 3: Start Next.js Application
npm run dev
```

### 5. **Install AI Model**

```bash
# Install the recommended model
ollama pull tinyllama:latest

# Verify installation
ollama list
ollama run tinyllama:latest
```

### 6. **Access Your Application**

- **Main Application**: http://localhost:3001
- **Dashboard**: http://localhost:3001/dashboard
- **System Health**: http://localhost:3001/api/system-status
- **TTS Test**: http://localhost:3001/api/tts

---

## 📖 Detailed Usage Guide

### **Document Upload & Processing**

1. **Navigate to Upload**: Go to `/dashboard/upload`
2. **Select Documents**: Drag & drop or browse for files
3. **Choose Options**: Enable OCR for scanned documents
4. **Monitor Progress**: Watch real-time processing status
5. **Verify Completion**: Ensure "completed" status before chatting

### **Intelligent Document Chat**

1. **Access Document**: Go to `/dashboard/files/[document-id]`
2. **Enable Voice**: Click the speaker icon for TTS responses
3. **Natural Conversation**: Ask questions in plain English
4. **Smart Commands**:
   ```
   "Summarize this document"
   "Extract all dates mentioned"
   "Find people and organizations"
   "What are the key action items?"
   "Compare this with my other documents"
   ```

### **Voice & TTS Configuration**

1. **Enable TTS**: Click speaker button in chat interface
2. **Choose Voice**: Select from 5 conversational voices
3. **Adjust Settings**: Fine-tune stability, similarity, expression
4. **Auto-Play**: Enable automatic voice responses
5. **Advanced Controls**: Access streaming and quality settings

### **Document Organization**

- **Folders**: Create hierarchical folder structures
- **Tags**: Add custom tags for categorization
- **Search**: Use semantic search across all documents
- **Filtering**: Filter by date, type, tags, or content

---

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │    │     Ollama      │    │    ChromaDB     │
│   (Frontend)    │────│  (Local AI)     │    │ (Vector Store)  │
│  Port: 3001     │    │ Port: 11434     │    │  Port: 8000     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Clerk       │    │   ElevenLabs    │    │    Pinecone     │
│  (Auth)         │    │ (Premium TTS)   │    │ (Embeddings)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Firebase      │    │  Document       │    │  Hybrid Store   │
│  (Metadata)     │    │  Processing     │    │  (In-Memory)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Data Flow**
1. **Upload** → Document parsing and text extraction
2. **Processing** → Content chunking and embedding generation
3. **Storage** → Vector storage in ChromaDB + metadata in Firebase
4. **Query** → User question → Vector similarity search
5. **AI Response** → Context-aware response via Ollama
6. **TTS** → Natural voice synthesis via ElevenLabs

---

## 📁 Project Structure

```
ai-challenge/
├── 📱 app/                          # Next.js App Router
│   ├── api/                         # API Routes
│   │   ├── tts/                     # Text-to-speech endpoints
│   │   ├── pinecone/                # Vector database operations
│   │   ├── upload-document/         # Document upload handling
│   │   ├── system-status/           # Health monitoring
│   │   └── realtime/                # Real-time updates
│   ├── dashboard/                   # Main application interface
│   │   ├── files/[id]/             # Document viewer and chat
│   │   ├── upload/                  # Document upload interface
│   │   └── page.tsx                 # Dashboard home
│   └── globals.css                  # Global styles
├── 🧩 components/                   # React Components
│   ├── ui/                          # Shadcn/ui components
│   ├── PDFChatInterface.tsx         # Main chat interface
│   ├── UniversalDocumentViewer.tsx  # Document display
│   ├── EnhancedTTSControls.tsx      # Voice controls
│   └── PineconeDocumentPage.tsx     # Document management
├── 📚 lib/                          # Core Libraries
│   ├── hybrid-tts-service.ts        # ElevenLabs TTS integration
│   ├── elevenlabs-client.ts         # ElevenLabs API wrapper
│   ├── hybrid-chat-service.ts       # AI conversation logic
│   ├── hybrid-document-store.ts     # Document storage layer
│   ├── pinecone-client.ts           # Vector database client
│   ├── ollama-client.ts             # Local AI integration
│   └── pinecone-embeddings.ts       # Embedding management
├── 🎨 styles/                       # Tailwind CSS
├── 📄 public/                       # Static assets
└── ⚙️ Configuration files            # Next.js, TypeScript, etc.
```

---

## 🔧 API Reference

### **Document Management**

#### Upload Document
```http
POST /api/upload-document
Content-Type: multipart/form-data

Body: file (any supported format)
Response: { id, fileName, status, processingTime }
```

#### Get Document with Content
```http
GET /api/files/{userId}_{timestamp}_{hash}?includeContent=true
Response: { document, content, metadata }
```

### **Vector Search & Chat**

#### Generate Embeddings
```http
POST /api/pinecone/embed
Content-Type: application/json

{
  "text": "document content",
  "documentId": "doc_id",
  "fileName": "document.pdf"
}
```

#### Chat with Document
```http
POST /api/pinecone/chat
Content-Type: application/json

{
  "question": "What is this document about?",
  "documentId": "doc_id",
  "fileName": "document.pdf",
  "history": [...]
}
```

### **Text-to-Speech**

#### Generate Speech
```http
POST /api/tts
Content-Type: application/json

{
  "text": "Hello, this is a test",
  "voice_id": "EXAVITQu4vr4xnSDxMaL",
  "stability": 0.75,
  "similarity_boost": 0.85,
  "style": 0.2
}
```

#### Get TTS Status
```http
GET /api/tts
Response: { 
  provider: "elevenlabs",
  available: true,
  conversationalVoices: {...}
}
```

### **System Monitoring**

#### System Health Check
```http
GET /api/system-status
Response: {
  ollama: { available, models },
  chromadb: { available, collections },
  elevenlabs: { available, voices, usage }
}
```

---

## ⚡ Performance & Optimization

### **System Requirements**
- **RAM**: 8GB+ recommended (16GB for optimal performance)
- **Storage**: SSD recommended (faster vector operations)
- **CPU**: Multi-core processor (AI inference benefits from more cores)
- **Network**: Stable internet for ElevenLabs TTS (optional for local-only mode)

### **Performance Optimization Tips**

#### **AI Model Performance**
```bash
# Use tinyllama for fastest responses
ollama pull tinyllama:latest

# Monitor model memory usage
ollama ps

# Optimize model parameters
curl http://localhost:11434/api/chat -X POST -d '{
  "model": "tinyllama:latest",
  "options": {
    "temperature": 0.7,
    "top_p": 0.9,
    "num_predict": 256
  }
}'
```

#### **Document Processing**
- **Chunk Size**: 1000 characters optimal for balance of context and speed
- **Overlap**: 200 characters for better context preservation
- **Batch Processing**: Process multiple documents in parallel
- **Memory Management**: Clear unused embeddings periodically

#### **TTS Optimization**
- **Request Queuing**: Automatic handling of concurrent request limits
- **Voice Caching**: Reuse voice settings for consistent performance
- **Streaming**: Use streaming mode for longer texts
- **Rate Limiting**: Built-in 100ms delay between requests

---

## 🛡️ Security & Privacy

### **Privacy-First Architecture**
- ✅ **Local AI Processing** - Documents analyzed on your machine
- ✅ **Secure Authentication** - Clerk-based user management
- ✅ **Encrypted Storage** - Firebase security rules and encryption
- ✅ **API Security** - Rate limiting and input validation
- ✅ **Data Isolation** - User-specific document access controls

### **Security Features**
- **Environment Variables** - Secure credential management
- **CORS Protection** - Restricted cross-origin requests
- **Input Sanitization** - All user inputs validated and cleaned
- **Error Handling** - No sensitive information in error messages
- **Audit Logging** - Track document access and processing

### **Compliance Considerations**
- **GDPR Ready** - User data deletion and export capabilities
- **SOC 2 Compatible** - Security controls and monitoring
- **Enterprise Security** - Role-based access control foundation

---

## 🐛 Troubleshooting Guide

### **Common Issues & Solutions**

#### ❌ **"Ollama service unavailable"**
```bash
# Check Ollama status
ollama list

# Start Ollama if not running
ollama serve

# Verify model installation
ollama pull tinyllama:latest
ollama run tinyllama:latest

# Test API directly
curl http://localhost:11434/api/version
```

#### ❌ **"ChromaDB connection failed"**
```bash
# Check ChromaDB status
curl http://localhost:8000/api/v1/heartbeat

# Start ChromaDB
chroma run --host localhost --port 8000

# Alternative with Docker
docker run -p 8000:8000 chromadb/chroma

# Check for port conflicts
lsof -i :8000
```

#### ❌ **"ElevenLabs rate limit exceeded"**
```bash
# Check TTS system status
curl http://localhost:3001/api/tts

# System automatically handles:
# - Request queuing (max 2 concurrent)
# - Exponential backoff retry (1s, 2s, 5s)
# - User-friendly error messages

# Verify API key
echo $ELEVENLABS_API_KEY
```

#### ❌ **"Document processing fails"**
- ✅ **File Format**: Ensure supported format (PDF, DOCX, TXT, etc.)
- ✅ **File Size**: Keep under 25MB for optimal performance
- ✅ **Encoding**: Use UTF-8 encoding for text files
- ✅ **Permissions**: Verify file read permissions
- ✅ **Service Health**: Check `/api/system-status`

### **Debug Commands**
```bash
# Complete system health check
curl http://localhost:3001/api/system-status | jq

# Test individual components
curl http://localhost:11434/api/version          # Ollama
curl http://localhost:8000/api/v1/heartbeat     # ChromaDB
curl http://localhost:3001/api/tts              # TTS System

# View application logs
npm run dev  # Check console output

# Clear application cache
rm -rf .next
npm run dev
```

---

## 🚀 Deployment Guide

### **Production Deployment**

#### **Environment Setup**
```bash
# Build for production
npm run build

# Start production server
npm start

# Or deploy to Vercel
npx vercel --prod
```

#### **Service Configuration**
```bash
# Ollama production setup
ollama serve --host 0.0.0.0 --port 11434

# ChromaDB production setup
chroma run --host 0.0.0.0 --port 8000 --log-level INFO

# Environment variables for production
NODE_ENV=production
OLLAMA_BASE_URL=http://your-ollama-server:11434
```

#### **Docker Deployment**
```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### **Scaling Considerations**
- **Load Balancing**: Multiple Next.js instances behind reverse proxy
- **Database Scaling**: ChromaDB cluster setup for high availability
- **Caching**: Redis for session and response caching
- **CDN**: Static asset optimization and global distribution

---

## 🤝 Contributing Guidelines

### **Development Workflow**
1. **Fork & Clone**: Create your own copy of the repository
2. **Branch**: Create feature branch: `git checkout -b feature/amazing-feature`
3. **Develop**: Make changes following code style guidelines
4. **Test**: Ensure all functionality works as expected
5. **Lint**: Run `npm run lint` and fix any issues
6. **Commit**: Use conventional commits: `git commit -m 'feat: add amazing feature'`
7. **Pull Request**: Submit PR with detailed description

### **Code Standards**
- **TypeScript**: Strict mode enabled, full type coverage
- **ESLint**: Next.js configuration with custom rules
- **Prettier**: Consistent code formatting
- **Conventional Commits**: Standardized commit messages
- **Component Structure**: Functional components with hooks
- **API Design**: RESTful endpoints with proper error handling

### **Testing Guidelines**
- **Unit Tests**: Test utility functions and API endpoints
- **Integration Tests**: Test document processing workflows
- **UI Tests**: Verify component functionality across devices
- **Performance Tests**: Monitor AI response times and memory usage

---

## 📊 Supported Technologies

### **Document Formats**
| Format | Extension | Processing | OCR Support |
|--------|-----------|------------|-------------|
| PDF | `.pdf` | ✅ Text + Images | ✅ Scanned PDFs |
| Word | `.docx`, `.doc` | ✅ Full formatting | ❌ N/A |
| Excel | `.xlsx`, `.xls` | ✅ All sheets | ❌ N/A |
| Text | `.txt`, `.md` | ✅ UTF-8 | ❌ N/A |
| Web | `.html`, `.xml` | ✅ Clean extraction | ❌ N/A |
| Data | `.json`, `.csv` | ✅ Structured parsing | ❌ N/A |
| Images | `.jpg`, `.png`, `.tiff` | ✅ OCR processing | ✅ Text extraction |

### **AI Models Supported**
| Model | Size | Speed | Quality | Memory | Use Case |
|-------|------|-------|---------|--------|----------|
| `tinyllama:latest` | 637MB | ⚡ Fast | Good | 2GB | **Recommended** - Production |
| `gemma2:2b` | 1.6GB | Fast | High | 4GB | Balanced performance |
| `qwen2.5:3b` | 1.9GB | Medium | High | 6GB | Advanced analysis |
| `llama3.2` | 4.7GB | Medium | Highest | 8GB | Complex reasoning |

### **Voice Options (ElevenLabs)**
| Voice | ID | Gender | Style | Best For |
|-------|----|----- --|-------|----------|
| Rachel | `EXAVITQu4vr4xnSDxMaL` | Female | Conversational | Chat responses |
| Adam | `pNInz6obpgDQGcFmaJgB` | Male | Professional | Document reading |
| Antoni | `ErXwobaYiN019PkySvjV` | Male | Clear | Technical content |
| Sam | `yoZ06aMxZJJ28mfd3POQ` | Male | Casual | Friendly interactions |
| Bella | `EXAVITQu4vr4xnSDxMaL` | Female | Expressive | Dynamic content |

---

## 📈 Roadmap & Future Features

### **Recently Completed** ✅
- [x] ElevenLabs premium TTS integration
- [x] Advanced rate limiting and error handling
- [x] Conversational voice optimization
- [x] Hybrid document storage system
- [x] Real-time processing status updates
- [x] Enhanced UI with glass morphism design
- [x] Smart request queuing for API limits

### **In Development** 🚧
- [ ] **Multi-Document Chat** - Cross-document conversations and analysis
- [ ] **Advanced OCR** - Table extraction and handwriting recognition
- [ ] **Voice Input** - Speech-to-text for hands-free interaction
- [ ] **Mobile App** - React Native companion application
- [ ] **API Gateway** - RESTful API for third-party integrations

### **Planned Features** 📋
- [ ] **Collaborative Workspaces** - Team document sharing and chat
- [ ] **Document Comparison** - Side-by-side analysis and diff views
- [ ] **Advanced Analytics** - Usage insights and optimization suggestions
- [ ] **Multi-language Support** - UI localization and model support
- [ ] **Enterprise SSO** - SAML and OIDC integration
- [ ] **Workflow Automation** - Zapier and webhook integrations

---

## 📄 License & Legal

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for complete details.

### **Third-Party Licenses**
- **Ollama**: Apache License 2.0
- **ChromaDB**: Apache License 2.0
- **ElevenLabs**: Commercial API service
- **Next.js**: MIT License
- **All npm dependencies**: Various open-source licenses

---

## 🙏 Acknowledgments & Credits

### **Core Technologies**
- **[Ollama](https://ollama.com/)** - Local AI model inference engine
- **[ChromaDB](https://www.trychroma.com/)** - Vector database for semantic search
- **[ElevenLabs](https://elevenlabs.io/)** - Premium text-to-speech synthesis
- **[Next.js](https://nextjs.org/)** - React framework and deployment platform
- **[Pinecone](https://www.pinecone.io/)** - Managed vector database service

### **Development Tools**
- **[Clerk](https://clerk.dev/)** - Authentication and user management
- **[Firebase](https://firebase.google.com/)** - Document metadata storage
- **[LangChain](https://js.langchain.com/)** - AI application framework
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Radix UI](https://www.radix-ui.com/)** - Accessible component primitives

---

## 💬 Support & Community

### **Getting Help**
- **📚 Documentation**: This README and inline code comments
- **🐛 Bug Reports**: [GitHub Issues](https://github.com/your-username/ai-challenge/issues)
- **💡 Feature Requests**: [GitHub Discussions](https://github.com/your-username/ai-challenge/discussions)
- **🔧 Technical Support**: Check troubleshooting section first

### **Contributing**
- **🤝 Pull Requests**: Welcome! Please follow contribution guidelines
- **📖 Documentation**: Help improve docs and examples
- **🧪 Testing**: Report bugs and help with quality assurance
- **🌍 Translation**: Assist with internationalization efforts

---

<div align="center">

## 🌟 **Built for Privacy, Powered by AI, Enhanced with Voice** 🌟

[![Privacy First](https://img.shields.io/badge/Privacy-First-success?style=for-the-badge)](https://github.com/your-username/ai-challenge)
[![Local Processing](https://img.shields.io/badge/Processing-100%25_Local-blue?style=for-the-badge)](https://github.com/your-username/ai-challenge)
[![Premium Voice](https://img.shields.io/badge/Voice-Premium_Quality-purple?style=for-the-badge)](https://github.com/your-username/ai-challenge)

---

### **Quick Links**
[🚀 Get Started](#-quick-start-guide) • [📖 Documentation](#-detailed-usage-guide) • [🐛 Report Bug](https://github.com/your-username/ai-challenge/issues) • [💡 Request Feature](https://github.com/your-username/ai-challenge/discussions)

### **Made with ❤️ for document intelligence and natural conversation**

⭐ **Star this repo if you find it useful!** ⭐

</div>