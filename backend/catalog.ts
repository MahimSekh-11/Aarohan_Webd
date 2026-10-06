import { User } from './models.js';
import { expandProductSearch } from '../shared/languages.js';
import { InputError, textField } from './validation.js';

const escaped=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export async function catalogFilter(values:Record<string,unknown>):Promise<Record<string,any>>{
  const managers=await User.find({role:'manager',status:'approved'}).distinct('_id');
  const filter:Record<string,any>={managerId:{$in:managers},quantity:{$gt:0}};
  for(const [field,path]of [['category','category'],['location','storeDetails.location'],['storeName','storeDetails.storeName']] as const){
    if(values[field]!==undefined && values[field]!==''){
      const value=textField(values[field],field);
      filter[path]=field==='category'?{$regex:`^${escaped(value)}$`,$options:'i'}:{$regex:escaped(value),$options:'i'};
    }
  }
  if(values.search!==undefined && values.search!=='')filter.name={$regex:expandProductSearch(textField(values.search,'search')).map(escaped).join('|'),$options:'i'};
  const min=values.minPrice,max=values.maxPrice;
  if(min!==undefined && min!=='' || max!==undefined && max!==''){
    filter.actualPrice={};
    for(const [key,value,operator]of [['minPrice',min,'$gte'],['maxPrice',max,'$lte']] as const){
      if(value===undefined || value==='')continue;
      if(!['string','number'].includes(typeof value) || !Number.isFinite(Number(value)) || Number(value)<0 || Number(value)>10000000)throw new InputError('Invalid price filter');
      filter.actualPrice[operator]=Number(value);
    }
    if(filter.actualPrice.$gte>filter.actualPrice.$lte)throw new InputError('Invalid price filter');
  }
  if(values.deliveryAvailable!==undefined && values.deliveryAvailable!==''){
    if(![true,false,'true','false'].includes(values.deliveryAvailable as any))throw new InputError('Invalid delivery filter');
    filter.deliveryAvailable=values.deliveryAvailable===true || values.deliveryAvailable==='true';
  }
  if(values.sort!==undefined && !['newest','price_asc','price_desc'].includes(String(values.sort)))throw new InputError('Invalid sort filter');
  return filter;
}
export function catalogSort(sort:unknown):Record<string,1|-1>{return sort==='price_asc'?{actualPrice:1,_id:1}:sort==='price_desc'?{actualPrice:-1,_id:1}:{createdAt:-1,_id:-1};}
