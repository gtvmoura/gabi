import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './tema-atlas.css';
import { useStore } from './store';
import { aplicarPerfil } from './content/recados';
import { App } from './ui/App';

// tema, título e metas saem do nome salvo antes do primeiro render (o persist lê o localStorage na hora)
aplicarPerfil(useStore.getState().prog.nome);
useStore.subscribe((s, prev) => { if (s.prog.nome !== prev.prog.nome) aplicarPerfil(s.prog.nome); });

createRoot(document.getElementById('root')!).render(<App />);
void StrictMode;
