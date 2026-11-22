// Repetição espaçada (variação simples do SM-2).
import type { SrsCard } from '../store';

export type Nota = 0 | 1 | 2 | 3; // errei, difícil, bom, fácil
const DIA = 86400000;

export function revisar(c: SrsCard | undefined, nota: Nota, agora = Date.now()): SrsCard {
  const card = c ?? { due: agora, ivl: 0, ease: 2.5, reps: 0, lapses: 0 };
  let { ivl, ease, reps, lapses } = card;
  if (nota === 0) { reps = 0; lapses++; ease = Math.max(1.3, ease - 0.2); ivl = 0; return { due: agora + 60_000, ivl, ease, reps, lapses }; }
  reps++;
  if (nota === 1) ease = Math.max(1.3, ease - 0.15);
  if (nota === 3) ease += 0.15;
  if (reps === 1) ivl = nota === 3 ? 3 : 1;
  else if (reps === 2) ivl = nota === 1 ? 2 : nota === 3 ? 6 : 4;
  else ivl = Math.round(ivl * (nota === 1 ? 1.2 : nota === 3 ? ease * 1.3 : ease));
  return { due: agora + ivl * DIA, ivl, ease, reps, lapses };
}

export function proximo(c: SrsCard | undefined, nota: Nota): string {
  const r = revisar(c, nota, 0);
  if (nota === 0) return '1 min';
  return r.ivl === 1 ? '1 dia' : r.ivl < 30 ? `${r.ivl} dias` : `${Math.round(r.ivl / 30)} mês(es)`;
}
