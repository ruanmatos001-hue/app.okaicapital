
import React from 'react';
import { NavigationTab } from '../types';

interface BottomNavProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'dashboard', icon: 'grid_view', label: 'Home' },
    { id: 'marketplace', icon: 'account_balance_wallet', label: 'Fundos' },
    { id: 'referrals', icon: 'group', label: 'Indicar' },
    { id: 'profile', icon: 'person', label: 'Perfil' },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass-morphism border-t border-white/5 pb-safe">
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id as NavigationTab)}
            className={`flex flex-col items-center justify-center gap-1 transition-all w-full h-full ${
              activeTab === tab.id ? 'text-primary' : 'text-slate-500'
            }`}
          >
            <span className={`material-symbols-outlined text-2xl ${activeTab === tab.id ? 'font-fill' : ''}`}>
              {tab.icon}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
