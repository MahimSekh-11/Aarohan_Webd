import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import mongoose from 'mongoose';
import dns from 'dns';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './api/routes';
import { User } from './api/models';
import bcrypt from 'bcryptjs';

// Programmatically resolve querySrv DNS issues on cloud environments like Render
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  console.log('Configured custom DNS servers (8.8.8.8, 1.1.1.1) for MongoDB Atlas SRV resolution.');
} catch (dnsErr) {
  console.warn('Could not set custom DNS servers, using system default:', dnsErr);
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Connect to Database
  try {
    let connected = false;
    if (process.env.MONGODB_URI) {
      console.log('Connecting to provided MONGODB_URI...');
      try {
        await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('Connected to MongoDB Atlas successfully.');
        connected = true;
      } catch (e) {
        console.error('Failed to connect to MongoDB Atlas, falling back to in-memory db:', e);
        process.env.MONGODB_URI = ''; // trigger fallback
      }
    }
    
    if (!process.env.MONGODB_URI) {
      console.log('Starting in-memory MongoDB Server for preview...');
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      await mongoose.connect(mongoServer.getUri());
      console.log('Connected to In-Memory MongoDB.');
      connected = true;
    }

    if (connected) {
      // Seed Admin User (works for both Atlas & In-Memory)
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
        console.log('Seeded default admin user: 00000000 / ##########');
      }
    }
  } catch (err: any) {
    console.error('Database connection failed:', err);
  }

  // API Routes FIRST
  app.use('/api', apiRouter);
  
  // API 404 and Error catch-all to prevent HTML fallback
  app.use('/api', (req, res) => {
    res.status(404).json({ message: 'API endpoint not found' });
  });
  app.use('/api', (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('API Error:', err);
    res.status(500).json({ message: err.message || 'Internal Server Error' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Start background initialization of AI models
  import('./api/aiService.js').then(({ initializeAI }) => {
    initializeAI();
  }).catch(err => console.error('Failed to import aiService:', err));
}

startServer();
