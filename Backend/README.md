# Backend

Node.js/Express API with MongoDB.

## Setup

```bash
npm install
```

Create `.env`:
```
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_secret
PORT=5000
```

## Run

```bash
npm run dev
```

## Structure

```
controllers/  # Business logic
models/       # MongoDB schemas
routes/       # API endpoints
middleware/   # Auth & validation
server.js     # Entry point
```

