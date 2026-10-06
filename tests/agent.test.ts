import test from 'node:test';
import assert from 'node:assert/strict';
import {validateToolCall} from '../shared/agent';
import {detectAgentLanguage} from '../shared/agentLanguages';
import {parseMemoryInstruction} from '../shared/memoryCommands';
import {LocalLLMProvider,parseSearchRequest} from '../backend/agent/providers';
import {validateMemory} from '../src/agent/memory';
import {productFields} from '../backend/validation';
import {translateKnownProductName} from '../shared/productNames';
import {expandProductSearch} from '../shared/languages';
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
  for(const phrase of ['यह ऑर्डर करो','এটা অর্ডার করো','இந்த பொருளை வாங்க','ఈ వస్తువు కొనాలి','हे खरेदी करा','આ ખરીદવું']){
    const order=await provider.plan({message:phrase,language:'en',history:[],context:{...context,selectedProductId:context.recentItems[1].id}});assert.equal(order.calls[0].name,'request_product');assert.equal(order.calls[0].args.id,context.recentItems[1].id);
  }
});
test('voice filters combine and preserve location, store, category and both price bounds',async()=>{
  const query=parseSearchRequest('show rice in Kolkata from Green Store category groceries between 100 and 500');
  assert.deepEqual(query,{location:'kolkata',storeName:'green store',category:'Groceries',minPrice:100,maxPrice:500,search:'rice',sort:'newest'});
  assert.equal(parseSearchRequest('filter by location Kolkata').location,'kolkata');
  assert.equal(parseSearchRequest('filter by store name Green Store').storeName,'green store');
  assert.equal(parseSearchRequest('show products category Electronics under 500').category,'Electronics');
  assert.deepEqual(parseSearchRequest('clear all filters',query),{sort:'newest'});
  const next=parseSearchRequest('only delivery available',query);assert.equal(next.location,'kolkata');assert.equal(next.minPrice,100);assert.equal(next.deliveryAvailable,true);assert.equal(next.search,'rice');
  const native=parseSearchRequest('চাল খুঁজুন লোকেশন কলকাতা দোকান Green Store বিভাগ মুদিখানা ৫০০ টাকার মধ্যে');assert.equal(native.location,'কলকাতা');assert.equal(native.storeName,'green store');assert.equal(native.category,'Groceries');assert.equal(native.maxPrice,500);assert.equal(native.search,'চাল');
});
test('details, navigation and updates use precise validated references and fields',async()=>{
  const provider=new LocalLLMProvider(),selected={...context,selectedProductId:context.recentItems[1].id};
  const plan=(message:string)=>provider.plan({message,language:'en',history:[],context:selected},'manager');
  assert.deepEqual((await plan('show this product details')).calls,[{name:'get_product',args:{id:context.recentItems[1].id}}]);
  for(const [phrase,path]of [['go to home page','/'],['move to marketplace','/marketplace'],['open inventory','/manager'],['open add product page','/manager?view=add'],['go to account','/account']])assert.equal((await plan(phrase)).calls[0].args.path,path);
  const updated=await plan('update this product price to 180 stock 4 category hardware description fresh local honey delivery yes discount 10');
  assert.equal(updated.calls[0].name,'update_product');assert.deepEqual(updated.calls[0].args,{id:context.recentItems[1].id,price:180,quantity:4,category:'Hardware',description:'fresh local honey',deliveryAvailable:true,offer:10});
  const renamed=await plan('change this product name to Pure Honey Comb');assert.equal(renamed.calls[0].args.name,'pure honey comb');
  assert.equal((await plan('update this product description fresh local rice')).calls[0].args.id,context.recentItems[1].id,'A name inside the new description must never choose another product');
  assert.deepEqual((await plan('change the price of Rice to two hundred fifty')).calls[0].args,{id:context.recentItems[0].id,price:250});
  assert.deepEqual((await plan('update Laptop price to 250')).calls[0].args,{search:'laptop',price:250},'An explicit different name must not update the open product');
  assert.deepEqual((await plan('remove all filters')).calls,[{name:'search_products',args:{sort:'newest'}}],'Removing filters must not delete a selected product');
  assert.equal((await provider.plan({message:'show details of basmati rice',language:'en',history:[],context:{...context,visibleItems:[],recentItems:[]}})).calls[0].args.search,'basmati rice');
});
test('translated product names keep searchable original identity in every UI locale',async()=>{
  const translations=['Basmati rice','बासमती चावल','বাসমতি চাল','பாஸ்மதி அரிசி','బాస్మతి బియ్యం','बासमती तांदूळ','બાસમતી ચોખા'];
  for(const [index,language]of ['en','hi','bn','ta','te','mr','gu'].entries()){
    const named=translateKnownProductName('Basmati rice',language);assert.equal(named.complete,true);assert.equal(named.text.toLocaleLowerCase(),translations[index].toLocaleLowerCase());
  }
  assert.equal(translateKnownProductName('বাসমতি চাল','en').text,'basmati rice');assert.ok(expandProductSearch('বাসমতি চাল').includes('basmati rice'));
  const provider=new LocalLLMProvider();const result=await provider.plan({message:'বাসমতি চাল অর্ডার করো',language:'bn',history:[],context:{...context,recentItems:[{id:context.recentItems[0].id,name:'Basmati rice',displayName:'বাসমতি চাল'}]}});
  assert.equal(result.calls[0].args.id,context.recentItems[0].id);
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
