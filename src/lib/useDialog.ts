import { RefObject, useEffect } from 'react';
export function useDialog(open:boolean,ref:RefObject<HTMLElement|null>,close:()=>void){
  useEffect(()=>{if(!open)return;const previous=document.activeElement as HTMLElement,overflow=document.body.style.overflow;document.body.style.overflow='hidden';const panel=ref.current;panel?.querySelector<HTMLElement>('button,input,select,textarea,a[href]')?.focus();
    function key(e:KeyboardEvent){if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'&&panel){const nodes=[...panel.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select,textarea,a[href],[tabindex="0"]')].filter(el=>el.offsetParent!==null);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}
    document.addEventListener('keydown',key);return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',key);previous?.focus();};
  },[open]);
}
