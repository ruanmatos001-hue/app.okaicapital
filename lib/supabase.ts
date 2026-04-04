import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// =============================================
// Tipos do banco de dados
// =============================================

export interface Profile {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  tipo_investidor: 'comum' | 'qualificado' | 'profissional';
  status: 'ativo' | 'inativo' | 'pendente';
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Carteira {
  id: string;
  nome: string;
  descricao: string;
  tipo: 'grao' | 'avane' | 'outro';
  status: 'ativo' | 'inativo' | 'em_breve';
  rentabilidade_alvo_anual: number;
  aporte_minimo: number;
  liquidez: string;
  imagem_url?: string;
  created_at: string;
}

export interface UsuarioCarteira {
  id: string;
  usuario_id: string;
  carteira_id: string;
  saldo_atual: number;
  total_investido: number;
  total_rendimento: number;
  percentual_rendimento: number;
  data_primeiro_aporte?: string;
  created_at: string;
  updated_at: string;
  carteira?: Carteira;
}

export interface Transacao {
  id: string;
  usuario_id: string;
  carteira_id: string;
  tipo: 'aporte' | 'resgate' | 'rendimento' | 'bonus';
  valor: number;
  descricao?: string;
  status: 'pendente' | 'confirmado' | 'cancelado';
  data_referencia?: string;
  created_at: string;
  carteira?: Carteira;
}

export interface RentabilidadeMensal {
  id: string;
  carteira_id: string;
  ano: number;
  mes: number;
  percentual_retorno: number;
  valor_cota?: number;
  benchmark_cdi?: number;
  created_at: string;
}

export interface RentabilidadeUsuarioMensal {
  id: string;
  usuario_id: string;
  carteira_id: string;
  ano: number;
  mes: number;
  saldo_inicio: number;
  saldo_fim: number;
  rendimento_valor: number;
  rendimento_percentual: number;
  created_at: string;
}

// =============================================
// Helpers de formatação
// =============================================

export const formatBRL = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatPercent = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};
