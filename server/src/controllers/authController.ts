import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'mathchat_secret_key';

// MySQL hata tipini tanımlayalım
interface MySQLError extends Error {
  code?: string;
  sqlState?: string;
  sqlMessage?: string;
}

// User Registration
export const register = async (req: Request, res: Response) => {
  try {
    console.log('Register attempt with data:', { ...req.body, password: '****' });
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Test DB connection first
    try {
      const [testConnection]: any = await pool.query('SELECT 1');
      console.log('Database connection test:', testConnection);
    } catch (err) {
      const dbError = err as Error;
      console.error('Database connection error:', dbError);
      return res.status(500).json({ message: 'Database connection error', error: dbError.message });
    }

    // Check if user already exists
    try {
      const [existingUsers]: any = await pool.query(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      console.log('Existing users check:', { count: existingUsers.length });

      if (existingUsers.length > 0) {
        return res.status(409).json({ message: 'User already exists' });
      }
    } catch (err) {
      const queryError = err as MySQLError;
      console.error('User existence check error:', queryError);
      return res.status(500).json({ 
        message: 'Error checking user existence',
        error: queryError.message,
        sqlState: queryError.sqlState, 
        sqlCode: queryError.code 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    console.log('Attempting to insert user into database');
    // Insert user into database
    try {
      const [result]: any = await pool.query(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [username, email, hashedPassword]
      );

      console.log('User insertion result:', result);

      // Generate JWT token
      const token = jwt.sign(
        { id: result.insertId, username, email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          id: result.insertId,
          username,
          email
        }
      });
    } catch (err) {
      const insertError = err as MySQLError;
      console.error('User insertion error:', insertError);
      return res.status(500).json({ 
        message: 'Error inserting user into database',
        error: insertError.message,
        sqlState: insertError.sqlState, 
        sqlCode: insertError.code 
      });
    }
  } catch (err) {
    const error = err as Error;
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
};

// User Login
export const login = async (req: Request, res: Response) => {
  try {
    console.log('Login attempt with email:', req.body.email);
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Test DB connection first
    try {
      await pool.query('SELECT 1');
      console.log('Database connection confirmed for login');
    } catch (err) {
      const dbError = err as Error;
      console.error('Database connection error during login:', dbError);
      return res.status(500).json({ message: 'Database connection error', error: dbError.message });
    }

    // Find user by email
    try {
      const [users]: any = await pool.query(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      console.log('User query result:', { found: users.length > 0 });

      if (users.length === 0) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const user = users[0];

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      console.log('Password validation result:', isPasswordValid);
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username, email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(200).json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    } catch (err) {
      const queryError = err as MySQLError;
      console.error('Login query error:', queryError);
      return res.status(500).json({ 
        message: 'Error querying user during login',
        error: queryError.message,
        sqlState: queryError.sqlState, 
        sqlCode: queryError.code 
      });
    }
  } catch (err) {
    const error = err as Error;
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
};

// User Logout
export const logout = (_req: Request, res: Response) => {
  // Client-side should remove the token
  res.status(200).json({ message: 'Logged out successfully' });
}; 