import { useEffect, useRef, useState } from 'react';
import { rt, useStore } from '../store';
import { mapaInervacao } from '../lib/inervacao';
import { Icon } from './icons';
import { DEFAULT_LAYERS, LAYERS, type LayerId, type LayerState } from '../engine/palette';

/** Legenda do modo "colorir por inervação". */
export function LegendaInervacao() {
  const on = useStore((s) => s.colorMode === 'inervacao');
  if (!on || !rt.m) return null;
  const { grupos } = mapaInervacao(rt.m);
  return (
    <div className="legenda glass">
      <b>Inervação</b>
      {grupos.slice(0, 20).map((g) => (
        <button key={g.nome} onClick={() => useStore.getState().setFocus({ ids: g.sis.map((s) => [s, g.cor]), others: 'ghost', label: g.nome })}><i className="dot" style={{ background: g.cor }} />{g.nome.replace(/^Nervos? /, '')} <span className="muted">{g.n}</span></button>
      ))}
      <button onClick={() => useStore.setState({ colorMode: 'normal' })} aria-label="Fechar"><Icon n="fechar" size={14} /></button>
    </div>
  );
}

/** Confete discreto para as conquistas. */
export function Confete() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!; const ctx = c.getContext('2d')!;
    const w = (c.width = window.innerWidth), h = (c.height = window.innerHeight);
    const cores = ['#ff7aa8', '#ffe066', '#39c2f0', '#4ade80', '#c94bd6', '#ffffff'];
    const ps = Array.from({ length: 130 }, () => ({ x: Math.random() * w, y: -20 - Math.random() * h * 0.5, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4, r: 4 + Math.random() * 5, a: Math.random() * 6, c: cores[Math.floor(Math.random() * cores.length)] }));
    let raf = 0; const t0 = performance.now();
    const loop = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) { p.x += p.vx; p.y += p.vy; p.a += 0.12; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); }
      if (performance.now() - t0 < 4500) raf = requestAnimationFrame(loop); else ctx.clearRect(0, 0, w, h);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }} />;
}

/** Lê um texto em voz alta (português do Brasil). */
export function Ouvir({ texto }: { texto: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, [texto]);
  useEffect(() => { setOn(false); }, [texto]);
  if (!('speechSynthesis' in window)) return null;
  const tocar = () => {
    const ss = window.speechSynthesis;
    if (on) { ss.cancel(); setOn(false); return; }
    ss.cancel();
    const voz = ss.getVoices().find((v) => v.lang === 'pt-BR') ?? ss.getVoices().find((v) => v.lang.startsWith('pt'));
    // em blocos curtos: alguns navegadores cortam falas longas
    const partes = (texto.match(/[^.!?]+[.!?]*\s*/g) ?? [texto]).map((p) => p.trim()).filter(Boolean);
    partes.forEach((p, i) => { const u = new SpeechSynthesisUtterance(p); u.lang = 'pt-BR'; if (voz) u.voice = voz; u.rate = 0.98; if (i === partes.length - 1) u.onend = () => setOn(false); u.onerror = () => setOn(false); ss.speak(u); });
    setOn(true);
  };
  return <button className={'btn' + (on ? ' on' : '')} onClick={tocar}><Icon n={on ? 'fechar' : 'som'} size={16} />{on ? 'Parar' : 'Ouvir'}</button>;
}

/** Salva (ou compartilha) uma imagem da vista atual do 3D. */
export async function salvarImagem(titulo: string) {
  const e = rt.engine; if (!e) return;
  const src = e.snapshot();
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(c.width / 2, c.height * 0.35, 0, c.width / 2, c.height * 0.35, Math.max(c.width, c.height) * 0.8);
  grad.addColorStop(0, '#2b3147'); grad.addColorStop(0.6, '#171a26'); grad.addColorStop(1, '#0d0f16');
  g.fillStyle = grad; g.fillRect(0, 0, c.width, c.height);
  g.drawImage(src, 0, 0);
  const k = c.width / 1200;
  g.font = `700 ${Math.round(26 * k)}px system-ui, sans-serif`; g.fillStyle = '#fff'; g.fillText(titulo, 28 * k, c.height - 52 * k);
  g.font = `500 ${Math.round(16 * k)}px system-ui, sans-serif`; g.fillStyle = '#ff7aa8'; g.fillText('Atlas da Gabi', 28 * k, c.height - 26 * k);
  const blob: Blob | null = await new Promise((r) => c.toBlob(r, 'image/png'));
  if (!blob) return;
  const file = new File([blob], 'atlas-da-gabi.png', { type: 'image/png' });
  try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: titulo }); return; } } catch (err) { if ((err as Error)?.name === 'AbortError') return; /* outra falha: cai no download */ }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'atlas-da-gabi.png'; a.click(); URL.revokeObjectURL(a.href);
}

const RAPIDO: LayerId[] = ['ossos', 'musculos', 'ligamentos', 'nervos', 'arterias', 'veias', 'orgaos', 'snc'];
const CURTO: Partial<Record<LayerId, string>> = { ligamentos: 'Ligamentos', arterias: 'Artérias', snc: 'Encéfalo' };
const SO: { nome: string; on: LayerId[]; ghost?: LayerId[] }[] = [
  { nome: 'Só ossos', on: ['ossos'] },
  { nome: 'Ossos + ligamentos', on: ['ossos', 'ligamentos'] },
  { nome: 'Ossos + nervos', on: ['ossos', 'nervos'], ghost: ['musculos'] },
  { nome: 'Ossos + vasos', on: ['ossos', 'arterias', 'veias'], ghost: ['musculos'] },
  { nome: 'Órgãos', on: ['orgaos'], ghost: ['ossos'] },
  { nome: 'Padrão', on: ['ossos', 'musculos'] },
];

/** Faixa "o que ver": liga e desliga as camadas principais com um toque. */
export function VerRapido() {
  const layers = useStore((s) => s.layers);
  const [mais, setMais] = useState(false);
  const aplicar = (p: (typeof SO)[number]) => {
    const l = { ...DEFAULT_LAYERS } as Record<LayerId, LayerState>;
    (Object.keys(l) as LayerId[]).forEach((k) => { l[k] = p.on.includes(k) ? 1 : p.ghost?.includes(k) ? 2 : 0; });
    useStore.setState({ layers: l, hidden: [] }); setMais(false);
  };
  return (
    <div className="rapido">
      <div className="faixa glass">
        {RAPIDO.map((id) => { const L = LAYERS.find((x) => x.id === id)!; const v = layers[id]; return (
          <button key={id} className={v === 1 ? 'on' : v === 2 ? 'meio' : ''} onClick={() => useStore.getState().setLayer(id, v === 0 ? 1 : 0)}><i className="dot" style={{ background: L.cor }} />{CURTO[id] ?? L.nome}</button>
        ); })}
        <button className={mais ? 'on' : ''} onClick={() => setMais(!mais)}>Combinações ▾</button>
      </div>
      {mais && <div className="faixa glass">{SO.map((p) => <button key={p.nome} onClick={() => aplicar(p)}>{p.nome}</button>)}</div>}
    </div>
  );
}
