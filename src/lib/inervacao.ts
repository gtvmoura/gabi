import type { Indexed } from '../data/manifest';
import { musculos, nervos, structsDoMusculo } from '../content';

const CORES = ['#ff6b6b', '#4dabf7', '#51cf66', '#ffd43b', '#cc5de8', '#ff922b', '#22b8cf', '#f06595', '#94d82d', '#845ef7', '#20c997', '#fcc419', '#e599f7', '#74c0fc', '#ffa8a8', '#63e6be', '#d0bfff', '#ffc078', '#a9e34b', '#99e9f2'];
export interface GrupoNervo { nome: string; cor: string; sis: number[]; n: number }
let cache: { porStruct: Map<number, string>; grupos: GrupoNervo[] } | null = null;

/** Agrupa os músculos pelo nervo principal e dá uma cor a cada nervo. */
export function mapaInervacao(m: Indexed) {
  if (cache) return cache;
  const g = new Map<string, GrupoNervo>();
  for (const mu of musculos.values()) {
    const iv = mu.inervacao; if (!iv?.nervo) continue;
    const k = iv.nervoKeys?.[0];
    const nome = (k && nervos.get(k)?.pt) || iv.nervo.split(/[(;,—–]| e /)[0].trim();
    const id = nome.toLowerCase();
    if (!g.has(id)) g.set(id, { nome, cor: '', sis: [], n: 0 });
    const x = g.get(id)!; x.n++; x.sis.push(...structsDoMusculo(mu, m));
  }
  // membros e tronco primeiro (são os que mais interessam); depois os demais, reaproveitando as cores
  const peso = (x: GrupoNervo) => (/facial|vago|trig|mandibular|hipoglosso|oculomotor|troclear|abducente|glossofar|cervical|laríng/i.test(x.nome) ? 0 : 1000) + x.sis.length;
  const grupos = [...g.values()].filter((x) => x.sis.length).sort((a, b) => peso(b) - peso(a));
  grupos.forEach((x, i) => { x.cor = CORES[i % CORES.length]; });
  const porStruct = new Map<number, string>();
  for (const x of grupos) for (const si of x.sis) if (!porStruct.has(si)) porStruct.set(si, x.cor);
  cache = { porStruct, grupos };
  return cache;
}
