# 🤖 AI-Powered Document Chat System

[![Next.js](https://img.shields.io/badge/Next.js-15.1.7-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Ollama](https://img.shields.io/badge/Ollama-Local_AI-green)](https://ollama.com/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector_Store-orange)](https://www.trychroma.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.17-38B2AC)](https://tailwindcss.com/)

A **comprehensive document processing and chat system** that uses **100% local, open-source AI** for complete privacy and zero API costs. Upload documents, extract content with OCR, and have intelligent conversations powered by local AI models.

![System Architecture](https://img.shields.io/badge/Architecture-Full_Stack-brightgreen)
![Privacy](https://img.shields.io/badge/Privacy-100%25_Local-red)
![Cost](https://img.shields.io/badge/API_Cost-$0-success)

---

## ✨ Key Features

### 📄 **Universal Document Support**
- **PDF, DOCX, DOC** - Word processors and PDFs
- **TXT, MD, HTML** - Text and markup formats  
- **CSV, XLSX, XLS** - Spreadsheets and data files
- **JSON, XML** - Structured data formats
- **RTF** - Rich text format support
- **Images** - JPG, PNG, TIFF, BMP, WebP with OCR

### 🤖 **Local AI Processing**
- **Ollama Integration** - Local LLM processing with multiple model support
- **ChromaDB Vector Store** - Local document embeddings and similarity search
- **OCR with Tesseract.js** - Extract text from images and scanned PDFs
- **No API Keys Required** - Everything runs on your machine
- **Complete Privacy** - Your documents never leave your device

### 💬 **Advanced Chat Features**
- **Context-Aware Conversations** - AI remembers chat history
- **Document-Specific Knowledge** - AI understands your documents
- **Real-Time Streaming** - Fast response generation via Server-Side Events
- **Multi-Format Understanding** - AI adapts to different document types
- **Smart Command Recognition** - Summarize, extract dates, find people, etc.

### 🗂️ **Enterprise Document Management**
- **Folder Organization** - Hierarchical folder structure
- **Document Versioning** - Track changes and compare versions
- **Bulk Upload** - Process multiple files simultaneously  
- **Tag System** - Organize documents with custom tags
- **Advanced Search** - Filter by content, tags, dates, and more
- **Document Analytics** - Usage tracking and processing statistics

### 🔊 **Text-to-Speech Integration**
- **Web Speech API** - Built-in browser TTS
- **Server-Side TTS** - eSpeak and Piper TTS support
- **Voice Controls** - Play, pause, speed adjustment
- **Auto-Play Options** - Automatic speech for AI responses

### 📱 **Modern UI/UX**
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Real-Time Updates** - Live document processing status
- **System Health Monitoring** - Check AI service status
- **Dark/Light Mode** - Customizable interface themes
- **Progress Indicators** - Visual feedback during processing

---

## 🛠️ Technology Stack

### **Frontend**
- **Next.js 15.1.7** - React framework with App Router
- **TypeScript 5.x** - Type-safe development
- **Tailwind CSS 3.4.17** - Utility-first styling
- **DaisyUI 5.0.50** - Beautiful UI components
- **Framer Motion** - Smooth animations
- **Radix UI** - Accessible components

### **Backend & AI**
- **Ollama** - Local LLM inference
- **LangChain** - AI application framework
- **ChromaDB** - Vector database for embeddings
- **Convex** - Real-time database and backend
- **Tesseract.js** - OCR text extraction

### **Authentication & Storage**
- **Clerk** - User authentication and management
- **Firebase** - Document metadata storage
- **Hybrid Storage** - In-memory + persistent storage

### **Document Processing**
- **Mammoth.js** - DOCX processing
- **PDF-Parse** - PDF text extraction
- **PDF2Pic** - PDF to image conversion
- **Sharp** - Image optimization
- **XLSX** - Excel file processing
- **Cheerio** - HTML parsing

---

## 🚀 Quick Start

### 1. **Prerequisites**

#### **Node.js & NPM**
```bash
node --version  # v18+ required
npm --version   # v9+ required
```

#### **Install Ollama (Required for AI)**
```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows - Download from: https://ollama.com/download/windows
```

#### **Install ChromaDB (Required for Vector Search)**
```bash
# Using pip
pip install chromadb

# Using conda
conda install -c conda-forge chromadb
```

### 2. **Project Setup**

```bash
# Clone the repository
git clone https://github.com/kooya3/PDF.git
cd PDF

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your credentials
```

### 3. **Environment Configuration**

Create `.env.local` with the following variables:

```bash
# Authentication (Required)
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# Firebase (Required for persistence)
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY="your_firebase_private_key"
FIREBASE_CLIENT_EMAIL=your_firebase_client_email

# Convex (Required for real-time features)
CONVEX_DEPLOYMENT=your_convex_deployment_url
NEXT_PUBLIC_CONVEX_URL=your_public_convex_url

# Optional: Payment Integration
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_SCHEMATIC_PUBLISHABLE_KEY=your_schematic_key
```

### 4. **Start Services**

Open **3 separate terminals**:

```bash
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Start ChromaDB  
chroma run --host localhost --port 8000

# Terminal 3: Start Next.js App
npm run dev
```

### 5. **Install AI Models**

```bash
# Install primary model (recommended)
ollama pull llama3.2

# Alternative models:
ollama pull gemma2:2b      # Fastest (1.6GB)
ollama pull qwen2.5:3b     # Balanced (1.9GB)  
ollama pull mistral:7b     # Most capable (4.1GB)

# Verify installation
ollama list
```

### 6. **Access the Application**

- **Web App**: http://localhost:3000
- **Dashboard**: http://localhost:3000/dashboard
- **System Status**: http://localhost:3000/api/system-status

---

## 📖 Usage Guide

### **1. Document Upload**
1. Navigate to `/dashboard/upload`
2. Drag & drop or select documents
3. Choose processing options (OCR for images/scanned PDFs)
4. Monitor real-time processing progress
5. Wait for "completed" status

### **2. Chat with Documents**
1. Go to `/dashboard/files/[document-id]`
2. Ask questions about your document
3. Use smart commands:
   - "Summarize this document"
   - "Extract all dates mentioned"
   - "Find action items"
   - "What are the main topics?"

### **3. Document Management**
- **Organize**: Create folders and move documents
- **Tag**: Add custom tags for easy categorization
- **Search**: Use advanced filters and full-text search
- **Version**: Track document changes and compare versions

### **4. System Monitoring**
- Check `/dashboard` for system health
- Monitor Ollama and ChromaDB status
- View document processing analytics
- Get setup recommendations

---

## 📁 Project Structure

```
ai-challenge/
├── 📱 app/                          # Next.js App Router
│   ├── api/                         # API Routes
│   │   ├── chat/                    # Chat endpoints
│   │   ├── documents/               # Document management
│   │   ├── folders/                 # Folder organization
│   │   ├── upload-*/                # File upload variants
│   │   └── system-status/           # Health monitoring
│   ├── dashboard/                   # Dashboard pages
│   │   ├── files/                   # Document viewer
│   │   ├── upload/                  # Upload interface
│   │   └── analytics/               # Usage analytics
│   └── (auth)/                      # Authentication pages
├── 🧩 components/                   # React Components
│   ├── ui/                          # Reusable UI components
│   ├── dashboard/                   # Dashboard-specific components
│   └── forms/                       # Form components
├── 🗄️ convex/                       # Convex Backend
│   ├── schema.ts                    # Database schema
│   ├── documents.ts                 # Document operations
│   ├── conversations.ts             # Chat history
│   └── analytics.ts                 # Usage tracking
├── 📚 lib/                          # Utility Libraries
│   ├── document-parser.ts           # Document processing
│   ├── ollama-client.ts             # AI integration
│   ├── ocr-service.ts               # OCR processing
│   ├── vector-store.ts              # ChromaDB integration
│   └── memory-store.ts              # In-memory storage
├── 🎨 styles/                       # Styling
├── 📄 public/                       # Static assets
└── ⚙️ config files                  # Configuration
```

---

## 🔧 API Reference

### **Document Management**

#### Upload Document
```http
POST /api/upload-document-simple
Content-Type: multipart/form-data

Body: file (binary)
```

#### Upload with OCR
```http
POST /api/upload-with-ocr
Content-Type: multipart/form-data

Body: file (image/PDF)
```

#### Get Document
```http
GET /api/files/{id}?includeContent=true
```

### **Chat System**

#### Send Message
```http
POST /api/chat/message
Content-Type: application/json

{
  "message": "What is this document about?",
  "docId": "document_id"
}
```

#### Get Chat History
```http
GET /api/chat/history?docId=document_id
```

### **System Monitoring**

#### System Status
```http
GET /api/system-status
```

#### Real-time Updates (SSE)
```http
GET /api/realtime/documents
```

---

## ⚡ Performance & Optimization

### **System Requirements**
- **RAM**: 8GB+ recommended (4GB minimum)
- **Storage**: SSD recommended for vector database
- **CPU**: Multi-core processor for faster AI inference
- **GPU**: Optional NVIDIA GPU for accelerated models

### **Performance Tips**
1. **Model Selection**: Choose appropriate model size for your hardware
2. **Document Chunking**: Optimal chunk size is 800-1000 characters
3. **Vector Storage**: Use SSD for ChromaDB for better performance
4. **Memory Management**: Monitor memory usage with large documents

### **Scaling Considerations**
- **Horizontal Scaling**: Multiple Ollama instances for high traffic
- **Database Optimization**: Indexed queries for fast retrieval
- **Caching Strategy**: Hybrid in-memory + persistent storage
- **CDN Integration**: Static assets optimization

---

## 🛡️ Security & Privacy

### **Privacy Features**
- ✅ **100% Local Processing** - No data sent to external APIs
- ✅ **No Cloud Dependencies** - Everything runs on your infrastructure
- ✅ **Encrypted Storage** - Firebase security rules and encryption
- ✅ **User Authentication** - Secure Clerk-based auth system
- ✅ **Data Isolation** - User-specific document access controls

### **Security Best Practices**
- Regular security updates for all dependencies
- Secure environment variable management
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS and security headers configuration

---

## 🐛 Troubleshooting

### **Common Issues**

#### ❌ "Ollama service unavailable"
```bash
# Check if Ollama is running
ollama list

# If not running, start it
ollama serve

# Verify models are installed
ollama pull llama3.2
```

#### ❌ "Vector store unavailable"  
```bash
# Check ChromaDB status
curl http://localhost:8000/api/v1/heartbeat

# If not running, start ChromaDB
chroma run --host localhost --port 8000

# Alternative with Docker
docker run -p 8000:8000 chromadb/chroma
```

#### ❌ "Build errors with Convex imports"
```bash
# Clear Next.js cache
rm -rf .next

# Restart development server
npm run dev
```

#### ❌ "Document processing fails"
- ✅ Check file format support
- ✅ Verify file size under 25MB
- ✅ Ensure all services are running
- ✅ Check system status at `/dashboard`

### **Debug Commands**
```bash
# Check all services
curl http://localhost:3000/api/system-status

# View server logs
npm run dev  # Check terminal output

# Test Ollama directly
curl http://localhost:11434/api/version

# Test ChromaDB directly
curl http://localhost:8000/api/v1/heartbeat
```

---

## 🤝 Contributing

### **Development Setup**
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Run linting: `npm run lint`
5. Commit with conventional commits: `git commit -m 'feat: add amazing feature'`
6. Push to your branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### **Code Style**
- **TypeScript**: Strict mode enabled
- **ESLint**: Next.js configuration
- **Prettier**: Code formatting
- **Conventional Commits**: Commit message format

### **Testing Guidelines**
- Write unit tests for utility functions
- Test API endpoints with different scenarios
- Verify document processing with various file types
- Check UI components with different screen sizes

---

## 📊 Supported Models

### **Ollama Models**
| Model | Size | Speed | Quality | Use Case |
|-------|------|-------|---------|----------|
| `llama3.2` | 4.7GB | Medium | High | **Recommended** - Best balance |
| `gemma2:2b` | 1.6GB | Fast | Good | Quick responses, low memory |
| `qwen2.5:3b` | 1.9GB | Fast | High | Balanced performance |
| `mistral:7b` | 4.1GB | Medium | Highest | Complex analysis |
| `tinyllama` | 637MB | Fastest | Basic | Testing, minimal resources |

### **Installation Commands**
```bash
# Primary recommendation
ollama pull llama3.2

# For low-resource systems
ollama pull gemma2:2b

# For high-performance needs
ollama pull mistral:7b
```

---

## 📈 Roadmap

### **Completed Features** ✅
- [x] Universal document support (PDF, DOCX, TXT, etc.)
- [x] Local AI integration with Ollama
- [x] OCR support for images and scanned PDFs
- [x] Real-time chat with document context
- [x] Advanced document management (folders, tags, search)
- [x] Document versioning and comparison
- [x] Usage analytics and monitoring
- [x] Text-to-speech integration
- [x] Responsive UI with dark/light modes
- [x] System health monitoring

### **Upcoming Features** 🚧
- [ ] **Voice Chat** - Speech-to-text for hands-free interaction
- [ ] **Developer API** - REST/GraphQL API for third-party integrations
- [ ] **Mobile App** - React Native companion app
- [ ] **Collaborative Features** - Shared documents and team workspaces
- [ ] **Advanced OCR** - Handwriting recognition and table extraction
- [ ] **Multi-language Support** - UI localization and model support

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **[Ollama](https://ollama.com/)** - Local AI model inference
- **[ChromaDB](https://www.trychroma.com/)** - Vector database solution
- **[Next.js](https://nextjs.org/)** - React application framework
- **[Clerk](https://clerk.dev/)** - Authentication platform
- **[Convex](https://www.convex.dev/)** - Real-time backend platform
- **[Tesseract.js](https://tesseract.projectnaptha.com/)** - OCR processing
- **[LangChain](https://js.langchain.com/)** - AI application framework

---

## 💬 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/kooya3/PDF/issues)
- **Documentation**: Check this README and inline code comments
- **Community**: Join discussions in GitHub Discussions

---

<div align="center">

**Built with ❤️ using 100% local, open-source AI**

[![Privacy First](https://img.shields.io/badge/Privacy-First-success)](https://github.com/kooya3/PDF)
[![Zero API Costs](https://img.shields.io/badge/API_Costs-$0-green)](https://github.com/kooya3/PDF)
[![Local Processing](https://img.shields.io/badge/Processing-100%25_Local-blue)](https://github.com/kooya3/PDF)

[⭐ Star this repo](https://github.com/kooya3/PDF) | [🐛 Report Bug](https://github.com/kooya3/PDF/issues) | [💡 Request Feature](https://github.com/kooya3/PDF/issues)

</div>