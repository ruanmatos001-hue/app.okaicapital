import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { NavigationTab } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase, UsuarioCarteira } from '../lib/supabase';

const MOCK_CHART_DATA = [
  { name: 'JAN', value: 0 },
  { name: 'FEV', value: 0 },
  { name: 'MAR', value: 0 },
  { name: 'ABR', value: 0 },
  { name: 'MAI', value: 0 },
  { name: 'JUN', value: 0 },
];

interface DashboardProps {
  onTabChange: (tab: NavigationTab) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onTabChange }) => {
  const { user } = useAuth();
  const [portfolios, setPortfolios] = useState<UsuarioCarteira[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>(MOCK_CHART_DATA);

  useEffect(() => {
    const carregarDados = async () => {
      if (!user) return;
      setLoading(true);
      // Busca dados reais do banco
      const { data, error } = await supabase
        .from('usuario_carteiras')
        .select(`
          *,
          carteira:carteiras (*)
        `)
        .eq('usuario_id', user.id);

      if (!error && data) {
        setPortfolios(data as UsuarioCarteira[]);
      }

      // Buscar gráfico dinâmico
      const { data: rentData } = await supabase
        .from('rentabilidade_usuario_mensal')
        .select('*')
        .eq('usuario_id', user.id)
        .order('ano', { ascending: true })
        .order('mes', { ascending: true });

      if (rentData && rentData.length > 0) {
        const monthNames = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
        const grouped = {};
        rentData.forEach(r => {
           let key = `${r.ano}-${r.mes}`;
           if(!grouped[key]) grouped[key] = { name: monthNames[r.mes - 1] + '/' + String(r.ano).slice(-2), value: 0 };
           grouped[key].value += r.saldo_fim || 0;
        });
        const dynamicChart = Object.values(grouped);
        // Only get last 8 periods
        setChartData(dynamicChart.slice(-8));
      }

      setLoading(false);
    };

    carregarDados();
  }, [user]);

  const saldoTotal = portfolios.reduce((acc, curr) => acc + (curr.saldo_atual || 0), 0);
  const aportadoTotal = portfolios.reduce((acc, curr) => acc + (curr.total_investido || 0), 0);
  const retiradoTotal = portfolios.reduce((acc, curr) => acc + (curr.total_retirado || 0), 0);
  const lucroAcumulado = saldoTotal - aportadoTotal + retiradoTotal;
  const percentualMedio = aportadoTotal > 0 
    ? (lucroAcumulado / aportadoTotal) * 100 
    : portfolios.reduce((acc, curr) => acc + (curr.percentual_rendimento || 0), 0) / (portfolios.length || 1);

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <span className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase block mb-2">Visão Geral do Patrimônio</span>
          <h1 className="text-3xl font-black text-white">Minha Carteira</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => onTabChange('marketplace')} className="bg-primary hover:bg-emerald-400 text-[#0a0f0e] text-[10px] font-bold uppercase tracking-widest px-6 py-3 transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">add</span> Novo Aporte
          </button>
          <button className="bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest px-6 py-3 transition-colors flex items-center gap-2">
            Retirar
          </button>
        </div>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MAIN BALANCE */}
        <div className="lg:col-span-2 bg-[#0a0f0e] border border-white/5 p-8 lg:p-10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/4"></div>
          
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-2 block">Saldo Bruto Atual (BRL)</span>
          <h2 className="text-5xl lg:text-6xl font-black text-white mb-6 align-bottom">
            {formatMoney(saldoTotal).replace('R$', '').trim()} <span className="text-xl text-slate-500 font-light ml-1">BRL</span>
          </h2>

          <div className="flex flex-wrap gap-6 border-t border-white/5 pt-6 mt-6">
            <div>
              <span className="text-slate-500 text-[9px] font-bold uppercase tracking-[0.2em] mb-1 block">Rentabilidade Acumulada (Monetária)</span>
              <span className={`text-xl font-bold ${lucroAcumulado >= 0 ? 'text-primary' : 'text-rose-500'}`}>
                {lucroAcumulado >= 0 ? '+' : ''}{formatMoney(lucroAcumulado)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[9px] font-bold uppercase tracking-[0.2em] mb-1 block">Rentabilidade Acumulada (%)</span>
              <div className="flex items-baseline gap-2">
                  <span className={`text-xl font-bold ${lucroAcumulado >= 0 ? 'text-primary' : 'text-rose-500'}`}>
                    {lucroAcumulado >= 0 ? '+' : ''}{aportadoTotal > 0 ? ((lucroAcumulado / aportadoTotal) * 100).toFixed(2) : '0.00'}%
                  </span>
              </div>
            </div>
          </div>
        </div>

        {/* QUICK INSIGHTS */}
        <div className="flex flex-col gap-6">
          <div className="flex-1 bg-[#050807] border border-white/5 p-6 flex flex-col justify-center">
            <span className="text-slate-500 text-[9px] font-bold uppercase tracking-[0.2em] mb-2 block">Cotas Integralizadas</span>
            <span className="text-3xl font-black text-white">{portfolios.length}</span>
            <span className="text-slate-600 text-xs mt-1">Veículos Ativos no Portfólio</span>
          </div>
          <div className="flex-1 bg-[#050807] border border-white/5 p-6 flex flex-col justify-center relative overflow-hidden">
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-10 mix-blend-overlay"></div>
             <div className="relative z-10">
               <span className="material-symbols-outlined text-primary mb-2 text-2xl">security</span>
               <p className="text-white text-sm font-bold w-3/4">Estratégias protegidas contra risco cambial e creditício.</p>
             </div>
          </div>
        </div>
      </section>

      {/* POSIÇÕES E GRÁFICO */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CHART SECTION */}
        <div className="lg:col-span-2 bg-[#0a0f0e] border border-white/5 p-8 relative">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-white text-sm font-black uppercase tracking-widest">Evolução do Fundo</h3>
            <div className="flex bg-[#050807] border border-white/10 p-1">
              {['1M', '3M', '6M', 'YTD', 'ALL'].map(t => (
                <button key={t} className={`px-4 py-1 text-[10px] font-bold transition-all ${t === 'ALL' ? 'bg-primary text-[#0a0f0e]' : 'text-slate-500 hover:text-white'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00c795" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00c795" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 700}} dy={10} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#050807', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold' }}
                  itemStyle={{ color: '#00c795' }}
                />
                <Area type="monotone" dataKey="value" stroke="#00c795" strokeWidth={2} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* COMPOSIÇÃO DA CARTEIRA */}
        <div className="bg-[#050807] border border-white/5 p-8 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-white text-sm font-black uppercase tracking-widest">Composição</h3>
            <button onClick={() => onTabChange('marketplace')} className="text-primary text-[10px] font-bold uppercase tracking-widest hover:underline">Alocar</button>
          </div>

          <div className="space-y-4 flex-grow overflow-y-auto pr-2">
            {loading ? (
              <div className="text-slate-500 text-xs text-center py-10 uppercase tracking-widest animate-pulse">Sincronizando custódia...</div>
            ) : portfolios.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 border border-dashed border-white/10 text-center">
                <span className="material-symbols-outlined text-slate-600 text-3xl mb-2">account_balance</span>
                <p className="text-slate-400 text-sm mb-4">Você ainda não possui cotas integralizadas.</p>
                <button onClick={() => onTabChange('marketplace')} className="text-primary text-xs font-bold uppercase tracking-widest">
                  Descobrir Teses
                </button>
              </div>
            ) : (
              portfolios.map(p => (
                <div key={p.id} className="flex justify-between items-center p-4 bg-[#0a0f0e] border border-white/5 hover:border-primary/30 transition-colors">
                  <div>
                    <h4 className="text-white font-bold text-sm">{p.carteira?.nome || 'Fundo Registrado'}</h4>
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{p.carteira?.tipo || 'Classificado'}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-sm">{formatMoney(p.saldo_atual || 0)}</p>
                    <p className={`text-[10px] font-black tracking-widest ${(((p.saldo_atual || 0) - (p.total_investido || 0)) >= 0) ? 'text-primary' : 'text-rose-500'}`}>
                      {(((p.saldo_atual || 0) - (p.total_investido || 0)) >= 0) ? '+' : ''}{(p.total_investido && p.total_investido > 0 ? ((((p.saldo_atual || 0) - p.total_investido) / p.total_investido) * 100).toFixed(2) : (p.percentual_rendimento || 0).toFixed(2))}%
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <button className="w-full text-center mt-6 py-4 border border-white/10 text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] hover:text-white hover:bg-white/5 transition-all">
            Emitir Extrato
          </button>
        </div>
      </section>
      
    </div>
  );
};

export default Dashboard;
