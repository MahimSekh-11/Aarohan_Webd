import { type Request, type Response, type NextFunction } from 'express';
export class InputError extends Error {}
export const safe = (handler:(req:Request,res:Response,next:NextFunction)=>unknown) => (req:Request,res:Response,next:NextFunction) => { Promise.resolve().then(()=>handler(req,res,next)).catch(next); };
export function textField(value:unknown,name:string,max=150,required=true):string {
  if(value===undefined && !required)return '';
  if(typeof value!=='string' || (required && !value.trim()) || value.length>max)throw new InputError(`Invalid ${name}`);
  return value.trim();
}
export const categories=['Groceries','Handicrafts','Electronics','Clothing','Hardware'];
export function productFields(body:any,partial=false):Record<string,any>{
  if(!body || typeof body!=='object' || Array.isArray(body))throw new InputError('Invalid product');
  const result:Record<string,any>={};
  for(const field of ['name','description','category'])if(!partial || body[field]!==undefined)result[field]=textField(body[field],field,field==='description'?2000:150);
  for(const field of ['price','offer','quantity'])if(body[field]!==undefined || (!partial && field==='price')){
    const n=body[field];
    if(typeof n!=='number' || !Number.isFinite(n) || n>(field==='offer'?100:10000000) || n<(field==='price'?0.01:0))throw new InputError(`Invalid ${field}`);
    if(field==='quantity' && !Number.isInteger(n))throw new InputError('Invalid quantity');
    result[field]=n;
  }
  if(body.deliveryAvailable!==undefined){if(typeof body.deliveryAvailable!=='boolean')throw new InputError('Invalid delivery option');result.deliveryAvailable=body.deliveryAvailable;}
  if(body.images!==undefined){
    if(!Array.isArray(body.images) || body.images.length>4 || body.images.some((s:any)=>typeof s!=='string' || s.length>900000 || !/^(https:\/\/[^\s]+|data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+)$/.test(s)))throw new InputError('Invalid product images');
    result.images=body.images;
  }
  return result;
}
export function profileFields(body:any){
  const result:Record<string,string>={};
  for(const field of ['name','address'])if(body?.[field]!==undefined)result[field]=textField(body[field],field,field==='address'?1000:150,field==='name');
  if(!Object.keys(result).length)throw new InputError('Please provide a name or address to update.');
  return result;
}
export function productSnapshot(product:any){const {name,price,actualPrice,quantity,images,storeDetails}=product;return {name,price,actualPrice,quantity,images,storeDetails};}
