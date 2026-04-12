import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const HedgeFundManager = () => {
  const { user } = useAuth();
  const [selectedFund, setSelectedFund] = useState('grao');
  const [activeTab, setActiveTab] = useState<'portfolio' | 'clients'>('portfolio');
  const [clients, setClients] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [combinedHistory, setCombinedHistory] = useState<any[]>([]);
  const [lancamentoTipo, setLancamentoTipo] = useState<'rendimento'|'deposito'|'retirada'>('rendimento');
  const [newMonthForm, setNewMonthForm] = useState({ mes: 1, ano: new Date().getFullYear(), saldo_inicio: 0, saldo_fim: 0, rendimento_valor: 0, rendimento_percentual: 0, valor_transacao: 0, descricao: '', moeda: 'BRL' });

  // Fetch clients related to the specific fund carteira
  useEffect(() => {
    if (activeTab === 'clients') {
      fetchClients();
    }
  }, [activeTab, selectedFund]);

  const fetchClients = async () => {
    setLoadingClients(true);
    // Find carteira_id by tipo
    const { data: carteira } = await supabase
      .from('carteiras')
      .select('id')
      .eq('tipo', selectedFund)
      .single();

    if (carteira) {
      const { data, error } = await supabase
        .from('usuario_carteiras')
        .select(`
          id,
          usuario_id,
          carteira_id,
          saldo_atual,
          total_investido,
          percentual_rendimento,
          created_at,
          profiles!inner (
            id,
            nome,
            email,
            cpf
          )
        `)
        .eq('carteira_id', carteira.id);

      if (!error && data) {
        setClients(data);
      }
    }
    setLoadingClients(false);
  };

  // Function to refresh a specific client row (useful after updates)
  const refreshClientData = async (clientId: string) => {
    const { data } = await supabase
      .from('usuario_carteiras')
      .select(`id, usuario_id, carteira_id, saldo_atual, total_investido, percentual_rendimento, created_at, profiles!inner(id, nome, email, cpf)`)
      .eq('id', clientId)
      .single();
    if (data) {
      setClients(prev => prev.map(c => c.id === clientId ? data : c));
    }
  };

  const handleUpdateClient = async (clientId, updates) => {
    const { error } = await supabase
      .from('usuario_carteiras')
      .update(updates)
      .eq('id', clientId);
    if (error) {
      alert("Erro ao atualizar: " + error.message);
    } else {
      alert("Valores do cliente atualizados com sucesso no banco de dados!");
      refreshClientData(clientId);
    }
  };

  const updateClientLocalState = (index, field, value) => {
    const arr = [...clients];
    arr[index][field] = value;
    setClients(arr);
  };

  const handleExpandClient = async (client) => {
    if (expandedClient === client.id) {
      setExpandedClient(null);
      return;
    }
    setExpandedClient(client.id);
    setCombinedHistory([]); // clear
    setLancamentoTipo('rendimento');
    
    const { data: rentData } = await supabase
      .from('rentabilidade_usuario_mensal')
      .select('*')
      .eq('usuario_id', client.usuario_id)
      .eq('carteira_id', client.carteira_id);

    const { data: transData } = await supabase
      .from('transacoes')
      .select('*')
      .eq('usuario_id', client.usuario_id)
      .eq('carteira_id', client.carteira_id);

    const history = [
        ...(rentData || []).map(r => ({ ...r, _type: 'rendimento', _date: r.created_at })),
        ...(transData || []).map(t => ({ ...t, _type: 'transacao', _date: t.created_at }))
    ].sort((a, b) => new Date(b._date).getTime() - new Date(a._date).getTime());
    
    setCombinedHistory(history);
  };

  const handleSaveLancamento = async (client) => {
    if (lancamentoTipo === 'rendimento') {
        // Cancelar registros anteriores desse mesmo mes/ano
        await supabase.from('rentabilidade_usuario_mensal')
          .update({ status: 'cancelado' })
          .eq('usuario_id', client.usuario_id)
          .eq('carteira_id', client.carteira_id)
          .eq('ano', newMonthForm.ano)
          .eq('mes', newMonthForm.mes)
          .eq('status', 'ativo');

        // Cancelar taxa de performance se estiver substituindo esse mes
        await supabase.from('transacoes')
          .delete()
          .eq('usuario_id', client.usuario_id)
          .eq('carteira_id', client.carteira_id)
          .like('descricao', `%Taxa de Performance%Mês ${newMonthForm.mes}/${newMonthForm.ano}%`);

        const taxaPerformance = newMonthForm.rendimento_valor > 0 ? newMonthForm.rendimento_valor * 0.15 : 0;

        const payload = {
           usuario_id: client.usuario_id,
           carteira_id: client.carteira_id,
           ano: newMonthForm.ano,
           mes: newMonthForm.mes,
           saldo_inicio: newMonthForm.saldo_inicio,
           saldo_fim: newMonthForm.saldo_fim,
           rendimento_valor: newMonthForm.rendimento_valor,
           rendimento_percentual: newMonthForm.rendimento_percentual,
           moeda: newMonthForm.moeda,
           status: 'ativo',
           taxa_performance: taxaPerformance
         };
         const { error } = await supabase.from('rentabilidade_usuario_mensal').insert([payload]);
        if (error) alert("Erro: " + error.message);
        else {
          // Update Master Portfolio
          let cotacao = 1;
          if (newMonthForm.moeda === 'USD') {
              try {
                  const res = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
                  const calc = await res.json();
                  cotacao = parseFloat(calc.USDBRL.bid);
              } catch (e) { cotacao = 5.0; }
          }
          
          let mappedSaldoFim = newMonthForm.saldo_fim * cotacao;
          
          if (taxaPerformance > 0) {
             const perfPayload = {
                usuario_id: client.usuario_id,
                carteira_id: client.carteira_id,
                tipo: 'resgate',
                valor: taxaPerformance,
                descricao: `Taxa da Gestão (Performance 15%) - Mês ${newMonthForm.mes}/${newMonthForm.ano}`,
                moeda: newMonthForm.moeda,
                status: 'confirmado',
                data_referencia: new Date().toISOString().split('T')[0]
             };
             await supabase.from('transacoes').insert([perfPayload]);
             mappedSaldoFim -= (taxaPerformance * cotacao);
          }
           
          await supabase.from('usuario_carteiras').update({ saldo_atual: mappedSaldoFim, percentual_rendimento: newMonthForm.rendimento_percentual }).eq('id', client.id);
          refreshClientData(client.id);
          handleExpandClient(client);
        }
    } else {
        const payload = {
           usuario_id: client.usuario_id,
           carteira_id: client.carteira_id,
           tipo: lancamentoTipo === 'deposito' ? 'aporte' : 'resgate',
           valor: newMonthForm.valor_transacao,
           descricao: newMonthForm.descricao || `Lançamento de ${lancamentoTipo}`,
           moeda: newMonthForm.moeda,
           status: 'confirmado',
           data_referencia: new Date().toISOString().split('T')[0]
        };
         const { error } = await supabase.from('transacoes').insert([payload]);
        if (error) alert("Erro: " + error.message);
        else {
          // Update Master Portfolio with API Conversion Exchange Rate
          let cotacao = 1;
          if (payload.moeda === 'USD') {
              try {
                  const res = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
                  const calc = await res.json();
                  cotacao = parseFloat(calc.USDBRL.bid);
              } catch (e) {
                  // Fallback safely just in case the API drops
                  cotacao = 5.0;
              }
          }
          
          const valorLiteral = newMonthForm.valor_transacao * cotacao; 
          if(lancamentoTipo === 'deposito') {
              const novoInvestido = (parseFloat(client.total_investido) || 0) + valorLiteral;
              const novoSaldo = (parseFloat(client.saldo_atual) || 0) + valorLiteral;
              await supabase.from('usuario_carteiras').update({ saldo_atual: novoSaldo, total_investido: novoInvestido }).eq('id', client.id);
          } else {
              // Retirada must subtract from base invested so it doesn't fake a massive loss in profit calculations
              const novoRetirado = (parseFloat(client.total_retirado) || 0) + valorLiteral;
              const novoSaldo = (parseFloat(client.saldo_atual) || 0) - valorLiteral;
              await supabase.from('usuario_carteiras').update({ saldo_atual: novoSaldo, total_retirado: novoRetirado }).eq('id', client.id);
          }
          refreshClientData(client.id);
          handleExpandClient(client);
        }
    }
  };

  const handleDeleteLancamento = async (client, item) => {
    if (!window.confirm("Você tem certeza que quer excluir esse lançamento? Ele será removido permanentemente e vai reverter a ação.")) return;
    
    if (item._type === 'rendimento') {
      const { error } = await supabase.from('rentabilidade_usuario_mensal').delete().eq('id', item.id);
      if (!error) {
        // Drop linked fee automatic withdrawal if available
        await supabase.from('transacoes').delete().eq('usuario_id', client.usuario_id).eq('carteira_id', client.carteira_id).like('descricao', `%Taxa da Gestão (Performance 15%) - Mês ${item.mes}/${item.ano}%`);
        alert("Lançamento mensal excluído com sucesso (e suas taxas anexadas foram retiradas).");
        handleExpandClient(client);
      }
    } else {
      const { error } = await supabase.from('transacoes').delete().eq('id', item.id);
      if (!error) {
        // Reverse balances
        let cotacao = 1;
        if (item.moeda === 'USD') {
            try {
               const res = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
               const calc = await res.json();
               cotacao = parseFloat(calc.USDBRL.bid);
            } catch (e) { cotacao = 5.0; } // Fallback
        }
        
        const revertVal = item.valor * cotacao;
        if (item.tipo === 'aporte' || item.tipo === 'deposito') {
            const novoInvestido = (parseFloat(client.total_investido) || 0) - revertVal;
            const novoSaldo = (parseFloat(client.saldo_atual) || 0) - revertVal;
            await supabase.from('usuario_carteiras').update({ saldo_atual: novoSaldo, total_investido: novoInvestido }).eq('id', client.id);
        } else if (item.tipo === 'resgate' || item.tipo === 'retirada') {
            const novoSaldo = (parseFloat(client.saldo_atual) || 0) + revertVal;
            if (!item.descricao?.includes('Taxa')) {
                const novoRetirado = (parseFloat(client.total_retirado) || 0) - revertVal;
                await supabase.from('usuario_carteiras').update({ saldo_atual: novoSaldo, total_retirado: novoRetirado }).eq('id', client.id);
            } else {
                await supabase.from('usuario_carteiras').update({ saldo_atual: novoSaldo }).eq('id', client.id);
            }
        }
        alert("Transação excluída e saldo revertido com sucesso.");
        refreshClientData(client.id);
        handleExpandClient(client);
      }
    }
  };

  const handleRendimentoAutoCalc = (field: string, value: string) => {
      let form = { ...newMonthForm, [field]: parseFloat(value) || 0 };
      if (field === 'saldo_fim' || field === 'saldo_inicio') {
          form.rendimento_valor = form.saldo_fim - form.saldo_inicio;
      }
      if (field === 'rendimento_valor' && form.saldo_inicio > 0) {
          form.saldo_fim = form.saldo_inicio + form.rendimento_valor;
      }
      setNewMonthForm(form);
  };
  
  // Handlers for mocked operations
  const handlePublish = async () => {
    alert("Resultados do fundo publicados e replicados com sucesso nas carteiras dos investidores!");
    // Aqui no futuro adicionaremos a chamada ao backend
  };

  return (
    <div className="bg-slate-50 text-slate-900 font-body antialiased min-h-screen">
      {/* TopAppBar */}
      <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-30 shadow-sm flex justify-between items-center w-full px-4 sm:px-8 h-16 font-['Manrope'] antialiased tracking-tight border-b border-slate-200">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold tracking-tighter text-sky-900">Okai Capital Manager</h1>
          <nav className="hidden md:flex gap-6 items-center text-sm">
            <select 
              value={selectedFund} 
              onChange={(e) => setSelectedFund(e.target.value)}
              className="bg-transparent text-sky-900 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="grao">Fundo Grão</option>
              <option value="avane">Fundo Avane</option>
            </select>
            <a onClick={() => setActiveTab('portfolio')} className={`transition-colors cursor-pointer ${activeTab === 'portfolio' ? 'text-sky-900 border-b-2 border-sky-900 font-bold' : 'text-slate-500 hover:text-sky-800'}`}>Portfolio</a>
            <a className="text-slate-500 hover:text-sky-800 transition-colors" href="#">Markets</a>
            <a onClick={() => setActiveTab('clients')} className={`transition-colors cursor-pointer ${activeTab === 'clients' ? 'text-sky-900 border-b-2 border-sky-900 font-bold' : 'text-slate-500 hover:text-sky-800'}`}>Clients</a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
            <button onClick={handlePublish} className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded shadow-sm transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">publish</span> Publicar Resultados
            </button>
            <span className="material-symbols-outlined text-slate-500 p-2 hover:bg-slate-100 rounded-md cursor-pointer transition-all">settings</span>
        </div>
      </header>

      <div className="p-4 sm:p-8 max-w-[1600px] mx-auto space-y-8">
        {activeTab === 'portfolio' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Active Assets */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex justify-between items-end mb-2">
                <h2 className="text-2xl font-headline font-extrabold text-slate-800 tracking-tight">Posições Ativas ({selectedFund === 'grao' ? 'Grão' : 'Avane'})</h2>
                <div className="flex gap-4 text-xs font-bold uppercase tracking-widest text-slate-500">
                  <span>Real-Time Feed</span>
                  <span className="flex items-center gap-1 text-teal-600"><span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span> Connected</span>
                </div>
              </div>

              {/* Asset Row 1: PETR4 */}
              <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100 flex flex-col md:flex-row h-auto md:h-72 group hover:shadow-md transition-shadow">
                <div className="w-full md:w-[35%] relative bg-slate-50 p-6 border-r border-slate-100">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold font-headline">PETR4.SA</span>
                      <span className="text-[10px] uppercase font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded">Equities</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">R$ 38.42</div>
                      <div className="text-[10px] text-teal-600 font-bold">+2.41%</div>
                    </div>
                  </div>

                  {/* Mock Chart Area */}
                  <div className="h-32 w-full flex items-end gap-1">
                    <div className="w-full h-20 bg-gradient-to-t from-sky-900/10 to-transparent border-t-2 border-sky-900 rounded-t-sm relative"></div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-200 pt-4">
                    <div>
                      <span className="block text-[8px] uppercase tracking-widest text-slate-500 font-bold">Margin</span>
                      <span className="text-xs font-semibold text-slate-700">12.4%</span>
                    </div>
                    <div>
                      <span className="block text-[8px] uppercase tracking-widest text-slate-500 font-bold">Risk</span>
                      <span className="text-xs font-semibold text-teal-600">Low</span>
                    </div>
                    <div>
                      <span className="block text-[8px] uppercase tracking-widest text-slate-500 font-bold">Drawdown</span>
                      <span className="text-xs font-semibold text-rose-600">-4.1%</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 bg-white p-6 overflow-x-auto">
                  <h3 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-4 flex justify-between items-center">
                    Trades Ativos <span className="text-sky-900 font-headline normal-case tracking-normal font-semibold">Bull Spread 40/42</span>
                  </h3>
                  <table className="w-full text-left font-['Manrope']">
                    <thead>
                      <tr className="text-[9px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                        <th className="pb-2 font-bold">Tipo</th>
                        <th className="pb-2 font-bold">Entry</th>
                        <th className="pb-2 font-bold">Current</th>
                        <th className="pb-2 font-bold text-right">P/L %</th>
                        <th className="pb-2 font-bold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs font-medium divide-y divide-slate-50">
                      <tr>
                        <td className="py-3"><span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded-sm text-[9px] font-bold">BUY</span></td>
                        <td className="py-3">R$ 36.50</td>
                        <td className="py-3">R$ 38.42</td>
                        <td className="py-3 text-right text-teal-600">+5.26%</td>
                        <td className="py-3 text-right text-slate-600"><span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block mr-1"></span> Open</td>
                      </tr>
                      <tr>
                        <td className="py-3"><span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-sm text-[9px] font-bold">SELL</span></td>
                        <td className="py-3">R$ 4.20</td>
                        <td className="py-3">R$ 3.80</td>
                        <td className="py-3 text-right text-teal-600">+9.52%</td>
                        <td className="py-3 text-right text-slate-600"><span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block mr-1"></span> Open</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Asset Row 2: EUR/USD */}
              <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100 flex flex-col md:flex-row h-auto md:h-72 group hover:shadow-md transition-shadow">
                <div className="w-full md:w-[35%] relative bg-slate-50 p-6 border-r border-slate-100">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold font-headline">EUR/USD</span>
                      <span className="text-[10px] uppercase font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded">Forex</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">1.0842</div>
                      <div className="text-[10px] text-rose-600 font-bold">-0.15%</div>
                    </div>
                  </div>
                  <div className="h-32 w-full flex items-end gap-1">
                    <div className="w-full h-24 bg-gradient-to-t from-slate-200 to-transparent border-t-2 border-slate-400 rounded-t-sm"></div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-200 pt-4">
                    <div>
                      <span className="block text-[8px] uppercase tracking-widest text-slate-500 font-bold">Margin</span>
                      <span className="text-xs font-semibold text-slate-700">8.2%</span>
                    </div>
                    <div>
                      <span className="block text-[8px] uppercase tracking-widest text-slate-500 font-bold">Risk</span>
                      <span className="text-xs font-semibold text-amber-600">Med</span>
                    </div>
                    <div>
                      <span className="block text-[8px] uppercase tracking-widest text-slate-500 font-bold">Drawdown</span>
                      <span className="text-xs font-semibold text-rose-600">-1.0%</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 bg-white p-6 overflow-x-auto">
                  <h3 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-4 flex justify-between items-center">
                    Trades Ativos <span className="text-sky-900 font-headline normal-case tracking-normal font-semibold">Short @ 1.0910</span>
                  </h3>
                  <table className="w-full text-left font-['Manrope']">
                    <thead>
                      <tr className="text-[9px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                        <th className="pb-2 font-bold">Tipo</th>
                        <th className="pb-2 font-bold">Entry</th>
                        <th className="pb-2 font-bold">Current</th>
                        <th className="pb-2 font-bold text-right">P/L %</th>
                        <th className="pb-2 font-bold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs font-medium divide-y divide-slate-50">
                      <tr>
                        <td className="py-3"><span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-sm text-[9px] font-bold">SELL</span></td>
                        <td className="py-3">1.0910</td>
                        <td className="py-3">1.0842</td>
                        <td className="py-3 text-right text-teal-600">+0.62%</td>
                        <td className="py-3 text-right text-slate-600"><span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block mr-1"></span> Open</td>
                      </tr>
                      <tr>
                        <td className="py-3"><span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded-sm text-[9px] font-bold">BUY</span></td>
                        <td className="py-3">1.0790</td>
                        <td className="py-3">1.0842</td>
                        <td className="py-3 text-right text-teal-600">+0.48%</td>
                        <td className="py-3 text-right text-slate-600"><span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block mr-1"></span> Limit</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column: Analytics & Risk */}
            <div className="space-y-8">
              {/* Portfolio Allocation Card */}
              <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">Alocação do Fundo</h3>
                <div className="flex justify-center mb-8">
                  <div className="relative w-40 h-40">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" fill="transparent" r="15.915" stroke="#f1f5f9" strokeWidth="3"></circle>
                      <circle cx="18" cy="18" fill="transparent" r="15.915" stroke="#123452" strokeDasharray="45 55" strokeDashoffset="0" strokeWidth="3"></circle>
                      <circle cx="18" cy="18" fill="transparent" r="15.915" stroke="#0ea5e9" strokeDasharray="25 75" strokeDashoffset="-45" strokeWidth="3"></circle>
                      <circle cx="18" cy="18" fill="transparent" r="15.915" stroke="#38bdf8" strokeDasharray="30 70" strokeDashoffset="-70" strokeWidth="3"></circle>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-headline font-extrabold text-slate-800">R$450M</span>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Total AUM</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#123452]"></span>
                      <span className="text-sm font-medium text-slate-700">Equities</span>
                    </div>
                    <span className="text-sm font-bold text-slate-800">45%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#0ea5e9]"></span>
                      <span className="text-sm font-medium text-slate-700">Fixed Income</span>
                    </div>
                    <span className="text-sm font-bold text-slate-800">25%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#38bdf8]"></span>
                      <span className="text-sm font-medium text-slate-700">Forex/Crypto</span>
                    </div>
                    <span className="text-sm font-bold text-slate-800">30%</span>
                  </div>
                </div>
              </div>

              {/* Fund Sentiment Index */}
              <div className="bg-sky-900 text-white rounded-xl p-6 shadow-md shadow-sky-900/10">
                <h3 className="text-[10px] uppercase tracking-widest text-sky-200 font-bold mb-4">Sentiment Index do Algoritmo</h3>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-4xl font-headline font-thin">78.2</div>
                    <div className="text-xs text-teal-400 font-semibold">BULLISH BIAS</div>
                  </div>
                  <div className="h-12 w-24 flex items-end gap-1">
                    <div className="w-2 h-4 bg-sky-700 rounded-t-sm"></div>
                    <div className="w-2 h-6 bg-sky-700 rounded-t-sm"></div>
                    <div className="w-2 h-10 bg-teal-400 rounded-t-sm"></div>
                    <div className="w-2 h-12 bg-teal-400 rounded-t-sm"></div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
                   <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Gestão de Clientes</h3>
                   <p className="text-[10px] text-slate-400">Aqui você gerencia o % repassado para todas as sub-contas que estão atreladas ao {selectedFund === 'grao' ? 'Fundo Grão' : 'Fundo Avane'}.</p>
                   <button onClick={() => setActiveTab('clients')} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-widest py-3 rounded transition-colors">
                       Ajustar Clientes Individuais
                   </button>
              </div>
            </div>
          </div>
        )}

        {/* Clients Tab */}
        {activeTab === 'clients' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-headline font-extrabold text-slate-800 tracking-tight">Base de Clientes ({selectedFund === 'grao' ? 'Grão' : 'Avane'})</h2>
                <p className="text-sm text-slate-500 mt-1">Gere valores por cliente ou lance rendimento mês a mês manualmente.</p>
              </div>
            </div>

            {loadingClients ? (
              <div className="py-20 text-center text-slate-500 animate-pulse uppercase tracking-widest text-xs font-bold">
                Carregando registros...
              </div>
            ) : clients.length === 0 ? (
              <div className="py-20 text-center text-slate-500 uppercase tracking-widest text-xs font-bold bg-slate-50 rounded-lg">
                Nenhum cliente atrelado a este fundo!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-['Manrope'] border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 border-y border-slate-200">
                      <th className="py-4 px-4 font-bold">Nome & Email</th>
                      <th className="py-4 px-4 font-bold">Aportado (Base)</th>
                      <th className="py-4 px-4 font-bold text-center">Saldo Bruto</th>
                      <th className="py-4 px-4 font-bold text-center">Lucro / % Acumulado</th>
                      <th className="py-4 px-4 font-bold text-right">Ações Principais</th>
                      <th className="py-4 px-4"></th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-medium divide-y divide-slate-100">
                    {clients.map((client, idx) => {
                      const lucro = (client.saldo_atual || 0) - (client.total_investido || 0) + (client.total_retirado || 0);
                      const percAcumulado = client.total_investido > 0 ? ((lucro / client.total_investido) * 100).toFixed(2) : '0.00';
                      
                      return (
                      <React.Fragment key={client.id}>
                        <tr className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-4">
                          <div className="font-bold text-sky-900">{client.profiles?.nome || 'Investidor Sem Nome'}</div>
                          <div className="text-[10px] text-slate-400">{client.profiles?.email}</div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-800 text-sm">R$ {client.total_investido.toFixed(2)}</div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="font-bold text-slate-800 text-sm">R$ {client.saldo_atual.toFixed(2)}</div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className={`font-bold text-sm ${lucro >= 0 ? 'text-teal-600' : 'text-rose-600'}`}>R$ {lucro.toFixed(2)}</div>
                          <div className={`text-[10px] font-black tracking-widest ${lucro >= 0 ? 'text-teal-500' : 'text-rose-500'}`}>{lucro >= 0 ? '+' : ''}{percAcumulado}%</div>
                        </td>
                          <td className="py-4 px-4 text-right">
                              <div className="w-[180px] flex gap-3 opacity-50">
                                  <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Via Lançamentos</span>
                              </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <button onClick={() => handleExpandClient(client)} className="text-slate-400 hover:text-sky-900 material-symbols-outlined">
                                {expandedClient === client.id ? 'expand_less' : 'expand_more'}
                            </button>
                          </td>
                        </tr>
                        
                        {/* Month by Month Expansion */}
                        {expandedClient === client.id && (
                          <tr className="bg-slate-50">
                            <td colSpan={6} className="p-6">
                                <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Lançamento Mês a Mês</h4>
                                  
                                  <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-4">
                                      <span onClick={() => setLancamentoTipo('rendimento')} className={`text-xs font-bold uppercase tracking-widest cursor-pointer px-3 py-1.5 rounded ${lancamentoTipo === 'rendimento' ? 'bg-sky-900 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>Rendimento Mês a Mês</span>
                                      <span onClick={() => setLancamentoTipo('deposito')} className={`text-xs font-bold uppercase tracking-widest cursor-pointer px-3 py-1.5 rounded ${lancamentoTipo === 'deposito' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>+ Depósito</span>
                                      <span onClick={() => setLancamentoTipo('retirada')} className={`text-xs font-bold uppercase tracking-widest cursor-pointer px-3 py-1.5 rounded ${lancamentoTipo === 'retirada' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>- Retirada</span>
                                  </div>
                                  
                                  {lancamentoTipo === 'rendimento' ? (
                                    <div className="grid grid-cols-7 gap-4 mb-6">
                                      <div><label className="text-[10px] uppercase font-bold text-slate-400">Ano</label><input type="number" onChange={e => setNewMonthForm({...newMonthForm, ano: parseInt(e.target.value)})} value={newMonthForm.ano} className="w-full bg-slate-50 border border-slate-200 p-2 text-xs focus:border-sky-500 focus:outline-none" /></div>
                                      <div><label className="text-[10px] uppercase font-bold text-slate-400">Mês (1-12)</label><input type="number" onChange={e => setNewMonthForm({...newMonthForm, mes: parseInt(e.target.value)})} value={newMonthForm.mes} className="w-full bg-slate-50 border border-slate-200 p-2 text-xs focus:border-sky-500 focus:outline-none" /></div>
                                      <div><label className="text-[10px] uppercase font-bold text-slate-400">Saldo Início</label><input type="number" onChange={e => handleRendimentoAutoCalc('saldo_inicio', e.target.value)} value={newMonthForm.saldo_inicio} className="w-full bg-slate-50 border border-slate-200 p-2 text-xs focus:border-sky-500 focus:outline-none" /></div>
                                      <div><label className="text-[10px] uppercase font-bold text-slate-400">Saldo Fim (% Auto)</label><input type="number" onChange={e => handleRendimentoAutoCalc('saldo_fim', e.target.value)} value={newMonthForm.saldo_fim} className="w-full bg-sky-50 border border-sky-200 p-2 text-xs focus:border-sky-500 focus:outline-none" /></div>
                                      <div><label className="text-[10px] uppercase font-bold text-slate-400">Lucro Calc ($)</label><input type="number" onChange={e => handleRendimentoAutoCalc('rendimento_valor', e.target.value)} value={newMonthForm.rendimento_valor} className="w-full bg-teal-50 border border-teal-200 p-2 text-xs text-teal-800 font-bold focus:border-teal-500 focus:outline-none" /></div>
                                      <div><label className="text-[10px] uppercase font-bold text-slate-400">Moeda</label>
                                        <select onChange={e => setNewMonthForm({...newMonthForm, moeda: e.target.value})} value={newMonthForm.moeda} className="w-full bg-slate-50 border border-slate-200 p-2 text-xs focus:border-sky-500 focus:outline-none">
                                          <option value="BRL">BRL (R$)</option>
                                          <option value="USD">USD (US$)</option>
                                        </select>
                                      </div>
                                      <div>
                                        <label className="text-[10px] uppercase font-bold text-slate-400">Criar no DB</label>
                                        <button onClick={() => handleSaveLancamento(client)} className="w-full bg-sky-900 text-white text-xs font-bold uppercase tracking-widest py-2 px-1 rounded shadow-sm hover:bg-sky-800 transition-colors">Lançar Rent</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-5 gap-4 mb-6">
                                      <div><label className="text-[10px] uppercase font-bold text-slate-400">Valor (Numérico)</label><input type="number" onChange={e => setNewMonthForm({...newMonthForm, valor_transacao: parseFloat(e.target.value)})} value={newMonthForm.valor_transacao} className="w-full bg-slate-50 border border-slate-200 p-2 text-xs focus:border-sky-500 focus:outline-none" /></div>
                                      <div><label className="text-[10px] uppercase font-bold text-slate-400">Moeda</label>
                                        <select onChange={e => setNewMonthForm({...newMonthForm, moeda: e.target.value})} value={newMonthForm.moeda} className="w-full bg-slate-50 border border-slate-200 p-2 text-xs focus:border-sky-500 focus:outline-none">
                                          <option value="BRL">BRL (R$)</option>
                                          <option value="USD">USD (US$)</option>
                                        </select>
                                      </div>
                                      <div className="col-span-2"><label className="text-[10px] uppercase font-bold text-slate-400">Descrição / Nota (Opcional)</label><input type="text" onChange={e => setNewMonthForm({...newMonthForm, descricao: e.target.value})} value={newMonthForm.descricao} className="w-full bg-slate-50 border border-slate-200 p-2 text-xs focus:border-sky-500 focus:outline-none" placeholder={`Ex: ${lancamentoTipo} em Conta`} /></div>
                                      <div>
                                        <label className="text-[10px] uppercase font-bold text-slate-400">Adicionar Transação</label>
                                        <button onClick={() => handleSaveLancamento(client)} className={`w-full text-white text-xs font-bold uppercase tracking-widest py-2 px-1 rounded shadow-sm transition-colors ${lancamentoTipo === 'deposito' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-rose-600 hover:bg-rose-700'}`}>Lançar {lancamentoTipo}</button>
                                      </div>
                                    </div>
                                  )}

                                  <table className="w-full text-left text-xs">
                                     <thead><tr className="text-[10px] uppercase tracking-widest font-bold text-slate-400 border-b border-slate-100"><th className="pb-2">Tipo</th><th className="pb-2">Info / Período</th><th className="pb-2">Vlr Trans. / Base</th><th className="pb-2">Status / Resultado</th><th className="pb-2">Moeda</th><th className="pb-2">Data Lanç.</th><th className="pb-2 text-right">Ação</th></tr></thead>
                                     <tbody>
                                       {combinedHistory.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-slate-400 text-[10px] uppercase tracking-widest font-bold">Nenhum histórico encontrado.</td></tr>}
                                       {combinedHistory.map((item, idxx) => (
                                         <tr key={idxx} className="border-b border-slate-50 hover:bg-slate-50/50">
                                            <td className="py-3">
                                                {item._type === 'rendimento' && <span className="bg-sky-100 text-sky-800 px-2 py-0.5 rounded text-[9px] font-bold uppercase">Rentabilidade</span>}
                                                {item._type === 'transacao' && (item.tipo === 'deposito' || item.tipo === 'aporte') && <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded text-[9px] font-bold uppercase">Depósito</span>}
                                                {item._type === 'transacao' && (item.tipo === 'retirada' || item.tipo === 'resgate') && <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-[9px] font-bold uppercase">Retirada</span>}
                                            </td>
                                            <td className="py-3 font-semibold text-slate-700">
                                                {item._type === 'rendimento' ? `Mês ${item.mes}/${item.ano}` : item.descricao}
                                            </td>
                                            <td className="py-3 text-slate-500">
                                                {item._type === 'rendimento' ? `Início: ${item.moeda==='USD'?'US$':'R$'} ${item.saldo_inicio}` : `${item.moeda==='USD'?'US$':'R$'} ${item.valor}`}
                                            </td>
                                            <td className="py-3 font-bold">
                                                {item._type === 'rendimento' ? 
                                                   <span className={item.status === 'cancelado' ? 'text-slate-400 line-through font-normal whitespace-pre-wrap' : (item.rendimento_valor >= 0) ? 'text-teal-600 whitespace-pre-wrap' : 'text-rose-600 whitespace-pre-wrap'}>
                                                       Lucro: {item.moeda==='USD'?'US$':'R$'} {item.rendimento_valor} {item.status === 'cancelado' && '(SUB)'}
                                                       {item.taxa_performance > 0 && <span className="block text-[9px] text-rose-500">- Taxa (15%): {item.moeda==='USD'?'US$':'R$'} {item.taxa_performance.toFixed(2)}</span>}
                                                   </span> 
                                                 : <span className="text-slate-500 capitalize">{item.status}</span>
                                                }
                                            </td>
                                            <td className="py-3 font-bold text-slate-400 text-[10px]">{item.moeda || 'BRL'}</td>
                                            <td className="py-3 text-[10px] text-slate-400">{new Date(item._date).toLocaleDateString('pt-BR')}</td>
                                            <td className="py-3 text-right">
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteLancamento(client, item); }} className="text-slate-400 hover:text-rose-500 material-symbols-outlined text-sm transition-colors">
                                                    delete
                                                </button>
                                            </td>
                                         </tr>
                                       ))}
                                     </tbody>
                                  </table>
                                </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HedgeFundManager;
