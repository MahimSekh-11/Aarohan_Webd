import test from 'node:test';
import assert from 'node:assert/strict';
import {validateToolCall} from '../shared/agent';
import {detectAgentLanguage} from '../shared/agentLanguages';
import {parseMemoryInstruction} from '../shared/memoryCommands';
import {LocalLLMProvider,parseSearchRequest} from '../backend/agent/providers';
import {validateMemory} from '../src/agent/memory';
import {productFields} from '../backend/validation';
const context={route:'/marketplace',title:'Mart',visibleItems:[],recentItems:[{id:'0123456789abcdef01234567',name:'Rice',price:100},{id:'1123456789abcdef01234567',name:'Honey',price:200}]};
test('tools reject arbitrary execution, query operators, injected roles and malformed parameters',()=>{
  for(const call of [{name:'execute_code',args:{code:'process.exit()'}},{name:'navigate',args:{path:'https://evil.example'}},{name:'navigate',args:{path:'javascript:alert(1)'}},{name:'search_products',args:{search:{$ne:null}}},{name:'create_product',args:{name:'Rice',price:NaN}},{name:'create_product',args:{name:'Rice',managerId:'0123456789abcdef01234567'}},{name:'delete_product',args:{id:'hello'}},{name:'update_request',args:{id:context.recentItems[0].id,status:'paid'}},{name:'website_control',args:{command:'eval'}}])assert.throws(()=>validateToolCall(call));
  assert.deepEqual(validateToolCall({name:'search_products',args:{search:'Rice',maxPrice:500,sort:'price_asc'}}).args,{search:'Rice',maxPrice:500,sort:'price_asc'});
});
test('natural searches preserve budgets, references and follow-up constraints',async()=>{
  assert.equal(parseSearchRequest('Show me laptops under fifty thousand').maxPrice,50000);
  assert.equal(parseSearchRequest('আমার জন্য ৫০০ টাকার মধ্যে চাল খুঁজে দাও').maxPrice,500);
  const provider=new LocalLLMProvider();
  const first=await provider.plan({message:'Find rice under 500',language:'en',history:[],context});assert.equal(first.calls[0].args.search,'rice');
  const next=await provider.plan({message:'Show the cheapest one',language:'en',history:[],context:{...context,search:first.calls[0].args}});assert.equal(next.calls[0].args.maxPrice,500);assert.equal(next.calls[0].args.sort,'price_asc');assert.equal(next.calls[0].args.search,'rice');
  assert.deepEqual((await provider.plan({message:'Open the second one',language:'en',history:[],context})).calls,[{name:'get_product',args:{id:context.recentItems[1].id}}]);
  assert.equal((await provider.plan({message:'Buy this',language:'en',history:[],context:{...context,selectedProductId:context.recentItems[0].id}})).calls[0].name,'request_product');
  assert.equal((await provider.plan({message:'Book a flight',language:'en',history:[],context})).calls.length,0);
});
test('voice buying intent resolves selected, ordinal and named products without guessing',async()=>{
  const provider=new LocalLLMProvider();
  const plan=(message:string,extra:any={})=>provider.plan({message,language:'en',history:[],context:{...context,...extra}},'customer');
  for(const message of ['order this item','buy this product','এটা অর্ডার করো','यह आइटम ऑर्डर करो'])assert.deepEqual((await plan(message,{selectedProductId:context.recentItems[1].id})).calls,[{name:'request_product',args:{id:context.recentItems[1].id}}]);
  assert.deepEqual((await plan('Order the second item')).calls,[{name:'request_product',args:{id:context.recentItems[1].id}}]);
  assert.deepEqual((await plan('I want to order Honey')).calls,[{name:'request_product',args:{id:context.recentItems[1].id}}]);
  assert.equal((await plan('Order this item')).calls.length,0,'Two unselected products must not silently buy the first');
  assert.deepEqual((await plan('Order product 2')).calls,[{name:'request_product',args:{id:context.recentItems[1].id}}]);
  assert.deepEqual((await plan('Order milk')).calls,[{name:'request_product',args:{search:'milk'}}]);
  assert.deepEqual((await plan('আমাকে দুধ অর্ডার করে দাও')).calls,[{name:'request_product',args:{search:'দুধ'}}]);
  assert.equal((await plan('show my orders')).calls[0].name,'get_requests');
  assert.equal((await plan('open my requests')).calls[0].name,'get_requests');
});
test('spoken search phrases and listing phrases execute the intended action',async()=>{
  const provider=new LocalLLMProvider();
  for(const [phrase,search] of [['find this product rice','rice'],['Please find rice in the marketplace','rice'],['search for a honey item','honey'],['আমাকে চাল খুঁজে দাও','চাল'],['মধু সার্চ করুন','মধু'],['चावल खोजो','चावल']]){
    const result=await provider.plan({message:phrase,language:'en',history:[],context});assert.equal(result.calls[0].name,'search_products');assert.equal(result.calls[0].args.search,search);
  }
  for(const phrase of ['add item rice price 200 quantity 5','I want to add a new item named rice priced at 200 with quantity 5']){
    const result=await provider.plan({message:phrase,language:'en',history:[],context},'manager');assert.equal(result.calls[0].name,'create_product');assert.equal(result.calls[0].args.name,'rice');assert.equal(result.calls[0].args.price,200);assert.equal(result.calls[0].args.quantity,5);
  }
  const selected=await provider.plan({message:'find this product',language:'en',history:[],context:{...context,selectedProductId:context.recentItems[1].id}});assert.equal(selected.calls[0].args.id,context.recentItems[1].id);
});
test('language detection supports native scripts and mixed transliteration',()=>{
  for(const [text,expected]of [['আমাকে চাল দাও','bn'],['मुझे चावल चाहिए','hi'],['मला तांदूळ पाहिजे','mr'],['அரிசி தேடு','ta'],['బియ్యం వెతుకు','te'],['ચોખા શોધો','gu'],['ಅಕ್ಕಿ','kn'],['അരി','ml'],['ਚੌਲ','pa'],['چاول','ur'],['amar jonno rice dao','banglish'],['mujhe rice chahiye','hinglish']] as const)assert.equal(detectAgentLanguage(text),expected);
});
test('memory is explicit, whitelisted, removable and validates persisted values',()=>{
  assert.equal(parseMemoryInstruction('I prefer Bengali'),undefined);
  assert.deepEqual(parseMemoryInstruction('Remember that I prefer Bengali'),{action:'remember',key:'language',value:'bn'});
  assert.deepEqual(parseMemoryInstruction('Forget that I prefer Bengali'),{action:'forget',key:'language'});
  assert.deepEqual(parseMemoryInstruction('Remember my budget under 500'),{action:'remember',key:'budget',value:500});
  assert.deepEqual(parseMemoryInstruction('Remember my password secret'),{action:'unsupported'});
  assert.equal(validateMemory('language','not-a-language'),false);assert.equal(validateMemory('budget',Infinity),false);assert.equal(validateMemory('budget',-1),false);assert.equal(validateMemory('category','secret'),false);
});
test('product forms sanitize ownership and recalculate server-trusted prices',()=>{
  const result=productFields({name:'Rice',description:'Fresh rice',category:'Groceries',price:200,quantity:5,managerId:'evil',actualPrice:1,offer:10});assert.equal(result.managerId,undefined);assert.equal(result.actualPrice,undefined);
  for(const price of [0,-1,'100',Infinity])assert.throws(()=>productFields({name:'Rice',description:'Rice',category:'Groceries',price}));
  assert.throws(()=>productFields({name:'Rice',description:'Rice',category:'Groceries',price:10,images:['javascript:alert(1)']}));
});
