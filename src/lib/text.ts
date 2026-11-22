export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const shuffle = <T,>(a: T[]): T[] => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
export const sample = <T,>(a: T[], n: number): T[] => shuffle(a).slice(0, n);
export const paragraphs = (t?: string) => (t ?? '').split(/\n{2,}/).map((x) => x.trim()).filter(Boolean);
