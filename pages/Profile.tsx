import React, { useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// Configure o link do especialista aqui (WhatsApp, Calendly, email, etc.)
const ESPECIALISTA_URL = 'https://wa.me/5511XXXXXXXXX';

const Profile: React.FC = () => {
  const { signOut, profile, user, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showResgate, setShowResgate] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) {
      return;
    }
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}-${Math.random()}.${fileExt}`;

    setUploading(true);

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Erro ao fazer upload da imagem:', uploadError);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id);

    await refreshProfile();
    setUploading(false);
  };

  const handleEditClick = () => {
    if (fileInputRef.current && !uploading) {
      fileInputRef.current.click();
    }
  };

  return (
    <>
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ color: '#10b981', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, display: 'block', marginBottom: 6 }}>
          Conta e Governança
        </span>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: 0 }}>Seu Perfil</h1>
      </div>

      {/* Profile Card */}
      <div style={{ background: '#18181b', borderRadius: 16, padding: '28px 24px', border: '1px solid rgba(255,255,255,0.04)', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            style={{ display: 'none' }} 
            accept="image/*"
          />
          <img 
            src={profile?.avatar_url || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"} 
            alt="User Profile" 
            style={{ 
              width: 96, height: 96, objectFit: 'cover', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)',
              filter: uploading ? 'blur(4px)' : 'none', opacity: uploading ? 0.5 : 1, transition: 'all 0.3s'
            }}
          />
          <button 
            onClick={handleEditClick}
            disabled={uploading}
            style={{ 
              position: 'absolute', bottom: -6, right: -6, width: 28, height: 28, background: '#10b981', color: '#000', border: '2px solid #18181b', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: uploading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
              opacity: uploading ? 0.5 : 1
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              {uploading ? 'hourglass_empty' : 'edit'}
            </span>
          </button>
        </div>
        
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: '0 0 4px', textTransform: 'uppercase' as const, letterSpacing: '-0.01em' }}>
            {profile?.nome || 'Investidor Institucional'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ padding: '3px 10px', background: 'rgba(16,185,129,0.08)', color: '#10b981', fontSize: 9, fontWeight: 700, borderRadius: 6, border: '1px solid rgba(16,185,129,0.15)', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
              {profile?.tipo_investidor === 'qualificado' ? 'Qualificado' : profile?.tipo_investidor === 'profissional' ? 'Profissional' : 'Pro'}
            </span>
            <span style={{ color: '#52525b', fontSize: 12, fontWeight: 500 }}>{profile?.email || 'email@okai.com'}</span>
          </div>

          <div style={{ display: 'flex', gap: 24, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.04)', flexWrap: 'wrap' }}>
            <div>
              <p style={{ color: '#52525b', fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, margin: '0 0 4px' }}>Status de Risco</p>
              <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0 }}>Conservador-Agressivo</p>
            </div>
            <div style={{ paddingLeft: 24, borderLeft: '1px solid rgba(255,255,255,0.04)' }}>
              <p style={{ color: '#52525b', fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, margin: '0 0 4px' }}>Onboarding Institucional</p>
              <p style={{ color: '#34d399', fontWeight: 700, fontSize: 12, textTransform: 'uppercase' as const, margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                Concluído <span className="material-symbols-outlined" style={{ fontSize: 14 }}>verified</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {/* Security Card */}
        <div style={{ background: '#18181b', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.04)' }}>
          <h3 style={{ color: '#fff', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: '0 0 20px', paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            Protocolos de Segurança
          </h3>
          <div>
            {[
              { label: 'Biometria Dactilar', status: 'Ativado', icon: 'fingerprint' },
              { label: 'Aprovação de Saque Multi-Level', status: 'Em Análise', icon: 'gpp_maybe' },
              { label: 'Dispositivos Confiáveis', status: '2 Ativos', icon: 'devices' },
            ].map((s) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="material-symbols-outlined" style={{ color: '#52525b', fontSize: 18 }}>{s.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#d4d4d8' }}>{s.label}</span>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: s.status === 'Ativado' ? '#10b981' : '#52525b' }}>{s.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Support Card */}
        <div style={{ background: '#18181b', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.04)' }}>
          <h3 style={{ color: '#fff', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: '0 0 20px', paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            Suporte & Documentos
          </h3>
          <div>
            {[
              { label: 'Relatório de Imposto de Renda', dsc: 'Ano Ref. 2023', icon: 'description' },
              { label: 'Termos de Adesão do Fundo', dsc: 'Grão Alpha', icon: 'gavel' },
              { label: 'Atendimento Private', dsc: 'SLA 4 Horas', icon: 'support_agent' },
            ].map((s) => (
              <button key={s.label} style={{ 
                width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px', 
                borderBottom: '1px solid rgba(255,255,255,0.03)', background: 'transparent', border: 'none', borderBottomStyle: 'solid', 
                borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.2s'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="material-symbols-outlined" style={{ color: '#52525b', fontSize: 18 }}>{s.icon}</span>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#d4d4d8', display: 'block' }}>{s.label}</span>
                    <span style={{ fontSize: 9, color: '#52525b', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>{s.dsc}</span>
                  </div>
                </div>
                <span className="material-symbols-outlined" style={{ color: '#3f3f46', fontSize: 16 }}>arrow_forward</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Resgatar */}
      <button
        onClick={() => setShowResgate(true)}
        style={{
          width: '100%', padding: '16px 20px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: 12,
          color: '#10b981', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.15em',
          cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' as const, marginBottom: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>payments</span>
        Resgatar Investimento
      </button>

      {/* Logout */}
      <button
        onClick={signOut}
        style={{ 
          width: '100%', padding: '16px 20px', background: '#18181b', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 12,
          color: '#ef4444', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.15em',
          cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center'
        }}
      >
        Encerrar Sessão Segura
      </button>
    </div>

    {/* ── Resgate Modal ───────────────────────────────────────────── */}
    {showResgate && (
      <div
        onClick={() => setShowResgate(false)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '36px 32px', maxWidth: 420, width: '100%', textAlign: 'center' as const }}
        >
          {/* Icon */}
          <div style={{ width: 68, height: 68, background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.14)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 30, color: '#10b981' }}>hourglass_top</span>
          </div>

          <span style={{ color: '#10b981', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, display: 'block', marginBottom: 10 }}>
            Em Breve
          </span>
          <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '0 0 12px', lineHeight: 1.2 }}>
            Resgate em implantação
          </h2>
          <p style={{ color: '#71717a', fontSize: 13, lineHeight: 1.65, margin: '0 0 28px' }}>
            A funcionalidade de resgate online está em desenvolvimento. Para solicitações imediatas, fale diretamente com seu especialista dedicado.
          </p>

          <a
            href={ESPECIALISTA_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '14px 20px', background: '#10b981', borderRadius: 12, color: '#000', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.15em', cursor: 'pointer', textDecoration: 'none', marginBottom: 10, boxSizing: 'border-box' as const }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>support_agent</span>
            Falar com Especialista
          </a>

          <button
            onClick={() => setShowResgate(false)}
            style={{ width: '100%', padding: '12px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', color: '#71717a', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.1em', borderRadius: 12, cursor: 'pointer' }}
          >
            Fechar
          </button>
        </div>
      </div>
    )}
    </>
  );
};

export default Profile;
