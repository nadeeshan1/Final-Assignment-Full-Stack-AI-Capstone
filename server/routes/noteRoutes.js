import { Router } from 'express';
import Note from '../models/Note.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const notes = await Note.find().sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const note = await Note.create(req.body);
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const note = await Note.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const note = await Note.findByIdAndDelete(req.params.id);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({ message: 'Note deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/summarize', async (req, res) => {
  try {
    const { id } = req.params;

    const note = await Note.findById(id);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (!note.content || note.content.trim() === '') {
      return res.status(400).json({ error: 'Note content is empty' });
    }

    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'nvidia/llama-nemotron-rerank-vl-1b-v2:free',
        max_tokens: 300,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful study assistant.',
          },
          {
            role: 'user',
            content: `Summarize the following study note into exactly:
- 3 bullet points
- 1 quiz question

Keep it clear and concise.

Note:
${note.content}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.text();
      console.error('OpenRouter API error:', errorData);
      return res.status(500).json({ error: 'Failed to generate summary from AI' });
    }

    const data = await aiResponse.json();
    const aiText = data?.choices?.[0]?.message?.content?.trim();

    if (!aiText) {
      return res.status(500).json({ error: 'Invalid AI response format' });
    }

    note.summary = aiText;
    await note.save();

    res.json(note);
  } catch (error) {
    console.error('Summarize error:', error);
    res.status(500).json({ error: 'Server error during summarization' });
  }
});

export default router;
