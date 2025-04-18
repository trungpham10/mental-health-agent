// services/quoteService.js

import { ChromaClient, Collection, Settings } from "chromadb";


// Create or connect to local ChromaDB
const client = new ChromaClient(
  new Settings({
    chromaDbImpl: "duckdb+parquet",
    persistDirectory: "./chroma_quotes", // or any other local folder
  })
);

// Our collection name
const COLLECTION_NAME = "emotion_quotes";

// Quote store (you can preload these)
const quotesByEmotion = {
  happy: [
    "Happiness is not something ready made. It comes from your own actions.",
    "The purpose of our lives is to be happy.",
  ],
  sad: [
    "Tough times never last, but tough people do.",
    "This too shall pass.",
  ],
  angry: [
    "For every minute you are angry you lose sixty seconds of happiness.",
    "Anger doesn’t solve anything. It builds nothing, but it can destroy everything.",
  ],
  anxious: [
    "You don’t have to control your thoughts. You just have to stop letting them control you.",
    "Worrying doesn’t take away tomorrow’s troubles, it takes away today’s peace.",
  ],
  tired: ["I am tired, but I am not done."],
  loved: [
    "You are loved just for being who you are, just for existing.",
    "You are enough just as you are.",
  ],
};

// Initialize collection & insert quotes
export async function initializeQuoteCollection() {
  const existing = await client.getOrCreateCollection({ name: COLLECTION_NAME });

  // Optional: Check if already populated (avoid duplicates)
  const count = await existing.count();
  if (count > 0) return;

  let ids = [];
  let documents = [];
  let metadatas = [];

  Object.entries(quotesByEmotion).forEach(([emotion, quotes]) => {
    quotes.forEach((quote, idx) => {
      ids.push(`${emotion}-${idx}`);
      documents.push(quote);
      metadatas.push({ emotion });
    });
  });

  await existing.add({
    ids,
    documents,
    metadatas,
  });
}

// Retrieve a random quote by emotion
export async function getQuoteByEmotion(emotion) {
  const collection = await client.getOrCreateCollection({ name: COLLECTION_NAME });

  const results = await collection.query({
    queryTexts: [emotion],
    nResults: 5, // Top 5 matches, you can shuffle from here
    where: { emotion },
  });

  const quotes = results.documents?.[0] || [];

  // Return random if multiple
  return quotes[Math.floor(Math.random() * quotes.length)] || null;
}
