import React, { useState, useEffect } from 'react';
import { User, Subject, Question, Difficulty, QuestionType } from '../types';
import { 
  apiGetQuestionsByAuthor, 
  apiGetQuestionsBySubject, 
  apiCreateQuestion, 
  apiDeleteQuestion,
  apiGetSubjectsByTeacher,
  apiCreateSubject,
  apiDeleteSubject
} from '../services/apiService';
import Button from './common/Button';
import Modal from './common/Modal';
import AddQuestionModal from './AddQuestionModal';
import Spinner from './common/Spinner';

interface QuestionBankViewProps {
    teacher: User;
}

const SubjectDetailView: React.FC<{subject: Subject; teacherId: string; onBack: () => void;}> = ({ subject, teacherId, onBack }) => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isAddQuestionModalOpen, setAddQuestionModalOpen] = useState(false);
    const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
    const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchQuestions = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const allQuestions = await apiGetQuestionsBySubject(subject.name, teacherId);
            setQuestions(allQuestions);
        } catch (err: any) {
            console.error('Error fetching questions:', err);
            setError(err.message || 'Failed to load questions');
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        fetchQuestions();
    }, [subject, teacherId]);

    const handleDeleteQuestion = async (questionId: string) => {
        if(window.confirm('Are you sure you want to delete this question?')) {
            try {
                await apiDeleteQuestion(questionId);
                await fetchQuestions();
            } catch (err: any) {
                console.error('Error deleting question:', err);
                setError(err.message || 'Failed to delete question');
            }
        }
    }

    const renderAnswerDetails = (question: Question) => {
        if (question.type === QuestionType.FillInTheBlank) {
          return (
            <div className="mt-2 space-y-2">
                <div className="p-2 rounded bg-gray-600">
                    <p className="text-xs text-gray-400">Correct Answer:</p>
                    <p>{question.correctAnswerText}</p>
                </div>
            </div>
          );
        }
        
        return question.options.map((option, optIndex) => {
            let isCorrect = false;
            if (question.type === QuestionType.SingleCorrect) {
                isCorrect = optIndex === question.correctAnswerIndex;
            } else if (question.type === QuestionType.MultipleCorrect) {
                isCorrect = question.correctAnswerIndices?.includes(optIndex) ?? false;
            }
          
            return (
              <div key={optIndex} className={`p-2 my-1 rounded-md border text-sm flex items-center gap-3 ${isCorrect ? 'bg-green-900/50 border-green-700' : 'bg-gray-800 border-gray-700'}`}>
                {option.imageUrl && <img src={option.imageUrl} alt={`Option ${optIndex+1}`} className="h-12 w-12 object-contain rounded-md bg-gray-900 p-1 cursor-pointer transition-transform hover:scale-110" onClick={(e) => { e.stopPropagation(); setViewingImageUrl(option.imageUrl!); }}/>}
                <span className="flex-1">{option.text}</span>
              </div>
            )
        });
    };

    return (
        <div>
            <div className="flex items-center mb-6">
                <Button onClick={onBack} variant="ghost" className="mr-4 !p-2">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </Button>
                <div>
                  <h2 className="text-3xl font-bold text-white">{subject.name}</h2>
                  <p className="text-sm text-gray-400">Manage questions for this subject</p>
                </div>
            </div>

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

            <div className="flex justify-end mb-4">
                <Button onClick={() => setAddQuestionModalOpen(true)}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    Add New Question
                </Button>
            </div>
            
            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                {isLoading ? (
                  <div className="flex justify-center items-center py-10">
                    <Spinner />
                  </div>
                ) : questions.length > 0 ? (
                     <ul className="space-y-3">
                        {questions.map(q => (
                            <li key={q.id} className="bg-gray-700/80 p-3 rounded-lg group">
                                <div className="flex justify-between items-start cursor-pointer" onClick={() => setExpandedQuestionId(prevId => prevId === q.id ? null : q.id)}>
                                    <p className="font-medium flex-1 pr-4 text-white">{q.text}</p>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        {q.imageUrl && <img src={q.imageUrl} alt="thumbnail" className="h-8 w-8 object-cover rounded-sm cursor-pointer transition-transform hover:scale-110" onClick={(e) => { e.stopPropagation(); setViewingImageUrl(q.imageUrl); }}/>}
                                        <span className="text-xs font-mono bg-gray-900 px-2 py-0.5 rounded">{q.marks} {q.marks > 1 ? 'pts' : 'pt'}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${q.difficulty === Difficulty.Easy ? 'bg-green-800 text-green-300' : q.difficulty === Difficulty.Medium ? 'bg-yellow-800 text-yellow-300' : 'bg-red-800 text-red-300'}`}>{q.difficulty}</span>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteQuestion(q.id); }} className="p-1 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete Question">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                                <div className="text-xs text-gray-400 mt-2">Type: <span className="font-semibold text-gray-300">{q.type}</span></div>
                                {expandedQuestionId === q.id && (
                                    <div className="mt-3 pt-3 border-t border-gray-600">
                                        <h4 className="text-sm font-semibold text-gray-400 mb-2">Options & Answer</h4>
                                        {renderAnswerDetails(q)}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                     <div className="text-center py-10 text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <p className="mt-4">No questions found for this subject.</p>
                        <p className="text-sm text-gray-600">Click "Add New Question" to get started.</p>
                    </div>
                )}
            </div>

            <AddQuestionModal isOpen={isAddQuestionModalOpen} onClose={() => setAddQuestionModalOpen(false)} teacherId={teacherId} subjectName={subject.name} onQuestionAdded={fetchQuestions}/>

            <Modal isOpen={!!viewingImageUrl} onClose={() => setViewingImageUrl(null)} title="Image Preview" size="lg">
                <div className="p-4 bg-gray-900 rounded-md">
                    {viewingImageUrl && <img src={viewingImageUrl} alt="Question full view" className="max-w-full max-h-[80vh] mx-auto rounded-md" />}
                </div>
            </Modal>
        </div>
    );
};


const QuestionBankView: React.FC<QuestionBankViewProps> = ({ teacher }) => {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
    const [isAddSubjectModalOpen, setAddSubjectModalOpen] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSubjects = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const fetchedSubjects = await apiGetSubjectsByTeacher(teacher.id);
            setSubjects(fetchedSubjects);
        } catch (err: any) {
            console.error('Error fetching subjects:', err);
            setError(err.message || 'Failed to load subjects');
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        fetchSubjects();
    }, [teacher.id]);

    const handleAddSubject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newSubjectName.trim()) {
            try {
                await apiCreateSubject({ name: newSubjectName.trim(), teacherId: teacher.id });
                setNewSubjectName('');
                setAddSubjectModalOpen(false);
                await fetchSubjects();
            } catch (err: any) {
                console.error('Error creating subject:', err);
                alert(err.message || 'Failed to create subject');
            }
        }
    };
    
    const handleDeleteSubject = async (subjectId: string) => {
        if(window.confirm('Are you sure you want to delete this subject? All questions and quizzes associated with it will be permanently removed.')) {
            try {
                await apiDeleteSubject(subjectId);
                await fetchSubjects();
            } catch (err: any) {
                console.error('Error deleting subject:', err);
                alert(err.message || 'Failed to delete subject');
            }
        }
    }
    
    if(selectedSubject) {
        return <SubjectDetailView subject={selectedSubject} teacherId={teacher.id} onBack={() => setSelectedSubject(null)} />
    }

    return (
        <div>
            {error && (
                <div className="mb-4 p-4 bg-red-900/50 border border-red-700 rounded-lg flex justify-between items-center">
                    <p className="text-red-200">{error}</p>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">✕</button>
                </div>
            )}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6">
                 <div>
                  <h1 className="text-4xl font-bold text-white">Question Bank</h1>
                  <p className="text-gray-400 mt-1">Manage your subjects and questions</p>
                </div>
                <Button onClick={() => setAddSubjectModalOpen(true)} className="mt-4 sm:mt-0">Add New Subject</Button>
            </div>
            
            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <Spinner />
                </div>
            ) : subjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subjects.map(s => (
                        <div key={s.id} className="group relative bg-gray-800/50 p-6 rounded-xl shadow-lg hover:shadow-indigo-500/10 border border-gray-700 hover:border-indigo-500/50 transition-all duration-300">
                            <button 
                                onClick={() => setSelectedSubject(s)}
                                className="text-left w-full h-full"
                            >
                                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-indigo-500/20 mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                                </div>
                                <h3 className="text-xl font-bold text-white">{s.name}</h3>
                                <p className="text-gray-400 mt-1">Click to view questions</p>
                            </button>
                            <button onClick={() => handleDeleteSubject(s.id)} className="absolute top-4 right-4 p-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete Subject">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-gray-800/50 rounded-lg border border-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    <p className="mt-4 text-gray-500">You haven't created any subjects yet.</p>
                    <p className="text-sm text-gray-600">Click "Add New Subject" to organize your questions.</p>
                </div>
            )}
            
            <Modal isOpen={isAddSubjectModalOpen} onClose={() => setAddSubjectModalOpen(false)} title="Add New Subject">
                <form onSubmit={handleAddSubject}>
                    <input type="text" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} placeholder="e.g., Data Structures" className="w-full bg-gray-700 border border-gray-600 rounded-md p-2" autoFocus />
                    <div className="mt-4 flex justify-end gap-2">
                        <Button variant="ghost" type="button" onClick={() => setAddSubjectModalOpen(false)}>Cancel</Button>
                        <Button type="submit">Save Subject</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default QuestionBankView;