# 📚 StudyMate — AI-Powered Study Notes App

StudyMate is a full-stack MERN application that lets students create, manage, and summarize study notes with AI. It features a React frontend, Express/MongoDB backend, an OpenRouter AI integration for summarization and quiz generation, and an MCP server for Claude Desktop integration.

---

## ✨ Features

- **Notes CRUD** — Create, read, delete, and search notes by title or subject
- **AI Summarization** — Generate 3 bullet-point summaries and 1 quiz question per note
- **Persistent Summaries** — AI results are saved to MongoDB and survive page refresh
- **Dark / Light Mode** — Toggleable theme with `prefers-color-scheme` detection
- **Landing Page** — Static marketing page with dark mode toggle
- **MCP Server** — Claude Desktop compatible tools (`list_notes`, `create_note`)

---

## 🏗 Tech Stack

| Layer       | Technology                                          |
| ----------- | --------------------------------------------------- |
| Frontend    | React 19, Vite 8, Tailwind CSS 4                    |
| Backend     | Node.js, Express 4, Mongoose 9                      |
| Database    | MongoDB                                             |
| AI          | OpenRouter API (`nvidia/llama-nemotron-rerank-vl-1b-v2:free`) |
| MCP Server  | Node.js, stdio transport                            |

---

## 📁 Project Structure

```
studymate/
├── landing/                  # Static marketing landing page
│   ├── index.html
│   ├── style.css
│   └── script.js
├── client/                   # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── NoteCard.jsx
│   │   │   └── NoteForm.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── server/                   # Express API
│   ├── models/
│   │   └── Note.js
│   ├── routes/
│   │   └── noteRoutes.js
│   ├── server.js
│   ├── .env.example
│   └── package.json
├── mcp-server/               # MCP server for Claude Desktop
│   └── index.js
├── .gitignore
├── CONTEXT.md
├── prompt.md
└── README.md
```

---

## 🚀 Setup Instructions

### Prerequisites

- Node.js ≥ 18
- MongoDB running locally (or a cloud URI)
- An [OpenRouter](https://openrouter.ai/) API key (free tier works)

---

### 1. Landing Page

No build step required. Open `landing/index.html` in a browser or serve it:

```bash
npx serve landing
```

---

### 2. Server

```bash
cd server
cp .env.example .env      # then edit .env with your values
npm install
npm run dev               # starts on http://localhost:5000
```

#### Environment Variables (`.env`)

| Variable             | Description                        |
| -------------------- | ---------------------------------- |
| `PORT`               | Server port (default `5000`)       |
| `MONGO_URI`          | MongoDB connection string          |
| `OPENROUTER_API_KEY` | Your OpenRouter API key            |
| `OPENROUTER_MODEL`   | OpenRouter model ID (optional, defaults to `google/gemma-2-9b-it:free`) |

Example `.env`:

```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/studymate
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

---

### 3. Client

```bash
cd client
npm install
npm run dev               # starts on http://localhost:5173
```

The client expects the backend at `http://localhost:5000`.

---

### 4. MCP Server

```bash
cd mcp-server
npm install
node index.js             # communicates over stdio
```

Configure in Claude Desktop's `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "studymate": {
      "command": "node",
      "args": ["path/to/studymate/mcp-server/index.js"]
    }
  }
}
```

Available tools:

- `list_notes` — fetches all notes from the API
- `create_note` — creates a new note (requires `title`, `subject`, `content`)

---

## 📸 Screenshots

### Landing Page
![Landing Page](./screenshots/landing.png)

### App UI — Notes Dashboard
![App UI](./screenshots/app-ui.png)

### AI Summarize Feature
![AI Summary](./screenshots/ai-summary.png)

### MCP Tool Call (Claude Desktop)
![MCP Tool Call](./screenshots/mcp-tool-call.png)

---

## 🧪 API Endpoints

| Method | Endpoint                  | Description              |
| ------ | ------------------------- | ------------------------ |
| GET    | `/api/notes`              | List all notes           |
| POST   | `/api/notes`              | Create a note            |
| PUT    | `/api/notes/:id`          | Update a note            |
| DELETE | `/api/notes/:id`          | Delete a note            |
| POST   | `/api/notes/:id/summarize`| Generate AI summary + quiz |

---

## 🧠 AI Prompt

The summarization endpoint sends the following prompt to `nvidia/llama-nemotron-rerank-vl-1b-v2:free`:

```
Summarize the following study note into exactly:
- 3 bullet points
- 1 quiz question

Keep it clear and concise.

Note:
{note content}
```

The response is saved to the note's `summary` field in MongoDB.

---

## 📝 License

MIT

