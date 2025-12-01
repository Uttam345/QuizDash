import mongoose from 'mongoose';
import Class from '../models/Class.js';
import User from '../models/User.js';
import Quiz from '../models/Quiz.js';
import QuizAttempt from '../models/QuizAttempt.js';
import { validationResult } from 'express-validator';

// @desc    Get classes by teacher with student count
// @route   GET /api/classes/teacher/:teacherId
// @access  Private
export const getClassesByTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid teacher ID format' 
      });
    }

    // Aggregation pipeline for efficient data retrieval
    const classes = await Class.aggregate([
      {
        $match: { teacherId: new mongoose.Types.ObjectId(teacherId) }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'classIds',
          as: 'students'
        }
      },
      {
        $lookup: {
          from: 'quizzes',
          localField: '_id',
          foreignField: 'classId',
          as: 'quizzes'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'teacherId',
          foreignField: '_id',
          as: 'teacher'
        }
      },
      {
        $unwind: '$teacher'
      },
      {
        $addFields: {
          id: '$_id',
          studentCount: { $size: '$students' },
          quizCount: { $size: '$quizzes' },
          teacherId: '$teacher._id',
          teacherName: '$teacher.name',
          teacherEmail: '$teacher.email'
        }
      },
      {
        $project: {
          _id: 0,
          __v: 0,
          students: 0,
          quizzes: 0,
          teacher: 0
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    res.json({ success: true, classes });
  } catch (error) {
    console.error('Get classes by teacher error:', error);
    res.status(500).json({ 
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message 
    });
  }
};

// @desc    Get classes by student with quiz stats
// @route   GET /api/classes/student/:studentId
// @access  Private
export const getClassesByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid student ID format' 
      });
    }

    // Check if student exists
    const student = await User.findById(studentId).lean();
    if (!student) {
      return res.status(404).json({ 
        success: false,
        message: 'Student not found' 
      });
    }

    // Aggregation pipeline for student's classes with stats
    const classes = await Class.aggregate([
      {
        $match: { 
          _id: { $in: student.classIds } 
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'teacherId',
          foreignField: '_id',
          as: 'teacher'
        }
      },
      {
        $lookup: {
          from: 'quizzes',
          let: { classId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$classId', '$$classId'] },
                isReleased: true
              }
            }
          ],
          as: 'activeQuizzes'
        }
      },
      {
        $unwind: '$teacher'
      },
      {
        $addFields: {
          id: '$_id',
          teacherId: '$teacher._id',
          teacherName: '$teacher.name',
          teacherEmail: '$teacher.email',
          activeQuizCount: { $size: '$activeQuizzes' }
        }
      },
      {
        $project: {
          _id: 0,
          __v: 0,
          teacher: 0,
          activeQuizzes: 0
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    res.json({ success: true, classes });
  } catch (error) {
    console.error('Get classes by student error:', error);
    res.status(500).json({ 
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message 
    });
  }
};

// @desc    Get students by class with performance metrics
// @route   GET /api/classes/:classId/students
// @access  Private
export const getStudentsByClass = async (req, res) => {
  try {
    const { classId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid class ID format' 
      });
    }

    // Aggregation pipeline to get students with their quiz attempt statistics
    const students = await User.aggregate([
      {
        $match: {
          classIds: new mongoose.Types.ObjectId(classId),
          role: 'student'
        }
      },
      {
        $lookup: {
          from: 'quizattempts',
          let: { studentId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$studentId', '$$studentId'] },
                submitted: true
              }
            },
            {
              $lookup: {
                from: 'quizzes',
                localField: 'quizId',
                foreignField: '_id',
                as: 'quiz'
              }
            },
            {
              $unwind: '$quiz'
            },
            {
              $match: {
                'quiz.classId': new mongoose.Types.ObjectId(classId)
              }
            }
          ],
          as: 'attempts'
        }
      },
      {
        $addFields: {
          id: '$_id',
          totalAttempts: { $size: '$attempts' },
          averageScore: {
            $cond: {
              if: { $gt: [{ $size: '$attempts' }, 0] },
              then: { $avg: '$attempts.score' },
              else: 0
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          __v: 0,
          password: 0,
          sessionToken: 0,
          attempts: 0
        }
      },
      {
        $sort: { name: 1 }
      }
    ]);

    res.json({ success: true, students });
  } catch (error) {
    console.error('Get students by class error:', error);
    res.status(500).json({ 
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message 
    });
  }
};

// @desc    Create new class
// @route   POST /api/classes
// @access  Private (Teacher only)
export const createClass = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array() 
      });
    }

    const { name, teacherId } = req.body;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false,
        message: 'Invalid teacher ID format' 
      });
    }

    // Verify teacher exists
    const teacher = await User.findById(teacherId).session(session);
    if (!teacher || teacher.role !== 'teacher') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Invalid teacher ID'
      });
    }

    // Generate unique join code with retry logic
    const generateJoinCode = () => {
      return Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    let joinCode;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      joinCode = generateJoinCode();
      const existingClass = await Class.findOne({ joinCode }).session(session);
      if (!existingClass) break;
      attempts++;
    }

    if (attempts === maxAttempts) {
      await session.abortTransaction();
      return res.status(500).json({
        success: false,
        message: 'Failed to generate unique join code. Please try again.'
      });
    }

    // Create class
    const [newClass] = await Class.create([{
      name,
      teacherId,
      joinCode,
    }], { session });

    // Add class to teacher's classIds
    await User.findByIdAndUpdate(
      teacherId,
      { $addToSet: { classIds: newClass._id } },
      { session }
    );

    await session.commitTransaction();

    // Fetch with populated data
    const populatedClass = await Class.findById(newClass._id)
      .populate('teacherId', 'name email')
      .lean();

    // Transform response
    const responseClass = {
      ...populatedClass,
      id: populatedClass._id,
      teacherId: populatedClass.teacherId._id,
      teacherName: populatedClass.teacherId.name,
      teacherEmail: populatedClass.teacherId.email
    };
    delete responseClass._id;
    delete responseClass.__v;

    res.status(201).json({ success: true, class: responseClass });
  } catch (error) {
    await session.abortTransaction();
    console.error('Create class error:', error);
    res.status(500).json({ 
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message 
    });
  } finally {
    session.endSession();
  }
};

// @desc    Update class
// @route   PUT /api/classes/:id
// @access  Private (Teacher only)
export const updateClass = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array() 
      });
    }

    const { name } = req.body;

    const classToUpdate = await Class.findById(req.params.id);

    if (!classToUpdate) {
      return res.status(404).json({ message: 'Class not found' });
    }

    classToUpdate.name = name || classToUpdate.name;
    await classToUpdate.save();

    res.json({ success: true, class: classToUpdate });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete class with cascading operations
// @route   DELETE /api/classes/:id
// @access  Private (Teacher only)
export const deleteClass = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    // Verify class exists
    const classToDelete = await Class.findById(id).session(session);
    if (!classToDelete) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false,
        message: 'Class not found' 
      });
    }

    // Delete all quizzes and their attempts associated with this class
    const quizzes = await Quiz.find({ classId: id }).session(session);
    const quizIds = quizzes.map(q => q._id);

    // Delete quiz attempts
    if (quizIds.length > 0) {
      await QuizAttempt.deleteMany({ quizId: { $in: quizIds } }, { session });
    }

    // Delete quizzes
    await Quiz.deleteMany({ classId: id }, { session });

    // Remove class from all users' classIds
    await User.updateMany(
      { classIds: id },
      { $pull: { classIds: id } },
      { session }
    );

    // Delete the class
    await Class.findByIdAndDelete(id, { session });

    await session.commitTransaction();

    res.json({ 
      success: true, 
      message: 'Class and all associated data deleted successfully' 
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Delete class error:', error);
    res.status(500).json({ 
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message 
    });
  } finally {
    session.endSession();
  }
};

// @desc    Join class with code
// @route   POST /api/classes/join
// @access  Private (Student only)
export const joinClass = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array() 
      });
    }

    const { studentId, joinCode } = req.body;

    // Validate input
    if (!studentId || !joinCode) {
      return res.status(400).json({ 
        success: false, 
        message: 'Student ID and join code are required' 
      });
    }

    // Validate join code format (6 alphanumeric characters)
    const trimmedCode = joinCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(trimmedCode)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid join code format. Code must be 6 alphanumeric characters.' 
      });
    }

    // Find class by join code
    const classToJoin = await Class.findOne({ joinCode: trimmedCode })
      .populate('teacherId', 'name email');

    if (!classToJoin) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invalid join code. Class not found.' 
      });
    }

    // Find student
    const student = await User.findById(studentId);

    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found' 
      });
    }

    // Verify student role
    if (student.role !== 'student') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only students can join classes' 
      });
    }

    // Check if already enrolled
    const isAlreadyEnrolled = student.classIds.some(
      classId => classId.toString() === classToJoin._id.toString()
    );

    if (isAlreadyEnrolled) {
      return res.status(400).json({ 
        success: false, 
        message: 'You are already enrolled in this class.' 
      });
    }

    // Add class to student's classIds
    student.classIds.push(classToJoin._id);
    await student.save();

    res.json({ 
      success: true, 
      message: `Successfully joined ${classToJoin.name}`,
      class: {
        id: classToJoin._id,
        name: classToJoin.name,
        teacherId: classToJoin.teacherId._id,
        teacherName: classToJoin.teacherId.name,
        joinCode: classToJoin.joinCode,
      },
    });
  } catch (error) {
    console.error('Join class error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while joining class',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};
