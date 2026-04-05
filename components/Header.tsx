
import React from 'react';
import { NavigationTab } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange }) => {
  const { profile } = useAuth();
  
  const titles: Record<NavigationTab, string> = {
    landing: 'Bem-vindo',
    dashboard: 'Dashboard',
    marketplace: 'Fundos',
    referrals: 'Indicar',
    profile: 'Meu Perfil'
  };

  return (
    <header className="sticky top-0 z-40 bg-background-dark/80 backdrop-blur-md border-b border-border-dark/50 px-4 sm:px-10 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-primary cursor-pointer" onClick={() => onTabChange('dashboard')}>
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
            <span className="material-symbols-outlined text-background-dark font-bold text-xl">account_balance_wallet</span>
          </div>
          <h1 className="text-white text-lg font-black tracking-tight hidden md:block uppercase">OKAI <span className="text-primary font-medium">CAPITAL</span></h1>
        </div>
        
        {/* Desktop Title / Context */}
        <h2 className="text-slate-400 text-sm font-medium border-l border-border-dark pl-6 hidden md:block">
          {titles[activeTab]}
        </h2>
      </div>

      <div className="flex items-center gap-3">
        <button className="p-2 rounded-xl bg-card-dark border border-border-dark text-slate-400 hover:text-white relative">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-2 right-2 size-2 bg-primary rounded-full border-2 border-background-dark"></span>
        </button>
        
        <div className="h-8 w-px bg-border-dark mx-1 hidden sm:block"></div>
        
        <div 
          className="flex items-center gap-3 pl-1 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onTabChange('profile')}
        >
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-white leading-tight">{profile?.nome || 'Alexander S.'}</p>
            <p className="text-[10px] text-primary uppercase tracking-wider font-bold">{profile?.tipo_investidor || 'Investidor Pro'}</p>
          </div>
          <img 
            src={profile?.avatar_url || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"} 
            alt="Profile" 
            className="size-9 rounded-full border-2 border-primary/20 object-cover"
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
