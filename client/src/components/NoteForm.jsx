import { useState, useEffect } from 'react'

const NoteForm = ({ onNoteAdded, editingNote, onNoteUpdated, onCancelEdit }) => {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (editingNote) {
      setTitle(editingNote.title || '')
      setSubject(editingNote.subject || '')
      setContent(editingNote.content || '')
    } else {
      setTitle('')
      setSubject('')
      setContent('')
    }
  }, [editingNote])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return

    setSubmitting(true)
    try {
      if (editingNote) {
        const res = await fetch(`http://localhost:5000/api/notes/${editingNote._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            subject: subject.trim(),
            content: content.trim(),
          }),
        })
        if (!res.ok) throw new Error('Failed to update note')
        const note = await res.json()
        onNoteUpdated(note)
        onCancelEdit()
      } else {
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
      }
    } catch (err) {
      console.error('Failed to save note:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="panel-card note-form">
      <div className="note-form-head">
        <h2 className="note-form-title">
          {editingNote ? 'Edit Note' : 'New Note'}
        </h2>
        {editingNote && (
          <button type="button" onClick={onCancelEdit} className="cancel-edit-btn">
            Cancel
          </button>
        )}
      </div>
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
          {submitting
            ? (editingNote ? 'Updating...' : 'Adding...')
            : (editingNote ? 'Update Note' : 'Add Note')}
        </button>
      </div>
    </form>
  )
}

export default NoteForm
