🧠 Seriene – Your Emotionally Intelligent Mental Health Companion
Seriene is a smart, agentic mental wellness assistant that supports journaling, mood detection, memory-based conversations, motivational quotes, and contextual next-best-action suggestions.

=======================================================================

Features:
1. Mood Detection + Selection with emoji-based interface

2. Journaling prompts based on detected emotional state

3. Memory-enabled conversations using vector storage (Chroma)

4. Knowledge uploads for document-based responses

5. Motivational quotes based on current mood

6. Next Best Action suggestions with inspirational quotes

======================================================================

🛠️ Tech Stack
Frontend: Next.js + TailwindCSS

LLM: OpenAI GPT-3.5-Turbo (via API)

Vector Store: ChromaDB (optional, or fallback to local JSON)

Quote Source: Local quotes.json file

=====================================================================

📦 Installation & Setup
1. Clone the repo
bash
Copy
Edit
git clone https://github.com/your-username/seriene-agent.git
cd seriene-agent
2. Install dependencies
bash
Copy
Edit
npm install
3. Add Environment Variables
Create a .env.local file in the root directory:

bash
Copy
Edit
touch .env.local
Then add the following:

env
Copy
Edit
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
🔐 You can get your OpenAI key here

4. Run the app
bash
Copy
Edit
npm run dev
App will be available at http://localhost:3000

