import mongoose from 'mongoose';
import Quiz from '../models/Quiz.js';
import Question from '../models/Question.js';
import QuizAttempt from '../models/QuizAttempt.js';
import { validationResult } from 'express-validator';

// @desc    Get quizzes by class with attempt statistics
// @route   GET /api/quizzes/class/:classId
// @access  Private
export const getQuizzesByClass = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { classId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid class ID format' 
      });
    }

    // Aggregation pipeline to get quizzes with attempt statistics
    const quizzes = await Quiz.aggregate([
      {
        $match: { classId: new mongoose.Types.ObjectId(classId) }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'creator'
        }
      },
      {
        $lookup: {
          from: 'quizattempts',
          let: { quizId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$quizId', '$$quizId'] },
                submitted: true
              }
            },
            {
              $group: {
                _id: null,
                totalAttempts: { $sum: 1 },
                averageScore: { $avg: '$score' },
                highestScore: { $max: '$score' },
                lowestScore: { $min: '$score' }
              }
            }
          ],
          as: 'stats'
        }
      },
      {
        $unwind: { 
          path: '$creator',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          id: '$_id',
          createdBy: {
            id: '$creator._id',
            name: '$creator.name',
            email: '$creator.email'
          },
          statistics: {
            $cond: {
              if: { $gt: [{ $size: '$stats' }, 0] },
              then: { $arrayElemAt: ['$stats', 0] },
              else: {
                totalAttempts: 0,
                averageScore: 0,
                highestScore: 0,
                lowestScore: 0
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          __v: 0,
          creator: 0,
          stats: 0
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    res.json({ success: true, quizzes });
  } catch (error) {
    console.error('Get quizzes by class error:', error);
    res.status(500).json({ 
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message 
    });
  }
};

// @desc    Get quiz by ID with populated questions
// @route   GET /api/quizzes/:id
// @access  Private
export const getQuiz = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid quiz ID format' 
      });
    }

    // Aggregation pipeline for complete quiz data
    const quizzes = await Quiz.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(id) }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'creator'
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
          from: 'classes',
          localField: 'classId',
          foreignField: '_id',
          as: 'class'
        }
      },
      {
        $unwind: { path: '$creator', preserveNullAndEmptyArrays: true }
      },
      {
        $unwind: { path: '$class', preserveNullAndEmptyArrays: true }
      },
      {
        $addFields: {
          id: '$_id',
          createdBy: {
            id: '$creator._id',
            name: '$creator.name',
            email: '$creator.email'
          },
          className: '$class.name',
          questions: {
            $map: {
              input: '$questions',
              as: 'q',
              in: {
                $mergeObjects: [
                  '$$q',
                  { id: '$$q._id' }
                ]
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          __v: 0,
          creator: 0,
          class: 0,
          'questions._id': 0,
          'questions.__v': 0
        }
      }
    ]);

    if (!quizzes || quizzes.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Quiz not found' 
      });
    }

    res.json({ success: true, quiz: quizzes[0] });
  } catch (error) {
    console.error('Get quiz by ID error:', error);
    res.status(500).json({ 
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message 
    });
  }
};

// @desc    Create quiz with validation
// @route   POST /api/quizzes
// @access  Private (Teacher only)
export const createQuiz = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Quiz validation errors:', JSON.stringify(errors.array(), null, 2));
      console.error('Request body:', JSON.stringify(req.body, null, 2));
      await session.abortTransaction();
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const quizData = req.body;

    // Validate that all questions exist
    const questions = await Question.find({ 
      _id: { $in: quizData.questionIds } 
    }).session(session);

    if (questions.length !== quizData.questionIds.length) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'One or more questions not found'
      });
    }

    // Validate class exists
    const classExists = await mongoose.model('Class').findById(quizData.classId).session(session);
    if (!classExists) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Calculate total marks if not provided
    if (!quizData.totalMarks) {
      quizData.totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
    }

    // Create quiz
    const [quiz] = await Quiz.create([quizData], { session });

    await session.commitTransaction();

    // Fetch populated quiz data
    const populatedQuiz = await Quiz.aggregate([
      { $match: { _id: quiz._id } },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'creator'
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
      { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          id: '$_id',
          createdBy: {
            id: '$creator._id',
            name: '$creator.name',
            email: '$creator.email'
          },
          questions: {
            $map: {
              input: '$questions',
              as: 'q',
              in: { $mergeObjects: ['$$q', { id: '$$q._id' }] }
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          __v: 0,
          creator: 0,
          'questions._id': 0,
          'questions.__v': 0
        }
      }
    ]);

    res.status(201).json({ success: true, quiz: populatedQuiz[0] });
  } catch (error) {
    await session.abortTransaction();
    console.error('Create quiz error:', error);
    res.status(500).json({ 
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message 
    });
  } finally {
    session.endSession();
  }
};

// @desc    Update quiz
// @route   PUT /api/quizzes/:id
// @access  Private (Teacher only)
export const updateQuiz = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const updates = req.body;

    // Check quiz exists
    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ 
        success: false,
        message: 'Quiz not found' 
      });
    }

    // Don't allow updates to released quizzes with attempts
    if (quiz.isReleased) {
      const hasAttempts = await QuizAttempt.exists({ quizId: id });
      if (hasAttempts) {
        return res.status(400).json({
          success: false,
          message: 'Cannot update quiz that has been attempted by students'
        });
      }
    }

    // Update quiz
    const updatedQuiz = await Quiz.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).lean();

    // Transform response
    const responseQuiz = {
      ...updatedQuiz,
      id: updatedQuiz._id
    };
    delete responseQuiz._id;
    delete responseQuiz.__v;

    res.json({ success: true, quiz: responseQuiz });
  } catch (error) {
    console.error('Update quiz error:', error);
    res.status(500).json({ 
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message 
    });
  }
};

// @desc    Update quiz status (release/answers)
// @route   PUT /api/quizzes/:id/status
// @access  Private (Teacher only)
export const updateQuizStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const { isReleased, answersReleased } = req.body;

    const quiz = await Quiz.findById(id).lean();
    if (!quiz) {
      return res.status(404).json({ 
        success: false,
        message: 'Quiz not found' 
      });
    }

    // Validate business logic
    if (answersReleased && !isReleased && !quiz.isReleased) {
      return res.status(400).json({
        success: false,
        message: 'Cannot release answers before releasing the quiz'
      });
    }

    // Build update object
    const updateObj = {};
    if (isReleased !== undefined) updateObj.isReleased = isReleased;
    if (answersReleased !== undefined) updateObj.answersReleased = answersReleased;

    // Update quiz
    const updatedQuiz = await Quiz.findByIdAndUpdate(
      id,
      updateObj,
      { new: true, runValidators: true }
    ).lean();

    // Transform response
    const responseQuiz = {
      ...updatedQuiz,
      id: updatedQuiz._id
    };
    delete responseQuiz._id;
    delete responseQuiz.__v;

    res.json({ success: true, quiz: responseQuiz });
  } catch (error) {
    console.error('Update quiz status error:', error);
    res.status(500).json({ 
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message 
    });
  }
};

// @desc    Delete quiz with cascading
// @route   DELETE /api/quizzes/:id
// @access  Private (Teacher only)
export const deleteQuiz = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    const quiz = await Quiz.findById(id).session(session);
    if (!quiz) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false,
        message: 'Quiz not found' 
      });
    }

    // Delete all attempts for this quiz
    await QuizAttempt.deleteMany({ quizId: id }, { session });

    // Delete the quiz
    await Quiz.findByIdAndDelete(id, { session });

    await session.commitTransaction();

    res.json({ 
      success: true, 
      message: 'Quiz and all associated attempts deleted successfully' 
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Delete quiz error:', error);
    res.status(500).json({ 
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message 
    });
  } finally {
    session.endSession();
  }
};
