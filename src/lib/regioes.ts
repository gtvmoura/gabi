import type { Indexed } from '../data/manifest';
import { groupChain } from '../data/manifest';
import { resolver } from '../content';

export type MacroRegiao = 'ms' | 'mi' | 'tronco' | 'cabeca';
export const MACRO: { id: MacroRegiao; nome: string }[] = [
  { id: 'ms', nome: 'Membro superior' }, { id: 'mi', nome: 'Membro inferior' }, { id: 'tronco', nome: 'Tronco' }, { id: 'cabeca', nome: 'Cabeça e pescoço' },
];
const MAPA: [RegExp, MacroRegiao][] = [
  [/upper limb|pectoral girdle/i, 'ms'], [/lower limb|pelvic girdle/i, 'mi'],
  [/Cervical part|Cranial part|Cranium|head|Laryngeal|Nasal|Teeth|ear|Auditory/i, 'cabeca'],
  [/Abdominal|Dorsal|Thoracic|Pelvic|Vertebral|thorax|pelvis/i, 'tronco'],
];
const cache = new Map<string, MacroRegiao | null>();
/** Grande região de uma chave (pela hierarquia do modelo). */
export function macroDe(key: string, m: Indexed): MacroRegiao | null {
  if (cache.has(key)) return cache.get(key)!;
  let out: MacroRegiao | null = null;
  const si = resolver(key, m)[0];
  if (si !== undefined) {
    const chain = groupChain(m, m.structs[si].g).join(' | ');
    for (const [re, r] of MAPA) if (re.test(chain)) { out = r; break; }
  }
  cache.set(key, out);
  return out;
}

/** Regiões "de consultório": caixas no espaço do modelo (metros; y para cima, |x| = distância da linha média). */
export interface Regiao { id: string; nome: string; desc: string; box: [number, number, number, number]; view?: 'anterior' | 'posterior' }
export const REGIOES: Regiao[] = [
  { id: 'cabeca', nome: 'Cabeça e pescoço', desc: 'Crânio, face, ATM, cervical', box: [0, 0.14, 1.4, 1.8] },
  { id: 'ombro', nome: 'Ombro', desc: 'Cintura escapular e glenoumeral', box: [0.04, 0.3, 1.24, 1.5] },
  { id: 'braco', nome: 'Braço e cotovelo', desc: 'Úmero, cotovelo', box: [0.13, 0.36, 1.0, 1.33] },
  { id: 'antebraco', nome: 'Antebraço, punho e mão', desc: 'Rádio, ulna, carpo, dedos', box: [0.16, 0.5, 0.6, 1.12] },
  { id: 'torax', nome: 'Tórax', desc: 'Costelas, esterno, respiração', box: [0, 0.2, 1.08, 1.45] },
  { id: 'coluna', nome: 'Coluna e abdome', desc: 'Coluna toracolombar e parede abdominal', box: [0, 0.19, 0.9, 1.42], view: 'posterior' },
  { id: 'quadril', nome: 'Pelve e quadril', desc: 'Osso do quadril, sacro, glúteos', box: [0, 0.25, 0.76, 1.08] },
  { id: 'coxa', nome: 'Coxa e joelho', desc: 'Fêmur, patela, ligamentos do joelho', box: [0, 0.26, 0.38, 0.92] },
  { id: 'perna', nome: 'Perna, tornozelo e pé', desc: 'Tíbia, fíbula, tarso, arcos do pé', box: [0, 0.3, -0.02, 0.5] },
];

export function structsDaRegiao(r: Regiao, m: Indexed): number[] {
  const out: number[] = [];
  const [x0, x1, y0, y1] = r.box;
  m.structs.forEach((s, si) => {
    for (const id of Object.values(s.m)) {
      if (!id) continue;
      const c = m.meshes[id].c, ax = Math.abs(c[0]);
      if (ax >= x0 && ax <= x1 && c[1] >= y0 && c[1] <= y1) { out.push(si); break; }
    }
  });
  return out;
}
