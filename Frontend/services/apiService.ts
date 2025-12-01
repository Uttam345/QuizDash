import { User, Role } from '../types';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper function to handle API errors
const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

// Helper function for fetch requests
const fetchWithConfig = async (url: string, options: RequestInit = {}) => {
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = localStorage.getItem('authToken');
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include', // Include cookies for CSRF protection
  };

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, config);
    
    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Server returned an invalid response');
    }
    
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error: any) {
    // Handle network errors
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('Unable to connect to server. Please check your internet connection.');
    }
    throw error;
  }
};

// Authentication APIs
export const apiRegister = async (
  name: string,
  email: string,
  password: string,
  role: Role
): Promise<{ user: User; token: string }> => {
  try {
    const data = await fetchWithConfig('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    });

    if (data.success && data.token) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      return { user: data.user, token: data.token };
    }

    throw new Error(data.message || 'Registration failed');
  } catch (error: any) {
    throw new Error(handleApiError(error));
  }
};

export const apiLogin = async (
  email: string,
  password: string
): Promise<{ user: User; token: string }> => {
  try {
    const data = await fetchWithConfig('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (data.success && data.token) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      return { user: data.user, token: data.token };
    }

    throw new Error(data.message || 'Login failed');
  } catch (error: any) {
    throw new Error(handleApiError(error));
  }
};

export const apiLogout = async (userId: string): Promise<void> => {
  try {
    await fetchWithConfig('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });

    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
  } catch (error: any) {
    console.error('Logout error:', error);
    // Still clear local data even if API call fails
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
  }
};

export const apiValidateSession = async (
  userId: string,
  sessionToken: string
): Promise<boolean> => {
  try {
    const data = await fetchWithConfig('/auth/validate', {
      method: 'POST',
      body: JSON.stringify({ userId, sessionToken }),
    });

    return data.valid === true;
  } catch (error: any) {
    console.error('Session validation error:', error);
    return false;
  }
};

// Get current user from localStorage
export const getCurrentUser = (): User | null => {
  try {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Clear authentication data
export const clearAuthData = (): void => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('authToken') && !!localStorage.getItem('currentUser');
};

export default {
  apiRegister,
  apiLogin,
  apiLogout,
  apiValidateSession,
  getCurrentUser,
  clearAuthData,
  isAuthenticated,
};

// Class Management APIs
export const apiGetStudentClasses = async (studentId: string): Promise<any[]> => {
  try {
    const data = await fetchWithConfig(`/classes/student/${studentId}`);
    return data.classes || [];
  } catch (error: any) {
    console.error('Get student classes error:', error);
    throw new Error(handleApiError(error));
  }
};

export const apiGetTeacherClasses = async (teacherId: string): Promise<any[]> => {
  try {
    const data = await fetchWithConfig(`/classes/teacher/${teacherId}`);
    return data.classes || [];
  } catch (error: any) {
    console.error('Get teacher classes error:', error);
    throw new Error(handleApiError(error));
  }
};

export const apiJoinClass = async (
  studentId: string,
  joinCode: string
): Promise<{ success: boolean; message: string; class?: any }> => {
  try {
    const data = await fetchWithConfig('/classes/join', {
      method: 'POST',
      body: JSON.stringify({ studentId, joinCode: joinCode.toUpperCase().trim() }),
    });

    return {
      success: data.success,
      message: data.message || 'Successfully joined the class',
      class: data.class,
    };
  } catch (error: any) {
    return {
      success: false,
      message: handleApiError(error),
    };
  }
};

export const apiCreateClass = async (name: string, teacherId: string): Promise<any> => {
  try {
    const data = await fetchWithConfig('/classes', {
      method: 'POST',
      body: JSON.stringify({ name, teacherId }),
    });

    return data.class;
  } catch (error: any) {
    throw new Error(handleApiError(error));
  }
};

export const apiDeleteClass = async (classId: string): Promise<void> => {
  try {
    await fetchWithConfig(`/classes/${classId}`, {
      method: 'DELETE',
    });
  } catch (error: any) {
    throw new Error(handleApiError(error));
  }
};

export const apiUpdateClass = async (classId: string, name: string): Promise<any> => {
  try {
    const data = await fetchWithConfig(`/classes/${classId}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });

    return data.class;
  } catch (error: any) {
    throw new Error(handleApiError(error));
  }
};

export const apiGetClassMembers = async (classId: string): Promise<any[]> => {
  try {
    const data = await fetchWithConfig(`/classes/${classId}/students`);
    return data.students || [];
  } catch (error: any) {
    console.error('Get class members error:', error);
    throw new Error(handleApiError(error));
  }
};

// Quiz Management APIs
export const apiGetQuizzesByClass = async (classId: string): Promise<any[]> => {
  try {
    const data = await fetchWithConfig(`/quizzes/class/${classId}`);
    return data.quizzes || [];
  } catch (error: any) {
    console.error('Get quizzes by class error:', error);
    throw new Error(handleApiError(error));
  }
};

export const apiGetQuizById = async (quizId: string): Promise<any> => {
  try {
    const data = await fetchWithConfig(`/quizzes/${quizId}`);
    return data.quiz;
  } catch (error: any) {
    console.error('Get quiz by ID error:', error);
    throw new Error(handleApiError(error));
  }
};

export const apiCreateQuiz = async (quizData: {
  title: string;
  classId: string;
  questionIds: string[];
  durationMinutes: number;
  tabSwitchThreshold: number;
  totalMarks: number;
  subject: string;
  createdBy: string;
}): Promise<any> => {
  try {
    const data = await fetchWithConfig('/quizzes', {
      method: 'POST',
      body: JSON.stringify(quizData),
    });

    return data.quiz;
  } catch (error: any) {
    console.error('Create quiz error:', error);
    throw new Error(handleApiError(error));
  }
};

export const apiUpdateQuiz = async (
  quizId: string,
  updates: {
    title?: string;
    durationMinutes?: number;
    tabSwitchThreshold?: number;
  }
): Promise<any> => {
  try {
    const data = await fetchWithConfig(`/quizzes/${quizId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    return data.quiz;
  } catch (error: any) {
    console.error('Update quiz error:', error);
    throw new Error(handleApiError(error));
  }
};

export const apiUpdateQuizStatus = async (
  quizId: string,
  status: { isReleased?: boolean; answersReleased?: boolean }
): Promise<any> => {
  try {
    const data = await fetchWithConfig(`/quizzes/${quizId}/status`, {
      method: 'PUT',
      body: JSON.stringify(status),
    });

    return data.quiz;
  } catch (error: any) {
    console.error('Update quiz status error:', error);
    throw new Error(handleApiError(error));
  }
};

export const apiDeleteQuiz = async (quizId: string): Promise<void> => {
  try {
    await fetchWithConfig(`/quizzes/${quizId}`, {
      method: 'DELETE',
    });
  } catch (error: any) {
    console.error('Delete quiz error:', error);
    throw new Error(handleApiError(error));
  }
};

// Subject APIs
export const apiGetSubjectsByTeacher = async (teacherId: string): Promise<any[]> => {
  try {
    const data = await fetchWithConfig(`/subjects/teacher/${teacherId}`);
    return data.subjects || [];
  } catch (error: any) {
    console.error('Get subjects by teacher error:', error);
    throw new Error(handleApiError(error));
  }
};

export const apiCreateSubject = async (subjectData: {
  name: string;
  teacherId: string;
}): Promise<any> => {
  try {
    const data = await fetchWithConfig('/subjects', {
      method: 'POST',
      body: JSON.stringify(subjectData),
    });
    return data.subject;
  } catch (error: any) {
    console.error('Create subject error:', error);
    throw new Error(handleApiError(error));
  }
};

export const apiDeleteSubject = async (subjectId: string): Promise<void> => {
  try {
    await fetchWithConfig(`/subjects/${subjectId}`, {
      method: 'DELETE',
    });
  } catch (error: any) {
    console.error('Delete subject error:', error);
    throw new Error(handleApiError(error));
  }
};

// Question Bank APIs
export const apiGetQuestionsByAuthor = async (authorId: string): Promise<any[]> => {
  try {
    const data = await fetchWithConfig(`/questions/author/${authorId}`);
    return data.questions || [];
  } catch (error: any) {
    console.error('Get questions by author error:', error);
    throw new Error(handleApiError(error));
  }
};

export const apiGetQuestionsBySubject = async (
  subject: string,
  authorId?: string
): Promise<any[]> => {
  try {
    const url = authorId
      ? `/questions/subject/${subject}?authorId=${authorId}`
      : `/questions/subject/${subject}`;
    const data = await fetchWithConfig(url);
    return data.questions || [];
  } catch (error: any) {
    console.error('Get questions by subject error:', error);
    throw new Error(handleApiError(error));
  }
};

export const apiGetQuestionsByIds = async (questionIds: string[]): Promise<any[]> => {
  try {
    const data = await fetchWithConfig('/questions/batch', {
      method: 'POST',
      body: JSON.stringify({ questionIds }),
    });
    return data.questions || [];
  } catch (error: any) {
    console.error('Get questions by IDs error:', error);
    throw new Error(handleApiError(error));
  }
};

export const apiCreateQuestion = async (questionData: {
  type: 'single-correct' | 'multiple-correct' | 'fill-in-the-blank';
  text: string;
  imageUrl?: string;
  options?: { text: string; imageUrl?: string }[];
  correctAnswerIndex?: number;
  correctAnswerIndices?: number[];
  correctAnswerText?: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  authorId: string;
  subject: string;
  marks: number;
}): Promise<any> => {
  try {
    const data = await fetchWithConfig('/questions', {
      method: 'POST',
      body: JSON.stringify(questionData),
    });

    return data.question;
  } catch (error: any) {
    console.error('Create question error:', error);
    throw new Error(handleApiError(error));
  }
};

export const apiDeleteQuestion = async (questionId: string): Promise<void> => {
  try {
    await fetchWithConfig(`/questions/${questionId}`, {
      method: 'DELETE',
    });
  } catch (error: any) {
    console.error('Delete question error:', error);
    throw new Error(handleApiError(error));
  }
};

// Quiz Attempt APIs
export const apiGetAttemptByQuizAndStudent = async (
  quizId: string,
  studentId: string
): Promise<any | null> => {
  try {
    const data = await fetchWithConfig(`/attempts/quiz/${quizId}/student/${studentId}`);
    return data.attempt;
  } catch (error: any) {
    // Return null if attempt not found (404)
    if (error.message?.includes('not found') || error.message?.includes('404')) {
      return null;
    }
    console.error('Get attempt error:', error);
    throw new Error(handleApiError(error));
  }
};

export const apiGetAttemptsByQuiz = async (quizId: string): Promise<any[]> => {
  try {
    const data = await fetchWithConfig(`/attempts/quiz/${quizId}`);
    return data.attempts || [];
  } catch (error: any) {
    console.error('Get attempts by quiz error:', error);
    throw new Error(handleApiError(error));
  }
};

export const apiSaveAttempt = async (attemptData: {
  quizId: string;
  studentId: string;
  questionIds: string[];
  answers?: Record<string, any>;
  tabSwitches?: number;
  score?: number;
  achievedMarks?: number;
  startTime: number;
  endTime?: number;
  submitted?: boolean;
}): Promise<any> => {
  try {
    const data = await fetchWithConfig('/attempts', {
      method: 'POST',
      body: JSON.stringify(attemptData),
    });

    return data.attempt;
  } catch (error: any) {
    console.error('Save attempt error:', error);
    throw new Error(handleApiError(error));
  }
};

export const apiUpdateAttempt = async (
  attemptId: string,
  updates: {
    answers?: Record<string, any>;
    tabSwitches?: number;
    score?: number;
    achievedMarks?: number;
    endTime?: number;
    submitted?: boolean;
  }
): Promise<any> => {
  try {
    const data = await fetchWithConfig(`/attempts/${attemptId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    return data.attempt;
  } catch (error: any) {
    console.error('Update attempt error:', error);
    throw new Error(handleApiError(error));
  }
};

// User APIs
export const apiGetUserById = async (userId: string): Promise<any> => {
  try {
    const data = await fetchWithConfig(`/users/${userId}`);
    return data.user;
  } catch (error: any) {
    console.error('Get user by ID error:', error);
    throw new Error(handleApiError(error));
  }
};
