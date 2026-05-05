import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getUsdBrlRate, toBRL } from '../../lib/calcSaldo';

interface Props { selectedFund: string; }

const TIPOS = ['RF', 'FII', 'ETF', 'Ações', 'Opções', 'Forex', 'Crypto', 'Internacional', 'Outro'];
const PLATAFORMAS = ['XP', 'Avenue', 'Ava', 'B3', 'Binance', 'Outro'];

// ── Classificação por categoria ────────────────────────────────
const CATEGORIA = (tipo: string): 'trading' | 'rv' | 'rf' | 'outro' => {
  if (['Opções', 'Forex', 'Crypto'].includes(tipo)) return 'trading';
  if (['Ações', 'ETF', 'FII', 'Internacional'].includes(tipo)) return 'rv';
  if (tipo === 'RF') return 'rf';
  return 'outro';
};

const CAT_LABEL: Record<string, string> = {
  trading: 'Trading — Monitoramento Diário',
  rv: 'Renda Variável — Monitoramento Mensal',
  rf: 'Renda Fixa — Monitoramento Mensal',
  outro: 'Outros',
};

const CAT_COLOR: Record<string, { text: string; bg: string; border: string }> = {
  trading: { text: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
  rv:      { text: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.25)'  },
  rf:      { text: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)'  },
  outro:   { text: '#71717a', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)'  },
};

const CAT_ORDER = ['trading', 'rv', 'rf', 'outro'] as const;

// ── Target/Stop codificado no campo descricao ──────────────────
const parseOpMeta = (desc: string = '') => {
  const target = desc.match(/TA:([\d.,]+)/)?.[1] ?? null;
  const stop   = desc.match(/SL:([\d.,]+)/)?.[1] ?? null;
  const clean  = desc
    .replace(/TA:[\d.,]+\s*\|?\s*/g, '')
    .replace(/SL:[\d.,]+\s*\|?\s*/g, '')
    .trim()
    .replace(/^\|\s*/, '');
  return { target, stop, clean };
};

const AdminAtivos: React.FC<Props> = ({ selectedFund }) => {
  const [carteiraId, setCarteiraId]   = useState<string | null>(null);
  const [carteira,   setCarteira]     = useState<any>(null);
  const [ativos,     setAtivos]       = useState<any[]>([]);
  const [loading,    setLoading]      = useState(true);
  const [showAdd,    setShowAdd]      = useState(false);
  const [showEditFund, setShowEditFund] = useState(false);
  const [expanded,   setExpanded]     = useState<string | null>(null);
  const [ops,        setOps]          = useState<any[]>([]);
  const [hist,       setHist]         = useState<any[]>([]);
  const [editHistId, setEditHistId]   = useState<string | null>(null);

  // ── Novos estados ─────────────────────────────────────────────
  const [editAtivo,  setEditAtivo]    = useState<any | null>(null);
  const [allOpsMap,  setAllOpsMap]    = useState<Record<string, any[]>>({});
  const [viewFilter, setViewFilter]   = useState<'all' | 'trading' | 'rv' | 'rf'>('all');
  const [newOpTarget, setNewOpTarget] = useState('');
  const [newOpStop,   setNewOpStop]   = useState('');

  const [newAtivo, setNewAtivo] = useState({
    nome: '', ticker: '', tipo: 'RF', plataforma: 'XP',
    valor_atual: 0, percentual_carteira: 0, moeda: 'BRL',
  });
  const [newOp, setNewOp] = useState({
    tipo: 'compra', quantidade: 0, valor_unitario: 0, valor_total: 0,
    data_operacao: new Date().toISOString().split('T')[0], descricao: '',
  });
  const [newHist, setNewHist] = useState({
    ano: new Date().getFullYear(), mes: new Date().getMonth() + 1,
    valor_inicio: 0, valor_fim: 0, rendimento_valor: 0, rendimento_percentual: 0,
  });
  const [fundEdit, setFundEdit] = useState({
    nome: '', descricao: '', rentabilidade_alvo_anual: 0,
    aporte_minimo: 0, liquidez: '', imagem_url: '',
  });
  const [cotacao, setCotacao] = useState(5.0);

  useEffect(() => { getUsdBrlRate().then(setCotacao); loadAtivos(); }, [selectedFund]);

  // ── Carrega ativos + mini-ops ──────────────────────────────────
  const loadAtivos = async () => {
    setLoading(true);
    const { data: c } = await supabase.from('carteiras').select('*').eq('tipo', selectedFund).single();
    if (!c) { setLoading(false); return; }
    setCarteiraId(c.id);
    setCarteira(c);
    setFundEdit({
      nome: c.nome || '', descricao: c.descricao || '',
      rentabilidade_alvo_anual: c.rentabilidade_alvo_anual || 0,
      aporte_minimo: c.aporte_minimo || 0, liquidez: c.liquidez || '', imagem_url: c.imagem_url || '',
    });
    const { data } = await supabase
      .from('ativos').select('*')
      .eq('carteira_id', c.id).eq('status', 'ativo')
      .order('percentual_carteira', { ascending: false });
    const lista = data || [];
    setAtivos(lista);
    if (lista.length > 0) await loadAllOps(lista);
    setLoading(false);
  };

  const loadAllOps = async (ativosList: any[]) => {
    const { data } = await supabase
      .from('operacoes_ativos').select('*')
      .in('ativo_id', ativosList.map(a => a.id))
      .order('data_operacao', { ascending: false });
    const map: Record<string, any[]> = {};
    (data || []).forEach(op => {
      if (!map[op.ativo_id]) map[op.ativo_id] = [];
      if (map[op.ativo_id].length < 4) map[op.ativo_id].push(op);
    });
    setAllOpsMap(map);
  };

  // ── Salvar edição de ativo ─────────────────────────────────────
  const saveEditAtivo = async () => {
    if (!editAtivo) return;
    const { error } = await supabase.from('ativos').update({
      nome: editAtivo.nome,
      ticker: editAtivo.ticker,
      tipo: editAtivo.tipo,
      plataforma: editAtivo.plataforma,
      moeda: editAtivo.moeda,
      valor_atual: editAtivo.valor_atual,
      percentual_carteira: editAtivo.percentual_carteira,
      updated_at: new Date().toISOString(),
    }).eq('id', editAtivo.id);
    if (error) alert('Erro: ' + error.message);
    else { setEditAtivo(null); loadAtivos(); }
  };

  const addAtivo = async () => {
    if (!carteiraId || !newAtivo.nome) return;
    const { error } = await supabase.from('ativos').insert([{ ...newAtivo, carteira_id: carteiraId }]);
    if (error) alert('Erro: ' + error.message);
    else {
      setShowAdd(false);
      setNewAtivo({ nome: '', ticker: '', tipo: 'RF', plataforma: 'XP', valor_atual: 0, percentual_carteira: 0, moeda: 'BRL' });
      loadAtivos();
    }
  };

  const deleteAtivo = async (id: string) => {
    await supabase.from('ativos').update({ status: 'encerrado' }).eq('id', id);
    loadAtivos();
  };

  const expandAtivo = async (ativo: any) => {
    if (expanded === ativo.id) { setExpanded(null); return; }
    setExpanded(ativo.id);
    setEditHistId(null);
    await refreshExpandedData(ativo.id);
  };

  const refreshExpandedData = async (ativoId: string) => {
    const { data: opsData } = await supabase
      .from('operacoes_ativos').select('*').eq('ativo_id', ativoId)
      .order('data_operacao', { ascending: false });
    setOps(opsData || []);
    const { data: histData } = await supabase
      .from('historico_ativos_mensal').select('*').eq('ativo_id', ativoId)
      .order('ano', { ascending: false }).order('mes', { ascending: false });
    setHist(histData || []);
  };

  const recalcAtivoValor = async (ativoId: string) => {
    const { data: allOps } = await supabase
      .from('operacoes_ativos').select('tipo, valor_total').eq('ativo_id', ativoId);
    let total = 0;
    (allOps || []).forEach(o => {
      if (['compra', 'dividendo', 'juros'].includes(o.tipo)) total += (o.valor_total || 0);
      else if (o.tipo === 'venda') total -= (o.valor_total || 0);
    });
    const { data: lastHist } = await supabase
      .from('historico_ativos_mensal').select('valor_fim').eq('ativo_id', ativoId)
      .order('ano', { ascending: false }).order('mes', { ascending: false }).limit(1);
    const valorFinal = lastHist?.length ? lastHist[0].valor_fim : total;
    const finalVal   = (lastHist?.length && total > 0) ? Math.max(valorFinal, total) : (valorFinal || total);
    await supabase.from('ativos').update({ valor_atual: finalVal, updated_at: new Date().toISOString() }).eq('id', ativoId);
  };

  const addOp = async (ativoId: string) => {
    const total = newOp.valor_total || (newOp.quantidade * newOp.valor_unitario);
    const metaParts = [
      newOpTarget && `TA:${newOpTarget}`,
      newOpStop   && `SL:${newOpStop}`,
      newOp.descricao,
    ].filter(Boolean).join(' | ');
    const { error } = await supabase.from('operacoes_ativos').insert([{
      ...newOp,
      valor_total: total,
      ativo_id: ativoId,
      descricao: metaParts || undefined,
    }]);
    if (error) { alert('Erro: ' + error.message); return; }
    await recalcAtivoValor(ativoId);
    setNewOp({ tipo: 'compra', quantidade: 0, valor_unitario: 0, valor_total: 0, data_operacao: new Date().toISOString().split('T')[0], descricao: '' });
    setNewOpTarget('');
    setNewOpStop('');
    await refreshExpandedData(ativoId);
    loadAtivos();
  };

  const addHist = async (ativoId: string) => {
    const rv = newHist.valor_fim - newHist.valor_inicio;
    const rp = newHist.valor_inicio > 0 ? (rv / newHist.valor_inicio) * 100 : 0;
    const { error } = await supabase.from('historico_ativos_mensal')
      .insert([{ ...newHist, rendimento_valor: rv, rendimento_percentual: rp, ativo_id: ativoId }]);
    if (error) alert('Erro: ' + error.message);
    else {
      await supabase.from('ativos').update({ valor_atual: newHist.valor_fim, retorno_mes: rp, updated_at: new Date().toISOString() }).eq('id', ativoId);
      setNewHist({ ano: new Date().getFullYear(), mes: new Date().getMonth() + 1, valor_inicio: 0, valor_fim: 0, rendimento_valor: 0, rendimento_percentual: 0 });
      await refreshExpandedData(ativoId);
      loadAtivos();
    }
  };

  const updateHist = async (histItem: any) => {
    const rv = histItem.valor_fim - histItem.valor_inicio;
    const rp = histItem.valor_inicio > 0 ? (rv / histItem.valor_inicio) * 100 : 0;
    await supabase.from('historico_ativos_mensal')
      .update({ valor_inicio: histItem.valor_inicio, valor_fim: histItem.valor_fim, rendimento_valor: rv, rendimento_percentual: rp })
      .eq('id', histItem.id);
    setEditHistId(null);
    await refreshExpandedData(histItem.ativo_id);
    loadAtivos();
  };

  const deleteOp = async (id: string, ativoId: string) => {
    await supabase.from('operacoes_ativos').delete().eq('id', id);
    await recalcAtivoValor(ativoId);
    await refreshExpandedData(ativoId);
    loadAtivos();
  };

  const deleteHist = async (id: string, ativoId: string) => {
    const { error } = await supabase.from('historico_ativos_mensal').delete().eq('id', id);
    if (error) { alert('Erro ao excluir: ' + error.message); return; }
    await recalcAtivoValor(ativoId);
    await refreshExpandedData(ativoId);
    loadAtivos();
  };

  const saveFundEdit = async () => {
    if (!carteiraId) return;
    const { error } = await supabase.from('carteiras').update(fundEdit).eq('id', carteiraId);
    if (error) alert('Erro: ' + error.message);
    else { setShowEditFund(false); loadAtivos(); }
  };

  // ── Helpers de formatação ──────────────────────────────────────
  const fmt    = (v: number, moeda?: string) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: moeda === 'USD' ? 'USD' : 'BRL' }).format(v);
  const fmtBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const totalFundo = ativos.reduce((a, c) => a + toBRL(c.valor_atual || 0, c.moeda || 'BRL', cotacao), 0);
  const valorBRL   = (a: any) => toBRL(a.valor_atual || 0, a.moeda || 'BRL', cotacao);
  const months     = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  // ── Filtragem e agrupamento ────────────────────────────────────
  const filteredAtivos = viewFilter === 'all'
    ? ativos
    : ativos.filter(a => CATEGORIA(a.tipo) === viewFilter);

  const groupedAtivos = CAT_ORDER.reduce((acc, cat) => {
    const list = filteredAtivos.filter(a => CATEGORIA(a.tipo) === cat);
    if (list.length > 0) acc.push({ cat, list });
    return acc;
  }, [] as { cat: string; list: any[] }[]);

  // ── Render de uma linha de ativo + mini-ops + expandido ────────
  const renderRow = (a: any) => {
    const cat      = CATEGORIA(a.tipo);
    const cc       = CAT_COLOR[cat];
    const miniOps  = allOpsMap[a.id] || [];
    const pctReal  = totalFundo > 0 ? (valorBRL(a) / totalFundo) * 100 : 0;

    return (
      <React.Fragment key={a.id}>
        {/* ── Linha principal ── */}
        <tr>
          <td>
            <span className="ok-white" style={{ fontSize: 13, fontWeight: 500 }}>{a.nome}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
              {a.ticker && <span style={{ fontSize: 10, color: 'var(--ok-muted)' }}>{a.ticker}</span>}
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 3,
                letterSpacing: '0.05em', textTransform: 'uppercase' as const,
                color: cc.text, background: cc.bg, border: `1px solid ${cc.border}`,
              }}>{a.tipo}</span>
            </div>
          </td>
          <td>
            <span className="admin-badge" style={{
              color: a.moeda === 'USD' ? 'var(--ok-blue)' : 'var(--ok-emerald)',
              borderColor: a.moeda === 'USD' ? 'rgba(96,165,250,0.2)' : 'rgba(16,185,129,0.2)',
              background: a.moeda === 'USD' ? 'rgba(96,165,250,0.06)' : 'rgba(16,185,129,0.06)',
            }}>{a.moeda || 'BRL'}</span>
          </td>
          <td><span className="admin-asset-platform">{a.plataforma}</span></td>
          <td className="ok-white" style={{ fontWeight: 500 }}>
            {fmt(a.valor_atual || 0, a.moeda)}
            {a.moeda === 'USD' && (
              <span style={{ display: 'block', fontSize: 10, color: 'var(--ok-muted)' }}>≈ {fmtBRL(valorBRL(a))}</span>
            )}
          </td>
          <td>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 50, height: 3, background: 'rgba(255,255,255,0.04)', borderRadius: 2, position: 'relative' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(pctReal, 100)}%`, background: cc.text, borderRadius: 2 }} />
              </div>
              <span style={{ fontSize: 12 }}>{pctReal.toFixed(1)}%</span>
            </div>
          </td>
          <td className={a.retorno_mes >= 0 ? 'ok-up' : 'ok-down'}>
            {a.retorno_mes >= 0 ? '+' : ''}{(a.retorno_mes || 0).toFixed(2)}%
          </td>
          <td className="ok-muted" style={{ fontSize: 11 }}>
            {new Date(a.updated_at).toLocaleDateString('pt-BR')}
          </td>
          <td>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const }}>
              <button className="admin-btn" style={{ fontSize: 10, padding: '4px 8px' }} title="Editar ativo" onClick={() => setEditAtivo({ ...a })}>✎</button>
              <button className="admin-btn" style={{ fontSize: 10, padding: '4px 8px' }} onClick={() => expandAtivo(a)}>{expanded === a.id ? '▲' : '▼'}</button>
              <button className="admin-btn admin-btn-red" style={{ fontSize: 10, padding: '4px 8px' }} onClick={() => deleteAtivo(a.id)}>✕</button>
            </div>
          </td>
        </tr>

        {/* ── Mini ops (só aparece quando não está expandido e tem ops) ── */}
        {miniOps.length > 0 && expanded !== a.id && (
          <tr style={{ background: 'rgba(0,0,0,0.18)' }}>
            <td colSpan={8} style={{ padding: '4px 16px 8px 28px' }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, alignItems: 'center' }}>
                <span style={{ fontSize: 9, color: 'var(--ok-muted)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginRight: 2 }}>
                  ops recentes:
                </span>
                {miniOps.slice(0, 3).map(op => {
                  const { target, stop } = parseOpMeta(op.descricao || '');
                  const isCompra = op.tipo === 'compra';
                  return (
                    <div key={op.id} style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 4, padding: '3px 8px', fontSize: 10,
                    }}>
                      <span style={{ color: isCompra ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: 9, textTransform: 'uppercase' as const }}>
                        {op.tipo}
                      </span>
                      {op.quantidade > 0 && <span style={{ color: 'var(--ok-muted)' }}>{op.quantidade}x</span>}
                      {op.valor_unitario > 0 && <span className="ok-white">@ {fmt(op.valor_unitario)}</span>}
                      {target && <span style={{ color: '#f59e0b', fontSize: 9 }}>T:{target}</span>}
                      {stop   && <span style={{ color: '#ef4444',  fontSize: 9 }}>S:{stop}</span>}
                      <span style={{ color: 'var(--ok-muted)', fontSize: 9 }}>
                        {new Date(op.data_operacao).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  );
                })}
                {miniOps.length > 3 && (
                  <span style={{ fontSize: 9, color: 'var(--ok-muted)' }}>+{miniOps.length - 3} mais</span>
                )}
              </div>
            </td>
          </tr>
        )}

        {/* ── Painel expandido ── */}
        {expanded === a.id && (
          <tr><td colSpan={8} style={{ padding: 0 }}>
            <div className="admin-expanded-row" style={{ padding: 24 }}>
              <div className="admin-expanded-inner">

                {/* OPERAÇÕES */}
                <div className="admin-card-title" style={{ marginBottom: 14 }}>
                  Operações · {a.nome}
                  <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--ok-muted)', marginLeft: 8 }}>
                    Target e Stop são opcionais e ficam visíveis nas ops recentes
                  </span>
                </div>

                {/* Form de nova op */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10 }}>
                  <div className="admin-field"><label>Tipo</label>
                    <select value={newOp.tipo} onChange={e => setNewOp({ ...newOp, tipo: e.target.value })}>
                      <option value="compra">Compra</option>
                      <option value="venda">Venda</option>
                      <option value="dividendo">Dividendo</option>
                      <option value="juros">Juros</option>
                    </select>
                  </div>
                  <div className="admin-field"><label>Qtd</label>
                    <input type="number" value={newOp.quantidade} onChange={e => setNewOp({ ...newOp, quantidade: +e.target.value })} />
                  </div>
                  <div className="admin-field"><label>Preço Entrada</label>
                    <input type="number" value={newOp.valor_unitario} onChange={e => setNewOp({ ...newOp, valor_unitario: +e.target.value })} />
                  </div>
                  <div className="admin-field"><label>Vlr Total</label>
                    <input type="number" value={newOp.valor_total || newOp.quantidade * newOp.valor_unitario} onChange={e => setNewOp({ ...newOp, valor_total: +e.target.value })} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 10, marginBottom: 14, alignItems: 'flex-end' }}>
                  <div className="admin-field">
                    <label style={{ color: '#f59e0b' }}>Target (opcional)</label>
                    <input type="text" value={newOpTarget} placeholder="ex: 48.50" onChange={e => setNewOpTarget(e.target.value)} />
                  </div>
                  <div className="admin-field">
                    <label style={{ color: '#ef4444' }}>Stop (opcional)</label>
                    <input type="text" value={newOpStop} placeholder="ex: 44.00" onChange={e => setNewOpStop(e.target.value)} />
                  </div>
                  <div className="admin-field"><label>Data</label>
                    <input type="date" value={newOp.data_operacao} onChange={e => setNewOp({ ...newOp, data_operacao: e.target.value })} />
                  </div>
                  <div className="admin-field"><label>Descrição</label>
                    <input value={newOp.descricao} placeholder="Notas..." onChange={e => setNewOp({ ...newOp, descricao: e.target.value })} />
                  </div>
                  <button className="admin-btn admin-btn-gold" style={{ height: 34, padding: '0 16px', whiteSpace: 'nowrap' as const }} onClick={() => addOp(a.id)}>
                    Lançar
                  </button>
                </div>

                {/* Tabela de ops */}
                {ops.length > 0 && (
                  <table className="admin-table" style={{ marginBottom: 20 }}>
                    <thead>
                      <tr>
                        <th>Tipo</th><th>Qtd</th><th>Preço Entrada</th><th>Total</th>
                        <th style={{ color: '#f59e0b' }}>Target</th>
                        <th style={{ color: '#ef4444' }}>Stop</th>
                        <th>Data</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {ops.map(o => {
                        const { target, stop, clean } = parseOpMeta(o.descricao || '');
                        return (
                          <tr key={o.id}>
                            <td>
                              <span className={`admin-badge ${o.tipo === 'compra' ? 'deposito' : o.tipo === 'venda' ? 'retirada' : 'rendimento'}`}>
                                {o.tipo}
                              </span>
                            </td>
                            <td>{o.quantidade || '—'}</td>
                            <td>{o.valor_unitario > 0 ? fmt(o.valor_unitario) : '—'}</td>
                            <td className="ok-white">{fmt(o.valor_total)}</td>
                            <td style={{ color: '#f59e0b', fontSize: 12 }}>{target ? `R$ ${target}` : '—'}</td>
                            <td style={{ color: '#ef4444', fontSize: 12 }}>{stop ? `R$ ${stop}` : '—'}</td>
                            <td className="ok-muted" style={{ fontSize: 11 }}>{new Date(o.data_operacao).toLocaleDateString('pt-BR')}</td>
                            <td>
                              <button className="admin-btn admin-btn-red" style={{ fontSize: 10, padding: '4px 8px' }} onClick={() => deleteOp(o.id, a.id)}>✕</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {/* HISTÓRICO MENSAL */}
                <div className="admin-divider" />
                <div className="admin-card-title" style={{ marginBottom: 14 }}>Histórico Mensal · Valor e %</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 14 }}>
                  <div className="admin-field"><label>Ano</label>
                    <input type="number" value={newHist.ano} onChange={e => setNewHist({ ...newHist, ano: +e.target.value })} />
                  </div>
                  <div className="admin-field"><label>Mês</label>
                    <input type="number" value={newHist.mes} onChange={e => setNewHist({ ...newHist, mes: +e.target.value })} />
                  </div>
                  <div className="admin-field"><label>Vlr Início</label>
                    <input type="number" value={newHist.valor_inicio} onChange={e => {
                      const vi = +e.target.value;
                      setNewHist({ ...newHist, valor_inicio: vi, rendimento_valor: newHist.valor_fim - vi });
                    }} />
                  </div>
                  <div className="admin-field"><label>Vlr Fim</label>
                    <input type="number" value={newHist.valor_fim} onChange={e => {
                      const vf = +e.target.value;
                      setNewHist({ ...newHist, valor_fim: vf, rendimento_valor: vf - newHist.valor_inicio });
                    }} />
                  </div>
                  <div className="admin-field"><label>Lucro (auto)</label>
                    <input type="number" value={newHist.rendimento_valor} readOnly
                      style={{ color: newHist.rendimento_valor >= 0 ? 'var(--ok-emerald)' : 'var(--ok-red)' }} />
                  </div>
                  <div className="admin-field"><label>Ação</label>
                    <button className="admin-btn admin-btn-gold" style={{ width: '100%' }} onClick={() => addHist(a.id)}>Lançar Mês</button>
                  </div>
                </div>

                {hist.length > 0 && (
                  <table className="admin-table">
                    <thead>
                      <tr><th>Período</th><th>Vlr Início</th><th>Vlr Fim</th><th>Lucro</th><th>%</th><th></th></tr>
                    </thead>
                    <tbody>
                      {hist.map(h => (
                        <tr key={h.id}>
                          <td className="ok-white">{months[(h.mes || 1) - 1]}/{h.ano}</td>
                          {editHistId === h.id ? (
                            <>
                              <td>
                                <input type="number" style={{ width: 80, background: 'var(--ok-card-alt)', border: '1px solid var(--ok-border)', borderRadius: 6, color: '#fff', padding: '4px 6px', fontSize: 12 }}
                                  defaultValue={h.valor_inicio} onChange={e => (h._editInicio = +e.target.value)} />
                              </td>
                              <td>
                                <input type="number" style={{ width: 80, background: 'var(--ok-card-alt)', border: '1px solid var(--ok-border)', borderRadius: 6, color: '#fff', padding: '4px 6px', fontSize: 12 }}
                                  defaultValue={h.valor_fim} onChange={e => (h._editFim = +e.target.value)} />
                              </td>
                              <td colSpan={2}>
                                <button className="admin-btn admin-btn-gold" style={{ fontSize: 10, padding: '4px 10px', marginRight: 6 }}
                                  onClick={() => updateHist({ ...h, valor_inicio: h._editInicio ?? h.valor_inicio, valor_fim: h._editFim ?? h.valor_fim })}>
                                  Salvar
                                </button>
                                <button className="admin-btn" style={{ fontSize: 10, padding: '4px 10px' }} onClick={() => setEditHistId(null)}>✕</button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="ok-muted">{fmt(h.valor_inicio)}</td>
                              <td className="ok-white">{fmt(h.valor_fim)}</td>
                              <td className={h.rendimento_valor >= 0 ? 'ok-up' : 'ok-down'}>{fmt(h.rendimento_valor)}</td>
                              <td className={h.rendimento_percentual >= 0 ? 'ok-up' : 'ok-down'}>
                                {h.rendimento_percentual >= 0 ? '+' : ''}{h.rendimento_percentual?.toFixed(2)}%
                              </td>
                            </>
                          )}
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {editHistId !== h.id && (
                                <button className="admin-btn" style={{ fontSize: 10, padding: '4px 8px' }} onClick={() => setEditHistId(h.id)}>✎</button>
                              )}
                              <button className="admin-btn admin-btn-red" style={{ fontSize: 10, padding: '4px 8px' }} onClick={() => deleteHist(h.id, a.id)}>✕</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </td></tr>
        )}
      </React.Fragment>
    );
  };

  // ── Render principal ───────────────────────────────────────────
  return (
    <div>
      {/* Topbar */}
      <div className="admin-topbar">
        <div>
          <h1 className="admin-page-title">Ativos do Fundo</h1>
          <div className="admin-page-sub">{carteira?.nome || selectedFund} · {ativos.length} ativos · {fmtBRL(totalFundo)}</div>
        </div>
        <div className="admin-topbar-right">
          <button className="admin-btn" onClick={() => setShowEditFund(true)}>Editar Fundo</button>
          <button className="admin-btn admin-btn-gold" onClick={() => setShowAdd(true)}>+ Adicionar Ativo</button>
        </div>
      </div>

      {/* ── Modal: Editar Fundo ── */}
      {showEditFund && (
        <div className="admin-modal-overlay" onClick={() => setShowEditFund(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <h3>Editar Fundo — {carteira?.nome}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div className="admin-field"><label>Nome</label><input value={fundEdit.nome} onChange={e => setFundEdit({ ...fundEdit, nome: e.target.value })} /></div>
              <div className="admin-field"><label>Liquidez</label><input value={fundEdit.liquidez} onChange={e => setFundEdit({ ...fundEdit, liquidez: e.target.value })} placeholder="D+30" /></div>
              <div className="admin-field"><label>Target Anual (%)</label><input type="number" value={fundEdit.rentabilidade_alvo_anual} onChange={e => setFundEdit({ ...fundEdit, rentabilidade_alvo_anual: +e.target.value })} /></div>
              <div className="admin-field"><label>Aporte Mínimo</label><input type="number" value={fundEdit.aporte_minimo} onChange={e => setFundEdit({ ...fundEdit, aporte_minimo: +e.target.value })} /></div>
              <div className="admin-field" style={{ gridColumn: 'span 2' }}><label>Descrição</label><input value={fundEdit.descricao} onChange={e => setFundEdit({ ...fundEdit, descricao: e.target.value })} /></div>
              <div className="admin-field" style={{ gridColumn: 'span 2' }}><label>URL da Imagem</label><input value={fundEdit.imagem_url} onChange={e => setFundEdit({ ...fundEdit, imagem_url: e.target.value })} /></div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="admin-btn admin-btn-gold" style={{ flex: 1 }} onClick={saveFundEdit}>Salvar Alterações</button>
              <button className="admin-btn" style={{ flex: 1 }} onClick={() => setShowEditFund(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Adicionar Ativo ── */}
      {showAdd && (
        <div className="admin-modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h3>Novo Ativo</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div className="admin-field"><label>Nome</label><input value={newAtivo.nome} onChange={e => setNewAtivo({ ...newAtivo, nome: e.target.value })} placeholder="Tesouro Selic 2029" /></div>
              <div className="admin-field"><label>Ticker</label><input value={newAtivo.ticker} onChange={e => setNewAtivo({ ...newAtivo, ticker: e.target.value })} placeholder="TSELIC29" /></div>
              <div className="admin-field"><label>Tipo</label>
                <select value={newAtivo.tipo} onChange={e => setNewAtivo({ ...newAtivo, tipo: e.target.value })}>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="admin-field"><label>Plataforma</label>
                <select value={newAtivo.plataforma} onChange={e => setNewAtivo({ ...newAtivo, plataforma: e.target.value })}>
                  {PLATAFORMAS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="admin-field"><label>Moeda</label>
                <select value={newAtivo.moeda} onChange={e => setNewAtivo({ ...newAtivo, moeda: e.target.value })}>
                  <option value="BRL">BRL (R$)</option>
                  <option value="USD">USD (US$)</option>
                </select>
              </div>
              <div className="admin-field"><label>Valor Atual</label><input type="number" value={newAtivo.valor_atual} onChange={e => setNewAtivo({ ...newAtivo, valor_atual: +e.target.value })} /></div>
              <div className="admin-field"><label>% Carteira</label><input type="number" value={newAtivo.percentual_carteira} onChange={e => setNewAtivo({ ...newAtivo, percentual_carteira: +e.target.value })} /></div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="admin-btn admin-btn-gold" style={{ flex: 1 }} onClick={addAtivo}>Adicionar</button>
              <button className="admin-btn" style={{ flex: 1 }} onClick={() => setShowAdd(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Editar Ativo ── */}
      {editAtivo && (
        <div className="admin-modal-overlay" onClick={() => setEditAtivo(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h3>Editar Ativo — {editAtivo.nome}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div className="admin-field"><label>Nome</label>
                <input value={editAtivo.nome} onChange={e => setEditAtivo({ ...editAtivo, nome: e.target.value })} />
              </div>
              <div className="admin-field"><label>Ticker</label>
                <input value={editAtivo.ticker || ''} onChange={e => setEditAtivo({ ...editAtivo, ticker: e.target.value })} />
              </div>
              <div className="admin-field"><label>Tipo</label>
                <select value={editAtivo.tipo} onChange={e => setEditAtivo({ ...editAtivo, tipo: e.target.value })}>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="admin-field"><label>Plataforma</label>
                <select value={editAtivo.plataforma} onChange={e => setEditAtivo({ ...editAtivo, plataforma: e.target.value })}>
                  {PLATAFORMAS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="admin-field"><label>Moeda</label>
                <select value={editAtivo.moeda || 'BRL'} onChange={e => setEditAtivo({ ...editAtivo, moeda: e.target.value })}>
                  <option value="BRL">BRL (R$)</option>
                  <option value="USD">USD (US$)</option>
                </select>
              </div>
              <div className="admin-field">
                <label>Valor Total (R$)</label>
                <input type="number" value={editAtivo.valor_atual || 0} onChange={e => setEditAtivo({ ...editAtivo, valor_atual: +e.target.value })} />
              </div>
              <div className="admin-field"><label>% Carteira</label>
                <input type="number" value={editAtivo.percentual_carteira || 0} onChange={e => setEditAtivo({ ...editAtivo, percentual_carteira: +e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="admin-btn admin-btn-gold" style={{ flex: 1 }} onClick={saveEditAtivo}>Salvar</button>
              <button className="admin-btn" style={{ flex: 1 }} onClick={() => setEditAtivo(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Filter tabs ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' as const }}>
        {([
          ['all',     'Todos'],
          ['trading', 'Trading'],
          ['rv',      'Renda Variável'],
          ['rf',      'Renda Fixa'],
        ] as const).map(([key, label]) => {
          const count  = key === 'all' ? ativos.length : ativos.filter(a => CATEGORIA(a.tipo) === key).length;
          const active = viewFilter === key;
          const color  = key === 'all' ? null : CAT_COLOR[key];
          return (
            <button
              key={key}
              onClick={() => setViewFilter(key as any)}
              style={{
                padding: '6px 14px', fontSize: 11, borderRadius: 6, cursor: 'pointer',
                fontWeight: active ? 700 : 500, letterSpacing: '0.05em', transition: 'all 0.2s',
                color:      active ? (color ? color.text : '#fff') : 'var(--ok-muted)',
                background: active ? (color ? color.bg  : 'rgba(255,255,255,0.06)') : 'transparent',
                border:     active ? `1px solid ${color ? color.border : 'rgba(255,255,255,0.2)'}` : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {label}
              <span style={{ opacity: 0.55, marginLeft: 5, fontSize: 10 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tabela ── */}
      {loading ? (
        <div className="admin-loading">Carregando ativos...</div>
      ) : filteredAtivos.length === 0 ? (
        <div className="admin-card">
          <div className="admin-empty">Nenhum ativo encontrado. Clique em "+ Adicionar Ativo" para começar.</div>
        </div>
      ) : (
        <div className="admin-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ativo</th>
                <th>Moeda</th>
                <th>Plataforma</th>
                <th>Valor Atual</th>
                <th>% Carteira</th>
                <th>Retorno Mês</th>
                <th>Atualizado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {viewFilter === 'all'
                ? groupedAtivos.map(({ cat, list }) => (
                  <React.Fragment key={cat}>
                    {/* Cabeçalho de categoria */}
                    <tr style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <td colSpan={8} style={{ padding: '8px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 3, height: 14, borderRadius: 2, background: CAT_COLOR[cat].text, flexShrink: 0 }} />
                          <span style={{
                            fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                            textTransform: 'uppercase' as const, color: CAT_COLOR[cat].text,
                          }}>
                            {CAT_LABEL[cat]}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--ok-muted)' }}>({list.length})</span>
                          {cat === 'trading' && (
                            <span style={{ fontSize: 9, color: 'rgba(245,158,11,0.45)', marginLeft: 2 }}>● verificar diariamente</span>
                          )}
                          {(cat === 'rv' || cat === 'rf') && (
                            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginLeft: 2 }}>● verificar mensalmente</span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {list.map(a => renderRow(a))}
                  </React.Fragment>
                ))
                : filteredAtivos.map(a => renderRow(a))
              }
            </tbody>
          </table>

          {/* Alocação por plataforma */}
          <div className="admin-divider" />
          <div className="admin-card-title" style={{ marginBottom: 14 }}>Alocação por Plataforma</div>
          {(() => {
            const byPlat: Record<string, number> = {};
            ativos.forEach(a => { byPlat[a.plataforma] = (byPlat[a.plataforma] || 0) + valorBRL(a); });
            return Object.entries(byPlat).map(([plat, val]) => {
              const pct = totalFundo > 0 ? (val / totalFundo) * 100 : 0;
              return (
                <div className="admin-alloc-item" key={plat}>
                  <div className="admin-alloc-name">{plat}</div>
                  <div className="admin-alloc-bar-wrap"><div className="admin-alloc-bar" style={{ width: `${pct}%` }} /></div>
                  <div className="admin-alloc-pct">{pct.toFixed(0)}%</div>
                  <div className="admin-alloc-val">{fmtBRL(val)}</div>
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
};

export default AdminAtivos;
