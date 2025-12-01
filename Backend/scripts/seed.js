import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import connectDB from '../config/database.js';
import User from '../models/User.js';
import Class from '../models/Class.js';
import Subject from '../models/Subject.js';
import Question from '../models/Question.js';
import Quiz from '../models/Quiz.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB();

    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Class.deleteMany({});
    await Subject.deleteMany({});
    await Question.deleteMany({});
    await Quiz.deleteMany({});

    console.log('Creating users...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    const teacher1 = await User.create({
      name: 'Dr. Ada Lovelace',
      email: 'ada@iiitl.ac.in',
      password: hashedPassword,
      role: 'teacher',
      classIds: [],
    });

    const student1 = await User.create({
      name: 'Charles Babbage',
      email: 'charles@iiitl.ac.in',
      password: hashedPassword,
      role: 'student',
      classIds: [],
    });

    const student2 = await User.create({
      name: 'Grace Hopper',
      email: 'grace@iiitl.ac.in',
      password: hashedPassword,
      role: 'student',
      classIds: [],
    });

    const student3 = await User.create({
      name: 'Alan Turing',
      email: 'alan@iiitl.ac.in',
      password: hashedPassword,
      role: 'student',
      classIds: [],
    });

    console.log('Creating classes...');
    const class1 = await Class.create({
      name: 'CS-101: Intro to Computing',
      teacherId: teacher1._id,
      joinCode: 'A1B2C3',
    });

    const class2 = await Class.create({
      name: 'CS-202: Data Structures',
      teacherId: teacher1._id,
      joinCode: 'D4E5F6',
    });

    // Update teacher's classIds
    teacher1.classIds = [class1._id, class2._id];
    await teacher1.save();

    // Enroll students in classes
    student1.classIds = [class1._id];
    await student1.save();

    student2.classIds = [class1._id, class2._id];
    await student2.save();

    student3.classIds = [class2._id];
    await student3.save();

    console.log('Creating subjects...');
    await Subject.create({
      name: 'Data Structures',
      teacherId: teacher1._id,
    });

    await Subject.create({
      name: 'Intro to Computing',
      teacherId: teacher1._id,
    });

    console.log('Creating questions...');
    const q1 = await Question.create({
      type: 'single-correct',
      text: 'What is the time complexity of a binary search algorithm?',
      options: [
        { text: 'O(n)' },
        { text: 'O(log n)' },
        { text: 'O(n^2)' },
        { text: 'O(1)' },
      ],
      correctAnswerIndex: 1,
      difficulty: 'Easy',
      authorId: teacher1._id,
      subject: 'Data Structures',
      marks: 1,
    });

    const q2 = await Question.create({
      type: 'single-correct',
      text: 'Which data structure uses LIFO (Last-In, First-Out)?',
      options: [
        { text: 'Queue' },
        { text: 'Stack' },
        { text: 'Linked List' },
        { text: 'Tree' },
      ],
      correctAnswerIndex: 1,
      difficulty: 'Easy',
      authorId: teacher1._id,
      subject: 'Data Structures',
      marks: 1,
    });

    const q3 = await Question.create({
      type: 'fill-in-the-blank',
      text: 'What does "API" stand for?',
      options: [],
      correctAnswerText: 'Application Programming Interface',
      difficulty: 'Medium',
      authorId: teacher1._id,
      subject: 'Intro to Computing',
      marks: 2,
    });

    const q4 = await Question.create({
      type: 'multiple-correct',
      text: 'Which of the following are pillars of object-oriented programming?',
      options: [
        { text: 'Inheritance' },
        { text: 'Encapsulation' },
        { text: 'Polymorphism' },
        { text: 'Compilation' },
      ],
      correctAnswerIndices: [0, 1, 2],
      difficulty: 'Hard',
      authorId: teacher1._id,
      subject: 'Intro to Computing',
      marks: 3,
    });

    const q5 = await Question.create({
      type: 'single-correct',
      text: 'What is the purpose of this component in a circuit?',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Resistor_symbol_IEC.svg/128px-Resistor_symbol_IEC.svg.png',
      options: [
        { text: 'Capacitor' },
        { text: 'Inductor' },
        { text: 'Resistor' },
        { text: 'Transistor' },
      ],
      correctAnswerIndex: 2,
      difficulty: 'Easy',
      authorId: teacher1._id,
      subject: 'Intro to Computing',
      marks: 1,
    });

    console.log('Creating quizzes...');
    await Quiz.create({
      title: 'Fundamentals Quiz',
      classId: class1._id,
      questionIds: [q3._id, q4._id],
      durationMinutes: 10,
      tabSwitchThreshold: 3,
      totalMarks: 5,
      createdBy: teacher1._id,
      subject: 'Intro to Computing',
      isReleased: true,
      answersReleased: false,
    });

    console.log('✅ Database seeded successfully!');
    console.log('\n📝 Demo Accounts:');
    console.log('Teacher: ada@iiitl.ac.in / password123');
    console.log('Student 1: charles@iiitl.ac.in / password123');
    console.log('Student 2: grace@iiitl.ac.in / password123');
    console.log('Student 3: alan@iiitl.ac.in / password123');
    console.log('\n🔑 Class Join Codes:');
    console.log('CS-101: A1B2C3');
    console.log('CS-202: D4E5F6');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
