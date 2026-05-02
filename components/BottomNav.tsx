
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
    <>
      {/* Desktop Top Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(5,8,7,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        display: 'none', padding: '0 32px', height: 56, alignItems: 'center', justifyContent: 'space-between'
      }} className="desktop-nav">
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => onTabChange('dashboard')}>
          <div style={{ width: 28, height: 28, background: '#10b981', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ color: '#050807', fontWeight: 700, fontSize: 16 }}>account_balance_wallet</span>
          </div>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em', textTransform: 'uppercase' as const }}>
            OKAI <span style={{ color: '#10b981', fontWeight: 500 }}>CAPITAL</span>
          </span>
        </div>

        {/* Nav Items */}
        <div style={{ display: 'flex', gap: 4 }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as NavigationTab)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8,
                background: activeTab === tab.id ? 'rgba(16,185,129,0.08)' : 'transparent',
                border: activeTab === tab.id ? '1px solid rgba(16,185,129,0.15)' : '1px solid transparent',
                color: activeTab === tab.id ? '#10b981' : '#52525b',
                cursor: 'pointer', transition: 'all 0.2s', fontSize: 11, fontWeight: 600,
                letterSpacing: '0.03em'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: activeTab === tab.id ? "'FILL' 1" : "'FILL' 0" }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(5,8,7,0.9)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }} className="mobile-nav">
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: 64 }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as NavigationTab)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 2, width: '100%', height: '100%', border: 'none', background: 'transparent',
                color: activeTab === tab.id ? '#10b981' : '#52525b',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22, fontVariationSettings: activeTab === tab.id ? "'FILL' 1" : "'FILL' 0" }}>
                {tab.icon}
              </span>
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <style>{`
        @media (min-width: 768px) {
          .desktop-nav { display: flex !important; }
          .mobile-nav { display: none !important; }
        }
        @media (max-width: 767px) {
          .desktop-nav { display: none !important; }
          .mobile-nav { display: block !important; }
        }
      `}</style>
    </>
  );
};

export default BottomNav;
