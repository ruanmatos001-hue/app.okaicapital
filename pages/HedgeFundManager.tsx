import React, { useState } from 'react';
import './admin-dashboard.css';
import AdminSidebar, { AdminView } from './admin/AdminSidebar';
import AdminOverview from './admin/AdminOverview';
import AdminAtivos from './admin/AdminAtivos';
import AdminInvestors from './admin/AdminInvestors';
import AdminClientView from './admin/AdminClientView';

const HedgeFundManager: React.FC = () => {
  const [activeView, setActiveView] = useState<AdminView>('overview');
  const [selectedFund, setSelectedFund] = useState('grao');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [notif, setNotif] = useState(false);

  const showNotif = (msg?: string) => {
    setNotif(true);
    setTimeout(() => setNotif(false), 3000);
  };

  const handleViewChange = (v: string) => {
    setActiveView(v as AdminView);
  };

  return (
    <div style={{ background: 'var(--ok-black)', minHeight: '100vh' }}>
      {/* SIDEBAR */}
      <AdminSidebar activeView={activeView} onViewChange={setActiveView} />

      {/* NOTIFICATION */}
      <div className={`admin-notif ${notif ? 'show' : ''}`}>✓ Operação realizada com sucesso</div>

      {/* MAIN CONTENT */}
      <main className="admin-main">

        {/* Fund Selector - visible on all views */}
        {activeView !== 'cliente' && (
          <div style={{ marginBottom: 24 }}>
            <div className="admin-tabs">
              <button className={`admin-tab ${selectedFund === 'grao' ? 'active' : ''}`} onClick={() => setSelectedFund('grao')}>Fundo Grão</button>
              <button className={`admin-tab ${selectedFund === 'avane' ? 'active' : ''}`} onClick={() => setSelectedFund('avane')}>Fundo Avane</button>
            </div>
          </div>
        )}

        {/* VIEWS */}
        {activeView === 'overview' && (
          <AdminOverview onViewChange={handleViewChange} selectedFund={selectedFund} />
        )}

        {activeView === 'ativos' && (
          <AdminAtivos selectedFund={selectedFund} />
        )}

        {activeView === 'cotas' && (
          <div>
            <div className="admin-topbar">
              <div>
                <h1 className="admin-page-title">Atualizar Cotas</h1>
                <div className="admin-page-sub">Atualização diária · Cascateia para todos os clientes</div>
              </div>
            </div>
            <div className="admin-card">
              <div className="admin-card-header">
                <div className="admin-card-title">Gestão de Cotas</div>
                <div className="admin-card-badge" style={{ color: 'var(--ok-gold)', borderColor: 'rgba(201,168,76,0.3)' }}>Sistema Ativo</div>
              </div>
              <p style={{ fontSize: 11, color: 'var(--ok-muted)', marginBottom: 20, lineHeight: 1.8 }}>
                As cotas são calculadas automaticamente com base nos lançamentos de rendimento feitos na aba <strong style={{ color: 'var(--ok-gold)' }}>Investidores</strong>.
                <br />Cada vez que um rendimento mensal é registrado, o saldo do cliente é atualizado e a taxa de performance (15%) é cobrada automaticamente.
              </p>
              <button className="admin-btn admin-btn-gold" onClick={() => setActiveView('investidores')}>
                Ir para Investidores → Lançar Rendimentos
              </button>
            </div>
          </div>
        )}

        {activeView === 'investidores' && (
          <AdminInvestors 
            selectedFund={selectedFund} 
            onSelectClient={setSelectedClient}
            onViewChange={handleViewChange}
          />
        )}

        {activeView === 'cliente' && (
          <AdminClientView 
            client={selectedClient} 
            onBack={() => setActiveView('investidores')} 
          />
        )}
      </main>
    </div>
  );
};

export default HedgeFundManager;
