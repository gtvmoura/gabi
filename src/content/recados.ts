import { aplicarTema, ehGabi, primeiroNome, type Tema } from '../perfil';
import { useStore } from '../store';

// ─────────────────────────────────────────────────────────────────────────────
//  PERSONALIZE AQUI 💛
//  Este arquivo guarda os textos carinhosos do app. Edite à vontade: troque as
//  mensagens, coloque seu nome na assinatura, invente recados novos.
// ─────────────────────────────────────────────────────────────────────────────

export const PERFIL = {
  nome: 'Gabi',
  appNome: 'Atlas da Gabi',
  assinatura: 'Com todo o meu carinho',   // ex.: 'Com amor, Fulano'
};

export const BOAS_VINDAS = {
  titulo: 'Oi, Gabi 💛',
  texto: [
    'Este atlas foi feito só pra você.',
    'Aqui dá pra girar o corpo inteiro, tocar em cada músculo, osso, ligamento e nervo, e ver origem, inserção, inervação, ação e a parte clínica — tudo em português, do jeito que cai na faculdade.',
    'Estude no seu ritmo. Eu sei que você vai ser uma fisioterapeuta incrível.',
  ],
};

/** Recados que aparecem quando ela bate uma marca. `quando` é avaliado em Progresso.tsx. */
export const RECADOS: { id: string; titulo: string; texto: string; quando: { tipo: 'estudados' | 'sequencia' | 'quizCertos' | 'cartoes'; n: number } }[] = [
  { id: 'e10', quando: { tipo: 'estudados', n: 10 }, titulo: '10 estruturas estudadas!', texto: 'Começou! Cada estrutura que você aprende é um paciente que você vai ajudar melhor lá na frente. Orgulho de você. 💛' },
  { id: 'e50', quando: { tipo: 'estudados', n: 50 }, titulo: '50 estruturas!', texto: 'Cinquenta! Você já sabe mais anatomia do que eu vou saber a vida inteira. Continua, tá lindo de ver.' },
  { id: 'e150', quando: { tipo: 'estudados', n: 150 }, titulo: '150 estruturas!', texto: 'A essa altura o corpo humano já não tem muito segredo pra você. Que orgulho, de verdade.' },
  { id: 'e300', quando: { tipo: 'estudados', n: 300 }, titulo: '300 estruturas!', texto: 'Trezentas. Você é imparável. Quando for a fisio mais requisitada da cidade, lembra de mim. 😄' },
  { id: 's3', quando: { tipo: 'sequencia', n: 3 }, titulo: '3 dias seguidos', texto: 'Três dias firmes! Constância é o que faz a diferença — e você tem de sobra.' },
  { id: 's7', quando: { tipo: 'sequencia', n: 7 }, titulo: 'Uma semana inteira!', texto: 'Sete dias seguidos estudando. Hoje você merece um descanso (e um doce). Eu pago.' },
  { id: 's30', quando: { tipo: 'sequencia', n: 30 }, titulo: '30 dias seguidos!', texto: 'Um mês sem falhar um dia. Eu não tenho palavras — só admiração.' },
  { id: 'q25', quando: { tipo: 'quizCertos', n: 25 }, titulo: '25 acertos no quiz', texto: 'Vinte e cinco respostas certas. A prova que se cuide.' },
  { id: 'q100', quando: { tipo: 'quizCertos', n: 100 }, titulo: '100 acertos!', texto: 'Cem acertos! Você está voando. Vai com tudo.' },
  { id: 'c50', quando: { tipo: 'cartoes', n: 50 }, titulo: '50 flashcards revisados', texto: 'Cinquenta cartões revisados. Repetição espaçada funciona — e você está fazendo direitinho.' },
];

// ─────────────────────────────────────────────────────────────────────────────
//  PERFIS
//  Tudo acima é da Gabi e vale só para ela. Quem entra com outro nome recebe a
//  versão neutra abaixo: sem recados pessoais, sem assinatura, sem gênero suposto.
// ─────────────────────────────────────────────────────────────────────────────

export type Recado = (typeof RECADOS)[number];

export interface Perfil {
  gabi: boolean;        // true só para a Gabi: libera recados carinhosos, 💛 e assinatura
  tema: Tema;           // o mesmo valor de <html data-tema>
  nome: string;         // primeiro nome para exibir ('' enquanto o portão está aberto)
  inicial: string;      // letra da marca
  appNome: string;
  arquivo: string;      // prefixo dos arquivos salvos (imagem, cópia de segurança)
  assinatura: string;   // '' fora do perfil da Gabi
  mimo: string;         // ' 💛' para a Gabi, '' para os demais: sufixo de frases comemorativas
  boasVindas: { titulo: string; texto: string[] };
  recados: Recado[];
}

const APP_NEUTRO = 'Atlas de Anatomia';

/** Mesmos ids e marcas de RECADOS, em tom sóbrio: um fato de estudo ou o próximo passo. */
export const RECADOS_NEUTROS: Recado[] = [
  { id: 'e10', quando: { tipo: 'estudados', n: 10 }, titulo: '10 estruturas estudadas', texto: 'Um bom começo. O que foi visto hoje fixa melhor se for revisto em até um dia: os flashcards da aba Treinar marcam essa revisão sozinhos.' },
  { id: 'e50', quando: { tipo: 'estudados', n: 50 }, titulo: '50 estruturas estudadas', texto: 'Com cinquenta estruturas já dá para estudar por região em vez de item por item. Os Roteiros percorrem cada região passo a passo.' },
  { id: 'e150', quando: { tipo: 'estudados', n: 150 }, titulo: '150 estruturas estudadas', texto: 'Base sólida. A partir daqui rende mais relacionar do que acumular: para cada músculo, ligue inervação, ação e o movimento que ele produz na aba Movimentos.' },
  { id: 'e300', quando: { tipo: 'estudados', n: 300 }, titulo: '300 estruturas estudadas', texto: 'Trezentas estruturas. Vale colocar esse repertório à prova nos casos clínicos da aba Treinar, que pedem raciocínio em vez de memória.' },
  { id: 's3', quando: { tipo: 'sequencia', n: 3 }, titulo: '3 dias seguidos', texto: 'Três dias seguidos. Sessões curtas e diárias retêm mais do que uma sessão longa por semana, então o ritmo importa mais que a duração.' },
  { id: 's7', quando: { tipo: 'sequencia', n: 7 }, titulo: '7 dias seguidos', texto: 'Uma semana completa. Bom momento para abrir a aba Progresso e ver quais regiões ainda estão para trás.' },
  { id: 's30', quando: { tipo: 'sequencia', n: 30 }, titulo: '30 dias seguidos', texto: 'Um mês sem interrupção. O hábito está formado; daqui em diante o ganho vem de insistir nas estruturas que mais geram erro.' },
  { id: 'q25', quando: { tipo: 'quizCertos', n: 25 }, titulo: '25 acertos no quiz', texto: 'Vinte e cinco respostas certas. As erradas ensinam mais: elas ficam listadas em Progresso, em “Mais erradas no quiz”.' },
  { id: 'q100', quando: { tipo: 'quizCertos', n: 100 }, titulo: '100 acertos no quiz', texto: 'Cem acertos. Se uma região já parece fácil, troque a região ou o modo do quiz: é a dificuldade que faz a memória trabalhar.' },
  { id: 'c50', quando: { tipo: 'cartoes', n: 50 }, titulo: '50 flashcards revisados', texto: 'Cinquenta revisões. A repetição espaçada alonga o intervalo a cada acerto, então os cartões que voltam cedo são exatamente os que precisam de atenção.' },
];

const PERFIL_GABI: Perfil = {
  gabi: true, tema: 'gabi', nome: PERFIL.nome, inicial: PERFIL.nome.charAt(0), appNome: PERFIL.appNome, arquivo: 'atlas-da-gabi',
  assinatura: PERFIL.assinatura, mimo: ' 💛', boasVindas: BOAS_VINDAS, recados: RECADOS,
};

/** Perfil a partir do nome salvo em prog.nome. Função pura: serve fora de componentes também. */
export function perfilAtual(nome?: string | null): Perfil {
  if (ehGabi(nome)) return PERFIL_GABI;
  const p = primeiroNome(nome);
  const n = p.charAt(0).toLocaleUpperCase('pt-BR') + p.slice(1);
  return {
    gabi: false, tema: 'atlas', nome: n, inicial: n.charAt(0) || 'A', appNome: APP_NEUTRO, arquivo: 'atlas-anatomia',
    assinatura: '', mimo: '',
    boasVindas: {
      titulo: n ? `Olá, ${n}` : 'Olá',
      texto: [
        'Este é um atlas 3D de anatomia para estudar Fisioterapia.',
        'Gire o corpo inteiro e toque em qualquer músculo, osso, ligamento ou nervo para ver origem, inserção, inervação, ação e a parte clínica, tudo em português.',
        'Para fixar, há roteiros por região, quiz, flashcards com repetição espaçada e casos clínicos. O seu progresso fica salvo neste aparelho.',
      ],
    },
    recados: RECADOS_NEUTROS,
  };
}

/** Perfil reativo para componentes. */
export function usePerfil(): Perfil {
  const nome = useStore((s) => s.prog.nome);
  return perfilAtual(nome);
}

/** Tema, título da aba e metas do <head> conforme o perfil. Roda antes do primeiro render e a cada troca de nome. */
export function aplicarPerfil(nome?: string | null): void {
  aplicarTema(nome);
  const p = perfilAtual(nome);
  document.title = p.appNome;
  const meta = (name: string, v: string) => document.querySelector(`meta[name="${name}"]`)?.setAttribute('content', v);
  meta('apple-mobile-web-app-title', p.appNome);
  meta('description', p.gabi ? 'Atlas 3D de anatomia para Fisioterapia — feito para a Gabi.' : 'Atlas 3D de anatomia para Fisioterapia.');
}
