import type { AgentContext } from '../../shared/agent';
export function getWebsiteContext():AgentContext {
  const visibleItems=Array.from(document.querySelectorAll<HTMLElement>('[data-product-id]')).slice(0,20).map(el => ({id:el.dataset.productId!,name:el.dataset.productName || '',displayName:el.dataset.productDisplayName,price:Number(el.dataset.productPrice) || undefined}));
  const selectedProductId=document.querySelector<HTMLElement>('[data-selected-product-id]')?.dataset.selectedProductId;
  const params=new URLSearchParams(window.location.search),search:Record<string,unknown>={};
  for(const key of ['search','category','location','storeName','sort'])if(params.has(key))search[key]=params.get(key);
  for(const key of ['minPrice','maxPrice'])if(params.has(key) && Number.isFinite(Number(params.get(key))))search[key]=Number(params.get(key));
  const delivery=params.get('deliveryAvailable') ?? params.get('delivery');if(delivery!==null)search.deliveryAvailable=delivery==='true';
  return {route:window.location.pathname+window.location.search,title:document.querySelector('main h1,main h2')?.textContent?.slice(0,100) || document.title,visibleItems,...(window.location.pathname==='/marketplace'?{search}:{}),...(selectedProductId ? {selectedProductId} : {})};
}
