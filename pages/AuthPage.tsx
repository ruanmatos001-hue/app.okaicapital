import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

type AuthMode = 'login' | 'cadastro';

interface AuthPageProps {
  initialMode?: AuthMode;
  onBack?: () => void;
}

const maskCPF = (v: string) => {
  return v.replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

const maskTelefone = (v: string) => {
  return v.replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

const validateCPF = (cpf: string): boolean => {
  const c = cpf.replace(/\D/g, '');
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(c[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(c[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(c[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(c[10]);
};

const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'login', onBack }) => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

  const [cadNome, setCadNome] = useState('');
  const [cadEmail, setCadEmail] = useState('');
  const [cadCPF, setCadCPF] = useState('');
  const [cadTel, setCadTel] = useState('');
  const [cadPass, setCadPass] = useState('');
  const [cadPassConf, setCadPassConf] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(loginEmail, loginPass);
    if (error) {
      setError(error.includes('Invalid login') ? 'Email ou senha incorretos.' : error);
    }
    setLoading(false);
  };

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateCPF(cadCPF)) { setError('CPF inválido.'); return; }
    if (cadPass.length < 6) { setError('Mínimo 6 caracteres na senha.'); return; }
    if (cadPass !== cadPassConf) { setError('As senhas divergem.'); return; }

    setLoading(true);
    const { error } = await signUp({
      email: cadEmail,
      password: cadPass,
      nome: cadNome,
      cpf: cadCPF,
      telefone: cadTel,
    });

    if (error) {
      if (error.includes('already registered')) setError('Email já em uso.');
      else setError(error);
    } else {
      setSuccess('Solicitação recebida. Verifique sua caixa de entrada.');
      setCadNome(''); setCadEmail(''); setCadCPF(''); setCadTel(''); setCadPass(''); setCadPassConf('');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#050807] flex items-center justify-center font-display px-4">
      {/* Background patterns and deep elegant feel */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20" style={{ background: 'radial-gradient(circle at top right, rgba(0, 199, 149, 0.15), transparent 40%)' }}></div>
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="w-full max-w-[420px] relative z-10">
        
        {/* Superior Header */}
        <div className="mb-10 text-center">
          {onBack && (
            <button onClick={onBack} className="mb-6 mx-auto text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-base">arrow_back</span> Retornar
            </button>
          )}
          <div className="flex justify-center items-center gap-3 mb-4">
            <div className="w-10 h-10 border border-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
            </div>
            <span className="text-2xl font-black uppercase tracking-widest text-white">OKAI <span className="font-light text-slate-500">CAPITAL</span></span>
          </div>
          <p className="text-slate-400 text-sm font-light">
            {mode === 'login' ? 'Ecossistema Institucional' : 'Solicitação de Abertura'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#0a0f0e] border border-white/5 p-8 sm:p-10 shadow-2xl">
          
          {/* Tabs */}
          <div className="flex border-b border-white/10 mb-8">
            <button
              onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
              className={`flex-1 pb-4 text-xs font-bold uppercase tracking-[0.2em] transition-all ${mode === 'login' ? 'text-primary border-b-2 border-primary' : 'text-slate-500 hover:text-white'}`}
            >
              Acesso
            </button>
            <button
              onClick={() => { setMode('cadastro'); setError(null); setSuccess(null); }}
              className={`flex-1 pb-4 text-xs font-bold uppercase tracking-[0.2em] transition-all ${mode === 'cadastro' ? 'text-primary border-b-2 border-primary' : 'text-slate-500 hover:text-white'}`}
            >
              Novo Cliente
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-500/5 text-rose-500 border border-rose-500/20 text-xs font-medium uppercase tracking-wider text-center">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-primary/5 text-emerald-400 border border-primary/20 text-xs font-medium uppercase tracking-wider text-center">
              {success}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-2">Email Corporativo / Pessoal</label>
                <input
                  type="email" required
                  value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                  className="w-full bg-[#050807] border border-white/10 text-white p-4 focus:outline-none focus:border-primary transition-colors text-sm font-medium"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Senha de Acesso</label>
                  <a href="#" className="text-[10px] text-primary uppercase font-bold tracking-widest hover:text-emerald-400">Recuperar</a>
                </div>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'} required
                    value={loginPass} onChange={e => setLoginPass(e.target.value)}
                    className="w-full bg-[#050807] border border-white/10 text-white p-4 pr-12 focus:outline-none focus:border-primary transition-colors text-sm font-medium"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-4 text-slate-500 hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-lg">{showPass ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-widest py-5 mt-4 transition-all disabled:opacity-50">
                {loading ? 'Autenticando...' : 'Acessar Conta'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCadastro} className="space-y-5">
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-2">Nome Completo</label>
                <input
                  type="text" required
                  value={cadNome} onChange={e => setCadNome(e.target.value)}
                  className="w-full bg-[#050807] border border-white/10 text-white p-3 focus:outline-none focus:border-primary transition-colors text-sm"
                />
              </div>
              <div className="flex justify-between gap-4">
                <div className="w-1/2">
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-2">CPF</label>
                  <input
                    type="text" required maxLength={14}
                    value={cadCPF} onChange={e => setCadCPF(maskCPF(e.target.value))}
                    className="w-full bg-[#050807] border border-white/10 text-white p-3 focus:outline-none focus:border-primary transition-colors text-sm"
                  />
                </div>
                <div className="w-1/2">
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-2">Telefone</label>
                  <input
                    type="tel" required maxLength={15}
                    value={cadTel} onChange={e => setCadTel(maskTelefone(e.target.value))}
                    className="w-full bg-[#050807] border border-white/10 text-white p-3 focus:outline-none focus:border-primary transition-colors text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-2">Email</label>
                <input
                  type="email" required
                  value={cadEmail} onChange={e => setCadEmail(e.target.value)}
                  className="w-full bg-[#050807] border border-white/10 text-white p-3 focus:outline-none focus:border-primary transition-colors text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-2">Definir Senha</label>
                <input
                  type="password" required
                  value={cadPass} onChange={e => setCadPass(e.target.value)}
                  className="w-full bg-[#050807] border border-white/10 text-white p-3 focus:outline-none focus:border-primary transition-colors text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-2">Confirmar Senha</label>
                <input
                  type="password" required
                  value={cadPassConf} onChange={e => setCadPassConf(e.target.value)}
                  className="w-full bg-[#050807] border border-white/10 text-white p-3 focus:outline-none focus:border-primary transition-colors text-sm"
                />
              </div>
              
              <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-widest py-5 mt-4 transition-all disabled:opacity-50">
                {loading ? 'Processando...' : 'Solicitar Conta'}
              </button>
            </form>
          )}
        </div>
        
        <div className="flex gap-6 justify-center mt-10 text-[9px] font-bold uppercase tracking-widest text-slate-600">
          <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">security</span> SSL 256-Bit</span>
          <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">balance</span> CVM & ANBIMA</span>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
