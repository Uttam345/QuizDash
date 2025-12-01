import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
  },
  questionIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  }],
  durationMinutes: {
    type: Number,
    required: true,
    min: 1,
  },
  tabSwitchThreshold: {
    type: Number,
    required: true,
    default: 3,
  },
  totalMarks: {
    type: Number,
    required: true,
    min: 0,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  isReleased: {
    type: Boolean,
    default: false,
  },
  answersReleased: {
    type: Boolean,
    default: false,
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

// Comprehensive indexes for query optimization
quizSchema.index({ classId: 1, createdAt: -1 }); // Class quizzes sorted
quizSchema.index({ createdBy: 1, createdAt: -1 }); // Teacher's quizzes sorted
quizSchema.index({ classId: 1, isReleased: 1 }); // Released quizzes per class
quizSchema.index({ isReleased: 1, answersReleased: 1 }); // Quiz status queries
quizSchema.index({ subject: 1, classId: 1 }); // Subject-based filtering
quizSchema.index({ title: 'text', subject: 'text' }); // Text search

const Quiz = mongoose.model('Quiz', quizSchema);

export default Quiz;
