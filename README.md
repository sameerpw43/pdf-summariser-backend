# PDF Summarizer Backend

A Node.js backend API for an AI-powered PDF and document summarization application. This service provides document processing, AI-generated summaries, flashcards, and quizzes using OpenAI and Hugging Face APIs.

## Features

- **User Authentication**: JWT-based authentication with registration and login
- **Document Upload**: Support for PDF and DOCX file uploads
- **AI Summarization**: Automatic document summarization using OpenAI GPT or Hugging Face models
- **Flashcard Generation**: AI-generated educational flashcards from document content
- **Quiz Generation**: Multiple-choice quiz creation based on document content
- **MongoDB Storage**: Persistent storage for users and documents
- **CORS Support**: Cross-origin resource sharing for frontend integration

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens) with bcrypt password hashing
- **File Processing**: 
  - PDF parsing with `pdf-parse`
  - DOCX parsing with `mammoth`
- **AI Services**:
  - OpenAI GPT-3.5-turbo
  - Hugging Face API (BART for summarization, DialoGPT for text generation)
- **File Upload**: Multer for multipart form data
- **Deployment**: Vercel-ready configuration

## API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login

### Documents
- `POST /api/upload-pdf` - Upload and process PDF/DOCX documents
- `GET /api/documents` - Get user's documents list
- `GET /api/documents/:id` - Get specific document details

### AI Features
- `POST /api/documents/:id/summarize` - Generate/regenerate document summary
- `POST /api/documents/:id/flashcards` - Generate flashcards for a document
- `GET /api/documents/:id/flashcards` - Get flashcards for a document
- `POST /api/documents/:id/quiz` - Generate quiz for a document
- `GET /api/documents/:id/quiz` - Get quiz for a document

### Health Check
- `GET /api/health` - API health status

## Installation

1. Clone the repository and navigate to the backend directory:
   ```bash
   cd pdf-summarizer-be
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```env
   PORT=8080
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   OPENAI_API_KEY=your_openai_api_key
   HUGGINGFACE_API_KEY=your_huggingface_api_key
   ```

## Usage

### Development
Start the development server with auto-reload:
```bash
npm run dev
```

### Production
Start the production server:
```bash
npm start
```

The server will run on `http://localhost:8080` by default.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 8080) | No |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | Secret key for JWT token signing | Yes |
| `OPENAI_API_KEY` | OpenAI API key for GPT models | No* |
| `HUGGINGFACE_API_KEY` | Hugging Face API key | No* |

*At least one AI service (OpenAI or Hugging Face) is required for summarization features.

## Deployment

This application is configured for deployment on Vercel. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## Project Structure

```
pdf-summarizer-be/
├── server.js              # Main application file
├── api/
│   └── index.js          # Vercel serverless function entry point
├── package.json          # Dependencies and scripts
├── vercel.json           # Vercel deployment configuration
├── DEPLOYMENT.md         # Deployment guide
└── README.md             # This file
```

## Dependencies

### Production
- `express` - Web framework
- `mongoose` - MongoDB ODM
- `jsonwebtoken` - JWT authentication
- `bcryptjs` - Password hashing
- `multer` - File upload handling
- `pdf-parse` - PDF text extraction
- `mammoth` - DOCX text extraction
- `openai` - OpenAI API client
- `axios` - HTTP client for Hugging Face API
- `cors` - Cross-origin resource sharing
- `dotenv` - Environment variable loading

### Development
- `nodemon` - Development server with auto-reload

## Error Handling

The API includes comprehensive error handling for:
- Authentication failures
- File upload errors
- AI service unavailability (with fallback mechanisms)
- Database connection issues
- Invalid file types

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- CORS configuration
- Input validation
- Secure environment variable handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

ISC License</content>
<parameter name="filePath">/Users/appdev2elatecare/Desktop/untitled folder/pdf-summarizer-be/README.md