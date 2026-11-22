// Esqueleto articulado: agrupa os ossos em segmentos rígidos ligados por articulações,
// e descreve cada movimento como rotações desses segmentos em torno de eixos anatômicos.
//
// Convenções (espaço do modelo, em metros): y para cima, +z anterior, +x = lado ESQUERDO do corpo.
// Tudo é definido para o lado esquerdo; o lado direito é o espelho (x → −x).
// Os pivôs vêm de pontos do próprio modelo (acidentes ósseos) e de ajustes de esfera
// às cabeças do úmero e do fêmur, calculados a partir das malhas.

import { Matrix4, Vector3 } from 'three';
import type { Indexed } from '../data/manifest';

export type V3 = [number, number, number];
export type Rot = { ax: V3; deg: number } | { t: V3 };
export type Pose = Record<string, Rot[]>;
export interface Seg { id: string; parent: string | null; pivot: V3; bilateral: boolean }
export interface Rig { segs: Map<string, Seg>; order: string[]; segOfKey: Map<string, string> }

const ORD = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth'];
const VERT = ['L5', 'L4', 'L3', 'L2', 'L1', 'T12', 'T11', 'T10', 'T9', 'T8', 'T7', 'T6', 'T5', 'T4', 'T3', 'T2', 'T1', 'C7', 'C6', 'C5', 'C4', 'C3'].map((v) => `Vertebra ${v}`);
const DEDOS = ['second', 'third', 'fourth', 'fifth'];

let cache: Rig | null = null;

export function buildRig(m: Indexed): Rig {
  if (cache) return cache;
  const segs = new Map<string, Seg>();
  const order: string[] = [];
  const segOfKey = new Map<string, string>();
  const add = (id: string, parent: string | null, pivot: V3, bilateral: boolean, keys: string[] = []) => {
    segs.set(id, { id, parent, pivot, bilateral }); order.push(id);
    for (const k of keys) segOfKey.set(k, id);
  };
  const bb = (key: string) => { const s = m.structs[m.byKey.get(key)!]; return m.meshes[(s.m.l ?? s.m.c)!].b; };

  // pelve (raiz fixa) e coluna, de baixo para cima
  add('pelve', null, [0, 0.9, 0], false, ['Hip bone', 'Sacrum', 'Coccyx']);
  let pai = 'pelve';
  for (const k of [...VERT, 'Axis (C2)', 'Atlas (C1)']) {
    const b = bb(k);
    add(k, pai, [0, b[1] + 0.15 * (b[4] - b[1]), b[5] - 0.22 * (b[5] - b[2])], false, [k]);
    pai = k;
  }
  segs.get('Atlas (C1)')!.pivot = [0, 1.536, -0.008];               // gira em torno do dente do áxis
  add('cabeca', 'Atlas (C1)', [0, 1.5525, -0.014], false);          // côndilos occipitais
  add('mandibula', 'cabeca', [0, 1.5714, 0.0124], false, ['Mandible']); // côndilos da mandíbula
  segOfKey.set('Hyoid bone', 'Vertebra C3');
  for (const k of ['Thyroid cartilage', 'Cricoid cartilage', 'Arytenoid cartilage', 'Corniculate cartilage']) segOfKey.set(k, 'Vertebra C5');

  // tórax: esterno e costelas (cada costela articula com a vértebra torácica de mesmo número)
  add('esterno', 'Vertebra T4', [0, 1.33, 0.06], false, ['Manubrium of sternum', 'Body of sternum', 'Xiphoid process']);
  ORD.forEach((o, i) => {
    const k = `${o} rib`; const b = bb(k); const vb = bb(`Vertebra T${i + 1}`);
    add('costela' + (i + 1), `Vertebra T${i + 1}`, [b[0] + 0.012, b[4] - 0.01, vb[5] - 0.22 * (vb[5] - vb[2])], true, [k]);
    if (i < 10) segOfKey.set(`Costal cartilage of ${o.toLowerCase()} rib`, 'costela' + (i + 1));
  });

  // membro superior
  add('clavicula', 'esterno', [0.0292, 1.4149, 0.0416], true, ['Clavicle']);          // esternoclavicular
  add('escapula', 'clavicula', [0.1429, 1.4229, -0.0422], true, ['Scapula']);        // acromioclavicular
  add('umero', 'escapula', [0.1704, 1.3829, -0.0263], true, ['Humerus']);            // centro da cabeça do úmero
  add('ulna', 'umero', [0.2285, 1.1016, -0.0269], true, ['Ulna']);                   // entre capítulo e tróclea
  add('radio', 'ulna', [0.2289, 1.0825, -0.0315], true, ['Radius']);                 // cabeça do rádio
  add('mao', 'radio', [0.262, 0.853, 0.018], true);                                 // cabeça do capitato
  for (const k of ['Scaphoid bone', 'Lunate bone', 'Triquetrum bone', 'Pisiform bone', 'Trapezium bone', 'Trapezoid bone', 'Capitate bone', 'Hamate bone',
    'First metacarpal bone', 'Second metacarpal bone', 'Third metacarpal bone', 'Fourth metacarpal bone', 'Fifth metacarpal bone',
    'Proximal phalanx of first finger of hand', 'Distal phalanx of first finger of hand']) segOfKey.set(k, 'mao');
  for (const d of DEDOS) {
    let p = 'mao';
    for (const f of ['Proximal', 'Middle', 'Distal']) {
      const k = `${f} phalanx of ${d} finger of hand`; const b = bb(k);
      const id = `dedo-${d}-${f}`;
      add(id, p, [(b[0] + b[3]) / 2, b[4] - 0.002, (b[2] + b[5]) / 2], true, [k]);
      p = id;
    }
  }

  // membro inferior
  add('femur', 'pelve', [0.0837, 0.8606, -0.0049], true, ['Femur']);                 // centro da cabeça do fêmur
  add('perna', 'femur', [0.0747, 0.452, -0.034], true, ['Tibia', 'Fibula', 'Patella']); // eixo transepicondilar
  add('talus', 'perna', [0.077, 0.081, -0.043], true, ['Talus']);                    // tróclea do tálus
  add('pe', 'talus', [0.066, 0.054, -0.036], true);                                 // subtalar

  // o que sobrou: ossos do pé, crânio e dentes
  m.structs.forEach((s) => {
    if (!['bone', 'cartilage', 'tooth'].includes(s.c) || segOfKey.has(s.k)) return;
    if (/of foot$|metatarsal|cuneiform|Navicular|Cuboid|Calcaneus|Sesamoid bones of foot/.test(s.k)) segOfKey.set(s.k, 'pe');
    else if (/^Lower /.test(s.k)) segOfKey.set(s.k, 'mandibula');
    else { const id = s.m.l ?? s.m.c ?? s.m.r; if (id && m.meshes[id].c[1] > 1.45) segOfKey.set(s.k, 'cabeca'); }
  });

  cache = { segs, order, segOfKey };
  return cache;
}

const S = new Matrix4().makeScale(-1, 1, 1);
const tmpV = new Vector3();

function local(seg: Seg, rots: Rot[] | undefined): Matrix4 {
  const M = new Matrix4().makeTranslation(seg.pivot[0], seg.pivot[1], seg.pivot[2]);
  for (const r of rots ?? []) {
    if ('t' in r) M.multiply(new Matrix4().makeTranslation(r.t[0], r.t[1], r.t[2]));
    else M.multiply(new Matrix4().makeRotationAxis(tmpV.set(r.ax[0], r.ax[1], r.ax[2]).normalize(), (r.deg * Math.PI) / 180));
  }
  return M.multiply(new Matrix4().makeTranslation(-seg.pivot[0], -seg.pivot[1], -seg.pivot[2]));
}

/** Transformação de cada segmento, para cada lado. `soEsquerdo`: o lado direito fica parado. */
export function evalPose(rig: Rig, pose: Pose, soEsquerdo = false): { l: Map<string, Matrix4>; r: Map<string, Matrix4> } {
  const out = { l: new Map<string, Matrix4>(), r: new Map<string, Matrix4>() };
  for (const side of ['l', 'r'] as const) {
    const A = out[side];
    for (const id of rig.order) {
      const seg = rig.segs.get(id)!;
      let L = local(seg, side === 'r' && seg.bilateral && soEsquerdo ? undefined : pose[id]);
      if (side === 'r' && seg.bilateral) L = S.clone().multiply(L).multiply(S);
      A.set(id, seg.parent ? A.get(seg.parent)!.clone().multiply(L) : L);
    }
  }
  return out;
}

// ─────────────────────────────── catálogo de movimentos

export type Vista = 'anterior' | 'posterior' | 'direita' | 'esquerda' | 'superior';
export interface MovDef {
  nome: string;
  de: number; ate: number;          // parâmetro animado, em graus (ou mm na ATM)
  zero?: number;                    // valor do parâmetro na posição de referência (0°)
  unidade?: string;
  pose: (a: number) => Pose;
  lados?: 'ambos' | 'esquerdo';
  vista: Vista;
  quadro: { c: V3; r: number };     // enquadramento (lado esquerdo)
  gonio?: { seg: string; ponta: V3; base?: string };   // base: segmento cujo pivô é o vértice do ângulo
  nota?: string;
  ambos?: boolean;                  // enquadrar os dois lados
}

const X: V3 = [1, 0, 0], Y: V3 = [0, 1, 0], Z: V3 = [0, 0, 1];
const COTOVELO: V3 = [0.993, 0.048, -0.12];
const JOELHO: V3 = [0.993, 0.091, 0.065];
const TORNOZELO: V3 = [0.934, -0.308, -0.186];
const PRONACAO: V3 = [0.047, -0.977, 0.205];
const SUBTALAR: V3 = [-0.205, 0.669, 0.714];
const r = (ax: V3, deg: number): Rot => ({ ax, deg });

/** Distribui um ângulo por vários segmentos da coluna. */
function coluna(pesos: [string, number][], ax: V3, a: number): Pose {
  const p: Pose = {};
  for (const [k, w] of pesos) p[k] = [r(ax, a * w)];
  return p;
}
const CERV = (w0: number, w1: number): [string, number][] => {
  const resto = (1 - w0 - w1) / 6;
  return [['cabeca', w0], ['Atlas (C1)', w1], ['Axis (C2)', resto], ['Vertebra C3', resto], ['Vertebra C4', resto], ['Vertebra C5', resto], ['Vertebra C6', resto], ['Vertebra C7', resto]];
};
const TRONCO = (lombar: number): [string, number][] => [
  ...['L5', 'L4', 'L3', 'L2', 'L1'].map((v): [string, number] => [`Vertebra ${v}`, lombar / 5]),
  ...['T12', 'T11', 'T10', 'T9', 'T8', 'T7', 'T6', 'T5', 'T4', 'T3', 'T2', 'T1'].map((v): [string, number] => [`Vertebra ${v}`, (1 - lombar) / 12]),
];

/** Ritmo escapuloumeral: os primeiros ~30° são só glenoumerais; depois, 2:1. */
const escapula = (a: number) => Math.max(0, a - 30) * 0.4;

const OMBRO = { c: [0.17, 1.25, -0.02] as V3, r: 0.55 };
const COT = { c: [0.23, 1.0, 0.0] as V3, r: 0.3 };
const MAO = { c: [0.27, 0.82, 0.04] as V3, r: 0.13 };
const QUADRIL = { c: [0.08, 0.6, 0.05] as V3, r: 0.6 };
const JOE = { c: [0.08, 0.32, -0.05] as V3, r: 0.35 };
const PE = { c: [0.08, 0.07, 0.0] as V3, r: 0.15 };
const CAB = { c: [0, 1.56, 0.0] as V3, r: 0.2 };
const TRO = { c: [0, 1.15, -0.05] as V3, r: 0.6 };
const ROT = { c: [0.2, 1.15, 0.08] as V3, r: 0.32 };
const HORIZ = { c: [0.25, 1.35, 0.1] as V3, r: 0.55 };
const ANTEB = { c: [0.24, 1.08, 0.14] as V3, r: 0.17 };

export const MOVS: Record<string, MovDef> = {
  // ombro
  'ombro:flexao': { nome: 'Flexão do ombro', de: 0, ate: 180, vista: 'esquerda', quadro: { c: [0.17, 1.45, 0.08], r: 0.6 }, gonio: { seg: 'umero', ponta: [0.22, 1.1, -0.03] },
    pose: (a) => { const b = escapula(a); return { escapula: [r(Z, b)], umero: [r(Z, -b), r(X, -a)] }; },
    nota: 'Acima de ~30°, a escápula roda para cima: para cada 2° do úmero, 1° da escápula (ritmo escapuloumeral).' },
  'ombro:extensao': { nome: 'Extensão do ombro', de: 0, ate: 45, vista: 'esquerda', quadro: OMBRO, gonio: { seg: 'umero', ponta: [0.22, 1.1, -0.03] }, pose: (a) => ({ umero: [r(X, a)] }) },
  'ombro:abducao': { nome: 'Abdução do ombro', ambos: true, de: 0, ate: 180, vista: 'anterior', quadro: { c: [0.17, 1.42, -0.02], r: 0.62 }, gonio: { seg: 'umero', ponta: [0.22, 1.1, -0.03] },
    pose: (a) => { const b = escapula(a); return { clavicula: [r(Z, b * 0.25)], escapula: [r(Z, b - b * 0.25)], umero: [r(Z, a - b), r(Y, Math.max(0, a - 90) * 0.45)] }; },
    nota: 'Ritmo escapuloumeral 2:1 depois dos primeiros ~30°, e rotação lateral do úmero acima de 90° para o tubérculo maior passar sob o acrômio.' },
  'ombro:aducao': { nome: 'Adução do ombro', de: 90, ate: -15, zero: 0, lados: 'esquerdo', vista: 'anterior', quadro: OMBRO, gonio: { seg: 'umero', ponta: [0.22, 1.1, -0.03] },
    pose: (a) => { const b = escapula(a); return { escapula: [r(Z, b)], umero: [r(X, a < 0 ? (a / 15) * 25 : 0), r(Z, a - b)] }; },
    nota: 'Volta da abdução até a posição anatômica; além dela (0–15°) só com leve flexão, passando à frente do tronco.' },
  'ombro:rot_lateral': { nome: 'Rotação lateral do ombro', de: 0, ate: 90, vista: 'superior', quadro: ROT, gonio: { seg: 'umero', ponta: [0.25, 1.1, 0.25] },
    pose: (a) => ({ umero: [r(Y, a)], ulna: [r(COTOVELO, -90)] }), nota: 'Cotovelo a 90°: o antebraço funciona como o ponteiro do goniômetro.' },
  'ombro:rot_medial': { nome: 'Rotação medial do ombro', de: 0, ate: 70, vista: 'superior', quadro: ROT, gonio: { seg: 'umero', ponta: [0.25, 1.1, 0.25] },
    pose: (a) => ({ umero: [r(Y, -a)], ulna: [r(COTOVELO, -90)] }), nota: 'Com o braço junto ao corpo o antebraço encosta no abdome por volta de 70°; a amplitude completa é medida com o ombro abduzido a 90°.' },
  'ombro:aducao_horizontal': { nome: 'Adução horizontal do ombro', de: 0, ate: 135, vista: 'superior', quadro: HORIZ, gonio: { seg: 'umero', ponta: [0.22, 1.1, -0.03] },
    pose: (a) => ({ clavicula: [r(Y, -a * 0.08)], umero: [r(Y, -a), r(Z, 90)] }), nota: 'Parte do braço abduzido a 90° e leva-o para a frente e para dentro.' },
  'ombro:abducao_horizontal': { nome: 'Abdução horizontal do ombro', de: 0, ate: 45, vista: 'superior', quadro: HORIZ, gonio: { seg: 'umero', ponta: [0.22, 1.1, -0.03] },
    pose: (a) => ({ clavicula: [r(Y, a * 0.15)], umero: [r(Y, a), r(Z, 90)] }), nota: 'Parte do braço abduzido a 90° e leva-o para trás.' },

  // cintura escapular
  'escapula:elevacao': { nome: 'Elevação da escápula', de: 0, ate: 30, vista: 'anterior', quadro: OMBRO, pose: (a) => ({ clavicula: [r(Z, a)], escapula: [r(Z, -a * 0.6)] }) },
  'escapula:depressao': { nome: 'Depressão da escápula', de: 0, ate: 8, vista: 'anterior', quadro: OMBRO, pose: (a) => ({ clavicula: [r(Z, -a)] }) },
  'escapula:protracao': { nome: 'Protração da escápula', de: 0, ate: 18, vista: 'superior', quadro: OMBRO, pose: (a) => ({ clavicula: [r(Y, -a)] }), nota: 'A escápula desliza para a frente sobre o tórax, como ao empurrar algo.' },
  'escapula:retracao': { nome: 'Retração da escápula', de: 0, ate: 15, vista: 'superior', quadro: OMBRO, pose: (a) => ({ clavicula: [r(Y, a)] }) },
  'escapula:rot_superior': { nome: 'Rotação superior da escápula', de: 0, ate: 60, vista: 'posterior', quadro: OMBRO, pose: (a) => ({ escapula: [r(Z, a)], umero: [r(Z, -a)] }), nota: 'O ângulo inferior vai para lateral e a cavidade glenoidal passa a olhar para cima. O úmero foi mantido pendente para isolar a escápula.' },
  'escapula:rot_inferior': { nome: 'Rotação inferior da escápula', de: 0, ate: 20, vista: 'posterior', quadro: OMBRO, pose: (a) => ({ escapula: [r(Z, -a)], umero: [r(Z, a)] }) },

  // cotovelo e antebraço
  'cotovelo:flexao': { nome: 'Flexão do cotovelo', de: 0, ate: 145, vista: 'esquerda', quadro: COT, gonio: { seg: 'ulna', ponta: [0.24, 0.87, 0.0] }, pose: (a) => ({ ulna: [r(COTOVELO, -a)] }) },
  'cotovelo:extensao': { nome: 'Extensão do cotovelo', de: 145, ate: 0, zero: 0, vista: 'esquerda', quadro: COT, gonio: { seg: 'ulna', ponta: [0.24, 0.87, 0.0] }, pose: (a) => ({ ulna: [r(COTOVELO, -a)] }) },
  'radioulnar:pronacao': { nome: 'Pronação do antebraço', de: 0, ate: 90, lados: 'esquerdo', vista: 'anterior', quadro: ANTEB,
    pose: (a) => ({ ulna: [r(COTOVELO, -90)], radio: [r(PRONACAO, 90 + a)] }), nota: 'Cotovelo a 90° e partindo da posição neutra (polegar para cima). O rádio gira em torno da ulna, que fica parada.' },
  'radioulnar:supinacao': { nome: 'Supinação do antebraço', de: 0, ate: 90, lados: 'esquerdo', vista: 'anterior', quadro: ANTEB,
    pose: (a) => ({ ulna: [r(COTOVELO, -90)], radio: [r(PRONACAO, 90 - a)] }), nota: 'Cotovelo a 90° e partindo da posição neutra; ao final a palma olha para cima.' },

  // punho e dedos
  'punho:flexao': { nome: 'Flexão do punho', de: 0, ate: 90, vista: 'esquerda', quadro: MAO, gonio: { seg: 'mao', ponta: [0.28, 0.76, 0.05] }, pose: (a) => ({ mao: [r(X, -a)] }) },
  'punho:extensao': { nome: 'Extensão do punho', de: 0, ate: 70, vista: 'esquerda', quadro: MAO, gonio: { seg: 'mao', ponta: [0.28, 0.76, 0.05] }, pose: (a) => ({ mao: [r(X, a)] }) },
  'punho:desvio_radial': { nome: 'Desvio radial do punho', de: 0, ate: 20, vista: 'anterior', quadro: MAO, gonio: { seg: 'mao', ponta: [0.28, 0.76, 0.05] }, pose: (a) => ({ mao: [r(Z, a)] }) },
  'punho:desvio_ulnar': { nome: 'Desvio ulnar do punho', de: 0, ate: 45, vista: 'anterior', quadro: MAO, gonio: { seg: 'mao', ponta: [0.28, 0.76, 0.05] }, pose: (a) => ({ mao: [r(Z, -a)] }) },
  'dedos_mao:flexao': { nome: 'Flexão dos dedos', de: 0, ate: 90, vista: 'esquerda', quadro: MAO,
    pose: (a) => { const p: Pose = {}; for (const d of DEDOS) { p[`dedo-${d}-Proximal`] = [r(X, -a)]; p[`dedo-${d}-Middle`] = [r(X, -a * 1.2)]; p[`dedo-${d}-Distal`] = [r(X, -a * 0.85)]; } return p; },
    nota: 'Metacarpofalângicas até 90°, interfalângicas proximais até ~110° e distais até ~80°.' },
  'dedos_mao:extensao': { nome: 'Extensão dos dedos', de: 0, ate: 30, vista: 'esquerda', quadro: MAO,
    pose: (a) => { const p: Pose = {}; for (const d of DEDOS) p[`dedo-${d}-Proximal`] = [r(X, a)]; return p; } },

  // quadril
  'quadril:flexao': { nome: 'Flexão do quadril', de: 0, ate: 125, vista: 'esquerda', quadro: QUADRIL, gonio: { seg: 'femur', ponta: [0.075, 0.45, -0.03] },
    pose: (a) => ({ femur: [r(X, -a)], perna: [r(JOELHO, Math.min(a * 1.0, 110))] }), nota: 'Com o joelho fletido, como na goniometria: com o joelho estendido os isquiotibiais limitam a flexão a ~90°.' },
  'quadril:extensao': { nome: 'Extensão do quadril', de: 0, ate: 20, vista: 'esquerda', quadro: QUADRIL, gonio: { seg: 'femur', ponta: [0.075, 0.45, -0.03] },
    pose: (a) => ({ femur: [r(X, a)] }), lados: 'esquerdo', nota: 'Amplitude pequena: 10° (Marques) a 30° (AAOS). Limitada pelo ligamento iliofemoral.' },
  'quadril:abducao': { nome: 'Abdução do quadril', ambos: true, de: 0, ate: 45, vista: 'anterior', quadro: { c: [0, 0.55, 0], r: 0.6 }, gonio: { seg: 'femur', ponta: [0.075, 0.45, -0.03] }, pose: (a) => ({ femur: [r(Z, a)] }) },
  'quadril:aducao': { nome: 'Adução do quadril', de: 0, ate: 15, lados: 'esquerdo', vista: 'anterior', quadro: { c: [0, 0.55, 0], r: 0.6 }, gonio: { seg: 'femur', ponta: [0.075, 0.45, -0.03] },
    pose: (a) => ({ femur: [r(Z, -a), r(X, -a * 0.8)] }), nota: 'Com leve flexão, para a coxa passar à frente da outra.' },
  'quadril:rot_medial': { nome: 'Rotação medial do quadril', de: 0, ate: 45, lados: 'esquerdo', vista: 'anterior', quadro: { c: [0.08, 0.55, 0.2], r: 0.5 }, gonio: { seg: 'perna', ponta: [0.075, 0.08, -0.04] },
    pose: (a) => ({ femur: [r(X, -90), r(Y, -a)], perna: [r(JOELHO, 90)] }), nota: 'Sentado (quadril e joelho a 90°): na rotação medial do quadril o pé vai para LATERAL.' },
  'quadril:rot_lateral': { nome: 'Rotação lateral do quadril', de: 0, ate: 45, lados: 'esquerdo', vista: 'anterior', quadro: { c: [0.08, 0.55, 0.2], r: 0.5 }, gonio: { seg: 'perna', ponta: [0.075, 0.08, -0.04] },
    pose: (a) => ({ femur: [r(X, -90), r(Y, a)], perna: [r(JOELHO, 90)] }), nota: 'Sentado (quadril e joelho a 90°): na rotação lateral do quadril o pé vai para MEDIAL.' },

  // joelho
  'joelho:flexao': { nome: 'Flexão do joelho', de: 0, ate: 140, lados: 'esquerdo', vista: 'esquerda', quadro: JOE, gonio: { seg: 'perna', ponta: [0.075, 0.08, -0.04] }, pose: (a) => ({ perna: [r(JOELHO, a)] }),
    nota: 'O fêmur rola e desliza sobre a tíbia; aqui o movimento é simplificado como rotação em torno do eixo transepicondilar. A patela acompanha a tíbia.' },
  'joelho:extensao': { nome: 'Extensão do joelho', de: 140, ate: 0, zero: 0, lados: 'esquerdo', vista: 'esquerda', quadro: JOE, gonio: { seg: 'perna', ponta: [0.075, 0.08, -0.04] }, pose: (a) => ({ perna: [r(JOELHO, a)] }),
    nota: 'Nos últimos graus a tíbia roda lateralmente (mecanismo de "parafuso", travamento do joelho).' },
  'joelho:rot_medial': { nome: 'Rotação medial do joelho', de: 0, ate: 30, lados: 'esquerdo', vista: 'anterior', quadro: { c: [0.08, 0.25, 0.1], r: 0.4 }, pose: (a) => ({ perna: [r(JOELHO, 90), r(Y, -a)] }), nota: 'Só existe com o joelho fletido.' },
  'joelho:rot_lateral': { nome: 'Rotação lateral do joelho', de: 0, ate: 40, lados: 'esquerdo', vista: 'anterior', quadro: { c: [0.08, 0.25, 0.1], r: 0.4 }, pose: (a) => ({ perna: [r(JOELHO, 90), r(Y, a)] }), nota: 'Só existe com o joelho fletido.' },

  // tornozelo e pé
  'tornozelo:dorsiflexao': { nome: 'Dorsiflexão do tornozelo', de: 0, ate: 20, vista: 'esquerda', quadro: PE, gonio: { seg: 'talus', ponta: [0.11, 0.02, 0.12] }, pose: (a) => ({ talus: [r(TORNOZELO, -a)] }) },
  'tornozelo:flexao_plantar': { nome: 'Flexão plantar do tornozelo', de: 0, ate: 45, vista: 'esquerda', quadro: PE, gonio: { seg: 'talus', ponta: [0.11, 0.02, 0.12] }, pose: (a) => ({ talus: [r(TORNOZELO, a)] }) },
  'subtalar:inversao': { nome: 'Inversão do pé', de: 0, ate: 35, vista: 'anterior', quadro: PE, pose: (a) => ({ pe: [r(SUBTALAR, -a)] }), nota: 'O eixo da subtalar é oblíquo: a inversão combina supinação, adução e flexão plantar do retropé.' },
  'subtalar:eversao': { nome: 'Eversão do pé', de: 0, ate: 20, vista: 'anterior', quadro: PE, pose: (a) => ({ pe: [r(SUBTALAR, a)] }) },

  // coluna cervical
  'cervical:flexao': { nome: 'Flexão cervical', de: 0, ate: 65, vista: 'esquerda', quadro: CAB, gonio: { seg: 'cabeca', base: 'Vertebra C7', ponta: [0, 1.75, 0.02] }, pose: (a) => coluna(CERV(0.15, 0.05), X, a), nota: 'Cerca de 15° acontecem na atlantoccipital ("sim" com a cabeça); o resto é distribuído de C2 a C7.' },
  'cervical:extensao': { nome: 'Extensão cervical', de: 0, ate: 50, vista: 'esquerda', quadro: CAB, gonio: { seg: 'cabeca', base: 'Vertebra C7', ponta: [0, 1.75, 0.02] }, pose: (a) => coluna(CERV(0.2, 0.05), X, -a) },
  'cervical:flexao_lateral': { nome: 'Flexão lateral cervical (para a esquerda)', de: 0, ate: 40, vista: 'anterior', quadro: CAB, gonio: { seg: 'cabeca', base: 'Vertebra C7', ponta: [0, 1.75, 0.02] }, pose: (a) => coluna(CERV(0.05, 0.02), Z, -a) },
  'cervical:rotacao': { nome: 'Rotação cervical (para a esquerda)', de: 0, ate: 55, vista: 'anterior', quadro: CAB, pose: (a) => coluna(CERV(0.03, 0.5), Y, a), nota: 'Metade da rotação acontece entre o atlas e o áxis ("não" com a cabeça).' },

  // tronco
  'tronco:flexao': { nome: 'Flexão do tronco', de: 0, ate: 80, vista: 'esquerda', quadro: TRO, gonio: { seg: 'Vertebra T1', base: 'Vertebra L5', ponta: [0, 1.45, -0.03] }, pose: (a) => coluna(TRONCO(0.6), X, a), nota: 'A maior parte vem da coluna lombar; ao tocar o chão, o quadril (pelve) contribui com o resto (ritmo lombopélvico).' },
  'tronco:extensao': { nome: 'Extensão do tronco', de: 0, ate: 30, vista: 'esquerda', quadro: TRO, gonio: { seg: 'Vertebra T1', base: 'Vertebra L5', ponta: [0, 1.45, -0.03] }, pose: (a) => coluna(TRONCO(0.7), X, -a) },
  'tronco:flexao_lateral': { nome: 'Flexão lateral do tronco (para a esquerda)', de: 0, ate: 35, vista: 'anterior', quadro: TRO, gonio: { seg: 'Vertebra T1', base: 'Vertebra L5', ponta: [0, 1.45, -0.03] }, pose: (a) => coluna(TRONCO(0.5), Z, -a) },
  'tronco:rotacao': { nome: 'Rotação do tronco (para a esquerda)', de: 0, ate: 35, vista: 'superior', quadro: TRO, pose: (a) => coluna(TRONCO(0.1), Y, a), nota: 'Quase toda na coluna torácica: as facetas lombares, no plano sagital, bloqueiam a rotação.' },

  // respiração
  'costelas:inspiracao': { nome: 'Inspiração (movimento das costelas)', de: 0, ate: 1, unidade: '', vista: 'esquerda', quadro: { c: [0, 1.25, 0.02], r: 0.32 },
    pose: (a) => {
      const p: Pose = { esterno: [{ t: [0, 0.008 * a, 0.012 * a] }] };
      for (let i = 1; i <= 10; i++) {
        const bomba = i <= 6 ? 1 : Math.max(0, 1 - (i - 6) / 4);
        p['costela' + i] = [r([1, 0, -0.3], -9 * a * bomba), r([0.15, -0.1, 1], 10 * a * (1 - bomba * 0.6))];
      }
      return p;
    },
    nota: 'Movimento amplificado para ficar visível. Costelas superiores: "braço de bomba" (o esterno vai para a frente e para cima). Inferiores: "alça de balde" (abrem para os lados).' },

  // ATM
  'atm:depressao': { nome: 'Abertura da boca', de: 0, ate: 28, vista: 'esquerda', quadro: { c: [0, 1.56, 0.04], r: 0.12 },
    pose: (a) => ({ mandibula: [{ t: [0, -0.002 * (a / 28), 0.01 * Math.max(0, a - 10) / 18] }, r(X, a)] }), nota: 'Primeiro rotação do côndilo; depois ele desliza para a frente sobre a eminência articular (translação).' },
  'atm:elevacao': { nome: 'Fechamento da boca', de: 28, ate: 0, zero: 0, vista: 'esquerda', quadro: { c: [0, 1.56, 0.04], r: 0.12 },
    pose: (a) => ({ mandibula: [{ t: [0, -0.002 * (a / 28), 0.01 * Math.max(0, a - 10) / 18] }, r(X, a)] }) },
  'atm:protrusao': { nome: 'Protrusão da mandíbula', de: 0, ate: 6, unidade: ' mm', vista: 'esquerda', quadro: { c: [0, 1.56, 0.04], r: 0.12 }, pose: (a) => ({ mandibula: [{ t: [0, -0.0005 * a, a / 1000] }] }) },
  'atm:retrusao': { nome: 'Retrusão da mandíbula', de: 0, ate: 2, unidade: ' mm', vista: 'esquerda', quadro: { c: [0, 1.56, 0.04], r: 0.12 }, pose: (a) => ({ mandibula: [{ t: [0, 0, -a / 1000] }] }) },
  'atm:lateralidade': { nome: 'Lateralidade da mandíbula (para a esquerda)', de: 0, ate: 10, unidade: ' mm', vista: 'anterior', quadro: { c: [0, 1.53, 0.04], r: 0.12 }, pose: (a) => ({ mandibula: [{ t: [a / 1000, 0, 0] }, r(Y, a * 0.6)] }) },
};

const ALIAS: Record<string, string> = {
  'cervical:rotacao_ipsilateral': 'cervical:rotacao', 'cervical:rotacao_contralateral': 'cervical:rotacao',
  'tronco:rotacao_ipsilateral': 'tronco:rotacao', 'tronco:rotacao_contralateral': 'tronco:rotacao',
  'atm:protracao': 'atm:protrusao', 'atm:retracao': 'atm:retrusao',
};

export function movDe(art: string, mov: string): MovDef | undefined {
  const k = `${art}:${mov}`;
  return MOVS[k] ?? MOVS[ALIAS[k] ?? ''];
}

export const OPOSTO: Record<string, string> = {
  flexao: 'extensao', extensao: 'flexao', abducao: 'aducao', aducao: 'abducao', rot_medial: 'rot_lateral', rot_lateral: 'rot_medial',
  abducao_horizontal: 'aducao_horizontal', aducao_horizontal: 'abducao_horizontal', elevacao: 'depressao', depressao: 'elevacao',
  protracao: 'retracao', retracao: 'protracao', rot_superior: 'rot_inferior', rot_inferior: 'rot_superior', pronacao: 'supinacao',
  supinacao: 'pronacao', desvio_radial: 'desvio_ulnar', desvio_ulnar: 'desvio_radial', dorsiflexao: 'flexao_plantar',
  flexao_plantar: 'dorsiflexao', inversao: 'eversao', eversao: 'inversao', protrusao: 'retrusao', retrusao: 'protrusao',
  inspiracao: 'expiracao_forcada',
};
