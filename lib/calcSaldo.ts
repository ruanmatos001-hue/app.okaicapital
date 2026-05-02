import { supabase } from './supabase';

/**
 * Busca a cotação atual do USD-BRL.
 * Usa cache em memória por 5 minutos para evitar chamadas excessivas.
 */
let _cachedRate: number | null = null;
let _cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

export async function getUsdBrlRate(): Promise<number> {
  if (_cachedRate && Date.now() - _cacheTime < CACHE_TTL) return _cachedRate;
  try {
    const res = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
    const data = await res.json();
    _cachedRate = parseFloat(data.USDBRL.bid);
    _cacheTime = Date.now();
    return _cachedRate;
  } catch {
    return _cachedRate || 5.0;
  }
}

/**
 * Converte um valor para BRL, se necessário.
 */
export function toBRL(valor: number, moeda: string, cotacao: number): number {
  return moeda === 'USD' ? valor * cotacao : valor;
}

/**
 * Calcula saldo real do usuário a partir de transações + rentabilidades.
 * 
 * Fórmula:
 *   saldo = Σ(aportes em BRL) - Σ(resgates em BRL) + Σ(rendimento_valor em BRL)
 * 
 * A taxa de performance já está contabilizada como transação de resgate,
 * então não é subtraída novamente do rendimento.
 */
export interface SaldoCalculado {
  saldo: number;
  totalAportado: number;
  totalRetirado: number;
  lucroRendimentos: number;
  lucroTotal: number;
  percentualTotal: number;
}

export async function calcularSaldoReal(
  usuarioId: string,
  carteiraId?: string
): Promise<SaldoCalculado> {
  const cotacao = await getUsdBrlRate();

  // 1. Buscar todas as transações
  let tQuery = supabase
    .from('transacoes')
    .select('*')
    .eq('usuario_id', usuarioId)
    .eq('status', 'confirmado');
  if (carteiraId) tQuery = tQuery.eq('carteira_id', carteiraId);

  const { data: transacoes } = await tQuery;

  // 2. Buscar todas as rentabilidades ativas
  let rQuery = supabase
    .from('rentabilidade_usuario_mensal')
    .select('*')
    .eq('usuario_id', usuarioId)
    .eq('status', 'ativo');
  if (carteiraId) rQuery = rQuery.eq('carteira_id', carteiraId);

  const { data: rentabilidades } = await rQuery;

  // 3. Somar aportes (BRL)
  let totalAportado = 0;
  let totalRetirado = 0;

  (transacoes || []).forEach(t => {
    const val = toBRL(t.valor || 0, t.moeda || 'BRL', cotacao);
    if (t.tipo === 'aporte' || t.tipo === 'deposito') {
      totalAportado += val;
    } else if (t.tipo === 'resgate' || t.tipo === 'retirada') {
      totalRetirado += val;
    }
  });

  // 4. Somar rendimentos (BRL)
  let lucroRendimentos = 0;
  (rentabilidades || []).forEach(r => {
    lucroRendimentos += toBRL(r.rendimento_valor || 0, r.moeda || 'BRL', cotacao);
  });

  // 5. Calcular saldo e lucro
  const saldo = totalAportado - totalRetirado + lucroRendimentos;
  const lucroTotal = saldo - totalAportado + totalRetirado; // = lucroRendimentos - taxas(já nos resgates)
  const percentualTotal = totalAportado > 0 ? (lucroTotal / totalAportado) * 100 : 0;

  return {
    saldo,
    totalAportado,
    totalRetirado,
    lucroRendimentos,
    lucroTotal,
    percentualTotal,
  };
}

/**
 * Calcula saldo de múltiplas carteiras de um usuário.
 */
export async function calcularSaldoTotalUsuario(
  usuarioId: string,
  carteiras: { id: string; carteira_id: string }[]
): Promise<SaldoCalculado> {
  const results = await Promise.all(
    carteiras.map(c => calcularSaldoReal(usuarioId, c.carteira_id))
  );

  const merged: SaldoCalculado = {
    saldo: 0,
    totalAportado: 0,
    totalRetirado: 0,
    lucroRendimentos: 0,
    lucroTotal: 0,
    percentualTotal: 0,
  };

  results.forEach(r => {
    merged.saldo += r.saldo;
    merged.totalAportado += r.totalAportado;
    merged.totalRetirado += r.totalRetirado;
    merged.lucroRendimentos += r.lucroRendimentos;
    merged.lucroTotal += r.lucroTotal;
  });

  merged.percentualTotal = merged.totalAportado > 0
    ? (merged.lucroTotal / merged.totalAportado) * 100
    : 0;

  return merged;
}
