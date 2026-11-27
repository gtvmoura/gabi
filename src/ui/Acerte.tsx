import { useEffect, useMemo, useRef, useState } from 'react';
import { rt, useStore } from '../store';
import { usePerfil } from '../content/recados';
import { acidente, estruturas, infoDe, ligamentos, musculos, nervos, nomePt, ossos, resolver } from '../content';
import { MACRO, macroDe, type MacroRegiao } from '../lib/regioes';
import { sample, shuffle } from '../lib/text';
import type { LayerId, LayerState } from '../engine/palette';
import { Icon } from './icons';
import { Chama, Confete } from './Extras';
import { abrirChave } from './Search';

type Cat = 'ossos' | 'musculos' | 'ligamentos' | 'nervos' | 'arterias' | 'orgaos' | 'acidentes';
const CATS: { id: Cat; nome: string; desc: string; layer: LayerId; tocar: boolean }[] = [
  { id: 'ossos', nome: 'Ossos', desc: 'Fêmur, escafoide, áxis…', layer: 'ossos', tocar: true },
  { id: 'acidentes', nome: 'Acidentes ósseos', desc: 'Um ponto no osso: que acidente é?', layer: 'ossos', tocar: false },
  { id: 'musculos', nome: 'Músculos', desc: 'Do deltoide aos lumbricais', layer: 'musculos', tocar: true },
  { id: 'ligamentos', nome: 'Ligamentos e meniscos', desc: 'Cruzados, colaterais, discos…', layer: 'ligamentos', tocar: true },
  { id: 'nervos', nome: 'Nervos', desc: 'Plexos e nervos periféricos', layer: 'nervos', tocar: false },
  { id: 'arterias', nome: 'Artérias', desc: 'Os vasos principais', layer: 'arterias', tocar: false },
  { id: 'orgaos', nome: 'Órgãos', desc: 'Pulmões, fígado, rins…', layer: 'orgaos', tocar: true },
];

interface Alvo { key: string; nome: string; sis: number[]; pin?: { si: number; side: 'l' | 'r' | 'both'; id: string }; grupo?: string }
interface Pergunta { alvo: Alvo; opcoes: string[] }

function pool(cat: Cat, reg: MacroRegiao | 'todas'): Alvo[] {
  const m = rt.m!;
  const okReg = (k: string) => reg === 'todas' || macroDe(k, m) === reg;
  const mk = (key: string, nome = nomePt(key, m)): Alvo => ({ key, nome, sis: resolver(key, m) });
  let out: Alvo[] = [];
  if (cat === 'ossos') out = [...ossos.keys()].filter((k) => m.byKey.has(k) && m.structs[m.byKey.get(k)!].c === 'bone' && okReg(k)).map((k) => mk(k));
  else if (cat === 'musculos') out = [...musculos.values()].filter((x) => okReg(x.key) && (reg !== 'todas' || !!x.palpacao)).map((x) => mk(x.key, x.pt));
  else if (cat === 'ligamentos') out = [...ligamentos.values()].filter((l) => m.byKey.has(l.key) && l.clinica && okReg(l.key) && !/disc [CTL]|Nucleus/i.test(l.key)).map((l) => mk(l.key, l.pt));
  else if (cat === 'nervos') out = [...nervos.values()].filter((n) => m.byKey.has(n.key) && n.trajeto && m.structs[m.byKey.get(n.key)!].c === 'nerve').map((n) => mk(n.key, n.pt));
  else if (cat === 'arterias') out = [...estruturas.values()].filter((e) => m.byKey.has(e.key) && m.structs[m.byKey.get(e.key)!].c === 'artery').map((e) => mk(e.key, e.pt));
  else if (cat === 'orgaos') out = [...estruturas.values()].filter((e) => m.byKey.has(e.key) && m.structs[m.byKey.get(e.key)!].c === 'organ').map((e) => mk(e.key, e.pt));
  else {
    for (const o of ossos.values()) {
      const si = m.byKey.get(o.key); if (si === undefined || !okReg(o.key)) continue;
      const st = m.structs[si]; const side = st.m.l ? 'l' : st.m.r ? 'r' : 'both'; const mesh = st.m.l ?? st.m.c ?? st.m.r;
      for (const l of m.lmByStruct.get(si) ?? []) {
        if (l.on !== mesh || l.k === o.key) continue;
        const a = acidente(o.key, l.k); if (!a?.nota) continue;
        out.push({ key: o.key, nome: a.pt, sis: [si], pin: { si, side, id: l.on + '|' + l.k }, grupo: o.key });
      }
    }
  }
  return out.filter((a) => a.sis.length && a.nome && a.nome !== a.key);
}

function montar(p: Alvo[], usados: Set<string>): Pergunta | null {
  if (p.length < 4) return null;
  const livres = p.filter((a) => !usados.has(a.nome));
  const alvo = (livres.length ? livres : p)[Math.floor(Math.random() * (livres.length ? livres.length : p.length))];
  usados.add(alvo.nome);
  // distratores: de preferência do mesmo osso (acidentes) ou da mesma região
  const m = rt.m!;
  let outros = p.filter((a) => a.nome !== alvo.nome && (alvo.grupo ? a.grupo === alvo.grupo : macroDe(a.key, m) === macroDe(alvo.key, m)));
  if (new Set(outros.map((a) => a.nome)).size < 3) outros = p.filter((a) => a.nome !== alvo.nome);
  return { alvo, opcoes: shuffle([alvo.nome, ...sample([...new Set(outros.map((a) => a.nome))], 3)]) };
}

export function Acerte({ onExit }: { onExit: () => void }) {
  const m = rt.m!;
  const { mimo } = usePerfil();
  const st = useStore.getState();
  const recordesSalvos = useStore((s) => s.prog.recordes);
  const recordes: Record<string, number> = recordesSalvos ?? {};
  const [cat, setCat] = useState<Cat>('ossos');
  const [reg, setReg] = useState<MacroRegiao | 'todas'>('todas');
  const [modo, setModo] = useState<'nomear' | 'tocar'>('nomear');
  const [ritmo, setRitmo] = useState<'dez' | 'relogio'>('dez');
  const [fase, setFase] = useState<'config' | 'jogo' | 'fim'>('config');
  const [q, setQ] = useState<Pergunta | null>(null);
  const [resp, setResp] = useState<string | null>(null);
  const [n, setN] = useState(0);
  const [certos, setCertos] = useState(0);
  const [seq, setSeq] = useState(0);
  const [melhorSeq, setMelhorSeq] = useState(0);
  const [tempo, setTempo] = useState(60);
  const [erradas, setErradas] = useState<Alvo[]>([]);
  const usados = useRef(new Set<string>());
  const lista = useRef<Alvo[]>([]);
  const camadas = useRef<Record<LayerId, LayerState> | null>(null);
  const conf = CATS.find((c) => c.id === cat)!;
  const chave = `${cat}:${modo}:${ritmo}`;
  const total = useMemo(() => pool(cat, reg).length, [cat, reg]);

  const restaurar = () => {
    useStore.setState({ quizPick: null, sel: null, focus: null, pin: null, pinMudo: false, ...(camadas.current ? { layers: camadas.current } : {}) });
    camadas.current = null;
  };
  useEffect(() => () => restaurar(), []);

  const mostrar = (p: Pergunta) => {
    const e = rt.engine!; const a = p.alvo;
    setQ(p); setResp(null);
    if (a.pin) {
      useStore.setState({ focus: null, quizPick: null });
      st.select({ si: a.pin.si, side: a.pin.side }, { keepTab: true, fly: false });
      useStore.setState({ pin: a.pin.id, pinLabels: false, pinMudo: true });
      const lm = m.landmarks.find((l) => l.on + '|' + l.k === a.pin!.id);
      if (lm) e.ensureStructs([a.pin.si]).then(() => e.framePoint(lm.p, 0.11));
      return;
    }
    if (modo === 'tocar') {
      useStore.setState({ focus: null, sel: null, quizPick: (si) => {
        const info = infoDe(m.structs[si].k, m);
        const ok = a.sis.includes(si) || (info?.tipo === 'musculo' && info.d.key === a.key);
        useStore.setState({ quizPick: null });
        st.setFocus({ ids: a.sis.map((s) => [s, '#4ade80']), others: 'ghost', label: a.nome });
        responder(ok ? a.nome : '✗', p);
      } });
      return;
    }
    const ctx = cat === 'orgaos' ? [] : m.structs.map((s, si) => [si, s.c] as const).filter(([si, c]) => c === 'bone' && !a.sis.includes(si)).map(([si]) => [si, null] as [number, null]);
    st.setFocus({ ids: [...ctx, ...a.sis.map((s) => [s, '#39c2f0'] as [number, string])], others: 'ghost', label: 'Acerte a estrutura' }, false);
    e.ensureStructs(a.sis).then(() => { const sp = e.sphereOf(a.sis); if (sp) e.frame(sp, { pad: cat === 'ossos' ? 2.2 : 2.6, view: sp.c.z < -0.03 ? 'posterior' : 'anterior' }); });
  };

  const proxima = (count = n) => {
    if (ritmo === 'dez' && count >= 10) { terminar(); return; }
    const p = montar(lista.current, usados.current);
    if (!p) { terminar(); return; }
    mostrar(p);
  };

  const comecar = () => {
    lista.current = pool(cat, reg);
    if (lista.current.length < 4) { st.say('Poucas estruturas nessa combinação. Tente o corpo todo.'); return; }
    usados.current.clear();
    camadas.current = useStore.getState().layers;
    if (modo === 'tocar' || cat === 'acidentes') {
      const l = { ...camadas.current } as Record<LayerId, LayerState>;
      (Object.keys(l) as LayerId[]).forEach((k) => { l[k] = 0; });
      l.ossos = 1; l[conf.layer] = 1;
      useStore.setState({ layers: l, clip: null, colorMode: 'normal', hidden: [] });
      if (modo === 'tocar') rt.engine?.home();
    } else useStore.setState({ clip: null, colorMode: 'normal', hidden: [] });
    setN(0); setCertos(0); setSeq(0); setMelhorSeq(0); setErradas([]); setTempo(60); setFase('jogo');
    proxima(0);
  };

  const responder = (nome: string, p: Pergunta) => {
    setResp(nome);
    if (p.alvo.pin) useStore.setState({ pinMudo: false });   // revela o nome no modelo
    const ok = nome === p.alvo.nome;
    setN((x) => x + 1);
    if (ok) { setCertos((c) => c + 1); setSeq((s) => { const v = s + 1; setMelhorSeq((b) => Math.max(b, v)); return v; }); }
    else { setSeq(0); setErradas((e) => [...e, p.alvo]); st.patchProg((pr) => ({ erros: { ...pr.erros, [p.alvo.key]: (pr.erros[p.alvo.key] ?? 0) + 1 } })); }
    st.atividade(1);
  };

  const terminou = useRef(false);
  const terminar = () => { if (terminou.current) return; terminou.current = true; restaurar(); setFase('fim'); };
  useEffect(() => { if (fase === 'jogo') terminou.current = false; }, [fase]);
  // grava o recorde ao terminar
  useEffect(() => {
    if (fase !== 'fim') return;
    if (certos > (recordes[chave] ?? 0)) st.patchProg((p) => ({ recordes: { ...(p.recordes ?? {}), [chave]: certos } }));
  }, [fase]);
  // relógio
  useEffect(() => {
    if (fase !== 'jogo' || ritmo !== 'relogio') return;
    const t = setInterval(() => setTempo((x) => { if (x <= 1) { clearInterval(t); terminar(); return 0; } return x - 1; }), 1000);
    return () => clearInterval(t);
  }, [fase, ritmo]);
  // no modo relógio, passa sozinho para a próxima
  useEffect(() => {
    if (fase !== 'jogo' || ritmo !== 'relogio' || resp === null) return;
    const t = setTimeout(() => proxima(), resp === q?.alvo.nome ? 550 : 1500);
    return () => clearTimeout(t);
  }, [resp]);

  if (fase === 'config') return (
    <>
      <div className="phead"><button className="iconbtn" onClick={onExit} aria-label="Voltar"><Icon n="voltar" /></button><div className="ttl"><h2>Acerte a estrutura</h2><div className="sub">Escolha o que quer treinar</div></div></div>
      <div className="pbody">
        <div className="sec"><h3>O que treinar</h3><div className="list">{CATS.map((c) => <button key={c.id} className={'row compact' + (cat === c.id ? ' on' : '')} onClick={() => { setCat(c.id); if (!c.tocar) setModo('nomear'); }}><div className="main"><div className="t">{c.nome}</div><div className="d">{c.desc}</div></div>{cat === c.id && <Icon n="check" size={17} />}</button>)}</div></div>
        {(cat === 'ossos' || cat === 'musculos' || cat === 'acidentes' || cat === 'ligamentos') && <div className="sec"><h3>Região</h3><div className="subtabs" style={{ flexWrap: 'wrap' }}><button className={reg === 'todas' ? 'on' : ''} onClick={() => setReg('todas')}>Corpo todo</button>{MACRO.map((r) => <button key={r.id} className={reg === r.id ? 'on' : ''} onClick={() => setReg(r.id)}>{r.nome}</button>)}</div></div>}
        <div className="sec"><h3>Como jogar</h3>
          <div className="seg wide"><button className={modo === 'nomear' ? 'on' : ''} onClick={() => setModo('nomear')}>Dizer o nome</button><button className={modo === 'tocar' ? 'on' : ''} disabled={!conf.tocar} style={{ opacity: conf.tocar ? 1 : 0.35 }} onClick={() => setModo('tocar')}>Tocar no 3D</button></div>
          <div style={{ height: 8 }} />
          <div className="seg wide"><button className={ritmo === 'dez' ? 'on' : ''} onClick={() => setRitmo('dez')}>10 perguntas</button><button className={ritmo === 'relogio' ? 'on' : ''} onClick={() => setRitmo('relogio')}>Contra o relógio (60 s)</button></div>
        </div>
        <div className="small muted">{total} estruturas nesta seleção{recordes[chave] ? ` · seu recorde: ${recordes[chave]} acertos` : ''}</div>
        <button className="btn primary block" onClick={comecar}>Começar</button>
      </div>
    </>
  );

  if (fase === 'fim') {
    const rec = Math.max(recordes[chave] ?? 0, certos);
    const novo = certos > 0 && certos >= rec && certos > (recordes[chave] ?? 0);
    return (
      <>
        {(novo || (n > 0 && certos / n >= 0.9)) && <Confete />}
        <div className="phead"><div className="ttl"><h2>{conf.nome}</h2><div className="sub">{ritmo === 'relogio' ? 'Contra o relógio' : '10 perguntas'} · {modo === 'tocar' ? 'tocar no 3D' : 'dizer o nome'}</div></div></div>
        <div className="pbody">
          <div className="grid2">
            <div className="stat"><div className="n">{certos}<span className="muted" style={{ fontSize: 16 }}> / {n}</span></div><div className="l">acertos</div></div>
            <div className="stat"><div className="n">{melhorSeq} <Chama /></div><div className="l">maior sequência</div></div>
          </div>
          <div className="tip">{novo ? <><b>Novo recorde!</b> {certos} acertos.{mimo}</> : <>Recorde nesta modalidade: <b>{rec}</b> acertos.</>}</div>
          {erradas.length > 0 && <div className="sec"><h3>Para revisar</h3><div className="tags">{[...new Map(erradas.map((a) => [a.nome, a])).values()].map((a) => <button key={a.nome} className="tag" onClick={() => abrirChave(a.key)}>{a.nome}</button>)}</div></div>}
          <button className="btn primary block" onClick={comecar}>Jogar de novo</button>
          <button className="btn block" onClick={() => setFase('config')}>Trocar de categoria</button>
          <button className="btn block ghost" onClick={onExit}>Voltar</button>
        </div>
      </>
    );
  }

  if (!q) return null;
  const ok = resp === q.alvo.nome;
  return (
    <>
      <div className="phead"><button className="iconbtn" onClick={terminar} aria-label="Encerrar"><Icon n="fechar" /></button>
        <div className="ttl"><div className="sub">{ritmo === 'relogio' ? <b style={{ color: tempo <= 10 ? 'var(--bad)' : 'var(--text)', fontSize: 16 }}>{tempo}s</b> : <>Pergunta {Math.min(n + (resp === null ? 1 : 0), 10)} de 10</>} · {certos} certa{certos === 1 ? '' : 's'}{seq >= 2 ? ` · ${seq} seguidas${mimo ? ' 🔥' : ''}` : ''}</div>
          <div className="bar" style={{ marginTop: 8 }}><i style={{ width: ritmo === 'relogio' ? `${(tempo / 60) * 100}%` : `${(n / 10) * 100}%` }} /></div></div></div>
      <div className="pbody">
        {modo === 'tocar' ? (
          <>
            <div className="q-prompt">Toque em: {q.alvo.nome}</div>
            {resp === null ? <button className="btn block" onClick={() => { useStore.setState({ quizPick: null }); st.setFocus({ ids: q.alvo.sis.map((s) => [s, '#4ade80']), others: 'ghost', label: q.alvo.nome }); responder('✗', q); }}>Não sei — mostrar</button>
              : <div className={'kv ' + (ok ? 'n' : 'o')}><div className="k">{ok ? 'Certo!' : 'Era aqui (em verde)'}</div><div className="v">{q.alvo.nome}</div></div>}
          </>
        ) : (
          <>
            <div className="q-prompt">{q.alvo.pin ? `Que acidente ósseo é o ponto amarelo? (${nomePt(q.alvo.key, m)})` : 'Que estrutura está destacada?'}</div>
            <div className="list">{q.opcoes.map((o, k) => <button key={o} disabled={resp !== null} className={'opt' + (resp !== null && o === q.alvo.nome ? ' right' : resp === o ? ' wrong' : '')} onClick={() => responder(o, q)}><span className="ltr">{'ABCD'[k]}</span>{o}</button>)}</div>
          </>
        )}
        {resp !== null && ritmo === 'dez' && <button className="btn primary block" onClick={() => proxima()}>{n < 10 ? 'Próxima' : 'Ver resultado'}</button>}
      </div>
    </>
  );
}
