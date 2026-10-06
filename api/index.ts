import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { apiRouter } from './routes';
import { User } from './models';
import bcrypt from 'bcryptjs';

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

let isConnected = false;

async function connectDB() {
  if (isConnected || mongoose.connection.readyState >= 1) {
    isConnected = true;
    return;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
      isConnected = true;
      console.log('Connected to MongoDB Atlas on Vercel.');

      // Seed Admin User if not exists
      const adminExists = await User.findOne({ role: 'admin' });
      if (!adminExists) {
        const hashedPassword = await bcrypt.hash('Mahim@28', 10);
        await User.create({
          name: 'Tiorkhali Mart Admin',
          phone: '9832187950',
          password: hashedPassword,
          role: 'admin',
          status: 'approved'
        });
        console.log('Seeded default admin user on Vercel');
      }
    } catch (e) {
      console.error('MongoDB connection error on Vercel:', e);
    }
  } else {
    console.warn('MONGODB_URI is not set in environment variables!');
  }
}

// Ensure DB connection for every API request
app.use(async (req: Request, res: Response, next: NextFunction) => {
  await connectDB();
  next();
});

// Mount API routes
app.use('/api', apiRouter);

// Catch-all 404 for /api
app.use('/api', (req: Request, res: Response) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

// Global error handler
app.use('/api', (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('API Error:', err);
  res.status(500).json({ message: err.message || 'Internal Server Error' });
});

export default app;
