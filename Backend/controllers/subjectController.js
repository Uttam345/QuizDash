import Subject from '../models/Subject.js';
import { validationResult } from 'express-validator';

// @desc    Get subjects by teacher
// @route   GET /api/subjects/teacher/:teacherId
// @access  Private
export const getSubjectsByTeacher = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const subjects = await Subject.find({ teacherId: req.params.teacherId })
      .sort({ name: 1 });

    res.json({ success: true, subjects });
  } catch (error) {
    const message = process.env.NODE_ENV === 'production' ? 'Server error' : error.message;
    res.status(500).json({ message, error: error.message });
  }
};

// @desc    Create subject
// @route   POST /api/subjects
// @access  Private (Teacher only)
export const createSubject = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, teacherId } = req.body;

    const subject = await Subject.create({
      name,
      teacherId,
    });

    res.status(201).json({ success: true, subject });
  } catch (error) {
    const message = process.env.NODE_ENV === 'production' ? 'Server error' : error.message;
    res.status(500).json({ message, error: error.message });
  }
};

// @desc    Delete subject
// @route   DELETE /api/subjects/:id
// @access  Private (Teacher only)
export const deleteSubject = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    await Subject.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Subject deleted successfully' });
  } catch (error) {
    const message = process.env.NODE_ENV === 'production' ? 'Server error' : error.message;
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
