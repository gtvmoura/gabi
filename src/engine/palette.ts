import { Color } from 'three';
import type { Cat, Struct } from '../data/manifest';

/** Camadas que a pessoa liga e desliga na interface. */
export type LayerId =
  | 'ossos' | 'musculos' | 'ligamentos' | 'capsulas' | 'nervos' | 'snc'
  | 'arterias' | 'veias' | 'orgaos' | 'linfatico' | 'fascias' | 'bolsas' | 'pele';

/** 0 = oculto, 1 = visível, 2 = translúcido ("fantasma"). */
export type LayerState = 0 | 1 | 2;

export const CAT_LAYER: Record<Cat, LayerId> = {
  bone: 'ossos', cartilage: 'ossos', tooth: 'ossos',
  muscle: 'musculos', tendon: 'musculos',
  fascia: 'fascias', bursa: 'bolsas', sheath: 'bolsas',
  ligament: 'ligamentos', disc: 'ligamentos', fat: 'ligamentos', capsule: 'capsulas',
  nerve: 'nervos', cns: 'snc', sense: 'snc',
  artery: 'arterias', heart: 'arterias', vein: 'veias',
  organ: 'orgaos', lymph: 'linfatico', skin: 'pele',
};

/** Olhos acompanham os músculos (um rosto sem olhos assusta!). */
const OLHO = /^(Sclera|Iris)$/;
export function layerOf(s: { k: string; c: Cat }): LayerId {
  if (s.c === 'sense' && OLHO.test(s.k)) return 'musculos';
  return CAT_LAYER[s.c];
}

export const LAYER_FILE: Record<LayerId, string> = {
  ossos: 'skeleton', musculos: 'muscles', fascias: 'muscles', bolsas: 'muscles',
  ligamentos: 'joints', capsulas: 'joints', nervos: 'nervous', snc: 'nervous',
  arterias: 'vessels', veias: 'vessels', orgaos: 'viscera', linfatico: 'lymph', pele: 'regions',
};

export const LAYERS: { id: LayerId; nome: string; cor: string; dica?: string }[] = [
  { id: 'ossos', nome: 'Ossos', cor: '#e9dfc9' },
  { id: 'musculos', nome: 'Músculos', cor: '#b5473c' },
  { id: 'ligamentos', nome: 'Ligamentos e discos', cor: '#c9d3d6' },
  { id: 'capsulas', nome: 'Cápsulas articulares', cor: '#a9bccb' },
  { id: 'nervos', nome: 'Nervos', cor: '#f0c93c' },
  { id: 'arterias', nome: 'Artérias e coração', cor: '#cf3030' },
  { id: 'veias', nome: 'Veias', cor: '#3558b8' },
  { id: 'fascias', nome: 'Fáscias e retináculos', cor: '#e8e2d5' },
  { id: 'bolsas', nome: 'Bolsas e bainhas', cor: '#7fc8e8' },
  { id: 'snc', nome: 'Encéfalo, medula e sentidos', cor: '#e3b7b0' },
  { id: 'orgaos', nome: 'Órgãos', cor: '#d98a7a' },
  { id: 'linfatico', nome: 'Linfático', cor: '#8fbf6b' },
  { id: 'pele', nome: 'Pele (regiões)', cor: '#e8b99a' },
];

export const DEFAULT_LAYERS: Record<LayerId, LayerState> = {
  ossos: 1, musculos: 1, ligamentos: 0, capsulas: 0, nervos: 0, snc: 0,
  arterias: 0, veias: 0, orgaos: 0, linfatico: 0, fascias: 0, bolsas: 0, pele: 0,
};

/** Categorias desenhadas translúcidas mesmo no estado "visível". */
export const CAT_OPACITY: Partial<Record<Cat, number>> = { capsule: 0.55, bursa: 0.7, sheath: 0.6, fascia: 0.5, skin: 1 };

export const CAT_ROUGHNESS: Partial<Record<Cat, number>> = {
  bone: 0.55, cartilage: 0.35, tooth: 0.25, muscle: 0.42, tendon: 0.32, ligament: 0.4, nerve: 0.4, sense: 0.2,
  artery: 0.4, vein: 0.4, heart: 0.45, organ: 0.45, cns: 0.55, skin: 0.7,
};

const FIXED: Record<string, string> = {
  Bone: '#e3d6ba', Cartilage: '#9cc3da', Teeth: '#f6f2e8', 'Teeth-roots': '#e3d4b4', Dentine: '#eadbb8',
  Tendon: '#f3eee4', Ligament: '#d3d9d8', 'Articular capsule': '#b9cad6', Bursa: '#7fc8e8', Fascia: '#ece6d9', Fat: '#f0d98a',
  Nerve: '#f0c93c', Artery: '#cf3030', Vein: '#3558b8', 'Pulmonary artery': '#3f6fd0', 'Pulmonary vein': '#d24a4a', Heart: '#a83232',
  'Frontal lobe': '#e8a39b', 'Parietal lobe': '#9cc3e6', 'Temporal lobe': '#aed3a1', 'Occipital lobe': '#f3c693',
  'Limbic lobe': '#d3a5c0', Insula: '#c9a0d6', Cerebellum: '#c8a281', Brain: '#e2c5b6', 'Brain-Inner': '#e2c5b6',
  'White matter': '#f2ece3', Nucleus: '#b391b5', 'Nucleus (afferent fibers)': '#8fb3d9', 'Nucleus (efferent fibers)': '#d98f8f',
  'Nucleus (mixte)': '#b391b5', 'Interlobar sulci': '#9c7f72', LCR: '#8ecae6',
  Eye: '#f4f1ea', Iris: '#6b4f3a', Cornea: '#cfe6f2', Mucosa: '#e39a9a', 'Mucosa of stomach': '#e3a08f', Gland: '#e0b070',
  Intestine: '#e2a98c', Bronchi: '#dcc9a6', Ductus: '#7fb069', Gallbladder: '#6a994e', Peritoneum: '#e9d8c7', Organ: '#b5604a',
  Diaphragm: '#b5473c', Nail: '#f1d9cf', Black: '#2a2523', 'Skin-in': '#d9a688', None: '#cfcfcf',
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}

const tmp = new Color();

/** Cor de um material do modelo original, adaptada à nossa paleta. */
export function colorFor(mat: string, s: Struct): Color {
  const j = hash(s.k);          // variação estável por estrutura: vizinhos ficam distinguíveis
  const j2 = hash(s.k + '~');
  if (s.c === 'heart' && mat === 'Trapezius') return tmp.set('#a83232').clone();
  if (FIXED[mat]) return tmp.set(FIXED[mat]).clone();
  if (mat.startsWith('Bone')) return tmp.set('#e3d6ba').offsetHSL(0, 0, (j - 0.5) * 0.03).clone();
  if (mat.startsWith('Suture')) return tmp.set('#cdbfa3').clone();
  if (mat.startsWith('Nerve')) return tmp.set('#f0c93c').offsetHSL((j - 0.5) * 0.02, 0, (j2 - 0.5) * 0.06).clone();
  if (mat.startsWith('Lung')) return tmp.set('#e3a3a0').offsetHSL((j - 0.5) * 0.03, 0, (j2 - 0.5) * 0.08).clone();
  if (mat.startsWith('Bronchi')) return tmp.set('#dcc9a6').offsetHSL(0, 0, (j - 0.5) * 0.08).clone();
  if (mat.startsWith('Organ')) return tmp.setHSL(0.02 + j * 0.07, 0.42, 0.45 + j2 * 0.14).clone();
  if (mat.startsWith('Lymph')) return tmp.set('#8fbf6b').offsetHSL((j - 0.5) * 0.04, 0, (j2 - 0.5) * 0.08).clone();
  if (mat.startsWith('Skin')) return tmp.set('#e6b596').offsetHSL((j - 0.5) * 0.015, 0, (j2 - 0.5) * 0.05).clone();
  // ventres musculares: vermelho com leve variação de matiz e brilho
  // ventres musculares: vermelho-coral de atlas, com leve variação para separar músculos vizinhos
  if (s.c === 'muscle' || s.c === 'tendon') return tmp.setHSL(0.004 + (j - 0.5) * 0.024, 0.6 + j2 * 0.08, 0.385 + (j - 0.5) * 0.07).clone();
  return tmp.set('#cfcfcf').clone();
}

export const COLORS = {
  select: '#39c2f0',
  origin: '#f0434a',
  insertion: '#3f83f8',
  pin: '#ff7aa8',
  pinActive: '#ffe066',
  primario: '#ff8a1f',
  secundario: '#ffd166',
};
