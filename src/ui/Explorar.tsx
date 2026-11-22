import { useEffect, useMemo, useState } from 'react';
import { rt, useStore } from '../store';
import { MOV_NOME, articulacoes, ligamentos, motores, nomePt, resolver, type Articulacao } from '../content';
import { REGIOES, structsDaRegiao } from '../lib/regioes';
import { catNome } from '../lib/search';
import { Icon } from './icons';
import { movDe } from '../engine/rig';
import { Prose, Sec } from './Ficha';
import { abrirChave } from './Search';

const SIS: [string, string][] = [
  ['Skeletal system', 'Esqueleto'], ['Muscular system', 'Músculos'], ['Joints', 'Articulações'], ['Nervous system & Sense organs', 'Sistema nervoso'],
  ['Arterial system', 'Artérias'], ['Venous system', 'Veias'], ['Visceral systems', 'Órgãos'], ['Lymphoid organs', 'Linfático'], ['Regions of human body', 'Regiões'], ['Fasciae', 'Fáscias'],
];

function Ramo({ g, depth }: { g: string; depth: number }) {
  const m = rt.m!;
  const [open, setOpen] = useState(false);
  const kids = m.childrenOf.get(g) ?? [];
  const structs = m.structsOf.get(g) ?? [];
  const total = useMemo(() => resolver(g, m).length, [g, m]);
  if (!total) return null;
  return (
    <div style={{ marginLeft: depth ? 12 : 0 }}>
      <div className="row compact" style={{ marginBottom: 4 }}>
        <button className="main" style={{ textAlign: 'left' }} onClick={() => setOpen(!open)}><div className="t">{nomePt(g, m)}</div></button>
        <span className="end">{total}</span>
        <button className="iconbtn" style={{ width: 30, height: 30 }} aria-label="Destacar no 3D" onClick={() => { const a = articulacoes.get(g); if (a) window.dispatchEvent(new CustomEvent('abrir-articulacao', { detail: g })); else abrirChave(g); }}><Icon n="isolar" size={15} /></button>
        <button onClick={() => setOpen(!open)} style={{ transform: open ? 'rotate(90deg)' : '', color: 'var(--dim)' }} aria-label="Abrir"><Icon n="seta" size={16} /></button>
      </div>
      {open && (
        <>
          {kids.slice().sort((a, b) => nomePt(a, m).localeCompare(nomePt(b, m))).map((k) => <Ramo key={k} g={k} depth={depth + 1} />)}
          <div className="list" style={{ marginLeft: 12, marginBottom: 6 }}>
            {structs.slice().sort((a, b) => nomePt(m.structs[a].k, m).localeCompare(nomePt(m.structs[b].k, m))).map((si) => (
              <button key={si} className="row compact" style={{ background: 'none' }} onClick={() => { useStore.getState().setFocus(null, false); useStore.getState().select({ si, side: 'both' }); }}>
                <div className="main"><div className="t" style={{ fontWeight: 500 }}>{nomePt(m.structs[si].k, m)}</div></div><span className="end">{catNome(m.structs[si].c)}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function ArticulacaoView({ a, onBack }: { a: Articulacao; onBack: () => void }) {
  const m = rt.m!;
  const ligs = useMemo(() => resolver(a.key, m).map((si) => m.structs[si].k), [a, m]);
  const destacar = () => {
    const ids = new Map<number, string | null>();
    for (const si of resolver(a.key, m)) ids.set(si, null);
    // ossos vizinhos: os que recebem os ligamentos ficam visíveis pelo foco "keep"
    const st = useStore.getState();
    if (st.layers.ligamentos === 0) st.setLayer('ligamentos', 1);
    st.setFocus({ ids: [...ids], others: 'keep', label: a.pt });
    const prev = useStore.getState().layers;
    if (prev.musculos === 1) st.setLayer('musculos', 2);
  };
  return (
    <>
      <div className="phead"><button className="iconbtn" onClick={onBack} aria-label="Voltar"><Icon n="voltar" /></button><div className="ttl"><h2>{a.pt}</h2><div className="sub">{a.tipo}{a.graus ? ` · ${a.graus} grau${a.graus > 1 ? 's' : ''} de liberdade` : ''}</div></div></div>
      <div className="pbody">
        <div className="actions"><button className="btn primary" onClick={destacar}><Icon n="isolar" size={16} />Ver ligamentos no 3D</button></div>
        {a.resumo && <p className="lead">{a.resumo}</p>}
        {a.superficies && <Sec t="Superfícies articulares"><Prose t={a.superficies} /></Sec>}
        {a.movimentos && a.movimentos.length > 0 && (
          <Sec t="Movimentos e amplitude (ADM)">
            <table className="t"><thead><tr><th>Movimento</th><th>ADM</th><th>Plano / eixo</th></tr></thead><tbody>
              {a.movimentos.map((mv, i) => (
                <tr key={i}><td>{MOV_NOME[mv.mov] ?? mv.mov}</td><td>{mv.adm ?? '—'}</td><td>{[mv.plano, mv.eixo].filter(Boolean).join(' / ')}{mv.nota && <div className="small muted">{mv.nota}</div>}
                  {a.art && motores(a.art, mv.mov).length > 0 && <div className="small" style={{ marginTop: 3 }}><button style={{ color: 'var(--accent-2)', fontWeight: 600 }} onClick={() => { useStore.getState().setTab('movimentos'); setTimeout(() => window.dispatchEvent(new CustomEvent('abrir-movimento', { detail: { art: a.art, mov: mv.mov } })), 30); }}>ver músculos ›</button></div>}
                  {a.art && movDe(a.art, mv.mov) && <div className="small" style={{ marginTop: 3 }}><button style={{ color: '#ffe066', fontWeight: 600 }} onClick={() => { useStore.getState().setTab('movimentos'); setTimeout(() => window.dispatchEvent(new CustomEvent('abrir-movimento', { detail: { art: a.art, mov: mv.mov, play: true } })), 30); }}>▶ ver o movimento</button></div>}</td></tr>
              ))}
            </tbody></table>
          </Sec>
        )}
        <div className="oiia">
          {a.posicaoRepouso && <div className="kv"><div className="k">Posição de repouso</div><div className="v">{a.posicaoRepouso}</div></div>}
          {a.posicaoFechada && <div className="kv"><div className="k">Posição fechada</div><div className="v">{a.posicaoFechada}</div></div>}
          {a.padraoCapsular && <div className="kv full"><div className="k">Padrão capsular</div><div className="v">{a.padraoCapsular}</div></div>}
          {a.sensacaoFinal && <div className="kv full"><div className="k">Sensação final</div><div className="v">{a.sensacaoFinal}</div></div>}
        </div>
        {a.estabilidade && <Sec t="Estabilidade"><Prose t={a.estabilidade} /></Sec>}
        {a.clinica && <Sec t="Clínica" ico="clinica"><Prose t={a.clinica} /></Sec>}
        {ligs.length > 0 && (
          <Sec t={`Ligamentos e estruturas (${ligs.length})`}>
            <div className="list">{ligs.map((k) => { const l = ligamentos.get(k); return (
              <button key={k} className="row compact" onClick={() => abrirChave(k)}><div className="main"><div className="t">{l?.pt ?? nomePt(k, m)}</div>{l?.funcao && <div className="d clamp2">{l.funcao}</div>}</div><Icon n="seta" size={15} /></button>
            ); })}</div>
          </Sec>
        )}
      </div>
    </>
  );
}

export function Explorar() {
  const m = rt.m!;
  const [sub, setSub] = useState<'regioes' | 'sistemas' | 'articulacoes'>('regioes');
  const [art, setArt] = useState<string | null>(null);
  useEffect(() => {
    const f = (e: Event) => { setArt((e as CustomEvent).detail); };
    window.addEventListener('abrir-articulacao', f);
    return () => window.removeEventListener('abrir-articulacao', f);
  }, []);
  const arts = useMemo(() => [...articulacoes.values()].sort((a, b) => a.pt.localeCompare(b.pt)), []);
  if (art && articulacoes.get(art)) return <ArticulacaoView a={articulacoes.get(art)!} onBack={() => setArt(null)} />;

  return (
    <>
      <div className="phead"><div className="ttl"><h2>Explorar</h2><div className="sub">{m.structs.length.toLocaleString('pt-BR')} estruturas no atlas</div></div><button className="iconbtn" onClick={() => useStore.getState().setPanel(false)} aria-label="Fechar"><Icon n="fechar" /></button></div>
      <div className="pbody">
        <div className="subtabs">
          {([['regioes', 'Regiões'], ['sistemas', 'Sistemas'], ['articulacoes', 'Articulações']] as const).map(([id, n]) => <button key={id} className={sub === id ? 'on' : ''} onClick={() => setSub(id)}>{n}</button>)}
        </div>
        {sub === 'regioes' && (
          <>
            <div className="grid2">
              {REGIOES.map((r) => (
                <button key={r.id} className="tile" onClick={() => {
                  const ids = structsDaRegiao(r, m).map((si) => [si, null] as [number, null]);
                  useStore.getState().setFocus({ ids, others: 'hide', label: r.nome, respectLayers: true }, false);
                  const e = rt.engine!; const side = useStore.getState().side;
                  const lado = side === 'both' ? 0 : side === 'r' ? -1 : 1;
                  const cx = lado === 0 ? 0 : ((r.box[0] + r.box[1]) / 2) * lado;
                  const raio = Math.max((r.box[3] - r.box[2]) / 2, lado === 0 ? r.box[1] : (r.box[1] - r.box[0]) / 2);
                  e.frameAt([cx, (r.box[2] + r.box[3]) / 2, 0], raio, r.view ?? 'anterior');
                }}>
                  <div className="t">{r.nome}</div><div className="d">{r.desc}</div>
                </button>
              ))}
            </div>
            <p className="small muted">A região fica isolada; ligue outras camadas (nervos, ligamentos, vasos) no botão de camadas para ver tudo o que passa por ali. Toque no ✕ do filtro, no topo, para voltar ao corpo inteiro.</p>
          </>
        )}
        {sub === 'sistemas' && <div>{SIS.map(([g]) => (m.groups[g] ? <Ramo key={g} g={g} depth={0} /> : null))}</div>}
        {sub === 'articulacoes' && (
          <div className="list">
            {arts.map((a) => <button key={a.key} className="row" onClick={() => setArt(a.key)}><div className="main"><div className="t">{a.pt}</div><div className="d">{a.tipo}</div></div><Icon n="seta" size={16} /></button>)}
          </div>
        )}
      </div>
    </>
  );
}
