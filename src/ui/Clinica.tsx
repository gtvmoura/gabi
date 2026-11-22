import { useEffect, useMemo, useState } from 'react';
import { rt, useStore } from '../store';
import { ART_NOME, marcha, neuro, nomePt, testes, type Teste } from '../content';
import { Icon } from './icons';
import { ChaveTags, Prose, Sec } from './Ficha';
import { destacarChaves } from './Roteiros';

function TesteView({ t, onBack }: { t: Teste; onBack: () => void }) {
  useEffect(() => { if (t.estruturas?.length) destacarChaves(t.estruturas, t.nome, '#39c2f0'); }, [t]);
  return (
    <>
      <div className="phead"><button className="iconbtn" onClick={onBack} aria-label="Voltar"><Icon n="voltar" /></button><div className="ttl"><h2>{t.nome}</h2><div className="sub">{ART_NOME[t.art] ?? t.art}</div></div></div>
      <div className="pbody">
        {t.objetivo && <p className="lead">{t.objetivo}</p>}
        {t.estruturas && t.estruturas.length > 0 && <div className="actions"><button className="btn primary" onClick={() => destacarChaves(t.estruturas!, t.nome, '#39c2f0')}><Icon n="isolar" size={16} />Ver estruturas no 3D</button></div>}
        {t.posicao && <Sec t="Posição do paciente"><Prose t={t.posicao} /></Sec>}
        {t.execucao && <Sec t="Execução"><Prose t={t.execucao} /></Sec>}
        {t.positivo && <div className="kv a"><div className="k">Teste positivo</div><div className="v">{t.positivo}</div></div>}
        {t.observacao && <Sec t="Observações"><Prose t={t.observacao} /></Sec>}
        {t.estruturas && <Sec t="Estruturas avaliadas"><ChaveTags keys={t.estruturas} /></Sec>}
      </div>
    </>
  );
}

export function Clinica() {
  const m = rt.m!;
  const [sub, setSub] = useState<'testes' | 'marcha' | 'neuro'>('testes');
  const [id, setId] = useState<string | null>(null);
  const [art, setArt] = useState<string>('todas');
  const [fase, setFase] = useState<number | null>(null);
  const [nt, setNt] = useState<'dermatomos' | 'miotomos' | 'reflexos' | 'plexos'>('dermatomos');
  useEffect(() => { const f = (e: Event) => { setSub('testes'); setId((e as CustomEvent).detail); }; window.addEventListener('abrir-teste', f); return () => window.removeEventListener('abrir-teste', f); }, []);
  const arts = useMemo(() => [...new Set(testes.map((t) => t.art))], []);
  const t = testes.find((x) => x.id === id);
  if (t) return <TesteView t={t} onBack={() => setId(null)} />;
  return (
    <>
      <div className="phead"><div className="ttl"><h2>Clínica</h2><div className="sub">Testes especiais, marcha e tabelas neurológicas</div></div><button className="iconbtn" onClick={() => useStore.getState().setPanel(false)} aria-label="Fechar"><Icon n="fechar" /></button></div>
      <div className="pbody">
        <div className="subtabs">{([['testes', `Testes (${testes.length})`], ['marcha', 'Marcha'], ['neuro', 'Neuro']] as const).map(([k, n]) => <button key={k} className={sub === k ? 'on' : ''} onClick={() => setSub(k)}>{n}</button>)}</div>
        {sub === 'testes' && (
          <>
            <div className="subtabs"><button className={art === 'todas' ? 'on' : ''} onClick={() => setArt('todas')}>Todas</button>{arts.map((a) => <button key={a} className={art === a ? 'on' : ''} onClick={() => setArt(a)}>{(ART_NOME[a] ?? a).replace(/ \(.*/, '')}</button>)}</div>
            <div className="list">{testes.filter((x) => art === 'todas' || x.art === art).map((x) => <button key={x.id} className="row" onClick={() => setId(x.id)}><div className="main"><div className="t">{x.nome}</div><div className="d clamp2">{x.objetivo}</div></div><Icon n="seta" size={16} /></button>)}</div>
          </>
        )}
        {sub === 'marcha' && (
          <>
            <p className="small muted">As 8 fases do ciclo da marcha. Toque numa fase para ver os músculos ativos no 3D.</p>
            <div className="list">{marcha.map((f, i) => (
              <div key={i} className={'row' + (fase === i ? ' on' : '')} style={{ display: 'block' }}>
                <button style={{ width: '100%', textAlign: 'left' }} onClick={() => { setFase(fase === i ? null : i); if (fase !== i && f.musculos?.length) destacarChaves(f.musculos.map((x) => x.key), f.fase, '#ff8a1f'); }}>
                  <div className="t">{i + 1}. {f.fase} <span className="muted small">{f.percentual}</span></div>
                  <div className={'d' + (fase === i ? '' : ' clamp2')}>{f.descricao}</div>
                </button>
                {fase === i && (
                  <div style={{ marginTop: 8 }}>
                    {f.articulacoes && <div className="small" style={{ marginBottom: 8, color: '#d9dce6' }}><b>Articulações:</b> {f.articulacoes}</div>}
                    {f.musculos?.map((x, j) => <div key={j} className="small" style={{ padding: '4px 0', borderTop: '1px solid var(--line)' }}><b>{nomePt(x.key, m)}</b>{x.papel ? ` — ${x.papel}` : ''}</div>)}
                  </div>
                )}
              </div>
            ))}</div>
            {marcha.length === 0 && <div className="empty">Conteúdo de marcha indisponível.</div>}
          </>
        )}
        {sub === 'neuro' && (
          <>
            <div className="subtabs">{([['dermatomos', 'Dermátomos'], ['miotomos', 'Miótomos'], ['reflexos', 'Reflexos'], ['plexos', 'Plexos']] as const).map(([k, n]) => <button key={k} className={nt === k ? 'on' : ''} onClick={() => setNt(k)}>{n}</button>)}</div>
            {nt === 'dermatomos' && <table className="t"><thead><tr><th>Nível</th><th>Área</th></tr></thead><tbody>{neuro.dermatomos?.map((d, i) => <tr key={i}><td>{d.nivel}</td><td>{d.area}{d.ponto && <div className="small muted">Ponto-chave: {d.ponto}</div>}</td></tr>)}</tbody></table>}
            {nt === 'miotomos' && <table className="t"><thead><tr><th>Nível</th><th>Movimento</th></tr></thead><tbody>{neuro.miotomos?.map((d, i) => <tr key={i}><td>{d.nivel}</td><td>{d.movimento}{d.musculos && <div className="small muted">{d.musculos}</div>}</td></tr>)}</tbody></table>}
            {nt === 'reflexos' && <table className="t"><thead><tr><th>Reflexo</th><th>Nível</th></tr></thead><tbody>{neuro.reflexos?.map((d, i) => <tr key={i}><td style={{ whiteSpace: 'normal' }}>{d.reflexo}</td><td><b>{d.nivel}</b>{d.nervo && <span className="muted"> · {d.nervo}</span>}{d.como && <div className="small muted">{d.como}</div>}</td></tr>)}</tbody></table>}
            {nt === 'plexos' && neuro.plexos?.map((p, i) => <Sec key={i} t={`${p.nome}${p.raizes ? ` (${p.raizes})` : ''}`}><Prose t={p.texto} />{p.ramos && <div className="tags" style={{ marginTop: 8 }}>{p.ramos.map((r, j) => <span key={j} className="tag">{r}</span>)}</div>}</Sec>)}
          </>
        )}
      </div>
    </>
  );
}
