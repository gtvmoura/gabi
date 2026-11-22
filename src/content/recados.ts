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
