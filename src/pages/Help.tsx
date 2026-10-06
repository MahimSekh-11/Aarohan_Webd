import {useState} from 'react';
import {Link} from 'react-router-dom';
import {Mic,ArrowRight,ShieldCheck} from 'lucide-react';
import {useT} from '../components/Translate';
import {useAuthStore} from '../store/useAuthStore';
import {useLanguageStore} from '../store/useLanguageStore';

type Audience='all'|'customer'|'manager'|'admin';
const commands:[Audience,string,string,string,boolean?][]=[
  ['all','Marketplace','Find rice','Searches available products.'],
  ['all','Store','Show rice in Kolkata from Green Store','Filters by location and store.'],
  ['all','Category','Show groceries between 100 and 500','Filters by category and discounted price.'],
  ['all','Sort products','Show the cheapest one','Keeps your filters and sorts by price.'],
  ['all','Delivery Available','Only delivery available','Keeps your filters and selects delivery.'],
  ['all','Clear filters','Clear all filters','Removes all catalog filters.'],
  ['all','View Details','Show this product details','Opens the selected product.'],
  ['all','View Details','Open the second one','Opens a numbered search result.'],
  ['all','Navigation','Go to home page','Opens a page immediately.'],
  ['all','Marketplace','Go to marketplace','Opens a page immediately.'],
  ['all','Account','Go to account','Opens your account after login.'],
  ['all','Navigation','Scroll down','Moves within the current page.'],
  ['all','Navigation','Go back','Returns to the previous page.'],
  ['all','Voice Assistant','Read this page','Reads the visible page aloud.'],
  ['all','Saved preferences','Remember that I prefer Bengali','Saves a preference on this device.'],
  ['all','Saved preferences','Forget that I prefer Bengali','Removes a saved preference.'],
  ['customer','My Requests','Order this item','Creates a buying inquiry after confirmation.',true],
  ['customer','My Requests','Order honey','Finds a listing and asks for confirmation.',true],
  ['customer','My Requests','Show my orders','Shows your buying inquiries.'],
  ['customer','Account','Change my address to Kolkata','Updates your own account after confirmation.',true],
  ['manager','Add Product','Add rice price 200 quantity 5','Adds a product to your approved store.'],
  ['manager','Add Product','Add new product','Asks for missing product details.'],
  ['manager','Edit Product','Update this product price to 220 stock 4','Updates your selected listing after confirmation.',true],
  ['manager','Edit Product','Update this product category groceries delivery yes discount 10','Updates your selected listing after confirmation.',true],
  ['manager','Edit Product','Change this product name to Basmati rice','Updates your selected listing after confirmation.',true],
  ['manager','Delete Product','Delete this product','Deletes your selected listing after confirmation.',true],
  ['manager','My Inventory','Go to inventory','Opens your store inventory.'],
  ['manager','Customer Inquiries','Show my requests','Shows inquiries for your store.'],
  ['manager','Customer Inquiries','Complete the first request','Completes the inquiry and updates stock.',true],
  ['admin','Admin','Open dashboard','Opens the administrator dashboard.'],
];
const native:Record<string,string[]>={
  en:['Find rice','Order this item','Add rice price 200 quantity 5'],
  hi:['चावल खोजो','यह ऑर्डर करो','चावल जोड़ो कीमत 200 मात्रा 5'],
  bn:['চাল খুঁজুন','এটা অর্ডার করো','চাল যোগ করুন দাম ২০০ পরিমাণ ৫'],
  ta:['அரிசி தேடு','இந்த பொருளை வாங்க','அரிசி சேர் விலை 200 அளவு 5'],
  te:['బియ్యం వెతుకు','ఈ వస్తువు కొనాలి','బియ్యం జోడించు ధర 200 పరిమాణం 5'],
  mr:['तांदूळ शोधा','हे खरेदी करा','तांदूळ जोडा किंमत 200 प्रमाण 5'],
  gu:['ચોખા શોધો','આ ખરીદવું','ચોખા ઉમેરો કિંમત 200 જથ્થો 5'],
};
export default function Help(){
  const t=useT(),user=useAuthStore(s=>s.user),language=useLanguageStore(s=>s.currentLang);
  const [audience,setAudience]=useState<Audience>(user?.role || 'all');
  const example=(command:string)=>window.dispatchEvent(new CustomEvent('agent-example',{detail:command}));
  return <section className="space-y-6 py-8" data-testid="voice-help">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="section-kicker">{t('Voice Assistant')}</p><h1 className="page-title mt-3">{t('Voice command help')}</h1><p className="page-subtitle mt-3">{t('Choose your language, tap the microphone, and say a command.')}</p></div><Link className="button-secondary" to="/marketplace">{t('Marketplace')}<ArrowRight size={16}/></Link></div>
    <div className="surface-panel p-5 space-y-3"><h2>{t('Getting started')}</h2><ol className="list-decimal pl-5 space-y-2 text-sm text-[#A5B7C8]"><li>{t('Choose your language, tap the microphone, and say a command.')}</li><li>{t('Select a product before saying this item, or say its name.')}</li><li>{t('Review changes, then say confirm or cancel.')}</li></ol><p className="page-subtitle">{t('Use example fills the assistant input. Send it when ready.')}</p></div>
    <div className="flex flex-wrap gap-2" role="group" aria-label={t('Commands by account')}>{(['all','customer','manager','admin'] as const).map(role=><button className={audience===role?'button-primary':'button-secondary'} aria-pressed={audience===role} key={role} onClick={()=>setAudience(role)}>{t(role==='all'?'Everyone':role==='customer'?'Customer':role==='manager'?'Store Manager':'Admin')}</button>)}</div>
    <p className="page-subtitle">{t('Example commands in English also work with the selected language.')}</p>
    <div className="grid gap-4 md:grid-cols-2">{commands.filter(([role])=>audience==='all'||role==='all'||role===audience).map(([role,title,command,result,confirm])=><article className="surface-panel p-5 space-y-3" key={command}><div className="flex justify-between gap-3"><h2 className="text-base">{t(title)}</h2><span className="text-xs text-[#83D9BD]">{t(role==='all'?'Everyone':role==='customer'?'Customer':role==='manager'?'Store Manager':'Admin')}</span></div><code className="block rounded-xl bg-[#0D1825] p-3 text-sm break-words" lang="en">{command}</code><p className="page-subtitle">{t(result)}</p>{confirm&&<p className="flex items-center gap-2 text-xs text-[#EBC698]"><ShieldCheck size={14}/>{t('Confirmation required')}</p>}<button className="button-secondary" onClick={()=>example(command)}>{t('Use example')}<Mic size={14}/></button></article>)}</div>
    <div className="surface-panel p-5 space-y-3"><h2>{t('Native language examples')}</h2>{(native[language]||native.en).map((command,i)=><div key={command} className="flex flex-wrap justify-between items-center gap-3 border-b border-[#2B4054] py-3"><div><span className="text-xs text-[#83D9BD]">{t(i===0?'Everyone':i===1?'Customer':'Store Manager')}</span><p lang={language}>{command}</p></div><button className="button-secondary" onClick={()=>example(command)}>{t('Use example')}</button></div>)}</div>
    <div className="surface-panel p-5 space-y-3"><h2>{t('Account permissions')}</h2><p className="page-subtitle">{t('Buying requires a customer account. Inventory changes require an approved store manager.')}</p><p className="page-subtitle">{t('Administrators approve and manage accounts using dashboard buttons. Voice opens the dashboard.')}</p><p className="page-subtitle">{t('Orders are buying inquiries. Online payment is not available.')}</p></div>
    <details className="surface-panel p-5"><summary className="cursor-pointer font-semibold">{t('Voice troubleshooting')}</summary><div className="space-y-3 mt-4 page-subtitle"><p>{t('Allow microphone access, use HTTPS, and check the selected language.')}</p><p>{t('Speak briefly and check the transcript. Type a command if recognition fails.')}</p><p>{t('First audio fallback may take longer while the speech engine prepares. Buttons remain usable.')}</p><p>{t('Use mute, replay, or stop speaking in the assistant toolbar.')}</p></div></details>
  </section>;
}
