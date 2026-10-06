import type { AgentContext } from '../../shared/agent';
export function getWebsiteContext():AgentContext {
  const visibleItems=Array.from(document.querySelectorAll<HTMLElement>('[data-product-id]')).slice(0,20).map(el => ({id:el.dataset.productId!,name:el.dataset.productName || '',price:Number(el.dataset.productPrice) || undefined}));
  return {route:window.location.pathname+window.location.search,title:document.querySelector('main h1,main h2')?.textContent?.slice(0,100) || document.title,visibleItems};
}
