import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
process.env.JWT_SECRET='isolated-agent-test-secret';process.env.LLM_PROVIDER='local';delete process.env.GEMINI_API_KEY;delete process.env.LLM_API_KEY;
const {apiRouter}=await import('../backend/routes');
const {User,Product,Lead,AgentAction}=await import('../backend/models');
const mongo=await MongoMemoryReplSet.create({replSet:{count:1}});await mongoose.connect(mongo.getUri());
const app=express();app.use(express.json({limit:'4mb'}));app.use('/api',apiRouter);const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const root=`http://127.0.0.1:${(server.address() as any).port}/api`;
async function user(role:'manager'|'customer'|'admin',phone:string){return User.create({role,phone,name:role,password:'test-hash',status:'approved',storeName:'Test Store',location:'Test Village'});}
function token(user:any){return jwt.sign({id:user._id,role:user.role},process.env.JWT_SECRET!);}
async function request(path:string,method='GET',body?:any,actor?:any){const response=await fetch(root+path,{method,headers:{'Content-Type':'application/json',...(actor?{Authorization:`Bearer ${token(actor)}`}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,body:await response.json()};}
async function say(message:string,actor?:any,extra:any={}){return request('/agent/message','POST',{message,language:'en',history:[],context:{route:'/',title:'Mart',visibleItems:[]},...extra},actor);}
try{
  await Promise.all([User.init(),Product.init(),Lead.init(),AgentAction.init()]);
  const manager=await user('manager','1111111111'),customer=await user('customer','2222222222'),other=await user('manager','3333333333');
  assert.equal((await request('/auth/register','POST',{role:'admin',name:'Attack',phone:'4444444444',password:'password123'})).status,400);
  assert.equal((await request('/auth/register','POST',{role:'customer',name:'Test',phone:{$ne:null},password:'password123'})).status,400);
  const created=await say('add rice price 200 quantity 5',manager);assert.equal(created.status,200);assert.match(created.body.reply,/saved/);assert.equal(await Product.countDocuments(),1);
  assert.equal((await say('add honey price 100 quantity 2',customer)).body.actions.length,0);assert.equal((await request('/products','POST',{name:'Honey',price:100},customer)).status,403);assert.equal(await Product.countDocuments(),1);
  const review=await say('add honey price 100 quantity 2',manager,{autoSave:false});assert.ok(review.body.draft);assert.equal(await Product.countDocuments(),1);
  const guestReview=await say('add honey price 100 quantity 2',undefined,{autoSave:false});assert.equal(guestReview.body.draft,undefined);
  const product=await Product.findOne();
  const changed=await request(`/products/${product!._id}`,'PUT',{price:200,offer:20,managerId:other._id,actualPrice:1},manager);assert.equal(changed.status,200);assert.equal(changed.body.actualPrice,160);assert.equal(changed.body.managerId,String(manager._id));
  assert.equal((await request(`/products/${product!._id}`,'PUT',{price:1},other)).status,404);
  assert.equal((await request('/products?maxPrice=180&sort=price_asc')).body.length,1);
  const search=await say('Find rice under 180',customer);assert.equal(search.body.items.length,1);assert.equal(search.body.items[0].price,160);
  const context={route:'/marketplace',title:'Market',visibleItems:[],recentItems:search.body.items,search:search.body.search};
  const pending=await say('Buy this',customer,{context});assert.ok(pending.body.pending);assert.equal(await Lead.countDocuments(),0);
  const attempt=await say('confirm',manager,{pending:pending.body.pending.id});assert.ok(attempt.body.error);assert.equal(await Lead.countDocuments(),0);
  const approved=await say('confirm',customer,{pending:pending.body.pending.id});assert.match(approved.body.reply,/sent/);assert.equal(await Lead.countDocuments(),1);
  assert.equal((await Lead.findOne())!.productDetails!.storeDetails!.storeName,'Test Store');
  assert.ok((await say('confirm',customer,{pending:pending.body.pending.id})).body.error);assert.equal(await Lead.countDocuments(),1);
  const lead=await Lead.findOne();const responses=await Promise.all([1,2,3].map(()=>request(`/leads/${lead!._id}/status`,'PUT',{status:'resolved'},manager)));responses.forEach(r=>assert.equal(r.status,200));assert.equal((await Product.findById(product!._id))!.quantity,4);
  assert.equal((await request(`/leads/${lead!._id}/status`,'PUT',{status:'new'},manager)).status,400);
  const requestedAgain=await say('Buy this',customer,{context});await say('confirm',customer,{pending:requestedAgain.body.pending.id});
  const inquiries=await say('show my requests',manager);const inquiryContext={...context,recentItems:inquiries.body.items};
  const completion=await say('Complete the first request',manager,{context:inquiryContext});assert.ok(completion.body.pending);assert.equal((await Product.findById(product!._id))!.quantity,4);
  await say('confirm',manager,{pending:completion.body.pending.id});assert.equal((await Product.findById(product!._id))!.quantity,3);
  const {GeminiLLMProvider}=await import('../backend/agent/providers');const original=GeminiLLMProvider.prototype.plan;
  process.env.LLM_PROVIDER='gemini';process.env.GEMINI_API_KEY='test-placeholder';
  try{
    GeminiLLMProvider.prototype.plan=async()=>{throw new Error('Simulated provider outage');};const fallback=await say('find rice',customer);assert.equal(fallback.body.provider,'local');assert.equal(fallback.body.items.length,1);
    GeminiLLMProvider.prototype.plan=async()=>({calls:[],message:'Product saved successfully.'});const fabricated=await say('add honey price 100',manager);assert.doesNotMatch(fabricated.body.reply,/saved successfully/i);assert.equal(await Product.countDocuments(),1);
    GeminiLLMProvider.prototype.plan=async()=>({calls:[{name:'create_product',args:{name:'Honey',price:100}},{name:'execute_code' as any,args:{}}]});const invalid=await say('add honey price 100',manager);assert.ok(invalid.body.error);assert.equal(await Product.countDocuments(),1);
  }finally{GeminiLLMProvider.prototype.plan=original;process.env.LLM_PROVIDER='local';delete process.env.GEMINI_API_KEY;}
  const remove=await say('Delete this',manager,{context});assert.ok(remove.body.pending);assert.equal(await Product.countDocuments(),1);
  await AgentAction.updateOne({_id:remove.body.pending.id},{$set:{expiresAt:new Date(0)}});assert.ok((await say('confirm',manager,{pending:remove.body.pending.id})).body.error);assert.equal(await Product.countDocuments(),1);
  const notOwned=await say('Delete this',other,{context});assert.ok(notOwned.body.error);assert.equal(notOwned.body.pending,undefined);
  const profile=await say('Change my name to New Name',customer);assert.ok(profile.body.pending);await say('confirm',customer,{pending:profile.body.pending.id});assert.equal((await User.findById(customer._id))!.name,'New Name');
  const updated=await request('/auth/me','PATCH',{role:'admin',name:'Customer',status:'approved'},customer);assert.equal(updated.body.user.role,'customer');assert.equal(updated.body.user.password,undefined);
  const native=await say('চাল খুঁজুন',customer,{language:'bn'});assert.match(native.body.reply,/পাওয়া/);
  assert.equal((await say('Hello')).body.actions.length,0);assert.equal((await say('Pay for this')).body.actions.length,0);
  assert.equal((await request('/products?maxPrice=NaN')).status,400);
  assert.equal((await request('/products/not-an-id')).status,400);
  await User.updateOne({_id:manager._id},{$set:{status:'rejected'}});assert.equal((await say('add honey price 100',manager)).status,403);
  const admin=await user('admin','4444444444');const ownedCount=await Product.countDocuments();
  assert.equal((await request(`/admin/managers/${manager._id}/status`,'PUT',{status:'rejected'},admin)).status,200);assert.equal(await Product.countDocuments(),ownedCount);assert.equal((await request('/products')).body.length,0);assert.ok(await User.findById(manager._id));
  assert.equal((await request('/auth/register','POST',{name:'Replacement',role:'manager',phone:manager.phone,password:'password123',storeName:'Store',location:'Village'})).status,403);
  await request(`/admin/managers/${manager._id}/status`,'PUT',{status:'approved'},admin);assert.equal((await request('/products')).body.length,ownedCount);
  console.log('Agent integration passed: real isolated database; role/ownership validation; create/search/profile; native replies; expiring one-use confirmations; idempotent stock resolution; malformed inputs.');
}finally{await new Promise<void>(r=>server.close(()=>r()));await mongoose.disconnect();await mongo.stop();}
