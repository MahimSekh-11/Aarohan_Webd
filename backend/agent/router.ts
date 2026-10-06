import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { authMiddleware } from '../middleware.js';
import { AgentAction } from '../models.js';
import { agentLanguages, detectAgentLanguage, type AgentLanguage } from '../../shared/agentLanguages.js';
import { type AgentRequest, type AgentResult, validateToolCall } from '../../shared/agent.js';
import { getLLMProvider, LocalLLMProvider, localizeReply } from './providers.js';
import { executeTool } from './tools.js';
import { productComplete } from '../../shared/productVoice.js';
import { naturalSpeechConfigured } from '../speechSynthesis.js';
import { isVoiceConfirmation } from '../../shared/voiceCommands.js';
import { translateKnownProductName } from '../../shared/productNames.js';

export const agentRouter=Router();
const rates=new Map<string,{count:number;until:number}>();
agentRouter.use((req,res,next) => { if(req.headers.authorization)void authMiddleware(req,res,next);else next(); });
agentRouter.use((req,res,next) => {
  // Read-only capability checks must not exhaust a user's command allowance.
  if(req.method!=='POST' || req.path!=='/message'){next();return;}
  const key=req.user ? `user:${req.user._id}` : `ip:${req.ip || 'unknown'}`, now=Date.now();
  if(rates.size>2000)for(const [key,record]of rates)if(record.until<now)rates.delete(key);
  const record=rates.get(key); if(!record || record.until<now)rates.set(key,{count:1,until:now+60000});
  else if(++record.count>40){res.status(429).json({message:'Please wait a moment before sending another message.'});return;}
  next();
});
agentRouter.get('/status', (_req,res) => res.json({provider:getLLMProvider().name,languages:Object.keys(agentLanguages),tools:['products','requests','inventory','navigation','account'],cloudSpeech:!!process.env.GEMINI_API_KEY,ttsProvider:naturalSpeechConfigured()?'gemini':'local'}));
agentRouter.post('/message', async (req:Request,res:Response) => {
  const started=Date.now(), requestId=randomUUID();
  let language:AgentLanguage='en';
  try {
    const body=req.body;
    if(typeof body.message !== 'string' || !body.message.trim() || body.message.length>1500 || !Object.hasOwn(agentLanguages,body.language || 'auto')) {res.status(400).json({message:'Invalid message or language'});return;}
    language=body.language === 'auto' || !body.language ? detectAgentLanguage(body.message) : body.language;
    const context=body.context || {};
    const items=(value:any) => Array.isArray(value) ? value.slice(0,20).filter((item:any) => typeof item?.id==='string' && /^[a-f0-9]{24}$/i.test(item.id) && typeof item.name==='string').map((item:any) => ({id:item.id,name:item.name.slice(0,150),...(typeof item.displayName === 'string' ? {displayName:item.displayName.slice(0,150)} : {}),...(['product','request'].includes(item.kind)?{kind:item.kind}:{}),...(typeof item.price==='number' ? {price:item.price} : {})})) : [];
    const history=Array.isArray(body.history) ? body.history.slice(-10).filter((m:any) => ['user','assistant'].includes(m?.role) && typeof m.text==='string').map((m:any) => ({role:m.role,text:m.text.slice(0,1000)})) : [];
    const input:AgentRequest={message:body.message.trim(),language,history,preferences:{...(typeof body.preferences?.budget==='number' && Number.isFinite(body.preferences.budget) && body.preferences.budget>0 && body.preferences.budget<=1000000?{budget:body.preferences.budget}:{}),...(typeof body.preferences?.category==='string' && ['Groceries','Handicrafts','Electronics','Clothing','Hardware'].includes(body.preferences.category)?{category:body.preferences.category}:{})},context:{route:typeof context.route==='string' ? context.route.slice(0,200) : '/',title:typeof context.title==='string' ? context.title.slice(0,100) : '',selectedProductId:typeof context.selectedProductId === 'string' && /^[a-f0-9]{24}$/i.test(context.selectedProductId) ? context.selectedProductId : undefined,visibleItems:items(context.visibleItems),recentItems:items(context.recentItems),search:context.search && typeof context.search==='object' ? context.search : {},draft:context.draft && typeof context.draft==='object' ? context.draft : undefined}};
    if(JSON.stringify(input).length>20000){res.status(400).json({message:'Conversation context is too large'});return;}
    let provider=getLLMProvider();
    const result:AgentResult={reply:'',language,actions:[],provider:provider.name};
    let replyLocalized=false;
    if(body.pending && isVoiceConfirmation(input.message)) {
      if(!req.user)throw new Error('Please log in to use this action.');
      const pending=await AgentAction.findOneAndUpdate({_id:String(body.pending),userId:req.user._id,consumed:false,expiresAt:{$gt:new Date()}},{$set:{consumed:true}},{returnDocument:'after'});
      if(!pending)throw new Error('This confirmation has expired or was already used.');
      const call=validateToolCall({name:pending.name,args:pending.args});
      const output=await executeTool(call,{user:req.user,language},true);
      result.reply=output.message; result.actions=output.actions || [];
    } else {
      let plan;
      try {
        const quick=await new LocalLLMProvider().plan(input,req.user?.role);
        if(quick.calls.length===1&&['navigate','get_profile','website_control'].includes(quick.calls[0].name)){plan=quick;result.provider='local';}
        else plan=provider.name==='local'?quick:await provider.plan(input,req.user?.role);
      }
      catch {provider=new LocalLLMProvider();result.provider='local';plan=await provider.plan(input,req.user?.role);}
      if(!plan.calls.length){
        // A model-only answer cannot assert that a database action succeeded.
        const local=await new LocalLLMProvider().plan(input,req.user?.role);
        result.reply=local.message?.slice(0,500) || 'I did not understand. Try searching for a product or ask for help.';
      }
      const calls=plan.calls.map(validateToolCall);
      if(calls.filter(call=>['create_product','update_product','delete_product','request_product','update_request','update_profile'].includes(call.name)).length>1)throw new Error('Please request one change at a time.');
      for(const call of calls) {
        // Never auto-submit uncertain speech or a listing in review mode.
        if(call.name==='create_product' && productComplete({quantity:1,...call.args}) && (body.autoSave === false || body.confident === false)) {
          if(!req.user)throw new Error('Please log in to use this action.');
          if(req.user.role!=='manager' || req.user.status!=='approved')throw new Error('This action is not available for your account.');
          result.draft={quantity:1,...call.args}; result.reply='Review this product, then confirm to save it.'; break;
        }
        const output=await executeTool(call,{user:req.user,language});
        replyLocalized=false;
        result.reply=output.message;
        if(output.result?.count !== undefined){result.reply=`${await localizeReply(output.message,language)}: ${output.result.count}.`;replyLocalized=true;}
        if(output.result?.name && ['get_product','request_product','update_product'].includes(call.name)){
          const name=translateKnownProductName(output.result.name,agentLanguages[language].base).text;
          result.reply=`${await localizeReply(output.message,language)}: ${name}${call.name==='update_product'?'':`, ₹${output.result.price}`}.`;
          replyLocalized=true;
        }
        result.actions.push(...output.actions || []);
        if(output.items)result.items=output.items;
        if(output.draft)result.draft=output.draft;
        if(output.search)result.search=output.search;
        if(output.needsConfirmation) {
          const record=await AgentAction.create({_id:randomUUID(),userId:req.user._id,name:call.name,args:output.confirmationArgs || call.args,expiresAt:new Date(Date.now()+300000)});
          result.pending={id:record._id,name:call.name,args:output.confirmationArgs || call.args};break;
        }
      }
    }
    if(!replyLocalized)result.reply=await localizeReply(result.reply,language).catch(() => result.reply);
    if(process.env.NODE_ENV !== 'production')console.info('Agent request',{requestId,language,provider:result.provider,actions:result.actions.map(a => a.type),latencyMs:Date.now()-started});
    res.json({...result,requestId});
  } catch(error) {
    const message=error instanceof Error ? error.message : 'The assistant could not finish this request. Please try again.';
    const publicMessage=/^(Please |This |Product |Request |A completed|Invalid |Unsupported |The website)/.test(message) ? message : 'The assistant could not finish this request. Please try again.';
    res.status(200).json({reply:await localizeReply(publicMessage,language).catch(() => publicMessage),language,actions:[],provider:'local',error:true,requestId});
  }
});
