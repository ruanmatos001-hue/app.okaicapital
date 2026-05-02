import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { calcularSaldoReal, SaldoCalculado } from '../../lib/calcSaldo';

interface Props {
  onViewChange: (v: string) => void;
  selectedFund: string;
}

const AdminOverview: React.FC<Props> = ({ onViewChange, selectedFund }) => {
  const [clients, setClients] = useState<any[]>([]);
  const [perfData, setPerfData] = useState<any[]>([]);
  const [saldosCalc, setSaldosCalc] = useState<Record<string, SaldoCalculado>>({});
  const [totals, setTotals] = useState<SaldoCalculado>({ saldo: 0, totalAportado: 0, totalRetirado: 0, lucroRendimentos: 0, lucroTotal: 0, percentualTotal: 0 });
  const [totalAtivos, setTotalAtivos] = useState(0);
  const [ativosCount, setAtivosCount] = useState(0);

  useEffect(() => { loadData(); }, [selectedFund]);

  const loadData = async () => {
    const { data: carteira } = await supabase.from('carteiras').select('id').eq('tipo', selectedFund).single();
    if (!carteira) return;

    const { data: uc } = await supabase.from('usuario_carteiras').select('*, profiles!inner(nome)').eq('carteira_id', carteira.id);
    if (uc) {
      setClients(uc);
      const calc: Record<string, SaldoCalculado> = {};
      const merged: SaldoCalculado = { saldo: 0, totalAportado: 0, totalRetirado: 0, lucroRendimentos: 0, lucroTotal: 0, percentualTotal: 0 };
      for (const c of uc) {
        calc[c.id] = await calcularSaldoReal(c.usuario_id, c.carteira_id);
        merged.saldo += calc[c.id].saldo;
        merged.totalAportado += calc[c.id].totalAportado;
        merged.totalRetirado += calc[c.id].totalRetirado;
        merged.lucroRendimentos += calc[c.id].lucroRendimentos;
        merged.lucroTotal += calc[c.id].lucroTotal;
      }
      merged.percentualTotal = merged.totalAportado > 0 ? (merged.lucroTotal / merged.totalAportado) * 100 : 0;
      setSaldosCalc(calc);
      setTotals(merged);
    }

    const { data: ativos } = await supabase.from('ativos').select('valor_atual').eq('carteira_id', carteira.id).eq('status', 'ativo');
    if (ativos) {
      setTotalAtivos(ativos.reduce((s: number, a: any) => s + (a.valor_atual || 0), 0));
      setAtivosCount(ativos.length);
    }

    const { data: rent } = await supabase.from('rentabilidade_usuario_mensal').select('*').eq('carteira_id', carteira.id).eq('status', 'ativo').order('ano').order('mes');
    if (rent) setPerfData(rent);
  };

  const totalPatrimonio = totals.saldo;
  const lucroTotal = totals.lucroTotal;
  const percTotal = totals.percentualTotal;
  const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  const grouped: Record<string, { mes: number; ano: number; rendimento_valor: number; perc: number }> = {};
  perfData.forEach(r => {
    const key = `${r.ano}-${r.mes}`;
    if (!grouped[key]) grouped[key] = { mes: r.mes, ano: r.ano, rendimento_valor: 0, perc: 0 };
    grouped[key].rendimento_valor += r.rendimento_valor || 0;
    const rp = (r.rendimento_percentual && r.rendimento_percentual !== 0) ? r.rendimento_percentual : (r.saldo_inicio > 0 ? ((r.saldo_fim - r.saldo_inicio) / r.saldo_inicio) * 100 : 0);
    grouped[key].perc += rp;
  });
  const last6 = Object.values(grouped).slice(-6);
  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const diff = totalPatrimonio - totalAtivos;
  const diffPerc = totalPatrimonio > 0 ? ((diff / totalPatrimonio) * 100) : 0;

  return (
    <div>
      <div className="admin-topbar">
        <div>
          <h1 className="admin-page-title">Visão Geral</h1>
          <div className="admin-page-sub">Okai Capital · Fundo Privado</div>
        </div>
        <div className="admin-topbar-right">
          <button className="admin-btn">Exportar</button>
          <button className="admin-btn admin-btn-gold" onClick={() => onViewChange('cotas')}>Atualizar Cotas</button>
        </div>
      </div>

      {/* METRICS */}
      <div className="admin-metrics">
        <div className="admin-metric">
          <div className="admin-metric-label">Patrimônio Total</div>
          <div className="admin-metric-value">{fmt(totalPatrimonio)}</div>
          <div className={`admin-metric-delta ${lucroTotal >= 0 ? 'ok-up' : 'ok-down'}`}>
            {lucroTotal >= 0 ? '▲' : '▼'} {percTotal.toFixed(1)}% acumulado
          </div>
        </div>
        <div className="admin-metric">
          <div className="admin-metric-label">Investidores</div>
          <div className="admin-metric-value" style={{ fontSize: 36 }}>{clients.length}</div>
          <div className="admin-metric-delta ok-muted">ativos no fundo</div>
        </div>
        <div className="admin-metric">
          <div className="admin-metric-label">Total Aportado</div>
          <div className="admin-metric-value" style={{ fontSize: 22 }}>{fmt(totals.totalAportado)}</div>
          <div className="admin-metric-delta ok-muted">base de cálculo</div>
        </div>
        <div className="admin-metric">
          <div className="admin-metric-label">Lucro Acumulado</div>
          <div className="admin-metric-value" style={{ fontSize: 26, color: lucroTotal >= 0 ? 'var(--ok-emerald)' : 'var(--ok-red)' }}>
            {lucroTotal >= 0 ? '+' : ''}{fmt(lucroTotal)}
          </div>
          <div className="admin-metric-delta ok-muted">{percTotal >= 0 ? '+' : ''}{percTotal.toFixed(2)}%</div>
        </div>
      </div>

      {/* COMPARATIVO */}
      <div className="admin-card" style={{ marginBottom: 16 }}>
        <div className="admin-card-header">
          <div className="admin-card-title">Comparativo · Patrimônio vs Ativos do Fundo</div>
          <div className="admin-card-badge" style={{ color: Math.abs(diffPerc) < 5 ? 'var(--ok-emerald)' : '#f59e0b', borderColor: Math.abs(diffPerc) < 5 ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)' }}>
            {Math.abs(diffPerc) < 5 ? 'Alinhado' : 'Atenção'}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr', gap: 16, alignItems: 'center' }}>
          <div style={{ background: 'var(--ok-card-alt)', border: '1px solid var(--ok-border)', borderRadius: 'var(--ok-radius-sm)', padding: 20, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--ok-emerald)', borderRadius: '8px 8px 0 0' }} />
            <div style={{ fontSize: 10, color: 'var(--ok-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 10, fontWeight: 600 }}>Patrimônio Investidores</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--ok-white)' }}>{fmt(totalPatrimonio)}</div>
            <div style={{ fontSize: 11, color: 'var(--ok-muted)', marginTop: 6 }}>{clients.length} investidores · Saldo calculado</div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid var(--ok-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', background: Math.abs(diffPerc) < 5 ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)' }}>
              <span style={{ fontSize: 13, color: 'var(--ok-muted)', fontWeight: 600 }}>vs</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: diff > 0 ? '#f59e0b' : diff < 0 ? 'var(--ok-emerald)' : 'var(--ok-emerald)' }}>
              {diff > 0 ? '+' : ''}{fmt(diff)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--ok-muted)', marginTop: 2 }}>{diffPerc > 0 ? '+' : ''}{diffPerc.toFixed(1)}%</div>
          </div>

          <div style={{ background: 'var(--ok-card-alt)', border: '1px solid var(--ok-border)', borderRadius: 'var(--ok-radius-sm)', padding: 20, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: '#60a5fa', borderRadius: '8px 8px 0 0' }} />
            <div style={{ fontSize: 10, color: 'var(--ok-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 10, fontWeight: 600 }}>Valor Cotas & Ativos</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#60a5fa' }}>{fmt(totalAtivos)}</div>
            <div style={{ fontSize: 11, color: 'var(--ok-muted)', marginTop: 6 }}>{ativosCount} ativos · Valor de mercado</div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ok-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 6, fontWeight: 600 }}>
            <span>Cobertura</span>
            <span>{totalAtivos > 0 ? ((totalAtivos / (totalPatrimonio || 1)) * 100).toFixed(1) : '0'}%</span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${totalPatrimonio > 0 ? Math.min((totalAtivos / totalPatrimonio) * 100, 100) : 0}%`, height: '100%', background: 'linear-gradient(90deg, #60a5fa, var(--ok-emerald))', transition: 'width 0.8s ease' }} />
          </div>
        </div>
      </div>

      {/* INVESTORS SUMMARY */}
      <div className="admin-card" style={{ marginBottom: 16 }}>
        <div className="admin-card-header">
          <div className="admin-card-title">Investidores · Resumo</div>
          <button className="admin-btn" style={{ fontSize: 10, padding: '6px 12px' }} onClick={() => onViewChange('investidores')}>Ver todos</button>
        </div>
        {clients.length === 0 ? <div className="admin-empty">Nenhum investidor neste fundo</div> : (
          <table className="admin-table">
            <thead><tr><th>Investidor</th><th>Aportado</th><th>Saldo Atual</th><th>Lucro</th><th>Rentab.</th></tr></thead>
            <tbody>
              {clients.map(c => {
                const sc = saldosCalc[c.id];
                return (
                  <tr key={c.id}>
                    <td><span className="ok-white" style={{ fontSize: 13 }}>{c.profiles?.nome || '—'}</span></td>
                    <td className="ok-muted">{fmt(sc?.totalAportado || 0)}</td>
                    <td className="ok-white">{fmt(sc?.saldo || 0)}</td>
                    <td className={(sc?.lucroTotal || 0) >= 0 ? 'ok-up' : 'ok-down'}>{fmt(sc?.lucroTotal || 0)}</td>
                    <td className={(sc?.percentualTotal || 0) >= 0 ? 'ok-up' : 'ok-down'}>{(sc?.percentualTotal || 0) >= 0 ? '+' : ''}{(sc?.percentualTotal || 0).toFixed(2)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* PERFORMANCE */}
      {last6.length > 0 && (
        <div className="admin-card">
          <div className="admin-card-header"><div className="admin-card-title">Performance · Últimos Meses</div></div>
          <div className="admin-perf-bar-wrap">
            {last6.map((r, i) => {
              const isPos = r.rendimento_valor >= 0;
              const maxVal = Math.max(...last6.map(x => Math.abs(x.rendimento_valor || 1)));
              const h = Math.max(8, (Math.abs(r.rendimento_valor) / maxVal) * 70);
              const isLast = i === last6.length - 1;
              return (
                <div className="admin-perf-col" key={i}>
                  <div className="admin-perf-val" style={{ color: isPos ? 'var(--ok-emerald)' : 'var(--ok-red)' }}>
                    {isPos ? '+' : ''}{r.perc.toFixed(1)}%
                  </div>
                  <div className="admin-perf-bar" style={{ height: h, background: isLast ? 'rgba(16,185,129,0.5)' : isPos ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', border: isLast ? '1px solid var(--ok-emerald)' : 'none' }} />
                  <div className="admin-perf-label" style={{ color: isLast ? 'var(--ok-emerald)' : undefined }}>{monthNames[(r.mes || 1) - 1]}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOverview;
