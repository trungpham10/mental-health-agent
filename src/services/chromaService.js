import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from "langchain/vectorstores/memory";

// In-memory storage for conversations and knowledge
let memoryStore; // For conversations only
let knowledgeStore; // For uploaded documents only
let conversationHistory = [];
let pendingMemoryOperations = []; // Track pending memory operations
let pendingKnowledgeOperations = []; // Track pending knowledge operations

// OpenAI embeddings for text vectorization
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  batchSize: 512,
});

// Initialize the memory store
export const initializeChroma = async () => {
  try {
    // Create memory vector store if it doesn't exist
    if (!memoryStore) {
      memoryStore = await MemoryVectorStore.fromTexts(
        ["Hello, I am Jarvis. How can I assist you today?"],
        [{ type: 'conversation', isUser: false, timestamp: new Date().toISOString() }],
        embeddings
      );
      console.log('Memory store initialized');
    }
    
    // Create knowledge vector store if it doesn't exist
    if (!knowledgeStore) {
      knowledgeStore = await MemoryVectorStore.fromTexts(
        ["Initial knowledge store entry"],
        [{ type: 'system', timestamp: new Date().toISOString() }],
        embeddings
      );
      console.log('Knowledge store initialized');
    }
    
    return { memoryStore, knowledgeStore };
  } catch (error) {
    console.error('Error initializing vector stores:', error);
    throw error;
  }
};

// Clear all memory and knowledge stores
export const clearAllStores = async () => {
  try {
    // Wait for any pending operations to complete
    await waitForPendingMemoryOperations();
    await waitForPendingKnowledgeOperations();
    
    // Reset the stores to their initial state
    memoryStore = await MemoryVectorStore.fromTexts(
      ["Hello, I am Jarvis. How can I assist you today?"],
      [{ type: 'conversation', isUser: false, timestamp: new Date().toISOString() }],
      embeddings
    );
    
    knowledgeStore = await MemoryVectorStore.fromTexts(
      ["Initial knowledge store entry"],
      [{ type: 'system', timestamp: new Date().toISOString() }],
      embeddings
    );
    
    // Clear the conversation history
    conversationHistory = [];
    
    console.log('All memory and knowledge stores have been cleared');
    return true;
  } catch (error) {
    console.error('Error clearing stores:', error);
    throw error;
  }
};

// Helper to wait for pending memory operations
const waitForPendingMemoryOperations = async () => {
  if (pendingMemoryOperations.length > 0) {
    console.log(`Waiting for ${pendingMemoryOperations.length} pending memory operations...`);
    await Promise.all(pendingMemoryOperations);
    pendingMemoryOperations = [];
    console.log('All pending memory operations completed');
  }
};

// Helper to wait for pending knowledge operations
const waitForPendingKnowledgeOperations = async () => {
  if (pendingKnowledgeOperations.length > 0) {
    console.log(`Waiting for ${pendingKnowledgeOperations.length} pending knowledge operations...`);
    await Promise.all(pendingKnowledgeOperations);
    pendingKnowledgeOperations = [];
    console.log('All pending knowledge operations completed');
  }
};

// Add a conversation to memory store
export const addToMemory = async (message, isUser = true) => {
  try {
    if (!memoryStore) {
      await initializeChroma();
    }
    
    const id = Date.now().toString();
    const metadata = { 
      timestamp: new Date().toISOString(),
      isUser,
      type: 'conversation',
      id
    };
    
    // Add to memory store - track this operation
    const addOperation = memoryStore.addDocuments([
      { pageContent: message, metadata }
    ]);
    
    // Add to pending operations
    pendingMemoryOperations.push(addOperation);
    
    // Await this specific operation
    await addOperation;
    
    // Also add to conversation history array for easy retrieval
    conversationHistory.push({
      id,
      text: message,
      isUser,
      timestamp: metadata.timestamp
    });
    
    return id;
  } catch (error) {
    console.error('Error adding to memory:', error);
    throw error;
  }
};

// Add knowledge document to the knowledge store
export const addKnowledge = async (document, metadata = {}) => {
  try {
    if (!knowledgeStore) {
      await initializeChroma();
    }
    
    const id = `knowledge-${Date.now()}`;
    const docMetadata = { 
      ...metadata, 
      type: 'knowledge',
      timestamp: new Date().toISOString(),
      id
    };
    
    // Add to knowledge store - track this operation
    const addOperation = knowledgeStore.addDocuments([
      { pageContent: document, metadata: docMetadata }
    ]);
    
    // Add to pending operations
    pendingKnowledgeOperations.push(addOperation);
    
    // Await this specific operation
    await addOperation;
    
    console.log(`Added knowledge document with ID: ${id}`);
    return id;
  } catch (error) {
    console.error('Error adding knowledge:', error);
    throw error;
  }
};

// Query both memory and knowledge for relevant context
export const queryMemory = async (query, limit = 5) => {
  try {
    if (!memoryStore || !knowledgeStore) {
      await initializeChroma();
    }
    
    // Wait for any pending operations to complete before querying
    await waitForPendingMemoryOperations();
    await waitForPendingKnowledgeOperations();
    
    console.log(`Querying for: "${query}"`);
    
    // Split the limit between memory and knowledge
    const memoryLimit = Math.floor(limit / 2);
    const knowledgeLimit = limit - memoryLimit;
    
    // Query both stores in parallel
    const [memoryResults, knowledgeResults] = await Promise.all([
      memoryStore.similaritySearch(query, memoryLimit),
      knowledgeStore.similaritySearch(query, knowledgeLimit)
    ]);
    
    console.log(`Found ${memoryResults.length} memory results and ${knowledgeResults.length} knowledge results`);
    
    // Format and combine the results
    // Knowledge results get priority in the returned array
    const formattedKnowledge = knowledgeResults.map(doc => ({
      content: doc.pageContent,
      metadata: { ...doc.metadata, source: 'knowledge' }
    }));
    
    const formattedMemory = memoryResults.map(doc => ({
      content: doc.pageContent,
      metadata: { ...doc.metadata, source: 'memory' }
    }));
    
    // Return combined results with knowledge first
    return [...formattedKnowledge, ...formattedMemory];
  } catch (error) {
    console.error('Error querying stores:', error);
    return [];
  }
};

// Query only the knowledge store
export const queryKnowledge = async (query, limit = 5) => {
  try {
    if (!knowledgeStore) {
      await initializeChroma();
    }
    
    // Wait for any pending knowledge operations to complete
    await waitForPendingKnowledgeOperations();
    
    console.log(`Querying knowledge with: "${query}"`);
    const results = await knowledgeStore.similaritySearch(query, limit);
    console.log(`Found ${results.length} knowledge results`);
    
    // Format the results
    return results.map(doc => ({
      content: doc.pageContent,
      metadata: doc.metadata
    }));
  } catch (error) {
    console.error('Error querying knowledge store:', error);
    return [];
  }
};

// Get conversation history
export const getConversationHistory = async (limit = 20) => {
  try {
    // Wait for any pending memory operations to complete
    await waitForPendingMemoryOperations();
    
    // Return from in-memory conversation history
    if (conversationHistory.length > 0) {
      return conversationHistory.slice(-limit);
    }
    
    // If memory store exists but conversation history is empty, try to rebuild it
    if (memoryStore) {
      const allDocs = await memoryStore.similaritySearch("", 100);
      const conversations = allDocs
        .filter(doc => doc.metadata.type === 'conversation')
        .map(doc => ({
          id: doc.metadata.id,
          text: doc.pageContent,
          isUser: doc.metadata.isUser,
          timestamp: doc.metadata.timestamp
        }));
      
      // Sort by timestamp
      conversations.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      // Update the conversation history
      conversationHistory = conversations;
      
      return conversations.slice(-limit);
    }
    
    return [];
  } catch (error) {
    console.error('Error getting conversation history:', error);
    return [];
  }
}; 