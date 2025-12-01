
import React, { useState, useEffect } from 'react';
import { User, Quiz, QuizAttempt, ClassWithTeacherName } from '../types';
import { 
  apiGetStudentClasses, 
  apiJoinClass, 
  apiGetQuizzesByClass, 
  apiGetAttemptByQuizAndStudent 
} from '../services/apiService';
import Button from './common/Button';
import QuizTaker from './QuizTaker';
import Modal from './common/Modal';
import QuizReviewModal from './QuizReviewModal';

interface StudentDashboardProps {
  student: User;
  onLogout: () => void;
  refreshUser: () => void;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ student, onLogout, refreshUser }) => {
  const [classes, setClasses] = useState<ClassWithTeacherName[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassWithTeacherName | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  
  const [classQuizzes, setClassQuizzes] = useState<Quiz[]>([]);
  const [classAttempts, setClassAttempts] = useState<{ [quizId: string]: QuizAttempt | undefined }>({});

  const [isJoinClassModalOpen, setJoinClassModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinClassError, setJoinClassError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  
  const [isReviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewData, setReviewData] = useState<{ quiz: Quiz, attempt: QuizAttempt } | null>(null);

  // Load classes from API
  const loadClasses = async () => {
    try {
      const studentClasses = await apiGetStudentClasses(student.id);
      setClasses(studentClasses);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  useEffect(() => {
    loadClasses();
  }, [student.id]);

  useEffect(() => {
    const loadClassQuizzes = async () => {
      if (selectedClass) {
        try {
          // Load quizzes for the selected class
          const quizzes = await apiGetQuizzesByClass(selectedClass.id);
          setClassQuizzes(quizzes);

          // Load attempts for each quiz
          const attemptsForClass: { [quizId: string]: QuizAttempt | undefined } = {};
          for (const quiz of quizzes) {
            try {
              const attempt = await apiGetAttemptByQuizAndStudent(quiz.id, student.id);
              attemptsForClass[quiz.id] = attempt;
            } catch (error) {
              // No attempt exists yet for this quiz
              attemptsForClass[quiz.id] = undefined;
            }
          }
          setClassAttempts(attemptsForClass);
        } catch (error) {
          console.error('Error loading class quizzes:', error);
          setClassQuizzes([]);
          setClassAttempts({});
        }
      } else {
        setClassQuizzes([]);
        setClassAttempts({});
      }
    };

    loadClassQuizzes();
  }, [selectedClass, student.id]);

  const handleJoinClass = async () => {
    setJoinClassError('');
    
    // Validate join code format
    const trimmedCode = joinCode.trim().toUpperCase();
    
    if (!trimmedCode) {
      setJoinClassError('Please enter a join code.');
      return;
    }

    if (trimmedCode.length !== 6) {
      setJoinClassError('Join code must be exactly 6 characters.');
      return;
    }

    if (!/^[A-Z0-9]{6}$/.test(trimmedCode)) {
      setJoinClassError('Join code must contain only letters and numbers.');
      return;
    }

    setIsJoining(true);

    try {
      const result = await apiJoinClass(student.id, trimmedCode);
      
      if (result.success) {
        setJoinClassModalOpen(false);
        setJoinCode('');
        // Reload classes
        await loadClasses();
        // Refresh user data
        refreshUser();
      } else {
        setJoinClassError(result.message);
      }
    } catch (error: any) {
      setJoinClassError(error.message || 'Failed to join class. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };
  
  const handleOpenReview = (quiz: Quiz) => {
    const attempt = classAttempts[quiz.id];
    if(attempt) {
        setReviewData({ quiz, attempt });
        setReviewModalOpen(true);
    }
  }

  if (activeQuiz) {
    return <QuizTaker quiz={activeQuiz} student={student} onFinish={async () => {
        setActiveQuiz(null);
        refreshUser();
        // Reload the class quizzes to update attempt status
        if (selectedClass) {
          try {
            const quizzes = await apiGetQuizzesByClass(selectedClass.id);
            setClassQuizzes(quizzes);

            const attemptsForClass: { [quizId: string]: QuizAttempt | undefined } = {};
            for (const quiz of quizzes) {
              try {
                const attempt = await apiGetAttemptByQuizAndStudent(quiz.id, student.id);
                attemptsForClass[quiz.id] = attempt;
              } catch (error) {
                attemptsForClass[quiz.id] = undefined;
              }
            }
            setClassAttempts(attemptsForClass);
          } catch (error) {
            console.error('Error reloading quizzes:', error);
          }
        }
    }} />;
  }
  
  const renderClassDetailView = () => {
    if (!selectedClass) return null;

    const getStatusBadge = (quiz: Quiz, isCompleted: boolean) => {
        if(isCompleted) return <span className="text-xs px-2 py-1 rounded-full bg-green-800 text-green-200 font-semibold">Completed</span>;
        if(!quiz.isReleased) return <span className="text-xs px-2 py-1 rounded-full bg-yellow-800 text-yellow-200 font-semibold">Pending</span>;
        return <span className="text-xs px-2 py-1 rounded-full bg-blue-800 text-blue-200 font-semibold">Ready to Start</span>;
    }

    return (
      <div>
        <div className="flex items-center mb-8">
            <Button onClick={() => setSelectedClass(null)} variant="ghost" className="mr-4 !p-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </Button>
            <div>
              <h2 className="text-3xl font-bold text-white">{selectedClass.name}</h2>
              <p className="text-sm text-gray-400">Quizzes available for this class</p>
            </div>
        </div>
        
        {classQuizzes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classQuizzes.map(quiz => {
              const attempt = classAttempts[quiz.id];
              const isCompleted = !!attempt?.submitted;

              return (
                <div key={quiz.id} className="bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col border border-gray-700 hover:border-indigo-500/50 transition-all">
                  <div className="flex-grow">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">{quiz.subject}</p>
                        {getStatusBadge(quiz, isCompleted)}
                    </div>
                    <h3 className="text-2xl font-bold mb-2 text-white">{quiz.title}</h3>
                    <div className="flex items-center text-sm text-gray-400 space-x-4 mb-4">
                        <span>{quiz.questionIds.length} Questions</span>
                        <span>&bull;</span>
                        <span>{quiz.durationMinutes} Mins</span>
                         <span>&bull;</span>
                        <span>{quiz.totalMarks} Marks</span>
                    </div>
                    {isCompleted && quiz.answersReleased && (
                        <div className="mb-4 p-3 bg-gray-900/50 rounded-lg text-center border border-gray-700">
                            <p className="text-sm text-gray-300">Your Score</p>
                            <p className="text-2xl font-bold text-green-400">{attempt.achievedMarks} / {quiz.totalMarks}</p>
                        </div>
                    )}
                  </div>
                  <div className="mt-auto pt-4">
                    {isCompleted ? (
                        <Button 
                            onClick={() => handleOpenReview(quiz)}
                            disabled={!quiz.answersReleased}
                            className="w-full"
                            variant="secondary"
                        >
                            {quiz.answersReleased ? 'View Results' : 'Results Pending'}
                        </Button>
                    ) : (
                        <Button 
                            onClick={() => setActiveQuiz(quiz)} 
                            className="w-full"
                            disabled={!quiz.isReleased}
                        >
                            {quiz.isReleased ? 'Start Quiz' : 'Not Yet Released'}
                        </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
           <div className="text-center py-20 bg-gray-800 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002-2h2a2 2 0 002 2M9 5v1.5a1.5 1.5 0 01-3 0V5" /></svg>
              <p className="mt-4 text-gray-500">No quizzes have been posted for this class yet.</p>
           </div>
        )}
      </div>
    );
  };
  
  const renderClassesListView = () => {
      return (
        <div>
            <h2 className="text-3xl font-bold mb-6 text-white">Your Classes</h2>
            {classes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classes.map(c => (
                    <div key={c.id} onClick={() => setSelectedClass(c)} className="bg-gray-800 rounded-xl shadow-lg p-6 cursor-pointer transform hover:-translate-y-1 transition-transform duration-300 border border-gray-700 hover:border-indigo-500/50 hover:shadow-indigo-500/10">
                        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-indigo-500/20 mb-4">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        </div>
                        <h3 className="text-xl font-bold text-white truncate">{c.name}</h3>
                        <p className="text-sm text-gray-400 mt-1">{c.teacherName}</p>
                        <p className="text-xs text-gray-500 mt-4 font-mono">Code: {c.joinCode}</p>
                    </div>
                ))}
            </div>
            ) : (
            <div className="text-center py-20 bg-gray-800 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                <p className="mt-4 text-gray-500">You haven't joined any classes yet.</p>
                <p className="text-sm text-gray-600">Click "Join a Class" to get started.</p>
            </div>
            )}
        </div>
      );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 pb-4 border-b border-gray-700/50">
         <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Student Portal</h1>
            <p className="text-gray-400 mt-1">Welcome back, {student.name}</p>
        </div>
        <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <Button onClick={() => setJoinClassModalOpen(true)} variant="primary">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                Join a Class
            </Button>
            <Button onClick={onLogout} variant="secondary">Logout</Button>
        </div>
      </header>

      <main>
        {selectedClass ? renderClassDetailView() : renderClassesListView()}
      </main>
      
      <Modal isOpen={isJoinClassModalOpen} onClose={() => !isJoining && setJoinClassModalOpen(false)} title="Join a Class">
        <div className="space-y-4">
            <p className="text-sm text-gray-400">Enter the 6-character class code provided by your teacher.</p>
            <input 
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                disabled={isJoining}
                className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 text-2xl uppercase tracking-widest text-center font-mono disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="text-xs text-gray-500 space-y-1">
              <p>• Code must be exactly 6 characters</p>
              <p>• Only letters and numbers allowed</p>
            </div>
            {joinClassError && <p className="text-sm text-red-400">{joinClassError}</p>}
            <div className="flex justify-end gap-2">
                <Button 
                  variant="ghost" 
                  onClick={() => setJoinClassModalOpen(false)}
                  disabled={isJoining}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleJoinClass}
                  disabled={isJoining || joinCode.trim().length !== 6}
                >
                  {isJoining ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Joining...
                    </span>
                  ) : (
                    'Join Class'
                  )}
                </Button>
            </div>
        </div>
      </Modal>

      {reviewData && (
        <QuizReviewModal
            isOpen={isReviewModalOpen}
            onClose={() => setReviewModalOpen(false)}
            quiz={reviewData.quiz}
            attempt={reviewData.attempt}
        />
      )}
    </div>
  );
};

export default StudentDashboard;