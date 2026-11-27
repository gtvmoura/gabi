// Perfil de quem usa o app: decide entre a experiência original (feita para a Gabi) e a adaptada.
// Este arquivo é puro (sem store, sem React): pode ser importado de qualquer lugar.

export type Tema = 'gabi' | 'atlas';

/** Primeiro nome digitado, sem espaços sobrando. */
export const primeiroNome = (nome?: string | null): string => (nome ?? '').trim().split(/\s+/)[0] ?? '';

/** Limpa o que foi digitado no portão: espaços normalizados e no máximo 30 caracteres. */
export const limparNome = (v: string): string => v.trim().replace(/\s+/g, ' ').slice(0, 30).trim();

/** Só o primeiro nome conta: sem acentos, sem diferenciar maiúsculas. */
export function ehGabi(nome?: string | null): boolean {
  const n = primeiroNome(nome).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return n === 'gabi' || n === 'gabriella';
}

/** Nome ainda desconhecido (portão aberto) conta como 'atlas'. */
export const temaDe = (nome?: string | null): Tema => (ehGabi(nome) ? 'gabi' : 'atlas');

/** Marca o tema em <html data-tema="…">. Chamado antes do primeiro render e a cada troca de nome. */
export function aplicarTema(nome?: string | null): Tema {
  const t = temaDe(nome);
  if (document.documentElement.dataset.tema !== t) document.documentElement.dataset.tema = t;
  return t;
}
