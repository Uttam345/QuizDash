import React, { useState, useEffect, useCallback } from 'react';
import { User, Class, Quiz, Question } from '../types';
import { 
  apiGetTeacherClasses, 
  apiCreateClass, 
  apiDeleteClass, 
  apiUpdateClass, 
  apiGetQuizzesByClass,
  apiUpdateQuizStatus,
  apiDeleteQuiz,
  apiGetClassMembers,
  apiGetQuestionsByAuthor
} from '../services/apiService';
import Button from './common/Button';
import CreateQuizModal from './CreateQuizModal';
import QuizResultsModal from './QuizResultsModal';
import Modal from './common/Modal';
import Spinner from './common/Spinner';

interface ClassesViewProps {
  teacher: User;
}

const ClassesView: React.FC<ClassesViewProps> = ({ teacher }) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  
  const [isCreateQuizOpen, setCreateQuizOpen] = useState(false);
  const [isResultsOpen, setResultsOpen] =useState(false);
  const [selectedQuizForResults, setSelectedQuizForResults] = useState<Quiz | null>(null);
  
  const [isAddClassModalOpen, setAddClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  
  const [isRenameModalOpen, setRenameModalOpen] = useState(false);
  const [classToRename, setClassToRename] = useState<Class | null>(null);
  const [newClassNameForRename, setNewClassNameForRename] = useState("");
  
  const [activeTab, setActiveTab] = useState<'quizzes' | 'members'>('quizzes');
  const [classMembers, setClassMembers] = useState<User[]>([]);
  const [copiedCodeClassId, setCopiedCodeClassId] = useState<string | null>(null);
  
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false);
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [isRenamingClass, setIsRenamingClass] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCopyCode = (code: string, classId: string) => {
    navigator.clipboard.writeText(code).then(() => {
        setCopiedCodeClassId(classId);
        setTimeout(() => setCopiedCodeClassId(null), 2000);
    });
  };

  const fetchClasses = useCallback(async () => {
    setIsLoadingClasses(true);
    setError(null);
    try {
      const teacherClasses = await apiGetTeacherClasses(teacher.id);
      setClasses(teacherClasses);
      if (!selectedClass || !teacherClasses.find(c => c.id === selectedClass.id)) {
        setSelectedClass(teacherClasses[0] || null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load classes');
      console.error('Error fetching classes:', err);
    } finally {
      setIsLoadingClasses(false);
    }
  }, [teacher.id, selectedClass]);

  const fetchQuizzesAndMembers = useCallback(async () => {
    if (selectedClass) {
      setIsLoadingQuizzes(true);
      try {
        const [classQuizzes, members] = await Promise.all([
          apiGetQuizzesByClass(selectedClass.id),
          apiGetClassMembers(selectedClass.id)
        ]);
        setQuizzes(classQuizzes.sort((a,b) => (a.isReleased === b.isReleased) ? 0 : a.isReleased ? 1 : -1));
        setClassMembers(members);
      } catch (err: any) {
        console.error('Error fetching quizzes:', err);
        setQuizzes([]);
        setClassMembers([]);
      } finally {
        setIsLoadingQuizzes(false);
      }
    } else {
      setQuizzes([]);
      setClassMembers([]);
    }
  }, [selectedClass]);

  useEffect(() => {
    const loadData = async () => {
      await fetchClasses();
      try {
        const questionsData = await apiGetQuestionsByAuthor(teacher.id);
        setQuestions(questionsData);
      } catch (err) {
        console.error('Error loading questions:', err);
      }
    };
    loadData();
  }, [teacher.id, fetchClasses]);

  useEffect(() => {
    fetchQuizzesAndMembers();
  }, [fetchQuizzesAndMembers]);
  
  const handleCreateQuiz = () => {
     fetchQuizzesAndMembers();
  };

  const openResults = (quiz: Quiz) => {
    setSelectedQuizForResults(quiz);
    setResultsOpen(true);
  };
  
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newClassName.trim()) {
      setIsCreatingClass(true);
      setError(null);
      try {
        await apiCreateClass(newClassName.trim(), teacher.id);
        await fetchClasses();
        setNewClassName('');
        setAddClassModalOpen(false);
      } catch (err: any) {
        setError(err.message || 'Failed to create class');
      } finally {
        setIsCreatingClass(false);
      }
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if(window.confirm('Are you sure you want to delete this class? All associated quizzes and student enrollments will also be removed.')) {
      try {
        await apiDeleteClass(classId);
        await fetchClasses();
      } catch (err: any) {
        setError(err.message || 'Failed to delete class');
      }
    }
  };
  
  const handleOpenRenameModal = (cls: Class) => {
    setClassToRename(cls);
    setNewClassNameForRename(cls.name);
    setRenameModalOpen(true);
  };

  const handleRenameClass = async () => {
    if (classToRename && newClassNameForRename.trim()) {
      setIsRenamingClass(true);
      setError(null);
      try {
        await apiUpdateClass(classToRename.id, newClassNameForRename.trim());
        await fetchClasses();
        setRenameModalOpen(false);
      } catch (err: any) {
        setError(err.message || 'Failed to rename class');
      } finally {
        setIsRenamingClass(false);
      }
    }
  };

  const handleQuizStatusUpdate = async (quizId: string, updates: { isReleased?: boolean; answersReleased?: boolean }) => {
    try {
      await apiUpdateQuizStatus(quizId, updates);
      await fetchQuizzesAndMembers();
    } catch (err: any) {
      console.error('Error updating quiz status:', err);
      setError(err.message || 'Failed to update quiz status');
    }
  };

  const handleSelectClass = (c: Class) => {
      setSelectedClass(c);
      setActiveTab('quizzes');
  };

  const getStatusBadge = (quiz: Quiz) => {
    if (quiz.answersReleased) return <span className="text-xs px-2 py-1 rounded-full bg-blue-800 text-blue-200 font-semibold">Answers Released</span>;
    if (quiz.isReleased) return <span className="text-xs px-2 py-1 rounded-full bg-green-800 text-green-200 font-semibold">Live</span>;
    return <span className="text-xs px-2 py-1 rounded-full bg-yellow-800 text-yellow-200 font-semibold">Draft</span>
  };

  return (
    <div>
        <h1 className="text-4xl font-bold text-white mb-6">Class Management</h1>
        {error && (
          <div className="bg-red-900/30 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-4 flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-120px)]">
            <div className="lg:col-span-1 bg-gray-800/50 p-4 rounded-xl border border-gray-700 flex flex-col">
                <h2 className="text-xl font-semibold mb-4 text-indigo-300 px-2">Your Classes</h2>
                <div className="flex-grow overflow-y-auto pr-1 space-y-2">
                    {isLoadingClasses ? (
                      <div className="flex justify-center items-center py-10">
                        <Spinner />
                      </div>
                    ) : (
                      classes.map(c => (
                        <div key={c.id} className="group relative">
                             <button 
                                onClick={() => handleSelectClass(c)}
                                className={`w-full text-left p-3 rounded-lg transition-all duration-200 border-2 ${selectedClass?.id === c.id ? 'bg-indigo-900/30 border-indigo-500' : 'bg-gray-700 border-transparent hover:bg-gray-700/80 hover:border-indigo-600/50'}`}
                            >
                                <p className="font-bold text-white truncate">{c.name}</p>
                                 <div className="flex items-center text-xs text-gray-400 mt-1">
                                    <span>Code:</span>
                                    <span className="font-mono bg-gray-900/50 px-2 py-0.5 rounded mx-1">{c.joinCode}</span>
                                    <button onClick={(e) => { e.stopPropagation(); handleCopyCode(c.joinCode, c.id); }} className="p-1 text-gray-400 hover:text-white transition-colors relative" title="Copy code">
                                        {copiedCodeClassId === c.id ? (
                                            <span className="text-xs text-indigo-300 font-semibold">Copied!</span>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                        )}
                                    </button>
                                </div>
                            </button>
                            <div className="absolute top-1 right-1 flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <button onClick={() => handleOpenRenameModal(c)} className="p-2 text-gray-400 hover:text-indigo-400" title="Rename Class">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg>
                                </button>
                                <button onClick={() => handleDeleteClass(c.id)} className="p-2 text-gray-400 hover:text-red-400" title="Delete Class">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        </div>
                      ))
                    )}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-700">
                    <Button onClick={() => setAddClassModalOpen(true)} className="w-full" variant="secondary">Create New Class</Button>
                </div>
            </div>

            <div className="lg:col-span-3 bg-gray-800/50 p-6 rounded-xl border border-gray-700 overflow-y-auto">
            {selectedClass ? (
                <div>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4">
                    <h2 className="text-3xl font-bold text-white">{selectedClass.name}</h2>
                    <Button onClick={() => setCreateQuizOpen(true)} disabled={questions.length === 0}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        Create Quiz
                    </Button>
                </div>
                
                <div className="flex border-b border-gray-700 mb-4">
                    <button onClick={() => setActiveTab('quizzes')} className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'quizzes' ? 'border-b-2 border-indigo-400 text-indigo-300' : 'text-gray-400 hover:text-white'}`}>Quizzes <span className="text-xs bg-gray-700 rounded-full px-2 py-0.5 ml-1">{quizzes.length}</span></button>
                    <button onClick={() => setActiveTab('members')} className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'members' ? 'border-b-2 border-indigo-400 text-indigo-300' : 'text-gray-400 hover:text-white'}`}>Members <span className="text-xs bg-gray-700 rounded-full px-2 py-0.5 ml-1">{classMembers.length}</span></button>
                </div>

                <div>
                    {activeTab === 'quizzes' && (
                        <div>
                            {questions.length === 0 && <p className="text-center text-sm text-yellow-400 bg-yellow-900/30 p-3 rounded-md mb-4">You must add questions to your Question Bank before you can create a quiz.</p>}
                            {isLoadingQuizzes ? (
                              <div className="flex justify-center items-center py-10">
                                <Spinner />
                              </div>
                            ) : quizzes.length > 0 ? (
                                <ul className="space-y-4">
                                {quizzes.map(quiz => (
                                    <li key={quiz.id} className="bg-gray-700/50 p-4 rounded-lg border border-gray-600 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-lg text-white">{quiz.title}</p>
                                                <div className="flex items-center text-xs text-gray-400 space-x-2 mt-1">
                                                    <span>{quiz.subject}</span><span>&bull;</span>
                                                    <span>{quiz.questionIds.length} Qs</span><span>&bull;</span>
                                                    <span>{quiz.totalMarks} Marks</span><span>&bull;</span>
                                                    <span>{quiz.durationMinutes} Min</span>
                                                </div>
                                            </div>
                                            <div className="flex-shrink-0">{getStatusBadge(quiz)}</div>
                                        </div>
                                        <div className="pt-3 border-t border-gray-600 flex justify-end gap-2">
                                            <Button onClick={() => openResults(quiz)} variant="secondary">View Results</Button>
                                            {!quiz.isReleased && <Button onClick={() => handleQuizStatusUpdate(quiz.id, {isReleased: true})}>Release Quiz</Button>}
                                            {quiz.isReleased && !quiz.answersReleased && <Button onClick={() => handleQuizStatusUpdate(quiz.id, {answersReleased: true})}>Release Answers</Button>}
                                        </div>
                                    </li>
                                ))}
                                </ul>
                            ) : (
                                <div className="text-center py-10 text-gray-500"><p>No quizzes created for this class yet.</p></div>
                            )}
                        </div>
                    )}
                    {activeTab === 'members' && (
                        <div className="max-h-[60vh] overflow-y-auto">
                            {classMembers.length > 0 ? (
                                <table className="w-full text-sm text-left text-gray-300">
                                    <thead className="text-xs text-indigo-300 uppercase bg-gray-700"><tr><th scope="col" className="px-6 py-3 rounded-l-lg">Student Name</th><th scope="col" className="px-6 py-3 rounded-r-lg">Email</th></tr></thead>
                                    <tbody>
                                        {classMembers.map(student => (
                                            <tr key={student.id} className="bg-gray-800 hover:bg-gray-700/50"><td className="px-6 py-4 font-medium whitespace-nowrap">{student.name}</td><td className="px-6 py-4 text-gray-400">{student.email}</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="text-center py-10 text-gray-500"><p>No students have joined this class yet.</p></div>
                            )}
                        </div>
                    )}
                </div>
                </div>
            ) : (
                <div className="flex items-center justify-center h-full text-gray-500"><p>{classes.length > 0 ? 'Select a class to view details.' : 'Create a class to get started.'}</p></div>
            )}
            </div>
      </div>

      <Modal isOpen={isAddClassModalOpen} onClose={() => !isCreatingClass && setAddClassModalOpen(false)} title="Create New Class">
        <form onSubmit={handleCreateClass} className="space-y-4">
          <input 
            type="text" 
            value={newClassName} 
            onChange={e => setNewClassName(e.target.value)} 
            placeholder="e.g., Advanced Algorithms" 
            className="w-full bg-gray-700 border border-gray-600 rounded-md p-2" 
            disabled={isCreatingClass}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setAddClassModalOpen(false)} disabled={isCreatingClass}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreatingClass || !newClassName.trim()}>
              {isCreatingClass ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </span>
              ) : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {selectedClass && <CreateQuizModal isOpen={isCreateQuizOpen} onClose={() => setCreateQuizOpen(false)} teacherId={teacher.id} classId={selectedClass.id} onCreateQuiz={handleCreateQuiz} questions={questions}/>}
      {selectedQuizForResults && <QuizResultsModal isOpen={isResultsOpen} onClose={() => setResultsOpen(false)} quiz={selectedQuizForResults}/>}
      <Modal isOpen={isRenameModalOpen} onClose={() => !isRenamingClass && setRenameModalOpen(false)} title="Rename Class">
        <div className="space-y-4">
            <input 
              type="text" 
              value={newClassNameForRename} 
              onChange={e => setNewClassNameForRename(e.target.value)} 
              className="w-full bg-gray-700 border border-gray-600 rounded-md p-2"
              disabled={isRenamingClass}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRenameModalOpen(false)} disabled={isRenamingClass}>
                Cancel
              </Button>
              <Button onClick={handleRenameClass} disabled={isRenamingClass || !newClassNameForRename.trim()}>
                {isRenamingClass ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : 'Save'}
              </Button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default ClassesView;