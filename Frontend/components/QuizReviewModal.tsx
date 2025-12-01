import React, { useState, useEffect } from 'react';
import { Quiz, QuizAttempt, Question, QuestionType, QuestionOption } from '../types';
import { apiGetQuestionsByIds } from '../services/apiService';
import Modal from './common/Modal';

interface QuizReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: Quiz;
  attempt: QuizAttempt;
}

const QuizReviewModal: React.FC<QuizReviewModalProps> = ({ isOpen, onClose, quiz, attempt }) => {
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    const loadQuestions = async () => {
      if (isOpen && attempt.questionIds) {
        try {
          const quizQuestions = await apiGetQuestionsByIds(attempt.questionIds);
          setQuestions(quizQuestions);
        } catch (error) {
          console.error('Error loading questions:', error);
        }
      }
    };
    loadQuestions();
  }, [isOpen, attempt.questionIds]);
  
  const renderAnswers = (question: Question) => {
    const studentAnswer = attempt.answers[question.id];

    if (question.type === QuestionType.FillInTheBlank) {
      const isCorrect = typeof studentAnswer === 'string' && studentAnswer.trim().toLowerCase() === question.correctAnswerText?.trim().toLowerCase();
      return (
        <div className="mt-2 space-y-2">
            <div className={`p-2 rounded border-2 ${isCorrect ? 'bg-green-900/50 border-green-700' : 'bg-red-900/50 border-red-700'}`}>
                <p className="text-xs text-gray-400">Your Answer:</p>
                <p>{studentAnswer as string || "No answer"}</p>
            </div>
            {!isCorrect && (
                <div className="p-2 rounded bg-gray-600">
                    <p className="text-xs text-gray-400">Correct Answer:</p>
                    <p>{question.correctAnswerText}</p>
                </div>
            )}
        </div>
      );
    }

    const getOptionStyle = (optIndex: number) => {
      let isCorrect = false;
      let isSelected = false;

      if (question.type === QuestionType.SingleCorrect) {
        isCorrect = optIndex === question.correctAnswerIndex;
        isSelected = optIndex === studentAnswer;
      } else if (question.type === QuestionType.MultipleCorrect) {
        isCorrect = question.correctAnswerIndices?.includes(optIndex) ?? false;
        isSelected = (studentAnswer as number[] || []).includes(optIndex);
      }
      
      // Case 1: Correct and Selected (Student's correct answer)
      if (isCorrect && isSelected) return 'bg-green-900/70 border-green-500';
      // Case 3: Incorrect and Selected (Student's wrong answer)
      if (!isCorrect && isSelected) return 'bg-red-900/70 border-red-500';
      // Case 2: Correct and Not Selected (The correct answer the student missed)
      if (isCorrect && !isSelected) return 'bg-gray-700 border-green-500';
      // Case 4: Incorrect and Not Selected (A neutral wrong option)
      return 'bg-gray-700 border-gray-600';
    };

    return question.options.map((option, optIndex) => (
      <div key={optIndex} className={`p-3 rounded-md border-2 text-sm flex items-center gap-3 ${getOptionStyle(optIndex)}`}>
        {option.imageUrl && <img src={option.imageUrl} alt={`Option ${optIndex+1}`} className="h-16 w-16 object-contain rounded-md bg-gray-800 p-1"/>}
        <span className="flex-1">{option.text}</span>
      </div>
    ));
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Review: ${quiz.title}`} size="xl">
        <div className="mb-4 flex justify-between items-center bg-gray-900 p-3 rounded-md">
            <h3 className="text-lg font-semibold text-indigo-300">Your Score</h3>
            <p className="text-gray-300 text-xl font-bold">{attempt.achievedMarks} / {quiz.totalMarks}</p>
        </div>
        <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-6">
            {questions.map((q, index) => (
                <div key={q.id} className="bg-gray-800 p-4 rounded-lg">
                    <p className="font-semibold mb-3">
                        <span className="text-gray-400 mr-2">Q{index + 1}. ({q.marks} {q.marks > 1 ? 'marks' : 'mark'})</span> 
                        {q.text}
                    </p>
                     {q.imageUrl && (
                        <div className="my-2 max-w-xs">
                            <img src={q.imageUrl} alt="Question visual aid" className="max-w-full rounded-lg" />
                        </div>
                     )}
                    <div className="space-y-2 mt-3">
                        {renderAnswers(q)}
                    </div>
                </div>
            ))}
        </div>
    </Modal>
  );
};

export default QuizReviewModal;