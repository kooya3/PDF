import { ChatOllama } from "@langchain/ollama";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { auth } from "@clerk/nextjs/server";
import { adminDb } from "./firebase-admin-temp";
import { DocumentParser, ParsedDocument } from "./document-parser";
import { vectorStore } from "./vector-store";
import { ollamaClient } from "./ollama-client";

// Initialize the Ollama model
const model = new ChatOllama({
  baseUrl: "http://localhost:11434",
  model: "tinyllama",
  temperature: 0.7,
});

async function fetchMessagesFromDB(docId: string) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("User not found");
  }

  console.log("--- Fetching chat history from the firestore database... ---");
  // Get the last 10 messages from the chat history
  const chats = await adminDb
    .collection(`users`)
    .doc(userId)
    .collection("files")
    .doc(docId)
    .collection("chat")
    .orderBy("createdAt", "desc")
    .limit(10)
    .get();

  const chatHistory = chats.docs.map((doc) =>
    doc.data().role === "human"
      ? new HumanMessage(doc.data().message)
      : new AIMessage(doc.data().message)
  ).reverse(); // Reverse to get chronological order

  console.log(
    `--- fetched last ${chatHistory.length} messages successfully ---`
  );

  return chatHistory;
}

export async function generateDocsFromFile(
  file: File, 
  fileName: string,
  docId: string
): Promise<ParsedDocument> {
  console.log("--- Parsing document with universal parser... ---");
  
  const parsedDoc = await DocumentParser.parseDocument(file, fileName, {
    enableChunking: true,
    chunkSize: 1000,
    chunkOverlap: 200,
    extractMetadata: true
  });

  console.log(`--- Successfully parsed ${parsedDoc.metadata.type} document ---`);
  console.log(`--- Content length: ${parsedDoc.content.length} characters ---`);
  console.log(`--- Generated ${parsedDoc.chunks?.length || 0} chunks ---`);

  return parsedDoc;
}

export async function generateDocsFromUrl(downloadUrl: string): Promise<ParsedDocument> {
  console.log(`--- Fetching document from URL: ${downloadUrl} ---`);
  
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch document: ${response.statusText}`);
  }

  const blob = await response.blob();
  
  // Extract filename from URL or Content-Disposition header
  const fileName = extractFileNameFromUrl(downloadUrl) || 
                  extractFileNameFromHeaders(response.headers) || 
                  'document';

  return generateDocsFromFile(blob as File, fileName, '');
}

function extractFileNameFromUrl(url: string): string | null {
  try {
    const urlPath = new URL(url).pathname;
    const fileName = urlPath.split('/').pop();
    return fileName && fileName.includes('.') ? fileName : null;
  } catch {
    return null;
  }
}

function extractFileNameFromHeaders(headers: Headers): string | null {
  const contentDisposition = headers.get('content-disposition');
  if (contentDisposition) {
    const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
    if (matches && matches[1]) {
      return matches[1].replace(/['"]/g, '');
    }
  }
  return null;
}

async function storeDocumentInVectorDB(
  docId: string,
  parsedDoc: ParsedDocument,
  userId: string
): Promise<void> {
  if (!parsedDoc.chunks || parsedDoc.chunks.length === 0) {
    throw new Error("No chunks found in parsed document");
  }

  const collectionName = `user_${userId}`;
  
  console.log(`--- Storing document chunks in vector database ---`);
  console.log(`--- Collection: ${collectionName} ---`);
  console.log(`--- Document ID: ${docId} ---`);
  console.log(`--- Chunks: ${parsedDoc.chunks.length} ---`);

  await vectorStore.addDocumentChunks(
    collectionName,
    docId,
    parsedDoc.chunks,
    {
      fileName: parsedDoc.metadata.fileName,
      fileType: parsedDoc.metadata.type,
      wordCount: parsedDoc.metadata.wordCount,
      fileSize: parsedDoc.metadata.fileSize,
      pages: parsedDoc.metadata.pages,
      createdAt: new Date().toISOString(),
    }
  );

  console.log("--- Document stored successfully in vector database ---");
}

export async function generateEmbeddingsInVectorStore(docId: string): Promise<void> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("User not found");
  }

  console.log("--- Checking if document already exists in vector store... ---");
  
  const collectionName = `user_${userId}`;
  
  // Check if document already exists
  const existingDocs = await vectorStore.searchSimilar(
    collectionName,
    "", // Empty query to get all
    1,
    { documentId: docId }
  );

  if (existingDocs.length > 0) {
    console.log(
      `--- Document ${docId} already exists in vector store, skipping generation ---`
    );
    return;
  }

  console.log("--- Fetching document from Firebase... ---");
  const firebaseRef = await adminDb
    .collection("users")
    .doc(userId)
    .collection("files")
    .doc(docId)
    .get();

  const downloadUrl = firebaseRef.data()?.downloadUrl;

  if (!downloadUrl) {
    throw new Error("Download URL not found");
  }

  const parsedDoc = await generateDocsFromUrl(downloadUrl);
  await storeDocumentInVectorDB(docId, parsedDoc, userId);
}

const generateOllamaCompletion = async (docId: string, question: string) => {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("User not found");
  }

  console.log("--- Ensuring vector store has document embeddings... ---");
  await generateEmbeddingsInVectorStore(docId);

  console.log("--- Searching for relevant document chunks... ---");
  const collectionName = `user_${userId}`;
  const relevantChunks = await vectorStore.searchSimilar(
    collectionName,
    question,
    5, // Get top 5 most relevant chunks
    { documentId: docId }
  );

  if (relevantChunks.length === 0) {
    throw new Error("No relevant document content found");
  }

  console.log(`--- Found ${relevantChunks.length} relevant chunks ---`);

  // Fetch chat history
  const chatHistory = await fetchMessagesFromDB(docId);

  // Prepare context from relevant chunks
  const context = relevantChunks
    .map(chunk => chunk.content)
    .join("\n\n");

  // Create a prompt template for answering questions
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system", 
      `You are a helpful AI assistant that answers questions based on the provided document context. 
       Use the context below to answer the user's question accurately and concisely.
       If the answer cannot be found in the context, say "I cannot find that information in the document."
       
       Context:
       {context}`
    ],
    ...chatHistory,
    ["human", "{question}"]
  ]);

  console.log("--- Generating response with Ollama... ---");
  const chain = prompt.pipe(model);
  
  const response = await chain.invoke({
    context,
    question,
  });

  return response.content;
};

// Helper function to create a retriever-based chain (similar to the original implementation)
export const generateLangchainCompletion = async (docId: string, question: string) => {
  return await generateOllamaCompletion(docId, question);
};

// Function to delete document from vector store
export async function deleteDocumentFromVectorStore(docId: string): Promise<void> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("User not found");
  }

  const collectionName = `user_${userId}`;
  await vectorStore.deleteDocument(collectionName, docId);
  
  console.log(`--- Document ${docId} deleted from vector store ---`);
}

// Function to get document stats
export async function getDocumentStats(docId?: string): Promise<{
  totalDocuments: number;
  totalChunks: number;
  documentChunks?: number;
}> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("User not found");
  }

  const collectionName = `user_${userId}`;
  const stats = await vectorStore.getCollectionStats(collectionName);

  if (docId) {
    // Get specific document chunk count
    const documentChunks = await vectorStore.searchSimilar(
      collectionName,
      "",
      1000,
      { documentId: docId }
    );

    return {
      ...stats,
      documentChunks: documentChunks.length,
    };
  }

  return stats;
}

// Function to check system health
export async function checkSystemHealth(): Promise<{
  ollama: { available: boolean; hasModel: boolean; error?: string };
  vectorStore: { available: boolean; error?: string };
}> {
  // Check Ollama
  const ollamaAvailable = await ollamaClient.isAvailable();
  const defaultModel = process.env.OLLAMA_MODEL || 'tinyllama';
  const hasModel = ollamaAvailable ? await ollamaClient.hasModel(defaultModel) : false;

  // Check Vector Store
  const vectorStoreAvailable = await vectorStore.isAvailable();

  return {
    ollama: {
      available: ollamaAvailable,
      hasModel,
      error: !ollamaAvailable 
        ? "Ollama is not running. Please start with: ollama serve"
        : !hasModel 
        ? `Model ${defaultModel} not found. Please pull with: ollama pull ${defaultModel}`
        : undefined
    },
    vectorStore: {
      available: vectorStoreAvailable,
      error: !vectorStoreAvailable 
        ? "ChromaDB is not running. Please start with: chroma run --host localhost --port 8000"
        : undefined
    }
  };
}

// Export the model for compatibility
export { model };