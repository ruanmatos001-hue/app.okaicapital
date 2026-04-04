import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import Marketplace from './pages/Marketplace';
import Referrals from './pages/Referrals';
import Profile from './pages/Profile';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import BottomNav from './components/BottomNav';
import Header from './components/Header';
import { NavigationTab } from './types';

type AppScreen = 'landing' | 'login' | 'cadastro' | 'app';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState<AppScreen>('landing');
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');

  useEffect(() => {
    if (user) {
      setActiveTab('dashboard');
    }
  }, [user]);

  // Loading spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/30 animate-pulse">
            <span className="material-symbols-outlined text-background-dark text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              account_balance_wallet
            </span>
          </div>
          <div className="flex gap-1.5">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  // Usuário autenticado → App
  if (user) {
    const renderPage = () => {
      switch (activeTab) {
        case 'dashboard':
          return <Dashboard onTabChange={setActiveTab} />;
        case 'marketplace':
          return <Marketplace />;
        case 'referrals':
          return <Referrals />;
        case 'profile':
          return <Profile />;
        default:
          return <Dashboard onTabChange={setActiveTab} />;
      }
    };

    return (
      <div className="min-h-screen bg-background-dark text-slate-100 flex flex-col pb-24 md:pb-0 font-display">
        <Header activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-grow w-full max-w-[1400px] mx-auto px-4 lg:px-8 py-4 sm:py-8 transition-opacity duration-300">
          {renderPage()}
        </main>
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    );
  }

  // Landing page
  if (screen === 'landing') {
    return (
      <LandingPage
        onLogin={() => setScreen('login')}
        onCadastro={() => setScreen('cadastro')}
      />
    );
  }

  // Auth page (login ou cadastro)
  return (
    <AuthPage
      initialMode={screen === 'cadastro' ? 'cadastro' : 'login'}
      onBack={() => setScreen('landing')}
    />
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
