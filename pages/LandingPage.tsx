import React, { useState, useEffect, useRef } from 'react';

interface LandingPageProps {
  onLogin: () => void;
  onCadastro: () => void;
}

const STATS = [
  { label: 'Patrimônio Administrado', value: 'R$ 2,4B+', icon: 'account_balance' },
  { label: 'Famílias Atendidas', value: '450+', icon: 'real_estate_agent' },
  { label: 'Alpha Gerado (12m)', value: '+8,4%', icon: 'show_chart' },
  { label: 'Track Record', value: '12 Anos', icon: 'history' },
];

const TECHNOLOGIES = [
  {
    title: 'Algoritmos Quantitativos',
    desc: 'Nossa infraestrutura mapeia mais de 10.000 variáveis macroeconômicas em tempo real, executando ordens com latência de milissegundos para captura eficiente de spread.',
    icon: 'memory',
  },
  {
    title: 'Gestão Ativa de Risco',
    desc: 'Motor proprietário de stress-testing e Value at Risk (VaR) contínuo, assegurando preservação patrimonial mesmo em cenários de alta volatilidade global.',
    icon: 'security',
  },
  {
    title: 'Custódia Institucional',
    desc: 'Recursos segregados e custodiados nos maiores players globais, com auditoria independente e total compliance às normas da CVM e ANBIMA.',
    icon: 'account_balance',
  },
  {
    title: 'Dados em Tempo Real',
    desc: 'Pipelines de dados proprietários conectados a bolsas globais, feeds de notícias e indicadores econômicos líderes, gerando sinais de alocação com precisão cirúrgica.',
    icon: 'sensors',
  },
];

const EXPERTISE_PILLARS = [
  {
    number: '01',
    title: 'Independência Estrutural',
    desc: 'Sem conflito de interesses. Sem distribuição de terceiros. Nossa remuneração está 100% atrelada ao sucesso dos nossos clientes — e só a isso.',
  },
  {
    number: '02',
    title: 'Rigor Analítico',
    desc: 'Cada tese de investimento passa por modelos quantitativos proprietários, análise fundamentalista e stress-testing antes de receber qualquer alocação de capital.',
  },
  {
    number: '03',
    title: 'Visão de Longo Prazo',
    desc: 'Não gerenciamos ciclos trimestrais. Gerenciamos patrimônios que devem durar gerações. Nossas estratégias são estruturadas para preservar e multiplicar capital no horizonte de décadas.',
  },
];

const WEALTH_SERVICES = [
  {
    icon: 'family_restroom',
    title: 'Family Office',
    desc: 'Gestão patrimonial integrada para famílias com patrimônio relevante. Consolidação de carteiras, planejamento sucessório e governança familiar sob uma única estrutura dedicada.',
  },
  {
    icon: 'public',
    title: 'Offshore & Trusts',
    desc: 'Estruturação de veículos internacionais em jurisdições eficientes. Trusts, holdings offshore e fundos em Cayman, BVI e Luxemburgo com total conformidade regulatória.',
  },
  {
    icon: 'real_estate_agent',
    title: 'Planejamento Sucessório',
    desc: 'Proteção e transferência eficiente de patrimônio entre gerações. Estruturas jurídicas e tributárias personalizadas para blindagem patrimonial e continuidade familiar.',
  },
  {
    icon: 'trending_up',
    title: 'Asset Allocation Estratégica',
    desc: 'Alocação tática e estratégica de portfólios multimercado com visão global, balanceando risco e retorno de acordo com o perfil e objetivos únicos de cada família.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Qual é o perfil adequado para os fundos da Okai Capital?',
    a: 'Nossas estratégias são desenhadas para investidores focados em preservação e alocação de longo prazo, buscando retornos absolutos descorrelacionados dos índices tradicionais. Atendemos investidores qualificados e profissionais conforme definição da CVM.',
  },
  {
    q: 'Como funciona a estrutura de taxas dos fundos de investimento?',
    a: 'Adotamos o padrão institucional: taxa de administração justa para operação e taxa de performance alinhada ao sucesso, cobrada apenas com a superação do benchmark (High Water Mark). Nenhuma taxa de performance é devida em anos de performance negativa.',
  },
  {
    q: 'Os fundos estão abertos para novos aportes?',
    a: 'O Fundo Grão aceita aportes mensais com janelas definidas. Estratégias de Private Equity e Venture Capital, como o Fundo Avane, operam exclusivamente via chamadas de capital em ofertas restritas com datas pré-estabelecidas.',
  },
  {
    q: 'Qual o valor mínimo de investimento na Okai Capital?',
    a: 'O Fundo Grão possui ticket mínimo de R$ 50.000 para ingressantes. Estratégias de wealth management e family office são estruturadas de forma personalizada, com requisitos de entrada conforme complexidade do mandato.',
  },
  {
    q: 'A Okai Capital é regulamentada pela CVM e ANBIMA?',
    a: 'Sim. Operamos sob total conformidade com as normas da Comissão de Valores Mobiliários (CVM) e somos signatários dos códigos de melhores práticas da ANBIMA. Todos os nossos fundos possuem CNPJ registrado e estão disponíveis para consulta pública.',
  },
];

function useIntersection(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

const FadeSection: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  const { ref, visible } = useIntersection();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}
    >
      {children}
    </div>
  );
};

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onCadastro }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="bg-[#050807] text-white selection:bg-primary/30 min-h-screen overflow-x-hidden" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header
        role="banner"
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'glass-strong py-3 border-b border-white/5' : 'bg-transparent py-5'}`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 border border-primary/60 rounded flex items-center justify-center glow-primary-sm">
              <span className="material-symbols-outlined text-primary text-[18px] font-fill">account_balance_wallet</span>
            </div>
            <div>
              <span className="text-lg font-black tracking-widest text-white uppercase">OKAI</span>
              <span className="text-lg font-light tracking-widest text-slate-400 uppercase ml-1.5">CAPITAL</span>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav aria-label="Navegação principal" className="hidden lg:flex items-center gap-10">
            {[['expertise', 'Filosofia'], ['tecnologia', 'Tecnologia'], ['veiculos', 'Fundos'], ['wealth', 'Wealth']].map(([id, label]) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 hover:text-primary transition-colors"
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={onLogin}
              className="text-[11px] font-bold uppercase tracking-widest text-slate-300 hover:text-white transition-colors"
            >
              Acesso
            </button>
            <button
              onClick={onCadastro}
              className="bg-primary text-[#050807] text-[11px] font-bold uppercase tracking-widest px-5 py-2.5 rounded hover:bg-emerald-400 transition-all glow-primary-sm hidden sm:block"
            >
              Seja Cliente
            </button>
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(v => !v)}
              className="lg:hidden text-slate-400 hover:text-white transition-colors"
              aria-label="Menu"
            >
              <span className="material-symbols-outlined">{mobileMenuOpen ? 'close' : 'menu'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden glass-strong border-t border-white/5 px-6 py-6 flex flex-col gap-4">
            {[['expertise', 'Filosofia'], ['tecnologia', 'Tecnologia'], ['veiculos', 'Fundos'], ['wealth', 'Wealth']].map(([id, label]) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="text-left text-sm font-semibold uppercase tracking-widest text-slate-300 hover:text-primary transition-colors"
              >
                {label}
              </button>
            ))}
            <button
              onClick={onCadastro}
              className="mt-2 bg-primary text-[#050807] text-sm font-bold uppercase tracking-widest px-5 py-3 rounded hover:bg-emerald-400 transition-all text-center"
            >
              Seja Cliente
            </button>
          </div>
        )}
      </header>

      <main>
        {/* ── HERO ───────────────────────────────────────────────── */}
        <section
          aria-label="Okai Capital — Fundos de Investimento de Alta Performance"
          className="relative min-h-[100vh] flex items-center pt-24 border-b border-white/5"
        >
          {/* Background glows */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            <div className="absolute top-0 right-0 w-[60vw] h-[100vh] bg-primary/5 rounded-full blur-[180px] translate-x-1/3 -translate-y-1/4" />
            <div className="absolute bottom-0 left-0 w-[50vw] h-[60vh] bg-blue-900/8 rounded-full blur-[150px] -translate-x-1/3 translate-y-1/3" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30vw] h-[30vw] bg-primary/3 rounded-full blur-[120px]" />
          </div>

          <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
            <div className="max-w-3xl">
              <div className="animate-fade-in-up">
                <span className="inline-flex items-center gap-2 py-1.5 px-4 border border-primary/30 bg-primary/5 text-primary text-[10px] font-bold tracking-[0.2em] uppercase mb-8 rounded-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Captação Aberta — Fundo Grão
                </span>

                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] mb-8 text-white tracking-tight">
                  Fundos de investimento<br />
                  <span className="text-gradient">gerenciados com inteligência.</span>
                </h1>

                <p className="text-slate-400 text-lg lg:text-xl font-light leading-relaxed mb-4 max-w-2xl">
                  A <strong className="text-white font-semibold">Okai Capital</strong> é uma gestora independente especializada em fundos quantitativos, private equity e wealth management — estratégias antes restritas a grandes fortunas, agora acessíveis a investidores qualificados.
                </p>
                <p className="text-slate-500 text-sm font-light leading-relaxed mb-12 max-w-xl">
                  R$ 2,4 bilhões sob gestão. 12 anos de track record. Regulamentada pela CVM e ANBIMA.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={onCadastro}
                    className="bg-primary text-[#050807] text-sm font-bold uppercase tracking-widest px-8 py-4 rounded hover:bg-emerald-400 transition-all text-center flex items-center justify-center gap-2 glow-primary"
                  >
                    Comece a Investir
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                  <button
                    onClick={onLogin}
                    className="border border-white/15 text-white text-sm font-bold uppercase tracking-widest px-8 py-4 rounded hover:bg-white/5 hover:border-white/25 transition-all text-center"
                  >
                    Já sou Cliente
                  </button>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mt-20 pt-12 border-t border-white/8">
              {STATS.map((stat, idx) => (
                <div key={idx} className="flex flex-col group">
                  <span className="material-symbols-outlined text-primary mb-3 opacity-70 group-hover:opacity-100 transition-opacity font-fill" style={{ fontSize: '22px' }}>{stat.icon}</span>
                  <span className="text-3xl lg:text-4xl font-light text-white mb-1.5 tracking-tight">{stat.value}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── EXPERTISE / FILOSOFIA ──────────────────────────────── */}
        <section id="expertise" aria-labelledby="expertise-title" className="py-24 lg:py-32 px-6 bg-[#050807]">
          <div className="max-w-7xl mx-auto">
            <FadeSection>
              <div className="text-center mb-16 lg:mb-20">
                <span className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase mb-4 block">Nossa Filosofia</span>
                <h2 id="expertise-title" className="text-3xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                  Gestão de patrimônio com<br className="hidden lg:block" /> propósito e rigor
                </h2>
                <p className="text-slate-400 max-w-2xl mx-auto font-light text-lg leading-relaxed">
                  Não gerenciamos apenas ativos financeiros. Gerenciamos a segurança, os sonhos e o legado de famílias que confiam na Okai Capital para preservar e multiplicar o que construíram.
                </p>
              </div>
            </FadeSection>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-20">
              {EXPERTISE_PILLARS.map((pillar, idx) => (
                <FadeSection key={idx}>
                  <div className="glass rounded-lg p-8 h-full hover:border-primary/20 transition-all duration-300 group">
                    <span className="text-[10px] font-black tracking-[0.3em] text-primary/50 mb-6 block font-mono">{pillar.number}</span>
                    <h3 className="text-xl font-bold text-white mb-4 group-hover:text-primary transition-colors">{pillar.title}</h3>
                    <p className="text-slate-400 font-light leading-relaxed text-sm">{pillar.desc}</p>
                  </div>
                </FadeSection>
              ))}
            </div>

            {/* Credenciais regulatórias */}
            <FadeSection>
              <div className="glass rounded-lg p-8 lg:p-12 flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="text-center lg:text-left">
                  <h3 className="text-lg font-bold text-white mb-2">Regulamentação e Compliance</h3>
                  <p className="text-slate-400 text-sm font-light max-w-lg">
                    Operamos sob supervisão direta da Comissão de Valores Mobiliários (CVM) e somos signatários dos códigos de melhores práticas da ANBIMA. Auditoria independente anual e total transparência com nossos cotistas.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center lg:justify-end gap-4 shrink-0">
                  {['CVM', 'ANBIMA', 'BACEN', 'ICVM 555'].map(label => (
                    <span key={label} className="border border-primary/20 bg-primary/5 text-primary text-[10px] font-bold tracking-widest px-4 py-2 rounded-sm uppercase">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </FadeSection>
          </div>
        </section>

        <div className="section-divider" aria-hidden="true" />

        {/* ── TECNOLOGIA ─────────────────────────────────────────── */}
        <section id="tecnologia" aria-labelledby="tecnologia-title" className="py-24 lg:py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-16 lg:gap-24">
              <FadeSection className="lg:w-1/3">
                <span className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase mb-4 block">A Vantagem Okai</span>
                <h2 id="tecnologia-title" className="text-3xl lg:text-4xl font-bold text-white mb-6 leading-tight">
                  Tecnologia proprietária a serviço do seu patrimônio.
                </h2>
                <p className="text-slate-400 font-light leading-relaxed mb-8">
                  Modelos matemáticos avançados e infraestrutura de dados de nível institucional nos permitem identificar oportunidades de investimento que fogem ao radar do mercado tradicional. Não seguimos tendências — antecipamos.
                </p>
                <button
                  onClick={onCadastro}
                  className="inline-flex items-center gap-2 text-primary text-sm font-bold uppercase tracking-widest hover:gap-3 transition-all"
                >
                  Conheça nossa metodologia
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </FadeSection>

              <div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-5">
                {TECHNOLOGIES.map((tech, idx) => (
                  <FadeSection key={idx}>
                    <article className="glass rounded-lg p-7 hover:border-primary/25 transition-all duration-300 group h-full">
                      <div className="w-10 h-10 bg-primary/10 flex items-center justify-center rounded mb-5 text-primary group-hover:bg-primary/20 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">{tech.icon}</span>
                      </div>
                      <h3 className="text-base font-bold text-white mb-3">{tech.title}</h3>
                      <p className="text-slate-400 text-sm leading-relaxed font-light">{tech.desc}</p>
                    </article>
                  </FadeSection>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="section-divider" aria-hidden="true" />

        {/* ── VEÍCULOS / FUNDOS ──────────────────────────────────── */}
        <section id="veiculos" aria-labelledby="veiculos-title" className="py-24 lg:py-32 px-6 bg-[#050807]">
          <div className="max-w-7xl mx-auto">
            <FadeSection>
              <div className="text-center mb-16">
                <span className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase mb-4 block">Portfólio Exclusivo</span>
                <h2 id="veiculos-title" className="text-3xl lg:text-5xl font-bold text-white mb-6">Nossos Fundos de Investimento</h2>
                <p className="text-slate-400 max-w-2xl mx-auto font-light text-base leading-relaxed">
                  Estratégias estruturadas para diferentes teses e horizontes de investimento, unidas pelo mesmo rigor analítico e busca implacável por performance consistente.
                </p>
              </div>
            </FadeSection>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* FUNDO GRÃO */}
              <FadeSection>
                <article className="bg-[#0a0f0e] border border-white/8 rounded-lg overflow-hidden flex flex-col group hover:border-primary/40 transition-all duration-500 hover:shadow-[0_0_60px_rgba(0,199,149,0.06)]">
                  <div className="p-10 flex-grow">
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-4 border border-emerald-500/30 bg-emerald-500/8 text-emerald-400 text-[9px] uppercase tracking-widest font-bold rounded-sm">
                          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                          Captação Aberta
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-1">Okai Grão FIA</h3>
                        <p className="text-slate-400 text-sm">Long Biased — Commodities Macro</p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-light text-primary">+18,2%</div>
                        <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-1">Rent. 12 meses</div>
                      </div>
                    </div>

                    <p className="text-slate-300 font-light leading-relaxed mb-8 text-sm">
                      Estratégia quantitativa focada no mercado de derivativos agrícolas. Algoritmos proprietários exploram assimetrias de preços nas safras de grãos globais, aliando proteção cambial a um expressivo potencial direcional em commodities.
                    </p>

                    <div className="grid grid-cols-2 gap-5 mb-2">
                      {[
                        ['Volatilidade (Alvo)', '10% - 12% a.a.'],
                        ['Liquidez', 'D+30'],
                        ['Benchmark', 'CDI + 5% a.a.'],
                        ['Aporte Mínimo', 'R$ 50.000'],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1">{label}</span>
                          <span className="text-white font-medium text-sm">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={onCadastro}
                    className="bg-white/4 p-5 w-full text-center text-[11px] font-bold uppercase tracking-widest text-white hover:bg-primary hover:text-[#050807] transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    Acessar Lâmina do Fundo
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                  </button>
                </article>
              </FadeSection>

              {/* FUNDO AVANE */}
              <FadeSection>
                <article className="bg-[#0a0f0e] border border-white/8 rounded-lg overflow-hidden flex flex-col relative group">
                  <div className="absolute inset-0 bg-black/40 z-10 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-lg">
                    <div className="text-center px-8">
                      <span className="material-symbols-outlined text-3xl text-primary mb-3 block">schedule</span>
                      <p className="text-xs uppercase tracking-widest font-bold text-white mb-2">Próxima Janela</p>
                      <p className="text-slate-300 text-sm font-light">Q3 2026 — Chamada de Capital</p>
                      <button
                        onClick={onCadastro}
                        className="mt-5 border border-primary/40 text-primary text-[10px] font-bold uppercase tracking-widest px-5 py-2.5 rounded hover:bg-primary/10 transition-colors"
                      >
                        Entrar na lista de espera
                      </button>
                    </div>
                  </div>

                  <div className="p-10 flex-grow">
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-4 border border-slate-500/30 bg-slate-500/8 text-slate-400 text-[9px] uppercase tracking-widest font-bold rounded-sm">
                          Oferta Restrita · FIP
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-1">Okai Avane FIP</h3>
                        <p className="text-slate-400 text-sm">Private Equity — Real Estate</p>
                      </div>
                    </div>

                    <p className="text-slate-300 font-light leading-relaxed mb-8 text-sm">
                      Fundo de Investimento em Participações voltado à estruturação e consolidação de ativos imobiliários triple-A. Teses de retrofit e greenfield nas principais capitais brasileiras com retorno esperado acima do mercado.
                    </p>

                    <div className="grid grid-cols-2 gap-5 mb-2">
                      {[
                        ['Perfil Requerido', 'Inv. Profissional'],
                        ['Horizonte', '5 – 7 Anos'],
                        ['TIR Esperada', '22% – 28% a.a.'],
                        ['Estrutura', 'FIP – ICVM 578'],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1">{label}</span>
                          <span className="text-white font-medium text-sm">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white/4 p-5 w-full text-center text-[11px] font-bold uppercase tracking-widest text-slate-500">
                    Em Período de Desinvestimento · Hover para saber mais
                  </div>
                </article>
              </FadeSection>
            </div>
          </div>
        </section>

        <div className="section-divider" aria-hidden="true" />

        {/* ── WEALTH MANAGEMENT ──────────────────────────────────── */}
        <section id="wealth" aria-labelledby="wealth-title" className="py-24 lg:py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 items-start">
              <FadeSection className="lg:w-2/5 lg:sticky lg:top-28">
                <span className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase mb-4 block">Wealth Management</span>
                <h2 id="wealth-title" className="text-3xl lg:text-4xl font-bold text-white mb-6 leading-tight">
                  Gestão patrimonial completa para famílias e empresas.
                </h2>
                <p className="text-slate-400 font-light leading-relaxed mb-6 text-base">
                  Além dos fundos de investimento, a Okai Capital oferece um ecossistema completo de soluções patrimoniais — da estruturação offshore ao planejamento sucessório — com equipe dedicada e mandato de longo prazo.
                </p>
                <p className="text-slate-500 font-light leading-relaxed mb-10 text-sm">
                  Cada cliente recebe um advisor sênior exclusivo, relatórios de desempenho mensais e acesso a oportunidades de co-investimento em deals proprietários.
                </p>
                <button
                  onClick={onCadastro}
                  className="bg-primary text-[#050807] text-[11px] font-bold uppercase tracking-widest px-7 py-3.5 rounded hover:bg-emerald-400 transition-all glow-primary-sm flex items-center gap-2 w-fit"
                >
                  Falar com um Advisor
                  <span className="material-symbols-outlined text-sm">person</span>
                </button>
              </FadeSection>

              <div className="lg:w-3/5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                {WEALTH_SERVICES.map((svc, idx) => (
                  <FadeSection key={idx}>
                    <article className="glass rounded-lg p-7 hover:border-primary/25 transition-all duration-300 group h-full">
                      <div className="w-10 h-10 bg-primary/10 flex items-center justify-center rounded mb-5 text-primary group-hover:bg-primary/20 transition-colors">
                        <span className="material-symbols-outlined text-[18px] font-fill">{svc.icon}</span>
                      </div>
                      <h3 className="text-base font-bold text-white mb-3 group-hover:text-primary transition-colors">{svc.title}</h3>
                      <p className="text-slate-400 text-sm leading-relaxed font-light">{svc.desc}</p>
                    </article>
                  </FadeSection>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="section-divider" aria-hidden="true" />

        {/* ── FAQ ────────────────────────────────────────────────── */}
        <section id="faq" aria-labelledby="faq-title" className="py-24 lg:py-32 px-6 bg-[#050807]">
          <div className="max-w-4xl mx-auto">
            <FadeSection>
              <div className="text-center mb-14">
                <span className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase mb-4 block">Tire suas dúvidas</span>
                <h2 id="faq-title" className="text-2xl lg:text-4xl font-bold text-white">Perguntas Frequentes sobre Investimentos</h2>
              </div>
            </FadeSection>

            <div className="space-y-1" itemScope itemType="https://schema.org/FAQPage">
              {FAQ_ITEMS.map((item, idx) => (
                <FadeSection key={idx}>
                  <div
                    className="border-b border-white/8"
                    itemScope
                    itemProp="mainEntity"
                    itemType="https://schema.org/Question"
                  >
                    <button
                      onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                      className="w-full flex items-center justify-between py-6 text-left group"
                      aria-expanded={activeFaq === idx}
                    >
                      <span
                        itemProp="name"
                        className="font-semibold text-base lg:text-lg text-white group-hover:text-primary transition-colors pr-6"
                      >
                        {item.q}
                      </span>
                      <span className={`material-symbols-outlined text-slate-500 shrink-0 transition-transform duration-300 ${activeFaq === idx ? 'rotate-180 text-primary' : ''}`}>
                        expand_more
                      </span>
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${activeFaq === idx ? 'max-h-60 pb-7 opacity-100' : 'max-h-0 opacity-0'}`}
                      itemScope
                      itemProp="acceptedAnswer"
                      itemType="https://schema.org/Answer"
                    >
                      <p itemProp="text" className="text-slate-400 font-light leading-relaxed pr-10 text-sm">{item.a}</p>
                    </div>
                  </div>
                </FadeSection>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA FINAL ──────────────────────────────────────────── */}
        <section aria-label="Chamada para ação" className="py-24 lg:py-32 px-6 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-primary/5 rounded-full blur-[160px]" />
          </div>
          <FadeSection>
            <div className="max-w-4xl mx-auto text-center relative z-10">
              <span className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase mb-6 block">Comece Agora</span>
              <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                Proteja e escale seu capital<br className="hidden lg:block" /> com quem entende de investimentos.
              </h2>
              <p className="text-slate-400 mb-10 max-w-xl mx-auto font-light text-lg leading-relaxed">
                Abra sua conta gratuitamente em menos de 1 minuto e tenha acesso às mesmas estratégias de fundos de investimento que protegem os maiores patrimônios do Brasil.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={onCadastro}
                  className="bg-primary hover:bg-emerald-400 text-[#050807] text-sm font-bold uppercase tracking-widest px-10 py-5 rounded transition-all glow-primary flex items-center justify-center gap-2"
                >
                  Criar Conta Gratuita
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
                <button
                  onClick={onLogin}
                  className="border border-white/15 text-white text-sm font-bold uppercase tracking-widest px-10 py-5 rounded hover:bg-white/5 transition-all"
                >
                  Já tenho conta
                </button>
              </div>
              <p className="text-slate-600 text-xs mt-8 font-light">
                Sem taxas de abertura · CVM regulamentada · Dados protegidos por criptografia
              </p>
            </div>
          </FadeSection>
        </section>
      </main>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer role="contentinfo" className="bg-[#020403] border-t border-white/5 pt-16 pb-10 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 border border-primary/40 rounded flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-[16px] font-fill">account_balance_wallet</span>
              </div>
              <span className="text-xl font-black tracking-widest text-white uppercase">OKAI <span className="font-light text-slate-500">CAPITAL</span></span>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed max-w-sm mb-6 font-light">
              Gestora independente de recursos focada em fundos de investimento quantitativos, private equity e wealth management para famílias e investidores institucionais no Brasil.
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              {['CVM', 'ANBIMA', 'CNPJ 00.000.000/0001-00'].map(label => (
                <span key={label} className="text-[10px] border border-white/10 px-2.5 py-1 text-slate-500 uppercase font-bold tracking-widest rounded-sm">{label}</span>
              ))}
            </div>
            <p className="text-slate-600 text-xs font-light">São Paulo, SP — Avenida Brigadeiro Faria Lima</p>
          </div>

          <nav aria-label="Links de soluções">
            <h4 className="text-white text-[10px] uppercase font-bold tracking-widest mb-6">Soluções</h4>
            <ul className="space-y-3 text-sm text-slate-400 font-light">
              {['Fundos de Investimento', 'Private Equity', 'Wealth Management', 'Offshore & Trusts', 'Family Office', 'Planejamento Sucessório'].map(item => (
                <li key={item}>
                  <button onClick={onCadastro} className="hover:text-primary transition-colors text-left">{item}</button>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Links de contato e institucional">
            <h4 className="text-white text-[10px] uppercase font-bold tracking-widest mb-6">Contato</h4>
            <ul className="space-y-3 text-sm text-slate-400 font-light">
              <li>São Paulo, SP – Faria Lima</li>
              <li>(11) 4000-0000</li>
              <li>ri@okaicapital.com.br</li>
            </ul>
            <h4 className="text-white text-[10px] uppercase font-bold tracking-widest mt-8 mb-4">Institucional</h4>
            <ul className="space-y-3 text-sm text-slate-400 font-light">
              {['Sobre a Gestora', 'Documentos CVM', 'Regulamentos', 'Contato IR'].map(item => (
                <li key={item}><a href="#" className="hover:text-primary transition-colors">{item}</a></li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-white/8">
          <p className="text-[10px] text-slate-600 leading-relaxed font-light mb-5">
            <strong className="text-slate-500">AVISO LEGAL:</strong> "FUNDOS DE INVESTIMENTO NÃO CONTAM COM GARANTIA DO ADMINISTRADOR, DO GESTOR, DE QUALQUER MECANISMO DE SEGURO OU DO FUNDO GARANTIDOR DE CRÉDITO – FGC."
            Rentabilidade passada não representa garantia de rentabilidade futura. Ao investidor é recomendada a leitura cuidadosa do prospecto e do regulamento do fundo de investimento ao aplicar seus recursos.
            As informações contidas neste site têm caráter exclusivamente informativo e não constituem oferta de valores mobiliários.
          </p>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-slate-600">
            <p>© {new Date().getFullYear()} Okai Capital Gestora de Recursos. Todos os direitos reservados.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-slate-400 transition-colors">Termos de Uso</a>
              <a href="#" className="hover:text-slate-400 transition-colors">Política de Privacidade</a>
              <a href="#" className="hover:text-slate-400 transition-colors">Política de Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
