import { useState } from 'react'

const NoteForm = ({ onNoteAdded }) => {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch('http://localhost:5000/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          subject: subject.trim(),
          content: content.trim(),
        }),
      })
      if (!res.ok) throw new Error('Failed to create note')
      const note = await res.json()
      onNoteAdded(note)
      setTitle('')
      setSubject('')
      setContent('')
    } catch (err) {
      console.error('Failed to add note:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="panel-card note-form">
      <h2 className="note-form-title">New Note</h2>
      <div className="note-form-fields">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="field-input"
        />
        <input
          type="text"
          placeholder="Subject (optional)"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="field-input"
        />
        <textarea
          placeholder="Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={4}
          className="field-input field-textarea"
        />
        <button
          type="submit"
          disabled={submitting}
          className="btn-gradient"
        >
          {submitting ? 'Adding...' : 'Add Note'}
        </button>
      </div>
    </form>
  )
}

export default NoteForm
