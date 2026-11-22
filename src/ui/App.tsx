import { useEffect, useRef, useState } from 'react';
import { loadManifest } from '../data/manifest';
import { Engine } from '../engine/Engine';
import { rt, sequencia, useStore, type Tab } from '../store';
import { syncEngine } from '../sync';
import { BOAS_VINDAS, PERFIL, RECADOS } from '../content/recados';
import { Icon } from './icons';
import { Toolbar } from './Toolbar';
import { Search } from './Search';
import { Ficha } from './Ficha';
import { Explorar } from './Explorar';
import { Roteiros } from './Roteiros';
import { Movimentos } from './Movimentos';
import { Clinica } from './Clinica';
import { Treinar } from './Treinar';
import { Progresso } from './Progresso';
import { BarraOcultar, Confete, LegendaInervacao, VerRapido } from './Extras';
import { nomePt } from '../content';

const TABS: { id: Tab; nome: string; ico: string }[] = [
  { id: 'atlas', nome: 'Atlas', ico: 'atlas' },
  { id: 'explorar', nome: 'Explorar', ico: 'explorar' },
  { id: 'roteiros', nome: 'Roteiros', ico: 'roteiros' },
  { id: 'movimentos', nome: 'Movimentos', ico: 'movimentos' },
  { id: 'clinica', nome: 'Clínica', ico: 'clinica' },
  { id: 'treinar', nome: 'Treinar', ico: 'treinar' },
  { id: 'progresso', nome: 'Progresso', ico: 'progresso' },
];

const FILE_NOME: Record<string, string> = {
  skeleton: 'ossos', muscles: 'músculos', joints: 'ligamentos', nervous: 'sistema nervoso', vessels: 'vasos',
  viscera: 'órgãos', lymph: 'linfático', regions: 'pele', insertions: 'origens e inserções',
};

function usePortrait() {
  const q = '(max-aspect-ratio: 1/1), (max-width: 760px)';
  const [p, setP] = useState(() => window.matchMedia(q).matches);
  useEffect(() => { const mq = window.matchMedia(q); const f = () => setP(mq.matches); mq.addEventListener('change', f); return () => mq.removeEventListener('change', f); }, []);
  return p;
}

export function App() {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [firstLoad, setFirstLoad] = useState(0);
  const tab = useStore((s) => s.tab);
  const panelOpen = useStore((s) => s.panelOpen);
  const loading = useStore((s) => s.loading);
  const toast = useStore((s) => s.toast);
  const recado = useStore((s) => s.recado);
  const bemVinda = useStore((s) => s.prog.bemVinda);
  const focus = useStore((s) => s.focus);
  const quizPick = useStore((s) => s.quizPick);
  const sel = useStore((s) => s.sel);
  const portrait = usePortrait();

  // inicialização do motor 3D
  useEffect(() => {
    let engine: Engine | null = null;
    let off = () => {};
    loadManifest().then((m) => {
      if (!host.current) return;
      engine = new Engine(host.current, m);
      rt.engine = engine; rt.m = m;
      (window as unknown as { atlas: unknown }).atlas = { engine, m, store: useStore };
      engine.onFile = (file, state, p) => {
        useStore.setState((s) => { const l = { ...s.loading }; if (state === 'loading') l[file] = p; else delete l[file]; return { loading: l }; });
        if (state === 'error') useStore.getState().say(`Não consegui carregar ${FILE_NOME[file] ?? file}. Confira a internet.`);
      };
      engine.onPick = (p, kind) => {
        const st = useStore.getState();
        if (st.quizPick) { if (p && p.si >= 0 && !p.pin) st.quizPick(p.si); return; }
        if (st.modoOcultar) {
          // cada toque esconde o que foi tocado (ou o grupo inteiro dele, ex.: todo o compartimento)
          if (!p || p.si < 0 || p.pin || p.ins) return;
          const s = m.structs[p.si];
          if (st.ocultarGrupo && s.g) {
            const irmaos = (m.structsOf.get(s.g) ?? []).filter((x) => m.structs[x].s === s.s);
            st.hideMany(irmaos);
            st.say(`Oculto: ${nomePt(s.g, m)} (${irmaos.length})`);
          } else { st.hide(p.si); st.say(`Oculto: ${nomePt(s.k, m)}`); }
          return;
        }
        if (!p) { if (st.sel && !st.focus) st.select(null); else if (st.sel) useStore.setState({ sel: null, pin: null, showIns: false, boneMap: false }); return; }
        if (p.pin) { st.setPin(p.pin === st.pin ? null : p.pin); return; }
        if (p.si < 0) return;
        const same = st.sel?.si === p.si && (st.sel.side === p.side || st.sel.side === 'both');
        if (kind === 'double') { engine!.focusPoint(p.point); if (same) return; }
        if (p.ins && st.boneMap) { st.select({ si: p.si, side: p.side || 'both' }, { fly: false, keepTab: st.tab !== 'atlas' && !!st.focus }); return; }
        if (same && !p.ins) return;
        st.select({ si: p.si, side: p.side || 'both' }, { fly: false, keepTab: !!st.focus && st.tab !== 'atlas' });
        if (p.ins) useStore.setState({ showIns: true });
      };
      syncEngine();
      off = useStore.subscribe((s, prev) => {
        if (s.layers !== prev.layers || s.side !== prev.side || s.hidden !== prev.hidden || s.modoOcultar !== prev.modoOcultar || s.focus !== prev.focus || s.sel !== prev.sel || s.showIns !== prev.showIns || s.boneMap !== prev.boneMap || s.pin !== prev.pin || s.pinLabels !== prev.pinLabels || s.colorMode !== prev.colorMode || s.clip !== prev.clip || s.pinMudo !== prev.pinMudo) syncEngine();
      });
      engine.home(true);
      engine.ensureLayers().then(() => { setReady(true); setFirstLoad(1); });
    });
    return () => { off(); engine?.dispose(); rt.engine = null; };
  }, []);

  // área livre do 3D (para centralizar o modelo fora do painel)
  useEffect(() => {
    const e = rt.engine; if (!e) return;
    const w = window.innerWidth, h = window.innerHeight;
    if (portrait) e.setInsets({ left: 0, right: 0, top: 150, bottom: panelOpen ? h * 0.52 + 62 : 62 });
    else e.setInsets({ left: 76, right: panelOpen ? Math.min(420, w * 0.42) + 12 : 0, top: 112, bottom: 0 });
  }, [panelOpen, portrait, ready]);

  // progresso do primeiro carregamento
  const loadVals = Object.values(loading);
  const loadP = loadVals.length ? loadVals.reduce((a, b) => a + b, 0) / loadVals.length : 1;
  useEffect(() => { if (!ready) setFirstLoad(loadP); }, [loadP, ready]);

  // recados de marcos
  const prog = useStore((s) => s.prog);
  useEffect(() => {
    if (!prog.bemVinda || recado) return;
    const val = {
      estudados: Object.keys(prog.estudados).length, sequencia: sequencia(prog.dias),
      quizCertos: prog.quiz.reduce((a, q) => a + q.certos, 0), cartoes: Object.values(prog.srs).reduce((a, c) => a + c.reps + c.lapses, 0),
    };
    const r = RECADOS.find((x) => !prog.marcos.includes(x.id) && val[x.quando.tipo] >= x.quando.n);
    if (r) { useStore.setState({ recado: { titulo: r.titulo, texto: r.texto } }); useStore.getState().patchProg((p) => ({ marcos: [...p.marcos, r.id] })); }
  }, [prog, recado]);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => useStore.setState({ toast: null }), 2600); return () => clearTimeout(t); }, [toast]);

  const showFicha = tab === 'atlas' || (!!sel && !quizPick && tab !== 'treinar');

  return (
    <div className="app">
      <div className="stage" ref={host} />

      <nav className="nav">
        <div className="brand">{PERFIL.nome.charAt(0)}</div>
        {TABS.map((t) => (
          <button key={t.id} className={'tab' + (tab === t.id ? ' on' : '')} onClick={() => { const st = useStore.getState(); if (st.tab === t.id) st.setPanel(!st.panelOpen); else { if (st.sel && t.id !== 'atlas') useStore.setState({ sel: null, pin: null, showIns: false, boneMap: false }); st.setTab(t.id); } }}>
            <Icon n={t.ico} size={22} />
            {t.nome}
          </button>
        ))}
        <div className="grow" />
      </nav>

      <div className="top">
        <Search />
        {focus && (
          <button className="chip glass focus" onClick={() => useStore.getState().setFocus(null, false)}>
            <Icon n="isolar" size={16} /><span>{focus.label}</span><Icon n="fechar" size={15} />
          </button>
        )}
      </div>

      {ready && <VerRapido />}
      {ready && <BarraOcultar />}
      {ready && <Toolbar />}

      {!panelOpen && <button className="panel-toggle glass" onClick={() => useStore.getState().setPanel(true)} aria-label="Abrir painel"><Icon n="painel" /></button>}
      <aside className={'panel glass' + (panelOpen ? '' : ' closed')}>
        {ready && (showFicha ? <Ficha /> : tab === 'explorar' ? <Explorar /> : tab === 'roteiros' ? <Roteiros /> : tab === 'movimentos' ? <Movimentos /> : tab === 'clinica' ? <Clinica /> : tab === 'treinar' ? <Treinar /> : <Progresso />)}
      </aside>

      {ready && loadVals.length > 0 && (
        <div className="loading glass">Carregando {Object.keys(loading).map((f) => FILE_NOME[f] ?? f).join(', ')}<div className="bar"><i style={{ width: `${Math.round(loadP * 100)}%` }} /></div></div>
      )}
      {ready && <LegendaInervacao />}
      {quizPick && <div className="hint glass">Toque na estrutura no modelo 3D</div>}
      {toast && <div className="toast glass" key={toast.id}>{toast.msg}</div>}

      <div className={'splash' + (ready ? ' out' : '')}>
        <div className="box">
          <div className="brand">{PERFIL.nome.charAt(0)}</div>
          <h1>{PERFIL.appNome}</h1>
          <div className="muted">Preparando o atlas 3D…</div>
          <div className="bar"><i style={{ width: `${Math.round(firstLoad * 100)}%` }} /></div>
        </div>
      </div>

      {ready && !bemVinda && (
        <div className="modal-bg">
          <div className="modal">
            <h1>{BOAS_VINDAS.titulo}</h1>
            {BOAS_VINDAS.texto.map((t, i) => <p key={i}>{t}</p>)}
            <div className="sig">{PERFIL.assinatura}</div>
            <button className="btn primary block" onClick={() => useStore.getState().patchProg(() => ({ bemVinda: true }))}>Começar a explorar</button>
            <p className="small muted" style={{ marginTop: 14, marginBottom: 0 }}>Um dedo gira · dois dedos aproximam e movem · toque para selecionar · toque duplo para aproximar</p>
          </div>
        </div>
      )}
      {recado && (
        <div className="modal-bg" onClick={() => useStore.setState({ recado: null })}>
          <Confete />
          <div className="modal">
            <div style={{ fontSize: 44, marginBottom: 6 }}>💛</div>
            <h1>{recado.titulo}</h1>
            <p>{recado.texto}</p>
            <div className="sig">{PERFIL.assinatura}</div>
            <button className="btn primary block">Continuar</button>
          </div>
        </div>
      )}
    </div>
  );
}
