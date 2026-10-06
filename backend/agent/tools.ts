import mongoose from 'mongoose';
import { Product, Lead, User, Notification } from '../models.js';
import { expandProductSearch } from '../../shared/languages.js';
import { type ToolCall, type AgentResult } from '../../shared/agent.js';
import { productComplete } from '../../shared/productVoice.js';
import { updateRequestStatus } from '../requestService.js';
import { productFields, profileFields, productSnapshot } from '../validation.js';

export type ToolEnvironment = { user?:any; language:string };
export type ToolOutput = { message:string; result?:any; actions?:AgentResult['actions']; items?:any[]; draft?:Record<string,any>; search?:Record<string,unknown>; needsConfirmation?:boolean };
export const sensitiveTools = new Set(['update_product','delete_product','request_product','update_request','update_profile']);
const checkRole = (user:any, roles:string[]) => {
  if (!user) throw new Error('Please log in to use this action.');
  if (user.status !== 'approved' || !roles.includes(user.role)) throw new Error('This action is not available for your account.');
};
const requireDatabase = () => { if (mongoose.connection.readyState !== 1) throw new Error('The website data service is unavailable. Please try again.'); };
const cleanProduct = (p:any) => ({ id:String(p._id),kind:'product', name:p.name, price:p.actualPrice ?? p.price, category:p.category, description:p.description, quantity:p.quantity, deliveryAvailable:p.deliveryAvailable, store:p.storeDetails?.storeName });

export async function executeTool(call:ToolCall, env:ToolEnvironment, confirmed=false):Promise<ToolOutput> {
  const a=call.args; const user=env.user;
  const tools:Record<ToolCall['name'],() => Promise<ToolOutput>> = {
    navigate:async () => {
      const path=String(a.path);
      if (path.startsWith('/manager')) checkRole(user,['manager']);
      if (path.startsWith('/customer')) checkRole(user,['customer']);
      if (path === '/account') checkRole(user,['manager','customer','admin']);
      if (path === '/admin') checkRole(user,['admin']);
      return {message:'Opening page',actions:[{type:'navigate',path}]};
    },
    website_control:async () => ({message:'Updating this page',actions:[{type:'website_control',command:String(a.command)}]}),
    search_products:async () => {
      requireDatabase();
      const activeManagers=await User.find({role:'manager',status:'approved'}).distinct('_id');
      const filter:any={quantity:{$gt:0},managerId:{$in:activeManagers}};
      if (a.search) filter.name={$regex:expandProductSearch(String(a.search)).map(term => term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),$options:'i'};
      if (a.category) filter.category=String(a.category);
      if (a.deliveryAvailable === true) filter.deliveryAvailable=true;
      if (a.minPrice !== undefined || a.maxPrice !== undefined) {
        filter.actualPrice={}; if (a.minPrice !== undefined) filter.actualPrice.$gte=a.minPrice; if (a.maxPrice !== undefined) filter.actualPrice.$lte=a.maxPrice;
      }
      const sort:any=a.sort === 'price_asc' ? {actualPrice:1,_id:1} : a.sort === 'price_desc' ? {actualPrice:-1,_id:1} : {createdAt:-1};
      const limit=Math.min(Math.max(Number(a.limit) || 20,1),50);
      const [products,count]=await Promise.all([Product.find(filter).sort(sort).limit(limit).lean(),Product.countDocuments(filter)]);
      const query=new URLSearchParams();
      for (const key of ['search','category','minPrice','maxPrice','sort']) if (a[key] !== undefined) query.set(key,String(a[key]));
      if (a.deliveryAvailable) query.set('delivery','true');
      return {message:'Products found',result:{count},items:products.map(cleanProduct),search:a,actions:[{type:'navigate',path:`/marketplace?${query}`}]};
    },
    get_product:async () => {
      requireDatabase(); const p=await Product.findById(a.id).lean(); if (!p || !await User.exists({_id:p.managerId,role:'manager',status:'approved'})) throw new Error('Product not found.');
      return {message:'Product details',result:cleanProduct(p),items:[cleanProduct(p)],actions:[{type:'navigate',path:`/marketplace?product=${p._id}`}]};
    },
    get_requests:async () => {
      checkRole(user,['customer','manager']); requireDatabase();
      const filter:any=user.role === 'manager' ? {manager:user._id} : {customer:user._id}; if(a.status)filter.status=a.status;
      const records=await Lead.find(filter).sort({createdAt:-1}).limit(20).populate('product','name price actualPrice').lean();
      const items=records.map((r:any) => ({id:String(r._id),kind:'request',name:r.product?.name || r.productDetails?.name || '',status:r.status,price:r.product?.actualPrice ?? r.productDetails?.actualPrice}));
      return {message:'Requests found',result:{count:items.length},items,actions:[{type:'navigate',path:user.role === 'manager' ? '/manager?view=leads' : '/customer?tab=requests'}]};
    },
    create_product:async () => {
      checkRole(user,['manager']);
      const product:any={quantity:1,category:'Groceries',deliveryAvailable:false,...a}; product.description ||= product.name;
      if (!product.name) return {message:'What is the product name?',draft:product};
      if (!productComplete(product)) return {message:product.price > 0 ? 'What is the quantity? Say a positive whole number.' : 'What is the price? Say a positive amount.',draft:product};
      requireDatabase();
      const fields=productFields(product);
      const result=await Product.create({...fields,actualPrice:product.price,offer:0,images:[],managerId:user._id,storeDetails:{storeName:user.storeName,location:user.location,contactNumber:user.phone}});
      return {message:'Product saved successfully.',result:cleanProduct(result),actions:[{type:'refresh'},{type:'navigate',path:'/manager'}]};
    },
    update_product:async () => {
      checkRole(user,['manager']); requireDatabase();
      const {id,...changes}=a;
      if (changes.price !== undefined && Number(changes.price)<=0) throw new Error('Please provide a positive price.');
      const owned=await Product.findOne({_id:id,managerId:user._id});if(!owned)throw new Error('Product not found or unauthorized.');
      const fields=productFields(changes,true);
      if(!Object.keys(fields).length)throw new Error('Please provide product details to update.');
      if(!confirmed)return {message:'Update this product? Please confirm.',needsConfirmation:true};
      if (fields.price !== undefined) fields.actualPrice=Math.round(fields.price*(1-(owned.offer || 0)/100)*100)/100;
      const result=await Product.findOneAndUpdate({_id:id,managerId:user._id},{$set:fields},{returnDocument:'after',runValidators:true});
      if (!result) throw new Error('Product not found or unauthorized.');
      return {message:'Product updated successfully.',result:cleanProduct(result),actions:[{type:'refresh'}]};
    },
    delete_product:async () => {
      checkRole(user,['manager']); requireDatabase();
      const owned=await Product.findOne({_id:a.id,managerId:user._id}); if(!owned)throw new Error('Product not found or unauthorized.');
      if(!confirmed)return {message:'Delete this product? Please confirm.',needsConfirmation:true};
      await Product.deleteOne({_id:owned._id,managerId:user._id});
      return {message:'Product deleted.',actions:[{type:'refresh'}]};
    },
    request_product:async () => {
      checkRole(user,['customer']); requireDatabase();
      const product=await Product.findById(a.id); if(!product || product.quantity<1 || !await User.exists({_id:product.managerId,role:'manager',status:'approved'}))throw new Error('This product is not available.');
      if(!confirmed)return {message:'Send this buying request to the store? Please confirm.',needsConfirmation:true};
      const existing=await Lead.findOne({customer:user._id,product:product._id,status:{$in:['new','contacted']}});
      if(existing)return {message:'You already have an active request for this product.'};
      try{await Lead.create({customer:user._id,activeKey:`${user._id}:${product._id}`,manager:product.managerId,product:product._id,productDetails:productSnapshot(product),customerDetails:{name:user.name,phone:user.phone,address:user.address}});}catch(error){if((error as any)?.code===11000)return {message:'You already have an active request for this product.'};throw error;}
      await Notification.create({recipient:product.managerId,message:`New interest from ${user.name} for ${product.name}.`});
      return {message:'Request sent to the store manager.',actions:[{type:'refresh'},{type:'navigate',path:'/customer?tab=requests'}]};
    },
    update_request:async () => {
      checkRole(user,['manager']); requireDatabase();
      const lead=await Lead.findOne({_id:a.id,manager:user._id}); if(!lead)throw new Error('Request not found or unauthorized.');
      if(!confirmed)return {message:a.status==='resolved'?'Complete this request and reduce stock by one?':'Update this request? Please confirm.',needsConfirmation:true};
      await updateRequestStatus(a.id,user._id,String(a.status));
      return {message:'Request updated.',actions:[{type:'refresh'}]};
    },
    get_profile:async () => {
      checkRole(user,['customer','manager','admin']);
      return {message:'Account details',result:{name:user.name,role:user.role},actions:[{type:'navigate',path:'/account'}]};
    },
    update_profile:async () => {
      checkRole(user,['customer','manager','admin']); requireDatabase();
      if(!confirmed)return {message:'Update your account details? Please confirm.',needsConfirmation:true};
      if(!Object.keys(a).length)throw new Error('Please provide a name or address to update.');
      await User.updateOne({_id:user._id},{$set:profileFields(a)},{runValidators:true});
      return {message:'Account updated.',actions:[{type:'refresh'},{type:'navigate',path:'/account'}]};
    },
  };
  return tools[call.name]();
}
