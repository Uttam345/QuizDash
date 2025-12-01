import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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

// Optimized indexes
subjectSchema.index({ teacherId: 1, createdAt: -1 }); // Teacher's subjects sorted
subjectSchema.index({ name: 1, teacherId: 1 }, { unique: true }); // Unique subject per teacher
subjectSchema.index({ name: 'text' }); // Text search on subject names

const Subject = mongoose.model('Subject', subjectSchema);

export default Subject;
