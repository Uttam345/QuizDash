# QuizDash

Quiz management platform for teachers and students.

## Features

- **Teachers:** Create classes, questions, and quizzes. View student results.
- **Students:** Join classes and take quizzes with proctoring.

## Tech Stack

MERN (MongoDB, Express, React, Node.js) + TypeScript

## Setup

1. Install dependencies:
```bash
cd Backend && npm install
cd ../Frontend && npm install
```

2. Configure environment:

**Backend/.env**
```
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_secret
PORT=5000
```

**Frontend/.env**
```
VITE_API_URL=http://localhost:5000/api
```

3. Run:
```bash
# Backend
cd Backend && npm run dev

# Frontend  
cd Frontend && npm run dev
```

## Project Structure

```
Backend/    # Node.js API
Frontend/   # React app
```
