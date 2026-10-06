import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import mongoose from 'mongoose';
import dns from 'dns';
import { apiRouter } from './api/routes.js';
import { User } from './api/models.js';
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

  // Serve frontend static files if built, otherwise show helpful message
  const distPath = path.join(process.cwd(), 'dist');
  if (fs.existsSync(path.join(distPath, 'index.html'))) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    app.get('*', (req, res) => {
      res.send(`
        <h2>Tiorkhali Mart - Backend Running</h2>
        <p>The backend is active on port ${PORT}.</p>
        <p><b>For frontend development:</b> Please open <a href="http://localhost:5173">http://localhost:5173</a> in your browser.</p>
        <p>If you want to test the production build, run <code>npm run build</code> first.</p>
      `);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (!fs.existsSync(path.join(distPath, 'index.html'))) {
      console.log(`Frontend dev server should be running at http://localhost:5173`);
    }
  });
}

startServer();
