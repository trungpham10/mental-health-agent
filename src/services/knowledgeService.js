import { addKnowledge } from './chromaService';

// Process and ingest a Confluence page
export const ingestConfluencePage = async (pageContent, pageMetadata) => {
  try {
    if (!pageContent || typeof pageContent !== 'string') {
      throw new Error('Page content must be a string');
    }
    
    console.log('Starting ingestion of Confluence page...');
    
    // Split the content into chunks to better handle large documents
    const chunks = splitIntoChunks(pageContent, 1000);
    console.log(`Split content into ${chunks.length} chunks`);
    
    // Add each chunk to the knowledge base
    const ids = [];
    const addPromises = [];
    
    for (let i = 0; i < chunks.length; i++) {
      // Add and collect the promise, but don't await yet
      const addPromise = addKnowledge(chunks[i], {
        ...pageMetadata,
        chunkIndex: i,
        totalChunks: chunks.length,
        source: 'confluence',
        storeType: 'knowledge' // Explicitly mark this for the knowledge store
      }).then(id => {
        ids.push(id);
        return id;
      });
      
      addPromises.push(addPromise);
    }
    
    // Wait for all chunks to be added
    await Promise.all(addPromises);
    console.log(`All ${chunks.length} chunks added successfully to knowledge store`);
    
    return {
      success: true,
      message: `Successfully ingested ${chunks.length} chunks from Confluence page into knowledge store`,
      ids
    };
  } catch (error) {
    console.error('Error ingesting Confluence page:', error);
    return {
      success: false,
      message: error.message
    };
  }
};

// Process and ingest general knowledge
export const ingestDocument = async (documentContent, documentMetadata) => {
  try {
    if (!documentContent || typeof documentContent !== 'string') {
      throw new Error('Document content must be a string');
    }
    
    console.log('Starting ingestion of document into knowledge store...');
    
    // Split the content into chunks
    const chunks = splitIntoChunks(documentContent, 1000);
    console.log(`Split document into ${chunks.length} chunks`);
    
    // Add each chunk to the knowledge base
    const ids = [];
    const addPromises = [];
    
    for (let i = 0; i < chunks.length; i++) {
      // Add and collect the promise, but don't await yet
      const addPromise = addKnowledge(chunks[i], {
        ...documentMetadata,
        chunkIndex: i,
        totalChunks: chunks.length,
        source: documentMetadata.source || 'manual',
        storeType: 'knowledge' // Explicitly mark this for the knowledge store
      }).then(id => {
        ids.push(id);
        return id;
      });
      
      addPromises.push(addPromise);
    }
    
    // Wait for all chunks to be added
    await Promise.all(addPromises);
    console.log(`All ${chunks.length} chunks added successfully to knowledge store`);
    
    return {
      success: true,
      message: `Successfully ingested ${chunks.length} chunks from document into knowledge store`,
      ids
    };
  } catch (error) {
    console.error('Error ingesting document:', error);
    return {
      success: false,
      message: error.message
    };
  }
};

// Helper function to split text into chunks
const splitIntoChunks = (text, maxChunkSize = 1000) => {
  if (!text) return [];
  
  // Split by paragraphs first
  const paragraphs = text.split(/\n\s*\n/);
  const chunks = [];
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    // If adding this paragraph exceeds maxChunkSize, push current chunk and start a new one
    if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }
  
  // Add the last chunk if it's not empty
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}; 