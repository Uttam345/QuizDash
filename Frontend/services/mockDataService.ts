import { User, Role, Class, Question, Difficulty, Quiz, QuizAttempt, Subject, QuestionType, ClassWithTeacherName } from '../types';

const USERS_KEY = 'quiz_app_users';
const CLASSES_KEY = 'quiz_app_classes';
const SUBJECTS_KEY = 'quiz_app_subjects';
const QUESTIONS_KEY = 'quiz_app_questions';
const QUIZZES_KEY = 'quiz_app_quizzes';
const ATTEMPTS_KEY = 'quiz_app_attempts';

const getInitialData = (): void => {
  if (!localStorage.getItem(USERS_KEY)) {
    const initialUsers: User[] = [
      { id: 'teacher1', name: 'Dr. Ada Lovelace', email: 'ada@iiitl.ac.in', role: Role.Teacher, classIds: ['class1', 'class2'], password: 'password123' },
      { id: 'student1', name: 'Charles Babbage', email: 'charles@iiitl.ac.in', role: Role.Student, classIds: ['class1'], password: 'password123' },
      { id: 'student2', name: 'Grace Hopper', email: 'grace@iiitl.ac.in', role: Role.Student, classIds: ['class1', 'class2'], password: 'password123' },
      { id: 'student3', name: 'Alan Turing', email: 'alan@iiitl.ac.in', role: Role.Student, classIds: ['class2'], password: 'password123' },
    ];
    localStorage.setItem(USERS_KEY, JSON.stringify(initialUsers));
  }

  if (!localStorage.getItem(CLASSES_KEY)) {
    const initialClasses: Class[] = [
      { id: 'class1', name: 'CS-101: Intro to Computing', teacherId: 'teacher1', joinCode: 'A1B2C3' },
      { id: 'class2', name: 'CS-202: Data Structures', teacherId: 'teacher1', joinCode: 'D4E5F6' },
    ];
    localStorage.setItem(CLASSES_KEY, JSON.stringify(initialClasses));
  }

   if (!localStorage.getItem(SUBJECTS_KEY)) {
    const initialSubjects: Subject[] = [
      { id: 'subj1', name: 'Data Structures', teacherId: 'teacher1' },
      { id: 'subj2', name: 'Intro to Computing', teacherId: 'teacher1' },
    ];
    localStorage.setItem(SUBJECTS_KEY, JSON.stringify(initialSubjects));
  }
  
  if (!localStorage.getItem(QUESTIONS_KEY)) {
     const initialQuestions: Question[] = [
        { id: 'q1', type: QuestionType.SingleCorrect, text: 'What is the time complexity of a binary search algorithm?', options: [{text:'O(n)'}, {text:'O(log n)'}, {text:'O(n^2)'}, {text:'O(1)'}], correctAnswerIndex: 1, difficulty: Difficulty.Easy, authorId: 'teacher1', subject: 'Data Structures', marks: 1 },
        { id: 'q2', type: QuestionType.SingleCorrect, text: 'Which data structure uses LIFO (Last-In, First-Out)?', options: [{text:'Queue'}, {text:'Stack'}, {text:'Linked List'}, {text:'Tree'}], correctAnswerIndex: 1, difficulty: Difficulty.Easy, authorId: 'teacher1', subject: 'Data Structures', marks: 1 },
        { id: 'q3', type: QuestionType.FillInTheBlank, text: 'What does "API" stand for?', options: [], correctAnswerText: 'Application Programming Interface', difficulty: Difficulty.Medium, authorId: 'teacher1', subject: 'Intro to Computing', marks: 2 },
        { id: 'q4', type: QuestionType.MultipleCorrect, text: 'Which of the following are pillars of object-oriented programming?', options: [{text:'Inheritance'}, {text:'Encapsulation'}, {text:'Polymorphism'}, {text:'Compilation'}], correctAnswerIndices: [0, 1, 2], difficulty: Difficulty.Hard, authorId: 'teacher1', subject: 'Intro to Computing', marks: 3 },
        { id: 'q5', type: QuestionType.SingleCorrect, text: 'What is the purpose of this component in a circuit?', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Resistor_symbol_IEC.svg/128px-Resistor_symbol_IEC.svg.png', options: [{text:'Capacitor'}, {text:'Inductor'}, {text:'Resistor'}, {text:'Transistor'}], correctAnswerIndex: 2, difficulty: Difficulty.Easy, authorId: 'teacher1', subject: 'Intro to Computing', marks: 1 },
     ];
     localStorage.setItem(QUESTIONS_KEY, JSON.stringify(initialQuestions));
  }

  if (!localStorage.getItem(QUIZZES_KEY)) {
    const initialQuizzes: Quiz[] = [
      { id: 'quiz1', title: 'Fundamentals Quiz', classId: 'class1', questionIds: ['q3', 'q4'], durationMinutes: 10, createdBy: 'teacher1', subject: 'Intro to Computing', isReleased: true, answersReleased: false, tabSwitchThreshold: 3, totalMarks: 5 },
    ];
    localStorage.setItem(QUIZZES_KEY, JSON.stringify(initialQuizzes));
  }
  
  if (!localStorage.getItem(ATTEMPTS_KEY)) {
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify([]));
  }
};

const clearData = () => {
    localStorage.removeItem(USERS_KEY);
    localStorage.removeItem(CLASSES_KEY);
    localStorage.removeItem(SUBJECTS_KEY);
    localStorage.removeItem(QUESTIONS_KEY);
    localStorage.removeItem(QUIZZES_KEY);
    localStorage.removeItem(ATTEMPTS_KEY);
}

const getAll = <T,>(key: string): T[] => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

const saveAll = <T,>(key: string, data: T[]): void => {
    localStorage.setItem(key, JSON.stringify(data));
}

// User Functions
export const getUserByEmail = (email: string): User | undefined => getAll<User>(USERS_KEY).find(u => u.email === email);
export const getUserById = (id: string): User | undefined => getAll<User>(USERS_KEY).find(u => u.id === id);
export const authenticateUser = (email: string, password?: string): User | null => {
    const users = getAll<User>(USERS_KEY);
    const userIndex = users.findIndex(u => u.email === email && u.password === password);
    
    if (userIndex !== -1) {
        const user = users[userIndex];
        // Generate and assign a new session token on every successful login
        const sessionToken = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
        users[userIndex] = { ...user, sessionToken };
        saveAll<User>(USERS_KEY, users);
        return users[userIndex];
    }
    return null;
}
export const addUser = (user: Omit<User, 'id' | 'classIds'>): User => {
    const users = getAll<User>(USERS_KEY);
    const newUser: User = { 
        ...user, 
        id: `${user.role.substring(0,1)}${Date.now()}`, // e.g., s167... or t167...
        classIds: [] 
    };
    saveAll<User>(USERS_KEY, [...users, newUser]);
    return newUser;
};
export const clearUserSession = (userId: string): void => {
    const users = getAll<User>(USERS_KEY);
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
        delete users[userIndex].sessionToken; // Remove the token
        saveAll<User>(USERS_KEY, users);
    }
};
export const validateSession = (userId: string, sessionToken: string): boolean => {
    const user = getUserById(userId);
    return !!user && user.sessionToken === sessionToken;
};


// Class Functions
export const getClassesByTeacher = (teacherId: string): Class[] => getAll<Class>(CLASSES_KEY).filter(c => c.teacherId === teacherId);
export const getClassesByStudent = (studentId: string): ClassWithTeacherName[] => {
    const student = getUserById(studentId);
    if (!student) return [];
    
    const allUsers = getAll<User>(USERS_KEY);
    const allClasses = getAll<Class>(CLASSES_KEY);

    const studentClasses = allClasses.filter(c => student.classIds.includes(c.id));
    
    return studentClasses.map(c => {
        const teacher = allUsers.find(u => u.id === c.teacherId);
        return {
            ...c,
            teacherName: teacher?.name || 'Unknown Teacher'
        };
    });
}
export const getClassById = (id: string): Class | undefined => getAll<Class>(CLASSES_KEY).find(c => c.id === id);
export const addClass = (name: string, teacherId: string): Class => {
    const classes = getAll<Class>(CLASSES_KEY);
    const newClass: Class = { 
        id: `class${Date.now()}`, 
        name, 
        teacherId,
        joinCode: Math.random().toString(36).substring(2, 8).toUpperCase()
    };
    saveAll<Class>(CLASSES_KEY, [...classes, newClass]);

    const users = getAll<User>(USERS_KEY);
    const teacher = users.find(u => u.id === teacherId);
    if (teacher) {
        const updatedTeacher = {
            ...teacher,
            classIds: [...teacher.classIds, newClass.id],
        };
        const updatedUsers = users.map(u => u.id === teacherId ? updatedTeacher : u);
        saveAll<User>(USERS_KEY, updatedUsers);
    }

    return newClass;
};
export const deleteClass = (classId: string): void => {
    const classes = getAll<Class>(CLASSES_KEY).filter(c => c.id !== classId);
    saveAll(CLASSES_KEY, classes);

    const quizzes = getAll<Quiz>(QUIZZES_KEY).filter(q => q.classId !== classId);
    saveAll(QUIZZES_KEY, quizzes);

    const users = getAll<User>(USERS_KEY).map(u => ({
        ...u,
        classIds: u.classIds.filter(id => id !== classId)
    }));
    saveAll(USERS_KEY, users);
};
export const renameClass = (classId: string, newName: string): void => {
    const classes = getAll<Class>(CLASSES_KEY);
    const classIndex = classes.findIndex(c => c.id === classId);
    if (classIndex !== -1) {
        classes[classIndex].name = newName;
        saveAll(CLASSES_KEY, classes);
    }
};
export const getClassByJoinCode = (code: string): Class | undefined => getAll<Class>(CLASSES_KEY).find(c => c.joinCode === code);
export const joinClass = (studentId: string, joinCode: string): { success: boolean, message: string } => {
    const student = getUserById(studentId);
    const classToJoin = getClassByJoinCode(joinCode.toUpperCase());

    if (!student || !classToJoin) {
        return { success: false, message: 'Invalid join code. Please check and try again.' };
    }
    if (student.classIds.includes(classToJoin.id)) {
        return { success: false, message: 'You are already enrolled in this class.' };
    }

    const users = getAll<User>(USERS_KEY);
    const userToUpdate = users.find(u => u.id === studentId);
    if (userToUpdate) {
        const updatedStudent = {
            ...userToUpdate,
            classIds: [...userToUpdate.classIds, classToJoin.id],
        };
        const updatedUsers = users.map(u => u.id === studentId ? updatedStudent : u);
        saveAll(USERS_KEY, updatedUsers);
        return { success: true, message: `Successfully joined ${classToJoin.name}!` };
    }
    return { success: false, message: 'An unknown error occurred.' };
};
export const getStudentsByClassId = (classId: string): User[] => {
    const allUsers = getAll<User>(USERS_KEY);
    return allUsers.filter(user => user.role === Role.Student && user.classIds.includes(classId));
};

// Subject Functions
export const getSubjectsByTeacher = (teacherId: string): Subject[] => getAll<Subject>(SUBJECTS_KEY).filter(s => s.teacherId === teacherId);
export const addSubject = (name: string, teacherId: string): Subject => {
    const subjects = getAll<Subject>(SUBJECTS_KEY);
    const newSubject: Subject = { id: `subj${Date.now()}`, name, teacherId };
    saveAll(SUBJECTS_KEY, [...subjects, newSubject]);
    return newSubject;
};
export const deleteSubject = (subjectId: string, teacherId: string): void => {
    const subjects = getAll<Subject>(SUBJECTS_KEY);
    const subjectToDelete = subjects.find(s => s.id === subjectId);
    if (!subjectToDelete) return;
    
    saveAll(SUBJECTS_KEY, subjects.filter(s => s.id !== subjectId));

    const questions = getAll<Question>(QUESTIONS_KEY).filter(q => !(q.subject === subjectToDelete.name && q.authorId === teacherId));
    saveAll(QUESTIONS_KEY, questions);

    const quizzes = getAll<Quiz>(QUIZZES_KEY).filter(q => !(q.subject === subjectToDelete.name && q.createdBy === teacherId));
    saveAll(QUIZZES_KEY, quizzes);
};


// Question Functions
export const getAllQuestions = (): Question[] => getAll<Question>(QUESTIONS_KEY);
export const getQuestionsByAuthorAndSubject = (authorId: string, subject: string): Question[] => {
    return getAll<Question>(QUESTIONS_KEY).filter(q => q.authorId === authorId && q.subject === subject);
}
export const getQuestionsByAuthor = (authorId: string): Question[] => getAll<Question>(QUESTIONS_KEY).filter(q => q.authorId === authorId);
export const addQuestion = (question: Omit<Question, 'id'>): Question => {
    const questions = getAll<Question>(QUESTIONS_KEY);
    const newQuestion: Question = { ...question, id: `q${Date.now()}` };
    saveAll<Question>(QUESTIONS_KEY, [...questions, newQuestion]);
    return newQuestion;
}
export const deleteQuestion = (questionId: string): void => {
    const questions = getAll<Question>(QUESTIONS_KEY).filter(q => q.id !== questionId);
    saveAll(QUESTIONS_KEY, questions);
};
export const getQuestionsByIds = (ids: string[]): Question[] => {
    const allQuestions = getAll<Question>(QUESTIONS_KEY);
    // Preserve order of IDs
    return ids.map(id => allQuestions.find(q => q.id === id)).filter((q): q is Question => q !== undefined);
};


// Quiz Functions
export const getQuizzesByClass = (classId: string): Quiz[] => getAll<Quiz>(QUIZZES_KEY).filter(q => q.classId === classId);
export const getReleasedQuizzesByClass = (classId: string): Quiz[] => getAll<Quiz>(QUIZZES_KEY).filter(q => q.classId === classId && q.isReleased);

export const addQuiz = (quiz: Omit<Quiz, 'id' | 'isReleased' | 'answersReleased' | 'totalMarks'>): Quiz => {
    const quizzes = getAll<Quiz>(QUIZZES_KEY);
    const questionsForQuiz = getQuestionsByIds(quiz.questionIds);
    const totalMarks = questionsForQuiz.reduce((sum, q) => sum + q.marks, 0);

    const newQuiz: Quiz = { 
        ...quiz, 
        id: `quiz${Date.now()}`,
        isReleased: false,
        answersReleased: false,
        totalMarks: totalMarks,
    };
    saveAll<Quiz>(QUIZZES_KEY, [...quizzes, newQuiz]);
    return newQuiz;
}
export const getQuizById = (id: string): Quiz | undefined => getAll<Quiz>(QUIZZES_KEY).find(q => q.id === id);
export const updateQuizStatus = (quizId: string, updates: Partial<Pick<Quiz, 'isReleased' | 'answersReleased'>>): void => {
    const quizzes = getAll<Quiz>(QUIZZES_KEY);
    const quizIndex = quizzes.findIndex(q => q.id === quizId);
    if (quizIndex !== -1) {
        quizzes[quizIndex] = { ...quizzes[quizIndex], ...updates };
        saveAll(QUIZZES_KEY, quizzes);
    }
};

// Quiz Attempt Functions
export const getAttemptsByQuiz = (quizId: string): QuizAttempt[] => getAll<QuizAttempt>(ATTEMPTS_KEY).filter(a => a.quizId === quizId);
export const getAttemptByUserAndQuiz = (studentId: string, quizId: string): QuizAttempt | undefined => getAll<QuizAttempt>(ATTEMPTS_KEY).find(a => a.studentId === studentId && a.quizId === quizId);
export const saveAttempt = (attempt: Omit<QuizAttempt, 'id'> | QuizAttempt): QuizAttempt => {
    const attempts = getAll<QuizAttempt>(ATTEMPTS_KEY);
    if ('id' in attempt) { // Update existing
        const index = attempts.findIndex(a => a.id === attempt.id);
        if (index !== -1) {
            attempts[index] = attempt;
            saveAll<QuizAttempt>(ATTEMPTS_KEY, attempts);
            return attempt;
        }
    }
    // Create new
    const newAttempt: QuizAttempt = { ...attempt, id: `att${Date.now()}` };
    saveAll<QuizAttempt>(ATTEMPTS_KEY, [...attempts, newAttempt]);
    return newAttempt;
}

export { getInitialData, clearData };