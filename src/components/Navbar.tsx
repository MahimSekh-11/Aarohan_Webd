import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Globe, LogOut, LayoutDashboard, Store, UserCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useLanguageStore, LANGUAGE_NAMES, Language } from '../store/useLanguageStore';
import { NotificationBell } from './NotificationProvider';
import { useT } from './Translate';
export default function Navbar() {
  const {user,logout}=useAuthStore(), navigate=useNavigate(),t=useT();
  const {currentLang,setLanguage}=useLanguageStore();
  return <header className="site-nav"><div className="nav-inner">
    <Link className="brand" to="/" aria-label="TIORKHALI MART"><span className="brand-mark"><Store size={23}/></span><span><span className="brand-name">TIORKHALI MART</span><span className="brand-note">{t('Empowering Local Micro-Commerce')}</span></span></Link>
    <nav className="nav-mobile" aria-label={t('Navigation')}><NavLink className="nav-link" to="/marketplace">{t('Marketplace')}</NavLink>{user && <NavLink className="nav-link" to={`/${user.role}`}><LayoutDashboard size={16}/>{t(user.role==='customer' ? 'Requests' : user.role==='admin' ? 'Admin' : 'Dashboard')}</NavLink>}</nav>
    <div className="flex items-center gap-2"><label className="nav-language"><Globe size={15}/><select data-testid="site-language" aria-label={t('Language')} value={currentLang} onChange={e=>setLanguage(e.target.value as Language)}>{Object.entries(LANGUAGE_NAMES).map(([key,name])=><option key={key} value={key}>{name}</option>)}</select></label>
      {user ? <><NotificationBell/><Link to="/account" className="user-avatar" aria-label={t('Account')}><UserCircle size={21}/></Link><button className="icon-button" aria-label={t('Logout')} onClick={()=>{logout();navigate('/');}}><LogOut size={18}/></button></> : <><Link className="nav-link" to="/login">{t('LOG IN')}</Link><Link className="button-primary" to="/register">{t('SIGN UP')}</Link></>}
    </div>
  </div></header>;
}
