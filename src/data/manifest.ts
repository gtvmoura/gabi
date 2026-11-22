// Tipos e índices do manifesto 3D (gerado por scripts/build-manifest.mjs).

export type Sys = 'skeleton' | 'muscles' | 'joints' | 'nervous' | 'vessels' | 'viscera' | 'lymph' | 'regions';
export type Cat =
  | 'bone' | 'cartilage' | 'tooth' | 'muscle' | 'tendon' | 'bursa' | 'fascia' | 'sheath'
  | 'ligament' | 'capsule' | 'disc' | 'fat' | 'nerve' | 'cns' | 'sense' | 'artery' | 'vein' | 'heart'
  | 'organ' | 'lymph' | 'skin';
export type Side = 'l' | 'r' | '';

export interface Struct {
  k: string;            // nome em inglês (chave)
  s: Sys;
  c: Cat;
  g: string | null;     // grupo pai
  pt?: string;          // nome em português (base TA2; o conteúdo revisado tem prioridade)
  la?: string;
  on?: string;
  m: { l?: string; r?: string; c?: string };
}
export interface MeshRec { s: number; d: Side; c: [number, number, number]; r: number; b: [number, number, number, number, number, number]; mir?: string; mat?: string; mats?: string[] }
export interface InsertionRec { id: string; ms: number[]; mk: string; t: 'o' | 'e'; n: number; d: Side; b: number; c: [number, number, number]; r: number; mir?: string }
export interface LandmarkRec { k: string; on: string; p: [number, number, number]; pt?: string; la?: string }
export interface GroupRec { p: string | null; s: Sys; pt?: string }

export interface Manifest {
  v: number;
  structs: Struct[];
  meshes: Record<string, MeshRec>;
  insertions: InsertionRec[];
  landmarks: LandmarkRec[];
  groups: Record<string, GroupRec>;
}

export interface Indexed extends Manifest {
  byKey: Map<string, number>;                 // nome -> índice da estrutura
  childrenOf: Map<string | null, string[]>;   // grupo -> subgrupos
  structsOf: Map<string, number[]>;           // grupo -> estruturas diretas
  insByMuscle: Map<number, InsertionRec[]>;
  insByBone: Map<number, InsertionRec[]>;
  insById: Map<string, InsertionRec>;
  lmByStruct: Map<number, LandmarkRec[]>;
}

let cache: Promise<Indexed> | null = null;

export function loadManifest(): Promise<Indexed> {
  if (!cache) {
    cache = fetch(`${import.meta.env.BASE_URL}data/manifest.json`).then((r) => r.json()).then((m: Manifest) => {
      const byKey = new Map<string, number>();
      m.structs.forEach((s, i) => { if (!byKey.has(s.k)) byKey.set(s.k, i); });
      const childrenOf = new Map<string | null, string[]>();
      for (const [k, g] of Object.entries(m.groups)) {
        if (!childrenOf.has(g.p)) childrenOf.set(g.p, []);
        childrenOf.get(g.p)!.push(k);
      }
      const structsOf = new Map<string, number[]>();
      m.structs.forEach((s, i) => {
        if (!s.g) return;
        if (!structsOf.has(s.g)) structsOf.set(s.g, []);
        structsOf.get(s.g)!.push(i);
      });
      const insByMuscle = new Map<number, InsertionRec[]>();
      const insByBone = new Map<number, InsertionRec[]>();
      const insById = new Map<string, InsertionRec>();
      for (const ins of m.insertions) {
        insById.set(ins.id, ins);
        for (const si of ins.ms) { if (!insByMuscle.has(si)) insByMuscle.set(si, []); insByMuscle.get(si)!.push(ins); }
        if (ins.b >= 0) { if (!insByBone.has(ins.b)) insByBone.set(ins.b, []); insByBone.get(ins.b)!.push(ins); }
      }
      const lmByStruct = new Map<number, LandmarkRec[]>();
      for (const l of m.landmarks) {
        const si = m.meshes[l.on]?.s;
        if (si === undefined) continue;
        if (!lmByStruct.has(si)) lmByStruct.set(si, []);
        lmByStruct.get(si)!.push(l);
      }
      return { ...m, byKey, childrenOf, structsOf, insByMuscle, insByBone, insById, lmByStruct };
    });
  }
  return cache;
}

/** Todas as estruturas sob um grupo (recursivo). */
export function structsUnder(m: Indexed, group: string, out: number[] = []): number[] {
  for (const si of m.structsOf.get(group) ?? []) out.push(si);
  for (const g of m.childrenOf.get(group) ?? []) structsUnder(m, g, out);
  return out;
}

/** Cadeia de grupos, do mais próximo ao mais geral. */
export function groupChain(m: Indexed, g: string | null): string[] {
  const out: string[] = [];
  while (g && m.groups[g]) { out.push(g); g = m.groups[g].p; }
  return out;
}
