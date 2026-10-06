import mongoose, { Schema } from 'mongoose';

// User Schema
const userSchema = new Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'customer'], default: 'customer' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  address: { type: String },
  storeName: { type: String }, // For store managers
  location: { type: String } // For store managers
}, { timestamps: true });

userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({role:1,status:1});

export const User = mongoose.model('User', userSchema);

// Product Schema
const productSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  offer: { type: Number, default: 0 },
  actualPrice: { type: Number, required: true },
  quantity: { type: Number, default: 1 },
  category: { type: String, required: true },
  images: [{ type: String }],
  deliveryAvailable: { type: Boolean, default: false },
  managerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  storeDetails: {
    storeName: String,
    location: String,
    contactNumber: String
  }
}, { timestamps: true });

productSchema.index({ managerId: 1 });
productSchema.index({ category: 1 });
productSchema.index({managerId:1,createdAt:-1});
productSchema.index({actualPrice:1,_id:1});
productSchema.index({createdAt:-1,_id:-1});

export const Product = mongoose.model('Product', productSchema);

// Lead / Order Schema
const leadSchema = new Schema({
  customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  manager: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productDetails: {
    name: String,
    price: Number,
    actualPrice: Number,
    quantity: Number,
    images: [String],
    storeDetails: {
      storeName: String,
      location: String,
      contactNumber: String
    }
  },
  status: { type: String, enum: ['new', 'contacted', 'resolved'], default: 'new' },
  activeKey: {type:String},
  customerDetails: {
    name: String,
    phone: String,
    address: String
  }
}, { timestamps: true });

leadSchema.index({ activeKey:1 },{unique:true,sparse:true});
leadSchema.index({ customer: 1 });
leadSchema.index({ manager: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({manager:1,createdAt:-1});
leadSchema.index({customer:1,createdAt:-1});

export const Lead = mongoose.model('Lead', leadSchema);

// Review Schema
const reviewSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  text: { type: String, required: true },
  customerName: { type: String }
}, { timestamps: true });

reviewSchema.index({ product: 1 });

export const Review = mongoose.model('Review', reviewSchema);

// Notification Schema
const notificationSchema = new Schema({
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  link: { type: String }, // optional link to navigate to
}, { timestamps: true });

notificationSchema.index({ recipient: 1, read: 1 });

export const Notification = mongoose.model('Notification', notificationSchema);

// Only pending, explicitly confirmed actions persist, for five minutes. Raw
// audio and conversation histories are never saved to MongoDB.
const agentActionSchema = new Schema({
  _id:{type:String,required:true}, userId:{type:Schema.Types.ObjectId,ref:'User',required:true},
  name:{type:String,required:true}, args:{type:Schema.Types.Mixed,required:true},
  consumed:{type:Boolean,default:false}, expiresAt:{type:Date,required:true},
});
agentActionSchema.index({expiresAt:1},{expireAfterSeconds:0});
export const AgentAction = mongoose.model('AgentAction',agentActionSchema);

// Mock DB state array to gracefully handle missing MongoDB connection
export const MOCK_DB = {
  users: [] as any[],
  products: [] as any[],
  leads: [] as any[],
  reviews: [] as any[],
  notifications: [] as any[]
};
