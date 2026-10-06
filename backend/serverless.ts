import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { apiRouter } from './routes.js';

const app = express();
app.use(cors());
app.use(express.json({ limit:'4mb' }));
app.use(express.urlencoded({ limit:'4mb', extended:true }));

let connecting: Promise<typeof mongoose> | null = null;
async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not configured');
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured');
  // Concurrent cold-start requests must await the same connection, including
  // requests arriving while Mongoose reports readyState=2 (connecting).
  connecting ??= mongoose.connect(uri, { serverSelectionTimeoutMS:5000 });
  try { await connecting; } finally { connecting = null; }
}

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status:'ok', database:mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    configured:!!process.env.MONGODB_URI && !!process.env.JWT_SECRET });
});

app.use(async (req: Request, res: Response, next: NextFunction) => {
  // Speech must keep working even when MongoDB is unavailable.
  if (req.path.startsWith('/api/agent/') && req.path !== '/api/agent/status' && process.env.MONGODB_URI) {
    try { await connectDB(); } catch { /* The agent returns a polite tool error. */ }
    next(); return;
  }
  if (!/^\/api\/(?:auth|admin|manager|customer|products|leads|notifications)(?:\/|$)/.test(req.path)) { next(); return; }
  try { await connectDB(); next(); }
  catch (error) {
    console.error('Database unavailable:',error instanceof Error ? error.name : 'Connection error');
    res.status(503).json({ message:'Database service unavailable. Check deployment environment variables and MongoDB access.' });
  }
});

app.use('/api', apiRouter);
app.use('/api', (_req: Request, res: Response) => { res.status(404).json({ message:'API endpoint not found' }); });
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('API error:',err?.name || 'Unknown error');
  const status = err?.type === 'entity.too.large' ? 413 : err?.type === 'entity.parse.failed' ? 400 : 500;
  res.status(status).json({ message:status === 413 ? 'Request body is too large' : status === 400 ? 'Invalid JSON request body' : 'Internal Server Error' });
});

export default app;
