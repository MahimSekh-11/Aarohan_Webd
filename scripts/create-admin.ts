import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../backend/models.js';
const {MONGODB_URI,ADMIN_PHONE,ADMIN_PASSWORD,ADMIN_NAME}=process.env;
if(!MONGODB_URI || !ADMIN_PHONE || !/^\+?[0-9]{7,15}$/.test(ADMIN_PHONE) || !ADMIN_PASSWORD || ADMIN_PASSWORD.length<12)throw new Error('Set MONGODB_URI, ADMIN_PHONE and ADMIN_PASSWORD (at least 12 characters) before provisioning.');
try{await mongoose.connect(MONGODB_URI,{serverSelectionTimeoutMS:5000});if(await User.exists({phone:ADMIN_PHONE}))throw new Error('An account already uses this phone. No account was changed.');await User.create({name:ADMIN_NAME||'Store Administrator',phone:ADMIN_PHONE,password:await bcrypt.hash(ADMIN_PASSWORD,12),role:'admin',status:'approved'});console.info('Administrator created. Remove ADMIN_PASSWORD from your environment.');}finally{await mongoose.disconnect();}
