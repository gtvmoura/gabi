import { useState, type FormEvent } from 'react';
import { limparNome } from '../perfil';
import { useStore } from '../store';

/** Primeira abertura: pergunta o primeiro nome. Fica por cima de tudo enquanto o 3D carrega por trás. */
export function Portao() {
  const [v, setV] = useState('');
  const nome = limparNome(v);
  const enviar = (e: FormEvent) => { e.preventDefault(); if (nome) useStore.getState().patchProg(() => ({ nome })); };
  return (
    <div className="portao" role="dialog" aria-modal="true" aria-labelledby="portao-rotulo">
      <form className="portao-form" onSubmit={enviar}>
        <label className="portao-rotulo" id="portao-rotulo" htmlFor="portao-nome">Como você se chama?</label>
        <input id="portao-nome" className="portao-campo" type="text" name="nome" value={v} onChange={(e) => setV(e.target.value)} maxLength={30} placeholder="Seu primeiro nome"
          autoFocus autoComplete="given-name" autoCapitalize="words" autoCorrect="off" spellCheck={false} enterKeyHint="done" />
        <button className="portao-botao" type="submit" disabled={!nome}>Continuar</button>
      </form>
    </div>
  );
}
