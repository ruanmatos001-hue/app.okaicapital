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
  const [form, setForm] = useState({ mes: new Date().getMonth()+1, ano: new Date().getFullYear(), saldo_inicio: 0, saldo_fim: 0, rendimento_valor: 0, rendimento_percentual: 0, valor_transacao: 0, descricao: '', moeda: 'BRL' });
  const [estForm, setEstForm] = useState({ percentual: 0, data_inicio: new Date().toISOString().split('T')[0], data_fim: '', valor: 0 });

  useEffect(() => { fetchClients(); }, [selectedFund]);

  const fetchClients = async () => {
    setLoading(true);
    const { data: carteira } = await supabase.from('carteiras').select('id').eq('tipo', selectedFund).single();
    if (carteira) {
      const { data } = await supabase.from('usuario_carteiras').select('*, profiles!inner(id, nome, email, cpf)').eq('carteira_id', carteira.id);
      if (data) {
        setClients(data);
        // Calcular saldos reais de cada investidor
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
      // Recalcular saldo deste investidor
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

  const handleAutoCalc = (field: string, value: string) => {
    let f = { ...form, [field]: parseFloat(value) || 0 };
    if (field === 'saldo_fim' || field === 'saldo_inicio') f.rendimento_valor = f.saldo_fim - f.saldo_inicio;
    if (field === 'rendimento_valor' && f.saldo_inicio > 0) f.saldo_fim = f.saldo_inicio + f.rendimento_valor;
    setForm(f);
  };

  const handleSave = async (client: any) => {
    if (lancamentoTipo === 'rendimento') {
      await supabase.from('rentabilidade_usuario_mensal').update({ status: 'cancelado' }).eq('usuario_id', client.usuario_id).eq('carteira_id', client.carteira_id).eq('ano', form.ano).eq('mes', form.mes).eq('status', 'ativo');
      await supabase.from('transacoes').delete().eq('usuario_id', client.usuario_id).eq('carteira_id', client.carteira_id).like('descricao', `%Taxa de Performance%Mês ${form.mes}/${form.ano}%`);
      const taxa = form.rendimento_valor > 0 ? form.rendimento_valor * 0.15 : 0;
      const { error } = await supabase.from('rentabilidade_usuario_mensal').insert([{ usuario_id: client.usuario_id, carteira_id: client.carteira_id, ano: form.ano, mes: form.mes, saldo_inicio: form.saldo_inicio, saldo_fim: form.saldo_fim, rendimento_valor: form.rendimento_valor, rendimento_percentual: form.rendimento_percentual, moeda: form.moeda, status: 'ativo', taxa_performance: taxa }]);
      if (error) { alert("Erro: " + error.message); return; }
      let cotacao = 1;
      if (form.moeda === 'USD') { try { const r = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL'); const c = await r.json(); cotacao = parseFloat(c.USDBRL.bid); } catch { cotacao = 5.0; } }
      let mapped = form.saldo_fim * cotacao;
      if (taxa > 0) {
        await supabase.from('transacoes').insert([{ usuario_id: client.usuario_id, carteira_id: client.carteira_id, tipo: 'resgate', valor: taxa, descricao: `Taxa da Gestão (Performance 15%) - Mês ${form.mes}/${form.ano}`, moeda: form.moeda, status: 'confirmado', data_referencia: new Date().toISOString().split('T')[0] }]);
        mapped -= taxa * cotacao;
      }
      await supabase.from('usuario_carteiras').update({ saldo_atual: mapped, percentual_rendimento: form.rendimento_percentual }).eq('id', client.id);
    } else {
      const payload = { usuario_id: client.usuario_id, carteira_id: client.carteira_id, tipo: lancamentoTipo === 'deposito' ? 'aporte' : 'resgate', valor: form.valor_transacao, descricao: form.descricao || `Lançamento de ${lancamentoTipo}`, moeda: form.moeda, status: 'confirmado', data_referencia: new Date().toISOString().split('T')[0] };
      const { error } = await supabase.from('transacoes').insert([payload]);
      if (error) { alert("Erro: " + error.message); return; }
      let cotacao = 1;
      if (form.moeda === 'USD') { try { const r = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL'); const c = await r.json(); cotacao = parseFloat(c.USDBRL.bid); } catch { cotacao = 5.0; } }
      const val = form.valor_transacao * cotacao;
      if (lancamentoTipo === 'deposito') {
        await supabase.from('usuario_carteiras').update({ saldo_atual: (parseFloat(client.saldo_atual) || 0) + val, total_investido: (parseFloat(client.total_investido) || 0) + val }).eq('id', client.id);
      } else {
        await supabase.from('usuario_carteiras').update({ saldo_atual: (parseFloat(client.saldo_atual) || 0) - val, total_retirado: (parseFloat(client.total_retirado) || 0) + val }).eq('id', client.id);
      }
    }
    refreshClient(client.id);
    handleExpand(client);
  };

  const handleDelete = async (client: any, item: any) => {
    if (!window.confirm("Excluir este lançamento permanentemente?")) return;
    if (item._type === 'rendimento') {
      await supabase.from('rentabilidade_usuario_mensal').delete().eq('id', item.id);
      await supabase.from('transacoes').delete().eq('usuario_id', client.usuario_id).eq('carteira_id', client.carteira_id).like('descricao', `%Taxa da Gestão (Performance 15%) - Mês ${item.mes}/${item.ano}%`);
    } else {
      await supabase.from('transacoes').delete().eq('id', item.id);
      let cotacao = 1;
      if (item.moeda === 'USD') { try { const r = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL'); const c = await r.json(); cotacao = parseFloat(c.USDBRL.bid); } catch { cotacao = 5.0; } }
      const rv = item.valor * cotacao;
      if (item.tipo === 'aporte' || item.tipo === 'deposito') {
        await supabase.from('usuario_carteiras').update({ saldo_atual: (parseFloat(client.saldo_atual)||0) - rv, total_investido: (parseFloat(client.total_investido)||0) - rv }).eq('id', client.id);
      } else if (item.tipo === 'resgate' || item.tipo === 'retirada') {
        const upd: any = { saldo_atual: (parseFloat(client.saldo_atual)||0) + rv };
        if (!item.descricao?.includes('Taxa')) upd.total_retirado = (parseFloat(client.total_retirado)||0) - rv;
        await supabase.from('usuario_carteiras').update(upd).eq('id', client.id);
      }
    }
    refreshClient(client.id);
    handleExpand(client);
  };

  const saveEstimatedYield = async (client: any) => {
    const estimatedVal = (client.saldo_atual || 0) * (estForm.percentual / 100);
    const { error } = await supabase.from('usuario_carteiras').update({
      rendimento_estimado_percentual: estForm.percentual,
      rendimento_estimado_valor: estimatedVal,
      rendimento_estimado_data_inicio: estForm.data_inicio,
      rendimento_estimado_data_fim: estForm.data_fim,
      rendimento_estimado_ativo: true,
    }).eq('id', client.id);
    if (error) alert('Erro: ' + error.message);
    else { alert('Rendimento estimado configurado! O cliente verá o saldo crescendo até a data final.'); refreshClient(client.id); }
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
      </div>

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
                      <td className="ok-white" style={{ fontSize: 13 }}>{fmt(saldo)}</td>
                      <td className={lucro >= 0 ? 'ok-up' : 'ok-down'}>
                        {fmt(lucro)} ({perc >= 0 ? '+' : ''}{perc.toFixed(1)}%)
                      </td>
                      <td className="ok-gold">{fmt(taxa)}</td>
                      <td>
                        <button className="admin-btn" style={{ fontSize: 9, padding: '6px 12px' }} onClick={() => { onSelectClient(c); onViewChange('cliente'); }}>Ver visão</button>
                      </td>
                      <td>
                        <button className="admin-btn" style={{ fontSize: 9, padding: '6px 12px' }} onClick={() => handleExpand(c)}>
                          {expandedClient === c.id ? '▲' : '▼'}
                        </button>
                      </td>
                    </tr>
                    {expandedClient === c.id && (
                      <tr>
                        <td colSpan={7} style={{ padding: 0 }}>
                          <div className="admin-expanded-row" style={{ padding: 24 }}>
                            <div className="admin-expanded-inner">
                              <div className="admin-card-title" style={{ marginBottom: 16 }}>Lançamento Mês a Mês</div>
                              <div className="admin-lancamento-tabs">
                                <button className={`admin-lancamento-tab ${lancamentoTipo === 'rendimento' ? 'active-rend' : ''}`} onClick={() => setLancamentoTipo('rendimento')}>Rendimento</button>
                                <button className={`admin-lancamento-tab ${lancamentoTipo === 'deposito' ? 'active-dep' : ''}`} onClick={() => setLancamentoTipo('deposito')}>+ Depósito</button>
                                <button className={`admin-lancamento-tab ${lancamentoTipo === 'retirada' ? 'active-ret' : ''}`} onClick={() => setLancamentoTipo('retirada')}>- Retirada</button>
                              </div>

                              {lancamentoTipo === 'rendimento' ? (
                                <div className="admin-form-grid-7">
                                  <div className="admin-field"><label>Ano</label><input type="number" value={form.ano} onChange={e => setForm({...form, ano: +e.target.value})} /></div>
                                  <div className="admin-field"><label>Mês</label><input type="number" value={form.mes} onChange={e => setForm({...form, mes: +e.target.value})} /></div>
                                  <div className="admin-field"><label>Saldo Início</label><input type="number" value={form.saldo_inicio} onChange={e => handleAutoCalc('saldo_inicio', e.target.value)} /></div>
                                  <div className="admin-field"><label>Saldo Fim</label><input type="number" value={form.saldo_fim} onChange={e => handleAutoCalc('saldo_fim', e.target.value)} /></div>
                                  <div className="admin-field"><label>Lucro ($)</label><input type="number" value={form.rendimento_valor} onChange={e => handleAutoCalc('rendimento_valor', e.target.value)} style={{ color: 'var(--ok-green)' }} /></div>
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

                              {/* History Table */}
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
                                      <td className="ok-muted">{item._type === 'rendimento' ? `${item.moeda==='USD'?'US$':'R$'} ${item.saldo_inicio}` : `${item.moeda==='USD'?'US$':'R$'} ${item.valor}`}</td>
                                      <td>
                                        {item._type === 'rendimento' ? (
                                          <span className={item.status === 'cancelado' ? 'ok-muted' : item.rendimento_valor >= 0 ? 'ok-up' : 'ok-down'} style={item.status === 'cancelado' ? { textDecoration: 'line-through' } : {}}>
                                            Lucro: {item.moeda==='USD'?'US$':'R$'} {item.rendimento_valor}
                                            {item.taxa_performance > 0 && <span style={{ display: 'block', fontSize: 9, color: 'var(--ok-red)' }}>Taxa 15%: {item.taxa_performance?.toFixed(2)}</span>}
                                          </span>
                                        ) : <span className="ok-muted" style={{ textTransform: 'capitalize' }}>{item.status}</span>}
                                      </td>
                                      <td className="ok-muted" style={{ fontSize: 10 }}>{item.moeda || 'BRL'}</td>
                                      <td className="ok-muted" style={{ fontSize: 10 }}>{new Date(item._date).toLocaleDateString('pt-BR')}</td>
                                      <td><button className="admin-btn admin-btn-red" style={{ fontSize: 9, padding: '4px 8px' }} onClick={() => handleDelete(c, item)}>✕</button></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>

                              {/* RENDIMENTO ESTIMADO */}
                              <div className="admin-divider" />
                              <div className="admin-card-title" style={{ marginBottom: 4 }}>Rendimento Estimado (Projeção para o Cliente)</div>
                              <p style={{ fontSize: 10, color: 'var(--ok-muted)', marginBottom: 16, lineHeight: 1.6 }}>
                                Configure um % estimado e data final. O cliente verá o saldo crescendo progressivamente até essa data. Depois, lance o rendimento real acima.
                              </p>
                              {c.rendimento_estimado_ativo ? (
                                <div style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)', padding: 16, marginBottom: 16 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                      <span className="ok-gold" style={{ fontSize: 12 }}>● Estimativa ativa: +{c.rendimento_estimado_percentual}%</span>
                                      <span className="ok-muted" style={{ display: 'block', fontSize: 10, marginTop: 4 }}>
                                        De {c.rendimento_estimado_data_inicio ? new Date(c.rendimento_estimado_data_inicio + 'T12:00:00').toLocaleDateString('pt-BR') : '—'} até {c.rendimento_estimado_data_fim ? new Date(c.rendimento_estimado_data_fim + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                                      </span>
                                      <span className="ok-muted" style={{ display: 'block', fontSize: 10 }}>Valor estimado: {fmt(c.rendimento_estimado_valor || 0)}</span>
                                    </div>
                                    <button className="admin-btn admin-btn-red" onClick={() => removeEstimatedYield(c)}>Remover Estimativa</button>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                                  <div className="admin-field"><label>% Estimado</label><input type="number" step="0.1" value={estForm.percentual} onChange={e => setEstForm({ ...estForm, percentual: +e.target.value })} placeholder="2.5" /></div>
                                  <div className="admin-field"><label>Data Início</label><input type="date" value={estForm.data_inicio} onChange={e => setEstForm({ ...estForm, data_inicio: e.target.value })} /></div>
                                  <div className="admin-field"><label>Data Fim</label><input type="date" value={estForm.data_fim} onChange={e => setEstForm({ ...estForm, data_fim: e.target.value })} /></div>
                                  <div className="admin-field"><label>Ação</label><button className="admin-btn admin-btn-gold" style={{ width: '100%' }} onClick={() => saveEstimatedYield(c)}>Ativar Estimativa</button></div>
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
