import { useMemo, useState } from 'react';
import { rt, useStore } from '../store';
import { search, type Hit } from '../lib/search';
import { musculos, resolver } from '../content';
import { LAYERS, CAT_LAYER } from '../engine/palette';
import { Icon } from './icons';

/** Abre um resultado de busca (ou qualquer chave) no atlas. */
export function abrirChave(key: string) {
  const m = rt.m!; const st = useStore.getState();
  const si = m.byKey.get(key);
  if (si !== undefined && !(musculos.has(key) && (musculos.get(key)!.partes?.length ?? 0) > 1)) { st.setFocus(null, false); st.select({ si, side: 'both' }); return; }
  const sis = resolver(key, m);
  if (!sis.length) { st.say('Esta estrutura não tem modelo 3D.'); return; }
  if (sis.length === 1) { st.setFocus(null, false); st.select({ si: sis[0], side: 'both' }); return; }
  // grupo ou músculo com várias partes: destaca o conjunto e abre a ficha da primeira parte
  st.setFocus({ ids: sis.map((s) => [s, null]), others: 'ghost', label: (musculos.get(key)?.pt) ?? key }, true);
  if (musculos.has(key)) st.select({ si: sis[0], side: 'both' }, { fly: false });
}

export function Search() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const hits = useMemo(() => (q.trim().length >= 2 && rt.m ? search(rt.m, q) : []), [q]);

  const go = (h: Hit) => {
    const st = useStore.getState(); const m = rt.m!;
    setOpen(false); setQ('');
    (document.activeElement as HTMLElement | null)?.blur();
    if (h.tipo === 'roteiro') { useStore.setState({ sel: null }); st.setTab('roteiros'); window.dispatchEvent(new CustomEvent('abrir-roteiro', { detail: h.key })); return; }
    if (h.tipo === 'teste') { useStore.setState({ sel: null }); st.setTab('clinica'); window.dispatchEvent(new CustomEvent('abrir-teste', { detail: h.key })); return; }
    if (h.tipo === 'acidente' && h.si !== undefined && h.on) {
      const rec = m.meshes[h.on];
      st.setFocus(null, false);
      st.select({ si: h.si, side: rec.d || 'both' });
      setTimeout(() => st.setPin(h.on + '|' + h.key), 50);
      return;
    }
    abrirChave(h.key);
  };

  const cor = (h: Hit) => (h.si !== undefined && rt.m ? LAYERS.find((l) => l.id === CAT_LAYER[rt.m!.structs[h.si!].c])?.cor : h.tipo === 'roteiro' ? '#ff7aa8' : h.tipo === 'teste' ? '#39c2f0' : '#b5473c') ?? '#888';

  return (
    <div className="searchbox">
      <div className="field glass">
        <Icon n="busca" size={18} />
        <input value={q} placeholder="Buscar músculo, osso, nervo…" onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={(e) => { if (e.key === 'Enter' && hits[0]) go(hits[0]); if (e.key === 'Escape') setOpen(false); }} enterKeyHint="search" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
        {q && <button onClick={() => { setQ(''); setOpen(false); }} aria-label="Limpar"><Icon n="fechar" size={16} /></button>}
      </div>
      {open && q.trim().length >= 2 && (
        <div className="results glass">
          {hits.length === 0 && <div className="empty">Nada encontrado para “{q}”.</div>}
          {hits.map((h, i) => (
            <button key={h.tipo + h.key + (h.on ?? '') + i} onClick={() => go(h)}>
              <span className="dot" style={{ background: cor(h) }} />
              <span><div className="nm">{h.nome}</div><div className="sb">{h.sub}</div></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
