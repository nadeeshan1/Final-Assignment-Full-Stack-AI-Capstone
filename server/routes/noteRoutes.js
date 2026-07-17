import { Router } from 'express';
import Note from '../models/Note.js';

const router = Router();

const MAX_BULLET_WORDS = 20;

const compactText = (value) => value.replace(/\s+/g, ' ').trim();

const stripPrefix = (line) => line
  .replace(/^[-*•]\s+/, '')
  .replace(/^\d+[.)]\s+/, '')
  .replace(/^summary\s*:?\s*/i, '')
  .replace(/^quiz\s*:?\s*/i, '')
  .replace(/^q\s*[:.-]\s*/i, '')
  .trim();

const truncateWords = (text, maxWords = MAX_BULLET_WORDS) => {
  const words = compactText(text).split(' ').filter(Boolean);
  if (words.length <= maxWords) return words.join(' ');
  return `${words.slice(0, maxWords).join(' ')}...`;
};

const extractSentenceCandidates = (text) => {
  const clean = compactText(text);
  if (!clean) return [];

  return clean
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .map((sentence) => sentence.replace(/[.!?]+$/, '').trim())
    .filter(Boolean);
};

const normalizeSummaryOutput = (rawText, note) => {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const bullets = [];
  let question = '';

  for (const line of lines) {
    if (!question && /\?\s*$/.test(line)) {
      question = stripPrefix(line);
    }

    if (/^[-*•]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) {
      const cleaned = stripPrefix(line);
      if (cleaned) bullets.push(cleaned);
    }
  }

  if (bullets.length < 3) {
    const aiSentencePool = extractSentenceCandidates(rawText);
    for (const sentence of aiSentencePool) {
      if (bullets.length >= 3) break;
      if (!bullets.includes(sentence)) {
        bullets.push(sentence);
      }
    }
  }

  if (bullets.length < 3) {
    const noteSentencePool = extractSentenceCandidates(note.content);
    for (const sentence of noteSentencePool) {
      if (bullets.length >= 3) break;
      if (!bullets.includes(sentence)) {
        bullets.push(sentence);
      }
    }
  }

  while (bullets.length < 3) {
    bullets.push('Key concept from the note should be reviewed and remembered.');
  }

  const finalBullets = bullets.slice(0, 3).map((bullet) => truncateWords(bullet));

  if (!question) {
    const fallbackTopic = note.subject || note.title || 'this note';
    question = `What is the most important idea in ${fallbackTopic} and how would you explain it?`;
  }

  if (!question.endsWith('?')) {
    question = `${question.replace(/[.]+$/, '')}?`;
  }

  const normalizedQuestion = compactText(question);

  return `Summary:\n- ${finalBullets[0]}\n- ${finalBullets[1]}\n- ${finalBullets[2]}\nQuiz:\nQ: ${normalizedQuestion}`;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findKeywordNotes = async (query) => {
  const cleanQuery = (query || '').trim();

  if (!cleanQuery) {
    return Note.find().sort({ createdAt: -1 });
  }

  const pattern = new RegExp(escapeRegex(cleanQuery), 'i');
  return Note.find({
    $or: [
      { title: pattern },
      { subject: pattern },
      { content: pattern },
      { summary: pattern },
    ],
  }).sort({ createdAt: -1 });
};

const extractSelectedIds = (text) => {
  if (!text) return [];

  const tryParse = (candidate) => {
    try {
      const parsed = JSON.parse(candidate);
      if (!Array.isArray(parsed?.selectedIds)) return [];
      return parsed.selectedIds
        .map((id) => String(id).trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  };

  const direct = tryParse(text);
  if (direct.length) return direct;

  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    const fromFence = tryParse(fenced[1]);
    if (fromFence.length) return fromFence;
  }

  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch?.[0]) {
    return tryParse(objectMatch[0]);
  }

  return [];
};

router.get('/search-ai', async (req, res) => {
  try {
    const query = String(req.query.q || '').trim();

    if (!query) {
      const notes = await Note.find().sort({ createdAt: -1 });
      return res.json({ mode: 'normal', notes });
    }

    const allNotes = await Note.find().sort({ createdAt: -1 });
    if (!allNotes.length) {
      return res.json({ mode: 'normal', notes: [] });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      const fallbackNotes = await findKeywordNotes(query);
      return res.json({
        mode: 'fallback',
        notes: fallbackNotes,
        warning: 'OPENROUTER_API_KEY missing. Showing normal search results.',
      });
    }

    const candidates = allNotes.slice(0, 80).map((note) => ({
      id: String(note._id),
      title: note.title,
      subject: note.subject || '',
      contentPreview: (note.content || '').slice(0, 280),
      summaryPreview: (note.summary || '').slice(0, 200),
    }));

    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'nvidia/llama-nemotron-rerank-vl-1b-v2:free',
        max_tokens: 250,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: 'You rank note relevance for search. Return only JSON.',
          },
          {
            role: 'user',
            content: `User query: ${query}\n\nChoose up to 12 most relevant note IDs from the candidate notes.\nReturn JSON only in this shape:\n{"selectedIds":["id1","id2"]}\n\nCandidate notes:\n${JSON.stringify(candidates)}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.text();
      console.error('AI search provider error:', errorData);
      const fallbackNotes = await findKeywordNotes(query);
      return res.json({
        mode: 'fallback',
        notes: fallbackNotes,
        warning: 'AI search failed. Showing normal search results.',
      });
    }

    const data = await aiResponse.json();
    const content = data?.choices?.[0]?.message?.content || '';
    const selectedIds = extractSelectedIds(content);

    if (!selectedIds.length) {
      const fallbackNotes = await findKeywordNotes(query);
      return res.json({
        mode: 'fallback',
        notes: fallbackNotes,
        warning: 'AI search returned invalid format. Showing normal search results.',
      });
    }

    const byId = new Map(allNotes.map((note) => [String(note._id), note]));
    const rankedNotes = selectedIds
      .map((id) => byId.get(id))
      .filter(Boolean);

    if (!rankedNotes.length) {
      const fallbackNotes = await findKeywordNotes(query);
      return res.json({
        mode: 'fallback',
        notes: fallbackNotes,
        warning: 'No AI matches found. Showing normal search results.',
      });
    }

    return res.json({ mode: 'ai', notes: rankedNotes });
  } catch (error) {
    console.error('AI search error:', error);
    const fallbackNotes = await findKeywordNotes(String(req.query.q || ''));
    return res.json({
      mode: 'fallback',
      notes: fallbackNotes,
      warning: 'AI search error. Showing normal search results.',
    });
  }
});

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
    const apiKey = process.env.OPENROUTER_API_KEY;

    const note = await Note.findById(id);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (!note.content || note.content.trim() === '') {
      return res.status(400).json({ error: 'Note content is empty' });
    }

    let aiText = '';
    let warning = '';

    if (!apiKey) {
      warning = 'OPENROUTER_API_KEY is not configured. Generated fallback summary.';
    } else {
      try {
        const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: process.env.OPENROUTER_MODEL || 'nvidia/llama-nemotron-rerank-vl-1b-v2:free',
            max_tokens: 300,
            temperature: 0.2,
            messages: [
              {
                role: 'system',
                content: 'You are a strict study assistant. Follow the requested output format exactly.',
              },
              {
                role: 'user',
                content: `Create a concise study output from this note.

Return plain text only in this exact format:
Summary:
- <bullet 1>
- <bullet 2>
- <bullet 3>
Quiz:
Q: <one quiz question>

Rules:
- Exactly 3 summary bullets and exactly 1 question.
- Keep each bullet under 20 words.
- Do not include answers, introductions, numbering, markdown headings, or extra sections.

Note title: ${note.title}
Note subject: ${note.subject || 'N/A'}
Note content:
${note.content}`,
              },
            ],
          }),
        });

        if (!aiResponse.ok) {
          const errorData = await aiResponse.text();
          console.error('OpenRouter API error:', errorData);
          warning = 'AI provider failed. Generated fallback summary.';
        } else {
          const data = await aiResponse.json();
          aiText = data?.choices?.[0]?.message?.content?.trim() || '';
          if (!aiText) {
            warning = 'AI response was empty. Generated fallback summary.';
          }
        }
      } catch (providerError) {
        console.error('OpenRouter request error:', providerError);
        warning = 'AI request error. Generated fallback summary.';
      }
    }

    note.summary = normalizeSummaryOutput(aiText, note);
    await note.save();

    const responseNote = note.toObject();
    res.json({
      ...responseNote,
      summarySource: aiText ? 'ai' : 'fallback',
      warning: warning || undefined,
    });
  } catch (error) {
    console.error('Summarize error:', error);
    res.status(500).json({ error: 'Server error during summarization' });
  }
});

export default router;
