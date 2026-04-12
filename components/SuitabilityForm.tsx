import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const SuitabilityForm: React.FC = () => {
    const { user, profile, refreshProfile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        questionario_valor_investido: '',
        questionario_prazo: '',
        questionario_formacao: ''
    });

    // Se não tiver perfil, ou se já completou, não exibir nada:
    if (!profile || profile.onboarding_completed) {
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase
            .from('profiles')
            .update({
                questionario_valor_investido: form.questionario_valor_investido,
                questionario_prazo: form.questionario_prazo,
                questionario_formacao: form.questionario_formacao,
                onboarding_completed: true
            })
            .eq('id', user?.id);

        if (error) {
            alert("Ocorreu um erro ao salvar: " + error.message);
            setLoading(false);
            return;
        }

        await refreshProfile();
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background-dark/95 backdrop-blur-md p-4">
            <div className="bg-[#1a2130] rounded-2xl w-full max-w-lg p-8 shadow-2xl border border-primary/20 animate-in fade-in zoom-in duration-300">
                <div className="flex flex-col items-center text-center">
                    <span className="material-symbols-outlined text-4xl text-primary mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>
                        psychology
                    </span>
                    <h2 className="text-2xl font-display font-semibold text-slate-100 mb-2">Conhecendo o seu Perfil</h2>
                    <p className="text-sm text-slate-400 mb-8 font-body">Conta pra gente um pouco sobre os seus objetivos para montarmos a melhor estratégia para o seu patrimônio.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 font-display">Qual valor você tem investido nos seguintes tipos de aplicação?</label>
                        <select 
                            required 
                            value={form.questionario_valor_investido} 
                            onChange={(e) => setForm({...form, questionario_valor_investido: e.target.value})}
                            className="w-full bg-[#121826] border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-body text-sm"
                        >
                            <option value="">Selecione...</option>
                            <option value="Abaixo de R$ 50 mil">Abaixo de R$ 50 mil</option>
                            <option value="De R$ 50 mil a R$ 250 mil">De R$ 50 mil a R$ 250 mil</option>
                            <option value="De R$ 250 mil a R$ 1 Milhão">De R$ 250 mil a R$ 1 Milhão</option>
                            <option value="Acima de R$ 1 Milhão">Acima de R$ 1 Milhão</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 font-display">Sobre seus recursos investidos aqui, quando você pretende utilizá-los?</label>
                        <select 
                            required 
                            value={form.questionario_prazo} 
                            onChange={(e) => setForm({...form, questionario_prazo: e.target.value})}
                            className="w-full bg-[#121826] border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-body text-sm"
                        >
                            <option value="">Selecione...</option>
                            <option value="Menos de 1 ano">Menos de 1 ano</option>
                            <option value="De 1 a 3 anos">De 1 a 3 anos</option>
                            <option value="De 3 a 5 anos">De 3 a 5 anos</option>
                            <option value="Acima de 5 anos">Acima de 5 anos</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 font-display">Qual sua formação acadêmica?</label>
                        <select 
                            required 
                            value={form.questionario_formacao} 
                            onChange={(e) => setForm({...form, questionario_formacao: e.target.value})}
                            className="w-full bg-[#121826] border border-slate-700/50 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-body text-sm"
                        >
                            <option value="">Selecione...</option>
                            <option value="Ensino Médio">Ensino Médio</option>
                            <option value="Ensino Superior">Ensino Superior / Graduação</option>
                            <option value="Pós-graduação / MBA">Pós-graduação / MBA / Mestrado</option>
                            <option value="Certificação Financeira (CEA, CFP, CNPI)">Tenho Certificação Financeira Especializada</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-primary-hover text-background-dark font-display font-medium rounded-xl py-3.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-lg shadow-primary/20"
                    >
                        {loading ? 'Salvando Perfil...' : 'Confirmar & Acessar Dashboard'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SuitabilityForm;
