import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

interface Props { selectedFund: string; }

const CATEGORIA = (tipo: string): 'trading' | 'rv' | 'rf' | 'outro' => {
  if (['Opções', 'Forex', 'Crypto'].includes(tipo)) return 'trading';
  if (['Ações', 'ETF', 'FII', 'Internacional'].includes(tipo)) return 'rv';
  if (tipo === 'RF') return 'rf';
  return 'outro';
};

const CAT_COLOR: Record<string, string> = {
  trading: '#f59e0b',
  rv:      '#60a5fa',
  rf:      '#10b981',
  outro:   '#71717a',
};

const CAT_LABEL: Record<string, string> = {
  trading: 'Trading',
  rv:      'Renda Variável',
  rf:      'Renda Fixa',
  outro:   'Outros',
};

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const parseOpMeta = (desc: string = '') => ({
  target: desc.match(/TA:([\d.,]+)/)?.[1] ? parseFloat(desc.match(/TA:([\d.,]+)/)![1].replace(',','.')) : null,
  stop:   desc.match(/SL:([\d.,]+)/)?.[1] ? parseFloat(desc.match(/SL:([\d.,]+)/)![1].replace(',','.')) : null,
});

const AdminPainel: React.FC<Props> = ({ selectedFund }) => {
  const [ativos,   setAtivos]   = useState<any[]>([]);
  const [ops,      setOps]      = useState<any[]>([]);
  const [hist,     setHist]     = useState<any[]>([]);
  const [fundName, setFundName] = useState('');
  const [loading,  setLoading]  = useState(true);

  useEffect(() => { loadData(); }, [selectedFund]);

  const loadData = async () => {
    setLoading(true);
    const { data: c } = await supabase.from('carteiras').select('*').eq('tipo', selectedFund).single();
    if (!c) { setLoading(false); return; }
    setFundName(c.nome || selectedFund);

    const { data: a } = await supabase
      .from('ativos').select('*')
      .eq('carteira_id', c.id).eq('status', 'ativo')
      .order('percentual_carteira', { ascending: false });
    const lista = a || [];
    setAtivos(lista);

    if (lista.length > 0) {
      const ids = lista.map((x: any) => x.id);
      const [{ data: opsData }, { data: histData }] = await Promise.all([
        supabase.from('operacoes_ativos').select('*').in('ativo_id', ids).order('data_operacao', { ascending: false }).limit(20),
        supabase.from('historico_ativos_mensal').select('*').in('ativo_id', ids).order('ano', { ascending: true }).order('mes', { ascending: true }),
      ]);
      setOps(opsData || []);
      setHist(histData || []);
    }
    setLoading(false);
  };

  // ── Dados derivados ────────────────────────────────────────────
  const totalPct = ativos.reduce((s, a) => s + (a.percentual_carteira || 0), 0) || 100;

  const retornoMesPct = ativos.length > 0
    ? ativos.reduce((s, a) => s + (a.retorno_mes || 0), 0) / ativos.length
    : 0;

  // Histórico mensal consolidado (média dos % por mês)
  const monthlyChart = (() => {
    const by: Record<string, { sum: number; n: number }> = {};
    hist.forEach(h => {
      const key = `${MONTHS[(h.mes || 1) - 1]}/${String(h.ano).slice(2)}`;
      if (!by[key]) by[key] = { sum: 0, n: 0 };
      by[key].sum += (h.rendimento_percentual || 0);
      by[key].n   += 1;
    });
    return Object.entries(by).slice(-12).map(([name, { sum, n }]) => ({
      name,
      value: +(sum / n).toFixed(2),
    }));
  })();

  // Alocação por categoria (em % da carteira)
  const catAlloc = (() => {
    const by: Record<string, number> = {};
    ativos.forEach(a => {
      const cat = CATEGORIA(a.tipo);
      by[cat] = (by[cat] || 0) + (a.percentual_carteira || 0);
    });
    return Object.entries(by)
      .map(([cat, pct]) => ({ cat, label: CAT_LABEL[cat], color: CAT_COLOR[cat], pct: (pct / totalPct) * 100 }))
      .sort((a, b) => b.pct - a.pct);
  })();

  // Operações com target/stop como distância %
  const opsDisplay = ops
    .filter(op => op.valor_unitario > 0)
    .slice(0, 8)
    .map(op => {
      const { target, stop } = parseOpMeta(op.descricao || '');
      const entry = op.valor_unitario;
      const ativo = ativos.find((a: any) => a.id === op.ativo_id);
      return {
        ...op,
        ativoNome: ativo?.nome || '—',
        ativoTipo: ativo?.tipo || '',
        targetPct: target ? +((target - entry) / entry * 100).toFixed(1) : null,
        stopPct:   stop   ? +((stop   - entry) / entry * 100).toFixed(1) : null,
      };
    });

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
      <span style={{ color: 'var(--ok-muted)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Carregando painel...</span>
    </div>
  );

  return (
    <div style={{ maxWidth: 1100 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid var(--ok-border)' }}>
        <div>
          <span style={{ color: 'var(--ok-emerald)', fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, display: 'block', marginBottom: 5 }}>
            Painel de Controle · Ao Vivo
          </span>
          <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: 0 }}>{fundName}</h1>
        </div>
        <div style={{ textAlign: 'right' as const }}>
          <span style={{ fontSize: 10, color: 'var(--ok-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, display: 'block', marginBottom: 6 }}>{today}</span>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: 20 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulseDot 2s infinite' }} />
            <span style={{ fontSize: 9, color: '#10b981', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>Transmissão Ativa</span>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          {
            label: 'Retorno do Mês',
            value: `${retornoMesPct >= 0 ? '+' : ''}${retornoMesPct.toFixed(2)}%`,
            color: retornoMesPct >= 0 ? 'var(--ok-emerald)' : 'var(--ok-red)',
            icon: retornoMesPct >= 0 ? 'trending_up' : 'trending_down',
          },
          {
            label: 'Ativos em Carteira',
            value: `${ativos.length}`,
            color: '#60a5fa',
            icon: 'account_balance',
          },
          {
            label: 'Operações Monitoradas',
            value: `${ops.length}`,
            color: '#f59e0b',
            icon: 'swap_horiz',
          },
          {
            label: 'Cat. Principal',
            value: catAlloc[0]?.label || '—',
            color: catAlloc[0]?.color || 'var(--ok-muted)',
            icon: 'donut_large',
          },
        ].map((s, i) => (
          <div key={i} className="admin-card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--ok-muted)' }}>{s.label}</span>
              <span className="material-symbols-outlined" style={{ fontSize: 15, color: s.color, opacity: 0.65 }}>{s.icon}</span>
            </div>
            <span style={{ fontSize: 22, fontWeight: 800, color: s.color, letterSpacing: '-0.02em' }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14, marginBottom: 20 }}>

        {/* Performance mensal */}
        <div className="admin-card">
          <div className="admin-card-title" style={{ marginBottom: 18 }}>Performance Mensal — %</div>
          {monthlyChart.length > 0 ? (
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChart} barSize={16} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false}
                    tick={{ fill: 'var(--ok-muted)', fontSize: 10, fontWeight: 600 }} dy={8} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                    itemStyle={{ color: '#10b981', fontWeight: 700 }}
                    formatter={(v: number) => [`${v >= 0 ? '+' : ''}${v}%`, 'Retorno']}
                    labelStyle={{ color: 'var(--ok-muted)' }}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                    {monthlyChart.map((entry, i) => (
                      <Cell key={i} fill={entry.value >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'var(--ok-muted)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>Sem histórico cadastrado</span>
            </div>
          )}
        </div>

        {/* Alocação por categoria */}
        <div className="admin-card">
          <div className="admin-card-title" style={{ marginBottom: 20 }}>Alocação por Categoria</div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 18 }}>
            {catAlloc.map(c => (
              <div key={c.cat}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: c.color, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>{c.label}</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: c.color }}>{c.pct.toFixed(0)}%</span>
                </div>
                <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${c.pct}%`, background: c.color, borderRadius: 3, transition: 'width 1s ease' }} />
                </div>
              </div>
            ))}
            {catAlloc.length === 0 && (
              <span style={{ color: 'var(--ok-muted)', fontSize: 11 }}>Nenhum ativo cadastrado</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Retorno por ativo (sparkline visual) ── */}
      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div className="admin-card-title" style={{ marginBottom: 16 }}>
          Retorno Mensal por Ativo
          <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--ok-muted)', marginLeft: 8 }}>ordenado por % mês atual</span>
        </div>
        {ativos.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
            {[...ativos]
              .sort((a, b) => (b.retorno_mes || 0) - (a.retorno_mes || 0))
              .map(a => {
                const pct = a.retorno_mes || 0;
                const cat = CATEGORIA(a.tipo);
                const color = pct >= 0 ? 'var(--ok-emerald)' : 'var(--ok-red)';
                const barW = Math.min(Math.abs(pct) * 10, 100);
                return (
                  <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 64px', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                      <span style={{ width: 7, height: 7, borderRadius: 2, background: CAT_COLOR[cat], flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#d4d4d8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{a.nome}</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${barW}%`, background: color, borderRadius: 3, transition: 'width 0.8s ease' }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color, textAlign: 'right' as const }}>
                      {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                    </span>
                  </div>
                );
              })}
          </div>
        ) : (
          <span style={{ color: 'var(--ok-muted)', fontSize: 11 }}>Nenhum ativo cadastrado</span>
        )}
      </div>

      {/* ── Operações em andamento ── */}
      <div className="admin-card">
        <div className="admin-card-title" style={{ marginBottom: 16 }}>
          Operações em Andamento
          <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--ok-muted)', marginLeft: 8 }}>
            sem exposição de valores · posicionamento e alvos em %
          </span>
        </div>
        {opsDisplay.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {opsDisplay.map(op => {
              const cat   = CATEGORIA(op.ativoTipo);
              const color = CAT_COLOR[cat] || '#71717a';
              return (
                <div key={op.id} style={{
                  background: 'var(--ok-card-alt)', borderRadius: 10, padding: '14px 16px',
                  border: `1px solid rgba(255,255,255,0.06)`,
                }}>
                  {/* Ativo + categoria */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulseDot 2.5s infinite' }} />
                      <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{op.ativoNome}</span>
                    </div>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 3,
                      letterSpacing: '0.06em', textTransform: 'uppercase' as const,
                      color, background: `${color}1A`, border: `1px solid ${color}33`,
                    }}>{op.ativoTipo}</span>
                  </div>

                  {/* Tipo + target/stop */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
                    <span style={{
                      fontSize: 9, padding: '2px 8px', borderRadius: 4, fontWeight: 700,
                      letterSpacing: '0.06em', textTransform: 'uppercase' as const,
                      color: op.tipo === 'compra' ? '#10b981' : '#a1a1aa',
                      background: op.tipo === 'compra' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${op.tipo === 'compra' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`,
                    }}>{op.tipo}</span>

                    {op.targetPct !== null && (
                      <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>
                        T: {op.targetPct > 0 ? '+' : ''}{op.targetPct}%
                      </span>
                    )}
                    {op.stopPct !== null && (
                      <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 700 }}>
                        SL: {op.stopPct > 0 ? '+' : ''}{op.stopPct}%
                      </span>
                    )}
                    <span style={{ fontSize: 9, color: 'var(--ok-muted)', marginLeft: 'auto' }}>
                      {new Date(op.data_operacao).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '28px 0', textAlign: 'center' as const, color: 'var(--ok-muted)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
            Nenhuma operação registrada para este fundo
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulseDot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

export default AdminPainel;
