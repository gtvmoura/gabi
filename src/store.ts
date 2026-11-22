import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Indexed, Side } from './data/manifest';
import type { Engine, Focus } from './engine/Engine';
import { CAT_LAYER, DEFAULT_LAYERS, type LayerId, type LayerState } from './engine/palette';

export type Tab = 'atlas' | 'explorar' | 'roteiros' | 'movimentos' | 'clinica' | 'treinar' | 'progresso';
export interface Sel { si: number; side: Side | 'both' }
export interface FocusState { ids: [number, string | null][]; others: Focus['others']; label: string; respectLayers?: boolean }
export interface SrsCard { due: number; ivl: number; ease: number; reps: number; lapses: number }
export interface QuizResult { t: number; modo: string; regiao: string; total: number; certos: number }

export interface Progresso {
  estudados: Record<string, number>;
  favoritos: string[];
  notas: Record<string, string>;
  quiz: QuizResult[];
  srs: Record<string, SrsCard>;
  dias: Record<string, number>;
  bemVinda: boolean;
  marcos: string[];
  erros: Record<string, number>;
}

interface State {
  tab: Tab;
  panelOpen: boolean;
  sel: Sel | null;
  pin: string | null;
  pinLabels: boolean;
  layers: Record<LayerId, LayerState>;
  side: 'both' | 'l' | 'r';
  hidden: number[];
  focus: FocusState | null;
  showIns: boolean;
  boneMap: boolean;
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
  undoHide(): void;
  resetView(): void;
  setFocus(f: FocusState | null, fly?: boolean): void;
  toggleIns(v?: boolean): void;
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
      tab: 'atlas', panelOpen: true, sel: null, pin: null, pinLabels: false,
      layers: { ...DEFAULT_LAYERS }, side: 'both', hidden: [], focus: null, showIns: false, boneMap: false,
      loading: {}, toast: null, recado: null, quizPick: null, prog: progInicial,

      setTab: (tab) => set({ tab, panelOpen: true }),
      setPanel: (panelOpen) => set({ panelOpen }),
      select: (sel, opts) => {
        const st = get();
        const patch: Partial<State> = { sel, pin: null, showIns: false, boneMap: false };
        if (sel) {
          patch.panelOpen = true;
          if (!opts?.keepTab) patch.tab = 'atlas';
          patch.hidden = st.hidden.filter((h) => h !== sel.si);
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
        if (sel && opts?.fly !== false) {
          const e = rt.engine;
          if (e) e.ensureStructs([sel.si]).then(() => { const sp = e.sphereOf([sel.si], sel.side); if (sp) e.frame(sp, { pad: 1.9 }); });
        }
      },
      setPin: (pin) => set({ pin }),
      setLayer: (id, stt) => set((s) => ({ layers: { ...s.layers, [id]: stt } })),
      setSide: (side) => set({ side }),
      hide: (si) => set((s) => ({ hidden: [...s.hidden.filter((h) => h !== si), si], sel: s.sel?.si === si ? null : s.sel })),
      undoHide: () => set((s) => ({ hidden: s.hidden.slice(0, -1) })),
      resetView: () => { set({ hidden: [], focus: null, sel: null, pin: null, showIns: false, boneMap: false, side: 'both', layers: { ...DEFAULT_LAYERS } }); rt.engine?.home(); },
      setFocus: (focus, fly = true) => {
        set({ focus, sel: null, pin: null, showIns: false, boneMap: false });
        const e = rt.engine;
        if (focus && e && fly) e.ensureStructs(focus.ids.map(([si]) => si)).then(() => { const sp = e.sphereOf(focus.ids.map(([si]) => si)); if (sp) e.frame(sp, { pad: 1.25 }); });
      },
      toggleIns: (v) => set((s) => ({ showIns: v ?? !s.showIns })),
      toggleBoneMap: (v) => set((s) => ({ boneMap: v ?? !s.boneMap })),
      say: (msg) => set({ toast: { msg, id: Date.now() } }),
      patchProg: (fn) => set((s) => ({ prog: { ...s.prog, ...fn(s.prog) } })),
      atividade: (n = 1) => set((s) => ({ prog: { ...s.prog, dias: { ...s.prog.dias, [hoje()]: (s.prog.dias[hoje()] ?? 0) + n } } })),
    }),
    {
      name: 'atlas-da-gabi',
      version: 1,
      partialize: (s) => ({ prog: s.prog, layers: s.layers }) as unknown as State,
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
