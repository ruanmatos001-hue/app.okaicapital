import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { calcularSaldoReal, calcularSaldoTotalUsuario, SaldoCalculado } from '../../lib/calcSaldo';

interface Props { client: any | null; onBack: () => void; }

const AdminClientView: React.FC<Props> = ({ client, onBack }) => {
  const [rentData, setRentData] = useState<any[]>([]);
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [saldoData, setSaldoData] = useState<SaldoCalculado>({ saldo: 0, totalAportado: 0, totalRetirado: 0, lucroRendimentos: 0, lucroTotal: 0, percentualTotal: 0 });
  const [saldosPorCarteira, setSaldosPorCarteira] = useState<Record<string, SaldoCalculado>>({});

  useEffect(() => {
    if (!client) return;
    const load = async () => {
      const { data: rent } = await supabase
        .from('rentabilidade_usuario_mensal').select('*')
        .eq('usuario_id', client.usuario_id)
        .eq('status', 'ativo')
        .order('ano').order('mes');
      if (rent) setRentData(rent);

      const { data: pf } = await supabase
        .from('usuario_carteiras').select('*, carteira:carteiras (*)')
        .eq('usuario_id', client.usuario_id);
      if (pf) {
        setPortfolios(pf);
        const total = await calcularSaldoTotalUsuario(client.usuario_id, pf);
        setSaldoData(total);
        const byC: Record<string, SaldoCalculado> = {};
        for (const uc of pf) {
          byC[uc.id] = await calcularSaldoReal(client.usuario_id, uc.carteira_id);
        }
        setSaldosPorCarteira(byC);
      }
    };
    load();
  }, [client]);

  const nome = client?.profiles?.nome || 'Investidor';
  const firstName = nome.split(' ')[0];

  const saldo = saldoData.saldo;
  const investido = saldoData.totalAportado;
  const retirado = saldoData.totalRetirado;
  const lucro = saldoData.lucroTotal;
  const percTotal = saldoData.percentualTotal;

  const calcRendPerc = (r: any) => {
    if (r.rendimento_percentual && r.rendimento_percentual !== 0) return r.rendimento_percentual;
    if (r.saldo_inicio && r.saldo_inicio > 0) return ((r.saldo_fim - r.saldo_inicio) / r.saldo_inicio) * 100;
    return 0;
  };

  const now = new Date();
  const thisMonth = rentData.filter(r => r.ano === now.getFullYear() && r.mes === now.getMonth() + 1);
  const percMes = thisMonth.reduce((a: number, r: any) => a + calcRendPerc(r), 0);

  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const grouped: Record<string, { label: string; value: number; perc: number }> = {};
  rentData.forEach((r: any) => {
    const key = `${r.ano}-${r.mes}`;
    if (!grouped[key]) grouped[key] = { label: months[(r.mes || 1) - 1], value: 0, perc: 0 };
    grouped[key].value += r.saldo_fim || 0;
    grouped[key].perc += calcRendPerc(r);
  });
  const chartBars = Object.values(grouped).slice(-8);
  const maxChart = Math.max(...chartBars.map(b => b.value), 1);

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div>
      <div className="admin-topbar">
        <div>
          <h1 className="admin-page-title">Visão do Cliente</h1>
          <div className="admin-page-sub">Como {nome} visualiza o app</div>
        </div>
        <div className="admin-topbar-right">
          <button className="admin-btn" onClick={onBack}>← Voltar</button>
        </div>
      </div>

      {/* Mobile-like preview */}
      <div style={{ maxWidth: 420, margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p style={{ color: '#71717a', fontSize: 12 }}>Olá,</p>
            <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 600, margin: 0 }}>{firstName}</h2>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399', fontWeight: 600, fontSize: 14 }}>
            {firstName.charAt(0)}
          </div>
        </div>

        {/* Saldo */}
        <div style={{ background: '#18181b', borderRadius: 16, padding: '24px', marginBottom: 12 }}>
          <p style={{ color: '#71717a', fontSize: 11, marginBottom: 4 }}>Saldo total investido</p>
          <h3 style={{ color: '#fff', fontSize: 28, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.5px' }}>{fmt(saldo)}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: lucro >= 0 ? '#34d399' : '#f87171', fontSize: 13, fontWeight: 500 }}>
              {lucro >= 0 ? '↑' : '↓'} {fmt(Math.abs(lucro))}
            </span>
            <span style={{ color: '#52525b', fontSize: 11 }}>lucro acumulado</span>
          </div>
        </div>

        {/* Rentabilidade Pills */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
          {[
            { label: 'Hoje', val: (percTotal / 30) },
            { label: 'No mês', val: percMes },
            { label: 'Total', val: percTotal },
          ].map((item, i) => (
            <div key={i} style={{ background: '#18181b', borderRadius: 12, padding: '14px 8px', textAlign: 'center' }}>
              <p style={{ color: '#71717a', fontSize: 10, marginBottom: 4 }}>{item.label}</p>
              <p style={{ color: item.val >= 0 ? '#34d399' : '#f87171', fontSize: 15, fontWeight: 700 }}>
                {item.val >= 0 ? '+' : ''}{item.val.toFixed(2)}%
              </p>
            </div>
          ))}
        </div>

        {/* Resumo */}
        <div style={{ background: '#18181b', borderRadius: 16, padding: '16px 20px', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
            <span style={{ color: '#71717a', fontSize: 12 }}>Total investido</span>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{fmt(investido)}</span>
          </div>
          <div style={{ height: 1, background: '#27272a' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
            <span style={{ color: '#71717a', fontSize: 12 }}>Lucro acumulado</span>
            <span style={{ color: lucro >= 0 ? '#34d399' : '#f87171', fontSize: 13, fontWeight: 500 }}>
              {lucro >= 0 ? '+' : ''}{fmt(lucro)}
            </span>
          </div>
          {retirado > 0 && (<>
            <div style={{ height: 1, background: '#27272a' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ color: '#71717a', fontSize: 12 }}>Total retirado</span>
              <span style={{ color: '#f87171', fontSize: 13, fontWeight: 500 }}>{fmt(retirado)}</span>
            </div>
          </>)}
        </div>

        {/* Fundos */}
        <p style={{ color: '#71717a', fontSize: 11, marginBottom: 8, paddingLeft: 4 }}>Fundos investidos ({portfolios.length})</p>
        {portfolios.map((p: any) => {
          const cs = saldosPorCarteira[p.id];
          const pSaldo = cs?.saldo || 0;
          const pp = cs?.percentualTotal || 0;
          return (
            <div key={p.id} style={{ background: '#18181b', borderRadius: 16, padding: '14px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399', fontSize: 12, fontWeight: 700 }}>
                  {(p.carteira?.nome || 'F').charAt(0)}
                </div>
                <div>
                  <p style={{ color: '#fff', fontSize: 13, fontWeight: 500, margin: 0 }}>{p.carteira?.nome || 'Fundo'}</p>
                  <p style={{ color: '#52525b', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>{p.carteira?.tipo || '—'}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#fff', fontSize: 13, fontWeight: 500, margin: 0 }}>{fmt(pSaldo)}</p>
                <p style={{ color: pp >= 0 ? '#34d399' : '#f87171', fontSize: 11, margin: 0 }}>{pp >= 0 ? '+' : ''}{pp.toFixed(2)}%</p>
              </div>
            </div>
          );
        })}

        {/* Evolução em barras */}
        {chartBars.length > 0 && (
          <div style={{ background: '#18181b', borderRadius: 16, padding: 20, marginTop: 12 }}>
            <p style={{ color: '#71717a', fontSize: 11, marginBottom: 16 }}>Evolução mensal</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
              {chartBars.map((bar, i) => {
                const h = Math.max(8, (bar.value / maxChart) * 100);
                const isLast = i === chartBars.length - 1;
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 9, fontWeight: 500, color: bar.perc >= 0 ? '#34d399' : '#f87171' }}>
                      {bar.perc >= 0 ? '+' : ''}{bar.perc.toFixed(1)}%
                    </span>
                    <div style={{
                      width: '100%', borderRadius: '4px 4px 0 0',
                      height: `${h}%`,
                      background: isLast ? 'linear-gradient(to top, #10b981, #34d399)' : bar.perc >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                      transition: 'height 0.7s ease',
                    }} />
                    <span style={{ fontSize: 9, color: isLast ? '#34d399' : '#52525b', fontWeight: isLast ? 500 : 400 }}>
                      {bar.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminClientView;
