import { useEffect, useMemo, useRef, useState } from 'react';
import { rt, useStore } from '../store';
import { ART_NOME, articulacoes, motores, structsDoMusculo } from '../content';
import { MovPlayer, type BandaSpec } from '../engine/Movimento';
import { movDe, OPOSTO } from '../engine/rig';
import { COLORS } from '../engine/palette';
import { Icon } from './icons';
import { abrirChave } from './Search';

const COR_ANT = '#8b7cf6';
interface Comp { nome: string; papel: string; cor: string; pct: number }

/** Lado dos músculos que fazem o movimento, quando ele é para um lado só (para a esquerda). */
function ladoDe(mov: string, antagonista: boolean): 'l' | 'r' | undefined {
  if (mov === 'rotacao_ipsilateral' || mov === 'flexao_lateral' || mov === 'lateralidade') return antagonista ? 'r' : 'l';
  if (mov === 'rotacao_contralateral') return antagonista ? 'l' : 'r';
  return undefined;
}

export function Animacao({ art, mov, onExit }: { art: string; mov: string; onExit: () => void }) {
  const m = rt.m!;
  const def = movDe(art, mov)!;
  const player = useRef<MovPlayer | null>(null);
  const [a, setA] = useState(def.de);
  const [comp, setComp] = useState<Comp[]>([]);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [ant, setAnt] = useState(false);
  const chaves = useRef(new Map<string, string>());

  const adm = useMemo(() => {
    for (const j of articulacoes.values()) {
      if (j.art !== art) continue;
      const x = j.movimentos?.find((y) => y.mov === mov);
      if (x?.adm) return x.adm;
    }
    return null;
  }, [art, mov]);

  useEffect(() => {
    const e = rt.engine!;
    useStore.getState().fixar(null);
    useStore.setState({ focus: null, sel: null, pin: null, clip: null, colorMode: 'normal', showIns: false, boneMap: false });
    const specs: BandaSpec[] = [];
    const ag = motores(art, mov).slice(0, 9);
    for (const x of ag) {
      const sis = structsDoMusculo(x.m, m); if (!sis.length) continue;
      chaves.current.set(x.m.pt, x.m.key);
      specs.push({ nome: x.m.pt, cor: x.papel === 'primario' ? COLORS.primario : COLORS.secundario, sis, papel: x.papel === 'primario' ? 'agonista' : 'auxiliar', lado: ladoDe(mov, false) });
    }
    const op = OPOSTO[mov];
    if (op) for (const x of motores(art, op).filter((y) => y.papel === 'primario').slice(0, 6)) {
      const sis = structsDoMusculo(x.m, m); if (!sis.length || ag.some((g) => g.m.key === x.m.key)) continue;
      chaves.current.set(x.m.pt, x.m.key);
      specs.push({ nome: x.m.pt, cor: COR_ANT, sis, papel: 'antagonista', lado: ladoDe(mov, true) });
    }
    void e.loadFile('skeleton');
    const p = new MovPlayer(e, def, specs);
    let ultimo = 0;
    p.onChange = (v, c) => { const now = performance.now(); if (now - ultimo < 90) return; ultimo = now; setA(v); setComp(c); };
    player.current = p;
    e.mov = p;
    e.apply();
    p.enquadrar();
    useStore.getState().atividade(1);
    return () => { p.dispose(); if (e.mov === p) e.mov = null; e.apply(); };
  }, [art, mov]);

  const lo = Math.min(def.de, def.ate), hi = Math.max(def.de, def.ate);
  const un = def.unidade ?? '°';
  const valor = art === 'costelas' ? `${Math.round(a * 100)}%` : `${Math.round(Math.abs(a - (def.zero ?? 0)))}${un}`;
  const desc = (c: Comp) => (c.pct <= -2 ? `encurta ${-c.pct}%` : c.pct >= 2 ? `alonga ${c.pct}%` : 'comprimento quase igual');
  const grupos: [string, string, Comp[]][] = [
    ['Motores primários', COLORS.primario, comp.filter((c) => c.papel === 'agonista')],
    ['Auxiliares', COLORS.secundario, comp.filter((c) => c.papel === 'auxiliar')],
    ...(ant ? [['Antagonistas (alongam)', COR_ANT, comp.filter((c) => c.papel === 'antagonista')] as [string, string, Comp[]]] : []),
  ];

  return (
    <>
      <div className="phead"><button className="iconbtn" onClick={onExit} aria-label="Voltar"><Icon n="voltar" /></button>
        <div className="ttl"><h2>{def.nome}</h2><div className="sub">{ART_NOME[art] ?? art}{adm ? ` · ADM de referência ${adm}` : ''}</div></div></div>
      <div className="pbody">
        <div className="mov-angulo"><b>{valor}</b><span>{art === 'costelas' ? 'da inspiração' : 'no goniômetro'}</span></div>
        <div className="actions" style={{ alignItems: 'center' }}>
          <button className="btn primary" style={{ minWidth: 118 }} onClick={() => { const p = player.current!; p.setPlaying(!playing); setPlaying(!playing); }}><Icon n={playing ? 'pausa' : 'play'} size={16} />{playing ? 'Pausar' : 'Animar'}</button>
          <div className="seg">{[0.5, 1, 2].map((s) => <button key={s} className={speed === s ? 'on' : ''} onClick={() => { setSpeed(s); player.current!.speed = s; }}>{s === 0.5 ? 'Lento' : s === 1 ? '1×' : '2×'}</button>)}</div>
        </div>
        <input type="range" id="mov-angulo" min={lo} max={hi} step={hi - lo > 5 ? 1 : 0.02} value={a} aria-label="Ângulo"
          onChange={(ev) => { const v = +ev.target.value; setA(v); setPlaying(false); player.current!.setParam(v); }} />
        <div className="legend">
          <span><i className="dot" style={{ background: COLORS.primario }} />motor primário</span>
          <span><i className="dot" style={{ background: COLORS.secundario }} />auxiliar</span>
          <span><i className="dot" style={{ background: 'var(--origin)' }} />origem</span>
          <span><i className="dot" style={{ background: 'var(--insertion)' }} />inserção</span>
        </div>
        <button className={'btn block' + (ant ? ' on' : '')} onClick={() => { setAnt(!ant); player.current!.setAntagonistas(!ant); }}><i className="dot" style={{ background: COR_ANT }} />{ant ? 'Esconder antagonistas' : 'Mostrar antagonistas'}</button>
        {def.nota && <div className="tip"><b>Repare · </b>{def.nota}</div>}
        {grupos.map(([t, cor, l]) => l.length > 0 && (
          <div className="sec" key={t}><h3>{t}</h3>
            <div className="list">{l.map((c) => (
              <button key={c.nome + c.papel} className="row compact" onClick={() => { const k = chaves.current.get(c.nome); if (k) { onExit(); setTimeout(() => abrirChave(k), 30); } }}>
                <span className="dot" style={{ background: cor }} />
                <div className="main"><div className="t">{c.nome}</div><div className="d">{desc(c)}</div></div>
                <Icon n="seta" size={15} />
              </button>
            ))}</div>
          </div>
        ))}
        {comp.length === 0 && <p className="small muted">Os músculos deste movimento não têm origem e inserção marcadas no modelo; o movimento dos ossos aparece normalmente.</p>}
        <p className="small muted">O elástico liga o centro da origem ao centro da inserção: quando ele encurta, o músculo está trabalhando em contração concêntrica nesse movimento. Os ossos se movem como peças rígidas; o deslizamento e o rolamento das superfícies articulares foram simplificados.</p>
      </div>
    </>
  );
}
