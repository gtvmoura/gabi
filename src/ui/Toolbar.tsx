import { useEffect, useState } from 'react';
import { rt, useStore } from '../store';
import { LAYERS, type LayerState } from '../engine/palette';
import type { ViewName } from '../engine/Engine';
import { Icon } from './icons';
import { salvarImagem } from './Extras';
import { infoDe, nomePt, structsDoMusculo } from '../content';

const VIEWS: [ViewName, string][] = [['anterior', 'Anterior'], ['posterior', 'Posterior'], ['superior', 'Superior'], ['direita', 'Lateral D'], ['esquerda', 'Lateral E'], ['inferior', 'Inferior']];

export function Toolbar() {
  const [open, setOpen] = useState<null | 'camadas' | 'vistas'>(null);
  const layers = useStore((s) => s.layers);
  const side = useStore((s) => s.side);
  const hidden = useStore((s) => s.hidden);
  const modo = useStore((s) => s.modoOcultar);
  const fixo = useStore((s) => s.fixo);
  const pinLabels = useStore((s) => s.pinLabels);
  const colorMode = useStore((s) => s.colorMode);
  const clip = useStore((s) => s.clip);
  const st = useStore.getState();
  const toggle = (p: 'camadas' | 'vistas') => setOpen(open === p ? null : p);
  useEffect(() => {
    if (!open) return;
    const f = (e: PointerEvent) => { const t = e.target as HTMLElement; if (!t.closest('.pop') && !t.closest('.tools')) setOpen(null); };
    window.addEventListener('pointerdown', f, true);
    return () => window.removeEventListener('pointerdown', f, true);
  }, [open]);

  return (
    <>
      <div className="tools">
        <div className="grp glass">
          <button className={'tbtn' + (open === 'camadas' ? ' on' : '')} onClick={() => toggle('camadas')} aria-label="Camadas"><Icon n="camadas" /></button>
          <button className={'tbtn' + (open === 'vistas' ? ' on' : '')} onClick={() => toggle('vistas')} aria-label="Vistas"><Icon n="olho" /></button>
        </div>
        <div className="grp glass">
          <button className="tbtn" onClick={() => rt.engine?.zoomBy(0.7)} aria-label="Aproximar"><Icon n="mais" /></button>
          <button className="tbtn" onClick={() => rt.engine?.zoomBy(1.4)} aria-label="Afastar"><Icon n="menos" /></button>
          <button className="tbtn" onClick={() => rt.engine?.home()} aria-label="Corpo inteiro"><Icon n="casa" /></button>
          <button className={'tbtn' + (fixo ? ' on' : '')} aria-label="Centralizar" onClick={() => {
            const s = useStore.getState(); const m = rt.m!;
            if (s.fixo) { s.fixar(null); s.say('A câmera voltou a ficar livre'); return; }
            if (s.sel) {
              const st = m.structs[s.sel.si];
              // estrutura dos dois lados: centraliza num lado só (o esquerdo), senão o centro cai no meio do corpo
              const lado = s.sel.side === 'both' && st.m.l && st.m.r ? 'l' : s.sel.side;
              if (lado !== s.sel.side) useStore.setState({ sel: { si: s.sel.si, side: lado } });
              const info = infoDe(st.k, m); const sis = info?.tipo === 'musculo' ? structsDoMusculo(info.d, m) : [s.sel.si];
              s.fixar({ label: info?.tipo === 'musculo' ? info.d.pt : nomePt(st.k, m), sis: sis.length ? sis : [s.sel.si], lado });
            }
            else if (s.focus) s.fixar({ label: s.focus.label, sis: s.focus.ids.filter(([, c]) => c !== null || !s.focus!.ids.some(([, x]) => x !== null)).map(([si]) => si) });
            else { s.say('Escolha uma estrutura, um sistema ou uma peça para centralizar'); return; }
            s.say('Centralizado: a rotação gira em volta dele');
          }}><Icon n="alvo" /></button>
        </div>
        <div className="grp glass">
          <button className={'tbtn' + (modo ? ' modo' : '')} onClick={() => { const v = !modo; useStore.setState({ modoOcultar: v, sel: v ? null : useStore.getState().sel }); st.say(v ? 'Modo ocultar: toque para esconder · toque duplo esconde o grupo' : 'Modo ocultar desligado'); }} aria-label="Modo ocultar"><Icon n="borracha" /></button>
          {hidden.length > 0 && <button className="tbtn on" onClick={() => st.undoHide()} aria-label="Desfazer ocultar"><Icon n="desfazer" /></button>}
          {hidden.length > 0 && <button className="tbtn" onClick={() => { st.showAll(); st.say('Tudo visível de novo'); }} aria-label="Mostrar tudo"><Icon n="olho" /></button>}
        </div>
      </div>

      {open === 'camadas' && (
        <div className="pop glass">
          <h4>Camadas</h4>
          {LAYERS.map((l) => (
            <div className="layer" key={l.id}>
              <span className="dot" style={{ background: l.cor }} />
              <span className="nm">{l.nome}</span>
              <div className="seg">
                {([[0, 'olhoOff'], [2, 'isolar'], [1, 'olho']] as [LayerState, string][]).map(([v, ic]) => (
                  <button key={v} className={layers[l.id] === v ? 'on' : ''} onClick={() => st.setLayer(l.id, v)} aria-label={v === 0 ? 'Ocultar' : v === 2 ? 'Translúcido' : 'Mostrar'}><Icon n={ic} size={16} /></button>
                ))}
              </div>
            </div>
          ))}
          <p className="small muted" style={{ margin: '6px 4px 10px' }}>Oculto · translúcido · visível. No modo translúcido o toque atravessa a camada.</p>
          <button className={'btn block' + (colorMode === 'inervacao' ? ' on' : '')} style={{ marginBottom: 12 }} onClick={() => { useStore.setState({ colorMode: colorMode === 'inervacao' ? 'normal' : 'inervacao' }); if (colorMode !== 'inervacao') { setOpen(null); st.say('Cada cor é um nervo. Toque na legenda para isolar.'); } }}>Colorir músculos por inervação</button>
          <h4>Lado do corpo</h4>
          <div className="seg wide">
            {([['r', 'Direito'], ['both', 'Ambos'], ['l', 'Esquerdo']] as const).map(([v, n]) => <button key={v} className={side === v ? 'on' : ''} onClick={() => st.setSide(v)}>{n}</button>)}
          </div>
          <div style={{ height: 10 }} />
          <button className="btn block" onClick={() => { st.resetView(); setOpen(null); }}><Icon n="desfazer" size={17} />Restaurar tudo</button>
        </div>
      )}
      {open === 'vistas' && (
        <div className="pop glass">
          <h4>Vistas</h4>
          <div className="views">{VIEWS.map(([v, n]) => <button key={v} onClick={() => rt.engine?.view(v)}>{n}</button>)}</div>
          <div style={{ height: 12 }} />
          <h4>Plano de corte</h4>
          <div className="seg wide">
            {([[null, 'Sem corte'], ['x', 'Sagital'], ['z', 'Frontal'], ['y', 'Transversal']] as const).map(([a, n]) => <button key={n} className={(clip?.axis ?? null) === a ? 'on' : ''} onClick={() => { useStore.setState({ clip: a ? { axis: a, t: a === 'x' ? 0.5 : a === 'y' ? 0.7 : 0.45 } : null }); if (a) rt.engine?.view(a === 'x' ? 'esquerda' : a === 'y' ? 'superior' : 'anterior'); }}>{n}</button>)}
          </div>
          {clip && <input type="range" min={0} max={1} step={0.005} value={clip.t} onChange={(e) => useStore.setState({ clip: { axis: clip.axis, t: +e.target.value } })} aria-label="Posição do corte" />}
          <div style={{ height: 12 }} />
          <h4>Imagem</h4>
          <button className="btn block" onClick={() => { const s = useStore.getState(); void salvarImagem(s.sel ? nomePt(rt.m!.structs[s.sel.si].k, rt.m!) : s.focus?.label ?? 'Anatomia'); setOpen(null); }}><Icon n="camera" size={17} />Salvar imagem desta vista</button>
          <div style={{ height: 12 }} />
          <h4>Acidentes ósseos</h4>
          <button className={'btn block' + (pinLabels ? ' on' : '')} onClick={() => useStore.setState({ pinLabels: !pinLabels })}><Icon n="pino" size={17} />{pinLabels ? 'Ocultar nomes dos pontos' : 'Mostrar nomes de todos os pontos'}</button>
          <p className="small muted" style={{ margin: '10px 4px 0' }}>Selecione um osso para ver os acidentes ósseos. Toque no ponto ou no nome para ver a explicação.</p>
        </div>
      )}
    </>
  );
}
