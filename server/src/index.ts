import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Add a global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler caught:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? null : err.message
  });
});

// Add a test endpoint that doesn't require authentication
app.get('/api/test', (req, res) => {
  res.json({ message: 'API test endpoint is working' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('MathChat API is running');
});

// Start server
try {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`- Root URL: http://localhost:${PORT}`);
    console.log(`- Test endpoint: http://localhost:${PORT}/api/test`);
    console.log(`- Auth endpoint: http://localhost:${PORT}/api/auth`);
    console.log(`- Chat endpoint: http://localhost:${PORT}/api/chat`);
  });
} catch (error) {
  console.error('Failed to start server:', error);
} 