import { useState, useEffect, useCallback, useRef } from 'react';
import { Quiz, Question, User, QuizAttempt, QuestionType } from '../types';
import { 
  apiGetQuestionsByIds, 
  apiGetAttemptByQuizAndStudent, 
  apiSaveAttempt, 
  apiUpdateAttempt 
} from '../services/apiService';

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};


export const useQuizTaker = (quiz: Quiz, student: User, onFinish: () => void) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [questionId: string]: any }>({});
  const [timeLeft, setTimeLeft] = useState(quiz.durationMinutes * 60);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // New states for anti-cheating features
  const [isReadyToStart, setIsReadyToStart] = useState(false);
  const [fullScreenExits, setFullScreenExits] = useState(0);
  const [isWarningVisible, setWarningVisible] = useState(false);

  const attemptRef = useRef<QuizAttempt | null>(null);
  const isFinishedRef = useRef(isFinished);
  const answersRef = useRef(answers);
  const isReadyRef = useRef(isReadyToStart);

  useEffect(() => { 
    isFinishedRef.current = isFinished;
  }, [isFinished]);
  
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    isReadyRef.current = isReadyToStart;
  }, [isReadyToStart]);

  const submitQuiz = useCallback(async () => {
    if (!attemptRef.current || isFinishedRef.current) return;
    
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {}); // Attempt to exit fullscreen on submission
    }
    
    isFinishedRef.current = true;
    setIsFinished(true);
    
    let achievedMarks = 0;
    questions.forEach(q => {
        const studentAnswer = answersRef.current[q.id];
        let isCorrect = false;

        switch(q.type) {
            case QuestionType.SingleCorrect:
                isCorrect = studentAnswer === q.correctAnswerIndex;
                break;
            case QuestionType.MultipleCorrect:
                if (Array.isArray(studentAnswer) && Array.isArray(q.correctAnswerIndices)) {
                    isCorrect = studentAnswer.length === q.correctAnswerIndices.length && studentAnswer.every(val => q.correctAnswerIndices?.includes(val));
                }
                break;
            case QuestionType.FillInTheBlank:
                isCorrect = typeof studentAnswer === 'string' && studentAnswer.trim().toLowerCase() === q.correctAnswerText?.trim().toLowerCase();
                break;
        }
        if (isCorrect) {
            achievedMarks += q.marks;
        }
    });
    
    const score = quiz.totalMarks > 0 ? Math.round((achievedMarks / quiz.totalMarks) * 100) : 0;

    const finalAttempt: QuizAttempt = {
      ...attemptRef.current,
      answers: answersRef.current,
      score,
      achievedMarks,
      endTime: Date.now(),
      tabSwitches,
      submitted: true,
    };
    
    try {
      if (attemptRef.current.id) {
        await apiUpdateAttempt(attemptRef.current.id, finalAttempt);
      } else {
        await apiSaveAttempt(finalAttempt);
      }
      localStorage.removeItem(`quiz_progress_${student.id}_${quiz.id}`);
    } catch (error) {
      console.error('Failed to save quiz submission:', error);
      // Save to localStorage as backup
      localStorage.setItem(`quiz_backup_${student.id}_${quiz.id}`, JSON.stringify(finalAttempt));
      alert('Failed to submit quiz to server. Your answers have been saved locally.');
    }
    
    setTimeout(() => onFinish(), 3000);
  }, [onFinish, questions, quiz.id, quiz.totalMarks, student.id, tabSwitches]);


  // Effect for Initialization (runs once)
  useEffect(() => {
    const initializeQuiz = async () => {
      try {
        const existingAttempt = await apiGetAttemptByQuizAndStudent(quiz.id, student.id);
        if(existingAttempt?.submitted) {
            setIsFinished(true);
            isFinishedRef.current = true;
            onFinish();
            setIsLoading(false);
            return;
        }

        const savedProgressRaw = localStorage.getItem(`quiz_progress_${student.id}_${quiz.id}`);
        
        if (savedProgressRaw) {
            const savedProgress = JSON.parse(savedProgressRaw);
            setQuestions(savedProgress.questions as Question[]);
            setAnswers(savedProgress.answers);
            setTimeLeft(savedProgress.timeLeft);
            setTabSwitches(savedProgress.tabSwitches);
            setFullScreenExits(savedProgress.fullScreenExits || 0);
            attemptRef.current = savedProgress.attempt;
        } else {
            const quizQuestions = await apiGetQuestionsByIds(quiz.questionIds);
            const shuffledQuestions = shuffleArray(quizQuestions);
            setQuestions(shuffledQuestions);

            const newAttempt = await apiSaveAttempt({
                quizId: quiz.id,
                studentId: student.id,
                answers: {},
                score: 0,
                achievedMarks: 0,
                startTime: Date.now(),
                endTime: null,
                tabSwitches: 0,
                submitted: false,
                questionIds: shuffledQuestions.map(q => q.id), // Save shuffled order
            });
            attemptRef.current = newAttempt;
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize quiz:', error);
        alert('Failed to load quiz. Please try again.');
        setIsLoading(false);
      }
    };

    initializeQuiz();
  }, [quiz.id, student.id, onFinish, quiz.questionIds]);
  
  const startQuiz = useCallback(() => {
    document.documentElement.requestFullscreen().catch(err => {
        alert(`Error enabling full-screen mode: ${err.message}. Please allow full-screen to start.`);
    });
  }, []);

  const reEnterFullScreen = useCallback(() => {
     document.documentElement.requestFullscreen().catch(() => {
        alert(`Failed to re-enter full-screen. Please do so to continue.`);
     });
  }, []);

  // Effect for Timer - only runs after full-screen and if quiz is not finished/paused
  useEffect(() => {
    if (isLoading || isFinished || !isReadyToStart || isWarningVisible) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          submitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isLoading, isFinished, submitQuiz, isReadyToStart, isWarningVisible]);

  
  // Effect for Event Listeners
  useEffect(() => {
    if (isLoading || isFinished) return;
    
    const handleVisibilityChange = () => {
      if (document.hidden && isReadyRef.current) {
        setTabSwitches(prev => prev + 1);
      }
    };
    
    const handleFullScreenChange = () => {
        if (document.fullscreenElement) {
            // User entered/re-entered fullscreen
            setIsReadyToStart(true);
            setWarningVisible(false);
        } else {
            // User exited fullscreen
            if (isReadyRef.current && !isFinishedRef.current) {
                setFullScreenExits(prev => prev + 1);
            }
        }
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'PrintScreen') {
            e.preventDefault();
            alert('Screenshots are disabled during this quiz.');
        }
    };

    const preventAction = (e: Event) => e.preventDefault();
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('copy', preventAction);
    document.addEventListener('paste', preventAction);
    document.addEventListener('cut', preventAction);
    document.addEventListener('contextmenu', preventAction);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('copy', preventAction);
      document.removeEventListener('paste', preventAction);
      document.removeEventListener('cut', preventAction);
      document.removeEventListener('contextmenu', preventAction);
    };
  }, [isLoading, isFinished]);
  
  // Effect to handle auto-submission
  useEffect(() => {
     if (isLoading || isFinished) return;

     if (tabSwitches >= quiz.tabSwitchThreshold) {
         alert(`You have exceeded the tab switch limit of ${quiz.tabSwitchThreshold}. The quiz will now be submitted.`);
         submitQuiz();
         return;
     }
     
     if (fullScreenExits === 1) {
        setWarningVisible(true);
     } else if (fullScreenExits > 1) {
         alert('You have exited full-screen mode a second time. The quiz will now be submitted.');
         submitQuiz();
     }
  }, [tabSwitches, fullScreenExits, quiz.tabSwitchThreshold, submitQuiz, isLoading, isFinished]);

  // Effect for saving progress to localStorage and server (debounced)
  useEffect(() => {
    if (!isFinished && !isLoading && questions.length > 0 && attemptRef.current) {
        const progress = { questions, answers, timeLeft, tabSwitches, fullScreenExits, attempt: attemptRef.current };
        localStorage.setItem(`quiz_progress_${student.id}_${quiz.id}`, JSON.stringify(progress));
        
        // Debounced server-side backup (every 30 seconds)
        const saveToServer = setTimeout(async () => {
          if (attemptRef.current?.id) {
            try {
              await apiUpdateAttempt(attemptRef.current.id, {
                answers: answersRef.current,
                tabSwitches,
                endTime: Date.now(),
              });
            } catch (error) {
              console.error('Failed to auto-save to server:', error);
              // localStorage already saved, so progress not lost
            }
          }
        }, 30000); // 30 seconds debounce

        return () => clearTimeout(saveToServer);
    }
  }, [answers, timeLeft, tabSwitches, isFinished, isLoading, quiz.id, student.id, questions, fullScreenExits]);


  const handleAnswerSelect = (questionId: string, value: number | string, type: QuestionType) => {
    if (type === QuestionType.MultipleCorrect) {
        setAnswers(prev => {
            const currentAnswers = (prev[questionId] as number[] || []);
            const newAnswers = currentAnswers.includes(value as number) 
                ? currentAnswers.filter(a => a !== value)
                : [...currentAnswers, value as number].sort();
            return { ...prev, [questionId]: newAnswers };
        });
    } else {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    }
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };
  
  return {
    isLoading,
    isReadyToStart,
    isWarningVisible,
    questions,
    currentQuestion: questions[currentQuestionIndex],
    currentQuestionIndex,
    answers,
    timeLeft,
    tabSwitches,
    isFinished,
    handleAnswerSelect,
    goToNextQuestion,
    goToPreviousQuestion,
    submitQuiz,
    startQuiz,
    reEnterFullScreen,
    totalQuestions: questions.length
  };
};