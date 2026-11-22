// Reúne todo o conteúdo de estudo (src/content/data/*.json) em índices por chave.
import type { Indexed } from '../data/manifest';
import { groupChain } from '../data/manifest';

export interface Acao { art: string; mov: string; papel: 'primario' | 'secundario'; nota?: string }
export interface Parte { key: string; pt: string; origem?: string; insercao?: string; inervacao?: Inervacao; acoes?: Acao[]; nota?: string }
export interface Inervacao { nervo: string; raizes?: string; nervoKeys?: string[] }
export interface Musculo {
  key: string; pt: string; latim?: string; sinonimos?: string[]; resumo?: string; origem?: string; insercao?: string;
  inervacao?: Inervacao; vascularizacao?: string; acoes?: Acao[]; funcao?: string; antagonistas?: string[]; sinergistas?: string[];
  palpacao?: string; teste?: string; alongamento?: string; clinica?: string; dica?: string; camada?: string; partes?: Parte[];
}
export interface Acidente { key: string; pt: string; nota?: string }
export interface Osso {
  key: string; pt: string; latim?: string; tipo?: string; resumo?: string; descricao?: string; articulacoes?: string[];
  acidentes?: Acidente[]; palpacao?: string; clinica?: string;
}
export interface Movimento { mov: string; adm?: string; plano?: string; eixo?: string; nota?: string }
export interface Articulacao {
  key: string; pt: string; art?: string; tipo?: string; graus?: number; resumo?: string; superficies?: string; movimentos?: Movimento[];
  estabilidade?: string; posicaoRepouso?: string; posicaoFechada?: string; padraoCapsular?: string; sensacaoFinal?: string; clinica?: string;
}
export interface Ligamento { key: string; pt: string; funcao?: string; clinica?: string }
export interface Nervo { key: string; pt: string; raizes?: string; origem?: string; trajeto?: string; motor?: string; sensitivo?: string; lesao?: string; resumo?: string }
export interface Estrutura { key: string; pt: string; latim?: string; resumo?: string; clinica?: string }
export interface Teste { id: string; nome: string; art: string; objetivo?: string; estruturas?: string[]; posicao?: string; execucao?: string; positivo?: string; observacao?: string }
export interface Roteiro { id: string; titulo: string; regiao?: string; resumo?: string; texto?: string; pontos?: string[]; estruturas?: string[]; perguntas?: { q: string; a: string }[] }
export interface FaseMarcha { fase: string; percentual?: string; descricao?: string; musculos?: { key: string; papel?: string }[]; articulacoes?: string }
export interface NeuroTabelas {
  dermatomos?: { nivel: string; area: string; ponto?: string }[];
  miotomos?: { nivel: string; movimento: string; musculos?: string }[];
  reflexos?: { reflexo: string; nivel: string; nervo?: string; como?: string }[];
  plexos?: { nome: string; raizes?: string; texto?: string; ramos?: string[] }[];
}

export type Info =
  | { tipo: 'musculo'; d: Musculo; parte?: Parte }
  | { tipo: 'osso'; d: Osso }
  | { tipo: 'ligamento'; d: Ligamento }
  | { tipo: 'nervo'; d: Nervo }
  | { tipo: 'estrutura'; d: Estrutura }
  | null;

const files = import.meta.glob('./data/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;
const pick = (prefix: string): unknown[] => Object.entries(files).filter(([p]) => p.split('/').pop()!.startsWith(prefix)).sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true })).map(([, v]) => v);
const arr = <T,>(prefix: string): T[] => pick(prefix).flatMap((v) => (Array.isArray(v) ? (v as T[]) : []));

export const musculos = new Map<string, Musculo>();
export const parteDe = new Map<string, { m: Musculo; p: Parte }>();
for (const m of arr<Musculo>('muscles-')) {
  if (!m?.key) continue;
  musculos.set(m.key, m);
  for (const p of m.partes ?? []) if (p?.key) parteDe.set(p.key, { m, p });
}
export const ossos = new Map<string, Osso>();
for (const o of arr<Osso>('bones-')) if (o?.key) ossos.set(o.key, o);
export const articulacoes = new Map<string, Articulacao>();
export const ligamentos = new Map<string, Ligamento>();
for (const f of pick('joints-') as { articulacoes?: Articulacao[]; ligamentos?: Ligamento[] }[]) {
  for (const a of f?.articulacoes ?? []) if (a?.key) articulacoes.set(a.key, a);
  for (const l of f?.ligamentos ?? []) if (l?.key) ligamentos.set(l.key, l);
}
export const nervos = new Map<string, Nervo>();
for (const n of arr<Nervo>('nerves-')) if (n?.key) nervos.set(n.key, n);
export const estruturas = new Map<string, Estrutura>();
for (const e of arr<Estrutura>('structures-')) if (e?.key) estruturas.set(e.key, e);
export const nomes = new Map<string, string>();
for (const f of pick('names-') as Record<string, string>[]) for (const [k, v] of Object.entries(f ?? {})) if (typeof v === 'string' && v) nomes.set(k, v);
export const testes: Teste[] = arr<Teste>('clinical-tests');
export const roteiros: Roteiro[] = arr<Roteiro>('study-guides');
export const marcha: FaseMarcha[] = ((pick('gait')[0] as { fases?: FaseMarcha[] })?.fases) ?? [];
export const neuro: NeuroTabelas = (pick('neuro-tabelas')[0] as NeuroTabelas) ?? {};

/** Nomes dos acidentes ósseos: por osso e geral. */
const acidentePorOsso = new Map<string, Acidente>();
const acidenteGeral = new Map<string, Acidente>();
for (const o of ossos.values()) for (const a of o.acidentes ?? []) { acidentePorOsso.set(o.key + '|' + a.key, a); if (!acidenteGeral.has(a.key)) acidenteGeral.set(a.key, a); }
export function acidente(boneKey: string, key: string): Acidente | undefined {
  return acidentePorOsso.get(boneKey + '|' + key) ?? acidenteGeral.get(key);
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Nome em português de qualquer chave (estrutura, grupo ou acidente). */
export function nomePt(key: string, m?: Indexed): string {
  const pd = parteDe.get(key);
  const mu = musculos.get(key); if (mu && !pd) return mu.pt;
  if (pd) {
    const base = pd.m.pt.replace(/^Músculos? /i, '');
    return /músculo|m\. /i.test(pd.p.pt) || pd.p.pt.toLowerCase().includes(base.toLowerCase().split(' ')[0]) ? cap(pd.p.pt) : `${cap(pd.p.pt)} do ${base.toLowerCase()}`;
  }
  const o = ossos.get(key); if (o) return o.pt;
  const l = ligamentos.get(key); if (l) return l.pt;
  const a = articulacoes.get(key); if (a) return a.pt;
  const n = nervos.get(key); if (n) return n.pt;
  const e = estruturas.get(key); if (e) return e.pt;
  const nm = nomes.get(key); if (nm) return nm;
  const ac = acidenteGeral.get(key); if (ac) return ac.pt;
  if (m) {
    const si = m.byKey.get(key);
    if (si !== undefined && m.structs[si].pt) return cap(m.structs[si].pt!);
    if (m.groups[key]?.pt) return cap(m.groups[key].pt!);
  }
  return key;
}

/** Conteúdo de estudo de uma estrutura (sobe na hierarquia para achar o músculo "pai" quando preciso). */
export function infoDe(key: string, m: Indexed): Info {
  const mu = musculos.get(key); if (mu) return { tipo: 'musculo', d: mu };
  const pd = parteDe.get(key); if (pd) return { tipo: 'musculo', d: pd.m, parte: pd.p };
  const o = ossos.get(key); if (o) return { tipo: 'osso', d: o };
  const l = ligamentos.get(key); if (l) return { tipo: 'ligamento', d: l };
  const n = nervos.get(key); if (n) return { tipo: 'nervo', d: n };
  const e = estruturas.get(key); if (e) return { tipo: 'estrutura', d: e };
  const si = m.byKey.get(key);
  if (si !== undefined && m.structs[si].c === 'muscle') {
    for (const g of groupChain(m, m.structs[si].g)) { const gm = musculos.get(g); if (gm) return { tipo: 'musculo', d: gm }; }
  }
  return null;
}

/** Estruturas 3D de um músculo do conteúdo (a própria chave, as partes, ou o grupo). */
export function structsDoMusculo(mu: Musculo, m: Indexed): number[] {
  const out = new Set<number>();
  const add = (k: string) => { const si = m.byKey.get(k); if (si !== undefined) out.add(si); };
  add(mu.key);
  for (const p of mu.partes ?? []) add(p.key);
  if (m.groups[mu.key]) {
    const walk = (g: string) => { for (const si of m.structsOf.get(g) ?? []) if (m.structs[si].c === 'muscle' || m.structs[si].c === 'tendon') out.add(si); for (const c of m.childrenOf.get(g) ?? []) if (!musculos.has(c)) walk(c); };
    walk(mu.key);
  }
  return [...out];
}

/** Resolve uma chave qualquer (estrutura, grupo, músculo do conteúdo) em estruturas 3D. */
export function resolver(key: string, m: Indexed): number[] {
  const mu = musculos.get(key);
  if (mu) { const r = structsDoMusculo(mu, m); if (r.length) return r; }
  const si = m.byKey.get(key);
  if (si !== undefined) return [si];
  if (m.groups[key]) {
    const out: number[] = [];
    const walk = (g: string) => { for (const s of m.structsOf.get(g) ?? []) out.push(s); for (const c of m.childrenOf.get(g) ?? []) walk(c); };
    walk(key);
    return out;
  }
  return [];
}

export const ART_NOME: Record<string, string> = {
  ombro: 'Ombro (glenoumeral)', escapula: 'Escápula (escapulotorácica)', cotovelo: 'Cotovelo', radioulnar: 'Radioulnar (antebraço)',
  punho: 'Punho', dedos_mao: 'Dedos da mão', polegar: 'Polegar', quadril: 'Quadril', joelho: 'Joelho', tornozelo: 'Tornozelo (talocrural)',
  subtalar: 'Subtalar', dedos_pe: 'Dedos do pé', halux: 'Hálux', cervical: 'Cabeça e pescoço', tronco: 'Tronco (coluna toracolombar)',
  costelas: 'Costelas (respiração)', pelve: 'Pelve', atm: 'ATM (mandíbula)', face: 'Face', hioide_laringe: 'Hioide e laringe', olho: 'Olho',
  assoalho_pelvico: 'Assoalho pélvico', geral: 'Geral',
};
export const MOV_NOME: Record<string, string> = {
  flexao: 'Flexão', extensao: 'Extensão', abducao: 'Abdução', aducao: 'Adução', rot_medial: 'Rotação medial', rot_lateral: 'Rotação lateral',
  abducao_horizontal: 'Abdução horizontal', aducao_horizontal: 'Adução horizontal', circunducao: 'Circundução', elevacao: 'Elevação',
  depressao: 'Depressão', protracao: 'Protração', retracao: 'Retração', rot_superior: 'Rotação superior', rot_inferior: 'Rotação inferior',
  inclinacao_anterior: 'Inclinação anterior', pronacao: 'Pronação', supinacao: 'Supinação', desvio_radial: 'Desvio radial',
  desvio_ulnar: 'Desvio ulnar', oposicao: 'Oposição', reposicao: 'Reposição', dorsiflexao: 'Dorsiflexão', flexao_plantar: 'Flexão plantar',
  inversao: 'Inversão', eversao: 'Eversão', flexao_lateral: 'Flexão lateral', rotacao_ipsilateral: 'Rotação ipsilateral',
  rotacao_contralateral: 'Rotação contralateral', inspiracao: 'Inspiração', expiracao_forcada: 'Expiração forçada',
  compressao_abdominal: 'Compressão abdominal', anteversao: 'Anteversão', retroversao: 'Retroversão', elevacao_pelve: 'Elevação da pelve',
  protrusao: 'Protrusão', retrusao: 'Retrusão', lateralidade: 'Lateralidade', estabilizacao: 'Estabilização', expressao: 'Expressão facial', outro: 'Outras ações',
};

/** Músculos que realizam um movimento numa articulação. */
export function motores(art: string, mov: string): { m: Musculo; papel: 'primario' | 'secundario'; nota?: string; parte?: string }[] {
  const out: { m: Musculo; papel: 'primario' | 'secundario'; nota?: string; parte?: string }[] = [];
  for (const m of musculos.values()) {
    const a = m.acoes?.find((x) => x.art === art && x.mov === mov);
    if (a) { out.push({ m, papel: a.papel, nota: a.nota }); continue; }
    for (const p of m.partes ?? []) {
      const pa = p.acoes?.find((x) => x.art === art && x.mov === mov);
      if (pa) { out.push({ m, papel: pa.papel, nota: pa.nota, parte: p.pt }); break; }
    }
  }
  return out.sort((a, b) => (a.papel === b.papel ? a.m.pt.localeCompare(b.m.pt) : a.papel === 'primario' ? -1 : 1));
}

/** Movimentos disponíveis por articulação (a partir das ações dos músculos). */
export function movimentosPorArt(): Map<string, string[]> {
  const out = new Map<string, Set<string>>();
  const add = (a: Acao) => { if (!out.has(a.art)) out.set(a.art, new Set()); out.get(a.art)!.add(a.mov); };
  for (const m of musculos.values()) { m.acoes?.forEach(add); m.partes?.forEach((p) => p.acoes?.forEach(add)); }
  const order = Object.keys(MOV_NOME);
  return new Map([...out].map(([k, v]) => [k, [...v].sort((a, b) => order.indexOf(a) - order.indexOf(b))]));
}

export function articulacaoDoCodigo(art: string): Articulacao | undefined {
  for (const a of articulacoes.values()) if (a.art === art) return a;
  return undefined;
}
