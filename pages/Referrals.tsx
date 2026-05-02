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
  const [copied, setCopied] = useState(false);

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
  const aReceber = totalFaturado * 0.12; 

  const referralLink = `https://okaicapital.com/p/usr_${user?.id?.substring(0, 5) || 'demo'}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ color: '#10b981', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, display: 'block', marginBottom: 6 }}>
          Network Privado
        </span>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: 0 }}>Programa de Partnership</h1>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 32, height: 32, border: '2px solid #10b981', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#52525b', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>Calculando rede institucional...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Total Faturado', value: formatMoney(totalFaturado), sub: 'Vitalício', icon: 'stars' },
              { label: 'A Receber', value: formatMoney(aReceber), sub: 'Liquidação D+5', icon: 'payments' },
              { label: 'Parceiros Ativos', value: parceirosAtivos.toString(), sub: 'Convertidos', icon: 'groups' },
            ].map((stat) => (
              <div key={stat.label} style={{ background: '#18181b', borderRadius: 14, padding: '20px 16px', border: '1px solid rgba(255,255,255,0.04)', transition: 'border-color 0.3s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <span style={{ color: '#52525b', fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>{stat.label}</span>
                  <span className="material-symbols-outlined" style={{ color: '#10b981', fontSize: 18 }}>
                    {stat.icon}
                  </span>
                </div>
                <p style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>
                  {stat.label === 'Parceiros Ativos' ? stat.value : stat.value.replace('R$', '').trim()}
                  {stat.label !== 'Parceiros Ativos' && <span style={{ fontSize: 12, fontWeight: 400, color: '#52525b', marginLeft: 4 }}>BRL</span>}
                </p>
                <p style={{ color: '#10b981', fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, margin: 0 }}>{stat.sub}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
            {/* Referral Link Card */}
            <div style={{ background: '#18181b', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.04)' }}>
              <h3 style={{ color: '#fff', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: '0 0 20px', paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                Link de Convite
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ position: 'relative' }}>
                  <input 
                    readOnly 
                    value={referralLink} 
                    style={{ width: '100%', background: '#111113', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 42px 12px 14px', fontSize: 12, fontFamily: 'monospace', color: '#71717a', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <button 
                    onClick={handleCopy}
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: copied ? '#10b981' : '#52525b', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{copied ? 'check' : 'content_copy'}</span>
                  </button>
                </div>

                <div style={{ background: '#fff', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${referralLink}`} 
                    alt="QR Code" 
                    style={{ width: 120, height: 120 }}
                  />
                  <p style={{ fontSize: 10, color: '#52525b', textTransform: 'uppercase' as const, letterSpacing: '0.15em', fontWeight: 700, margin: 0 }}>Apresente este QR</p>
                </div>

                <a 
                  href={`https://wa.me/?text=Abra%20sua%20conta%20na%20Okai%20Capital%20usando%20meu%20c%C3%B3digo%20de%20indica%C3%A7%C3%A3o%3A%20usr_${user?.id?.substring(0, 5) || 'demo'}%0A%0AAcesse%3A%20https%3A%2F%2Fokaicapital.com%2F`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(37,211,102,0.08)', color: '#25D366', border: '1px solid rgba(37,211,102,0.15)', borderRadius: 10, padding: '12px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, textDecoration: 'none', transition: 'all 0.2s' }}
                >
                  Compartilhar via WhatsApp
                </a>

                <div style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.1)', borderRadius: 10, padding: 14 }}>
                  <p style={{ fontSize: 11, color: '#71717a', lineHeight: 1.6, fontWeight: 500, margin: 0 }}>
                    Ganhe <span style={{ color: '#10b981', fontWeight: 700 }}>1.5%</span> de rebate institucional sobre cada aporte realizado por investidores estruturados via seu link.
                  </p>
                </div>
              </div>
            </div>

            {/* List Card */}
            <div style={{ background: '#18181b', borderRadius: 16, border: '1px solid rgba(255,255,255,0.04)', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ color: '#fff', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: 0 }}>Suas Indicações</h3>
                {indicacoes.length > 0 && (
                  <button style={{ color: '#10b981', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', background: 'none', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>
                    Exportar Extrato
                  </button>
                )}
              </div>
              
              <div style={{ overflowX: 'auto' }}>
                {indicacoes.length > 0 ? (
                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#111113' }}>
                        <th style={{ padding: '12px 24px', fontSize: 10, color: '#52525b', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>Investidor</th>
                        <th style={{ padding: '12px 24px', fontSize: 10, color: '#52525b', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>Status</th>
                        <th style={{ padding: '12px 24px', fontSize: 10, color: '#52525b', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>Data</th>
                        <th style={{ padding: '12px 24px', fontSize: 10, color: '#52525b', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, textAlign: 'right' }}>Rebate Gerado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {indicacoes.map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}>
                          <td style={{ padding: '14px 24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.04)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', textTransform: 'uppercase' as const }}>
                                {item.indicado_nome.split(' ').map(n => n[0]).join('').substring(0, 2)}
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#d4d4d8' }}>{item.indicado_nome}</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 24px' }}>
                            <span style={{
                              padding: '3px 8px',
                              fontSize: 9,
                              fontWeight: 700,
                              letterSpacing: '0.1em',
                              textTransform: 'uppercase' as const,
                              borderRadius: 4,
                              border: '1px solid',
                              ...(item.status === 'ativo'
                                ? { background: 'rgba(16,185,129,0.08)', color: '#10b981', borderColor: 'rgba(16,185,129,0.2)' }
                                : { background: 'rgba(113,113,122,0.08)', color: '#71717a', borderColor: 'rgba(113,113,122,0.2)' })
                            }}>
                              {item.status === 'ativo' ? 'Ativo' : 'Pendente'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 24px', fontSize: 10, color: '#52525b', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>{formatDate(item.data_entrada)}</td>
                          <td style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 700, color: '#10b981', fontSize: 13 }}>{formatMoney(item.comissao_gerada)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, textAlign: 'center', color: '#52525b' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>group_off</span>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: '0 0 6px' }}>Nenhuma indicação cadastrada ainda.</p>
                    <p style={{ fontSize: 11, margin: 0 }}>Compartilhe seu link para começar a gerar rebates no sistema institucional.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Referrals;
