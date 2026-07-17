import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  subject: {
    type: String,
    trim: true,
  },
  content: {
    type: String,
    required: true,
  },
  summary: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create a text index for MongoDB full-text search with relevance scoring
noteSchema.index({ title: 'text', subject: 'text', content: 'text', summary: 'text' });

export default mongoose.model('Note', noteSchema);
