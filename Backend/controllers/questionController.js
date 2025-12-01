import mongoose from 'mongoose';
import Question from '../models/Question.js';
import Quiz from '../models/Quiz.js';
import { validationResult } from 'express-validator';

// @desc    Get questions by author with usage stats
// @route   GET /api/questions/author/:authorId
// @access  Private
export const getQuestionsByAuthor = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { authorId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(authorId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid author ID format' 
      });
    }

    // Aggregation pipeline to get questions with usage count
    const questions = await Question.aggregate([
      {
        $match: { authorId: new mongoose.Types.ObjectId(authorId) }
      },
      {
        $lookup: {
          from: 'quizzes',
          localField: '_id',
          foreignField: 'questionIds',
          as: 'quizzes'
        }
      },
      {
        $addFields: {
          id: '$_id',
          usageCount: { $size: '$quizzes' }
        }
      },
      {
        $project: {
          _id: 0,
          __v: 0,
          quizzes: 0
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    res.json({ success: true, questions });
  } catch (error) {
    console.error('Get questions by author error:', error);
    res.status(500).json({ 
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message 
    });
  }
};

// @desc    Get questions by subject with filters
// @route   GET /api/questions/subject/:subject
// @access  Private
export const getQuestionsBySubject = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { subject } = req.params;
    const { authorId, difficulty, type } = req.query;

    // Build match conditions
    const matchConditions = { subject };
    if (authorId) matchConditions.authorId = new mongoose.Types.ObjectId(authorId);
    if (difficulty) matchConditions.difficulty = difficulty;
    if (type) matchConditions.type = type;

    // Aggregation pipeline
    const questions = await Question.aggregate([
      { $match: matchConditions },
      {
        $addFields: {
          id: '$_id'
        }
      },
      {
        $project: {
          _id: 0,
          __v: 0
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    res.json({ success: true, questions });
  } catch (error) {
    console.error('Get questions by subject error:', error);
    res.status(500).json({ 
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message 
    });
  }
};

// @desc    Get questions by IDs (batch) with validation
// @route   POST /api/questions/batch
// @access  Private
export const getQuestionsByIds = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { questionIds } = req.body;

    // Validate array is not empty
    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Question IDs array is required'
      });
    }

    // Validate all ObjectIds
    const invalidIds = questionIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'One or more invalid question IDs',
        invalidIds
      });
    }

    // Convert to ObjectIds
    const objectIds = questionIds.map(id => new mongoose.Types.ObjectId(id));

    // Use aggregation for consistent response format
    const questions = await Question.aggregate([
      {
        $match: { _id: { $in: objectIds } }
      },
      {
        $addFields: {
          id: '$_id'
        }
      },
      {
        $project: {
          _id: 0,
          __v: 0
        }
      }
    ]);

    res.json({ success: true, questions });
  } catch (error) {
    console.error('Get questions by IDs error:', error);
    res.status(500).json({ 
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message 
    });
  }
};

// @desc    Create question
// @route   POST /api/questions
// @access  Private (Teacher only)
export const createQuestion = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const questionData = req.body;

    const question = await Question.create(questionData);

    res.status(201).json({ success: true, question });
  } catch (error) {
    const message = process.env.NODE_ENV === 'production' ? 'Server error' : error.message;
    res.status(500).json({ message });
  }
};

// @desc    Delete question with validation
// @route   DELETE /api/questions/:id
// @access  Private (Teacher only)
export const deleteQuestion = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;

    // Check if question exists
    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ 
        success: false,
        message: 'Question not found' 
      });
    }

    // Check if question is used in any quiz
    const quizzesUsingQuestion = await Quiz.find({ 
      questionIds: id 
    }).select('title').lean();

    if (quizzesUsingQuestion.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete question. It is used in ${quizzesUsingQuestion.length} quiz(es)`,
        quizzes: quizzesUsingQuestion.map(q => ({ id: q._id, title: q.title }))
      });
    }

    // Delete question
    await Question.findByIdAndDelete(id);

    res.json({ 
      success: true, 
      message: 'Question deleted successfully' 
    });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ 
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Server error' : error.message 
    });
  }
};
