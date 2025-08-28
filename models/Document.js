const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  documentId: {
    type: String,
    required: true,
    unique: true,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  originalImagePath: {
    type: String,
    required: true
  },
  extractedText: {
    type: String,
    required: false
  },
  userPrompt: {
    type: String,
    required: true
  },
  analysis: {
    summary: String,
    explanation: String,
    keyPoints: [String],
    concepts: [String]
  },
  quizQuestions: [{
    type: {
      type: String,
      enum: ['mcq', 'short_answer', 'flashcard'],
      required: true
    },
    question: {
      type: String,
      required: true
    },
    options: [String],
    correctAnswer: String,
    explanation: String
  }],
  youtubeVideos: [{
    title: String,
    videoId: String,
    channelTitle: String,
    viewCount: Number,
    publishedAt: Date,
    thumbnailUrl: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
documentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Document', documentSchema);