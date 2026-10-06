import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import app from './backend/serverless.js';
// Explicit local preview storage only. A configured database never falls back
// silently: an outage must not appear to erase the user's inventory.
if(process.env.NODE_ENV==='production' && (!process.env.MONGODB_URI || !process.env.JWT_SECRET))throw new Error('Production requires MONGODB_URI and JWT_SECRET');
let preview:any;
if(!process.env.MONGODB_URI && process.env.NODE_ENV!=='production'){
  const {MongoMemoryReplSet}=await import('mongodb-memory-server');preview=await MongoMemoryReplSet.create({replSet:{count:1}});await mongoose.connect(preview.getUri());console.info('Local preview uses temporary storage. Configure MONGODB_URI for persistence.');
}
const dist=path.resolve('dist');
if(fs.existsSync(path.join(dist,'index.html'))){
  app.use(express.static(dist,{index:false,dotfiles:'deny'}));
  app.get('*',(_req,res)=>res.sendFile(path.join(dist,'index.html')));
}else app.get('*',(_req,res)=>res.type('text').send('Backend ready. Open the Vite development server on port 5173.'));
const server=app.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.info(`Server running on port ${Number(process.env.PORT)||3000}`));
async function shutdown(){server.close();await mongoose.disconnect();await preview?.stop();process.exit(0);}
process.on('SIGTERM',()=>void shutdown());process.on('SIGINT',()=>void shutdown());
