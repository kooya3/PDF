import { Pinecone } from '@pinecone-database/pinecone';

if (!process.env.PINECONE_API_KEY) {
  throw new Error('PINECONE_API_KEY environment variable is not set');
}

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

export const PINECONE_INDEX_NAME = 'ai-document-chat';

// Cache to prevent repeated index checks
let indexInstance: any = null;
let indexInitialized = false;

export async function initializePineconeIndex() {
  // Return cached instance if already initialized
  if (indexInitialized && indexInstance) {
    return indexInstance;
  }

  try {
    const indexes = await pinecone.listIndexes();
    const indexExists = indexes.indexes?.some(index => index.name === PINECONE_INDEX_NAME);

    if (!indexExists) {
      console.log(`Creating Pinecone index: ${PINECONE_INDEX_NAME}`);
      await pinecone.createIndex({
        name: PINECONE_INDEX_NAME,
        dimension: 768, // Nomic embedding dimension
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      });

      // Wait for index to be ready
      let indexDescription;
      do {
        await new Promise(resolve => setTimeout(resolve, 1000));
        indexDescription = await pinecone.describeIndex(PINECONE_INDEX_NAME);
      } while (indexDescription.status?.ready !== true);
      
      console.log(`Index ${PINECONE_INDEX_NAME} created and ready`);
    }
    // Remove the "already exists" log to reduce noise

    indexInstance = pinecone.index(PINECONE_INDEX_NAME);
    indexInitialized = true;
    return indexInstance;
  } catch (error) {
    console.error('Error initializing Pinecone index:', error);
    throw error;
  }
}

export async function getPineconeIndex() {
  return pinecone.index(PINECONE_INDEX_NAME);
}

export default pinecone;