import mongoose from 'mongoose';

const questionOptionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String, // Base64 data URI or external URL (max 2MB image = ~3.5MB base64)
    default: null,
  },
}, { _id: false });

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['single-correct', 'multiple-correct', 'fill-in-the-blank'],
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String, // Base64 data URI or external URL (max 2MB image = ~3.5MB base64)
    default: null,
    // Note: MongoDB BSON document limit is 16MB, so storing 2MB images as base64 (~3.5MB) is safe
  },
  options: [questionOptionSchema],
  correctAnswerIndex: {
    type: Number,
    default: null,
  },
  correctAnswerIndices: [{
    type: Number,
  }],
  correctAnswerText: {
    type: String,
    default: null,
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    required: true,
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  marks: {
    type: Number,
    required: true,
    min: 1,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Comprehensive indexes for efficient querying
questionSchema.index({ authorId: 1, createdAt: -1 }); // Author's questions sorted
questionSchema.index({ subject: 1, authorId: 1 }); // Subject filtering per author
questionSchema.index({ authorId: 1, subject: 1, difficulty: 1 }); // Multi-field filtering
questionSchema.index({ difficulty: 1, marks: 1 }); // Difficulty-based queries
questionSchema.index({ type: 1, subject: 1 }); // Question type filtering
questionSchema.index({ text: 'text' }); // Full-text search on question text

const Question = mongoose.model('Question', questionSchema);

export default Question;
