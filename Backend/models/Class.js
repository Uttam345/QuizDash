import mongoose from 'mongoose';

const classSchema = new mongoose.Schema({
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
  joinCode: {
    type: String,
    required: true,
    uppercase: true,
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

// Indexes for optimal query performance
classSchema.index({ teacherId: 1, createdAt: -1 }); // Teacher's classes sorted by date
classSchema.index({ joinCode: 1 }, { unique: true }); // Fast join code lookup
classSchema.index({ name: 'text' }); // Text search on class names

const Class = mongoose.model('Class', classSchema);

export default Class;
