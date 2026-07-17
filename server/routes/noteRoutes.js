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

const findTextSearchNotes = async (query) => {
  const cleanQuery = (query || '').trim();
  if (!cleanQuery) return [];

  // MongoDB full-text search with relevance scoring
  try {
    const textResults = await Note.find(
      { $text: { $search: cleanQuery } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(30);

    if (textResults.length > 0) return textResults;
  } catch {
    // text index may not be built yet, fall through to regex
  }

  // Fallback to regex if text search returns nothing
  return findKeywordNotes(cleanQuery);
};

const extractJsonField = (text, fieldName) => {
  if (!text) return [];

  const tryParse = (candidate) => {
    try {
      const parsed = JSON.parse(candidate);
      if (!Array.isArray(parsed?.[fieldName])) return [];
      return parsed[fieldName]
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

    // Search the database using the query (case-insensitive regex)
    const dbResults = await findKeywordNotes(query);

    if (!dbResults.length) {
      return res.json({ mode: 'normal', notes: [] });
    }

    return res.json({ mode: 'ai', notes: dbResults });
  } catch (error) {
    console.error('AI search error:', error);
    const fallbackNotes = await findKeywordNotes(String(req.query.q || ''));
    return res.json({
      mode: 'fallback',
      notes: fallbackNotes,
      warning: 'Search error. Showing database search results.',
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
    const updateData = { ...req.body };

    if (updateData.content) {
      updateData.summary = '';
    }

    const note = await Note.findByIdAndUpdate(req.params.id, updateData, {
      returnDocument: 'after',
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
      const OPENROUTER_MODELS = [
        process.env.OPENROUTER_MODEL,
        'google/gemma-4-26b-a4b-it:free',
        'nvidia/nemotron-nano-9b-v2:free',
        'meta-llama/llama-3.2-3b-instruct:free',
      ].filter(Boolean);

      for (const model of OPENROUTER_MODELS) {
        try {
          const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
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

          if (aiResponse.ok) {
            const data = await aiResponse.json();
            aiText = data?.choices?.[0]?.message?.content?.trim() || '';
            if (aiText) break;
          } else {
            const errorData = await aiResponse.text();
            console.error(`OpenRouter summarize model ${model} error (${aiResponse.status}):`, errorData);
          }
        } catch (providerError) {
          console.error(`OpenRouter summarize model ${model} fetch error:`, providerError);
        }
      }

      if (!aiText) {
        warning = 'AI provider failed. Generated fallback summary.';
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
