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

  useEffect(() => {
    loadData();
  }, [selectedFund]);

  const loadData = async () => {
    const { data: carteira } = await supabase.from('carteiras').select('id').eq('tipo', selectedFund).single();
    if (!carteira) return;

    const { data: uc } = await supabase.from('usuario_carteiras').select('*, profiles!inner(nome)').eq('carteira_id', carteira.id);
    if (uc) {
      setClients(uc);
      // Calcular saldos reais de cada investidor
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

    const { data: rent } = await supabase.from('rentabilidade_usuario_mensal').select('*').eq('carteira_id', carteira.id).eq('status', 'ativo').order('ano').order('mes');
    if (rent) setPerfData(rent);
  };

  const totalPatrimonio = totals.saldo;
  const totalInvestido = totals.totalAportado;
  const lucroTotal = totals.lucroTotal;
  const percTotal = totals.percentualTotal;

  const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  // Agrupar performance por mês e calcular % real
  const grouped: Record<string, { mes: number; ano: number; rendimento_valor: number; perc: number }> = {};
  perfData.forEach(r => {
    const key = `${r.ano}-${r.mes}`;
    if (!grouped[key]) grouped[key] = { mes: r.mes, ano: r.ano, rendimento_valor: 0, perc: 0 };
    grouped[key].rendimento_valor += r.rendimento_valor || 0;
    // Calculate % from saldo data if rendimento_percentual is zero
    const rp = (r.rendimento_percentual && r.rendimento_percentual !== 0)
      ? r.rendimento_percentual
      : (r.saldo_inicio > 0 ? ((r.saldo_fim - r.saldo_inicio) / r.saldo_inicio) * 100 : 0);
    grouped[key].perc += rp;
  });
  const last6 = Object.values(grouped).slice(-6);

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

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
          <div className="admin-metric-delta ok-muted">— ativos no fundo</div>
        </div>
        <div className="admin-metric">
          <div className="admin-metric-label">Total Aportado</div>
          <div className="admin-metric-value" style={{ fontSize: 24 }}>{fmt(totalInvestido)}</div>
          <div className="admin-metric-delta ok-muted">base de cálculo</div>
        </div>
        <div className="admin-metric">
          <div className="admin-metric-label">Lucro Acumulado</div>
          <div className="admin-metric-value" style={{ fontSize: 28, color: lucroTotal >= 0 ? 'var(--ok-green)' : 'var(--ok-red)' }}>
            {lucroTotal >= 0 ? '+' : ''}{fmt(lucroTotal)}
          </div>
          <div className="admin-metric-delta ok-muted">{percTotal >= 0 ? '+' : ''}{percTotal.toFixed(2)}%</div>
        </div>
      </div>

      {/* INVESTORS SUMMARY */}
      <div className="admin-card" style={{ marginBottom: 24 }}>
        <div className="admin-card-header">
          <div className="admin-card-title">Investidores · Resumo</div>
          <button className="admin-btn" style={{ fontSize: 9, padding: '6px 12px' }} onClick={() => onViewChange('investidores')}>Ver todos</button>
        </div>
        {clients.length === 0 ? (
          <div className="admin-empty">Nenhum investidor neste fundo</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Investidor</th>
                <th>Aportado</th>
                <th>Saldo Atual</th>
                <th>Lucro</th>
                <th>Rentab.</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => {
                const sc = saldosCalc[c.id];
                const saldo = sc?.saldo || 0;
                const aportado = sc?.totalAportado || 0;
                const lucro = sc?.lucroTotal || 0;
                const perc = sc?.percentualTotal || 0;
                return (
                  <tr key={c.id}>
                    <td><span className="ok-white" style={{ fontSize: 12 }}>{c.profiles?.nome || '—'}</span></td>
                    <td className="ok-muted">{fmt(aportado)}</td>
                    <td className="ok-white">{fmt(saldo)}</td>
                    <td className={lucro >= 0 ? 'ok-up' : 'ok-down'}>{fmt(lucro)}</td>
                    <td className={perc >= 0 ? 'ok-up' : 'ok-down'}>{perc >= 0 ? '+' : ''}{perc.toFixed(2)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* PERFORMANCE BARS */}
      {last6.length > 0 && (
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">Performance · Últimos Meses</div>
          </div>
          <div className="admin-perf-bar-wrap">
            {last6.map((r, i) => {
              const isPos = r.rendimento_valor >= 0;
              const maxVal = Math.max(...last6.map(x => Math.abs(x.rendimento_valor || 1)));
              const h = Math.max(8, (Math.abs(r.rendimento_valor) / maxVal) * 70);
              const isLast = i === last6.length - 1;
              return (
                <div className="admin-perf-col" key={i}>
                  <div className="admin-perf-val" style={{ color: isPos ? 'var(--ok-green)' : 'var(--ok-red)' }}>
                    {isPos ? '+' : ''}{r.perc.toFixed(1)}%
                  </div>
                  <div className="admin-perf-bar" style={{
                    height: h,
                    background: isLast ? 'rgba(201,168,76,0.5)' : isPos ? 'rgba(74,222,128,0.3)' : 'rgba(231,76,60,0.3)',
                    border: isLast ? '1px solid var(--ok-gold)' : 'none',
                  }} />
                  <div className="admin-perf-label" style={{ color: isLast ? 'var(--ok-gold)' : undefined }}>
                    {monthNames[(r.mes || 1) - 1]}
                  </div>
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
