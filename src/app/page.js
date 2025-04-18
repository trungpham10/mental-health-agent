"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { initializeQuoteCollection, getQuoteByEmotion } from "../services/quoteService";


import { 
  initializeChroma, 
  addToMemory, 
  queryMemory,
  queryKnowledge, 
  getConversationHistory,
  clearAllStores
} from "../services/chromaService";
import KnowledgeUploader from "../components/KnowledgeUploader";

export default function Home() {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello, I am Serein. How can I assist you today?", isUser: false },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isDbInitialized, setIsDbInitialized] = useState(false);
  const [queryMode, setQueryMode] = useState("both");
  const [isClearing, setIsClearing] = useState(false);
  const [isRecommending, setIsRecommending] = useState(false);
  const [selectedMood, setSelectedMood] = useState(null);
  const [detectedMood, setDetectedMood] = useState(null);

  const moodDescriptions = {
    '😊': 'happy',
    '😐': 'neutral',
    '😞': 'sad',
    '😡': 'angry',
    '😴': 'tired',
    '😰': 'anxious',
    '😍': 'loved'
  };

  const [journalPrompt, setJournalPrompt] = useState(null);
  const [journalResponse, setJournalResponse] = useState("");
  const [journalHistory, setJournalHistory] = useState([]);

  const [moodHistory, setMoodHistory] = useState([]);

  const [quote, setQuote] = useState("");
  //const [loading, setLoading] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);

  const moodQuotes = {
    happy: [
      "Happiness is not something ready made. It comes from your own actions.",
      "The purpose of our lives is to be happy."
    ],
    sad: [
      "Tough times never last, but tough people do.",
      "This too shall pass."
    ],
    angry: [
      "For every minute you are angry you lose sixty seconds of happiness.",
      "Anger doesn’t solve anything. It builds nothing, but it can destroy everything."
    ],
    anxious: [
      "You don’t have to control your thoughts. You just have to stop letting them control you.",
      "Worrying doesn’t take away tomorrow’s troubles, it takes away today’s peace."
    ],
    tired: [
      "I am tired, but I am not done."
    ],
    loved: [
      "You are loved just for being who you are, just for existing.",
      "You are enough just as you are."
    ]
  };

  const handleMoodSelect = (emoji) => {
    setSelectedMood(emoji);
    setMoodHistory((prev) => [
      ...prev,
      {
        mood: emoji,
        timestamp: new Date().toISOString(),
      }
    ]);
  };

  const fetchQuoteForMood = async (moodLabel) => {
    try {
      setLoadingQuote(true);
      setQuote("");
  
      const quote = await getQuoteByEmotion(moodLabel); // from Chroma now
      setQuote(quote || "No quote found for this emotion.");
    } catch (error) {
      console.error("Quote fetch error:", error);
      setQuote("Couldn't fetch a quote right now.");
    } finally {
      setLoadingQuote(false);
    }
  };

  const detectMoodFromMessage = async (text) => {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `You're a mood detection assistant. Given the user's message, classify the emotion into ONE of the following: 😊 Happy, 😐 Neutral, 😞 Sad, 😡 Angry, 😴 Tired. Respond ONLY with the emoji and no explanation.`,
            },
            {
              role: "user",
              content: `User's message: "${text}"`,
            },
          ],
          max_tokens: 10,
        }),
      });

      const data = await res.json();
      const moodEmoji = data.choices?.[0]?.message?.content?.trim();
      return moodEmoji;
    } catch (err) {
      console.error("Mood detection failed:", err);
      return null;
    }
  };

  const getFinalMood = async (userText) => {
    const userMood = selectedMood;
    const autoMood = await detectMoodFromMessage(userText);

    const finalMood = userMood || autoMood || '😐';
    setDetectedMood(autoMood);

    if (userMood && autoMood && userMood !== autoMood) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          isUser: false,
          isSystem: true,
          timestamp: new Date().toISOString(),
          text: `You selected ${moodDescriptions[userMood]}, but I sensed you might be feeling more like ${moodDescriptions[autoMood]}. Would you like to explore that?`,
        },
      ]);

    }
    console.log({ userMood, autoMood })
    return { userMood, autoMood, finalMood };
  };


  // Initialize ChromaDB on component mount
  useEffect(() => {
    const initDb = async () => {
      try {
        await initializeChroma();
        await initializeQuoteCollection(); 

        
        // Load conversation history from ChromaDB
        const history = await getConversationHistory();
        if (history && history.length > 0) {
          // Sort by timestamp
          const sortedHistory = [...history].sort((a, b) => 
            new Date(a.timestamp) - new Date(b.timestamp)
          );
          
          setMessages(sortedHistory);
        }
        
        setIsDbInitialized(true);
      } catch (error) {
        console.error("Failed to initialize ChromaDB:", error);
      }
    };
    
      initDb();
    }, []);

  const handleClearStores = async () => {
    setIsClearing(true);
    try {
      await clearAllStores();
      
      // Reset messages to just the initial greeting
      setMessages([
        { 
          id: Date.now(), 
          text: "Hello, I am Seriene. How can I assist you today?", 
          isUser: false,
          timestamp: new Date().toISOString()
        }
      ]);
      
      // Add a system message indicating the reset
      setMessages(prevMessages => [
        ...prevMessages,
        { 
          id: Date.now() + 1, 
          text: "All memory and knowledge stores have been cleared. Your conversation history has been reset.", 
          isUser: false,
          timestamp: new Date().toISOString(),
          isSystem: true 
        }
      ]);
    } catch (error) {
      console.error("Error clearing stores:", error);
      setMessages(prevMessages => [
        ...prevMessages,
        { 
          id: Date.now(), 
          text: "Failed to clear stores. Please try again.", 
          isUser: false,
          timestamp: new Date().toISOString(),
          isSystem: true 
        }
      ]);
    } finally {
      setIsClearing(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    // Check for special commands
    const lowerInput = inputValue.toLowerCase().trim();
    
    // Handle mode switching commands
    if (lowerInput === "/knowledge") {
      setQueryMode("knowledge");
      const systemMessage = { 
        id: Date.now(), 
        text: "Switched to KNOWLEDGE-ONLY mode. Queries will only search uploaded documents.", 
        isUser: false,
        timestamp: new Date().toISOString(),
        isSystem: true 
      };
      setMessages([...messages, systemMessage]);
      setInputValue("");
      return;
    } else if (lowerInput === "/memory") {
      setQueryMode("memory");
      const systemMessage = { 
        id: Date.now(), 
        text: "Switched to MEMORY-ONLY mode. Queries will only search conversation history.", 
        isUser: false,
        timestamp: new Date().toISOString(),
        isSystem: true 
      };
      setMessages([...messages, systemMessage]);
      setInputValue("");
      return;
    } else if (lowerInput === "/both") {
      setQueryMode("both");
      const systemMessage = { 
        id: Date.now(), 
        text: "Switched to COMBINED mode. Queries will search both knowledge and memory.", 
        isUser: false,
        timestamp: new Date().toISOString(),
        isSystem: true 
      };
      setMessages([...messages, systemMessage]);
      setInputValue("");
      return;
    } else if (lowerInput === "/clear" || lowerInput === "/reset") {
      // Handle clear command
      setInputValue("");
      handleClearStores();
      return;
    }
    
    // Add user message
    const userMessage = { 
      id: Date.now(), 
      text: inputValue, 
      isUser: true,
      timestamp: new Date().toISOString()
    };
    
    const newMessages = [...messages, userMessage];
    const moodToUse = await getFinalMood(userMessage.text);
    const moodText = moodDescriptions[moodToUse] || 'Neutral';
    setMessages(newMessages);
    setInputValue("");
    
    try {
      // Add message to memory
      await addToMemory(userMessage.text, true);
      
      // Get relevant context based on query mode
      let relevantContext = [];
      let contextSource = "";
      
      if (queryMode === "both") {
        relevantContext = await queryMemory(userMessage.text, 5);
        contextSource = "memory and knowledge stores";
      } else if (queryMode === "knowledge") {
        relevantContext = await queryKnowledge(userMessage.text, 5);
        contextSource = "knowledge store only";
      } else if (queryMode === "memory") {
        // For memory-only, we'll just use queryMemory but modify the response later
        const allResults = await queryMemory(userMessage.text, 5);
        relevantContext = allResults.filter(item => item.metadata.source === 'memory');
        contextSource = "memory store only";
      }
      
      const contextText = relevantContext.map(item => item.content).join("\n\n");
      console.log('Retrieved context from', contextSource, ':', contextText);
    

      // Call OpenAI API with context-enhanced prompt & including mood
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { 
              role: 'system', 
              content: `You are Serein, a helpful AI mental health care assistant who helps user. 
              
              The user has selected their mood as: "${moodDescriptions[selectedMood] || 'Neutral'}".
              Based on their message, you detected the mood as: "${moodDescriptions[detectedMood] || 'Neutral'}".

              Please take both of these into consideration. If they align, proceed empathetically.
              If they differ, consider offering gentle suggestions or questions to help the user reflect.

              Adjust your tone and response based on this mood insight.

              Here's some relevant context that might help with the response: ${contextText}

              At the begin mention both selected and detected mood.

              Use the context if relevant to the current question, but don’t explicitly mention stored memory or documents unless asked.`  
            },
            ...messages
              .filter(msg => !msg.isSystem) // Filter out system messages
              .map(msg => ({
                role: msg.isUser ? 'user' : 'assistant',
                content: msg.text
              })),
            { role: 'user', isUser: true, content: userMessage.text }
          ],
          max_tokens: 1000
        })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('API request failed');
        }
        return response.json();
      })
      .then(async data => {
        const aiResponse = data.choices[0].message.content;
        console.log('AI response:', aiResponse);
        
        // Create AI message object
        const aiMessageObj = { 
          id: Date.now() + 1, 
          text: aiResponse, 
          isUser: false,
          timestamp: new Date().toISOString()
        };
        
        // Save AI response to memory
        await addToMemory(aiResponse, false);
        
        // Update UI
        setMessages([...newMessages, aiMessageObj]);
      })
      .catch(error => {
        console.error('Error calling OpenAI API:', error);
        const errorMessage = { 
          id: Date.now() + 1, 
          text: "Sorry, I encountered an error processing your request.", 
          isUser: false,
          timestamp: new Date().toISOString()
        };
        setMessages([...newMessages, errorMessage]);
      });
    } catch (error) {
      console.error('Error with vector store operations:', error);
    }

    // Add a check for API key before the setTimeout
    if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
      console.warn('OpenAI API key is not set. Using fallback response.');
      setTimeout(() => {
        const fallbackMessage = { 
          id: Date.now() + 1, 
          text: "I'm processing your request. How else can I help you?", 
          isUser: false,
          timestamp: new Date().toISOString()
        };
        setMessages([...newMessages, fallbackMessage]);
      }, 1000);
    }
  };

  const handleNextBestAction = async () => {
    setIsRecommending(true);
    
    try {
      // Get current date and time in CST/Central timezone
      const now = new Date();
      const cstOptions = { timeZone: 'America/Chicago', weekday: 'long', hour: 'numeric', minute: 'numeric', hour12: true };
      const cstDateTime = now.toLocaleString('en-US', cstOptions);
      
      // Add current date/time to the context
      const timeContext = `Current time is: ${cstDateTime}. `;

      // Create a specific prompt for getting the next best action
      const promptMessage = { 
        id: Date.now(), 
        text: "What should I do next?", 
        isUser: true,
        timestamp: new Date().toISOString(),
        isAction: true
      };
      
      const newMessages = [...messages, promptMessage];
      // setMessages(newMessages);
      
      // Add message to memory
      await addToMemory(promptMessage.text, true);
      
      // Get relevant context based on query mode - prioritize knowledge
      const relevantContext = await queryMemory(promptMessage.text, 7);
      
      
      const contextText = relevantContext.map(item => item.content).join("\n\n");
      // Combine the time context with the rest of the context
      // Prepend the time context to the beginning of the context text
      const fullContextText = `${timeContext}\n\n${contextText}`;
      console.log('fullContextText', fullContextText)
      
      // Call OpenAI API with specialized prompt for next best action
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { 
              role: 'system', 
              content: `You are Serein, You are Seriene, a calm, emotionally-aware mental health companion,
              The user has selected their mood as: "${moodDescriptions[selectedMood] || 'Neutral'}".
              Based on their message, you detected the mood as: "${moodDescriptions[detectedMood] || 'Neutral'}"
              
                      TASK: The user is asking for the next best action to take. You must recommend ONE specific action. Add a famous quote to motivate the user to accomplish the action.
                      
                      RULES for recommending the next action:
                      1. Review any schedule information in the context
                      2. Prioritize time-sensitive tasks that need attention now
                      3. Consider urgency and importance of different tasks
                      4. Be specific and actionable - recommend exactly what to do next
                      
                      Here's relevant context from the user's history and knowledge base:
                      ${fullContextText}
                      
                      FORMAT YOUR RESPONSE LIKE THIS:
                      [when to do it]: [specific action to take]

                      [quote to motivate the user]

                      Example:
                      [8am-10am]: work 
                      
                      "The only way to do great work is to love what you do." 
                      - Steve Jobs
                      ` 
            },
            ...messages
              .filter(msg => !msg.isSystem) // Filter out system messages
              .map(msg => ({
                role: msg.isUser ? 'user' : 'assistant',
                content: msg.text
              })),
            { role: 'user', content: timeContext + "What should I do next based on my schedule?" }
          ],
          max_tokens: 1000
        })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('API request failed');
        }
        return response.json();
      })
      .then(async data => {
        const aiResponse = data.choices[0].message.content;
        
        // Create AI message object
        const aiMessageObj = { 
          id: Date.now() + 1, 
          text: aiResponse, 
          isUser: false,
          timestamp: new Date().toISOString(),
          isAction: true
        };
        
        // Save AI response to memory
        await addToMemory(aiResponse, false);
        
        // Update UI
        setMessages([...newMessages, aiMessageObj]);
      })
      .catch(error => {
        console.error('Error calling OpenAI API:', error);
        const errorMessage = { 
          id: Date.now() + 1, 
          text: "Sorry, I encountered an error processing your request for the next best action.", 
          isUser: false,
          timestamp: new Date().toISOString()
        };
        setMessages([...newMessages, errorMessage]);
      })
      .finally(() => {
        setIsRecommending(false);
      });
    } catch (error) {
      console.error('Error with recommendation:', error);
      setIsRecommending(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
            <span className="text-xs font-bold">S</span>
          </div>
          <h1 className="text-xl font-bold">SERIEN</h1>
          {isDbInitialized && (
            <div className="flex items-center gap-2">
              <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full ml-2">
                Memory Enabled
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ml-1 ${
                queryMode === 'both' ? 'bg-blue-500' : 
                queryMode === 'knowledge' ? 'bg-purple-500' : 'bg-orange-500'
              }`}>
                {queryMode === 'both' ? 'Combined Mode' : 
                 queryMode === 'knowledge' ? 'Knowledge Only' : 'Memory Only'}
              </span>
            </div>
          )}
          
        </div>

        {/* Mood Selection */}
        <div className="flex items-center justify-center gap-4 p-4 border-b border-gray-800 bg-gray-900">
          <span className="text-sm text-gray-300">Today’s Mood:</span>
          {Object.keys(moodDescriptions).map((emoji) => (
            <button
              key={emoji}
              className={`text-2xl transition hover:scale-125 ${
              selectedMood === emoji ? 'ring-2 ring-purple-500 rounded-full' : ''
            }`}
            onClick={() => {
              setSelectedMood(emoji);
              const label = moodDescriptions[emoji]?.toLowerCase();
              if (label) fetchQuoteForMood(label);

              // Save mood to history
              setMoodHistory((prev) => [
                ...prev,
                { 
                  mood: emoji,
                  description: moodDescriptions[emoji],
                  timestamp: new Date().toISOString(),
                },
              ]);

              // Show journaling prompt for specific moods
              if (['😞', '😡', '😴', '😰'].includes(emoji)) {
                setJournalPrompt(`Would you like to journal about what made you feel ${moodDescriptions[emoji].toLowerCase()} today?`);
              } else {
                setJournalPrompt(null);
              }
            }}
            title={moodDescriptions[emoji]}
            >
            {emoji}
            </button>
          ))}
        </div>

        {/* Quote Display */}
        <div className="max-w-xs text-sm text-gray-300 border-l border-gray-700 pl-4">
          {loadingQuote ? (
            <p className="italic">Thinking of something uplifting...</p>
            ) : quote ? (
            <>
              <p className="font-semibold text-white mb-1">Gentle Thought</p>
              <p className="italic">“{quote}”</p>
            </>
          ) : (
            <p className="text-gray-500 italic">Pick a mood to see a quote</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleNextBestAction}
            disabled={isRecommending}
            className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md flex items-center gap-1 transition-colors"
            title="Get recommended next action"
          >
            {isRecommending ? (
              <>
                <span className="animate-pulse">Thinking...</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span>Next Best Action</span>
              </>
            )}
          </button>
          <button
            onClick={handleClearStores}
            disabled={isClearing}
            className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-md flex items-center gap-1 transition-colors"
            title="Clear all memory and knowledge"
          >
            {isClearing ? (
              <>
                <span className="animate-pulse">Clearing...</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"></path>
                </svg>
                <span>Reset All</span>
              </>
            )}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm text-gray-400">Online</span>
          </div>
        </div>
      </header>

      {/* Chat container */}
      <div className="flex-1 overflow-auto p-4 space-y-4" id="chat-container">
        {messages.map((message) => (
          <div 
            key={`message-${message.id}-${message.timestamp || Date.now()}`} 
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[80%] p-3 rounded-xl ${
                message.isUser 
                  ? message.isAction
                    ? 'bg-green-600 text-white rounded-tr-none'
                    : 'bg-blue-600 text-white rounded-tr-none' 
                  : message.isSystem
                    ? 'bg-gray-700 text-gray-200 border border-gray-600'
                    : message.isAction
                      ? 'bg-green-800 text-white rounded-tl-none'
                      : 'bg-gray-800 text-white rounded-tl-none'
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
      </div>

      {/* Mode selector buttons */}
      <div className="flex justify-center space-x-2 border-t border-gray-800 pt-2">
        <button
          onClick={() => {
            setQueryMode("both");
            setMessages([...messages, { 
              id: Date.now(), 
              text: "Switched to COMBINED mode", 
              isUser: false,
              timestamp: new Date().toISOString(),
              isSystem: true 
            }]);
          }}
          className={`px-3 py-1 text-xs rounded-full ${
            queryMode === 'both' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300'
          }`}
        >
          Combined
        </button>
        <button
          onClick={() => {
            setQueryMode("knowledge");
            setMessages([...messages, { 
              id: Date.now(), 
              text: "Switched to KNOWLEDGE-ONLY mode", 
              isUser: false,
              timestamp: new Date().toISOString(),
              isSystem: true 
            }]);
          }}
          className={`px-3 py-1 text-xs rounded-full ${
            queryMode === 'knowledge' ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-300'
          }`}
        >
          Knowledge Only
        </button>
        <button
          onClick={() => {
            setQueryMode("memory");
            setMessages([...messages, { 
              id: Date.now(), 
              text: "Switched to MEMORY-ONLY mode", 
              isUser: false,
              timestamp: new Date().toISOString(),
              isSystem: true 
            }]);
          }}
          className={`px-3 py-1 text-xs rounded-full ${
            queryMode === 'memory' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-300'
          }`}
        >
          Memory Only
        </button>
      </div>

      {/* Input area */}
      <form onSubmit={handleSendMessage} className="border-t border-gray-800 p-4">
        <div className="flex items-center bg-gray-800 rounded-full px-4 py-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`Type your message... (/${queryMode} mode, /clear to reset)`}
            className="flex-1 bg-transparent outline-none"
          />
          <button 
            type="submit"
            className="ml-2 w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center hover:bg-blue-600 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </form>

      {/* Knowledge Uploader Component */}
      <KnowledgeUploader />

      {journalPrompt && (
        <div className="p-4 bg-gray-900 border-t border-gray-700">
          <p className="text-sm text-gray-300 mb-2">{journalPrompt}</p>
          <textarea
            value={journalResponse}
            onChange={(e) => setJournalResponse(e.target.value)}
            rows={3}
            placeholder="Write your thoughts here..."
            className="w-full bg-gray-800 text-white p-2 rounded-md outline-none resize-none"
          />
          <button
            onClick={() => {
              if (journalResponse.trim()) {
                const newEntry = {
                  mood: selectedMood,
                  description: moodDescriptions[selectedMood],
                  text: journalResponse.trim(),
                  timestamp: new Date().toISOString(),
                };
                setJournalHistory((prev) => [...prev, newEntry]);
                setJournalPrompt(null);
                setJournalResponse("");
              }
            }}
            className="mt-2 px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
          Save Journal Entry
          </button>
        </div>
      )}

      {loadingQuote && (
        <p className="text-sm italic text-gray-400 px-4 mt-2">Thinking of something uplifting...</p>
      )}

      

      {/* Visual effects */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none opacity-30 z-[-1]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full filter blur-3xl"></div>
      </div>
    </div>
  );
}
