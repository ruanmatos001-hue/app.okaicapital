import React, { useState, useEffect } from 'react';
import { supabase, Carteira, RentabilidadeMensal } from '../lib/supabase';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// ── Configuração PIX ────────────────────────────────────────────────────────
// Preencha os dados abaixo para o sistema gerar o QR code automaticamente.
const PIX_CONFIG = {
  chave: 'PREENCHA_SUA_CHAVE_PIX_AQUI', // CPF, CNPJ, e-mail, telefone ou EVP
  nome: 'OKAI CAPITAL GESTORA',          // Máx 25 caracteres
  cidade: 'SAO PAULO',                   // Máx 15 caracteres
};

function crc16ccitt(str: string): number {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xFFFF;
    }
  }
  return crc;
}

function buildPixPayload(valor: number): string {
  const f = (id: string, v: string) => `${id}${v.length.toString().padStart(2, '0')}${v}`;
  const gui = f('00', 'BR.GOV.BCB.PIX') + f('01', PIX_CONFIG.chave);
  const nome = PIX_CONFIG.nome.substring(0, 25).toUpperCase();
  const cidade = PIX_CONFIG.cidade.substring(0, 15).toUpperCase();
  const txid = 'OKAIGRAO' + Date.now().toString().slice(-8);
  const body =
    f('00', '01') +
    f('26', gui) +
    f('52', '0000') +
    f('53', '986') +
    f('54', valor.toFixed(2)) +
    f('58', 'BR') +
    f('59', nome) +
    f('60', cidade) +
    f('62', f('05', txid)) +
    '6304';
  return body + crc16ccitt(body).toString(16).toUpperCase().padStart(4, '0');
}

const VALOR_CHIPS = [250, 500, 1000] as const;

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
  const [showInvest, setShowInvest] = useState(false);
  const [activeTab, setActiveTab] = useState<'pix' | 'cartao'>('pix');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [copied, setCopied] = useState(false);

  const investAmount = selectedAmount === -1
    ? (parseFloat(customAmount.replace(',', '.')) || 0)
    : (selectedAmount ?? 0);
  const pixPayload = investAmount >= 1 ? buildPixPayload(investAmount) : '';
  const qrUrl = pixPayload
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(pixPayload)}&ecc=M`
    : '';

  const copyPix = async () => {
    if (!pixPayload) return;
    await navigator.clipboard.writeText(pixPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const openInvest = () => {
    setShowInvest(true);
    setActiveTab('pix');
    setSelectedAmount(null);
    setCustomAmount('');
    setCopied(false);
  };

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
    <>
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
                <button onClick={openInvest} style={{ flex: 1, padding: '14px 16px', background: '#10b981', border: 'none', color: '#000', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.1em', borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s' }}>
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

    {/* ── Modal de Aporte ─────────────────────────────────────────────────── */}
    {showInvest && (
      <div
        onClick={() => setShowInvest(false)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(12px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '28px 28px 32px', maxWidth: 480, width: '100%', animation: 'fadeInUp 0.3s ease' }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <span style={{ color: '#10b981', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, display: 'block', marginBottom: 4 }}>Novo Aporte</span>
              <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: 0 }}>Fundo Grão</h2>
            </div>
            <button onClick={() => setShowInvest(false)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#71717a' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: '#0a0a0a', borderRadius: 10, padding: 4 }}>
            {(['pix', 'cartao'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' as const, cursor: 'pointer', transition: 'all 0.2s',
                  background: activeTab === tab ? '#18181b' : 'transparent',
                  color: activeTab === tab ? '#fff' : '#52525b',
                  boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,0.4)' : 'none',
                }}
              >
                {tab === 'pix' ? '⬡ PIX' : '◻ Cartão'}
              </button>
            ))}
          </div>

          {/* PIX Tab */}
          {activeTab === 'pix' && (
            <div>
              <p style={{ color: '#71717a', fontSize: 12, margin: '0 0 16px' }}>Selecione o valor do aporte:</p>

              {/* Chips de valor */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                {VALOR_CHIPS.map(v => (
                  <button
                    key={v}
                    onClick={() => { setSelectedAmount(v); setCustomAmount(''); }}
                    style={{ padding: '12px 6px', borderRadius: 10, border: `1px solid ${selectedAmount === v ? '#10b981' : 'rgba(255,255,255,0.07)'}`, background: selectedAmount === v ? 'rgba(16,185,129,0.12)' : '#0a0a0a', color: selectedAmount === v ? '#10b981' : '#a1a1aa', fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' as const }}
                  >
                    R${v >= 1000 ? `${v / 1000}K` : v}
                  </button>
                ))}
                <button
                  onClick={() => setSelectedAmount(-1)}
                  style={{ padding: '12px 6px', borderRadius: 10, border: `1px solid ${selectedAmount === -1 ? '#10b981' : 'rgba(255,255,255,0.07)'}`, background: selectedAmount === -1 ? 'rgba(16,185,129,0.12)' : '#0a0a0a', color: selectedAmount === -1 ? '#10b981' : '#a1a1aa', fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' as const }}
                >
                  Outros
                </button>
              </div>

              {/* Input valor customizado */}
              {selectedAmount === -1 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#10b981', fontWeight: 700, fontSize: 13 }}>R$</span>
                    <input
                      type="number"
                      placeholder="0,00"
                      value={customAmount}
                      onChange={e => setCustomAmount(e.target.value)}
                      style={{ width: '100%', padding: '12px 14px 12px 40px', background: '#0a0a0a', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 700, outline: 'none', boxSizing: 'border-box' as const }}
                    />
                  </div>
                  {investAmount > 0 && investAmount < 250 && (
                    <p style={{ color: '#f59e0b', fontSize: 11, margin: '6px 0 0', letterSpacing: '0.05em' }}>⚠ Aporte mínimo recomendado: R$ 250</p>
                  )}
                </div>
              )}

              {/* QR Code */}
              {investAmount >= 1 && (
                <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 16, padding: '20px 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 16 }}>
                  <span style={{ color: '#52525b', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>
                    QR Code — {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(investAmount)}
                  </span>
                  <div style={{ padding: 12, background: '#fff', borderRadius: 12 }}>
                    <img src={qrUrl} alt="QR Code PIX" width={200} height={200} style={{ display: 'block', borderRadius: 4 }} />
                  </div>
                  <p style={{ color: '#52525b', fontSize: 11, textAlign: 'center' as const, margin: 0, lineHeight: 1.5 }}>
                    Abra seu banco, escaneie o QR code<br />e confirme o aporte no Fundo Grão.
                  </p>
                </div>
              )}

              {/* Copiar código PIX */}
              {investAmount >= 1 && (
                <button
                  onClick={copyPix}
                  style={{ width: '100%', padding: '13px 16px', background: copied ? 'rgba(16,185,129,0.15)' : '#18181b', border: `1px solid ${copied ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, color: copied ? '#10b981' : '#a1a1aa', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.1em', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxSizing: 'border-box' as const }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{copied ? 'check_circle' : 'content_copy'}</span>
                  {copied ? 'Código copiado!' : 'Copiar código PIX'}
                </button>
              )}

              {investAmount < 1 && (
                <div style={{ padding: '20px 0', textAlign: 'center' as const, color: '#3f3f46', fontSize: 12 }}>
                  Selecione um valor para gerar o QR code
                </div>
              )}
            </div>
          )}

          {/* Cartão Tab */}
          {activeTab === 'cartao' && (
            <div style={{ padding: '32px 0', textAlign: 'center' as const }}>
              <div style={{ width: 64, height: 64, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#3f3f46' }}>credit_card</span>
              </div>
              <span style={{ color: '#52525b', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, display: 'block', marginBottom: 10 }}>Em Breve</span>
              <p style={{ color: '#71717a', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                Pagamento via cartão de crédito<br />estará disponível em breve.
              </p>
            </div>
          )}
        </div>
      </div>
    )}
    </>
  );
};

export default Fundos;
