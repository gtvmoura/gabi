// Movimento do tema "atlas". Tudo aqui é inerte no tema original (perfil da Gabi): os hooks não tocam no DOM.
// As curvas e durações espelham os tokens --at-ease-out / --at-dur-* de tema-atlas.css.
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { usePerfil } from '../content/recados';

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

export const semMovimento = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** O corpo do painel que está à vista (a aba mantida por trás da ficha fica com display: none). */
const corpoVisivel = (): HTMLElement | null => [...document.querySelectorAll<HTMLElement>('.panel .pbody')].find((el) => el.offsetParent !== null) ?? null;

/**
 * Troca de conteúdo dentro do painel (outra pergunta, outro cartão, outra estrutura): quando `chave` muda, o corpo
 * volta ao topo (o React reaproveita o mesmo nó e a rolagem antiga ficava) e o conteúdo novo entra com um fade curto,
 * só de opacidade. Não roda na montagem nem bloqueia toque.
 */
export function useTroca(chave: unknown): void {
  const { gabi } = usePerfil();
  const antes = useRef(chave);
  useLayoutEffect(() => {
    if (antes.current === chave) return;
    antes.current = chave;
    if (gabi || chave == null) return;
    const corpo = corpoVisivel();
    if (!corpo) return;
    corpo.scrollTop = 0;
    for (const el of [corpo, corpo.previousElementSibling?.querySelector('.ttl')]) el?.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 140, easing: EASE_OUT });
  }, [chave, gabi]);
}

/**
 * Saída animada sem biblioteca: devolve o último valor por mais `ms` depois que ele some, com `saindo: true`,
 * para o CSS fazer a transição de saída (classe .saindo). Se o valor volta no meio, a saída é cancelada.
 * Com `ativo` falso (tema original) o valor some na hora, como sempre foi.
 */
export function useSaida<T>(valor: T | null | undefined | false, ms: number, ativo: boolean): { item: T | null; saindo: boolean } {
  const [ultimo, setUltimo] = useState<T | null>(valor || null);
  if (valor && valor !== ultimo) setUltimo(valor);
  useEffect(() => {
    if (valor || ultimo === null) return;
    const t = setTimeout(() => setUltimo(null), ativo ? ms : 0);
    return () => clearTimeout(t);
  }, [valor, ultimo, ms, ativo]);
  if (valor) return { item: valor, saindo: false };
  return ativo && ultimo !== null ? { item: ultimo, saindo: true } : { item: null, saindo: false };
}

/** Ao entrar na tela, as barras de progresso crescem uma vez até o valor (escala, sem mexer em layout). */
export function useCrescer(ref: RefObject<HTMLElement | null>): void {
  const { gabi } = usePerfil();
  useEffect(() => {
    if (gabi || semMovimento()) return;
    ref.current?.querySelectorAll<HTMLElement>('.bar > i').forEach((el, i) => {
      // atrasos que encurtam (0, 48, 82, 105…): leem como uma onda, não como um metrônomo; o total fica abaixo de 160 ms
      el.animate?.([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 420, delay: 160 * (1 - 0.7 ** i), easing: EASE_OUT, fill: 'backwards' });
    });
  }, []);
}
