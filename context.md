# 🧠 StudyMate — AI-Powered Study Notes App

## Overview

StudyMate is a full-stack MERN application where students can:

- Create, view, search, and delete study notes
- Generate AI summaries + quiz questions for notes
- Manage notes via an MCP server connected to Claude Desktop

This project is built as part of an academy full-stack assessment.

---

## 🏗 Tech Stack

### Frontend
- React (Vite)
- JavaScript
- Tailwind CSS
- Fetch API

### Backend
- Node.js
- Express.js
- MongoDB + Mongoose
- CORS
- dotenv

### AI Integration
- OpenRouter API (via fetch)
- Model: `nvidia/llama-nemotron-rerank-vl-1b-v2:free`

### MCP Server
- Node.js
- stdio transport
- Custom tools:
  - list_notes
  - create_note

---

## 📁 Project Structure

studymate/
├── landing/            
│   ├── index.html
│   ├── style.css
│   └── script.js
├── client/             
├── server/             
│   ├── server.js
│   ├── models/Note.js
│   └── .env.example
├── mcp-server/         
│   └── index.js
└── README.md

---

## ✅ Core Features

### Notes CRUD
- GET /api/notes
- POST /api/notes
- DELETE /api/notes/:id
- (Optional bonus) PUT /api/notes/:id

### Validation
- Title and content required
- Return 400 JSON error if invalid

### AI Feature
- POST /api/notes/:id/summarize
- Sends note content to OpenRouter
- Returns:
  - 3 bullet-point summary
  - 1 quiz question
- Saves summary in database

### MCP Tools
- list_notes
- create_note

---

## 🔐 Environment Variables (.env)

Server:

PORT=5000
MONGO_URI=your_mongodb_connection
OPENROUTER_API_KEY=your_openrouter_key

Never commit real .env.
Commit only `.env.example`.

---

## 🎯 UI Requirements

- Tailwind CSS styling
- Responsive layout
- Loading states
- Empty states
- "Summarizing..." button state
- Clean modern UI

---

## 🧠 AI Prompt Requirement

The model must return:
- Exactly 3 bullet points
- 1 quiz question
- Clean readable formatting

---

## ✅ Coding Rules

- Use async/await
- Proper error handling
- Organized folders (models, routes optional)
- Clean readable code
- Meaningful commit messages

---

This project must be production-ready and easy to review.