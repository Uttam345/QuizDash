import React, { useState, useEffect } from 'react';
import { Quiz, QuizAttempt, User } from '../types';
import { apiGetAttemptsByQuiz, apiGetUserById } from '../services/apiService';
import Modal from './common/Modal';
import Button from './common/Button';

interface QuizResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: Quiz;
}

const QuizResultsModal: React.FC<QuizResultsModalProps> = ({ isOpen, onClose, quiz }) => {
  const [attempts, setAttempts] = useState<(QuizAttempt & { studentName: string })[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadAttempts = async () => {
      if (isOpen) {
        setIsLoading(true);
        try {
          const quizAttempts = await apiGetAttemptsByQuiz(quiz.id);
          const attemptsWithNames = quizAttempts
            .filter(a => a.submitted)
            .map(attempt => {
              // Backend returns student object with name
              const studentName = attempt.student && attempt.student.name 
                ? attempt.student.name 
                : 'Unknown Student';
              return {
                ...attempt,
                studentName,
              };
            });
          setAttempts(attemptsWithNames);
        } catch (error) {
          console.error('Error loading attempts:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadAttempts();
  }, [isOpen, quiz.id]);
  
  const downloadCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Student Name,Marks Obtained,Total Marks,Tab Switches,Submission Time\r\n";
    
    attempts.forEach(attempt => {
        const submissionTime = attempt.endTime ? new Date(attempt.endTime).toLocaleString() : 'N/A';
        const row = `${attempt.studentName},${attempt.achievedMarks},${quiz.totalMarks},${attempt.tabSwitches},"${submissionTime}"`;
        csvContent += row + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${quiz.title.replace(/\s+/g, '_')}_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Results for ${quiz.title}`} size="xl">
        <div className="mb-4 flex justify-end">
            <Button onClick={downloadCSV} disabled={attempts.length === 0}>Export to CSV</Button>
        </div>
      {attempts.length > 0 ? (
        <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm text-left text-gray-300">
                <thead className="text-xs text-indigo-300 uppercase bg-gray-700 sticky top-0">
                    <tr>
                        <th scope="col" className="px-6 py-3">Student</th>
                        <th scope="col" className="px-6 py-3">Score</th>
                        <th scope="col" className="px-6 py-3">Tab Switches</th>
                        <th scope="col" className="px-6 py-3">Submitted At</th>
                    </tr>
                </thead>
                <tbody>
                    {attempts.map(attempt => (
                        <tr key={attempt.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-600">
                            <td className="px-6 py-4 font-medium whitespace-nowrap">{attempt.studentName}</td>
                            <td className={`px-6 py-4 font-bold ${attempt.score > 70 ? 'text-green-400' : attempt.score > 40 ? 'text-yellow-400' : 'text-red-400'}`}>{attempt.achievedMarks} / {quiz.totalMarks}</td>
                            <td className={`px-6 py-4 ${attempt.tabSwitches > 3 ? 'text-red-400 font-bold' : ''}`}>{attempt.tabSwitches}</td>
                            <td className="px-6 py-4">{attempt.endTime ? new Date(attempt.endTime).toLocaleString() : 'N/A'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      ) : (
        <p className="text-center text-gray-400 py-8">No completed attempts for this quiz yet.</p>
      )}
    </Modal>
  );
};

export default QuizResultsModal;