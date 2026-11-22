import type { Indexed } from '../data/manifest';
import { articulacoes, estruturas, musculos, nervos, nomePt, ossos, roteiros, testes } from '../content';
import { norm } from './text';

export interface Hit { tipo: 'estrutura' | 'musculo' | 'grupo' | 'acidente' | 'roteiro' | 'teste'; key: string; nome: string; sub: string; si?: number; on?: string; score: number }
interface Entry { tipo: Hit['tipo']; key: string; nome: string; sub: string; si?: number; on?: string; hay: string; peso: number }

const CAT_NOME: Record<string, string> = {
  bone: 'Osso', cartilage: 'Cartilagem', tooth: 'Dente', muscle: 'Músculo', tendon: 'Tendão', bursa: 'Bolsa', fascia: 'Fáscia', sheath: 'Bainha tendínea',
  ligament: 'Ligamento', capsule: 'Cápsula articular', disc: 'Disco / menisco', fat: 'Corpo adiposo', nerve: 'Nervo', cns: 'Sistema nervoso central',
  sense: 'Órgão dos sentidos', artery: 'Artéria', vein: 'Veia', heart: 'Coração', organ: 'Órgão', lymph: 'Linfático', skin: 'Região',
};
export const catNome = (c: string) => CAT_NOME[c] ?? c;

let index: Entry[] | null = null;

function build(m: Indexed): Entry[] {
  const out: Entry[] = [];
  const peso: Record<string, number> = { muscle: 3, bone: 3, ligament: 2, nerve: 2, disc: 2, artery: 1.5, vein: 1.2 };
  m.structs.forEach((s, si) => {
    const nome = nomePt(s.k, m);
    const extra = musculos.get(s.k)?.sinonimos?.join(' ') ?? '';
    out.push({ tipo: 'estrutura', key: s.k, nome, sub: catNome(s.c), si, hay: norm(`${nome} ${s.k} ${s.la ?? ''} ${extra}`), peso: peso[s.c] ?? 1 });
  });
  for (const mu of musculos.values()) {
    if (m.byKey.has(mu.key)) continue; // já entrou como estrutura
    out.push({ tipo: 'musculo', key: mu.key, nome: mu.pt, sub: 'Músculo', hay: norm(`${mu.pt} ${mu.key} ${mu.latim ?? ''} ${(mu.sinonimos ?? []).join(' ')}`), peso: 3.2 });
  }
  for (const a of articulacoes.values()) out.push({ tipo: 'grupo', key: a.key, nome: a.pt, sub: 'Articulação', hay: norm(`${a.pt} ${a.key}`), peso: 2.5 });
  const seen = new Set<string>();
  for (const l of m.landmarks) {
    const boneKey = m.structs[m.meshes[l.on].s].k;
    const id = boneKey + '|' + l.k;
    if (seen.has(id)) continue; seen.add(id);
    const nome = ossos.get(boneKey)?.acidentes?.find((a) => a.key === l.k)?.pt ?? nomePt(l.k, m);
    out.push({ tipo: 'acidente', key: l.k, nome, sub: `em ${nomePt(boneKey, m)}`, si: m.meshes[l.on].s, on: l.on, hay: norm(`${nome} ${l.k}`), peso: 0.9 });
  }
  for (const r of roteiros) out.push({ tipo: 'roteiro', key: r.id, nome: r.titulo, sub: 'Roteiro de estudo', hay: norm(r.titulo), peso: 1.6 });
  for (const t of testes) out.push({ tipo: 'teste', key: t.id, nome: t.nome, sub: 'Teste clínico', hay: norm(t.nome), peso: 1.6 });
  void estruturas; void nervos;
  return out;
}

export function search(m: Indexed, q: string, limit = 40): Hit[] {
  if (!index) index = build(m);
  const terms = norm(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const hits: Hit[] = [];
  for (const e of index) {
    let score = 0;
    const nn = norm(e.nome);
    for (const t of terms) {
      const i = e.hay.indexOf(t);
      if (i < 0) { score = 0; break; }
      score += nn.startsWith(t) ? 6 : nn.includes(' ' + t) ? 4 : nn.includes(t) ? 3 : i === 0 || e.hay[i - 1] === ' ' ? 2 : 1;
    }
    if (!score) continue;
    score = score * e.peso - nn.length * 0.01;
    hits.push({ tipo: e.tipo, key: e.key, nome: e.nome, sub: e.sub, si: e.si, on: e.on, score });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
