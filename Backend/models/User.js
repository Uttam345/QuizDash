import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email address'
    ],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
  },
  role: {
    type: String,
    enum: {
      values: ['student', 'teacher'],
      message: '{VALUE} is not a valid role'
    },
    required: [true, 'Role is required'],
  },
  classIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
  }],
  sessionToken: {
    type: String,
    default: null,
  },
  lastLogin: {
    type: Date,
    default: null,
  },
  lastLogout: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      delete ret.password; // Don't expose password in JSON
      return ret;
    }
  }
});

// Comprehensive indexes for user queries
userSchema.index({ email: 1 }, { unique: true }); // Fast email lookup for login
userSchema.index({ role: 1, createdAt: -1 }); // Role-based user lists
userSchema.index({ sessionToken: 1 }); // Session validation
userSchema.index({ classIds: 1, role: 1 }); // Students/teachers in a class
userSchema.index({ name: 'text', email: 'text' }); // Text search for users

const User = mongoose.model('User', userSchema);

export default User;
