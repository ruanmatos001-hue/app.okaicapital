import React, { useState, useEffect } from 'react';

interface LandingPageProps {
  onLogin: () => void;
  onCadastro: () => void;
}

const STATS = [
  { label: 'Patrimônio Administrado', value: 'R$ 2.4B+', icon: 'account_balance' },
  { label: 'Famílias Atendidas', value: '450+', icon: 'real_estate_agent' },
  { label: 'Alpha Gerado (12m)', value: '+8,4%', icon: 'show_chart' },
  { label: 'Track Record', value: '12 Anos', icon: 'history' },
];

const TECHNOLOGIES = [
  {
    title: 'Algoritmos Quantitativos',
    desc: 'Nossa infraestrutura mapeia mais de 10.000 variáveis macroeconômicas em tempo real, executando ordens com latência de milissegundos para captura eficiente de spread.',
    icon: 'memory'
  },
  {
    title: 'Gestão Ativa de Risco',
    desc: 'Motor proprietário de stress-testing e Value at Risk (VaR) contínuo, assegurando preservação patrimonial mesmo em cenários de alta volatilidade global.',
    icon: 'security'
  },
  {
    title: 'Custódia Institucional',
    desc: 'Recursos segregados e custodiados nos maiores players globais, com auditoria independente e total compliance às normas da CVM e ANBIMA.',
    icon: 'account_balance'
  }
];

const FAQ_ITEMS = [
  {
    q: 'Qual é o perfil adequado para os fundos da Okai?',
    a: 'Nossas estratégias são desenhadas para investidores focados em preservação e alocação de longo prazo, buscando retornos absolutos descorrelacionados dos índices tradicionais.',
  },
  {
    q: 'Como funciona a estrutura de taxas?',
    a: 'Adotamos o padrão institucional: taxa de administração justa para operação e taxa de performance alinhada ao sucesso, cobrada apenas com a superação do benchmark (High Water Mark).',
  },
  {
    q: 'Os fundos são abertos para novos aportes?',
    a: 'O Fundo Grão aceita aportes mensais. Estratégias de Private Equity e Venture Capital, como o Fundo Avane, operam exclusivamente via chamadas de capital em ofertas restritas.',
  },
  {
    q: 'Qual o valor mínimo de investimento?',
    a: 'O Fundo Grão possui ticket mínimo de R$ 50.000 para ingressantes, reforçando nosso compromisso com investidores comprometidos e visão de longo prazo.',
  }
];

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onCadastro }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="bg-[#0a0f0e] text-white selection:bg-primary/30 min-h-screen overflow-x-hidden" style={{ fontFamily: 'Inter, sans-serif' }}>
      
      {/* HEADER */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-[#0a0f0e]/90 backdrop-blur-md border-b border-white/5 py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-2 border-primary rounded flex items-center justify-center">
              <span className="material-symbols-outlined text-primary font-bold">account_balance_wallet</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-xl font-black tracking-widest text-white uppercase">OKAI</span>
              <span className="text-xl font-light tracking-widest text-slate-400 uppercase ml-2">CAPITAL</span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-12">
            <a href="#expertise" className="text-xs font-semibold uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">Expertise</a>
            <a href="#tecnologia" className="text-xs font-semibold uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">Tecnologia</a>
            <a href="#veiculos" className="text-xs font-semibold uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">Veículos</a>
            <a href="#wealth" className="text-xs font-semibold uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">Wealth</a>
          </nav>

          <div className="flex items-center gap-4">
            <button onClick={onLogin} className="text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white transition-colors">
              Acesso
            </button>
            <button onClick={onCadastro} className="bg-primary text-[#0a0f0e] text-xs font-bold uppercase tracking-widest px-6 py-3 rounded hover:bg-emerald-400 transition-colors hidden sm:block">
              Seja Cliente
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* HERO SECTION */}
        <section className="relative min-h-[100vh] flex items-center pt-20 border-b border-white/5">
          {/* Fundo elegante, escuro e com luzes sutis */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-[50vw] h-[100vh] bg-primary/5 rounded-full blur-[150px] translate-x-1/3 -translate-y-1/4" />
            <div className="absolute bottom-0 left-0 w-[50vw] h-[50vh] bg-blue-900/10 rounded-full blur-[150px] -translate-x-1/3 translate-y-1/3" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20 mix-blend-overlay"></div>
          </div>

          <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
            <div className="max-w-3xl">
              <div className="animate-fade-in-up">
                <span className="inline-block py-1 px-3 border border-primary/30 text-primary text-[10px] font-bold tracking-[0.2em] uppercase mb-8">
                  Exclusivo para Novos Clientes
                </span>
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] mb-8 text-white tracking-tight">
                  Seu dinheiro,<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-200">
                    gerenciado com inteligência.
                  </span>
                </h1>
                <p className="text-slate-400 text-lg lg:text-xl font-light leading-relaxed mb-12 max-w-2xl">
                  Na Okai Capital você tem acesso direto às estratégias de Private Equity e Algoritmos Quantitativos antes restritas a grandes fortunas. Máxima mitigação de risco e resultados consistentes acima da média do mercado.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-5">
                  <button onClick={onCadastro} className="bg-primary text-[#0a0f0e] text-sm font-bold uppercase tracking-widest px-8 py-4 rounded hover:bg-emerald-400 transition-all text-center flex items-center justify-center gap-2">
                    Comece a Investir Agora
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                  <button onClick={onLogin} className="border border-white/20 text-white text-sm font-bold uppercase tracking-widest px-8 py-4 rounded hover:bg-white/5 transition-all text-center">
                    Já sou Cliente
                  </button>
                </div>
              </div>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-12 mt-24 pt-12 border-t border-white/10">
              {STATS.map((stat, idx) => (
                <div key={idx} className="flex flex-col">
                  <span className="material-symbols-outlined text-primary mb-4 opacity-80" style={{ fontSize: '28px' }}>{stat.icon}</span>
                  <span className="text-3xl lg:text-4xl font-light text-white mb-2">{stat.value}</span>
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TECNologia & EXPERTISE */}
        <section id="tecnologia" className="py-24 lg:py-32 px-6 bg-[#050807]">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-16 lg:gap-24">
              <div className="lg:w-1/3">
                <span className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase mb-4 block">A Vantagem Okai</span>
                <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6 leading-tight">
                  Construídos sobre tecnologia proprietária.
                </h2>
                <p className="text-slate-400 font-light leading-relaxed mb-8">
                  Modelos matemáticos avançados e infraestrutura de dados de nível global nos permitem analisar oportunidades que fogem ao radar do mercado tradicional. Não seguimos tendências; as antecipamos.
                </p>
              </div>

              <div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-8">
                {TECHNOLOGIES.map((tech, idx) => (
                  <div key={idx} className="bg-[#0a0f0e] border border-white/5 p-8 rounded hover:border-primary/30 transition-colors">
                    <div className="w-12 h-12 bg-primary/10 flex items-center justify-center rounded mb-6 text-primary">
                      <span className="material-symbols-outlined">{tech.icon}</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-4">{tech.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{tech.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* VEICULOS / FUNDS */}
        <section id="veiculos" className="py-24 lg:py-32 px-6 relative border-y border-white/5">
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-20">
              <span className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase mb-4 block">Portfólio Exclusivo</span>
              <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">Nossos Veículos de Investimento</h2>
              <p className="text-slate-400 max-w-2xl mx-auto font-light">Estratégias estruturadas para diferentes teses e horizontes, unidas pelo mesmo rigor analítico e busca implacável por performance.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* FUNDO GRÃO */}
              <div className="bg-[#0a0f0e] border border-white/10 rounded overflow-hidden flex flex-col group hover:border-primary/50 transition-all duration-500">
                <div className="p-10 flex-grow">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <div className="inline-block px-2 py-1 mb-4 border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[9px] uppercase tracking-widest font-bold">Captação Aberta</div>
                      <h3 className="text-3xl font-bold text-white mb-2">Okai Grão FIA</h3>
                      <p className="text-slate-400 text-sm">Long Biased – Commodities Macro</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-light text-primary">+18,2%</div>
                      <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Rent. 12m</div>
                    </div>
                  </div>
                  
                  <p className="text-slate-300 font-light leading-relaxed mb-8">
                    Estratégia quantitativa focada no mercado de derivativos agrícolas. Algoritmos exploram assimetrias de preços nas safras de grãos globais, aliando proteção cambial a um expressivo potencial direcional.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1">Volatilidade (Alvo)</span>
                      <span className="text-white font-medium">10% - 12% a.a.</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1">Liquidez</span>
                      <span className="text-white font-medium">D+30</span>
                    </div>
                  </div>
                </div>
                <button onClick={onCadastro} className="bg-white/5 p-6 w-full text-center text-xs font-bold uppercase tracking-widest text-white hover:bg-primary hover:text-black transition-colors">
                  Acessar Lâmina do Fundo
                </button>
              </div>

              {/* FUNDO AVANE - PRIVATE EQUITY */}
              <div className="bg-[#0a0f0e] border border-white/10 rounded overflow-hidden flex flex-col relative group">
                <div className="absolute inset-0 bg-black/40 z-10 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <div className="text-center">
                     <span className="material-symbols-outlined text-4xl text-primary mb-2">lock</span>
                     <p className="text-xs uppercase tracking-widest font-bold text-white">Veículo Fechado</p>
                     <p className="text-slate-400 text-sm mt-1">Próxima rodada: Q3 2026</p>
                   </div>
                </div>
                <div className="p-10 flex-grow">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <div className="inline-block px-2 py-1 mb-4 border border-slate-500/30 bg-slate-500/10 text-slate-400 text-[9px] uppercase tracking-widest font-bold">Oferta Restrita • FIP</div>
                      <h3 className="text-3xl font-bold text-white mb-2">Okai Avane FIP</h3>
                      <p className="text-slate-400 text-sm">Private Equity – Real Estate</p>
                    </div>
                  </div>
                  
                  <p className="text-slate-300 font-light leading-relaxed mb-8">
                    Fundo de Investimento em Participações voltado à estruturação e consolidação de ativos imobiliários triple-A em teses de retrofits e greenfield nas principais capitais.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1">Perfil Requerido</span>
                      <span className="text-white font-medium">Inv. Profissional</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1">Horizonte</span>
                      <span className="text-white font-medium">5 - 7 Anos</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 p-6 w-full text-center text-xs font-bold uppercase tracking-widest text-slate-500">
                  Em Período de Desinvestimento
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ - Elegante */}
        <section className="py-24 lg:py-32 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl lg:text-4xl font-bold text-white mb-12 text-center">Governança & Dúvidas Comuns</h2>
            
            <div className="space-y-2">
              {FAQ_ITEMS.map((item, idx) => (
                <div key={idx} className="border-b border-white/10">
                  <button
                    onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between py-6 text-left group"
                  >
                    <span className="font-semibold text-lg text-white group-hover:text-primary transition-colors">{item.q}</span>
                    <span className={`material-symbols-outlined text-slate-500 transition-transform duration-300 ${activeFaq === idx ? 'rotate-180 text-primary' : ''}`}>
                      expand_more
                    </span>
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${activeFaq === idx ? 'max-h-60 pb-8 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <p className="text-slate-400 font-light leading-relaxed pr-8">{item.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="py-24 px-6 border-t border-white/5 bg-[#050807]">
          <div className="max-w-4xl mx-auto text-center">
             <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">Proteja e escale seu capital hoje.</h2>
             <p className="text-slate-400 mb-10 max-w-xl mx-auto font-light">Junte-se à elite financeira global. Abra sua conta gratuitamente em menos de 1 minuto e passe a contar com nossas estratégias de altíssimo nível.</p>
             <button onClick={onCadastro} className="bg-primary hover:bg-emerald-400 text-[#0a0f0e] text-sm font-bold uppercase tracking-widest px-10 py-5 rounded transition-all shadow-[0_0_40px_rgba(0,199,149,0.2)]">
                CRIAR CONTA GRATUITA
             </button>
          </div>
        </section>
      </main>

      {/* FOOTER CORPORATIVO */}
      <footer className="bg-[#000000] border-t border-white/5 py-16 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
           <div className="md:col-span-2">
             <span className="text-2xl font-black tracking-widest text-white uppercase block mb-4">OKAI <span className="font-light text-slate-500">CAPITAL</span></span>
             <p className="text-slate-500 text-xs leading-relaxed max-w-sm mb-6">
               Gestão de recursos independentes focada em operações de Private Equity, Fundos Quantitativos e Wealth Management para famílias e investidores institucionais.
             </p>
             <div className="flex gap-4">
               <span className="text-[10px] border border-white/10 px-2 py-1 text-slate-400 uppercase font-bold tracking-widest">CVM</span>
               <span className="text-[10px] border border-white/10 px-2 py-1 text-slate-400 uppercase font-bold tracking-widest">ANBIMA</span>
             </div>
           </div>
           
           <div>
             <h4 className="text-white text-xs uppercase font-bold tracking-widest mb-6">Soluções</h4>
             <ul className="space-y-3 text-sm text-slate-400 font-light">
               <li><a href="#" className="hover:text-primary transition-colors">Asset Management</a></li>
               <li><a href="#" className="hover:text-primary transition-colors">Private Equity</a></li>
               <li><a href="#" className="hover:text-primary transition-colors">Offshore & Trusts</a></li>
               <li><a href="#" className="hover:text-primary transition-colors">Family Office</a></li>
             </ul>
           </div>

           <div>
             <h4 className="text-white text-xs uppercase font-bold tracking-widest mb-6">Contato Executivo</h4>
             <ul className="space-y-3 text-sm text-slate-400 font-light">
               <li>São Paulo, SP - Faria Lima</li>
               <li>(11) 4000-0000</li>
               <li>ri@okaicapital.com.br</li>
             </ul>
           </div>
        </div>
        
        <div className="max-w-7xl mx-auto pt-8 border-t border-white/10 text-[10px] text-slate-600 leading-relaxed font-light">
          <p className="mb-4">
            "FUNDOS DE INVESTIMENTO NÃO CONTAM COM GARANTIA DO ADMINISTRADOR, DO GESTOR, DE QUALQUER MECANISMO DE SEGURO OU DO FUNDO GARANTIDOR DE CRÉDITO – FGC." 
            Rentabilidade passada não representa garantia de rentabilidade futura. Ao investidor é recomendada a leitura cuidadosa do prospecto e do regulamento do fundo de investimento ao aplicar seus recursos.
          </p>
          <div className="flex justify-between items-center">
            <p>© {new Date().getFullYear()} Okai Capital. Todos os direitos reservados. CNPJ 00.000.000/0001-00</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
              <a href="#" className="hover:text-white transition-colors">Política de Privacidade</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
