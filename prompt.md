PART 1 — Landing Page Prompt
Markdown

Build a static landing page for StudyMate using:

- HTML
- CSS (no frameworks)
- Vanilla JavaScript

Requirements:

1. Hero section:
   - App name: StudyMate
   - One-line pitch: "Your AI-powered study notes assistant."
   - Button: "Open App"

2. 3 feature cards:
   - Create & organize notes
   - AI summaries & quiz questions
   - Manage notes with AI tools

Use Flexbox or CSS Grid.

3. Add ONE JavaScript interaction:
   - Dark mode toggle (preferred)
   OR FAQ accordion

4. Custom CSS:
   - Modern color palette
   - Hover effects
   - Responsive below 768px

No frameworks.
Keep it clean and professional.

Create:
- index.html
- style.css
- script.js
🔹 PART 2 — React Frontend Prompt
Markdown

Build the React frontend for StudyMate using:

- Vite
- JavaScript
- Tailwind CSS
- Fetch API

Requirements:

Components:
- App
- NoteForm
- NoteCard

Features:
1. Fetch notes from GET /api/notes (useEffect)
2. Add note (title, subject, content)
3. Delete note
4. Search notes by title or subject (client-side filtering)
5. Show:
   - Loading state
   - Empty state ("No notes yet — add your first one!")

Use controlled components for forms.
Use async/await.
Clean Tailwind UI.
Responsive design.

Assume backend runs at:
http://localhost:5000
🔹 PART 3 — Express + MongoDB API Prompt
Markdown

Build the backend API for StudyMate using:

- Express
- MongoDB
- Mongoose
- dotenv
- CORS

Create a Note model:

title: String (required)
subject: String
content: String (required)
summary: String (optional)
createdAt: Date (default now)

Routes:

GET /api/notes
POST /api/notes
DELETE /api/notes/:id

Validation:
- If title or content is empty → return 400 JSON:
  { "error": "Title and content are required" }

Enable CORS for frontend.
Use .env for:
- PORT
- MONGO_URI
- OPENROUTER_API_KEY

Organize project properly.
Use async/await and error handling.
🔹 PART 4 — AI Integration Prompt
Markdown

Add AI summarization to StudyMate.

Create route:

POST /api/notes/:id/summarize

Steps:
1. Find note by ID
2. Send note.content to OpenRouter API using fetch
3. Model:
   nvidia/llama-nemotron-rerank-vl-1b-v2:free

Prompt the model:

"Summarize the following study note into exactly:
- 3 bullet points
- 1 quiz question

Keep it clear and concise.

Note:
{note content}"

Return structured text.

Save the summary inside the note document.
Return updated note.

Handle errors properly.
Use async/await.
🔹 PART 5 — MCP Server Prompt
Markdown

Build a Node.js MCP server over stdio.

Create tools:

1. list_notes
   - Fetch notes from:
     http://localhost:5000/api/notes
   - Return JSON list

2. create_note
   Input schema:
   {
     title: string,
     subject: string,
     content: string
   }

   - POST to backend API

Use proper MCP structure:
- Define tools
- Input schemas
- Handle tool calls
- Return structured responses

Ensure it runs with:
node index.js

Compatible with Claude Desktop.
🔹 PART 6 — README Prompt
Markdown

Write a professional README.md for StudyMate.

Include:

1. Project description
2. Tech stack
3. Features
4. Setup instructions:
   - Landing page
   - Server
   - Client
   - MCP server
5. .env.example explanation
6. Screenshots sections:
   - Landing page
   - App UI
   - AI summarize feature
   - MCP tool call proof

Clear formatting.
Professional tone.
Markdown best practices.
