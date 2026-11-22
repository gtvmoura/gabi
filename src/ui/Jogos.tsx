import { useEffect, useMemo, useRef, useState } from 'react';
import { rt, useStore } from '../store';
import { ART_NOME, MOV_NOME, musculos, resolver, structsDoMusculo, type Musculo } from '../content';
import { CASOS } from '../content/casos';
import { macroDe, MACRO } from '../lib/regioes';
import { sample, shuffle } from '../lib/text';
import { Icon } from './icons';
import { ChaveTags } from './Ficha';
import { Confete } from './Extras';
import { destacarChaves } from './Roteiros';

// ───────────────────────────── Quem sou eu?

interface Rodada { m: Musculo; pistas: { k: string; v: string }[]; opcoes: Musculo[] }
function novaRodada(pool: Musculo[], usados: Set<string>): Rodada {
  const livres = pool.filter((x) => !usados.has(x.key));
  const base = livres.length ? livres : pool;
  const m = base[Math.floor(Math.random() * base.length)];
  usados.add(m.key);
  const acao = (m.acoes ?? []).filter((a) => a.papel === 'primario' && !['outro', 'estabilizacao'].includes(a.mov)).slice(0, 3).map((a) => `${(MOV_NOME[a.mov] ?? a.mov).toLowerCase()} (${(ART_NOME[a.art] ?? a.art).replace(/ \(.*/, '').toLowerCase()})`).join(', ');
  const reg = MACRO.find((r) => r.id === macroDe(m.key, rt.m!))?.nome;
  const pistas = [
    acao && { k: 'Eu faço', v: acao },
    m.inervacao && { k: 'Quem me inerva', v: m.inervacao.nervo + (m.inervacao.raizes ? ` (${m.inervacao.raizes})` : '') },
    m.insercao && { k: 'Onde eu chego (inserção)', v: m.insercao },
    m.origem && { k: 'De onde eu saio (origem)', v: m.origem },
    reg && { k: 'Onde eu moro', v: `${reg}${m.camada ? ' · camada ' + m.camada.replace('intermediaria', 'intermediária') : ''}` },
  ].filter(Boolean) as { k: string; v: string }[];
  const mesmos = pool.filter((x) => x.key !== m.key && macroDe(x.key, rt.m!) === macroDe(m.key, rt.m!));
  return { m, pistas, opcoes: shuffle([m, ...sample(mesmos.length >= 3 ? mesmos : pool.filter((x) => x.key !== m.key), 3)]) };
}

export function QuemSouEu({ onExit }: { onExit: () => void }) {
  const pool = useMemo(() => [...musculos.values()].filter((x) => x.origem && x.insercao && x.inervacao && (x.acoes?.length ?? 0) > 0 && x.palpacao && resolver(x.key, rt.m!).length), []);
  const TOTAL = 6;
  const [n, setN] = useState(0);
  const usados = useRef(new Set<string>());
  const [r, setR] = useState<Rodada>(() => novaRodada(pool, usados.current));
  const [vis, setVis] = useState(1);
  const [resp, setResp] = useState<string | null>(null);
  const [pontos, setPontos] = useState(0);
  const st = useStore.getState();
  useEffect(() => { useStore.setState({ sel: null, focus: null }); return () => { useStore.setState({ focus: null }); }; }, []);
  const vale = Math.max(1, r.pistas.length - vis + 1);
  const escolher = (m: Musculo) => {
    if (resp) return;
    setResp(m.key);
    if (m.key === r.m.key) setPontos((p) => p + vale); else st.patchProg((p) => ({ erros: { ...p.erros, [r.m.key]: (p.erros[r.m.key] ?? 0) + 1 } }));
    st.atividade(1);
    st.setFocus({ ids: structsDoMusculo(r.m, rt.m!).map((s) => [s, '#39c2f0']), others: 'ghost', label: r.m.pt });
  };
  if (n >= TOTAL) {
    const max = TOTAL * 5;
    return (
      <>
        {pontos >= max * 0.7 && <Confete />}
        <div className="phead"><div className="ttl"><h2>Quem sou eu?</h2><div className="sub">Fim de jogo</div></div></div>
        <div className="pbody">
          <div className="stat center"><div className="n">{pontos} pontos</div><div className="l">{pontos >= max * 0.7 ? 'Detetive de músculos! 🕵️‍♀️💛' : pontos >= max * 0.4 ? 'Muito bom! Quanto menos pistas, mais pontos.' : 'Vale a revanche — você pega o jeito rápido.'}</div></div>
          <button className="btn primary block" onClick={() => { usados.current.clear(); setN(0); setPontos(0); setVis(1); setResp(null); setR(novaRodada(pool, usados.current)); useStore.setState({ focus: null }); }}>Jogar de novo</button>
          <button className="btn block" onClick={onExit}>Voltar</button>
        </div>
      </>
    );
  }
  return (
    <>
      <div className="phead"><button className="iconbtn" onClick={onExit} aria-label="Sair"><Icon n="fechar" /></button><div className="ttl"><h2>Quem sou eu?</h2><div className="sub">Rodada {n + 1} de {TOTAL} · {pontos} pontos · vale {vale}</div></div></div>
      <div className="pbody">
        <div className="list">{r.pistas.slice(0, resp ? r.pistas.length : vis).map((p, i) => <div className="clue" key={i}><div className="k">{p.k}</div><div>{p.v}</div></div>)}</div>
        {!resp && vis < r.pistas.length && <button className="btn block" onClick={() => setVis(vis + 1)}>Mais uma pista (−1 ponto)</button>}
        <div className="list">{r.opcoes.map((o) => <button key={o.key} disabled={!!resp} className={'opt' + (resp && o.key === r.m.key ? ' right' : resp === o.key ? ' wrong' : '')} onClick={() => escolher(o)}>{o.pt}</button>)}</div>
        {resp && <button className="btn primary block" onClick={() => { setN(n + 1); setVis(1); setResp(null); setR(novaRodada(pool, usados.current)); useStore.setState({ focus: null }); }}>{n + 1 < TOTAL ? 'Próximo' : 'Ver pontuação'}</button>}
      </div>
    </>
  );
}

// ───────────────────────────── Casos clínicos

export function Casos({ onExit }: { onExit: () => void }) {
  const [id, setId] = useState<string | null>(null);
  const [resp, setResp] = useState<number | null>(null);
  const feitos = useStore((s) => s.prog.estudados);
  const st = useStore.getState();
  const c = CASOS.find((x) => x.id === id);
  // embaralha as alternativas a cada abertura, para ninguém decorar a letra
  const ordem = useMemo(() => (c ? shuffle(c.opcoes.map((_, i) => i)) : []), [id]);
  useEffect(() => () => { useStore.setState({ focus: null }); }, []);
  if (!c) return (
    <>
      <div className="phead"><button className="iconbtn" onClick={onExit} aria-label="Voltar"><Icon n="voltar" /></button><div className="ttl"><h2>Casos clínicos</h2><div className="sub">Raciocine como fisioterapeuta: da queixa à anatomia</div></div></div>
      <div className="pbody"><div className="list">{CASOS.map((x) => <button key={x.id} className="row" onClick={() => { setResp(null); setId(x.id); useStore.setState({ focus: null, sel: null }); }}><div className="main"><div className="t">{x.titulo}</div><div className="d">{x.regiao}</div></div>{feitos['caso:' + x.id] ? <span style={{ color: 'var(--ok)' }}><Icon n="check" size={17} /></span> : <Icon n="seta" size={16} />}</button>)}</div></div>
    </>
  );
  const responder = (i: number) => {
    setResp(i); st.atividade(2);
    if (i === c.certa) st.patchProg((p) => ({ estudados: { ...p.estudados, ['caso:' + c.id]: Date.now() } }));
    destacarChaves(c.estruturas, c.titulo, '#39c2f0');
  };
  return (
    <>
      <div className="phead"><button className="iconbtn" onClick={() => { setId(null); useStore.setState({ focus: null }); }} aria-label="Voltar"><Icon n="voltar" /></button><div className="ttl"><h2>{c.titulo}</h2><div className="sub">{c.regiao}</div></div></div>
      <div className="pbody">
        <p className="lead">{c.historia}</p>
        <div className="q-prompt" style={{ fontSize: 16 }}>{c.pergunta}</div>
        <div className="list">{ordem.map((i, pos) => <button key={i} disabled={resp !== null} className={'opt' + (resp !== null && i === c.certa ? ' right' : resp === i ? ' wrong' : '')} onClick={() => responder(i)}><span className="ltr">{'ABCD'[pos]}</span>{c.opcoes[i]}</button>)}</div>
        {resp !== null && (
          <>
            <div className={'kv ' + (resp === c.certa ? 'n' : 'o')}><div className="k">{resp === c.certa ? 'Isso mesmo!' : 'Quase — veja o raciocínio'}</div><div className="v">{c.explicacao}</div></div>
            <div className="sec"><h3>Estruturas envolvidas (destacadas no 3D)</h3><ChaveTags keys={c.estruturas} /></div>
          </>
        )}
      </div>
    </>
  );
}
