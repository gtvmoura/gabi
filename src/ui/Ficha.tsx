import { useEffect, useMemo, useState } from 'react';
import { rt, useStore } from '../store';
import { ART_NOME, MOV_NOME, acidente, articulacoes, infoDe, musculos, nomePt, resolver, structsDoMusculo, testes, type Acao, type Info, type Musculo } from '../content';
import { groupChain } from '../data/manifest';
import { catNome } from '../lib/search';
import { paragraphs } from '../lib/text';
import { Icon } from './icons';
import { abrirChave } from './Search';

let wikiCache: Promise<Record<string, string>> | null = null;
const wiki = () => wikiCache ?? (wikiCache = fetch(`${import.meta.env.BASE_URL}data/wiki-en.json`).then((r) => r.json()).catch(() => ({})));

export function Sec({ t, children, ico }: { t: string; children: React.ReactNode; ico?: string }) {
  return <div className="sec"><h3>{ico && <Icon n={ico} size={14} />}{t}</h3>{children}</div>;
}
export function Prose({ t }: { t?: string }) {
  return <>{paragraphs(t).map((p, i) => <p key={i}>{p}</p>)}</>;
}
export function ChaveTags({ keys, cls }: { keys: string[]; cls?: string }) {
  const m = rt.m!;
  const ok = keys.filter((k) => resolver(k, m).length);
  if (!ok.length) return null;
  return <div className="tags">{ok.map((k) => <button key={k} className={'tag ' + (cls ?? '')} onClick={() => abrirChave(k)}>{nomePt(k, m)}</button>)}</div>;
}

function Acoes({ acoes }: { acoes: Acao[] }) {
  const by = new Map<string, Acao[]>();
  for (const a of acoes) { if (!by.has(a.art)) by.set(a.art, []); by.get(a.art)!.push(a); }
  return (
    <div className="list">
      {[...by].map(([art, as]) => (
        <div key={art}>
          <div className="small muted" style={{ marginBottom: 4 }}>{ART_NOME[art] ?? art}</div>
          <div className="tags">
            {as.map((a, i) => <span key={i} className={'tag ' + (a.papel === 'primario' ? 'p' : 's')} title={a.nota}>{MOV_NOME[a.mov] ?? a.mov}{a.papel === 'secundario' ? ' (auxiliar)' : ''}</span>)}
          </div>
          {as.filter((a) => a.nota).map((a, i) => <div key={i} className="small muted" style={{ marginTop: 4 }}>{MOV_NOME[a.mov] ?? a.mov}: {a.nota}</div>)}
        </div>
      ))}
    </div>
  );
}

function FichaMusculo({ d, parteKey }: { d: Musculo; parteKey?: string }) {
  const m = rt.m!;
  const parte = d.partes?.find((p) => p.key === parteKey);
  const tests = useMemo(() => { const ks = new Set([d.key, ...(d.partes ?? []).map((p) => p.key)]); return testes.filter((t) => t.estruturas?.some((k) => ks.has(k))); }, [d]);
  return (
    <>
      {d.resumo && <p className="lead">{d.resumo}</p>}
      <div className="oiia">
        <div className="kv o full"><div className="k"><span className="dot" style={{ background: 'var(--origin)' }} />Origem</div><div className="v">{d.origem ?? '—'}</div></div>
        <div className="kv i full"><div className="k"><span className="dot" style={{ background: 'var(--insertion)' }} />Inserção</div><div className="v">{d.insercao ?? '—'}</div></div>
        <div className="kv n"><div className="k">Inervação</div><div className="v">{d.inervacao?.nervo ?? '—'}{d.inervacao?.raizes && <small>Raízes: {d.inervacao.raizes}</small>}</div></div>
        <div className="kv"><div className="k">Vascularização</div><div className="v">{d.vascularizacao ?? '—'}</div></div>
      </div>
      {d.inervacao?.nervoKeys && <ChaveTags keys={d.inervacao.nervoKeys} />}
      {d.acoes && d.acoes.length > 0 && <Sec t="Ações"><Acoes acoes={d.acoes} /></Sec>}
      {d.partes && d.partes.length > 0 && (
        <Sec t="Partes">
          <div className="list">
            {d.partes.map((p) => (
              <button key={p.key} className={'row' + (p.key === parteKey ? ' on' : '')} onClick={() => { const si = m.byKey.get(p.key); if (si !== undefined) useStore.getState().select({ si, side: useStore.getState().sel?.side ?? 'both' }, { keepTab: true }); }}>
                <div className="main">
                  <div className="t">{p.pt}</div>
                  {p.origem && <div className="d"><b>O:</b> {p.origem}</div>}
                  {p.insercao && <div className="d"><b>I:</b> {p.insercao}</div>}
                  {p.inervacao && <div className="d"><b>N:</b> {p.inervacao.nervo}{p.inervacao.raizes ? ` (${p.inervacao.raizes})` : ''}</div>}
                  {p.nota && <div className="d">{p.nota}</div>}
                </div>
              </button>
            ))}
          </div>
          {parte?.acoes && <div style={{ marginTop: 8 }}><Acoes acoes={parte.acoes} /></div>}
        </Sec>
      )}
      {d.funcao && <Sec t="Função"><Prose t={d.funcao} /></Sec>}
      {d.dica && <div className="tip"><b>Macete · </b>{d.dica}</div>}
      {d.palpacao && <Sec t="Palpação"><Prose t={d.palpacao} /></Sec>}
      {d.teste && <Sec t="Prova de função muscular"><Prose t={d.teste} /></Sec>}
      {d.alongamento && <Sec t="Alongamento"><Prose t={d.alongamento} /></Sec>}
      {d.clinica && <Sec t="Clínica" ico="clinica"><Prose t={d.clinica} /></Sec>}
      {tests.length > 0 && <Sec t="Testes clínicos relacionados"><div className="tags">{tests.map((t) => <button key={t.id} className="tag" onClick={() => { useStore.setState({ sel: null }); useStore.getState().setTab('clinica'); setTimeout(() => window.dispatchEvent(new CustomEvent('abrir-teste', { detail: t.id })), 30); }}>{t.nome}</button>)}</div></Sec>}
      {d.sinergistas && d.sinergistas.length > 0 && <Sec t="Sinergistas"><ChaveTags keys={d.sinergistas} /></Sec>}
      {d.antagonistas && d.antagonistas.length > 0 && <Sec t="Antagonistas"><ChaveTags keys={d.antagonistas} /></Sec>}
      {d.sinonimos && d.sinonimos.length > 0 && <div className="small muted">Também chamado de: {d.sinonimos.join(', ')}</div>}
    </>
  );
}

function Inseridos({ si }: { si: number }) {
  const m = rt.m!;
  const side = useStore((s) => s.sel?.side);
  const list = useMemo(() => {
    const seen = new Map<string, { nome: string; t: 'o' | 'e'; si: number }>();
    for (const r of m.insByBone.get(si) ?? []) {
      const msi = r.ms[0]; if (msi === undefined) continue;
      const info = infoDe(m.structs[msi].k, m);
      const nome = r.ms.length > 1 && info?.tipo === 'musculo' ? info.d.pt : nomePt(m.structs[msi].k, m);
      const id = nome + r.t;
      if (!seen.has(id)) seen.set(id, { nome, t: r.t, si: msi });
    }
    return [...seen.values()].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [si, m]);
  if (!list.length) return null;
  const go = (x: { si: number }) => useStore.getState().select({ si: x.si, side: side ?? 'both' });
  return (
    <Sec t="Músculos que se fixam aqui">
      <div className="legend" style={{ marginBottom: 6 }}><span><i className="dot" style={{ background: 'var(--origin)' }} />origem</span><span><i className="dot" style={{ background: 'var(--insertion)' }} />inserção</span></div>
      <div className="tags">{list.map((x, i) => <button key={i} className={'tag ' + (x.t === 'o' ? 'o' : 'i')} onClick={() => go(x)}><i className="dot" style={{ background: x.t === 'o' ? 'var(--origin)' : 'var(--insertion)' }} />{x.nome}</button>)}</div>
    </Sec>
  );
}

function Acidentes({ si, boneKey }: { si: number; boneKey: string }) {
  const m = rt.m!;
  const sel = useStore((s) => s.sel)!;
  const pin = useStore((s) => s.pin);
  const lms = useMemo(() => {
    const st = m.structs[si];
    const ids = Object.entries(st.m).filter(([d]) => sel.side === 'both' || d === 'c' || d === sel.side).map(([, id]) => id);
    const first = ids[0];
    return (m.lmByStruct.get(si) ?? []).filter((l) => l.on === first).map((l) => ({ l, a: acidente(boneKey, l.k) })).sort((a, b) => (a.a?.pt ?? a.l.k).localeCompare(b.a?.pt ?? b.l.k));
  }, [si, sel.side, boneKey, m]);
  if (!lms.length) return null;
  return (
    <Sec t={`Acidentes ósseos (${lms.length})`} ico="pino">
      <div className="list">
        {lms.map(({ l, a }) => {
          const id = l.on + '|' + l.k;
          return (
            <button key={id} className={'row compact' + (pin === id ? ' on' : '')} onClick={() => { useStore.getState().setPin(pin === id ? null : id); if (pin !== id) rt.engine?.framePoint(l.p); }}>
              <div className="main"><div className="t">{a?.pt ?? nomePt(l.k, m)}</div>{a?.nota && <div className="d">{a.nota}</div>}</div>
            </button>
          );
        })}
      </div>
    </Sec>
  );
}

function Generico({ info, k }: { info: Info; k: string }) {
  const m = rt.m!;
  const [en, setEn] = useState<string | null>(null);
  useEffect(() => { setEn(null); if (!info) wiki().then((w) => setEn(w[k] ?? '')); }, [k, info]);
  if (info?.tipo === 'ligamento') return <>{info.d.funcao && <p className="lead">{info.d.funcao}</p>}{info.d.clinica && <Sec t="Clínica" ico="clinica"><Prose t={info.d.clinica} /></Sec>}</>;
  if (info?.tipo === 'estrutura') return <>{info.d.resumo && <p className="lead">{info.d.resumo}</p>}{info.d.clinica && <Sec t="Clínica" ico="clinica"><Prose t={info.d.clinica} /></Sec>}</>;
  if (info?.tipo === 'nervo') {
    const d = info.d as typeof info.d & { dica?: string; sinonimos?: string[] };
    const inerv = [...musculos.values()].filter((mu) => mu.inervacao?.nervoKeys?.includes(d.key));
    return (
      <>
        {d.resumo && <p className="lead">{d.resumo}</p>}
        {(d.raizes || d.origem) && <div className="oiia">{d.raizes && <div className="kv n"><div className="k">Raízes</div><div className="v">{d.raizes}</div></div>}{d.origem && <div className="kv"><div className="k">Origem</div><div className="v">{d.origem}</div></div>}</div>}
        {d.trajeto && <Sec t="Trajeto"><Prose t={d.trajeto} /></Sec>}
        {d.motor && <Sec t="Motor"><Prose t={d.motor} /></Sec>}
        {d.sensitivo && <Sec t="Sensitivo"><Prose t={d.sensitivo} /></Sec>}
        {d.lesao && <Sec t="Lesão e clínica" ico="clinica"><Prose t={d.lesao} /></Sec>}
        {d.dica && <div className="tip"><b>Macete · </b>{d.dica}</div>}
        {inerv.length > 0 && <Sec t={`Músculos inervados no atlas (${inerv.length})`}><ChaveTags keys={inerv.map((x) => x.key)} />
          <button className="btn" style={{ marginTop: 8 }} onClick={() => { const ids = inerv.flatMap((mu) => structsDoMusculo(mu, m)).map((s) => [s, '#ff8a1f'] as [number, string]); const nsi = m.byKey.get(d.key); if (nsi !== undefined) ids.push([nsi, '#ffe066']); useStore.getState().setFocus({ ids, others: 'ghost', label: `Território motor: ${d.pt}` }); }}><Icon n="isolar" size={16} />Ver território motor no 3D</button></Sec>}
      </>
    );
  }
  // sem conteúdo em português: mostra a descrição do Z-Anatomy/Wikipedia
  const g = m.structs[m.byKey.get(k)!]?.g;
  const art = g ? groupChain(m, g).map((x) => articulacoes.get(x)).find(Boolean) : undefined;
  return (
    <>
      {art && <button className="row" onClick={() => window.dispatchEvent(new CustomEvent('abrir-articulacao', { detail: art.key }))}><div className="main"><div className="t">{art.pt}</div><div className="d">Ver a ficha da articulação</div></div><Icon n="seta" size={16} /></button>}
      {en === null ? null : en ? <Sec t="Descrição (em inglês — Wikipedia)"><Prose t={en} /></Sec> : <div className="empty">Ainda não há descrição para esta estrutura.</div>}
    </>
  );
}

export function Ficha() {
  const m = rt.m!;
  const sel = useStore((s) => s.sel);
  const showIns = useStore((s) => s.showIns);
  const boneMap = useStore((s) => s.boneMap);
  const prog = useStore((s) => s.prog);
  const st = useStore.getState();

  const s = sel ? m.structs[sel.si] : null;
  const info = useMemo(() => (s ? infoDe(s.k, m) : null), [s, m]);

  // marca como vista (conta para a sequência de estudo) depois de alguns segundos na ficha
  useEffect(() => { if (!s) return; const t = setTimeout(() => useStore.getState().atividade(1), 4000); return () => clearTimeout(t); }, [s]);

  if (!sel || !s) return <Inicio />;

  const chaveProg = info?.tipo === 'musculo' ? info.d.key : s.k;
  const estudado = !!prog.estudados[chaveProg];
  const fav = prog.favoritos.includes(chaveProg);
  const nome = nomePt(s.k, m);
  const titulo = info?.tipo === 'musculo' ? info.d.pt : nome;
  const latim = (info && 'latim' in info.d && info.d.latim) || s.la;
  const temIns = (m.insByMuscle.get(sel.si)?.length ?? 0) > 0;
  const temMapa = (m.insByBone.get(sel.si)?.length ?? 0) > 0;
  const bilateral = !!(s.m.l && s.m.r);
  const chain = groupChain(m, s.g).slice(0, 2).reverse().map((g) => nomePt(g, m));

  return (
    <>
      <div className="phead">
        <div className="ttl">
          <h2>{titulo}</h2>
          <div className="sub">{info?.tipo === 'musculo' && titulo !== nome ? <>{nome} · </> : null}{catNome(s.c)}{latim ? <> · <span className="lat">{latim}</span></> : null}</div>
          {chain.length > 0 && <div className="sub">{chain.join(' › ')}</div>}
        </div>
        <button className={'iconbtn ok' + (estudado ? ' on' : '')} aria-label="Marcar como estudado" onClick={() => { st.patchProg((p) => { const e = { ...p.estudados }; if (e[chaveProg]) delete e[chaveProg]; else e[chaveProg] = Date.now(); return { estudados: e }; }); if (!estudado) { st.atividade(2); st.say('Marcado como estudado ✓'); } }}><Icon n="check" /></button>
        <button className={'iconbtn' + (fav ? ' on' : '')} aria-label="Favorito" onClick={() => st.patchProg((p) => ({ favoritos: fav ? p.favoritos.filter((x) => x !== chaveProg) : [...p.favoritos, chaveProg] }))}><Icon n="coracao" /></button>
        <button className="iconbtn" aria-label="Fechar" onClick={() => st.setPanel(false)}><Icon n="fechar" /></button>
      </div>
      <div className="pbody">
        <div className="actions">
          {temIns && <button className={'btn' + (showIns ? ' on' : '')} onClick={() => st.toggleIns()}><Icon n="alvo" size={16} />Origem e inserção</button>}
          {temMapa && <button className={'btn' + (boneMap ? ' on' : '')} onClick={() => st.toggleBoneMap()}><Icon n="alvo" size={16} />Mapa de inserções</button>}
          <button className="btn" onClick={() => { const sp = rt.engine?.sphereOf([sel.si], sel.side); if (sp) rt.engine!.frame(sp, { pad: 1.5 }); }}><Icon n="busca" size={16} />Focar</button>
          <button className="btn" onClick={() => { const ids = info?.tipo === 'musculo' ? structsDoMusculo(info.d, m) : [sel.si]; st.setFocus({ ids: (ids.length ? ids : [sel.si]).map((x) => [x, null]), others: 'hide', label: titulo }, false); useStore.setState({ sel }); }}><Icon n="isolar" size={16} />Isolar</button>
          <button className="btn" onClick={() => { st.hide(sel.si); st.say('Oculto. Use ↶ para desfazer.'); }}><Icon n="olhoOff" size={16} />Ocultar</button>
        </div>
        {bilateral && (
          <div className="seg wide">
            {([['r', 'Direito'], ['both', 'Ambos'], ['l', 'Esquerdo']] as const).map(([v, n]) => <button key={v} className={sel.side === v ? 'on' : ''} onClick={() => useStore.setState({ sel: { si: sel.si, side: v }, pin: null })}>{n}</button>)}
          </div>
        )}
        {(showIns || boneMap) && <div className="legend"><span><i className="dot" style={{ background: 'var(--origin)' }} />Origem</span><span><i className="dot" style={{ background: 'var(--insertion)' }} />Inserção</span>{boneMap && <span>Toque numa área para abrir o músculo</span>}</div>}

        {info?.tipo === 'musculo' ? <FichaMusculo d={info.d} parteKey={s.k} />
          : info?.tipo === 'osso' ? (
            <>
              {info.d.resumo && <p className="lead">{info.d.resumo}</p>}
              {info.d.tipo && <div className="tags"><span className="tag">Osso {info.d.tipo}</span></div>}
              {info.d.descricao && <Sec t="Descrição"><Prose t={info.d.descricao} /></Sec>}
              {info.d.articulacoes && info.d.articulacoes.length > 0 && <Sec t="Articulações"><div className="list">{info.d.articulacoes.map((a, i) => <div key={i} className="row compact"><div className="main"><div className="d" style={{ color: '#d9dce6' }}>{a}</div></div></div>)}</div></Sec>}
              {info.d.palpacao && <Sec t="Palpação"><Prose t={info.d.palpacao} /></Sec>}
              {info.d.clinica && <Sec t="Clínica" ico="clinica"><Prose t={info.d.clinica} /></Sec>}
              <Inseridos si={sel.si} />
              <Acidentes si={sel.si} boneKey={s.k} />
            </>
          ) : (
            <>
              <Generico info={info} k={s.k} />
              <Inseridos si={sel.si} />
              <Acidentes si={sel.si} boneKey={s.k} />
            </>
          )}

        <Sec t="Minhas anotações" ico="nota">
          <textarea className="note" placeholder="Escreva aqui o que quiser lembrar…" value={prog.notas[chaveProg] ?? ''} onChange={(e) => st.patchProg((p) => { const n = { ...p.notas }; if (e.target.value) n[chaveProg] = e.target.value; else delete n[chaveProg]; return { notas: n }; })} />
        </Sec>
        <div className="small muted">Nome em inglês: {s.k}</div>
      </div>
    </>
  );
}

function Inicio() {
  const prog = useStore((s) => s.prog);
  const st = useStore.getState();
  const m = rt.m!;
  const favs = prog.favoritos.filter((k) => resolver(k, m).length).slice(0, 12);
  return (
    <>
      <div className="phead"><div className="ttl"><h2>Atlas 3D</h2><div className="sub">Toque em qualquer estrutura do modelo para abrir a ficha</div></div><button className="iconbtn" onClick={() => st.setPanel(false)} aria-label="Fechar"><Icon n="fechar" /></button></div>
      <div className="pbody">
        <div className="list">
          <div className="row"><div className="main"><div className="t">Um dedo</div><div className="d">gira o modelo</div></div></div>
          <div className="row"><div className="main"><div className="t">Dois dedos</div><div className="d">aproximam (pinça) e movem</div></div></div>
          <div className="row"><div className="main"><div className="t">Toque</div><div className="d">seleciona e abre a ficha · toque duplo aproxima</div></div></div>
          <div className="row"><div className="main"><div className="t">Camadas</div><div className="d">no botão à esquerda: ligue nervos, ligamentos, vasos… ou deixe os músculos translúcidos</div></div></div>
          <div className="row"><div className="main"><div className="t">Ocultar</div><div className="d">esconde a estrutura selecionada para ver o que está por baixo, camada por camada</div></div></div>
        </div>
        <Sec t="Comece por aqui">
          <div className="grid2">
            <button className="tile" onClick={() => st.setTab('explorar')}><div className="t">Regiões</div><div className="d">Ombro, joelho, coluna…</div></button>
            <button className="tile" onClick={() => st.setTab('roteiros')}><div className="t">Roteiros</div><div className="d">Manguito rotador, plexo braquial…</div></button>
            <button className="tile" onClick={() => st.setTab('movimentos')}><div className="t">Movimentos</div><div className="d">Quem faz cada movimento</div></button>
            <button className="tile" onClick={() => st.setTab('treinar')}><div className="t">Treinar</div><div className="d">Quiz e flashcards</div></button>
          </div>
        </Sec>
        {favs.length > 0 && <Sec t="Favoritos" ico="coracao"><ChaveTags keys={favs} /></Sec>}
      </div>
    </>
  );
}
