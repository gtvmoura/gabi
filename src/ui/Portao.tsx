import { useState, type FormEvent } from 'react';
import { limparNome } from '../perfil';
import { useStore } from '../store';

const ACERVO: [string, string][] = [
  ['1.814', 'estruturas no modelo 3D'],
  ['188', 'fichas de músculos'],
  ['50', 'movimentos animados'],
  ['100', 'testes clínicos'],
];

/** Primeira abertura: pergunta o primeiro nome. Fica por cima de tudo enquanto o 3D carrega por trás. */
export function Portao({ carregado = 0, pronto = false }: { carregado?: number; pronto?: boolean }) {
  const [v, setV] = useState('');
  const nome = limparNome(v);
  const enviar = (e: FormEvent) => { e.preventDefault(); if (nome) useStore.getState().patchProg(() => ({ nome })); };
  const pct = Math.round(Math.min(1, Math.max(0, carregado)) * 100);
  return (
    <div className="portao" role="dialog" aria-modal="true" aria-labelledby="portao-rotulo">
      <div className="portao-quadro">
        <div className="portao-marca"><span className="brand" aria-hidden="true">A</span><span>Atlas de Anatomia</span></div>
        <form className="portao-form" onSubmit={enviar}>
          <label className="portao-rotulo" id="portao-rotulo" htmlFor="portao-nome">Como você se chama?</label>
          <p className="portao-ajuda" id="portao-ajuda">Só o primeiro nome. Ele aparece nas saudações e fica salvo apenas neste aparelho.</p>
          <input id="portao-nome" className="portao-campo" type="text" name="nome" value={v} onChange={(e) => setV(e.target.value)} maxLength={30} placeholder="Seu primeiro nome" aria-describedby="portao-ajuda"
            autoFocus autoComplete="given-name" autoCapitalize="words" autoCorrect="off" spellCheck={false} enterKeyHint="done" />
          <button className="portao-botao" type="submit" disabled={!nome}>Continuar</button>
        </form>
        <div className="portao-acervo">
          <p>Atlas 3D para estudar anatomia na Fisioterapia, em português.</p>
          <dl>{ACERVO.map(([n, t]) => <div key={t}><dt>{n}</dt><dd>{t}</dd></div>)}</dl>
        </div>
        <div className="portao-estado" role="status">
          <div className="bar" aria-hidden="true"><i style={{ width: `${pronto ? 100 : pct}%` }} /></div>
          <span>{pronto ? 'Modelo 3D pronto' : `Preparando o modelo 3D… ${pct}%`}</span>
        </div>
      </div>
    </div>
  );
}
