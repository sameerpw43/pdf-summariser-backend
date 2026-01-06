const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const axios = require('axios');
const { OpenAI } = require('openai');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
require('dotenv').config();

console.log('Environment variables loaded:');
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Set (hidden for security)' : 'Not set');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set (hidden for security)' : 'Not set');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set (hidden for security)' : 'Not set');
console.log('HUGGINGFACE_API_KEY:', process.env.HUGGINGFACE_API_KEY ? 'Set (hidden for security)' : 'Not set');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI )
  .then(() => {
    console.log('Connected to MongoDB successfully');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

// MongoDB connection event listeners
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected');
});

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Document Schema
const documentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  summary: { type: String },
  flashcards: [{ 
    question: String, 
    answer: String 
  }],
  quiz: [{
    question: String,
    options: [String],
    correctAnswer: Number
  }],
  createdAt: { type: Date, default: Date.now }
});

const Document = mongoose.model('Document', documentSchema);

// OpenAI configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Hugging Face API configuration
const HF_API_URL = 'https://api-inference.huggingface.co/models';
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

// Hugging Face API helper functions
async function callHuggingFaceAPI(modelName, inputs, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.post(
        `${HF_API_URL}/${modelName}`,
        { inputs },
        {
          headers: {
            'Authorization': `Bearer ${HF_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout
        }
      );
      
      if (response.data.error && response.data.error.includes('loading')) {
        console.log(`Model loading, attempt ${attempt}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Wait longer each attempt
        continue;
      }
      
      return response.data;
    } catch (error) {
      console.error(`HuggingFace API attempt ${attempt} failed:`, error.message);
      if (attempt === maxRetries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

async function generateSummaryHF(text) {
  try {
    // Use BART model for summarization
    const result = await callHuggingFaceAPI('facebook/bart-large-cnn', text);
    return result[0]?.summary_text || result.summary_text || 'Summary generation failed';
  } catch (error) {
    console.error('Hugging Face summarization failed:', error);
    throw error;
  }
}

async function generateTextHF(prompt, modelName = 'microsoft/DialoGPT-medium') {
  try {
    const result = await callHuggingFaceAPI(modelName, prompt);
    return result[0]?.generated_text || result.generated_text || 'Text generation failed';
  } catch (error) {
    console.error('Hugging Face text generation failed:', error);
    throw error;
  }
}

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};
// Auth Routes
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      name
    });
    
    await user.save();
    
    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: user._id, email: user.email, name: user.name }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, email: user.email, name: user.name }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Document Routes
app.post('/api/upload-pdf', authenticateToken, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document file uploaded' });
    }

    const fileType = req.file.mimetype;
    const fileName = req.file.originalname;
    let content = '';

    // Check file type and extract text accordingly
    if (fileType === 'application/pdf') {
      // Parse PDF
      const pdfData = await pdfParse(req.file.buffer);
      content = pdfData.text;
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
               fileName.toLowerCase().endsWith('.docx')) {
      // Parse DOCX
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      content = result.value;
    } else {
      return res.status(400).json({ 
        error: 'Unsupported file type. Please upload PDF or DOCX files only.' 
      });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Could not extract text from the document' });
    }

    // Generate a summary using AI (try Hugging Face first, then OpenAI, then fallback)
    let summary;
    try {
      // Try Hugging Face first (better free limits)
      console.log('Attempting Hugging Face summarization...');
      summary = await generateSummaryHF(content.substring(0, 1024)); // HF has input limits
    } catch (hfError) {
      console.log('Hugging Face unavailable, trying OpenAI...');
      try {
        // Try OpenAI as backup
        const summaryResponse = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that creates concise summaries of documents. Provide a clear, well-structured summary that captures the main points."
            },
            {
              role: "user",
              content: `Please summarize the following document:\n\n${content}`
            }
          ],
          max_tokens: 500
        });
        summary = summaryResponse.choices[0].message.content;
      } catch (openaiError) {
        console.log('Both AI services unavailable, using fallback summary');
        // Fallback: Create a simple summary from the first few sentences
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
        summary = sentences.slice(0, 3).join('. ') + '.';
        if (summary.length < 50) {
          summary = `This document contains ${content.length} characters of text. ` + 
                   `Key content includes: ${content.substring(0, 200)}...`;
        }
      }
    }

    // Save document (remove file extension from title)
    const title = fileName.replace(/\.(pdf|docx)$/i, '');
    const document = new Document({
      userId: req.user.userId,
      title,
      content,
      summary
    });

    await document.save();

    res.json({
      message: 'Document processed successfully',
      document: {
        id: document._id,
        title: document.title,
        summary: document.summary,
        createdAt: document.createdAt
      }
    });
  } catch (error) {
    console.error('Document processing error:', error);
    res.status(500).json({ error: 'Failed to process document' });
  }
});

app.get('/api/documents', authenticateToken, async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.user.userId })
      .select('title summary createdAt')
      .sort({ createdAt: -1 });
    
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/documents/:id', authenticateToken, async (req, res) => {
  try {
    const document = await Document.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId 
    });
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Generate flashcards for a document
app.post('/api/documents/:id/flashcards', authenticateToken, async (req, res) => {
  try {
    const document = await Document.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId 
    });
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    let flashcards;
    try {
      // Try Hugging Face first for text generation
      console.log('Attempting Hugging Face flashcard generation...');
      const prompt = `Create 5 educational flashcards from this text. Format as Q: question A: answer pairs:\n\n${document.content.substring(0, 500)}`;
      const result = await generateTextHF(prompt, 'microsoft/DialoGPT-medium');
      
      // Parse the result to extract Q&A pairs
      const lines = result.split('\n');
      flashcards = [];
      let currentQ = '';
      
      for (const line of lines) {
        if (line.startsWith('Q:')) {
          currentQ = line.substring(2).trim();
        } else if (line.startsWith('A:') && currentQ) {
          flashcards.push({
            question: currentQ,
            answer: line.substring(2).trim()
          });
          currentQ = '';
        }
      }
      
      // If parsing failed, create simple flashcards
      if (flashcards.length === 0) {
        throw new Error('Failed to parse HF response');
      }
      
    } catch (hfError) {
      console.log('Hugging Face unavailable, trying OpenAI...');
      try {
        // Try OpenAI as backup
        const flashcardResponse = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that creates educational flashcards. Generate 5-10 flashcards based on the document content. Return them as a JSON array with 'question' and 'answer' fields."
            },
            {
              role: "user",
              content: `Create flashcards based on this document:\n\n${document.content}`
            }
          ],
          max_tokens: 800
        });
        flashcards = JSON.parse(flashcardResponse.choices[0].message.content);
      } catch (openaiError) {
        console.log('Both AI services unavailable, using fallback flashcards');
        // Fallback: Create simple flashcards from the document
        const sentences = document.content.split(/[.!?]+/).filter(s => s.trim().length > 30);
        flashcards = sentences.slice(0, 5).map((sentence, index) => ({
          question: `What does the document say about topic ${index + 1}?`,
          answer: sentence.trim()
        }));
        
        if (flashcards.length === 0) {
          flashcards = [
            {
              question: "What is the main topic of this document?",
              answer: document.summary || "This document contains important information."
            }
          ];
        }
      }
    }

    // Update document with flashcards
    document.flashcards = flashcards;
    await document.save();

    res.json({ flashcards });
  } catch (error) {
    console.error('Flashcard generation error:', error);
    res.status(500).json({ error: 'Failed to generate flashcards' });
  }
});

// Generate quiz for a document
app.post('/api/documents/:id/quiz', authenticateToken, async (req, res) => {
  try {
    const document = await Document.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId 
    });
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    let quiz;
    try {
      // Try OpenAI first
      const quizResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that creates multiple choice quizzes. Generate 5 multiple choice questions based on the document content. Return them as a JSON array with 'question', 'options' (array of 4 choices), and 'correctAnswer' (index 0-3) fields."
          },
          {
            role: "user",
            content: `Create a quiz based on this document:\n\n${document.content}`
          }
        ],
        max_tokens: 1000
      });
      quiz = JSON.parse(quizResponse.choices[0].message.content);
    } catch (openaiError) {
      console.log('OpenAI API unavailable, using fallback quiz');
      // Fallback: Create simple quiz from the document
      const sentences = document.content.split(/[.!?]+/).filter(s => s.trim().length > 50);
      const words = document.content.toLowerCase().match(/\b\w+\b/g) || [];
      const commonWords = words.filter(word => word.length > 4);
      
      quiz = [];
      
      // Generate questions from sentences
      for (let i = 0; i < Math.min(5, sentences.length); i++) {
        const sentence = sentences[i].trim();
        if (sentence.length > 20) {
          const words = sentence.split(' ');
          const keyWord = words.find(word => word.length > 5) || words[Math.floor(words.length / 2)];
          
          quiz.push({
            question: `According to the document, what is mentioned about "${keyWord}"?`,
            options: [
              sentence.substring(0, 80) + "...",
              "This is not mentioned in the document",
              "The document discusses something else entirely",
              "This information is not available"
            ],
            correctAnswer: 0
          });
        }
      }
      
      // If no good sentences, create generic questions
      if (quiz.length === 0) {
        quiz = [
          {
            question: "What type of document is this?",
            options: ["Text document", "Image file", "Video file", "Audio file"],
            correctAnswer: 0
          },
          {
            question: "How many characters does this document contain approximately?",
            options: [
              `About ${document.content.length} characters`,
              "Less than 100 characters",
              "More than 1 million characters",
              "Exactly 500 characters"
            ],
            correctAnswer: 0
          }
        ];
      }
    }

    // Update document with quiz
    document.quiz = quiz;
    await document.save();

    res.json({ quiz });
  } catch (error) {
    console.error('Quiz generation error:', error);
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

// Get flashcards for a document
app.get('/api/documents/:id/flashcards', authenticateToken, async (req, res) => {
  try {
    const document = await Document.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId 
    }).select('flashcards');
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json({ flashcards: document.flashcards || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get quiz for a document
app.get('/api/documents/:id/quiz', authenticateToken, async (req, res) => {
  try {
    const document = await Document.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId 
    }).select('quiz');
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json({ quiz: document.quiz || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate/regenerate summary for a document
app.post('/api/documents/:id/summarize', authenticateToken, async (req, res) => {
  try {
    const document = await Document.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId 
    });
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Generate a new summary using AI (try Hugging Face first, then OpenAI, then fallback)
    let summary;
    try {
      // Try Hugging Face first (better free limits)
      console.log('Attempting Hugging Face summarization...');
      summary = await generateSummaryHF(document.content.substring(0, 1024)); // HF has input limits
    } catch (hfError) {
      console.log('Hugging Face unavailable, trying OpenAI...');
      try {
        // Try OpenAI as backup
        const summaryResponse = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that creates concise summaries of documents. Provide a clear, well-structured summary that captures the main points."
            },
            {
              role: "user",
              content: `Please summarize the following document:\n\n${document.content}`
            }
          ],
          max_tokens: 500
        });
        summary = summaryResponse.choices[0].message.content;
      } catch (openaiError) {
        console.log('Both AI services unavailable, using fallback summary');
        // Fallback: Create a simple summary from the first few sentences
        const sentences = document.content.split(/[.!?]+/).filter(s => s.trim().length > 20);
        summary = sentences.slice(0, 3).join('. ') + '.';
        if (summary.length < 50) {
          summary = `This document contains ${document.content.length} characters of text. ` + 
                   `Key content includes: ${document.content.substring(0, 200)}...`;
        }
      }
    }

    // Update document with new summary
    document.summary = summary;
    await document.save();

    res.json({ 
      message: 'Summary generated successfully',
      summary: summary 
    });
  } catch (error) {
    console.error('Summary generation error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'PDF Summarizer API is running' });
});

// Start server (only if not in Vercel environment)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export the app for Vercel
module.exports = app;