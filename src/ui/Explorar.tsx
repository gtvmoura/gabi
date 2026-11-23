import { useEffect, useMemo, useRef, useState } from 'react';
import { rt, useStore } from '../store';
import { MOV_NOME, articulacoes, ligamentos, motores, nomePt, resolver, type Articulacao } from '../content';
import { REGIOES, structsDaRegiao } from '../lib/regioes';
import { PECAS, SISTEMAS, estruturasDaPeca, estruturasDoSistema, type Contexto, type SistemaId } from '../lib/sistemas';
import { catNome } from '../lib/search';
import { Icon } from './icons';
import { movDe } from '../engine/rig';
import { Prose, Sec } from './Ficha';
import { abrirChave } from './Search';


function Ramo({ g, depth, manter }: { g: string; depth: number; manter?: boolean }) {
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
          {kids.slice().sort((a, b) => nomePt(a, m).localeCompare(nomePt(b, m))).map((k) => <Ramo key={k} g={k} depth={depth + 1} manter={manter} />)}
          <div className="list" style={{ marginLeft: 12, marginBottom: 6 }}>
            {structs.slice().sort((a, b) => nomePt(m.structs[a].k, m).localeCompare(nomePt(m.structs[b].k, m))).map((si) => (
              <button key={si} className="row compact" style={{ background: 'none' }} onClick={() => { const st = useStore.getState(); if (!manter) st.setFocus(null, false); st.select({ si, side: 'both' }, { keepTab: !!manter }); }}>
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


const CONTEXTOS: [Contexto, string][] = [['hide', 'Só isso'], ['ossos', 'Com esqueleto'], ['ghost', 'Corpo translúcido']];

/** Aplica o isolamento e (opcionalmente) fixa a câmera no centro do conjunto. */
function mostrar(sis: number[], label: string, contexto: Contexto, fixar: boolean, umLado = false) {
  const st = useStore.getState();
  st.setFocus({ ids: sis.map((si) => [si, null]), others: contexto, label }, false);
  if (fixar) st.fixar({ label, sis, umLado, lado: umLado ? 'l' : 'both' }, 'anterior');
  else { st.fixar(null); const e = rt.engine!; e.ensureStructs(sis).then(() => { const sp = e.sphereOf(sis); if (sp) e.frame(sp, { pad: 1.2, view: 'anterior' }); }); }
}

function SistemaView({ id, onBack }: { id: SistemaId; onBack: () => void }) {
  const m = rt.m!;
  const [sel, setSel] = useState<SistemaId[]>([id]);
  const [ctx, setCtx] = useState<Contexto>(id === 'esqueletico' ? 'hide' : 'ossos');
  const [querFixo, setQuerFixo] = useState(true);
  const fixo = useStore((s) => !!s.fixo);
  const focoAtual = useStore((s) => s.focus);
  const aplicado = useRef(false);
  const principal = SISTEMAS.find((x) => x.id === id)!;
  const sis = useMemo(() => [...new Set(sel.flatMap((x) => estruturasDoSistema(m, x)))], [sel, m]);
  const label = sel.map((x) => SISTEMAS.find((y) => y.id === x)!.nome).join(' + ');
  useEffect(() => { mostrar(sis, label, ctx, querFixo); aplicado.current = true; }, [sis, ctx, querFixo]);
  // se o isolamento foi desfeito por fora (pelo ✕ no topo), volta para a lista de sistemas
  useEffect(() => { if (aplicado.current && !focoAtual && !useStore.getState().focus) onBack(); }, [focoAtual]);
  return (
    <>
      <div className="phead"><button className="iconbtn" onClick={onBack} aria-label="Voltar"><Icon n="voltar" /></button>
        <div className="ttl"><h2><i className="dot big" style={{ background: principal.cor }} />Sistema {principal.nome.toLowerCase()}</h2><div className="sub">{sis.length} estruturas no 3D</div></div></div>
      <div className="pbody">
        <p className="lead">{principal.resumo}</p>
        {principal.aviso && <div className="tip"><b>Atenção · </b>{principal.aviso}</div>}
        <div className="sec"><h3>O que mostrar junto</h3>
          <div className="seg wide">{CONTEXTOS.map(([v, n]) => <button key={v} className={ctx === v ? 'on' : ''} onClick={() => setCtx(v)}>{n}</button>)}</div>
        </div>
        <button className={'btn block' + (fixo ? ' on' : '')} onClick={() => { if (fixo) { setQuerFixo(false); useStore.getState().fixar(null); } else { setQuerFixo(true); mostrar(sis, label, ctx, true); } }}><Icon n="alvo" size={16} />{fixo ? 'Centralizado: gira em volta do sistema' : 'Centralizar no meio da tela'}</button>
        <div className="sec"><h3>Combinar com outro sistema</h3>
          <div className="tags">{SISTEMAS.filter((x) => x.id !== id).map((x) => { const on = sel.includes(x.id); return (
            <button key={x.id} className={'tag' + (on ? ' p' : '')} onClick={() => setSel(on ? sel.filter((y) => y !== x.id) : [...sel, x.id])}><i className="dot" style={{ background: x.cor }} />{x.nome}</button>
          ); })}</div>
        </div>
        <div className="sec"><h3>Funções</h3><ul className="lista">{principal.funcoes.map((f) => <li key={f}>{f}</li>)}</ul></div>
        <div className="sec"><h3>Na fisioterapia</h3><p>{principal.fisio}</p></div>
        <div className="sec"><h3>Partes do sistema</h3>
          <p className="small muted" style={{ marginBottom: 8 }}>Toque numa estrutura para abrir a ficha; o sistema continua isolado.</p>
          {principal.raizes.map((g) => (m.groups[g] ? <Ramo key={g} g={g} depth={0} manter /> : null))}
        </div>
      </div>
    </>
  );
}

function Pecas() {
  const m = rt.m!;
  const [ativa, setAtiva] = useState<string | null>(null);
  const [ctx, setCtx] = useState<Contexto>('hide');
  const fixoAtual = useStore((s) => s.fixo);
  const abrir = (id: string, c?: Contexto) => {
    const p = PECAS.find((x) => x.id === id)!;
    const contexto = c ?? p.contexto;
    setAtiva(id); setCtx(contexto);
    // peças dos membros: um lado só (o esquerdo), para a peça ficar inteira no centro
    useStore.setState({ side: p.umLado ? 'l' : 'both' });
    mostrar(estruturasDaPeca(m, p), p.nome, contexto, true, !!p.umLado);
  };
  useEffect(() => { if (!fixoAtual) setAtiva(null); }, [fixoAtual]);
  const grupos = [...new Set(PECAS.map((p) => p.grupo))];
  const p = PECAS.find((x) => x.id === ativa);
  return (
    <>
      {p && (
        <div className="peca-ativa">
          <div><b>{p.nome}</b> <span className="muted small">no centro da tela · gire com um dedo, aproxime com dois</span></div>
          <div className="seg wide">{CONTEXTOS.map(([v, n]) => <button key={v} className={ctx === v ? 'on' : ''} onClick={() => abrir(p.id, v)}>{n}</button>)}</div>
          <button className="btn block" onClick={() => { useStore.getState().fixar(null); useStore.getState().setFocus(null, false); useStore.setState({ side: 'both' }); rt.engine?.home(); setAtiva(null); }}><Icon n="fechar" size={15} />Voltar ao corpo inteiro</button>
        </div>
      )}
      {grupos.map((g) => (
        <div className="sec" key={g}><h3>{g}</h3>
          <div className="grid2">{PECAS.filter((x) => x.grupo === g).map((x) => (
            <button key={x.id} className={'tile' + (ativa === x.id ? ' on' : '')} onClick={() => abrir(x.id)}><div className="t">{x.nome}</div><div className="d">{x.desc}</div></button>
          ))}</div>
        </div>
      ))}
    </>
  );
}

type Sub = 'sistemas' | 'pecas' | 'regioes' | 'articulacoes';

export function Explorar() {
  const m = rt.m!;
  const [sub, setSub] = useState<Sub>('sistemas');
  const [art, setArt] = useState<string | null>(null);
  const [sis, setSis] = useState<SistemaId | null>(null);
  useEffect(() => {
    const f = (e: Event) => { setArt((e as CustomEvent).detail); };
    window.addEventListener('abrir-articulacao', f);
    return () => window.removeEventListener('abrir-articulacao', f);
  }, []);
  const arts = useMemo(() => [...articulacoes.values()].sort((a, b) => a.pt.localeCompare(b.pt)), []);
  const contagem = useMemo(() => new Map(SISTEMAS.map((x) => [x.id, estruturasDoSistema(m, x.id).length])), [m]);
  if (art && articulacoes.get(art)) return <ArticulacaoView a={articulacoes.get(art)!} onBack={() => setArt(null)} />;
  if (sis) return <SistemaView id={sis} onBack={() => { setSis(null); useStore.getState().fixar(null); useStore.getState().setFocus(null, false); rt.engine?.home(); }} />;

  return (
    <>
      <div className="phead"><div className="ttl"><h2>Explorar</h2><div className="sub">{m.structs.length.toLocaleString('pt-BR')} estruturas no atlas</div></div><button className="iconbtn" onClick={() => useStore.getState().setPanel(false)} aria-label="Fechar"><Icon n="fechar" /></button></div>
      <div className="pbody">
        <div className="subtabs">
          {([['sistemas', 'Sistemas'], ['pecas', 'Peças'], ['regioes', 'Regiões'], ['articulacoes', 'Articulações']] as const).map(([id, n]) => <button key={id} className={sub === id ? 'on' : ''} onClick={() => setSub(id)}>{n}</button>)}
        </div>
        {sub === 'sistemas' && (
          <>
            <p className="small muted">Escolha um sistema para vê-lo isolado e centralizado. Dentro dele, dá para combinar com outros.</p>
            <div className="grid2">{SISTEMAS.map((x) => (
              <button key={x.id} className="tile sistema" style={{ ['--cor' as string]: x.cor }} onClick={() => setSis(x.id)}>
                <div className="t"><i className="dot" style={{ background: x.cor }} />{x.nome}</div>
                <div className="d clamp2">{x.resumo}</div>
                <div className="d">{contagem.get(x.id)} estruturas</div>
              </button>
            ))}</div>
          </>
        )}
        {sub === 'pecas' && <><p className="small muted">A peça escolhida fica sozinha e fixa no centro da tela: a rotação gira em volta dela.</p><Pecas /></>}
        {sub === 'regioes' && (
          <>
            <div className="grid2">
              {REGIOES.map((r) => (
                <button key={r.id} className="tile" onClick={() => {
                  const sis2 = structsDaRegiao(r, m);
                  const st = useStore.getState();
                  st.setFocus({ ids: sis2.map((si) => [si, null] as [number, null]), others: 'hide', label: r.nome, respectLayers: true }, false);
                  const side = st.side;
                  const lado = side === 'both' ? 0 : side === 'r' ? -1 : 1;
                  const cx = lado === 0 ? 0 : ((r.box[0] + r.box[1]) / 2) * lado;
                  const raio = Math.max((r.box[3] - r.box[2]) / 2, lado === 0 ? r.box[1] : (r.box[1] - r.box[0]) / 2);
                  st.fixar(null);
                  rt.engine!.frameAt([cx, (r.box[2] + r.box[3]) / 2, 0], raio, r.view ?? 'anterior');
                }}>
                  <div className="t">{r.nome}</div><div className="d">{r.desc}</div>
                </button>
              ))}
            </div>
            <p className="small muted">A região fica isolada; ligue outras camadas (nervos, ligamentos, vasos) na faixa do topo para ver tudo o que passa por ali. Toque no ✕ do filtro, no topo, para voltar ao corpo inteiro.</p>
          </>
        )}
        {sub === 'articulacoes' && (
          <div className="list">
            {arts.map((a) => <button key={a.key} className="row" onClick={() => setArt(a.key)}><div className="main"><div className="t">{a.pt}</div><div className="d">{a.tipo}</div></div><Icon n="seta" size={16} /></button>)}
          </div>
        )}
      </div>
    </>
  );
}
