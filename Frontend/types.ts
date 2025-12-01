export enum Role {
  Student = 'student',
  Teacher = 'teacher',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  classIds: string[];
  password?: string; // Storing plain-text for mock purposes. Use a hash in a real app.
  sessionToken?: string;
}

export interface Class {
  id: string;
  name:string;
  teacherId: string;
  joinCode: string;
}

export interface ClassWithTeacherName extends Class {
  teacherName: string;
}

export interface Subject {
  id: string;
  name: string;
  teacherId: string;
}

export enum Difficulty {
  Easy = 'Easy',
  Medium = 'Medium',
  Hard = 'Hard',
}

export enum QuestionType {
  SingleCorrect = 'single-correct',
  MultipleCorrect = 'multiple-correct',
  FillInTheBlank = 'fill-in-the-blank',
}

export interface QuestionOption {
  text: string;
  imageUrl?: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  imageUrl?: string;
  options: QuestionOption[];
  correctAnswerIndex?: number; // For SingleCorrect
  correctAnswerIndices?: number[]; // For MultipleCorrect
  correctAnswerText?: string; // For FillInTheBlank
  difficulty: Difficulty;
  authorId: string; // teacher's ID
  subject: string;
  marks: number;
}


export interface Quiz {
  id: string;
  title: string;
  classId: string;
  questionIds: string[];
  durationMinutes: number; // Duration in minutes
  tabSwitchThreshold: number;
  totalMarks: number;
  createdBy: string; // teacher's ID
  subject: string;
  isReleased: boolean;
  answersReleased: boolean;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  answers: { [questionId: string]: number | number[] | string }; // questionId -> selectedOptionIndex(es) or text
  score: number; // Percentage
  achievedMarks: number;
  startTime: number; // timestamp
  endTime: number | null; // timestamp or null if in progress
  tabSwitches: number;
  submitted: boolean;
  questionIds: string[];
}