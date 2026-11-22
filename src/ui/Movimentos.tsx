import { useEffect, useMemo, useState } from 'react';
import { rt, useStore } from '../store';
import { ART_NOME, MOV_NOME, articulacoes, motores, movimentosPorArt, structsDoMusculo } from '../content';
import { COLORS } from '../engine/palette';
import { Icon } from './icons';
import { Sec } from './Ficha';
import { abrirChave } from './Search';
import { Animacao } from './Animacao';
import { movDe } from '../engine/rig';

const ORDEM = ['ombro', 'escapula', 'cotovelo', 'radioulnar', 'punho', 'dedos_mao', 'polegar', 'quadril', 'joelho', 'tornozelo', 'subtalar', 'dedos_pe', 'halux', 'cervical', 'tronco', 'costelas', 'pelve', 'atm'];

export function Movimentos() {
  const m = rt.m!;
  const mapa = useMemo(() => movimentosPorArt(), []);
  const arts = useMemo(() => ORDEM.filter((a) => mapa.has(a)), [mapa]);
  const [art, setArt] = useState<string | null>(null);
  const [mov, setMov] = useState<string | null>(null);
  const [animar, setAnimar] = useState(false);
  useEffect(() => { const f = (e: Event) => { const d = (e as CustomEvent).detail; setArt(d.art); setMov(d.mov); setAnimar(!!d.play && !!movDe(d.art, d.mov)); }; window.addEventListener('abrir-movimento', f); return () => window.removeEventListener('abrir-movimento', f); }, []);
  const lista = useMemo(() => (art && mov ? motores(art, mov) : []), [art, mov]);
  const adm = useMemo(() => (art && mov ? [...articulacoes.values()].filter((a) => a.art === art).flatMap((a) => (a.movimentos ?? []).filter((x) => x.mov === mov).map((x) => ({ a, x }))) : []), [art, mov]);

  useEffect(() => {
    if (!art || !mov || animar) return;
    const ids = new Map<number, string | null>();
    for (const x of [...lista].reverse()) for (const si of structsDoMusculo(x.m, m)) ids.set(si, x.papel === 'primario' ? COLORS.primario : COLORS.secundario);
    if (ids.size) useStore.getState().setFocus({ ids: [...ids], others: 'ghost', label: `${MOV_NOME[mov] ?? mov} · ${ART_NOME[art] ?? art}` });
  }, [art, mov, lista, m, animar]);

  if (art && mov && animar && movDe(art, mov)) return <Animacao art={art} mov={mov} onExit={() => setAnimar(false)} />;

  if (!art) return (
    <>
      <div className="phead"><div className="ttl"><h2>Movimentos</h2><div className="sub">Escolha a articulação e veja quem faz cada movimento</div></div><button className="iconbtn" onClick={() => useStore.getState().setPanel(false)} aria-label="Fechar"><Icon n="fechar" /></button></div>
      <div className="pbody"><div className="grid2">{arts.map((a) => <button key={a} className="tile" onClick={() => { setArt(a); setMov(null); }}><div className="t">{ART_NOME[a] ?? a}</div><div className="d">{mapa.get(a)!.filter((x) => x !== 'outro' && x !== 'estabilizacao').length} movimentos</div></button>)}</div></div>
    </>
  );
  const movs = mapa.get(art)!.filter((x) => x !== 'outro');
  return (
    <>
      <div className="phead"><button className="iconbtn" onClick={() => { setArt(null); setMov(null); useStore.getState().setFocus(null, false); }} aria-label="Voltar"><Icon n="voltar" /></button><div className="ttl"><h2>{ART_NOME[art] ?? art}</h2><div className="sub">{mov ? MOV_NOME[mov] : 'Escolha um movimento'}</div></div></div>
      <div className="pbody">
        <div className="tags">{movs.map((x) => <button key={x} className={'tag' + (mov === x ? ' p' : '')} style={{ padding: '8px 13px', fontSize: 13.5 }} onClick={() => setMov(x)}>{MOV_NOME[x] ?? x}{movDe(art, x) ? ' ▸' : ''}</button>)}</div>
        {mov && (
          <>
            {movDe(art, mov) && <button className="btn primary block" onClick={() => setAnimar(true)}><Icon n="play" size={17} />Ver o movimento em 3D</button>}
            {adm.map(({ a, x }, i) => (
              <div className="oiia" key={i}>
                <div className="kv"><div className="k">Amplitude normal</div><div className="v">{x.adm ?? '—'}<small>{a.pt}</small></div></div>
                <div className="kv"><div className="k">Plano / eixo</div><div className="v">{x.plano ?? '—'}<small>{x.eixo ? `eixo ${x.eixo}` : ''}</small></div></div>
                {x.nota && <div className="kv full"><div className="v small">{x.nota}</div></div>}
              </div>
            ))}
            <div className="legend"><span><i className="dot" style={{ background: COLORS.primario }} />Motor primário</span><span><i className="dot" style={{ background: COLORS.secundario }} />Auxiliar</span></div>
            {(['primario', 'secundario'] as const).map((papel) => { const l = lista.filter((x) => x.papel === papel); return l.length ? (
              <Sec key={papel} t={papel === 'primario' ? 'Motores primários' : 'Auxiliares'}>
                <div className="list">{l.map((x) => (
                  <button key={x.m.key} className="row" onClick={() => abrirChave(x.m.key)}>
                    <span className="dot" style={{ background: papel === 'primario' ? COLORS.primario : COLORS.secundario }} />
                    <div className="main"><div className="t">{x.m.pt}{x.parte ? ` — ${x.parte}` : ''}</div><div className="d">{x.m.inervacao?.nervo}{x.m.inervacao?.raizes ? ` (${x.m.inervacao.raizes})` : ''}</div>{x.nota && <div className="d">{x.nota}</div>}</div><Icon n="seta" size={15} />
                  </button>
                ))}</div>
              </Sec>
            ) : null; })}
          </>
        )}
        {!mov && [...articulacoes.values()].filter((a) => a.art === art).map((a) => <button key={a.key} className="row" onClick={() => { useStore.getState().setTab('explorar'); setTimeout(() => window.dispatchEvent(new CustomEvent('abrir-articulacao', { detail: a.key })), 30); }}><div className="main"><div className="t">{a.pt}</div><div className="d">Ficha da articulação: tipo, ADM, ligamentos, clínica</div></div><Icon n="seta" size={16} /></button>)}
      </div>
    </>
  );
}
