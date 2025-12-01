import mongoose from 'mongoose';

const quizAttemptSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  answers: {
    type: Map,
    of: mongoose.Schema.Types.Mixed, // Can be Number, [Number], or String
    default: {},
  },
  score: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  achievedMarks: {
    type: Number,
    default: 0,
    min: 0,
  },
  startTime: {
    type: Number,
    required: true,
  },
  endTime: {
    type: Number,
    default: null,
  },
  tabSwitches: {
    type: Number,
    default: 0,
  },
  submitted: {
    type: Boolean,
    default: false,
  },
  questionIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
  }],
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

// Comprehensive indexes for performance
quizAttemptSchema.index({ quizId: 1, studentId: 1 }, { unique: true }); // One attempt per student per quiz
quizAttemptSchema.index({ studentId: 1, submitted: 1, createdAt: -1 }); // Student's attempts
quizAttemptSchema.index({ quizId: 1, submitted: 1, score: -1 }); // Quiz leaderboard
quizAttemptSchema.index({ quizId: 1, createdAt: -1 }); // Recent attempts for quiz
quizAttemptSchema.index({ submitted: 1, endTime: 1 }); // Completed attempts
quizAttemptSchema.index({ score: -1, achievedMarks: -1 }); // High score queries

const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);

export default QuizAttempt;
