import React from 'react';

type AdminView = 'overview' | 'ativos' | 'cotas' | 'investidores' | 'cliente';

interface Props {
  activeView: AdminView;
  onViewChange: (v: AdminView) => void;
}

const AdminSidebar: React.FC<Props> = ({ activeView, onViewChange }) => {
  const navItems: { label: string; view: AdminView }[] = [
    { label: 'Visão Geral', view: 'overview' },
    { label: 'Ativos', view: 'ativos' },
    { label: 'Atualizar Cotas', view: 'cotas' },
  ];
  const clientItems: { label: string; view: AdminView }[] = [
    { label: 'Investidores', view: 'investidores' },
    { label: 'Visão do Cliente', view: 'cliente' },
  ];

  const today = new Date().toLocaleDateString('pt-BR', { month: 'short', day: '2-digit', year: 'numeric' });

  return (
    <nav className="admin-sidebar">
      <div className="admin-logo">
        <div className="admin-logo-mark">Okai</div>
        <div className="admin-logo-sub">Capital · Admin</div>
      </div>
      <div className="admin-nav">
        <div className="admin-nav-section">Gestão</div>
        {navItems.map(item => (
          <button key={item.view} className={`admin-nav-item ${activeView === item.view ? 'active' : ''}`} onClick={() => onViewChange(item.view)}>
            <span className="admin-nav-dot" /> {item.label}
          </button>
        ))}
        <div className="admin-nav-section">Clientes</div>
        {clientItems.map(item => (
          <button key={item.view} className={`admin-nav-item ${activeView === item.view ? 'active' : ''}`} onClick={() => onViewChange(item.view)}>
            <span className="admin-nav-dot" /> {item.label}
          </button>
        ))}
      </div>
      <div className="admin-sidebar-bottom">
        <span className="admin-status-dot" />Mercado aberto
        <div style={{ marginTop: 8, fontSize: 10 }}>{today}</div>
      </div>
    </nav>
  );
};

export default AdminSidebar;
export type { AdminView };
