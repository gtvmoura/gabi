import type { ReactNode } from 'react';

const P: Record<string, ReactNode> = {
  atlas: <><circle cx="12" cy="5" r="2.2" /><path d="M12 7.5v7M7 10l5 1 5-1M9 21l3-6.5 3 6.5" /></>,
  explorar: <><path d="M4 6h16M4 12h10M4 18h13" /><circle cx="19" cy="12" r="1.4" /></>,
  roteiros: <><path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M9 8h6M9 12h6" /></>,
  movimentos: <><path d="M4 14a8 8 0 0 1 14-5" /><path d="M18 4v5h-5" /><path d="M20 12a8 8 0 0 1-14 5" /><path d="M6 20v-5h5" /></>,
  clinica: <><path d="M9 3h6v4h4v6h-4v4H9v-4H5V7h4z" transform="translate(0 2)" /></>,
  treinar: <><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.3 6-5.4-3.1L6.6 19.4l1.3-6L3.4 9.3l6-.7z" /></>,
  progresso: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  busca: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>,
  camadas: <><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></>,
  olho: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  olhoOff: <><path d="M3 3l18 18M10.6 5.2A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.3 6.6C3.6 8.5 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.3-1" /></>,
  isolar: <><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>,
  desfazer: <><path d="M9 7L4 12l5 5" /><path d="M4 12h10a6 6 0 0 1 0 12" transform="translate(0 -4)" /></>,
  casa: <><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>,
  fechar: <><path d="M6 6l12 12M18 6L6 18" /></>,
  seta: <><path d="M9 6l6 6-6 6" /></>,
  voltar: <><path d="M15 6l-6 6 6 6" /></>,
  estrela: <><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.3 6-5.4-3.1L6.6 19.4l1.3-6L3.4 9.3l6-.7z" /></>,
  check: <><path d="M5 12.5l4.5 4.5L19 7.5" /></>,
  alvo: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></>,
  mais: <><path d="M12 5v14M5 12h14" /></>,
  menos: <><path d="M5 12h14" /></>,
  pino: <><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.800 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.4" /></>,
  nota: <><path d="M4 20h4L19 9l-4-4L4 16z" /></>,
  coracao: <><path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.600 4.300 4.300 0 0 1 19.500 10c0 5.400-7.500 10-7.500 10z" /></>,
  cartas: <><rect x="4" y="6" width="13" height="15" rx="2" /><path d="M8 3h10a2 2 0 0 1 2 2v13" /></>,
  fogo: <><path d="M12 3c1 4 5 5.500 5 10a5 5 0 0 1-10 0c0-2 1-3 1.500-4.500C10 9.500 11.500 6 12 3z" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.500v.5" /></>,
  play: <><path d="M8 5.5v13l10.5-6.5z" /></>,
  pausa: <><path d="M8 5v14M16 5v14" /></>,
  som: <><path d="M4 10v4h4l5 4V6L8 10z" /><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11" /></>,
  tesoura: <><path d="M4 12h16" strokeDasharray="3 3" /><path d="M7 5l10 14M17 5L7 19" opacity=".0" /><rect x="6" y="4" width="12" height="16" rx="3" /></>,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  painel: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M14 4v16" /></>,
};

export function Icon({ n, size = 20 }: { n: string; size?: number }) {
  return (
    <svg className="ico" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {P[n] ?? null}
    </svg>
  );
}
