import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getUsdBrlRate, toBRL } from '../../lib/calcSaldo';

interface Props { selectedFund: string; }

const TIPOS = ['RF', 'FII', 'ETF', 'Ações', 'Opções', 'Forex', 'Crypto', 'Internacional', 'Outro'];
const PLATAFORMAS = ['XP', 'Avenue', 'Ava', 'B3', 'Binance', 'Outro'];

const AdminAtivos: React.FC<Props> = ({ selectedFund }) => {
  const [carteiraId, setCarteiraId] = useState<string | null>(null);
  const [carteira, setCarteira] = useState<any>(null);
  const [ativos, setAtivos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showEditFund, setShowEditFund] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [ops, setOps] = useState<any[]>([]);
  const [hist, setHist] = useState<any[]>([]);
  const [editHistId, setEditHistId] = useState<string | null>(null);
  const [newAtivo, setNewAtivo] = useState({ nome: '', ticker: '', tipo: 'RF', plataforma: 'XP', valor_atual: 0, percentual_carteira: 0, moeda: 'BRL' });
  const [newOp, setNewOp] = useState({ tipo: 'compra', quantidade: 0, valor_unitario: 0, valor_total: 0, data_operacao: new Date().toISOString().split('T')[0], descricao: '' });
  const [newHist, setNewHist] = useState({ ano: new Date().getFullYear(), mes: new Date().getMonth() + 1, valor_inicio: 0, valor_fim: 0, rendimento_valor: 0, rendimento_percentual: 0 });
  const [fundEdit, setFundEdit] = useState({ nome: '', descricao: '', rentabilidade_alvo_anual: 0, aporte_minimo: 0, liquidez: '', imagem_url: '' });
  const [cotacao, setCotacao] = useState(5.0);

  useEffect(() => { getUsdBrlRate().then(setCotacao); loadAtivos(); }, [selectedFund]);

  const loadAtivos = async () => {
    setLoading(true);
    const { data: c } = await supabase.from('carteiras').select('*').eq('tipo', selectedFund).single();
    if (!c) { setLoading(false); return; }
    setCarteiraId(c.id);
    setCarteira(c);
    setFundEdit({ nome: c.nome || '', descricao: c.descricao || '', rentabilidade_alvo_anual: c.rentabilidade_alvo_anual || 0, aporte_minimo: c.aporte_minimo || 0, liquidez: c.liquidez || '', imagem_url: c.imagem_url || '' });
    const { data } = await supabase.from('ativos').select('*').eq('carteira_id', c.id).eq('status', 'ativo').order('percentual_carteira', { ascending: false });
    setAtivos(data || []);
    setLoading(false);
  };

  const addAtivo = async () => {
    if (!carteiraId || !newAtivo.nome) return;
    const { error } = await supabase.from('ativos').insert([{ ...newAtivo, carteira_id: carteiraId }]);
    if (error) alert('Erro: ' + error.message);
    else { setShowAdd(false); setNewAtivo({ nome: '', ticker: '', tipo: 'RF', plataforma: 'XP', valor_atual: 0, percentual_carteira: 0, moeda: 'BRL' }); loadAtivos(); }
  };

  const deleteAtivo = async (id: string) => {
    await supabase.from('ativos').update({ status: 'encerrado' }).eq('id', id);
    loadAtivos();
  };

  // Toggle expand — only collapses if clicking the same asset
  const expandAtivo = async (ativo: any) => {
    if (expanded === ativo.id) { setExpanded(null); return; }
    setExpanded(ativo.id);
    setEditHistId(null);
    await refreshExpandedData(ativo.id);
  };

  // Refresh data for the currently expanded asset WITHOUT toggling
  const refreshExpandedData = async (ativoId: string) => {
    const { data: opsData } = await supabase.from('operacoes_ativos').select('*').eq('ativo_id', ativoId).order('data_operacao', { ascending: false });
    setOps(opsData || []);
    const { data: histData } = await supabase.from('historico_ativos_mensal').select('*').eq('ativo_id', ativoId).order('ano', { ascending: false }).order('mes', { ascending: false });
    setHist(histData || []);
  };

  // Recalculate asset valor_atual from all operations
  const recalcAtivoValor = async (ativoId: string) => {
    const { data: allOps } = await supabase.from('operacoes_ativos').select('tipo, valor_total').eq('ativo_id', ativoId);
    let total = 0;
    (allOps || []).forEach(o => {
      if (o.tipo === 'compra' || o.tipo === 'dividendo' || o.tipo === 'juros') total += (o.valor_total || 0);
      else if (o.tipo === 'venda') total -= (o.valor_total || 0);
    });
    // If there's monthly history, use the latest valor_fim instead
    const { data: lastHist } = await supabase.from('historico_ativos_mensal').select('valor_fim').eq('ativo_id', ativoId).order('ano', { ascending: false }).order('mes', { ascending: false }).limit(1);
    const valorFinal = (lastHist && lastHist.length > 0) ? lastHist[0].valor_fim : total;
    // Add operations total on top of the latest history value if both exist
    const finalVal = (lastHist && lastHist.length > 0 && total > 0) ? Math.max(valorFinal, total) : (valorFinal || total);
    await supabase.from('ativos').update({ valor_atual: finalVal, updated_at: new Date().toISOString() }).eq('id', ativoId);
  };

  const addOp = async (ativoId: string) => {
    const total = newOp.valor_total || (newOp.quantidade * newOp.valor_unitario);
    const { error } = await supabase.from('operacoes_ativos').insert([{ ...newOp, valor_total: total, ativo_id: ativoId }]);
    if (error) { alert('Erro: ' + error.message); return; }
    // Update asset value
    await recalcAtivoValor(ativoId);
    setNewOp({ tipo: 'compra', quantidade: 0, valor_unitario: 0, valor_total: 0, data_operacao: new Date().toISOString().split('T')[0], descricao: '' });
    await refreshExpandedData(ativoId);
    loadAtivos();
  };

  const addHist = async (ativoId: string) => {
    const rv = newHist.valor_fim - newHist.valor_inicio;
    const rp = newHist.valor_inicio > 0 ? (rv / newHist.valor_inicio) * 100 : 0;
    const { error } = await supabase.from('historico_ativos_mensal').insert([{ ...newHist, rendimento_valor: rv, rendimento_percentual: rp, ativo_id: ativoId }]);
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
    await supabase.from('historico_ativos_mensal').update({ valor_inicio: histItem.valor_inicio, valor_fim: histItem.valor_fim, rendimento_valor: rv, rendimento_percentual: rp }).eq('id', histItem.id);
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
    console.log('[deleteHist] deleting', id, 'for ativo', ativoId);
    const { error } = await supabase.from('historico_ativos_mensal').delete().eq('id', id);
    if (error) { console.error('[deleteHist] error:', error); alert('Erro ao excluir: ' + error.message); return; }
    console.log('[deleteHist] deleted successfully, refreshing...');
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

  const fmt = (v: number, moeda?: string) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: moeda === 'USD' ? 'USD' : 'BRL' }).format(v);
  const fmtBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  // Convert all assets to BRL for totals
  const totalFundo = ativos.reduce((a, c) => a + toBRL(c.valor_atual || 0, c.moeda || 'BRL', cotacao), 0);
  const valorBRL = (a: any) => toBRL(a.valor_atual || 0, a.moeda || 'BRL', cotacao);
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  return (
    <div>
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

      {/* EDIT FUND MODAL */}
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

      {/* ADD ASSET MODAL */}
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

      {/* TABLE */}
      {loading ? <div className="admin-loading">Carregando ativos...</div> : ativos.length === 0 ? (
        <div className="admin-card"><div className="admin-empty">Nenhum ativo cadastrado neste fundo. Clique em "+ Adicionar Ativo" para começar.</div></div>
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
              {ativos.map(a => (
                <React.Fragment key={a.id}>
                  <tr>
                    <td>
                      <span className="ok-white" style={{ fontSize: 13, fontWeight: 500 }}>{a.nome}</span>
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--ok-muted)' }}>{a.ticker} · {a.tipo}</span>
                    </td>
                    <td>
                      <span className="admin-badge" style={{ color: a.moeda === 'USD' ? 'var(--ok-blue)' : 'var(--ok-emerald)', borderColor: a.moeda === 'USD' ? 'rgba(96,165,250,0.2)' : 'rgba(16,185,129,0.2)', background: a.moeda === 'USD' ? 'rgba(96,165,250,0.06)' : 'rgba(16,185,129,0.06)' }}>
                        {a.moeda || 'BRL'}
                      </span>
                    </td>
                    <td><span className="admin-asset-platform">{a.plataforma}</span></td>
                    <td className="ok-white" style={{ fontWeight: 500 }}>
                      {fmt(a.valor_atual || 0, a.moeda)}
                      {a.moeda === 'USD' && <span style={{ display: 'block', fontSize: 10, color: 'var(--ok-muted)' }}>≈ {fmtBRL(valorBRL(a))}</span>}
                    </td>
                    <td>
                      {(() => {
                        const pctReal = totalFundo > 0 ? (valorBRL(a) / totalFundo) * 100 : 0;
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 50, height: 3, background: 'rgba(255,255,255,0.04)', borderRadius: 2, position: 'relative' }}>
                              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(pctReal, 100)}%`, background: 'var(--ok-emerald)', borderRadius: 2 }} />
                            </div>
                            <span style={{ fontSize: 12 }}>{pctReal.toFixed(1)}%</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className={a.retorno_mes >= 0 ? 'ok-up' : 'ok-down'}>{a.retorno_mes >= 0 ? '+' : ''}{(a.retorno_mes || 0).toFixed(2)}%</td>
                    <td className="ok-muted" style={{ fontSize: 11 }}>{new Date(a.updated_at).toLocaleDateString('pt-BR')}</td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="admin-btn" style={{ fontSize: 10, padding: '4px 8px' }} onClick={() => expandAtivo(a)}>{expanded === a.id ? '▲' : '▼'}</button>
                      <button className="admin-btn admin-btn-red" style={{ fontSize: 10, padding: '4px 8px' }} onClick={() => deleteAtivo(a.id)}>✕</button>
                    </td>
                  </tr>

                  {expanded === a.id && (
                    <tr><td colSpan={8} style={{ padding: 0 }}>
                      <div className="admin-expanded-row" style={{ padding: 24 }}>
                        <div className="admin-expanded-inner">
                          {/* OPERAÇÕES */}
                          <div className="admin-card-title" style={{ marginBottom: 14 }}>Operações · {a.nome}</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 14 }}>
                            <div className="admin-field"><label>Tipo</label>
                              <select value={newOp.tipo} onChange={e => setNewOp({ ...newOp, tipo: e.target.value })}>
                                <option value="compra">Compra</option><option value="venda">Venda</option><option value="dividendo">Dividendo</option><option value="juros">Juros</option>
                              </select>
                            </div>
                            <div className="admin-field"><label>Qtd</label><input type="number" value={newOp.quantidade} onChange={e => setNewOp({ ...newOp, quantidade: +e.target.value })} /></div>
                            <div className="admin-field"><label>Vlr Unit.</label><input type="number" value={newOp.valor_unitario} onChange={e => setNewOp({ ...newOp, valor_unitario: +e.target.value })} /></div>
                            <div className="admin-field"><label>Vlr Total</label><input type="number" value={newOp.valor_total || newOp.quantidade * newOp.valor_unitario} onChange={e => setNewOp({ ...newOp, valor_total: +e.target.value })} /></div>
                            <div className="admin-field"><label>Data</label><input type="date" value={newOp.data_operacao} onChange={e => setNewOp({ ...newOp, data_operacao: e.target.value })} /></div>
                            <div className="admin-field"><label>Ação</label><button className="admin-btn admin-btn-gold" style={{ width: '100%' }} onClick={() => addOp(a.id)}>Lançar</button></div>
                          </div>
                          {ops.length > 0 && (
                            <table className="admin-table" style={{ marginBottom: 20 }}>
                              <thead><tr><th>Tipo</th><th>Qtd</th><th>Vlr Unit.</th><th>Total</th><th>Data</th><th></th></tr></thead>
                              <tbody>{ops.map(o => (
                                <tr key={o.id}>
                                  <td><span className={`admin-badge ${o.tipo === 'compra' ? 'deposito' : o.tipo === 'venda' ? 'retirada' : 'rendimento'}`}>{o.tipo}</span></td>
                                  <td>{o.quantidade}</td>
                                  <td>{fmt(o.valor_unitario)}</td>
                                  <td className="ok-white">{fmt(o.valor_total)}</td>
                                  <td className="ok-muted" style={{ fontSize: 11 }}>{new Date(o.data_operacao).toLocaleDateString('pt-BR')}</td>
                                  <td><button className="admin-btn admin-btn-red" style={{ fontSize: 10, padding: '4px 8px' }} onClick={() => deleteOp(o.id, a.id)}>✕</button></td>
                                </tr>
                              ))}</tbody>
                            </table>
                          )}

                          {/* HISTÓRICO MENSAL */}
                          <div className="admin-divider" />
                          <div className="admin-card-title" style={{ marginBottom: 14 }}>Histórico Mensal · Valor e %</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 14 }}>
                            <div className="admin-field"><label>Ano</label><input type="number" value={newHist.ano} onChange={e => setNewHist({ ...newHist, ano: +e.target.value })} /></div>
                            <div className="admin-field"><label>Mês</label><input type="number" value={newHist.mes} onChange={e => setNewHist({ ...newHist, mes: +e.target.value })} /></div>
                            <div className="admin-field"><label>Vlr Início</label><input type="number" value={newHist.valor_inicio} onChange={e => { const vi = +e.target.value; setNewHist({ ...newHist, valor_inicio: vi, rendimento_valor: newHist.valor_fim - vi }); }} /></div>
                            <div className="admin-field"><label>Vlr Fim</label><input type="number" value={newHist.valor_fim} onChange={e => { const vf = +e.target.value; setNewHist({ ...newHist, valor_fim: vf, rendimento_valor: vf - newHist.valor_inicio }); }} /></div>
                            <div className="admin-field"><label>Lucro</label><input type="number" value={newHist.rendimento_valor} readOnly style={{ color: newHist.rendimento_valor >= 0 ? 'var(--ok-emerald)' : 'var(--ok-red)' }} /></div>
                            <div className="admin-field"><label>Ação</label><button className="admin-btn admin-btn-gold" style={{ width: '100%' }} onClick={() => addHist(a.id)}>Lançar Mês</button></div>
                          </div>
                          {hist.length > 0 && (
                            <table className="admin-table">
                              <thead><tr><th>Período</th><th>Vlr Início</th><th>Vlr Fim</th><th>Lucro</th><th>%</th><th></th></tr></thead>
                              <tbody>{hist.map(h => (
                                <tr key={h.id}>
                                  <td className="ok-white">{months[(h.mes||1)-1]}/{h.ano}</td>
                                  {editHistId === h.id ? (
                                    <>
                                      <td><input type="number" style={{ width: 80, background: 'var(--ok-card-alt)', border: '1px solid var(--ok-border)', borderRadius: 6, color: '#fff', padding: '4px 6px', fontSize: 12 }} defaultValue={h.valor_inicio} onChange={e => h._editInicio = +e.target.value} /></td>
                                      <td><input type="number" style={{ width: 80, background: 'var(--ok-card-alt)', border: '1px solid var(--ok-border)', borderRadius: 6, color: '#fff', padding: '4px 6px', fontSize: 12 }} defaultValue={h.valor_fim} onChange={e => h._editFim = +e.target.value} /></td>
                                      <td colSpan={2}>
                                        <button className="admin-btn admin-btn-gold" style={{ fontSize: 10, padding: '4px 10px', marginRight: 6 }} onClick={() => updateHist({ ...h, valor_inicio: h._editInicio ?? h.valor_inicio, valor_fim: h._editFim ?? h.valor_fim })}>Salvar</button>
                                        <button className="admin-btn" style={{ fontSize: 10, padding: '4px 10px' }} onClick={() => setEditHistId(null)}>✕</button>
                                      </td>
                                    </>
                                  ) : (
                                    <>
                                      <td className="ok-muted">{fmt(h.valor_inicio)}</td>
                                      <td className="ok-white">{fmt(h.valor_fim)}</td>
                                      <td className={h.rendimento_valor >= 0 ? 'ok-up' : 'ok-down'}>{fmt(h.rendimento_valor)}</td>
                                      <td className={h.rendimento_percentual >= 0 ? 'ok-up' : 'ok-down'}>{h.rendimento_percentual >= 0 ? '+' : ''}{h.rendimento_percentual?.toFixed(2)}%</td>
                                    </>
                                  )}
                                  <td>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                      {editHistId !== h.id && <button className="admin-btn" style={{ fontSize: 10, padding: '4px 8px' }} onClick={() => setEditHistId(h.id)}>✎</button>}
                                      <button className="admin-btn admin-btn-red" style={{ fontSize: 10, padding: '4px 8px' }} onClick={() => deleteHist(h.id, a.id)}>✕</button>
                                    </div>
                                  </td>
                                </tr>
                              ))}</tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    </td></tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {/* ALOCAÇÃO VISUAL */}
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
