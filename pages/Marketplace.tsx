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
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ color: '#10b981', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, display: 'block', marginBottom: 6 }}>
          Wealth & Asset Management
        </span>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: 0 }}>Nossos Fundos Exclusivos</h1>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 32, height: 32, border: '2px solid #10b981', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#52525b', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>Sincronizando prateleira estruturada...</p>
          </div>
        </div>
      ) : fundoGrao ? (
        <div>
          {/* Card Principal - Fundo Grão */}
          <div style={{ background: '#18181b', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', marginBottom: showDetails ? 0 : 24, transition: 'all 0.3s' }}>
            {/* Image Section */}
            <div style={{ position: 'relative', height: 200, overflow: 'hidden' }}>
              <img 
                src={fundoGrao.imagem_url || "https://images.unsplash.com/photo-1594904351111-a072f80b1a71?q=80&w=800&auto=format&fit=crop"} 
                alt={fundoGrao.nome} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #18181b 0%, transparent 60%)' }} />
              
              <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 6 }}>
                <span style={{ padding: '4px 10px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', color: '#10b981', fontSize: 9, fontWeight: 700, borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
                  MULTI-APLICAÇÃO
                </span>
                <span style={{ padding: '4px 10px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', color: '#a1a1aa', fontSize: 9, fontWeight: 700, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
                  ALTO ALFA
                </span>
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: '20px 24px 24px' }}>
              <h3 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>{fundoGrao.nome}</h3>
              <p style={{ color: '#71717a', fontSize: 13, lineHeight: 1.6, margin: '0 0 20px' }}>
                {fundoGrao.descricao || 'Estratégia quantitativa focada em commodities globais e estrutura multiclasse com proteção atrelada. Operação executada por agentes institucionais.'}
              </p>

              {/* Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Aporte Inicial', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fundoGrao.aporte_minimo || 5000) },
                  { label: 'Liquidez', value: fundoGrao.liquidez || 'D+30' },
                  { label: 'Target Anual', value: `${fundoGrao.rentabilidade_alvo_anual || 18}%`, highlight: true },
                  { label: 'Status', value: 'Captação Aberta', status: true },
                ].map((s, i) => (
                  <div key={i} style={{ background: '#111113', borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <p style={{ color: '#52525b', fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, margin: '0 0 6px' }}>{s.label}</p>
                    <p style={{ color: s.highlight ? '#10b981' : s.status ? '#34d399' : '#fff', fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: s.status ? '0.05em' : 'normal', textTransform: s.status ? 'uppercase' as const : 'none' as const }}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button 
                  onClick={() => setShowDetails(!showDetails)}
                  style={{ flex: 1, padding: '14px 16px', background: '#111113', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.1em', borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  {showDetails ? 'Ocultar Detalhes' : 'Ver Rentabilidade & Portfólio'}
                </button>
                <button style={{ flex: 1, padding: '14px 16px', background: '#10b981', border: 'none', color: '#000', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.1em', borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s' }}>
                  Investir no Fundo Grão
                </button>
              </div>
            </div>
          </div>

          {/* DADOS DETALHADOS */}
          {showDetails && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, paddingTop: 12, animation: 'fadeInUp 0.4s ease' }}>
              {/* Gráfico de Histórico */}
              <div style={{ background: '#18181b', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ color: '#71717a', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, display: 'block', marginBottom: 20 }}>
                  Rentabilidade Histórica (M/M)
                </span>
                {historico.length > 0 ? (
                  <div style={{ height: 220, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="renGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#52525b', fontSize: 10, fontWeight: 600}} dy={10} />
                        <YAxis hide />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                          itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                          formatter={(val: number) => [`${val}%`, 'Retorno']}
                          labelStyle={{ color: '#71717a' }}
                        />
                        <Area type="monotone" dataKey="retorno" stroke="#10b981" strokeWidth={2} fill="url(#renGradient)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525b', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
                    Sem histórico registrado (Atualize o Banco de Dados)
                  </div>
                )}
              </div>

              {/* Gráfico de Composição Multi-Aplicação */}
              <div style={{ background: '#18181b', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ color: '#71717a', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, display: 'block', marginBottom: 20 }}>
                  Composição do Portfólio
                </span>
                
                {composicao.length > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
                    <div style={{ width: 180, height: 180 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={composicao}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="percentual"
                          >
                            {composicao.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.cor_hexa || '#10b981'} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                            itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                            formatter={(val: number, name: string, props: any) => [`${val}%`, props.payload.ativo_nome]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      {composicao.map((c, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: idx < composicao.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.cor_hexa || '#10b981', display: 'inline-block' }} />
                            <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{c.ativo_nome}</span>
                          </div>
                          <span style={{ fontWeight: 700, color: '#71717a', fontSize: 13 }}>{c.percentual}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, color: '#52525b', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' as const, border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 10 }}>
                    Mapeamento de ativos vazio. (Preencha a tabela `composicao_carteira` no banco)
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: '#18181b', borderRadius: 16, padding: 48, textAlign: 'center', color: '#52525b', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', fontSize: 11, border: '1px solid rgba(255,255,255,0.04)' }}>
          Nenhum fundo encontrado no momento. Verifique a tabela `carteiras`.
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Fundos;
