export const pages={
  '/marketplace':()=>import('../pages/Marketplace'),'/help':()=>import('../pages/Help'),
  '/login':()=>import('../pages/Login'),'/register':()=>import('../pages/Register'),
  '/admin/login':()=>import('../pages/AdminLogin'),'/manager':()=>import('../pages/ManagerDashboard'),
  '/admin':()=>import('../pages/AdminDashboard'),'/customer':()=>import('../pages/CustomerDashboard'),'/account':()=>import('../pages/Account'),
};
export function prefetchPage(path:string){void pages[path.split('?')[0] as keyof typeof pages]?.().catch(()=>{});}
