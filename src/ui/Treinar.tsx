import { useEffect, useMemo, useRef, useState } from 'react';
import { rt, useStore, type SrsCard } from '../store';
import { ART_NOME, MOV_NOME, infoDe, motores, musculos, nomePt, ossos, resolver, roteiros, structsDoMusculo, testes, type Musculo } from '../content';
import { MACRO, macroDe, type MacroRegiao } from '../lib/regioes';
import { sample, shuffle } from '../lib/text';
import { proximo, revisar, type Nota } from '../lib/srs';
import { Icon } from './icons';
import { abrirChave } from './Search';

type Modo = 'misto' | 'identificar' | 'localizar' | 'inervacao' | 'origem' | 'acao';
const MODOS: { id: Modo; nome: string; desc: string }[] = [
  { id: 'misto', nome: 'Misto', desc: 'Um pouco de tudo' },
  { id: 'identificar', nome: 'Que estrutura é esta?', desc: 'O 3D destaca, você dá o nome' },
  { id: 'localizar', nome: 'Encontre no 3D', desc: 'Toque na estrutura pedida' },
  { id: 'inervacao', nome: 'Inervação', desc: 'Qual nervo inerva…' },
  { id: 'origem', nome: 'Origem e inserção', desc: 'De onde sai, onde chega' },
  { id: 'acao', nome: 'Ações', desc: 'Quem faz cada movimento' },
];

interface Questao { tipo: Exclude<Modo, 'misto'>; prompt: string; sub?: string; opcoes?: string[]; certa?: number; alvo: string; alvos?: number[]; explica?: string }

function poolMusculos(reg: MacroRegiao | 'todas'): Musculo[] {
  const m = rt.m!;
  return [...musculos.values()].filter((mu) => resolver(mu.key, m).length && (reg === 'todas' || macroDe(mu.key, m) === reg) && (reg !== 'todas' || macroDe(mu.key, m) !== 'cabeca' || !!mu.palpacao));
}
function poolOssos(reg: MacroRegiao | 'todas'): string[] {
  const m = rt.m!;
  return [...ossos.keys()].filter((k) => m.byKey.has(k) && (reg === 'todas' || macroDe(k, m) === reg) && !/tooth|incisor|canine|premolar|cartilage|Incus|Malleus|Stapes/i.test(k));
}
const opc = (certa: string, outras: string[]): { opcoes: string[]; certa: number } => {
  const o = shuffle([certa, ...sample([...new Set(outras)].filter((x) => x && x !== certa), 3)]);
  return { opcoes: o, certa: o.indexOf(certa) };
};

function gerar(modo: Modo, reg: MacroRegiao | 'todas', n: number): Questao[] {
  const m = rt.m!;
  const mus = poolMusculos(reg), bones = poolOssos(reg);
  const tipos: Exclude<Modo, 'misto'>[] = modo === 'misto' ? ['identificar', 'localizar', 'inervacao', 'origem', 'acao', 'identificar', 'inervacao', 'origem'] : [modo];
  const out: Questao[] = [];
  const usados = new Set<string>();
  let guard = 0;
  while (out.length < n && guard++ < n * 30) {
    const tipo = tipos[out.length % tipos.length];
    const mu = mus[Math.floor(Math.random() * mus.length)];
    if (!mu) break;
    if (tipo === 'identificar' || tipo === 'localizar') {
      const usarOsso = bones.length > 0 && Math.random() < 0.4;
      const key = usarOsso ? bones[Math.floor(Math.random() * bones.length)] : mu.key;
      if (usados.has(tipo + key)) continue;
      const alvos = resolver(key, m);
      const nome = nomePt(key, m);
      if (tipo === 'identificar') {
        const outros = usarOsso ? bones.map((k) => nomePt(k, m)) : mus.map((x) => x.pt);
        out.push({ tipo, prompt: 'Que estrutura está destacada no modelo?', alvo: key, alvos, ...opc(usarOsso ? nome : mu.pt, outros) });
      } else out.push({ tipo, prompt: `Toque em: ${usarOsso ? nome : mu.pt}`, sub: 'Gire e aproxime o modelo se precisar.', alvo: key, alvos });
      usados.add(tipo + key);
    } else if (tipo === 'inervacao') {
      if (!mu.inervacao?.nervo || usados.has(tipo + mu.key)) continue;
      const outros = mus.map((x) => x.inervacao?.nervo ?? '').filter((x) => x.split(' ').slice(0, 2).join(' ') !== mu.inervacao!.nervo.split(' ').slice(0, 2).join(' '));
      if (new Set(outros).size < 3) continue;
      out.push({ tipo, prompt: `Qual é a inervação do ${mu.pt.replace(/^M/, 'm')}?`, alvo: mu.key, alvos: structsDoMusculo(mu, m), explica: mu.inervacao.raizes ? `Raízes: ${mu.inervacao.raizes}` : undefined, ...opc(mu.inervacao.nervo, outros) });
      usados.add(tipo + mu.key);
    } else if (tipo === 'origem') {
      const campo = Math.random() < 0.5 ? 'origem' : 'insercao';
      const txt = mu[campo];
      if (!txt || usados.has(tipo + campo + mu.key)) continue;
      out.push({ tipo, prompt: `Qual músculo tem ${campo === 'origem' ? 'origem' : 'inserção'} em:`, sub: txt, alvo: mu.key, alvos: structsDoMusculo(mu, m), ...opc(mu.pt, mus.filter((x) => x[campo] !== txt).map((x) => x.pt)) });
      usados.add(tipo + campo + mu.key);
    } else {
      const a = (mu.acoes ?? []).filter((x) => x.papel === 'primario' && !['outro', 'estabilizacao', 'expressao'].includes(x.mov));
      const ac = a[Math.floor(Math.random() * a.length)];
      if (!ac || usados.has(tipo + ac.art + ac.mov)) continue;
      const fazem = new Set(motores(ac.art, ac.mov).map((x) => x.m.key));
      const outros = mus.filter((x) => !fazem.has(x.key)).map((x) => x.pt);
      if (outros.length < 3) continue;
      out.push({ tipo, prompt: `Qual destes é motor primário de ${(MOV_NOME[ac.mov] ?? ac.mov).toLowerCase()} — ${(ART_NOME[ac.art] ?? ac.art).toLowerCase()}?`, alvo: mu.key, alvos: structsDoMusculo(mu, m), explica: ac.nota, ...opc(mu.pt, outros) });
      usados.add(tipo + ac.art + ac.mov);
    }
  }
  return out;
}

function Quiz({ onExit }: { onExit: () => void }) {
  const m = rt.m!;
  const [modo, setModo] = useState<Modo>('misto');
  const [reg, setReg] = useState<MacroRegiao | 'todas'>('todas');
  const [qs, setQs] = useState<Questao[] | null>(null);
  const [i, setI] = useState(0);
  const [resp, setResp] = useState<number | null>(null);   // índice escolhido, ou -1/-2 para localizar (errou/acertou)
  const [certos, setCertos] = useState(0);
  const [erradas, setErradas] = useState<Questao[]>([]);
  const fim = qs && i >= qs.length;
  const q = qs && !fim ? qs[i] : null;
  const st = useStore.getState();
  const salvo = useRef(false);

  const limpar = () => { useStore.setState({ quizPick: null, sel: null, focus: null, pin: null }); };
  useEffect(() => () => limpar(), []);

  // prepara o 3D para a questão
  useEffect(() => {
    if (!q) return;
    setResp(null);
    if (q.tipo === 'identificar' && q.alvos?.length) {
      useStore.setState({ quizPick: null, sel: null });
      const ossosCtx = m.structs.map((s, si) => [si, s.c] as const).filter(([si, c]) => c === 'bone' && !q.alvos!.includes(si)).map(([si]) => [si, null] as [number, null]);
      st.setFocus({ ids: [...ossosCtx, ...q.alvos.map((s) => [s, '#39c2f0'] as [number, string])], others: 'ghost', label: 'Quiz' }, false);
      const e = rt.engine!;
      e.ensureStructs(q.alvos).then(() => { const sp = e.sphereOf(q.alvos!); if (sp) e.frame(sp, { pad: 2.6, view: sp.c.z < -0.02 ? 'posterior' : 'anterior' }); });
    } else if (q.tipo === 'localizar') {
      useStore.setState({ focus: null, sel: null });
      rt.engine?.home();
      useStore.setState({ quizPick: (si) => {
        const info = infoDe(m.structs[si].k, m);
        const ok = q.alvos!.includes(si) || (info?.tipo === 'musculo' && info.d.key === q.alvo);
        useStore.setState({ quizPick: null });
        responder(ok ? -2 : -1, ok, q);
        st.setFocus({ ids: q.alvos!.map((s) => [s, '#4ade80']), others: 'ghost', label: 'Resposta' });
      } });
    } else { useStore.setState({ quizPick: null, sel: null, focus: null }); }
  }, [q]);

  const responder = (idx: number, ok: boolean, qq: Questao) => {
    setResp(idx);
    if (ok) setCertos((c) => c + 1); else { setErradas((e) => [...e, qq]); st.patchProg((p) => ({ erros: { ...p.erros, [qq.alvo]: (p.erros[qq.alvo] ?? 0) + 1 } })); }
    st.atividade(1);
    if (qq.tipo !== 'identificar' && qq.tipo !== 'localizar' && qq.alvos?.length) st.setFocus({ ids: qq.alvos.map((s) => [s, '#39c2f0']), others: 'ghost', label: 'Resposta' });
  };

  useEffect(() => {
    if (fim && qs && !salvo.current) { salvo.current = true; limpar(); st.patchProg((p) => ({ quiz: [...p.quiz, { t: Date.now(), modo, regiao: reg, total: qs.length, certos }].slice(-200) })); }
  }, [fim]);

  if (!qs) return (
    <>
      <div className="phead"><button className="iconbtn" onClick={onExit} aria-label="Voltar"><Icon n="voltar" /></button><div className="ttl"><h2>Quiz</h2><div className="sub">10 perguntas por rodada</div></div></div>
      <div className="pbody">
        <div className="sec"><h3>Região</h3><div className="subtabs" style={{ flexWrap: 'wrap' }}><button className={reg === 'todas' ? 'on' : ''} onClick={() => setReg('todas')}>Corpo todo</button>{MACRO.map((r) => <button key={r.id} className={reg === r.id ? 'on' : ''} onClick={() => setReg(r.id)}>{r.nome}</button>)}</div></div>
        <div className="sec"><h3>Tipo de pergunta</h3><div className="list">{MODOS.map((x) => <button key={x.id} className={'row' + (modo === x.id ? ' on' : '')} onClick={() => setModo(x.id)}><div className="main"><div className="t">{x.nome}</div><div className="d">{x.desc}</div></div>{modo === x.id && <Icon n="check" size={17} />}</button>)}</div></div>
        <button className="btn primary block" onClick={() => { const g = gerar(modo, reg, 10); if (!g.length) { st.say('Não há perguntas para essa combinação.'); return; } salvo.current = false; setCertos(0); setErradas([]); setI(0); setQs(g); }}>Começar</button>
      </div>
    </>
  );

  if (fim) {
    const pct = Math.round((certos / qs.length) * 100);
    return (
      <>
        <div className="phead"><div className="ttl"><h2>Resultado</h2><div className="sub">{MODOS.find((x) => x.id === modo)?.nome}</div></div></div>
        <div className="pbody">
          <div className="stat center"><div className="n">{certos} / {qs.length}</div><div className="l">{pct >= 90 ? 'Perfeito! Você arrasou. 💛' : pct >= 70 ? 'Muito bem! Está quase lá.' : pct >= 50 ? 'Bom começo — revise os erros abaixo.' : 'Faz parte. Revise com calma e tente de novo.'}</div><div className="bar" style={{ marginTop: 10 }}><i style={{ width: pct + '%' }} /></div></div>
          {erradas.length > 0 && <div className="sec"><h3>Para revisar</h3><div className="list">{erradas.map((e, k) => <button key={k} className="row" onClick={() => abrirChave(e.alvo)}><div className="main"><div className="t">{nomePt(e.alvo, m)}</div><div className="d clamp2">{e.prompt} {e.sub ?? ''}</div></div><Icon n="seta" size={16} /></button>)}</div></div>}
          <button className="btn primary block" onClick={() => setQs(null)}>Nova rodada</button>
          <button className="btn block" onClick={onExit}>Voltar</button>
        </div>
      </>
    );
  }
  if (!q) return null;
  const respondida = resp !== null;
  return (
    <>
      <div className="phead"><button className="iconbtn" onClick={() => { limpar(); setQs(null); }} aria-label="Sair"><Icon n="fechar" /></button><div className="ttl"><div className="sub">Pergunta {i + 1} de {qs.length} · {certos} certa{certos === 1 ? '' : 's'}</div><div className="bar" style={{ marginTop: 8 }}><i style={{ width: `${(i / qs.length) * 100}%` }} /></div></div></div>
      <div className="pbody">
        <div className="q-prompt">{q.prompt}</div>
        {q.sub && <p className="lead">{q.sub}</p>}
        {q.opcoes && <div className="list">{q.opcoes.map((o, k) => (
          <button key={k} disabled={respondida} className={'opt' + (respondida && k === q.certa ? ' right' : respondida && k === resp ? ' wrong' : '')} onClick={() => responder(k, k === q.certa, q)}><span className="ltr">{'ABCD'[k]}</span>{o}</button>
        ))}</div>}
        {q.tipo === 'localizar' && !respondida && <button className="btn block" onClick={() => { useStore.setState({ quizPick: null }); responder(-1, false, q); st.setFocus({ ids: q.alvos!.map((s) => [s, '#4ade80']), others: 'ghost', label: 'Resposta' }); }}>Não sei — mostrar</button>}
        {respondida && (
          <>
            <div className={'kv ' + ((q.opcoes ? resp === q.certa : resp === -2) ? 'n' : 'o')}><div className="k">{(q.opcoes ? resp === q.certa : resp === -2) ? 'Certo!' : 'Resposta'}</div><div className="v">{q.opcoes ? q.opcoes[q.certa!] : nomePt(q.alvo, m)}{q.explica && <small>{q.explica}</small>}</div></div>
            <button className="btn primary block" onClick={() => setI(i + 1)}>{i + 1 < qs.length ? 'Próxima' : 'Ver resultado'}</button>
          </>
        )}
      </div>
    </>
  );
}

// ───────────────────────────── flashcards

interface Cartao { id: string; frente: string; sub?: string; verso: { k: string; v: string }[]; chave?: string }
type Baralho = { id: string; nome: string; cartoes: () => Cartao[] };

function baralhos(): Baralho[] {
  const m = rt.m!;
  const mc = (mu: Musculo): Cartao => ({ id: 'm:' + mu.key, frente: mu.pt, sub: 'Origem · inserção · inervação · ação', chave: mu.key, verso: [
    { k: 'Origem', v: mu.origem ?? '—' }, { k: 'Inserção', v: mu.insercao ?? '—' },
    { k: 'Inervação', v: (mu.inervacao?.nervo ?? '—') + (mu.inervacao?.raizes ? ` (${mu.inervacao.raizes})` : '') },
    { k: 'Ação', v: (mu.acoes ?? []).filter((a) => a.papel === 'primario').map((a) => `${MOV_NOME[a.mov] ?? a.mov} (${(ART_NOME[a.art] ?? a.art).replace(/ \(.*/, '').toLowerCase()})`).join('; ') || (mu.funcao ?? '—') },
  ] });
  const out: Baralho[] = MACRO.map((r) => ({ id: 'mus-' + r.id, nome: `Músculos — ${r.nome}`, cartoes: () => [...musculos.values()].filter((mu) => macroDe(mu.key, m) === r.id && mu.origem).map(mc) }));
  out.push({ id: 'roteiros', nome: 'Perguntas dos roteiros', cartoes: () => roteiros.flatMap((r) => (r.perguntas ?? []).map((p, i) => ({ id: `r:${r.id}:${i}`, frente: p.q, sub: r.titulo, verso: [{ k: 'Resposta', v: p.a }] }))) });
  out.push({ id: 'testes', nome: 'Testes clínicos', cartoes: () => testes.map((t) => ({ id: 't:' + t.id, frente: t.nome, sub: 'O que avalia e quando é positivo?', verso: [{ k: 'Avalia', v: t.objetivo ?? '—' }, { k: 'Positivo', v: t.positivo ?? '—' }] })) });
  out.push({ id: 'ossos', nome: 'Acidentes ósseos', cartoes: () => [...ossos.values()].flatMap((o) => (o.acidentes ?? []).filter((a) => a.nota && a.nota.length > 40 && a.key !== o.key).map((a) => ({ id: `a:${o.key}:${a.key}`, frente: `${a.pt}`, sub: o.pt, chave: o.key, verso: [{ k: 'O que é / o que se fixa', v: a.nota! }] }))) });
  return out;
}

function Flash({ onExit }: { onExit: () => void }) {
  const srs = useStore((s) => s.prog.srs);
  const st = useStore.getState();
  const bs = useMemo(() => baralhos().map((b) => ({ ...b, lista: b.cartoes() })), []);
  const [fila, setFila] = useState<Cartao[] | null>(null);
  const [virado, setVirado] = useState(false);
  const [feitos, setFeitos] = useState(0);
  const agora = Date.now();
  const conta = (lista: Cartao[]) => ({ devidos: lista.filter((c) => srs[c.id] && srs[c.id].due <= agora).length, novos: lista.filter((c) => !srs[c.id]).length });

  const iniciar = (lista: Cartao[]) => {
    const devidos = lista.filter((c) => srs[c.id] && srs[c.id].due <= Date.now());
    const novos = sample(lista.filter((c) => !srs[c.id]), Math.max(0, 15 - Math.min(devidos.length, 10)));
    const f = [...shuffle(devidos).slice(0, 25), ...novos];
    if (!f.length) { st.say('Tudo em dia neste baralho. Volte amanhã! 💛'); return; }
    setFeitos(0); setVirado(false); setFila(f);
  };
  const dar = (n: Nota) => {
    const c = fila![0];
    const novo: SrsCard = revisar(srs[c.id], n);
    st.patchProg((p) => ({ srs: { ...p.srs, [c.id]: novo } }));
    st.atividade(1);
    setFeitos((x) => x + 1); setVirado(false);
    setFila(n === 0 ? [...fila!.slice(1), c] : fila!.slice(1));
  };

  if (fila && fila.length) {
    const c = fila[0];
    return (
      <>
        <div className="phead"><button className="iconbtn" onClick={() => setFila(null)} aria-label="Sair"><Icon n="fechar" /></button><div className="ttl"><div className="sub">{fila.length} restante{fila.length === 1 ? '' : 's'} · {feitos} revisado{feitos === 1 ? '' : 's'}</div></div></div>
        <div className="pbody">
          <div className="card3d">
            <div className="front">{c.frente}</div>
            {c.sub && <div className="muted small" style={{ marginTop: 4 }}>{c.sub}</div>}
            {virado && <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>{c.verso.map((v, k) => <div className="kv" key={k}><div className="k">{v.k}</div><div className="v">{v.v}</div></div>)}</div>}
          </div>
          {c.chave && <button className="btn" onClick={() => { const sis = resolver(c.chave!, rt.m!); if (sis.length) st.setFocus({ ids: sis.map((s) => [s, '#39c2f0']), others: 'ghost', label: nomePt(c.chave!, rt.m!) }); }}><Icon n="isolar" size={16} />Ver no 3D</button>}
          {!virado ? <button className="btn primary block" onClick={() => setVirado(true)}>Mostrar resposta</button> : (
            <div className="grade">{([[0, 'Errei'], [1, 'Difícil'], [2, 'Bom'], [3, 'Fácil']] as [Nota, string][]).map(([n, t]) => <button key={n} className={'g' + n} onClick={() => dar(n)}>{t}<small>{proximo(srs[c.id], n)}</small></button>)}</div>
          )}
        </div>
      </>
    );
  }
  const todos = bs.flatMap((b) => b.lista);
  const tot = conta(todos);
  return (
    <>
      <div className="phead"><button className="iconbtn" onClick={onExit} aria-label="Voltar"><Icon n="voltar" /></button><div className="ttl"><h2>Flashcards</h2><div className="sub">Repetição espaçada: o que você erra volta mais vezes</div></div></div>
      <div className="pbody">
        {fila && fila.length === 0 && <div className="tip"><b>Sessão concluída!</b> {feitos} cartões revisados. 💛</div>}
        {tot.devidos > 0 && <button className="btn primary block" onClick={() => iniciar(todos.filter((c) => srs[c.id]))}>Revisar os {tot.devidos} cartões de hoje</button>}
        <div className="list">{bs.map((b) => { const c = conta(b.lista); return (
          <button key={b.id} className="row" onClick={() => iniciar(b.lista)}><div className="main"><div className="t">{b.nome}</div><div className="d">{b.lista.length} cartões · {c.devidos} para revisar · {c.novos} novos</div></div><Icon n="seta" size={16} /></button>
        ); })}</div>
      </div>
    </>
  );
}

export function Treinar() {
  const [tela, setTela] = useState<'menu' | 'quiz' | 'flash'>('menu');
  const prog = useStore((s) => s.prog);
  const devidos = Object.values(prog.srs).filter((c) => c.due <= Date.now()).length;
  const ult = prog.quiz[prog.quiz.length - 1];
  if (tela === 'quiz') return <Quiz onExit={() => setTela('menu')} />;
  if (tela === 'flash') return <Flash onExit={() => setTela('menu')} />;
  return (
    <>
      <div className="phead"><div className="ttl"><h2>Treinar</h2><div className="sub">Teste o que você já sabe</div></div><button className="iconbtn" onClick={() => useStore.getState().setPanel(false)} aria-label="Fechar"><Icon n="fechar" /></button></div>
      <div className="pbody">
        <button className="tile" style={{ width: '100%' }} onClick={() => setTela('quiz')}><div className="t" style={{ fontSize: 17 }}>Quiz</div><div className="d">Identifique estruturas no 3D, encontre músculos no modelo, inervação, origem, inserção e ações.</div>{ult && <div className="d" style={{ marginTop: 6 }}>Última rodada: {ult.certos}/{ult.total}</div>}</button>
        <button className="tile" style={{ width: '100%' }} onClick={() => setTela('flash')}><div className="t" style={{ fontSize: 17 }}>Flashcards</div><div className="d">Cartões de músculos, acidentes ósseos, testes clínicos e perguntas dos roteiros, com repetição espaçada.</div><div className="d" style={{ marginTop: 6, color: devidos ? 'var(--accent)' : undefined }}>{devidos ? `${devidos} cartões para revisar hoje` : 'Nenhuma revisão pendente'}</div></button>
      </div>
    </>
  );
}
