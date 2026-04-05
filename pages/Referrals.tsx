import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Indicacao {
  id: string;
  indicado_nome: string;
  status: 'ativo' | 'pendente';
  data_entrada: string;
  comissao_gerada: number;
}

const formatMoney = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const formatDate = (dateString: string) => {
  const d = new Date(dateString);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const Referrals: React.FC = () => {
  const { user } = useAuth();
  const [indicacoes, setIndicacoes] = useState<Indicacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarIndicacoes = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('indicacoes')
        .select('*')
        .eq('indicador_id', user.id)
        .order('data_entrada', { ascending: false });
        
      if (!error && data) {
        setIndicacoes(data as Indicacao[]);
      }
      setLoading(false);
    };

    carregarIndicacoes();
  }, [user]);

  const totalFaturado = indicacoes.reduce((acc, curr) => acc + (Number(curr.comissao_gerada) || 0), 0);
  const parceirosAtivos = indicacoes.filter(i => i.status === 'ativo').length;
  // Exemplo de regra fictícia para "A Receber" baseado no pendente ou mês atual: (Aqui pegaremos os ultimos 20% do faturado só para efeito visual de demonstração)
  const aReceber = totalFaturado * 0.12; 

  return (
    <div className="space-y-8 animate-fade-in-up md:max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <span className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase block mb-2">Network Privado</span>
          <h1 className="text-3xl font-black text-white">Programa de Partnership</h1>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20 text-slate-500 text-xs uppercase tracking-widest animate-pulse">
          Calculando rede institucional...
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Total Faturado', value: formatMoney(totalFaturado), sub: 'Vitalício', icon: 'stars' },
              { label: 'A Receber', value: formatMoney(aReceber), sub: 'Liquidação D+5', icon: 'payments' },
              { label: 'Parceiros Ativos', value: parceirosAtivos.toString(), sub: 'Convertidos', icon: 'groups' },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#0a0f0e] border border-white/5 p-6 group transition-all hover:border-primary/30">
                <div className="flex justify-between items-start mb-6">
                  <span className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">{stat.label}</span>
                  <span className="material-symbols-outlined text-primary text-[18px]">
                    {stat.icon}
                  </span>
                </div>
                <p className="text-3xl lg:text-4xl font-bold text-white mb-2">{stat.value.replace('R$', '').trim()} <span className="text-sm font-light text-slate-500">{stat.label === 'Parceiros Ativos' ? '' : 'BRL'}</span></p>
                <p className="text-primary text-[9px] font-black uppercase tracking-widest">{stat.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Referral Link Card */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-[#050807] border border-white/5 p-8">
                <h3 className="text-white text-sm font-black uppercase tracking-widest mb-6 border-b border-white/5 pb-4">
                   Link de Convite
                </h3>
                
                <div className="space-y-6">
                  <div className="relative">
                    <input 
                      readOnly 
                      value={`okai.capital/p/usr_${user?.id?.substring(0, 5) || 'demo'}`} 
                      className="w-full bg-[#0a0f0e] border border-white/10 p-4 text-xs font-mono text-slate-400 focus:outline-none"
                    />
                    <button className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-2">
                      <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    </button>
                  </div>

                  <div className="bg-white p-6 flex flex-col items-center justify-center gap-4">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=okai.capital/p/usr_${user?.id?.substring(0, 5) || 'demo'}`} 
                      alt="QR Code" 
                      className="w-32 h-32"
                    />
                  </div>
                  <p className="text-[10px] text-center text-slate-500 uppercase tracking-widest font-bold">Apresente este QR</p>

                  <div className="border border-primary/20 p-4">
                    <p className="text-[10px] text-slate-400 leading-relaxed font-bold tracking-wide">
                      Ganhe <span className="text-primary">1.5%</span> de rebate institucional sobre cada aporte realizado por investidores estruturados via seu link.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* List Card */}
            <div className="lg:col-span-2">
              <div className="bg-[#050807] border border-white/5 h-full flex flex-col">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                  <h3 className="text-white text-sm font-black uppercase tracking-widest">Suas Indicações</h3>
                  {indicacoes.length > 0 && (
                    <button className="text-primary text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1 border border-primary px-3 py-1">
                      Exportar Extrato
                    </button>
                  )}
                </div>
                
                <div className="overflow-x-auto flex-grow">
                  {indicacoes.length > 0 ? (
                    <table className="w-full text-left">
                      <thead className="bg-[#0a0f0e] text-slate-500 text-[10px] uppercase font-black tracking-[0.2em]">
                        <tr>
                          <th className="px-8 py-4 font-normal">Investidor</th>
                          <th className="px-8 py-4 font-normal">Status</th>
                          <th className="px-8 py-4 font-normal">Data</th>
                          <th className="px-8 py-4 text-right font-normal">Rebate Gerado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {indicacoes.map((item) => (
                          <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white/5 flex items-center justify-center text-[10px] font-bold text-white uppercase group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                                  {item.indicado_nome.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                </div>
                                <span className="text-xs font-bold text-slate-300">{item.indicado_nome}</span>
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-[0.2em] border ${
                                item.status === 'ativo' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                              }`}>
                                {item.status === 'ativo' ? 'Ativo' : 'Pendente'}
                              </span>
                            </td>
                            <td className="px-8 py-5 text-[10px] text-slate-500 font-bold uppercase tracking-widest">{formatDate(item.data_entrada)}</td>
                            <td className="px-8 py-5 text-right font-bold text-primary text-sm tracking-wide">{formatMoney(item.comissao_gerada)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-12 text-center text-slate-500">
                      <span className="material-symbols-outlined text-4xl mb-4 opacity-50">group_off</span>
                      <p className="text-xs font-bold uppercase tracking-widest">Nenhuma indicação cadastrada ainda.</p>
                      <p className="text-[10px] mt-2">Compartilhe seu link para começar a gerar rebates no sistema institucional.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Referrals;
