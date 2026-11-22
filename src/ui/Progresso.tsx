import { useMemo, useRef, useState } from 'react';
import { rt, sequencia, useStore, type Progresso as Prog } from '../store';
import { musculos, nomePt, ossos, resolver, roteiros } from '../content';
import { MACRO, macroDe } from '../lib/regioes';
import { PERFIL } from '../content/recados';
import { Icon } from './icons';
import { Sec } from './Ficha';
import { abrirChave } from './Search';

const ARQUIVOS = ['skeleton', 'muscles', 'insertions', 'joints', 'nervous', 'vessels', 'viscera', 'lymph', 'regions'];

export function Progresso() {
  const m = rt.m!;
  const prog = useStore((s) => s.prog);
  const st = useStore.getState();
  const [off, setOff] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const porRegiao = useMemo(() => MACRO.map((r) => {
    const keys = [...musculos.keys(), ...ossos.keys()].filter((k) => macroDe(k, m) === r.id && resolver(k, m).length);
    return { ...r, total: keys.length, feitos: keys.filter((k) => prog.estudados[k]).length };
  }), [prog.estudados, m]);
  const totalEst = Object.keys(prog.estudados).length;
  const seq = sequencia(prog.dias);
  const quizTot = prog.quiz.reduce((a, q) => a + q.total, 0), quizOk = prog.quiz.reduce((a, q) => a + q.certos, 0);
  const cartoes = Object.keys(prog.srs).length;
  const dias = useMemo(() => Array.from({ length: 21 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (20 - i)); return { k: d.toLocaleDateString('sv-SE'), d: d.getDate() }; }), []);
  const dificeis = Object.entries(prog.erros).sort((a, b) => b[1] - a[1]).slice(0, 8).filter(([k]) => resolver(k, m).length);
  const notas = Object.entries(prog.notas);
  const rotLidos = roteiros.filter((r) => prog.estudados['roteiro:' + r.id]).length;

  const exportar = () => {
    const blob = new Blob([JSON.stringify({ app: 'atlas-da-gabi', v: 1, prog }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `atlas-da-gabi-${new Date().toLocaleDateString('sv-SE')}.json`; a.click(); URL.revokeObjectURL(a.href);
  };
  const importar = async (f: File) => {
    try { const j = JSON.parse(await f.text()); if (j.app !== 'atlas-da-gabi' || !j.prog) throw new Error(); useStore.setState({ prog: { ...prog, ...(j.prog as Prog) } }); st.say('Progresso restaurado ✓'); } catch { st.say('Arquivo inválido.'); }
  };
  const baixarTudo = async () => {
    let n = 0;
    for (const f of ARQUIVOS) { setOff(`Baixando ${++n}/${ARQUIVOS.length}…`); try { await fetch(`${import.meta.env.BASE_URL}models/${f}.glb`, { cache: 'reload' }).then((r) => r.arrayBuffer()); } catch { setOff(null); st.say('Falhou. Confira a internet e tente de novo.'); return; } }
    await fetch(`${import.meta.env.BASE_URL}data/wiki-en.json`).catch(() => {});
    setOff('Tudo salvo para uso offline ✓');
  };

  return (
    <>
      <div className="phead"><div className="ttl"><h2>Progresso da {PERFIL.nome}</h2><div className="sub">Um pouquinho por dia vai longe</div></div><button className="iconbtn" onClick={() => st.setPanel(false)} aria-label="Fechar"><Icon n="fechar" /></button></div>
      <div className="pbody">
        <div className="grid2">
          <div className="stat"><div className="n">{seq} <span style={{ fontSize: 18 }}>🔥</span></div><div className="l">dia{seq === 1 ? '' : 's'} seguido{seq === 1 ? '' : 's'}</div></div>
          <div className="stat"><div className="n">{totalEst}</div><div className="l">itens estudados</div></div>
          <div className="stat"><div className="n">{quizTot ? Math.round((quizOk / quizTot) * 100) + '%' : '—'}</div><div className="l">acertos no quiz ({quizOk}/{quizTot})</div></div>
          <div className="stat"><div className="n">{cartoes}</div><div className="l">flashcards em estudo</div></div>
        </div>
        <Sec t="Últimas 3 semanas">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
            {dias.map((d) => { const v = prog.dias[d.k] ?? 0; return <div key={d.k} style={{ aspectRatio: '1', borderRadius: 9, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, color: v ? '#fff' : 'var(--dim)', background: v ? `rgba(255, 93, 143, ${Math.min(0.9, 0.3 + v * 0.04)})` : 'rgba(255,255,255,0.05)' }}>{d.d}</div>; })}
          </div>
        </Sec>
        <Sec t="Por região (músculos e ossos)">
          <div className="list">{porRegiao.map((r) => <div key={r.id}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}><b>{r.nome}</b><span className="muted">{r.feitos}/{r.total}</span></div><div className="bar"><i style={{ width: `${r.total ? (r.feitos / r.total) * 100 : 0}%` }} /></div></div>)}
            <div><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}><b>Roteiros</b><span className="muted">{rotLidos}/{roteiros.length}</span></div><div className="bar"><i style={{ width: `${roteiros.length ? (rotLidos / roteiros.length) * 100 : 0}%` }} /></div></div>
          </div>
          <p className="small muted" style={{ marginTop: 8 }}>Marque uma estrutura como estudada no ✓ da ficha.</p>
        </Sec>
        {dificeis.length > 0 && <Sec t="Mais erradas no quiz"><div className="tags">{dificeis.map(([k, n]) => <button key={k} className="tag" onClick={() => abrirChave(k)}>{nomePt(k, m)} · {n}×</button>)}</div></Sec>}
        {notas.length > 0 && <Sec t="Minhas anotações" ico="nota"><div className="list">{notas.map(([k, v]) => <button key={k} className="row" onClick={() => abrirChave(k)}><div className="main"><div className="t">{nomePt(k, m)}</div><div className="d clamp2">{v}</div></div></button>)}</div></Sec>}
        <Sec t="Usar sem internet">
          <p className="small muted" style={{ marginBottom: 8 }}>Para instalar no tablet: abra o menu do navegador e escolha “Adicionar à tela de início”. Depois baixe todos os modelos para estudar offline.</p>
          <button className="btn block" onClick={baixarTudo} disabled={!!off && off.startsWith('Baixando')}>{off ?? 'Baixar tudo para uso offline (≈ 25 MB)'}</button>
        </Sec>
        <Sec t="Cópia de segurança">
          <div className="actions"><button className="btn" onClick={exportar}>Salvar progresso</button><button className="btn" onClick={() => file.current?.click()}>Restaurar</button></div>
          <input ref={file} type="file" accept="application/json" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) void importar(f); e.target.value = ''; }} />
        </Sec>
        <Sec t="Sobre">
          <p className="small muted">Modelos 3D: Z-Anatomy (Gauthier Kervyn e colaboradores), derivado de BodyParts3D © The Database Center for Life Science — licença CC BY-SA 4.0 / CC BY-SA 2.1 JP. Textos de apoio em inglês: Wikipedia (CC BY-SA).</p>
          <p className="small muted" style={{ marginTop: 6 }}>O conteúdo em português é material de estudo e pode conter imprecisões: na dúvida, vale o livro-texto e o professor. Não substitui avaliação profissional.</p>
          <p className="small" style={{ marginTop: 10, color: 'var(--accent)' }}>Feito com carinho para a {PERFIL.nome}. 💛</p>
        </Sec>
      </div>
    </>
  );
}
