import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Indexed, Side } from './data/manifest';
import type { Engine, Focus, ViewName } from './engine/Engine';
import { CAT_LAYER, DEFAULT_LAYERS, type LayerId, type LayerState } from './engine/palette';

export type Tab = 'atlas' | 'explorar' | 'roteiros' | 'movimentos' | 'clinica' | 'treinar' | 'progresso';
export interface Sel { si: number; side: Side | 'both' }
export interface FocusState { ids: [number, string | null][]; others: Focus['others']; label: string; respectLayers?: boolean }
/** Peça fixa no centro da tela. umLado: a peça trocou o lado visível do corpo, e ele volta a 'ambos' ao soltar. */
export interface Fixo { label: string; sis: number[]; lado?: Side | 'both'; umLado?: boolean }
export interface SrsCard { due: number; ivl: number; ease: number; reps: number; lapses: number }
export interface QuizResult { t: number; modo: string; regiao: string; total: number; certos: number }

export interface Progresso {
  estudados: Record<string, number>;
  favoritos: string[];
  notas: Record<string, string>;
  quiz: QuizResult[];
  srs: Record<string, SrsCard>;
  dias: Record<string, number>;
  nome?: string;                          // primeiro nome de quem usa; indefinido = portão do nome aberto (ver perfil.ts)
  bemVinda: boolean;
  marcos: string[];
  erros: Record<string, number>;
  recordes?: Record<string, number>;      // melhores pontuações dos jogos
  desafio?: string;                       // data do último desafio do dia concluído
  prova?: { nome: string; data: string };  // próxima prova
}

interface State {
  tab: Tab;
  panelOpen: boolean;
  sel: Sel | null;
  pin: string | null;
  pinLabels: boolean;
  pinMudo: boolean;
  contorno: boolean;
  layers: Record<LayerId, LayerState>;
  side: 'both' | 'l' | 'r';
  hidden: number[];
  lotes: number[];            // tamanho de cada ocultação, para desfazer em lote
  modoOcultar: boolean;
  ocultarGrupo: boolean;
  focus: FocusState | null;
  showIns: boolean;
  fixo: Fixo | null;
  boneMap: boolean;
  colorMode: 'normal' | 'inervacao';
  clip: { axis: 'x' | 'y' | 'z'; t: number } | null;
  loading: Record<string, number>;
  toast: { msg: string; id: number } | null;
  recado: { titulo: string; texto: string } | null;
  quizPick: ((si: number) => void) | null;   // quando o quiz está esperando um toque no modelo
  prog: Progresso;

  setTab(t: Tab): void;
  setPanel(open: boolean): void;
  select(sel: Sel | null, opts?: { fly?: boolean; keepTab?: boolean }): void;
  setPin(id: string | null): void;
  setLayer(id: LayerId, st: LayerState): void;
  setSide(s: 'both' | 'l' | 'r'): void;
  hide(si: number): void;
  hideMany(sis: number[]): void;
  undoHide(): void;
  showAll(): void;
  resetView(): void;
  setFocus(f: FocusState | null, fly?: boolean): void;
  toggleIns(v?: boolean): void;
  fixar(f: Fixo | null, view?: ViewName): void;
  toggleBoneMap(v?: boolean): void;
  say(msg: string): void;
  patchProg(fn: (p: Progresso) => Partial<Progresso>): void;
  atividade(n?: number): void;
}

export const hoje = () => new Date().toLocaleDateString('sv-SE');

const progInicial: Progresso = { estudados: {}, favoritos: [], notas: {}, quiz: [], srs: {}, dias: {}, bemVinda: false, marcos: [], erros: {} };

/** O motor 3D e o manifesto vivem fora do estado reativo. */
export const rt: { engine: Engine | null; m: Indexed | null } = { engine: null, m: null };

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      tab: 'atlas', panelOpen: true, sel: null, pin: null, pinLabels: false, pinMudo: false, contorno: true,
      layers: { ...DEFAULT_LAYERS }, side: 'both', hidden: [], lotes: [], modoOcultar: false, ocultarGrupo: false, focus: null, fixo: null, showIns: false, boneMap: false, colorMode: 'normal', clip: null,
      loading: {}, toast: null, recado: null, quizPick: null, prog: progInicial,

      setTab: (tab) => {
        // abas que controlam a câmera (movimentos, jogos, roteiros, clínica) soltam a peça fixa
        if (get().fixo && !['atlas', 'explorar', 'progresso'].includes(tab)) get().fixar(null);
        set({ tab, panelOpen: true });
      },
      setPanel: (panelOpen) => set({ panelOpen }),
      select: (sel, opts) => {
        const st = get();
        const patch: Partial<State> = { sel, pin: null, showIns: false, boneMap: false };
        if (sel) patch.clip = null;   // o corte poderia esconder justamente o que foi selecionado
        if (sel) {
          patch.panelOpen = true;
          if (!opts?.keepTab) patch.tab = 'atlas';
          if (st.hidden.includes(sel.si)) { patch.hidden = st.hidden.filter((h) => h !== sel.si); patch.lotes = []; }
          // garante que a camada da estrutura esteja visível
          const s = rt.m!.structs[sel.si];
          const layer = CAT_LAYER[s.c];
          let layers = st.layers;
          if (layers[layer] === 0 && !st.focus) layers = { ...layers, [layer]: 1 };
          // aberto pela busca/lista: estruturas profundas ficam visíveis com os músculos translúcidos
          const profundo = !['muscle', 'tendon', 'fascia', 'bursa', 'sheath', 'skin'].includes(s.c);
          if (opts?.fly !== false && profundo && layers.musculos === 1 && !st.focus) { layers = { ...layers, musculos: 2 }; patch.toast = { msg: 'Músculos translúcidos para mostrar a estrutura', id: Date.now() }; }
          if (layers !== st.layers) patch.layers = layers;
        }
        set(patch);
        // com uma peça fixa: se a estrutura faz parte dela, a câmera fica onde está; senão, solta a peça e vai até ela
        if (sel && opts?.fly !== false && st.fixo && !st.fixo.sis.includes(sel.si)) { get().fixar(null); if (st.focus && st.focus.label === st.fixo.label) set({ focus: null }); }
        if (sel && opts?.fly !== false && !get().fixo) {
          const e = rt.engine;
          if (e) e.ensureStructs([sel.si]).then(() => { const sp = e.sphereOf([sel.si], sel.side); if (sp) e.frame(sp, { pad: 1.9 }); });
        }
      },
      setPin: (pin) => set({ pin }),
      setLayer: (id, stt) => set((s) => ({ layers: { ...s.layers, [id]: stt } })),
      setSide: (side) => set({ side }),
      hide: (si) => get().hideMany([si]),
      hideMany: (sis) => set((s) => {
        const novos = [...new Set(sis)].filter((x) => !s.hidden.includes(x));
        if (!novos.length) return {};
        return { hidden: [...s.hidden, ...novos], lotes: [...s.lotes, novos.length], sel: s.sel && novos.includes(s.sel.si) ? null : s.sel, pin: null };
      }),
      undoHide: () => set((s) => {
        const n = s.lotes[s.lotes.length - 1] ?? 1;
        return { hidden: s.hidden.slice(0, Math.max(0, s.hidden.length - n)), lotes: s.lotes.slice(0, -1) };
      }),
      showAll: () => set({ hidden: [], lotes: [] }),
      resetView: () => { rt.engine?.fixar(null); set({ fixo: null, hidden: [], lotes: [], modoOcultar: false, focus: null, sel: null, pin: null, showIns: false, boneMap: false, side: 'both', colorMode: 'normal', clip: null, layers: { ...DEFAULT_LAYERS } }); rt.engine?.home(); },
      setFocus: (focus, fly = true) => {
        if (focus && fly && get().fixo) get().fixar(null);   // outro destaque com câmera própria: solta a peça
        set({ focus, sel: null, pin: null, showIns: false, boneMap: false, ...(focus ? { clip: null } : {}) });
        const e = rt.engine;
        if (focus && e && fly && !get().fixo) e.ensureStructs(focus.ids.map(([si]) => si)).then(() => { const sp = e.sphereOf(focus.ids.map(([si]) => si)); if (sp) e.frame(sp, { pad: 1.25 }); });
      },
      fixar: (f, view) => {
        const antes = get().fixo;
        set({ fixo: f, ...(antes?.umLado && !f?.umLado ? { side: 'both' as const } : {}) });
        const e = rt.engine; if (!e) return;
        if (!f) { e.fixar(null); return; }
        e.ensureStructs(f.sis).then(() => {
          if (get().fixo !== f) return;
          const sp = e.sphereOf(f.sis, f.lado ?? 'both');
          if (sp) e.fixar(sp, view);
          else { set({ fixo: null }); get().say('Não há modelo 3D para centralizar aqui.'); }
        });
      },
      toggleIns: (v) => set((s) => ({ showIns: v ?? !s.showIns })),
      toggleBoneMap: (v) => set((s) => ({ boneMap: v ?? !s.boneMap })),
      say: (msg) => set({ toast: { msg, id: Date.now() } }),
      patchProg: (fn) => set((s) => ({ prog: { ...s.prog, ...fn(s.prog) } })),
      atividade: (n = 1) => set((s) => ({ prog: { ...s.prog, dias: { ...s.prog.dias, [hoje()]: (s.prog.dias[hoje()] ?? 0) + n } } })),
    }),
    {
      name: 'atlas-da-gabi',
      version: 3,
      // v3: todo mundo passa pelo portão de nome uma vez (o progresso fica); as boas-vindas voltam no perfil escolhido
      migrate: (old, v) => {
        const s = (old ?? {}) as { prog?: Partial<Progresso> };
        if (v < 3 && s.prog) { const { nome: _n, ...resto } = s.prog; void _n; s.prog = { ...resto, bemVinda: false }; }
        return s as State;
      },
      partialize: (s) => ({ prog: s.prog, layers: s.layers, contorno: s.contorno }) as unknown as State,
    },
  ),
);

/** Sequência de dias seguidos com estudo (contando hoje ou ontem como último dia). */
export function sequencia(dias: Record<string, number>): number {
  let n = 0;
  const d = new Date();
  if (!dias[d.toLocaleDateString('sv-SE')]) d.setDate(d.getDate() - 1);
  while (dias[d.toLocaleDateString('sv-SE')]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
