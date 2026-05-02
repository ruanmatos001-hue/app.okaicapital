import React, { useState, useEffect } from 'react';
import { NavigationTab } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase, UsuarioCarteira } from '../lib/supabase';
import { calcularSaldoReal, calcularSaldoTotalUsuario, SaldoCalculado, getUsdBrlRate, toBRL } from '../lib/calcSaldo';

interface DashboardProps {
  onTabChange: (tab: NavigationTab) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onTabChange }) => {
  const { user } = useAuth();
  const [portfolios, setPortfolios] = useState<UsuarioCarteira[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [rentData, setRentData] = useState<any[]>([]);
  const [saldoData, setSaldoData] = useState<SaldoCalculado>({ saldo: 0, totalAportado: 0, totalRetirado: 0, lucroRendimentos: 0, lucroTotal: 0, percentualTotal: 0 });
  const [saldosPorCarteira, setSaldosPorCarteira] = useState<Record<string, SaldoCalculado>>({});

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (prof) setProfile(prof);

      const { data } = await supabase
        .from('usuario_carteiras')
        .select('*, carteira:carteiras (*)')
        .eq('usuario_id', user.id);
      if (data) {
        setPortfolios(data as UsuarioCarteira[]);

        // Calcular saldo real por carteira (transações + rentabilidade)
        const total = await calcularSaldoTotalUsuario(user.id, data);
        setSaldoData(total);

        const byCarteira: Record<string, SaldoCalculado> = {};
        for (const uc of data) {
          byCarteira[uc.id] = await calcularSaldoReal(user.id, uc.carteira_id);
        }
        setSaldosPorCarteira(byCarteira);
      }

      const { data: rent } = await supabase
        .from('rentabilidade_usuario_mensal')
        .select('*')
        .eq('usuario_id', user.id)
        .eq('status', 'ativo')
        .order('ano', { ascending: true })
        .order('mes', { ascending: true });
      if (rent) setRentData(rent);

      setLoading(false);
    };
    load();
  }, [user]);

  // Estimated yield bonus (progressive interpolation)
  const calcBonus = () => {
    let bonus = 0;
    portfolios.forEach((p: any) => {
      if (p.rendimento_estimado_ativo && p.rendimento_estimado_data_inicio && p.rendimento_estimado_data_fim) {
        const ini = new Date(p.rendimento_estimado_data_inicio + 'T00:00:00').getTime();
        const fim = new Date(p.rendimento_estimado_data_fim + 'T23:59:59').getTime();
        const now = Date.now();
        if (now >= ini && now <= fim) {
          bonus += (p.rendimento_estimado_valor || 0) * Math.min((now - ini) / (fim - ini), 1);
        } else if (now > fim) bonus += (p.rendimento_estimado_valor || 0);
      }
    });
    return bonus;
  };

  const bonus = calcBonus();
  const saldo = saldoData.saldo + bonus;
  const aportado = saldoData.totalAportado;
  const retirado = saldoData.totalRetirado;
  const lucro = saldoData.lucroTotal;
  const percTotal = saldoData.percentualTotal;

  // Monthly perf — if rendimento_percentual is 0, calculate from saldo_inicio/saldo_fim
  const calcRendPerc = (r: any) => {
    if (r.rendimento_percentual && r.rendimento_percentual !== 0) return r.rendimento_percentual;
    if (r.saldo_inicio && r.saldo_inicio > 0) return ((r.saldo_fim - r.saldo_inicio) / r.saldo_inicio) * 100;
    return 0;
  };

  const now = new Date();
  const thisMonth = rentData.filter(r => r.ano === now.getFullYear() && r.mes === now.getMonth() + 1);
  const percMes = thisMonth.reduce((a, r) => a + calcRendPerc(r), 0);

  // Chart data (last 8 months)
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const grouped: Record<string, { label: string; value: number; perc: number }> = {};
  rentData.forEach(r => {
    const key = `${r.ano}-${r.mes}`;
    if (!grouped[key]) grouped[key] = { label: months[(r.mes || 1) - 1], value: 0, perc: 0 };
    grouped[key].value += r.saldo_fim || 0;
    grouped[key].perc += calcRendPerc(r);
  });
  const chartBars = Object.values(grouped).slice(-8);
  const maxChart = Math.max(...chartBars.map(b => b.value), 1);

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const firstName = profile?.nome?.split(' ')[0] || 'Investidor';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-zinc-500 text-xs tracking-wider uppercase">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[520px] mx-auto pb-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-zinc-500 text-xs">Olá,</p>
          <h1 className="text-white text-lg font-semibold">{firstName}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onTabChange('marketplace')}
            className="bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold px-4 py-2 rounded-full transition-colors"
          >
            + Novo Aporte
          </button>
          <div
            onClick={() => onTabChange('profile')}
            className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-emerald-400 font-semibold cursor-pointer text-sm"
          >
            {firstName.charAt(0)}
          </div>
        </div>
      </div>

      {/* Saldo Card */}
      <div className="bg-zinc-900 rounded-2xl p-6 mb-4">
        <p className="text-zinc-500 text-xs mb-1">Saldo total investido</p>
        <h2 className="text-white text-3xl font-bold tracking-tight mb-1">{fmt(saldo)}</h2>
        <div className="flex items-center gap-1">
          <span className={`text-sm font-medium ${lucro >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {lucro >= 0 ? '↑' : '↓'} {fmt(Math.abs(lucro))}
          </span>
          <span className="text-zinc-600 text-xs">lucro acumulado</span>
        </div>
        {bonus > 0 && (
          <p className="text-emerald-500/60 text-[10px] mt-2">● Rendimento estimado em progresso</p>
        )}
      </div>

      {/* Rentabilidade Pills */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-zinc-900 rounded-xl p-4 text-center">
          <p className="text-zinc-500 text-[10px] mb-1">Hoje</p>
          <p className={`text-base font-bold ${percTotal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {percTotal >= 0 ? '+' : ''}{(percTotal / 30).toFixed(2)}%
          </p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 text-center">
          <p className="text-zinc-500 text-[10px] mb-1">No mês</p>
          <p className={`text-base font-bold ${percMes >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {percMes >= 0 ? '+' : ''}{percMes.toFixed(2)}%
          </p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 text-center">
          <p className="text-zinc-500 text-[10px] mb-1">Total</p>
          <p className={`text-base font-bold ${percTotal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {percTotal >= 0 ? '+' : ''}{percTotal.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Resumo */}
      <div className="bg-zinc-900 rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between py-2">
          <span className="text-zinc-500 text-xs">Total investido</span>
          <span className="text-white text-sm font-medium">{fmt(aportado)}</span>
        </div>
        <div className="h-px bg-zinc-800 my-1" />
        <div className="flex items-center justify-between py-2">
          <span className="text-zinc-500 text-xs">Lucro acumulado</span>
          <span className={`text-sm font-medium ${lucro >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {lucro >= 0 ? '+' : ''}{fmt(lucro)}
          </span>
        </div>
        {retirado > 0 && (
          <>
            <div className="h-px bg-zinc-800 my-1" />
            <div className="flex items-center justify-between py-2">
              <span className="text-zinc-500 text-xs">Total retirado</span>
              <span className="text-red-400 text-sm font-medium">{fmt(retirado)}</span>
            </div>
          </>
        )}
      </div>

      {/* Fundos Investidos */}
      <div className="mb-4">
        <p className="text-zinc-500 text-xs mb-3 px-1">Fundos investidos ({portfolios.length})</p>
        {portfolios.length === 0 ? (
          <div className="bg-zinc-900 rounded-2xl p-6 text-center">
            <p className="text-zinc-600 text-xs mb-3">Você ainda não possui posições</p>
            <button onClick={() => onTabChange('marketplace')} className="text-emerald-400 text-xs font-medium hover:underline">
              Descobrir fundos →
            </button>
          </div>
        ) : portfolios.map(p => {
          const cs = saldosPorCarteira[p.id];
          const pSaldo = cs?.saldo || 0;
          const pPerc = cs?.percentualTotal || 0;
          return (
            <div key={p.id} className="bg-zinc-900 rounded-2xl p-4 mb-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-xs font-bold">
                  {(p.carteira?.nome || 'F').charAt(0)}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{p.carteira?.nome || 'Fundo'}</p>
                  <p className="text-zinc-600 text-[10px] uppercase tracking-wider">{p.carteira?.tipo || '—'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white text-sm font-medium">{fmt(pSaldo)}</p>
                <p className={`text-xs ${pPerc >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {pPerc >= 0 ? '+' : ''}{pPerc.toFixed(2)}%
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Evolução mensal em barras */}
      {chartBars.length > 0 && (
        <div className="bg-zinc-900 rounded-2xl p-5">
          <p className="text-zinc-500 text-xs mb-4">Evolução mensal</p>
          <div className="flex items-end gap-2" style={{ height: 120 }}>
            {chartBars.map((bar, i) => {
              const h = Math.max(8, (bar.value / maxChart) * 100);
              const isLast = i === chartBars.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className={`text-[9px] font-medium ${bar.perc >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {bar.perc >= 0 ? '+' : ''}{bar.perc.toFixed(1)}%
                  </span>
                  <div
                    className="w-full rounded-t-md transition-all duration-700"
                    style={{
                      height: `${h}%`,
                      background: isLast
                        ? 'linear-gradient(to top, #10b981, #34d399)'
                        : bar.perc >= 0
                          ? 'rgba(16,185,129,0.2)'
                          : 'rgba(239,68,68,0.2)',
                    }}
                  />
                  <span className={`text-[9px] ${isLast ? 'text-emerald-400 font-medium' : 'text-zinc-600'}`}>
                    {bar.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
