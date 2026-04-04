import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Profile: React.FC = () => {
  const { signOut, profile } = useAuth();

  return (
    <div className="space-y-8 animate-fade-in-up md:max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <span className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase block mb-2">Conta e Governança</span>
          <h1 className="text-3xl font-black text-white">Seu Perfil</h1>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 bg-[#0a0f0e] border border-white/5 p-8 sm:p-10">
        <div className="relative">
          <img 
            src={profile?.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&h=200&auto=format&fit=crop"} 
            alt="User Profile" 
            className="w-28 h-28 object-cover border border-white/20 grayscale hover:grayscale-0 transition-all duration-500"
          />
          <button className="absolute -bottom-3 -right-3 w-8 h-8 bg-primary text-[#0a0f0e] border border-[#0a0f0e] flex items-center justify-center hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[1rem]">edit</span>
          </button>
        </div>
        
        <div className="flex-grow text-center sm:text-left mt-2 sm:mt-0">
          <h2 className="text-2xl font-bold text-white mb-1 uppercase tracking-tight">{profile?.nome || 'Investidor Institucional'}</h2>
          <div className="flex items-center justify-center sm:justify-start gap-3 mt-2 mb-6">
            <span className="px-3 py-1 bg-primary/10 text-primary text-[9px] font-black uppercase tracking-[0.2em] border border-primary/20">
              {profile?.tipo_investidor === 'qualificado' ? 'Qualificado' : profile?.tipo_investidor === 'profissional' ? 'Profissional' : 'Pro'}
            </span>
            <span className="text-slate-500 text-xs font-semibold">{profile?.email || 'email@okai.com'}</span>
          </div>

          <div className="flex flex-wrap justify-center sm:justify-start gap-4 pt-4 border-t border-white/5">
            <div>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Status de Risco</p>
              <p className="text-white text-sm font-bold tracking-widest">Conservador-Agressivo</p>
            </div>
            <div className="pl-0 sm:pl-6 sm:border-l border-white/5">
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Onboarding Institucional</p>
              <p className="text-emerald-400 font-bold text-xs uppercase flex items-center gap-1">
                Concluído <span className="material-symbols-outlined text-[14px]">verified</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#050807] border border-white/5 p-8 flex flex-col">
          <h3 className="text-white text-sm font-black uppercase tracking-widest mb-8 border-b border-light/5 pb-4">Protocolos de Segurança</h3>
          <div className="space-y-3 flex-grow">
            {[
              { label: 'Biometria Dactilar', status: 'Ativado', icon: 'fingerprint' },
              { label: 'Aprovação de Saque Multi-Level', status: 'Em Análise', icon: 'gpp_maybe' },
              { label: 'Dispositivos Confiáveis', status: '2 Ativos', icon: 'devices' },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 group">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-500 text-[18px] group-hover:text-primary transition-colors">{s.icon}</span>
                  <span className="text-xs font-medium text-slate-300">{s.label}</span>
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest ${s.status === 'Ativado' ? 'text-primary' : 'text-slate-500'}`}>{s.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#050807] border border-white/5 p-8 flex flex-col">
          <h3 className="text-white text-sm font-black uppercase tracking-widest mb-8 border-b border-light/5 pb-4">Suporte & Documentos</h3>
          <div className="space-y-3 flex-grow">
             {[
              { label: 'Relatório de Imposto de Renda', dsc: 'Ano Ref. 2023', icon: 'description' },
              { label: 'Termos de Adesão do Fundo', dsc: 'Grão Alpha', icon: 'gavel' },
              { label: 'Atendimento Private', dsc: 'SLA 4 Horas', icon: 'support_agent' },
            ].map((s) => (
              <button key={s.label} className="w-full text-left flex items-center justify-between py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-all p-2 -mx-2 rounded">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-500 text-[18px]">{s.icon}</span>
                  <div>
                    <span className="text-xs font-bold text-slate-300 block">{s.label}</span>
                    <span className="text-[9px] text-slate-500 font-bold tracking-widest uppercase">{s.dsc}</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-slate-600 text-[16px]">arrow_forward</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="pt-4">
        <button 
          onClick={signOut}
          className="w-full py-5 bg-[#0a0f0e] border border-rose-500/20 text-rose-500 font-black text-xs uppercase tracking-[0.2em] hover:bg-rose-500/10 transition-all text-center"
        >
          Encerrar Sessão Segura
        </button>
      </div>
    </div>
  );
};

export default Profile;
