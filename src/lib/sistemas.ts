import type { Indexed } from '../data/manifest';
import { groupChain } from '../data/manifest';
import { resolver } from '../content';

export type SistemaId =
  | 'esqueletico' | 'articular' | 'muscular' | 'nervoso' | 'cardiovascular' | 'linfatico'
  | 'respiratorio' | 'digestorio' | 'urinario' | 'genital' | 'endocrino' | 'tegumentar';

export interface Sistema {
  id: SistemaId; nome: string; cor: string; resumo: string; funcoes: string[]; fisio: string;
  raizes: string[];         // grupos do modelo para navegar em lista
  aviso?: string;
}

export const SISTEMAS: Sistema[] = [
  { id: 'esqueletico', nome: 'Esquelético', cor: '#e3d6ba', raizes: ['Cranium', 'Extracranial bones of head', 'Vertebral column', 'Thoracic skeleton', 'Bony pelvis', 'Bones of upper limb', 'Bones of lower limb', 'Teeth', 'Auditory ossicles', 'Laryngeal cartilages', 'Nasal cartilages', 'Cartilages of ear'],
    resumo: 'Os ossos, as cartilagens e os dentes: a armação do corpo.',
    funcoes: ['Sustentação e proteção (crânio, tórax, pelve)', 'Alavancas para os músculos', 'Hematopoese na medula óssea vermelha', 'Reserva de cálcio e fósforo'],
    fisio: 'Base da palpação e da biomecânica: acidentes ósseos são as referências da avaliação, da goniometria e do posicionamento.' },
  { id: 'articular', nome: 'Articular', cor: '#a9bccb', raizes: ['Joints of upper limb', 'Joints of lower limb', 'Joints of vertebral column', 'Thoracic joints', 'Joints of skull', 'Laryngeal joints', 'Joints of auditory ossicles'],
    resumo: 'Ligamentos, cápsulas, discos e meniscos que unem os ossos.',
    funcoes: ['Permitir e guiar o movimento', 'Estabilidade passiva (ligamentos e cápsula)', 'Distribuir carga (discos, meniscos, cartilagem)'],
    fisio: 'Entorses, instabilidades, lesões ligamentares e meniscais, artrose e capsulite: grande parte da ortopedia em fisioterapia.' },
  { id: 'muscular', nome: 'Muscular', cor: '#b5473c', raizes: ['Cranial part of muscular system', 'Cervical part of muscular system', 'Thoracic part of muscular system', 'Abdominal part of muscular system', 'Dorsal part of muscular system', 'Pelvic part of muscular system', 'Muscular system of upper limb', 'Muscular system of lower limb', 'Fasciae', 'Synovial bursae', 'Tendon sheaths'],
    resumo: 'Músculos esqueléticos, tendões, fáscias, bolsas e bainhas.',
    funcoes: ['Movimento e postura', 'Estabilidade dinâmica das articulações', 'Produção de calor', 'Bomba muscular para o retorno venoso'],
    fisio: 'Fortalecimento, alongamento, controle motor e reabilitação de lesões musculotendíneas.' },
  { id: 'nervoso', nome: 'Nervoso e sentidos', cor: '#f0c93c', raizes: ['Central nervous system', 'Peripheral nervous system', 'Mandibular nerve', 'Sense organs'],
    resumo: 'Encéfalo, medula espinal, nervos cranianos e espinais, plexos e órgãos dos sentidos.',
    funcoes: ['Comando do movimento', 'Sensibilidade e propriocepção', 'Integração e controle das funções do corpo'],
    fisio: 'Neurofuncional (AVE, Parkinson, lesão medular), lesões de nervo periférico, dermátomos, miótomos e reflexos.' },
  { id: 'cardiovascular', nome: 'Cardiovascular', cor: '#cf3030', raizes: ['Arterial system', 'Venous system'],
    resumo: 'Coração, artérias e veias: a circulação sistêmica e a pulmonar.',
    funcoes: ['Levar oxigênio e nutrientes aos tecidos', 'Retirar CO₂ e metabólitos', 'Regular temperatura e pressão'],
    fisio: 'Reabilitação cardiovascular, pulsos palpáveis, aferição de pressão, prevenção de TVP e insuficiência venosa.' },
  { id: 'linfatico', nome: 'Linfático', cor: '#8fbf6b', raizes: ['Primary lymphoid organs', 'Secondary lymphoid organs'],
    resumo: 'Linfonodos, baço, timo e tonsilas.',
    funcoes: ['Drenar o líquido intersticial de volta à circulação', 'Defesa imunológica'],
    fisio: 'Drenagem linfática e tratamento do linfedema (por exemplo, após esvaziamento axilar no câncer de mama).' },
  { id: 'respiratorio', nome: 'Respiratório', cor: '#e3a3a0', raizes: ['Respiratory system', 'Thoracic cavity'],
    resumo: 'Nariz, laringe, traqueia, brônquios, pulmões e pleura.',
    funcoes: ['Trocas gasosas', 'Condução e aquecimento do ar', 'Fonação (laringe)'],
    fisio: 'Fisioterapia respiratória: higiene brônquica, reexpansão pulmonar, ventilação mecânica e reabilitação pulmonar.' },
  { id: 'digestorio', nome: 'Digestório', cor: '#e2a98c', raizes: ['Digestive system', 'Abdominopelvic cavity'],
    resumo: 'Boca, faringe, esôfago, estômago, intestinos, fígado, vesícula, pâncreas e glândulas salivares.',
    funcoes: ['Digestão e absorção de nutrientes', 'Eliminação de resíduos', 'Funções metabólicas do fígado'],
    fisio: 'Disfagia (com a fonoaudiologia), constipação e disfunções do assoalho pélvico, pós-operatório abdominal.' },
  { id: 'urinario', nome: 'Urinário', cor: '#e0b070', raizes: ['Urinary system'],
    resumo: 'Rins, ureteres, bexiga e uretra.',
    funcoes: ['Filtrar o sangue e formar a urina', 'Equilíbrio de água, sais e pH'],
    fisio: 'Fisioterapia pélvica: incontinência urinária e treino do assoalho pélvico.' },
  { id: 'genital', nome: 'Genital', cor: '#d98a7a', raizes: ['Genital systems'],
    resumo: 'Órgãos genitais internos e externos.',
    funcoes: ['Reprodução', 'Produção de hormônios sexuais'],
    fisio: 'Uroginecologia e saúde do homem (por exemplo, reabilitação após prostatectomia).',
    aviso: 'O modelo 3D de base (Z-Anatomy) só tem o sistema genital masculino.' },
  { id: 'endocrino', nome: 'Endócrino', cor: '#d3a5c0', raizes: ['Endocrine glands'],
    resumo: 'Hipófise, pineal, tireoide, paratireoides e suprarrenais.',
    funcoes: ['Regulação por hormônios: metabolismo, crescimento, estresse, cálcio'],
    fisio: 'Diabetes, hipotireoidismo e alterações hormonais influenciam cicatrização, tolerância ao exercício e risco de quedas.' },
  { id: 'tegumentar', nome: 'Tegumentar (pele)', cor: '#e6b596', raizes: ['Regions of head', 'Regions of neck', 'Regions of thorax', 'Regions of abdomen', 'Regions of back', 'Regions of upper limb', 'Regions of lower limb', 'Regions of perineum', 'Hairs'],
    resumo: 'Pele, pelos e unhas, divididos nas regiões anatômicas de superfície.',
    funcoes: ['Proteção', 'Sensibilidade tátil, térmica e dolorosa', 'Regulação da temperatura'],
    fisio: 'Regiões de superfície orientam palpação e inspeção; cuidado com lesões por pressão e cicatrizes.' },
];

const CAT_SIS: Record<string, SistemaId> = {
  bone: 'esqueletico', cartilage: 'esqueletico', tooth: 'esqueletico',
  ligament: 'articular', capsule: 'articular', disc: 'articular', fat: 'articular',
  muscle: 'muscular', tendon: 'muscular', fascia: 'muscular', bursa: 'muscular', sheath: 'muscular',
  nerve: 'nervoso', cns: 'nervoso', sense: 'nervoso',
  artery: 'cardiovascular', vein: 'cardiovascular', heart: 'cardiovascular',
  lymph: 'linfatico', skin: 'tegumentar',
};

const cache = new WeakMap<Indexed, Map<SistemaId, number[]>>();

/** Estruturas de cada sistema (calculado uma vez). */
export function estruturasDoSistema(m: Indexed, id: SistemaId): number[] {
  let porSistema = cache.get(m);
  if (!porSistema) {
    porSistema = new Map(SISTEMAS.map((s) => [s.id, [] as number[]]));
    cache.set(m, porSistema);
    m.structs.forEach((s, si) => {
      let sis = CAT_SIS[s.c];
      if (s.c === 'organ') {
        const ch = groupChain(m, s.g).join('|');
        sis = /Respiratory system|Thoracic cavity/.test(ch) ? 'respiratorio'
          : /Urinary system/.test(ch) ? 'urinario'
          : /Genital systems/.test(ch) ? 'genital'
          : /Endocrine glands/.test(ch) ? 'endocrino'
          : 'digestorio';
      }
      if (sis) porSistema!.get(sis)!.push(si);
    });
  }
  return porSistema.get(id) ?? [];
}

// ─────────────────────────────── peças para ver isoladas e centralizadas

export type Contexto = 'hide' | 'ossos' | 'ghost';
export interface Peca { id: string; nome: string; desc: string; chaves: string[]; contexto: Contexto; grupo: string; umLado?: boolean }

export const PECAS: Peca[] = [
  { id: 'coracao', grupo: 'Órgãos', nome: 'Coração', desc: 'Câmaras, valvas e coronárias', chaves: ['Heart', 'Arteries of heart', 'Cardiac veins'], contexto: 'ossos' },
  { id: 'encefalo', grupo: 'Órgãos', nome: 'Encéfalo', desc: 'Cérebro, cerebelo e tronco encefálico', chaves: ['Brain'], contexto: 'hide' },
  { id: 'pulmoes', grupo: 'Órgãos', nome: 'Pulmões e brônquios', desc: 'Lobos, traqueia e árvore brônquica', chaves: ['Lungs', 'Tracheobronchial tree'], contexto: 'ossos' },
  { id: 'figado', grupo: 'Órgãos', nome: 'Fígado e vias biliares', desc: 'Segmentos hepáticos e vesícula', chaves: ['Liver', 'Gallbladder', 'Bile duct'], contexto: 'ossos' },
  { id: 'estomago', grupo: 'Órgãos', nome: 'Estômago e intestinos', desc: 'Do esôfago ao reto', chaves: ['Oesophagus', 'Stomach', 'Small intestine', 'Large intestine'], contexto: 'ossos' },
  { id: 'rins', grupo: 'Órgãos', nome: 'Rins e vias urinárias', desc: 'Rins, ureteres e bexiga', chaves: ['Urinary system', 'Suprarenal gland'], contexto: 'ossos' },
  { id: 'olho', grupo: 'Órgãos', nome: 'Olho', desc: 'Bulbo do olho e músculos extrínsecos', chaves: ['Eyeball', 'Extra-ocular muscles'], contexto: 'hide' },
  { id: 'laringe', grupo: 'Órgãos', nome: 'Laringe', desc: 'Cartilagens e músculos da laringe', chaves: ['Laryngeal cartilages', 'Larynx', 'Laryngeal muscles', 'Hyoid bone'], contexto: 'hide' },
  { id: 'medula', grupo: 'Órgãos', nome: 'Medula espinal', desc: 'Substância cinzenta, tratos e raízes', chaves: ['Spinal cord'], contexto: 'ossos' },
  { id: 'cranio', grupo: 'Esqueleto', nome: 'Crânio', desc: 'Neurocrânio e viscerocrânio', chaves: ['Cranium', 'Mandible'], contexto: 'hide' },
  { id: 'coluna', grupo: 'Esqueleto', nome: 'Coluna vertebral', desc: 'Vértebras, sacro, cóccix e discos', chaves: ['Vertebral column', 'Sacrum', 'Coccyx', 'Joints of vertebral column'], contexto: 'hide' },
  { id: 'torax', grupo: 'Esqueleto', nome: 'Caixa torácica', desc: 'Costelas, cartilagens costais e esterno', chaves: ['Thoracic skeleton'], contexto: 'hide' },
  { id: 'pelve', grupo: 'Esqueleto', nome: 'Pelve', desc: 'Ossos do quadril, sacro e cóccix', chaves: ['Hip bone', 'Sacrum', 'Coccyx', 'Sacro-iliac joint', 'Pubic symphysis'], contexto: 'hide' },
  { id: 'ombro', umLado: true, grupo: 'Articulações', nome: 'Ombro', desc: 'Ossos, ligamentos e manguito rotador', chaves: ['Scapula', 'Clavicle', 'Humerus', 'Glenohumeral joint', 'Acromioclavicular joint', 'Rotator cuff muscles'], contexto: 'hide' },
  { id: 'cotovelo', umLado: true, grupo: 'Articulações', nome: 'Cotovelo', desc: 'Úmero distal, rádio, ulna e ligamentos', chaves: ['Elbow joint', 'Humerus', 'Radius', 'Ulna'], contexto: 'hide' },
  { id: 'mao', umLado: true, grupo: 'Articulações', nome: 'Punho e mão', desc: 'Ossos e músculos da mão', chaves: ['Bones of hand', 'Muscles of hand', 'Radiocarpal joint', 'Joints of hand'], contexto: 'hide' },
  { id: 'quadril', umLado: true, grupo: 'Articulações', nome: 'Quadril', desc: 'Acetábulo, fêmur proximal e ligamentos', chaves: ['Hip joint', 'Hip bone', 'Femur'], contexto: 'hide' },
  { id: 'joelho', umLado: true, grupo: 'Articulações', nome: 'Joelho', desc: 'Ligamentos cruzados, colaterais e meniscos', chaves: ['Knee joint', 'Patella'], contexto: 'ossos' },
  { id: 'pe', umLado: true, grupo: 'Articulações', nome: 'Tornozelo e pé', desc: 'Ossos, ligamentos e músculos do pé', chaves: ['Bones of foot', 'Muscles of foot', 'Ankle joint', 'Joints of foot'], contexto: 'hide' },
  { id: 'atm', grupo: 'Articulações', nome: 'ATM e mastigação', desc: 'Mandíbula e músculos da mastigação', chaves: ['Temporomandibular joint', 'Mandible', 'Masticatory muscles', 'Temporal bone'], contexto: 'hide' },
];

export function estruturasDaPeca(m: Indexed, p: Peca): number[] {
  const out = new Set<number>();
  for (const k of p.chaves) for (const si of resolver(k, m)) out.add(si);
  return [...out];
}
