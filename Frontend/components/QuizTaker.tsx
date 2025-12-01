import React, { useState } from 'react';
import { Quiz, User, QuestionType, Question } from '../types';
import { useQuizTaker } from '../hooks/useQuizTaker';
import Button from './common/Button';
import Spinner from './common/Spinner';
import Modal from './common/Modal';

interface QuizTakerProps {
  quiz: Quiz;
  student: User;
  onFinish: () => void;
}

const QuizTaker: React.FC<QuizTakerProps> = ({ quiz, student, onFinish }) => {
  const {
    isLoading,
    isReadyToStart,
    isWarningVisible,
    startQuiz,
    reEnterFullScreen,
    currentQuestion,
    currentQuestionIndex,
    answers,
    timeLeft,
    tabSwitches,
    isFinished,
    handleAnswerSelect,
    goToNextQuestion,
    goToPreviousQuestion,
    submitQuiz,
    totalQuestions
  } = useQuizTaker(quiz, student, onFinish);

  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleConfirmSubmit = () => {
    submitQuiz();
    setConfirmModalOpen(false);
  };
  
  const renderQuestionInputs = (question: Question) => {
    const studentAnswer = answers[question.id];
    
    switch(question.type) {
      case QuestionType.SingleCorrect:
        return question.options.map((option, index) => (
          <button 
            key={index} 
            onClick={() => handleAnswerSelect(question.id, index, question.type)}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 flex items-center gap-4
                ${studentAnswer === index 
                    ? 'bg-indigo-600 border-indigo-500 scale-105 shadow-lg' 
                    : 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500'}`}
          >
            <span className={`font-mono px-2 py-1 rounded bg-gray-800`}>{String.fromCharCode(65 + index)}</span>
            {option.imageUrl && <img src={option.imageUrl} alt={`Option ${index+1}`} className="h-16 w-16 object-contain rounded-md cursor-pointer transition-transform hover:scale-110" onClick={(e) => { e.stopPropagation(); setViewingImageUrl(option.imageUrl!)}} />}
            <span className="flex-1">{option.text}</span>
          </button>
        ));
      
      case QuestionType.MultipleCorrect:
        return question.options.map((option, index) => (
          <button 
            key={index}
            onClick={() => handleAnswerSelect(question.id, index, question.type)}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 flex items-center gap-4
                ${(studentAnswer as number[] || []).includes(index)
                    ? 'bg-indigo-600 border-indigo-500 shadow-md'
                    : 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500'}`}
          >
             <div className={`w-6 h-6 rounded border-2 flex-shrink-0 ${(studentAnswer as number[] || []).includes(index) ? 'bg-indigo-400 border-indigo-300' : 'border-gray-400'}`} />
             {option.imageUrl && <img src={option.imageUrl} alt={`Option ${index+1}`} className="h-16 w-16 object-contain rounded-md cursor-pointer transition-transform hover:scale-110" onClick={(e) => { e.stopPropagation(); setViewingImageUrl(option.imageUrl!)}} />}
             <span className="flex-1">{option.text}</span>
          </button>
        ));

      case QuestionType.FillInTheBlank:
        return (
          <input 
            type="text"
            value={studentAnswer as string || ''}
            onChange={(e) => handleAnswerSelect(question.id, e.target.value, question.type)}
            className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 text-lg"
            placeholder="Type your answer here..."
          />
        );
        
      default:
        return <p>Unsupported question type.</p>;
    }
  }

  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        <div className="text-center bg-gray-800 p-10 rounded-lg shadow-xl">
          <h2 className="text-3xl font-bold text-green-400 mb-4">Quiz Submitted!</h2>
          <p className="text-lg text-gray-300">Your responses have been saved.</p>
          <p className="text-gray-400 mt-2">You will be redirected shortly...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <Spinner size="lg" />
            <p className="mt-4 text-lg text-gray-400">Preparing your quiz...</p>
        </div>
    );
  }

  if (!isReadyToStart) {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
              <div className="text-center bg-gray-800 p-10 rounded-lg shadow-xl max-w-2xl">
                  <h2 className="text-3xl font-bold text-indigo-400 mb-4">Ready to Start "{quiz.title}"?</h2>
                  <p className="text-gray-300 mb-6">To ensure a fair testing environment, this quiz has the following security measures:</p>
                  <ul className="text-left space-y-3 text-gray-300 list-disc list-inside mb-8 bg-gray-900/50 p-6 rounded-md">
                      <li>The quiz must be taken in <span className="font-bold text-yellow-400">full-screen mode</span>.</li>
                      <li>Leaving full-screen will pause the quiz and show a warning.</li>
                      <li>Leaving full-screen a <span className="font-bold text-red-400">second time</span> will automatically submit your quiz.</li>
                      <li><span className="font-bold text-red-400">Copying, pasting, and taking screenshots</span> are disabled.</li>
                      <li>Switching to other tabs or applications is monitored and limited.</li>
                  </ul>
                  <Button onClick={startQuiz} className="text-lg px-6 py-3">I Understand, Start Quiz</Button>
              </div>
          </div>
      );
  }
  
  return (
    <div className="flex flex-col min-h-screen p-4 sm:p-6 select-none" style={{ userSelect: 'none' }}>
      <header className="bg-gray-800 p-4 rounded-lg shadow-md mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-indigo-400">{quiz.title}</h1>
          <p className="text-xs text-gray-400 mt-1">{currentQuestion.marks} {currentQuestion.marks > 1 ? 'Marks' : 'Mark'}</p>
        </div>
        <div className="flex items-center gap-4 text-sm sm:text-base">
          <div className="text-center">
            <div className="font-bold text-lg">{formatTime(timeLeft)}</div>
            <div className="text-xs text-gray-400">Time Left</div>
          </div>
          <div className={`text-center p-2 rounded-md ${tabSwitches > 0 ? 'bg-red-900/50' : ''}`}>
             <div className={`font-bold text-lg ${tabSwitches >= quiz.tabSwitchThreshold -1 && quiz.tabSwitchThreshold > 0 ? 'text-red-400 animate-pulse' : tabSwitches > 0 ? 'text-red-400' : ''}`}>{tabSwitches}/{quiz.tabSwitchThreshold}</div>
            <div className="text-xs text-gray-400">Tab Switches</div>
          </div>
        </div>
      </header>

      <main className="flex-grow bg-gray-800 p-6 rounded-lg shadow-md flex flex-col">
        <div className="mb-4">
          <p className="text-gray-400">Question {currentQuestionIndex + 1} of {totalQuestions}</p>
          <h2 className="text-xl sm:text-2xl font-semibold my-2">{currentQuestion.text}</h2>
          {currentQuestion.imageUrl && (
            <div className="my-4 max-w-sm mx-auto">
                <img src={currentQuestion.imageUrl} alt="Question visual aid" className="max-w-full rounded-lg cursor-pointer transition-transform hover:scale-105" onClick={() => setViewingImageUrl(currentQuestion.imageUrl)} />
            </div>
          )}
        </div>
        
        <div className="space-y-4">
            {currentQuestion && renderQuestionInputs(currentQuestion)}
        </div>
      </main>

      <footer className="mt-6 flex justify-between items-center">
        <Button onClick={goToPreviousQuestion} disabled={currentQuestionIndex === 0} variant="secondary">
          Previous
        </Button>
        {currentQuestionIndex === totalQuestions - 1 ? (
          <Button onClick={() => setConfirmModalOpen(true)} variant="danger">
            Submit Quiz
          </Button>
        ) : (
          <Button onClick={goToNextQuestion}>
            Next
          </Button>
        )}
      </footer>

      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Confirm Submission"
      >
        <div className="space-y-6">
            <p className="text-gray-300">Are you sure you want to submit the quiz? You will not be able to change your answers after this.</p>
            <div className="flex justify-end gap-4">
                <Button variant="ghost" onClick={() => setConfirmModalOpen(false)}>
                    Cancel
                </Button>
                <Button variant="danger" onClick={handleConfirmSubmit}>
                    Yes, Submit
                </Button>
            </div>
        </div>
      </Modal>

      <Modal
        isOpen={isWarningVisible}
        onClose={() => {}} // Deliberately non-closable by overlay click
        title="Full-Screen Mode Required"
      >
        <div className="space-y-6 text-center">
            <div className="mx-auto bg-yellow-900/50 h-16 w-16 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <p className="text-gray-300">You have exited full-screen mode. The timer is paused.</p>
            <p className="text-gray-400 text-sm">Please re-enter full-screen to continue the quiz. Exiting again will result in automatic submission.</p>
            <div className="flex justify-center mt-4">
                <Button onClick={reEnterFullScreen}>
                    Re-enter Full-screen
                </Button>
            </div>
        </div>
      </Modal>

      <Modal isOpen={!!viewingImageUrl} onClose={() => setViewingImageUrl(null)} title="Image Preview" size="lg">
        <div className="p-4 bg-gray-900 rounded-md">
            {viewingImageUrl && <img src={viewingImageUrl} alt="Full view" className="max-w-full max-h-[80vh] mx-auto rounded-md" />}
        </div>
      </Modal>

    </div>
  );
};

export default QuizTaker;