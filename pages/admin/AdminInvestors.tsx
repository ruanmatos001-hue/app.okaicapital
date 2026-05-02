import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { calcularSaldoReal, SaldoCalculado } from '../../lib/calcSaldo';

interface Props { selectedFund: string; onSelectClient: (c: any) => void; onViewChange: (v: string) => void; }

const AdminInvestors: React.FC<Props> = ({ selectedFund, onSelectClient, onViewChange }) => {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saldosCalc, setSaldosCalc] = useState<Record<string, SaldoCalculado>>({});
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [combinedHistory, setCombinedHistory] = useState<any[]>([]);
  const [lancamentoTipo, setLancamentoTipo] = useState<'rendimento'|'deposito'|'retirada'>('rendimento');
  const [form, setForm] = useState({ mes: new Date().getMonth()+1, ano: new Date().getFullYear(), rendimento_percentual: 0, valor_transacao: 0, descricao: '', moeda: 'BRL' });
  const [estForm, setEstForm] = useState({ percentual: 0, data_inicio: new Date().toISOString().split('T')[0], data_fim: '' });
  const [showBulk, setShowBulk] = useState(false);
  const [bulkPerc, setBulkPerc] = useState(0);
  const [bulkMes, setBulkMes] = useState(new Date().getMonth()+1);
  const [bulkAno, setBulkAno] = useState(new Date().getFullYear());
  const [bulkMoeda, setBulkMoeda] = useState('BRL');
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => { fetchClients(); }, [selectedFund]);

  const fetchClients = async () => {
    setLoading(true);
    const { data: carteira } = await supabase.from('carteiras').select('id').eq('tipo', selectedFund).single();
    if (carteira) {
      const { data } = await supabase.from('usuario_carteiras').select('*, profiles!inner(id, nome, email, cpf)').eq('carteira_id', carteira.id);
      if (data) {
        setClients(data);
        const calc: Record<string, SaldoCalculado> = {};
        for (const uc of data) {
          calc[uc.id] = await calcularSaldoReal(uc.usuario_id, uc.carteira_id);
        }
        setSaldosCalc(calc);
      }
    }
    setLoading(false);
  };

  const refreshClient = async (id: string) => {
    const { data } = await supabase.from('usuario_carteiras').select('*, profiles!inner(id, nome, email, cpf)').eq('id', id).single();
    if (data) {
      setClients(prev => prev.map(c => c.id === id ? data : c));
      const sc = await calcularSaldoReal(data.usuario_id, data.carteira_id);
      setSaldosCalc(prev => ({ ...prev, [id]: sc }));
    }
  };

  const handleExpand = async (client: any) => {
    if (expandedClient === client.id) { setExpandedClient(null); return; }
    setExpandedClient(client.id);
    setCombinedHistory([]);
    setLancamentoTipo('rendimento');
    const { data: rentData } = await supabase.from('rentabilidade_usuario_mensal').select('*').eq('usuario_id', client.usuario_id).eq('carteira_id', client.carteira_id);
    const { data: transData } = await supabase.from('transacoes').select('*').eq('usuario_id', client.usuario_id).eq('carteira_id', client.carteira_id);
    const history = [
      ...(rentData || []).map(r => ({ ...r, _type: 'rendimento', _date: r.created_at })),
      ...(transData || []).map(t => ({ ...t, _type: 'transacao', _date: t.created_at }))
    ].sort((a, b) => new Date(b._date).getTime() - new Date(a._date).getTime());
    setCombinedHistory(history);
  };

  // Save rendimento using only % — auto-calculates saldo_inicio/fim from current balance
  const handleSaveRendimento = async (client: any) => {
    const sc = saldosCalc[client.id];
    const saldoInicio = sc?.saldo || 0;
    const rendValor = saldoInicio * (form.rendimento_percentual / 100);
    const saldoFim = saldoInicio + rendValor;

    await supabase.from('rentabilidade_usuario_mensal').update({ status: 'cancelado' }).eq('usuario_id', client.usuario_id).eq('carteira_id', client.carteira_id).eq('ano', form.ano).eq('mes', form.mes).eq('status', 'ativo');
    await supabase.from('transacoes').delete().eq('usuario_id', client.usuario_id).eq('carteira_id', client.carteira_id).like('descricao', `%Taxa de Performance%Mês ${form.mes}/${form.ano}%`);

    const taxa = rendValor > 0 ? rendValor * 0.15 : 0;
    const { error } = await supabase.from('rentabilidade_usuario_mensal').insert([{
      usuario_id: client.usuario_id, carteira_id: client.carteira_id,
      ano: form.ano, mes: form.mes, saldo_inicio: saldoInicio, saldo_fim: saldoFim,
      rendimento_valor: rendValor, rendimento_percentual: form.rendimento_percentual,
      moeda: form.moeda, status: 'ativo', taxa_performance: taxa
    }]);
    if (error) { alert("Erro: " + error.message); return; }

    if (taxa > 0) {
      await supabase.from('transacoes').insert([{
        usuario_id: client.usuario_id, carteira_id: client.carteira_id,
        tipo: 'resgate', valor: taxa,
        descricao: `Taxa da Gestão (Performance 15%) - Mês ${form.mes}/${form.ano}`,
        moeda: form.moeda, status: 'confirmado',
        data_referencia: new Date().toISOString().split('T')[0]
      }]);
    }
    refreshClient(client.id);
    handleExpand(client);
  };

  const handleSaveTransacao = async (client: any) => {
    const payload = {
      usuario_id: client.usuario_id, carteira_id: client.carteira_id,
      tipo: lancamentoTipo === 'deposito' ? 'aporte' : 'resgate',
      valor: form.valor_transacao,
      descricao: form.descricao || `Lançamento de ${lancamentoTipo}`,
      moeda: form.moeda, status: 'confirmado',
      data_referencia: new Date().toISOString().split('T')[0]
    };
    const { error } = await supabase.from('transacoes').insert([payload]);
    if (error) { alert("Erro: " + error.message); return; }
    refreshClient(client.id);
    handleExpand(client);
  };

  const handleSave = async (client: any) => {
    if (lancamentoTipo === 'rendimento') await handleSaveRendimento(client);
    else await handleSaveTransacao(client);
  };

  // BULK: Apply % rendimento to ALL clients with balance
  const handleBulkRendimento = async () => {
    if (bulkPerc === 0) { alert('Informe uma % de rendimento'); return; }
    if (!confirm(`Aplicar ${bulkPerc}% de rendimento para TODOS os ${clients.length} investidores do mês ${bulkMes}/${bulkAno}?`)) return;

    setBulkLoading(true);
    let count = 0;
    for (const client of clients) {
      const sc = saldosCalc[client.id];
      const saldoInicio = sc?.saldo || 0;
      if (saldoInicio <= 0) continue;

      const rendValor = saldoInicio * (bulkPerc / 100);
      const saldoFim = saldoInicio + rendValor;
      const taxa = rendValor > 0 ? rendValor * 0.15 : 0;

      // Cancel existing for same month
      await supabase.from('rentabilidade_usuario_mensal').update({ status: 'cancelado' }).eq('usuario_id', client.usuario_id).eq('carteira_id', client.carteira_id).eq('ano', bulkAno).eq('mes', bulkMes).eq('status', 'ativo');
      await supabase.from('transacoes').delete().eq('usuario_id', client.usuario_id).eq('carteira_id', client.carteira_id).like('descricao', `%Taxa de Performance%Mês ${bulkMes}/${bulkAno}%`);

      await supabase.from('rentabilidade_usuario_mensal').insert([{
        usuario_id: client.usuario_id, carteira_id: client.carteira_id,
        ano: bulkAno, mes: bulkMes, saldo_inicio: saldoInicio, saldo_fim: saldoFim,
        rendimento_valor: rendValor, rendimento_percentual: bulkPerc,
        moeda: bulkMoeda, status: 'ativo', taxa_performance: taxa
      }]);

      if (taxa > 0) {
        await supabase.from('transacoes').insert([{
          usuario_id: client.usuario_id, carteira_id: client.carteira_id,
          tipo: 'resgate', valor: taxa,
          descricao: `Taxa da Gestão (Performance 15%) - Mês ${bulkMes}/${bulkAno}`,
          moeda: bulkMoeda, status: 'confirmado',
          data_referencia: new Date().toISOString().split('T')[0]
        }]);
      }
      count++;
    }
    setBulkLoading(false);
    setShowBulk(false);
    alert(`Rendimento de ${bulkPerc}% aplicado com sucesso para ${count} investidores!`);
    fetchClients();
  };

  const handleDelete = async (client: any, item: any) => {
    if (!window.confirm("Excluir este lançamento permanentemente?")) return;
    if (item._type === 'rendimento') {
      await supabase.from('rentabilidade_usuario_mensal').delete().eq('id', item.id);
      await supabase.from('transacoes').delete().eq('usuario_id', client.usuario_id).eq('carteira_id', client.carteira_id).like('descricao', `%Taxa da Gestão (Performance 15%) - Mês ${item.mes}/${item.ano}%`);
    } else {
      await supabase.from('transacoes').delete().eq('id', item.id);
    }
    refreshClient(client.id);
    handleExpand(client);
  };

  const saveEstimatedYield = async (client: any) => {
    const sc = saldosCalc[client.id];
    const estimatedVal = (sc?.saldo || 0) * (estForm.percentual / 100);
    const { error } = await supabase.from('usuario_carteiras').update({
      rendimento_estimado_percentual: estForm.percentual,
      rendimento_estimado_valor: estimatedVal,
      rendimento_estimado_data_inicio: estForm.data_inicio,
      rendimento_estimado_data_fim: estForm.data_fim,
      rendimento_estimado_ativo: true,
    }).eq('id', client.id);
    if (error) alert('Erro: ' + error.message);
    else { alert('Rendimento estimado configurado!'); refreshClient(client.id); }
  };

  const removeEstimatedYield = async (client: any) => {
    await supabase.from('usuario_carteiras').update({
      rendimento_estimado_percentual: 0, rendimento_estimado_valor: 0,
      rendimento_estimado_data_inicio: null, rendimento_estimado_data_fim: null,
      rendimento_estimado_ativo: false,
    }).eq('id', client.id);
    refreshClient(client.id);
  };

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div>
      <div className="admin-topbar">
        <div>
          <h1 className="admin-page-title">Investidores</h1>
          <div className="admin-page-sub">{clients.length} ativos · Gestão individual</div>
        </div>
        <div className="admin-topbar-right">
          <button className="admin-btn admin-btn-gold" onClick={() => setShowBulk(true)}>
            Rendimento em Massa
          </button>
        </div>
      </div>

      {/* BULK MODAL */}
      {showBulk && (
        <div className="admin-modal-overlay" onClick={() => setShowBulk(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h3>Rendimento em Massa</h3>
            <p style={{ fontSize: 12, color: 'var(--ok-muted)', marginBottom: 20, lineHeight: 1.7 }}>
              Aplique uma <strong style={{ color: 'var(--ok-emerald)' }}>% de rendimento</strong> para todos os investidores que possuem saldo neste fundo. O sistema calcula automaticamente o valor do rendimento e a taxa de performance (15%).
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div className="admin-field"><label>% Rendimento</label><input type="number" step="0.01" value={bulkPerc} onChange={e => setBulkPerc(+e.target.value)} placeholder="2.5" style={{ color: 'var(--ok-emerald)', fontWeight: 700, fontSize: 16 }} /></div>
              <div className="admin-field"><label>Mês</label><input type="number" min={1} max={12} value={bulkMes} onChange={e => setBulkMes(+e.target.value)} /></div>
              <div className="admin-field"><label>Ano</label><input type="number" value={bulkAno} onChange={e => setBulkAno(+e.target.value)} /></div>
              <div className="admin-field"><label>Moeda</label>
                <select value={bulkMoeda} onChange={e => setBulkMoeda(e.target.value)}>
                  <option value="BRL">BRL</option><option value="USD">USD</option>
                </select>
              </div>
            </div>
            <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10, padding: 14, marginBottom: 20, fontSize: 12, color: 'var(--ok-muted)' }}>
              Serão afetados: <strong style={{ color: '#fff' }}>{clients.filter(c => (saldosCalc[c.id]?.saldo || 0) > 0).length}</strong> investidores com saldo positivo
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="admin-btn admin-btn-gold" style={{ flex: 1 }} onClick={handleBulkRendimento} disabled={bulkLoading}>
                {bulkLoading ? 'Processando...' : `Aplicar ${bulkPerc}% para Todos`}
              </button>
              <button className="admin-btn" style={{ flex: 1 }} onClick={() => setShowBulk(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="admin-card">
        {loading ? <div className="admin-loading">Carregando...</div> : clients.length === 0 ? <div className="admin-empty">Nenhum investidor neste fundo</div> : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Investidor</th>
                <th>Aportado</th>
                <th>Saldo Atual</th>
                <th>Rentab. Total</th>
                <th>Taxa Devida</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const sc = saldosCalc[c.id];
                const saldo = sc?.saldo || 0;
                const aportado = sc?.totalAportado || 0;
                const lucro = sc?.lucroTotal || 0;
                const perc = sc?.percentualTotal || 0;
                const taxa = lucro > 0 ? lucro * 0.15 : 0;
                return (
                  <React.Fragment key={c.id}>
                    <tr>
                      <td>
                        <span className="admin-investor-name">{c.profiles?.nome || '—'}</span>
                        <span className="admin-investor-email">{c.profiles?.email}</span>
                      </td>
                      <td className="ok-muted">{fmt(aportado)}</td>
                      <td className="ok-white" style={{ fontSize: 13, fontWeight: 500 }}>{fmt(saldo)}</td>
                      <td className={lucro >= 0 ? 'ok-up' : 'ok-down'}>
                        {fmt(lucro)} ({perc >= 0 ? '+' : ''}{perc.toFixed(1)}%)
                      </td>
                      <td style={{ color: 'var(--ok-emerald)' }}>{fmt(taxa)}</td>
                      <td>
                        <button className="admin-btn" style={{ fontSize: 10, padding: '6px 10px' }} onClick={() => { onSelectClient(c); onViewChange('cliente'); }}>Ver visão</button>
                      </td>
                      <td>
                        <button className="admin-btn" style={{ fontSize: 10, padding: '6px 10px' }} onClick={() => handleExpand(c)}>
                          {expandedClient === c.id ? '▲' : '▼'}
                        </button>
                      </td>
                    </tr>
                    {expandedClient === c.id && (
                      <tr>
                        <td colSpan={7} style={{ padding: 0 }}>
                          <div className="admin-expanded-row" style={{ padding: 24 }}>
                            <div className="admin-expanded-inner">
                              <div className="admin-card-title" style={{ marginBottom: 14 }}>Lançamento Mês a Mês</div>
                              <div className="admin-lancamento-tabs">
                                <button className={`admin-lancamento-tab ${lancamentoTipo === 'rendimento' ? 'active-rend' : ''}`} onClick={() => setLancamentoTipo('rendimento')}>Rendimento</button>
                                <button className={`admin-lancamento-tab ${lancamentoTipo === 'deposito' ? 'active-dep' : ''}`} onClick={() => setLancamentoTipo('deposito')}>+ Depósito</button>
                                <button className={`admin-lancamento-tab ${lancamentoTipo === 'retirada' ? 'active-ret' : ''}`} onClick={() => setLancamentoTipo('retirada')}>- Retirada</button>
                              </div>

                              {lancamentoTipo === 'rendimento' ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
                                  <div className="admin-field"><label>Ano</label><input type="number" value={form.ano} onChange={e => setForm({...form, ano: +e.target.value})} /></div>
                                  <div className="admin-field"><label>Mês</label><input type="number" value={form.mes} onChange={e => setForm({...form, mes: +e.target.value})} /></div>
                                  <div className="admin-field"><label>% Rendimento</label><input type="number" step="0.01" value={form.rendimento_percentual} onChange={e => setForm({...form, rendimento_percentual: +e.target.value})} style={{ color: 'var(--ok-emerald)', fontWeight: 600 }} /></div>
                                  <div className="admin-field"><label>Moeda</label>
                                    <select value={form.moeda} onChange={e => setForm({...form, moeda: e.target.value})}>
                                      <option value="BRL">BRL</option><option value="USD">USD</option>
                                    </select>
                                  </div>
                                  <div className="admin-field"><label>Ação</label><button className="admin-btn admin-btn-gold" style={{ width: '100%' }} onClick={() => handleSave(c)}>Lançar</button></div>
                                </div>
                              ) : (
                                <div className="admin-form-grid-5">
                                  <div className="admin-field"><label>Valor</label><input type="number" value={form.valor_transacao} onChange={e => setForm({...form, valor_transacao: +e.target.value})} /></div>
                                  <div className="admin-field"><label>Moeda</label>
                                    <select value={form.moeda} onChange={e => setForm({...form, moeda: e.target.value})}>
                                      <option value="BRL">BRL</option><option value="USD">USD</option>
                                    </select>
                                  </div>
                                  <div className="admin-field span-2"><label>Descrição</label><input value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} /></div>
                                  <div className="admin-field"><label>Ação</label><button className={`admin-btn ${lancamentoTipo === 'deposito' ? 'admin-btn-gold' : 'admin-btn-red'}`} style={{ width: '100%' }} onClick={() => handleSave(c)}>Lançar</button></div>
                                </div>
                              )}

                              {/* History */}
                              <table className="admin-table">
                                <thead><tr><th>Tipo</th><th>Info</th><th>Valor</th><th>Resultado</th><th>Moeda</th><th>Data</th><th></th></tr></thead>
                                <tbody>
                                  {combinedHistory.length === 0 && <tr><td colSpan={7} className="admin-empty" style={{ border: 'none' }}>Nenhum histórico</td></tr>}
                                  {combinedHistory.map((item, i) => (
                                    <tr key={i}>
                                      <td>
                                        {item._type === 'rendimento' && <span className="admin-badge rendimento">Rentab.</span>}
                                        {item._type === 'transacao' && (item.tipo === 'aporte' || item.tipo === 'deposito') && <span className="admin-badge deposito">Depósito</span>}
                                        {item._type === 'transacao' && (item.tipo === 'resgate' || item.tipo === 'retirada') && <span className="admin-badge retirada">Retirada</span>}
                                      </td>
                                      <td className="ok-white">{item._type === 'rendimento' ? `Mês ${item.mes}/${item.ano}` : item.descricao}</td>
                                      <td className="ok-muted">{item._type === 'rendimento' ? `${item.rendimento_percentual?.toFixed(2)}%` : fmt(item.valor)}</td>
                                      <td>
                                        {item._type === 'rendimento' ? (
                                          <span className={item.status === 'cancelado' ? 'ok-muted' : item.rendimento_valor >= 0 ? 'ok-up' : 'ok-down'} style={item.status === 'cancelado' ? { textDecoration: 'line-through' } : {}}>
                                            {fmt(item.rendimento_valor)}
                                            {item.taxa_performance > 0 && <span style={{ display: 'block', fontSize: 10, color: 'var(--ok-red)' }}>Taxa 15%: {item.taxa_performance?.toFixed(2)}</span>}
                                          </span>
                                        ) : <span className="ok-muted" style={{ textTransform: 'capitalize' }}>{item.status}</span>}
                                      </td>
                                      <td className="ok-muted" style={{ fontSize: 11 }}>{item.moeda || 'BRL'}</td>
                                      <td className="ok-muted" style={{ fontSize: 11 }}>{new Date(item._date).toLocaleDateString('pt-BR')}</td>
                                      <td><button className="admin-btn admin-btn-red" style={{ fontSize: 10, padding: '4px 8px' }} onClick={() => handleDelete(c, item)}>✕</button></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>

                              {/* RENDIMENTO ESTIMADO */}
                              <div className="admin-divider" />
                              <div className="admin-card-title" style={{ marginBottom: 4 }}>Rendimento Estimado (Projeção para o Cliente)</div>
                              <p style={{ fontSize: 11, color: 'var(--ok-muted)', marginBottom: 14, lineHeight: 1.6 }}>
                                Configure um % estimado e datas. O cliente verá o saldo crescendo progressivamente.
                              </p>
                              {c.rendimento_estimado_ativo ? (
                                <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10, padding: 16 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                      <span style={{ color: 'var(--ok-emerald)', fontSize: 13, fontWeight: 600 }}>● Estimativa ativa: +{c.rendimento_estimado_percentual}%</span>
                                      <span className="ok-muted" style={{ display: 'block', fontSize: 11, marginTop: 4 }}>
                                        De {c.rendimento_estimado_data_inicio ? new Date(c.rendimento_estimado_data_inicio + 'T12:00:00').toLocaleDateString('pt-BR') : '—'} até {c.rendimento_estimado_data_fim ? new Date(c.rendimento_estimado_data_fim + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                                      </span>
                                      <span className="ok-muted" style={{ display: 'block', fontSize: 11 }}>Valor estimado: {fmt(c.rendimento_estimado_valor || 0)}</span>
                                    </div>
                                    <button className="admin-btn admin-btn-red" onClick={() => removeEstimatedYield(c)}>Remover</button>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                                  <div className="admin-field"><label>% Estimado</label><input type="number" step="0.1" value={estForm.percentual} onChange={e => setEstForm({ ...estForm, percentual: +e.target.value })} /></div>
                                  <div className="admin-field"><label>Data Início</label><input type="date" value={estForm.data_inicio} onChange={e => setEstForm({ ...estForm, data_inicio: e.target.value })} /></div>
                                  <div className="admin-field"><label>Data Fim</label><input type="date" value={estForm.data_fim} onChange={e => setEstForm({ ...estForm, data_fim: e.target.value })} /></div>
                                  <div className="admin-field"><label>Ação</label><button className="admin-btn admin-btn-gold" style={{ width: '100%' }} onClick={() => saveEstimatedYield(c)}>Ativar</button></div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminInvestors;
