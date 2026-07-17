import { useState, useEffect } from 'react'
import NoteForm from './components/NoteForm'
import NoteCard from './components/NoteCard'

function App() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchMode, setSearchMode] = useState('normal')
  const [aiSearchLoading, setAiSearchLoading] = useState(false)
  const [aiSearchWarning, setAiSearchWarning] = useState('')
  const [aiSearchResults, setAiSearchResults] = useState([])
  const [editingNote, setEditingNote] = useState(null)
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    fetchNotes()
  }, [])

  useEffect(() => {
    const savedTheme = localStorage.getItem('studymate-theme')
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme)
      document.documentElement.setAttribute('data-theme', savedTheme)
      return
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initialTheme = prefersDark ? 'dark' : 'light'
    setTheme(initialTheme)
    document.documentElement.setAttribute('data-theme', initialTheme)
    localStorage.setItem('studymate-theme', initialTheme)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('studymate-theme', theme)
  }, [theme])

  useEffect(() => {
    const revealEls = document.querySelectorAll('.reveal-on-scroll')
    if (!revealEls.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15 }
    )

    revealEls.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [notes.length, search, loading])

  const fetchNotes = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/notes')
      if (!res.ok) throw new Error('Failed to fetch notes')
      const data = await res.json()
      setNotes(data)
    } catch (err) {
      console.error('Failed to fetch notes:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleNoteAdded = (note) => {
    setNotes((prev) => [note, ...prev])
  }

  const handleDelete = (id) => {
    setNotes((prev) => prev.filter((n) => n._id !== id))
  }

  const handleStartEdit = (note) => {
    setEditingNote(note)
  }

  const handleCancelEdit = () => {
    setEditingNote(null)
  }

  const handleNoteUpdated = (updatedNote) => {
    setNotes((prev) =>
      prev.map((n) => (n._id === updatedNote._id ? updatedNote : n))
    )

    setAiSearchResults((prev) =>
      prev.map((n) => (n._id === updatedNote._id ? updatedNote : n))
    )
  }

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const filteredNotes = notes.filter((note) => {
    const q = search.toLowerCase()
    return (
      note.title.toLowerCase().includes(q) ||
      (note.subject && note.subject.toLowerCase().includes(q)) ||
      note.content.toLowerCase().includes(q) ||
      (note.summary && note.summary.toLowerCase().includes(q))
    )
  })

  useEffect(() => {
    if (searchMode !== 'ai') {
      setAiSearchLoading(false)
      setAiSearchWarning('')
      return
    }

    const trimmed = search.trim()
    if (!trimmed) {
      setAiSearchResults([])
      setAiSearchWarning('')
      setAiSearchLoading(false)
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setAiSearchLoading(true)
      setAiSearchWarning('')
      try {
        const res = await fetch(
          `http://localhost:5000/api/notes/search-ai?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        )

        if (!res.ok) {
          throw new Error('AI search failed')
        }

        const data = await res.json()
        // Always store results regardless of mode (fallback/ai/normal)
        setAiSearchResults(Array.isArray(data.notes) ? data.notes : [])
        setAiSearchWarning(data.warning || '')
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('AI search error:', err)
          setAiSearchResults(filteredNotes) // fallback to filtered notes
          setAiSearchWarning('AI search unavailable. Showing normal search results.')
        }
      } finally {
        setAiSearchLoading(false)
      }
    }, 350)

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [search, searchMode, filteredNotes])

  // In AI mode, show AI search results. If they're empty, fallback to filtered notes.
  const displayNotes = searchMode === 'ai' && search.trim()
    ? (aiSearchResults.length > 0 ? aiSearchResults : filteredNotes)
    : filteredNotes

  return (
    <div className="app-shell">
      <div className="gradient-bg" aria-hidden="true" />
      <div className="floating-shapes" aria-hidden="true">
        <span className="shape shape-1" />
        <span className="shape shape-2" />
        <span className="shape shape-3" />
      </div>

      <header className="app-header">
        <div className="app-container header-inner">
          <div className="brand-wrap">
            <h1 className="brand-title">Study<span className="gradient-text">Mate</span></h1>
            <p className="brand-subtitle">AI-Powered Study Notes</p>
          </div>

          <button
            type="button"
            className="theme-btn"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            <svg className="icon-sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
            <svg className="icon-moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </button>
        </div>
      </header>

      <main className="app-container app-main">
        <aside className="hero-fade">
          <div className="hero-badge">AI-Powered Learning</div>
          <NoteForm
            onNoteAdded={handleNoteAdded}
            editingNote={editingNote}
            onNoteUpdated={handleNoteUpdated}
            onCancelEdit={handleCancelEdit}
          />
        </aside>

        <section className="hero-fade delay-1">
          <div className="search-bar-wrap">
            <input
              type="text"
              placeholder={searchMode === 'ai' ? 'AI search notes by meaning...' : 'Search notes by title, subject, or content...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
            <div className="search-mode-toggle" role="group" aria-label="Search mode">
              <button
                type="button"
                className={`mode-btn ${searchMode === 'normal' ? 'active' : ''}`}
                onClick={() => setSearchMode('normal')}
                aria-label="Normal search"
                title="Normal search"
                data-tooltip="Normal search"
              >
                <svg className="mode-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </button>
              <button
                type="button"
                className={`mode-btn ${searchMode === 'ai' ? 'active' : ''}`}
                onClick={() => setSearchMode('ai')}
                aria-label="AI search"
                title="AI search"
                data-tooltip="AI search"
              >
                <svg className="mode-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 3l1.8 3.8L18 8.5l-3 2.8.8 4.2-3.8-2-3.8 2 .8-4.2-3-2.8 4.2-1.7L12 3z" />
                  <path d="M19 14l.9 1.9 2.1.8-1.5 1.4.4 2.1-1.9-1-1.9 1 .4-2.1-1.5-1.4 2.1-.8L19 14z" />
                </svg>
              </button>
            </div>
          </div>
          {searchMode === 'ai' && search.trim() && (
            <p className="search-mode-hint">
              {aiSearchWarning || 'Showing AI-ranked results.'}
            </p>
          )}

          {loading ? (
            <div className="loading-wrap">
              <div className="loading-spinner" />
            </div>
          ) : displayNotes.length === 0 ? (
            <div className="empty-state reveal-on-scroll is-visible">
              {aiSearchLoading ? (
                <p>AI is searching notes...</p>
              ) : search ? (
                <p>No notes match your search.</p>
              ) : (
                <p>No notes yet - add your first one!</p>
              )}
            </div>
          ) : (
            <div className="notes-list">
              {displayNotes.map((note, index) => (
                <div
                  key={note._id}
                  className="reveal-on-scroll"
                  style={{ '--stagger-delay': `${Math.min(index, 8) * 80}ms` }}
                >
                  <NoteCard note={note} onDelete={handleDelete} onSummarized={handleNoteUpdated} onEdit={handleStartEdit} />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App