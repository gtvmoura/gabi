import { useEffect, useMemo, useState } from 'react';
import { rt, useStore } from '../store';
import { ART_NOME, resolver, roteiros, type Roteiro } from '../content';
import { Icon } from './icons';
import { ChaveTags, Prose, Sec } from './Ficha';

export function destacarChaves(keys: string[], label: string, cor: string | null = null) {
  const m = rt.m!;
  const ids = new Map<number, string | null>();
  for (const k of keys) for (const si of resolver(k, m)) ids.set(si, cor);
  if (!ids.size) { useStore.getState().say('Sem estruturas 3D para destacar.'); return; }
  useStore.getState().setFocus({ ids: [...ids], others: 'ghost', label });
}

function Detalhe({ r, onBack }: { r: Roteiro; onBack: () => void }) {
  const [aberta, setAberta] = useState<Record<number, boolean>>({});
  const lido = useStore((s) => !!s.prog.estudados['roteiro:' + r.id]);
  const st = useStore.getState();
  useEffect(() => { if (r.estruturas?.length) destacarChaves(r.estruturas, r.titulo); }, [r]);
  return (
    <>
      <div className="phead"><button className="iconbtn" onClick={onBack} aria-label="Voltar"><Icon n="voltar" /></button><div className="ttl"><h2>{r.titulo}</h2><div className="sub">{ART_NOME[r.regiao ?? ''] ?? 'Roteiro de estudo'}</div></div>
        <button className={'iconbtn ok' + (lido ? ' on' : '')} aria-label="Marcar como estudado" onClick={() => { st.patchProg((p) => { const e = { ...p.estudados }; if (lido) delete e['roteiro:' + r.id]; else e['roteiro:' + r.id] = Date.now(); return { estudados: e }; }); if (!lido) st.atividade(3); }}><Icon n="check" /></button></div>
      <div className="pbody">
        {r.resumo && <p className="lead">{r.resumo}</p>}
        {r.estruturas && r.estruturas.length > 0 && <div className="actions"><button className="btn primary" onClick={() => destacarChaves(r.estruturas!, r.titulo)}><Icon n="isolar" size={16} />Destacar no 3D</button></div>}
        <div className="prose"><Prose t={r.texto} /></div>
        {r.pontos && r.pontos.length > 0 && <Sec t="Pontos-chave"><div className="list">{r.pontos.map((p, i) => <div key={i} className="row compact"><span style={{ color: 'var(--accent)', fontWeight: 800 }}>{i + 1}</span><div className="main"><div className="d" style={{ color: '#e3e6ef', fontSize: 14 }}>{p}</div></div></div>)}</div></Sec>}
        {r.estruturas && <Sec t="Estruturas"><ChaveTags keys={r.estruturas} /></Sec>}
        {r.perguntas && r.perguntas.length > 0 && (
          <Sec t="Teste-se">
            <div className="list">{r.perguntas.map((p, i) => (
              <button key={i} className="row" onClick={() => setAberta({ ...aberta, [i]: !aberta[i] })}><div className="main"><div className="t">{p.q}</div>{aberta[i] ? <div className="d" style={{ color: '#bff0cf', fontSize: 14, marginTop: 6 }}>{p.a}</div> : <div className="d">Toque para ver a resposta</div>}</div></button>
            ))}</div>
          </Sec>
        )}
      </div>
    </>
  );
}

export function Roteiros() {
  const [id, setId] = useState<string | null>(null);
  const estudados = useStore((s) => s.prog.estudados);
  useEffect(() => { const f = (e: Event) => setId((e as CustomEvent).detail); window.addEventListener('abrir-roteiro', f); return () => window.removeEventListener('abrir-roteiro', f); }, []);
  const grupos = useMemo(() => { const g = new Map<string, Roteiro[]>(); for (const r of roteiros) { const k = ART_NOME[r.regiao ?? ''] ?? 'Geral'; if (!g.has(k)) g.set(k, []); g.get(k)!.push(r); } return [...g]; }, []);
  const r = roteiros.find((x) => x.id === id);
  if (r) return <Detalhe r={r} onBack={() => setId(null)} />;
  return (
    <>
      <div className="phead"><div className="ttl"><h2>Roteiros de estudo</h2><div className="sub">Temas prontos, com o 3D já destacado</div></div><button className="iconbtn" onClick={() => useStore.getState().setPanel(false)} aria-label="Fechar"><Icon n="fechar" /></button></div>
      <div className="pbody">
        {roteiros.length === 0 && <div className="empty">Os roteiros ainda não foram carregados.</div>}
        {grupos.map(([g, rs]) => (
          <Sec key={g} t={g}>
            <div className="list">{rs.map((x) => <button key={x.id} className="row" onClick={() => setId(x.id)}><div className="main"><div className="t">{x.titulo}</div><div className="d clamp2">{x.resumo}</div></div>{estudados['roteiro:' + x.id] ? <span style={{ color: 'var(--ok)' }}><Icon n="check" size={17} /></span> : <Icon n="seta" size={16} />}</button>)}</div>
          </Sec>
        ))}
      </div>
    </>
  );
}
