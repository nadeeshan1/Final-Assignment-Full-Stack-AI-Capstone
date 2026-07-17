import { useEffect, useState } from 'react'

const NoteCard = ({ note, onDelete, onSummarized }) => {
  const [summary, setSummary] = useState(note.summary || '')
  const [summarizing, setSummarizing] = useState(false)
  const [summarizeError, setSummarizeError] = useState('')
  const [summarizeInfo, setSummarizeInfo] = useState('')

  useEffect(() => {
    setSummary(note.summary || '')
  }, [note.summary])

  const handleDelete = async () => {
    try {
      await fetch(`http://localhost:5000/api/notes/${note._id}`, {
        method: 'DELETE',
      })
      onDelete(note._id)
    } catch (err) {
      console.error('Failed to delete note:', err)
    }
  }

  const handleSummarize = async () => {
    setSummarizing(true)
    setSummarizeError('')
    setSummarizeInfo('')
    try {
      const res = await fetch(`http://localhost:5000/api/notes/${note._id}/summarize`, {
        method: 'POST',
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to summarize')
      }
      const updatedNote = await res.json()
      setSummary(updatedNote.summary)
      if (onSummarized) onSummarized(updatedNote)
      if (updatedNote.warning) {
        setSummarizeInfo(updatedNote.warning)
      }
    } catch (err) {
      setSummarizeError(err.message || 'Failed to summarize note')
      console.error('Failed to summarize note:', err)
    } finally {
      setSummarizing(false)
    }
  }

  return (
    <article className="panel-card note-card">
      <div className="note-card-head">
        <div className="note-card-content">
          <h3 className="note-title" title={note.title}>
            {note.title}
          </h3>
          {note.subject && (
            <span className="subject-pill">
              {note.subject}
            </span>
          )}
        </div>
        <button
          onClick={handleDelete}
          className="delete-btn"
          aria-label="Delete note"
        >
          <svg className="delete-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
      <p className="note-body">
        {note.content}
      </p>
      {summary && (
        <div className="summary-box">
          <div className="summary-box-head">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            AI Summary & Quiz
          </div>
          <p className="summary-text">{summary}</p>
        </div>
      )}
      {summarizeInfo && <p className="summary-info">{summarizeInfo}</p>}
      {summarizeError && <p className="summary-error">{summarizeError}</p>}
      {!summary && (
        <button
          onClick={handleSummarize}
          disabled={summarizing}
          className="summarize-btn"
        >
          {summarizing ? 'Summarizing...' : 'Summarize'}
        </button>
      )}
    </article>
  )
}

export default NoteCard
