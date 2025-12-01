import React, { useState, useEffect, useMemo } from 'react';
import { Quiz, Question, QuestionType, Difficulty } from '../types';
import { apiCreateQuiz } from '../services/apiService';
import Button from './common/Button';
import Modal from './common/Modal';

interface CreateQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherId: string;
  classId: string;
  onCreateQuiz: (quiz: Quiz) => void;
  questions: Question[];
}

const CreateQuizModal: React.FC<CreateQuizModalProps> = ({ isOpen, onClose, teacherId, classId, onCreateQuiz, questions }) => {
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(30);
  const [tabSwitchThreshold, setTabSwitchThreshold] = useState(3);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  
  const availableSubjects = useMemo(() => {
    return [...new Set(questions.map(q => q.subject))].sort();
  }, [questions]);
  
  const difficultyOrder = {
    [Difficulty.Easy]: 1,
    [Difficulty.Medium]: 2,
    [Difficulty.Hard]: 3,
  };

  const questionsInSubject = useMemo(() => {
    if (!selectedSubject) return [];
    return questions
      .filter(q => q.subject === selectedSubject)
      .sort((a, b) => {
          const difficultyA = difficultyOrder[a.difficulty];
          const difficultyB = difficultyOrder[b.difficulty];

          if (difficultyA !== difficultyB) {
              return difficultyA - difficultyB;
          }

          return a.marks - b.marks;
      });
  }, [questions, selectedSubject]);

  const selectedQuestionsData = useMemo(() => {
    return questionsInSubject.filter(q => selectedQuestionIds.includes(q.id));
  }, [questionsInSubject, selectedQuestionIds]);
  
  const totalMarks = useMemo(() => {
    return selectedQuestionsData.reduce((sum, q) => sum + q.marks, 0);
  }, [selectedQuestionsData]);

  useEffect(() => {
    if(isOpen) {
        setTitle('');
        setDuration(30);
        setTabSwitchThreshold(3);
        setSelectedSubject(availableSubjects[0] || '');
        setSelectedQuestionIds([]);
    }
  }, [isOpen, availableSubjects]);

  const handleToggleQuestion = (questionId: string) => {
    setSelectedQuestionIds(prev =>
        prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };
  
  const handleCreate = async () => {
    if (title.trim() === '' || !selectedSubject) {
        alert('Please provide a title and select a subject.');
        return;
    }
    if (selectedQuestionIds.length === 0) {
        alert('Please select at least one question for the quiz.');
        return;
    }

    setIsCreating(true);
    try {
      const newQuiz = await apiCreateQuiz({
        title,
        durationMinutes: duration,
        tabSwitchThreshold,
        classId,
        createdBy: teacherId,
        subject: selectedSubject,
        questionIds: selectedQuestionIds,
        totalMarks,
      });
      onCreateQuiz(newQuiz);
      onClose();
    } catch (err: any) {
      console.error('Error creating quiz:', err);
      alert(err.message || 'Failed to create quiz');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Quiz" size="xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-400">Quiz Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 mt-1" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-400">Subject</label>
                <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 mt-1">
                    <option value="" disabled>-- Select a Subject --</option>
                    {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400">Duration (Minutes)</label>
              <input type="number" value={duration} min="1" onChange={e => setDuration(parseInt(e.target.value))} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 mt-1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400">Tab Switch Limit</label>
              <input type="number" value={tabSwitchThreshold} min="1" onChange={e => setTabSwitchThreshold(parseInt(e.target.value))} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 mt-1" />
            </div>
        </div>
        
        <div className="pt-2">
            <h3 className="text-lg font-semibold text-indigo-300">Select Questions</h3>
            <div className="max-h-64 overflow-y-auto mt-2 p-2 bg-gray-900/50 rounded-lg space-y-2">
                {questionsInSubject.length > 0 ? questionsInSubject.map(q => (
                    <div key={q.id} className={`p-2 rounded-md flex items-start gap-3 cursor-pointer ${selectedQuestionIds.includes(q.id) ? 'bg-indigo-900/70' : 'bg-gray-700'}`} onClick={() => handleToggleQuestion(q.id)}>
                        <input type="checkbox" readOnly checked={selectedQuestionIds.includes(q.id)} className="mt-1 form-checkbox h-5 w-5 text-indigo-500 bg-gray-800 border-gray-600 rounded focus:ring-indigo-500"/>
                        <div className="flex-1">
                            <p className="text-sm">{q.text}</p>
                            <p className="text-xs text-gray-400">{q.difficulty} | {q.type} | {q.marks} {q.marks > 1 ? 'marks' : 'mark'}</p>
                        </div>
                    </div>
                )) : (
                    <p className="text-center text-gray-500 py-8">No questions available for "{selectedSubject}".</p>
                )}
            </div>
            <div className="text-right text-sm mt-2 font-medium text-gray-300">
                Selected: {selectedQuestionIds.length} questions | Total Marks: {totalMarks}
            </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={onClose} disabled={isCreating}>Cancel</Button>
          <Button onClick={handleCreate} disabled={isCreating || !selectedSubject || selectedQuestionIds.length === 0}>
            {isCreating ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </span>
            ) : 'Create Quiz'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateQuizModal;