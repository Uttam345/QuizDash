import React, { useState, useEffect } from 'react';
import { User, Role } from './types';
import { getInitialData, clearData } from './services/mockDataService';
import { getCurrentUser, apiValidateSession, apiLogout } from './services/apiService';
import LoginComponent from './components/LoginComponent';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedRoleForLogin, setSelectedRoleForLogin] = useState<Role | null>(null);

  useEffect(() => {
    getInitialData(); 
    
    // Check for a logged-in user on initial load
    const user = getCurrentUser();
    if (user) {
      // Validate session with backend
      if (user.sessionToken) {
        apiValidateSession(user.id, user.sessionToken).then((isValid) => {
          if (isValid) {
            setCurrentUser(user);
          } else {
            // Session invalid, clear data
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
          }
        }).catch(() => {
          // Error validating, clear data
          localStorage.removeItem('authToken');
          localStorage.removeItem('currentUser');
        });
      } else {
        setCurrentUser(user);
      }
    }
  }, []);

  // Effect for periodic session validation to prevent multiple logins
  useEffect(() => {
    if (!currentUser || !currentUser.sessionToken) return;

    const sessionCheckInterval = setInterval(async () => {
      try {
        const isValid = await apiValidateSession(currentUser.id, currentUser.sessionToken!);
        if (!isValid) {
          clearInterval(sessionCheckInterval);
          alert('Your session has expired because you have logged in on another device. You will be logged out.');
          await apiLogout(currentUser.id);
          setCurrentUser(null);
        }
      } catch (error) {
        // If validation fails, log out
        clearInterval(sessionCheckInterval);
        console.error('Session validation error:', error);
        setCurrentUser(null);
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(sessionCheckInterval);
  }, [currentUser]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    // User data is already stored in localStorage by apiService
    setSelectedRoleForLogin(null);
  };

  const handleLogout = async () => {
    if (currentUser) {
      await apiLogout(currentUser.id);
    }
    setCurrentUser(null);
  };
  
  const handleRoleSelect = (role: Role) => {
    setSelectedRoleForLogin(role);
  };
  
  // A simple function to clear all mock data for demo purposes
  const handleResetData = () => {
    clearData();
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    window.location.reload();
  };
  
  // Allows child components to trigger a refresh of the user data from the source of truth
  const refreshCurrentUser = () => {
    if (currentUser) {
        const updatedUser = getCurrentUser();
        if(updatedUser) {
            setCurrentUser(updatedUser);
        }
    }
  };

  const renderContent = () => {
    if (currentUser) {
      if (currentUser.role === Role.Teacher) {
        return <TeacherDashboard teacher={currentUser} onLogout={handleLogout} />;
      }
      if (currentUser.role === Role.Student) {
        return <StudentDashboard student={currentUser} onLogout={handleLogout} refreshUser={refreshCurrentUser} />;
      }
      return <div>Invalid user role.</div>;
    }

    if (selectedRoleForLogin) {
      return <LoginComponent 
        onLogin={handleLogin} 
        role={selectedRoleForLogin} 
        onBack={() => setSelectedRoleForLogin(null)} 
      />;
    }

    // Role Selection UI
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4 bg-gray-900">
        <div className="mb-12">
            <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
                QuizDash
            </h1>
            <p className="text-lg text-gray-400 mt-2">The Seamless Quiz Experience</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
            <div 
                onClick={() => handleRoleSelect(Role.Teacher)} 
                className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-xl shadow-lg cursor-pointer transition-all duration-300 ease-in-out transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-indigo-500/30 border border-gray-700 hover:border-indigo-500 flex flex-col items-center"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h2 className="text-3xl font-bold mb-2 text-white">I am a Teacher</h2>
                <p className="text-gray-400">Create quizzes, manage classes, and track student progress.</p>
            </div>
            <div 
                onClick={() => handleRoleSelect(Role.Student)} 
                className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-xl shadow-lg cursor-pointer transition-all duration-300 ease-in-out transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-purple-500/30 border border-gray-700 hover:border-purple-500 flex flex-col items-center"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                  <path d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-6.5" />
                </svg>
                <h2 className="text-3xl font-bold mb-2 text-white">I am a Student</h2>
                <p className="text-gray-400">Take quizzes, join classes, and view your results.</p>
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      {renderContent()}
    </div>
  );
};

export default App;