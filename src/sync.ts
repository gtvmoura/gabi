// Mantém o motor 3D em dia com o estado da interface.
import { rt, useStore } from './store';
import { acidente, nomePt } from './content';
import { mapaInervacao } from './lib/inervacao';

let lastPinsKey = '';

export function syncEngine() {
  const e = rt.engine, m = rt.m;
  if (!e || !m) return;
  const s = useStore.getState();
  e.layers = s.layers;
  e.side = s.side;
  e.hidden = new Set(s.hidden);
  e.focus = s.focus ? { set: new Map(s.focus.ids), others: s.focus.others, respectLayers: s.focus.respectLayers } : null;
  e.faded = new Set();
  e.revealBones = false;
  e.tint = s.colorMode === 'inervacao' ? mapaInervacao(m).porStruct : new Map();
  e.setClip(s.clip?.axis ?? null, s.clip?.t);
  e.selected = s.sel ? { ...s.sel } : null;

  // origens/inserções
  const ins: string[] = [];
  if (s.sel) {
    const sideOk = (d: string) => s.sel!.side === 'both' || !d || d === s.sel!.side;
    if (s.showIns) {
      for (const r of m.insByMuscle.get(s.sel.si) ?? []) if (sideOk(r.d)) ins.push(r.id);
      e.faded.add(s.sel.si);
      e.selected = null;
      e.revealBones = true;
    } else if (s.boneMap) {
      for (const r of m.insByBone.get(s.sel.si) ?? []) if (sideOk(r.d)) ins.push(r.id);
      e.selected = null;
    }
  }
  void e.showInsertions(ins);

  // pinos dos acidentes ósseos da estrutura selecionada
  let pinsKey = '';
  if (s.sel && !s.boneMap) {
    const st = m.structs[s.sel.si];
    const ids = Object.entries(st.m).filter(([d]) => s.sel!.side === 'both' || d === 'c' || d === s.sel!.side).map(([, id]) => id);
    pinsKey = ids.join(',');
    if (pinsKey !== lastPinsKey) {
      const lms = (m.lmByStruct.get(s.sel.si) ?? []).filter((l) => ids.includes(l.on));
      e.setPins(lms.map((l) => { const a = acidente(st.k, l.k); return { id: l.on + '|' + l.k, p: l.p, label: a?.pt ?? nomePt(l.k, m), nota: a?.nota }; }));
    }
  } else if (lastPinsKey) e.setPins([]);
  lastPinsKey = pinsKey;
  e.muteLabels = s.pinMudo;
  e.contorno = s.contorno;
  e.setActivePin(s.pin, s.pinLabels);

  void e.ensureLayers();
  if (s.focus && !s.focus.respectLayers) void e.ensureStructs(s.focus.ids.map(([si]) => si));
  e.apply();
}
