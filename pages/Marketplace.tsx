import React, { useState, useEffect } from 'react';
import { supabase, Carteira, RentabilidadeMensal } from '../lib/supabase';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface CarteiraComposicao {
  id: string;
  ativo_nome: string;
  percentual: number;
  cor_hexa: string;
}

const Fundos: React.FC = () => {
  const [fundoGrao, setFundoGrao] = useState<Carteira | null>(null);
  const [historico, setHistorico] = useState<RentabilidadeMensal[]>([]);
  const [composicao, setComposicao] = useState<CarteiraComposicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const fetchFundoData = async () => {
      setLoading(true);
      // Fetch Fundo Grão
      const { data: carteiras } = await supabase
        .from('carteiras')
        .select('*')
        .eq('status', 'ativo')
        .limit(1);

      if (carteiras && carteiras.length > 0) {
        setFundoGrao(carteiras[0]);

        // Fetch histórico
        const { data: hist } = await supabase
          .from('rentabilidade_mensal')
          .select('*')
          .eq('carteira_id', carteiras[0].id)
          .order('ano', { ascending: true })
          .order('mes', { ascending: true });
        
        if (hist) setHistorico(hist);

        // Fetch Composição
        const { data: comp } = await supabase
          .from('composicao_carteira')
          .select('*')
          .eq('carteira_id', carteiras[0].id);

        if (comp) setComposicao(comp);
      }
      setLoading(false);
    };

    fetchFundoData();
  }, []);

  const chartData = historico.map(h => ({
    name: `${h.mes}/${h.ano}`,
    retorno: h.percentual_retorno
  }));

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <span className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase block mb-2">Wealth & Asset Management</span>
          <h1 className="text-3xl font-black text-white">Nossos Fundos Exclusivos</h1>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20 text-slate-500 text-xs uppercase tracking-widest animate-pulse">
          Sincronizando prateleira estruturada...
        </div>
      ) : fundoGrao ? (
        <div className="grid grid-cols-1 gap-8">
          {/* Card Principal - Fundo Grão */}
          <div className="bg-[#0a0f0e] border border-white/10 rounded overflow-hidden flex flex-col md:flex-row group transition-all duration-500 hover:border-primary/50">
            <div className="w-full md:w-2/5 relative h-64 md:h-auto overflow-hidden">
              <img 
                src={fundoGrao.imagem_url || "https://images.unsplash.com/photo-1594904351111-a072f80b1a71?q=80&w=800&auto=format&fit=crop"} 
                alt={fundoGrao.nome} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a0f0e]/50 via-transparent to-transparent"></div>
              
              <div className="absolute top-6 left-6 flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-background-dark/80 backdrop-blur-md text-primary text-[9px] font-black rounded-lg border border-primary/20 tracking-wider">
                  MULTI-APLICAÇÃO
                </span>
                <span className="px-3 py-1 bg-background-dark/80 backdrop-blur-md text-slate-300 text-[9px] font-black rounded-lg border border-white/10 tracking-wider">
                  ALTO ALFA
                </span>
              </div>
            </div>

            <div className="p-8 md:p-10 flex flex-col flex-grow md:w-3/5">
              <div className="mb-6">
                <h3 className="text-3xl font-bold text-white mb-2">{fundoGrao.nome}</h3>
                <p className="text-slate-400 text-sm font-light leading-relaxed">
                  {fundoGrao.descricao || 'Estratégia quantitativa focada em commodities globais e estrutura multiclasse com proteção atrelada. Operação executada por agentes institucionais.'}
                </p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8 border-b border-white/5 pb-8">
                <div>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Aporte Inicial</p>
                  <p className="text-white font-bold text-lg">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fundoGrao.aporte_minimo || 5000)}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Liquidez</p>
                  <p className="text-slate-300 font-bold text-lg uppercase">{fundoGrao.liquidez || 'D+30'}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Target Anual</p>
                  <p className="text-primary font-black text-lg">{(fundoGrao.rentabilidade_alvo_anual || 18)}%</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Status</p>
                  <p className="text-emerald-400 font-black text-base uppercase tracking-widest mb-1">Captação Aberta</p>
                </div>
              </div>

              <div className="mt-auto flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => setShowDetails(!showDetails)}
                  className="px-8 py-4 bg-[#050807] border border-white/10 text-white font-black text-xs uppercase tracking-widest hover:bg-white/5 transition-all text-center flex-1"
                >
                  {showDetails ? 'Ocultar Detalhes' : 'Ver Rentabilidade & Portfólio'}
                </button>
                <button className="px-8 py-4 bg-primary text-[#0a0f0e] font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all text-center flex-1 border border-primary">
                  Investir no Fundo Grão
                </button>
              </div>
            </div>
          </div>

          {/* DADOS DETALHADOS (SÓ APARECE AO CLICAR) */}
          {showDetails && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-primary/20 pt-8 animate-in fade-in slide-in-from-top-4 duration-500">
              
              {/* Gráfico de Histórico */}
              <div className="bg-[#050807] border border-white/5 p-8 relative">
                <span className="text-slate-500 text-[9px] font-bold uppercase tracking-[0.2em] mb-6 block">Rentabilidade Histórica (M/M)</span>
                {historico.length > 0 ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="renGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00c795" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#00c795" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 700}} dy={10} />
                        <YAxis hide />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#050807', border: '1px solid rgba(255,255,255,0.1)' }}
                          itemStyle={{ color: '#00c795', fontWeight: 'bold' }}
                          formatter={(val: number) => [`${val}%`, 'Retorno']}
                          labelStyle={{ color: '#94a3b8' }}
                        />
                        <Area type="monotone" dataKey="retorno" stroke="#00c795" strokeWidth={2} fill="url(#renGradient)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 w-full flex items-center justify-center text-[10px] text-slate-500 uppercase tracking-widest">
                    Sem histórico registrado (Atualize o Banco de Dados)
                  </div>
                )}
              </div>

              {/* Gráfico de Composição Multi-Aplicação */}
              <div className="bg-[#050807] border border-white/5 p-8 flex flex-col">
                <span className="text-slate-500 text-[9px] font-bold uppercase tracking-[0.2em] mb-6 block">Composição do Portfólio</span>
                
                {composicao.length > 0 ? (
                  <div className="flex items-center gap-8 flex-grow">
                    <div className="w-48 h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={composicao}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="percentual"
                          >
                            {composicao.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.cor_hexa || '#00c795'} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#050807', border: '1px solid rgba(255,255,255,0.1)' }}
                            itemStyle={{ color: '#white', fontWeight: 'bold' }}
                            formatter={(val: number, name: string, props: any) => [`${val}%`, props.payload.ativo_nome]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-3">
                      {composicao.map((c, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.cor_hexa || '#00c795' }}></span>
                            <span className="text-white font-medium">{c.ativo_nome}</span>
                          </div>
                          <span className="font-bold text-slate-400">{c.percentual}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex-grow flex items-center justify-center text-[10px] text-slate-500 uppercase tracking-widest border border-dashed border-white/10 p-6">
                    Mapeamento de ativos vazio. (Preencha a tabela `composicao_carteira` no banco)
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[#0a0f0e] border border-white/5 p-12 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">
          Nenhum fundo encontrado no momento. Verifique a tabela `carteiras`.
        </div>
      )}
    </div>
  );
};

export default Fundos;
