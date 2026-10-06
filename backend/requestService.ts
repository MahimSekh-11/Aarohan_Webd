import mongoose from 'mongoose';
import { Lead, Product, Notification } from './models.js';
import { InputError } from './validation.js';
export async function updateRequestStatus(id:unknown,managerId:unknown,status:string){
  if(!['new','contacted','resolved'].includes(status))throw new InputError('Invalid request status');
  const session=await mongoose.startSession();
  try{
    await session.withTransaction(async()=>{
      const lead=await Lead.findOne({_id:id,manager:managerId}).session(session);
      if(!lead)throw new InputError('Request not found or unauthorized.');
      if(lead.status==='resolved'){if(status!=='resolved')throw new InputError('A completed request cannot be reopened.');return;}
      if(lead.status===status)return;
      lead.status=status as any;if(status==='resolved'){lead.activeKey=undefined;const stock=await Product.updateOne({_id:lead.product,quantity:{$gte:1}},{$inc:{quantity:-1}},{session});if(stock.modifiedCount!==1)throw new InputError('This product is not available.');}
      await lead.save({session});
      await Notification.create([{recipient:lead.customer,message:`Your request for ${lead.productDetails?.name || 'a product'} was marked as ${status}.`}],{session});
    });
  }finally{await session.endSession();}
  return Lead.findOne({_id:id,manager:managerId}).populate('product');
}
