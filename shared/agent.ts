import type { AgentLanguage } from './agentLanguages.js';
export const toolNames = ['navigate','search_products','get_product','get_requests','create_product','update_product','delete_product','request_product','update_request','get_profile','update_profile','website_control'] as const;
export type ToolName = typeof toolNames[number];
export type ToolCall = { name:ToolName; args:Record<string,unknown> };
export type AgentMessage = { role:'user'|'assistant'; text:string };
export type AgentContext = { route:string; title:string; selectedProductId?:string; visibleItems:{id:string;name:string;displayName?:string;price?:number;kind?:'product'|'request'}[]; recentItems?:{id:string;name:string;displayName?:string;price?:number;kind?:'product'|'request'}[]; search?:Record<string,unknown>; draft?:Record<string,unknown>; pending?:string };
export type AgentRequest = { message:string; language:AgentLanguage; history:AgentMessage[]; context:AgentContext; preferences?:{budget?:number;category?:string} };
export type AgentPlan = { calls:ToolCall[]; message?:string };
export type AgentResult = { reply:string; language:AgentLanguage; actions:{type:'navigate'|'website_control'|'refresh'; path?:string; command?:string}[]; items?:any[]; draft?:Record<string,any>; search?:Record<string,unknown>; pending?:{id:string;name:ToolName;args:Record<string,unknown>}; provider:'local'|'gemini' };
export const navigationPaths = ['/', '/help','/marketplace','/login','/register','/admin/login','/manager','/manager?view=leads','/manager?view=add','/customer','/customer?tab=requests','/admin','/account'] as const;

export function validateToolCall(value: unknown): ToolCall {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid action');
  const call = value as ToolCall;
  if (!toolNames.includes(call.name) || !call.args || typeof call.args !== 'object' || Array.isArray(call.args)) throw new Error('Unsupported action');
  const allowed: Record<ToolName,string[]> = {
    navigate:['path'], search_products:['search','category','location','storeName','minPrice','maxPrice','deliveryAvailable','sort','limit'],
    get_product:['id','search'],get_requests:['status','index'],create_product:['name','description','price','quantity','category','deliveryAvailable'],
    update_product:['id','search','name','description','price','offer','quantity','category','deliveryAvailable'],delete_product:['id'],
    request_product:['id','search'],update_request:['id','status'],get_profile:[],update_profile:['name','address'],website_control:['command'],
  };
  for (const [key,item] of Object.entries(call.args)) {
    if (!allowed[call.name].includes(key) || ['__proto__','constructor','prototype'].includes(key)) throw new Error('Invalid action parameters');
    if (typeof item === 'string') {
      if (item.length > (key === 'description' || key === 'address' ? 1000 : 150) || /[\u0000-\u0008]/u.test(item)) throw new Error('Invalid text parameter');
    } else if (typeof item !== 'number' && typeof item !== 'boolean') throw new Error('Invalid parameter type');
    if (['price','offer','quantity','minPrice','maxPrice','limit','index'].includes(key) && (typeof item !== 'number' || !Number.isFinite(item) || item < 0 || item > 10000000)) throw new Error('Invalid numeric parameter');
    if (key === 'deliveryAvailable' && typeof item !== 'boolean') throw new Error('Invalid delivery parameter');
    if (['name','description','category','location','storeName','search','path','id','status','sort','command','address'].includes(key) && typeof item !== 'string') throw new Error('Invalid text parameter');
    if (key === 'id' && (typeof item !== 'string' || !/^[a-f0-9]{24}$/i.test(item))) throw new Error('Invalid item reference');
  }
  if (call.name === 'navigate' && !navigationPaths.includes(call.args.path as any)) throw new Error('Unsupported page');
  if (call.name === 'website_control' && !['scroll_down','scroll_up','back','read'].includes(String(call.args.command))) throw new Error('Unsupported page control');
  if (call.args.sort && !['price_asc','price_desc','newest'].includes(String(call.args.sort))) throw new Error('Unsupported sort');
  if (call.args.status && !['new','contacted','resolved'].includes(String(call.args.status))) throw new Error('Unsupported request status');
  if (['get_product','update_product','request_product'].includes(call.name) && (!call.args.id && !String(call.args.search || '').trim() || call.args.id && call.args.search)) throw new Error('Please select a product or request first.');
  if (['delete_product','update_request'].includes(call.name) && !call.args.id) throw new Error('Please select a product or request first.');
  return { name:call.name, args:{...call.args} };
}
