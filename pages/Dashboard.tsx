import React, { useState, useEffect } from 'react';
import { NavigationTab } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase, UsuarioCarteira } from '../lib/supabase';
import { calcularSaldoReal, calcularSaldoTotalUsuario, SaldoCalculado, getUsdBrlRate, toBRL } from '../lib/calcSaldo';

interface DashboardProps {
  onTabChange: (tab: NavigationTab) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onTabChange }) => {
  const { user, profile } = useAuth();
  const [portfolios, setPortfolios] = useState<UsuarioCarteira[]>([]);
  const [loading, setLoading] = useState(true);
  const [rentData, setRentData] = useState<any[]>([]);
  const [saldoData, setSaldoData] = useState<SaldoCalculado>({ saldo: 0, totalAportado: 0, totalRetirado: 0, lucroRendimentos: 0, lucroTotal: 0, percentualTotal: 0 });
  const [saldosPorCarteira, setSaldosPorCarteira] = useState<Record<string, SaldoCalculado>>({});
  const [estimatedResult, setEstimatedResult] = useState<{ valor: number; percentual: number; dataInicio?: string; dataFim?: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);

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

        // Fetch estimated result from usuario_carteiras rendimento_estimado
        let estTotal = 0;
        let hasEst = false;
        let estDi = '';
        let estDf = '';
        data.forEach((p: any) => {
          if (p.rendimento_estimado_ativo && p.rendimento_estimado_valor) {
            estTotal += p.rendimento_estimado_valor;
            hasEst = true;
            if (p.rendimento_estimado_data_inicio) estDi = p.rendimento_estimado_data_inicio;
            if (p.rendimento_estimado_data_fim) estDf = p.rendimento_estimado_data_fim;
          }
        });
        if (hasEst && total.totalAportado > 0) {
          setEstimatedResult({ valor: estTotal, percentual: (estTotal / total.totalAportado) * 100, dataInicio: estDi, dataFim: estDf });
        }
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

  // Chart data (last 8 months) — ONLY % 
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const grouped: Record<string, { label: string; perc: number }> = {};
  rentData.forEach(r => {
    const key = `${r.ano}-${r.mes}`;
    if (!grouped[key]) grouped[key] = { label: months[(r.mes || 1) - 1], perc: 0 };
    grouped[key].perc += calcRendPerc(r);
  });
  const chartBars = Object.values(grouped).slice(-8);
  const maxPerc = Math.max(...chartBars.map(b => Math.abs(b.perc)), 0.1);

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const firstName = profile?.nome?.split(' ')[0] || 'Investidor';

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '2px solid #10b981', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#71717a', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', paddingBottom: 32 }}>

      {/* Sub-Header com saudação + ação */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div>
            <p style={{ color: '#71717a', fontSize: 11, margin: 0 }}>Olá,</p>
            <h1 style={{ color: '#fff', fontSize: 18, fontWeight: 600, margin: 0 }}>{firstName}</h1>
          </div>
          {/* Pulsing Market Active Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 20, padding: '4px 10px' }}>
            <span className="market-pulse-dot" />
            <span style={{ fontSize: 9, color: '#10b981', letterSpacing: '0.05em', textTransform: 'uppercase' as const, fontWeight: 600 }}>Operando</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => onTabChange('marketplace')}
            style={{ background: '#10b981', color: '#000', fontSize: 11, fontWeight: 700, padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            + Novo Aporte
          </button>
          <div
            onClick={() => onTabChange('profile')}
            style={{ width: 36, height: 36, borderRadius: '50%', background: '#18181b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontWeight: 600, cursor: 'pointer', fontSize: 14, border: '1px solid rgba(16,185,129,0.2)' }}
          >
            {firstName.charAt(0)}
          </div>
        </div>
      </div>

      {/* Saldo Card */}
      <div style={{ background: '#18181b', borderRadius: 16, padding: '24px 24px 20px', marginBottom: 12, border: '1px solid rgba(255,255,255,0.04)' }}>
        <p style={{ color: '#71717a', fontSize: 11, margin: '0 0 4px' }}>Saldo total investido</p>
        <h2 style={{ color: '#fff', fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 4px' }}>{fmt(saldo)}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: lucro >= 0 ? '#10b981' : '#ef4444' }}>
            {lucro >= 0 ? '↑' : '↓'} {fmt(Math.abs(lucro))}
          </span>
          <span style={{ color: '#52525b', fontSize: 11 }}>lucro acumulado</span>
        </div>
        {bonus > 0 && (
          <p style={{ color: 'rgba(16,185,129,0.5)', fontSize: 10, marginTop: 8 }}>● Rendimento estimado em progresso</p>
        )}
      </div>

      {/* Rentabilidade Pills */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div style={{ background: '#18181b', borderRadius: 12, padding: '14px 8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.04)' }}>
          <p style={{ color: '#71717a', fontSize: 10, margin: '0 0 4px' }}>Hoje</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: percTotal >= 0 ? '#10b981' : '#ef4444', margin: 0 }}>
            {percTotal >= 0 ? '+' : ''}{(percTotal / 30).toFixed(2)}%
          </p>
        </div>
        <div style={{ background: '#18181b', borderRadius: 12, padding: '14px 8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.04)' }}>
          <p style={{ color: '#71717a', fontSize: 10, margin: '0 0 4px' }}>No mês</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: percMes >= 0 ? '#10b981' : '#ef4444', margin: 0 }}>
            {percMes >= 0 ? '+' : ''}{percMes.toFixed(2)}%
          </p>
        </div>
        <div style={{ background: '#18181b', borderRadius: 12, padding: '14px 8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.04)' }}>
          <p style={{ color: '#71717a', fontSize: 10, margin: '0 0 4px' }}>Total</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: percTotal >= 0 ? '#10b981' : '#ef4444', margin: 0 }}>
            {percTotal >= 0 ? '+' : ''}{percTotal.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Resultado Estimado (visible to client) */}
      {estimatedResult && (
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02))', 
          borderRadius: 14, 
          padding: '16px 20px', 
          marginBottom: 12, 
          border: '1px solid rgba(16,185,129,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <p style={{ color: '#71717a', fontSize: 10, margin: '0 0 4px', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>Resultado Estimado do Mês</p>
            <p style={{ color: '#10b981', fontSize: 11, margin: 0 }}>
              {estimatedResult.dataInicio && estimatedResult.dataFim
                ? `${new Date(estimatedResult.dataInicio + 'T12:00:00').toLocaleDateString('pt-BR')} → ${new Date(estimatedResult.dataFim + 'T12:00:00').toLocaleDateString('pt-BR')}`
                : 'Projeção baseada na operação atual do fundo'}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#10b981', fontSize: 18, fontWeight: 700, margin: '0 0 2px' }}>{fmt(estimatedResult.valor)}</p>
            <p style={{ color: '#10b981', fontSize: 11, margin: 0, opacity: 0.7 }}>≈ {estimatedResult.percentual.toFixed(1)}%</p>
          </div>
        </div>
      )}

      {/* Resumo */}
      <div style={{ background: '#18181b', borderRadius: 16, padding: 20, marginBottom: 12, border: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
          <span style={{ color: '#71717a', fontSize: 12 }}>Total investido</span>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{fmt(aportado)}</span>
        </div>
        <div style={{ height: 1, background: '#27272a', margin: '4px 0' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
          <span style={{ color: '#71717a', fontSize: 12 }}>Lucro acumulado</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: lucro >= 0 ? '#10b981' : '#ef4444' }}>
            {lucro >= 0 ? '+' : ''}{fmt(lucro)}
          </span>
        </div>
        {retirado > 0 && (
          <>
            <div style={{ height: 1, background: '#27272a', margin: '4px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ color: '#71717a', fontSize: 12 }}>Total retirado</span>
              <span style={{ color: '#ef4444', fontSize: 13, fontWeight: 500 }}>{fmt(retirado)}</span>
            </div>
          </>
        )}
      </div>

      {/* Fundos Investidos */}
      <div style={{ marginBottom: 12 }}>
        <p style={{ color: '#71717a', fontSize: 11, marginBottom: 10, paddingLeft: 4 }}>Fundos investidos ({portfolios.length})</p>
        {portfolios.length === 0 ? (
          <div style={{ background: '#18181b', borderRadius: 16, padding: 24, textAlign: 'center', border: '1px solid rgba(255,255,255,0.04)' }}>
            <p style={{ color: '#52525b', fontSize: 12, marginBottom: 10 }}>Você ainda não possui posições</p>
            <button onClick={() => onTabChange('marketplace')} style={{ color: '#10b981', fontSize: 12, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>
              Descobrir fundos →
            </button>
          </div>
        ) : portfolios.map(p => {
          const cs = saldosPorCarteira[p.id];
          const pSaldo = cs?.saldo || 0;
          const pPerc = cs?.percentualTotal || 0;
          return (
            <div key={p.id} style={{ background: '#18181b', borderRadius: 16, padding: '14px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontSize: 12, fontWeight: 700 }}>
                  {(p.carteira?.nome || 'F').charAt(0)}
                </div>
                <div>
                  <p style={{ color: '#fff', fontSize: 13, fontWeight: 500, margin: 0 }}>{p.carteira?.nome || 'Fundo'}</p>
                  <p style={{ color: '#52525b', fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: 0 }}>{p.carteira?.tipo || '—'}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#fff', fontSize: 13, fontWeight: 500, margin: 0 }}>{fmt(pSaldo)}</p>
                <p style={{ fontSize: 11, color: pPerc >= 0 ? '#10b981' : '#ef4444', margin: 0 }}>
                  {pPerc >= 0 ? '+' : ''}{pPerc.toFixed(2)}%
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Evolução mensal em barras — ONLY % */}
      {chartBars.length > 0 && (
        <div style={{ background: '#18181b', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.04)' }}>
          <p style={{ color: '#71717a', fontSize: 11, marginBottom: 16 }}>Evolução mensal (%)</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140 }}>
            {chartBars.map((bar, i) => {
              const h = Math.max(12, (Math.abs(bar.perc) / maxPerc) * 100);
              const isLast = i === chartBars.length - 1;
              const isPos = bar.perc >= 0;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 9, fontWeight: 600, color: isPos ? '#10b981' : '#ef4444' }}>
                    {isPos ? '+' : ''}{bar.perc.toFixed(1)}%
                  </span>
                  <div
                    style={{
                      width: '100%',
                      borderRadius: '4px 4px 2px 2px',
                      height: `${h}%`,
                      minHeight: 8,
                      background: isLast
                        ? 'linear-gradient(to top, #10b981, #34d399)'
                        : isPos
                          ? 'rgba(16,185,129,0.25)'
                          : 'rgba(239,68,68,0.25)',
                      transition: 'height 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: isLast ? '0 0 12px rgba(16,185,129,0.3)' : 'none',
                    }}
                  />
                  <span style={{ fontSize: 9, color: isLast ? '#10b981' : '#52525b', fontWeight: isLast ? 600 : 400 }}>
                    {bar.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pulsing Dot CSS Animation */}
      <style>{`
        @keyframes marketPulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(16,185,129,0.4); }
          50% { opacity: 0.6; box-shadow: 0 0 0 4px rgba(16,185,129,0); }
        }
        .market-pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
          display: inline-block;
          animation: marketPulse 3s ease-in-out infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
