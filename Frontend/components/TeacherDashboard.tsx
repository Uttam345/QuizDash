import React, { useState } from 'react';
import { User } from '../types';
import Button from './common/Button';
import ClassesView from './ClassesView';
import QuestionBankView from './QuestionBankView';

interface TeacherDashboardProps {
  teacher: User;
  onLogout: () => void;
}

type ActiveView = 'classes' | 'questionBank';

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ teacher, onLogout }) => {
  const [activeView, setActiveView] = useState<ActiveView>('classes');

  const navItemClasses = (view: ActiveView) => 
    `w-full flex items-center p-3 rounded-lg transition-colors text-md ${
      activeView === view
        ? 'bg-indigo-600 text-white font-semibold shadow-lg'
        : 'hover:bg-gray-700 text-gray-300'
    }`;

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 p-4 flex flex-col shadow-lg border-r border-gray-700/50">
        <div className="mb-8 p-2">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">QuizDash</h1>
          <p className="text-sm text-gray-400" title={teacher.email}>{teacher.name}</p>
        </div>
        <nav className="flex-grow">
          <ul className="space-y-3">
            <li>
              <button onClick={() => setActiveView('classes')} className={navItemClasses('classes')}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                Classes
              </button>
            </li>
            <li>
              <button onClick={() => setActiveView('questionBank')} className={navItemClasses('questionBank')}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
                Question Bank
              </button>
            </li>
          </ul>
        </nav>
        <div className="pt-4 border-t border-gray-700">
            <Button onClick={onLogout} variant="secondary" className="w-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Logout
            </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        {activeView === 'classes' && <ClassesView teacher={teacher} />}
        {activeView === 'questionBank' && <QuestionBankView teacher={teacher} />}
      </main>
    </div>
  );
};

export default TeacherDashboard;