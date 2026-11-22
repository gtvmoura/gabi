import { useEffect, useState } from 'react';
import { rt, useStore } from '../store';
import { LAYERS, type LayerState } from '../engine/palette';
import type { ViewName } from '../engine/Engine';
import { Icon } from './icons';

const VIEWS: [ViewName, string][] = [['anterior', 'Anterior'], ['posterior', 'Posterior'], ['superior', 'Superior'], ['direita', 'Lateral D'], ['esquerda', 'Lateral E'], ['inferior', 'Inferior']];

export function Toolbar() {
  const [open, setOpen] = useState<null | 'camadas' | 'vistas'>(null);
  const layers = useStore((s) => s.layers);
  const side = useStore((s) => s.side);
  const hidden = useStore((s) => s.hidden);
  const pinLabels = useStore((s) => s.pinLabels);
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
        </div>
        {hidden.length > 0 && (
          <div className="grp glass">
            <button className="tbtn on" onClick={() => st.undoHide()} aria-label="Desfazer ocultar"><Icon n="desfazer" /></button>
          </div>
        )}
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
          <h4>Acidentes ósseos</h4>
          <button className={'btn block' + (pinLabels ? ' on' : '')} onClick={() => useStore.setState({ pinLabels: !pinLabels })}><Icon n="pino" size={17} />{pinLabels ? 'Ocultar nomes dos pontos' : 'Mostrar nomes de todos os pontos'}</button>
          <p className="small muted" style={{ margin: '10px 4px 0' }}>Selecione um osso para ver os pontos rosa dos acidentes. Toque num ponto para ver o nome.</p>
        </div>
      )}
    </>
  );
}
