import mongoose from 'mongoose';
import QuizAttempt from '../models/QuizAttempt.js';
import Quiz from '../models/Quiz.js';
import Question from '../models/Question.js';
import { validationResult } from 'express-validator';

// @desc    Get attempt by quiz and student with detailed info
// @route   GET /api/attempts/quiz/:quizId/student/:studentId
// @access  Private
export const getAttemptByQuizAndStudent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { quizId, studentId } = req.params;

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(quizId) || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid quiz ID or student ID format' 
      });
    }

    // Use aggregation for complete data
    const attempts = await QuizAttempt.aggregate([
      {
        $match: {
          quizId: new mongoose.Types.ObjectId(quizId),
          studentId: new mongoose.Types.ObjectId(studentId)
        }
      },
      {
        $lookup: {
          from: 'questions',
          localField: 'questionIds',
          foreignField: '_id',
          as: 'questions'
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
        $unwind: { path: '$quiz', preserveNullAndEmptyArrays: true }
      },
      {
        $addFields: {
          id: '$_id',
          questions: {
            $map: {
              input: '$questions',
              as: 'q',
              in: { $mergeObjects: ['$$q', { id: '$$q._id' }] }
            }
          },
          quizTitle: '$quiz.title',
          totalMarks: '$quiz.totalMarks'
        }
      },
      {
        $project: {
          _id: 0,
          __v: 0,
          quiz: 0,
          'questions._id': 0,
          'questions.__v': 0
        }
      }
    ]);

    if (!attempts || attempts.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Attempt not found' 
      });
    }

    // Convert Map to Object for JSON response
    const attempt = attempts[0];
    if (attempt.answers && typeof attempt.answers === 'object') {
      attempt.answers = attempt.answers instanceof Map 
        ? Object.fromEntries(attempt.answers)
        : attempt.answers;
    }

    res.json({ success: true, attempt });
  } catch (error) {
    console.error('Get attempt by quiz and student error:', error);
    res.status(500).json({ 
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message 
    });
  }
};

// @desc    Get all attempts for a quiz with student details and analytics
// @route   GET /api/attempts/quiz/:quizId
// @access  Private (Teacher only)
export const getAttemptsByQuiz = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { quizId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid quiz ID format' 
      });
    }

    // Verify quiz exists
    const quiz = await Quiz.findById(quizId).lean();
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Aggregation pipeline with student details and rankings
    const attempts = await QuizAttempt.aggregate([
      {
        $match: {
          quizId: new mongoose.Types.ObjectId(quizId)
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      {
        $unwind: { path: '$student', preserveNullAndEmptyArrays: true }
      },
      {
        $addFields: {
          id: '$_id',
          student: {
            id: '$student._id',
            name: '$student.name',
            email: '$student.email'
          },
          duration: {
            $cond: {
              if: '$endTime',
              then: { $subtract: ['$endTime', '$startTime'] },
              else: null
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          __v: 0,
          'student._id': 0
        }
      },
      {
        $sort: { score: -1, achievedMarks: -1, createdAt: -1 }
      }
    ]);

    // Add rank to each attempt
    const attemptsWithRank = attempts
      .filter(a => a.submitted)
      .map((attempt, index) => ({
        ...attempt,
        rank: index + 1,
        answers: attempt.answers instanceof Map 
          ? Object.fromEntries(attempt.answers)
          : attempt.answers || {}
      }));

    // Calculate statistics
    const stats = {
      totalAttempts: attemptsWithRank.length,
      averageScore: attemptsWithRank.length > 0
        ? attemptsWithRank.reduce((sum, a) => sum + a.score, 0) / attemptsWithRank.length
        : 0,
      highestScore: attemptsWithRank.length > 0
        ? Math.max(...attemptsWithRank.map(a => a.score))
        : 0,
      lowestScore: attemptsWithRank.length > 0
        ? Math.min(...attemptsWithRank.map(a => a.score))
        : 0,
      averageDuration: attemptsWithRank.length > 0
        ? attemptsWithRank
            .filter(a => a.duration)
            .reduce((sum, a) => sum + a.duration, 0) / attemptsWithRank.filter(a => a.duration).length
        : 0
    };

    res.json({ 
      success: true, 
      attempts: attemptsWithRank,
      statistics: stats,
      quiz: {
        id: quiz._id,
        title: quiz.title,
        totalMarks: quiz.totalMarks
      }
    });
  } catch (error) {
    console.error('Get attempts by quiz error:', error);
    res.status(500).json({ 
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message 
    });
  }
};

// @desc    Save/Create attempt with validation
// @route   POST /api/attempts
// @access  Private
export const saveAttempt = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const attemptData = req.body;

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(attemptData.quizId) || 
        !mongoose.Types.ObjectId.isValid(attemptData.studentId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid quiz ID or student ID format' 
      });
    }

    // Validate quiz exists and is released
    const quiz = await Quiz.findById(attemptData.quizId).lean();
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    if (!quiz.isReleased) {
      return res.status(403).json({
        success: false,
        message: 'Quiz is not released yet'
      });
    }

    // Check if attempt already exists
    const existingAttempt = await QuizAttempt.findOne({
      quizId: attemptData.quizId,
      studentId: attemptData.studentId
    });

    let attempt;
    
    if (existingAttempt) {
      // Update existing attempt - don't update startTime
      const updateData = { ...attemptData };
      delete updateData.startTime; // Never update startTime
      
      attempt = await QuizAttempt.findByIdAndUpdate(
        existingAttempt._id,
        { $set: updateData },
        { new: true, runValidators: true }
      ).lean();
    } else {
      // Create new attempt
      const newAttempt = new QuizAttempt({
        ...attemptData,
        startTime: attemptData.startTime || Date.now(),
        createdAt: new Date()
      });
      attempt = await newAttempt.save();
      attempt = attempt.toObject();
    }

    // Transform response
    const responseAttempt = {
      ...attempt,
      id: attempt._id.toString(),
      answers: attempt.answers instanceof Map 
        ? Object.fromEntries(attempt.answers)
        : attempt.answers || {}
    };
    delete responseAttempt._id;
    delete responseAttempt.__v;

    res.status(existingAttempt ? 200 : 201).json({ 
      success: true, 
      attempt: responseAttempt 
    });
  } catch (error) {
    console.error('Save attempt error:', error);
    res.status(500).json({ 
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message 
    });
  }
};

// @desc    Update attempt with validation
// @route   PUT /api/attempts/:id
// @access  Private
export const updateAttempt = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const updates = req.body;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid attempt ID format' 
      });
    }

    // Don't allow updating startTime
    delete updates.startTime;

    // Check attempt exists
    const existingAttempt = await QuizAttempt.findById(id).lean();
    if (!existingAttempt) {
      return res.status(404).json({ 
        success: false,
        message: 'Attempt not found' 
      });
    }

    // Prevent updates to submitted attempts
    if (existingAttempt.submitted && updates.submitted === false) {
      return res.status(400).json({
        success: false,
        message: 'Cannot unsubmit an already submitted attempt'
      });
    }

    // Update attempt
    const attempt = await QuizAttempt.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).lean();

    // Transform response
    const responseAttempt = {
      ...attempt,
      id: attempt._id,
      answers: attempt.answers instanceof Map 
        ? Object.fromEntries(attempt.answers)
        : attempt.answers || {}
    };
    delete responseAttempt._id;
    delete responseAttempt.__v;

    res.json({ success: true, attempt: responseAttempt });
  } catch (error) {
    console.error('Update attempt error:', error);
    res.status(500).json({ 
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message 
    });
  }
};
