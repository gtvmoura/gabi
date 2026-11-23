# Atlas da Gabi 💛

Atlas 3D de anatomia para estudar Fisioterapia no tablet — feito de presente para a Gabi.

Funciona no navegador (iPad, Android, computador), pode ser instalado na tela de início e usado sem internet.

## O que tem

- **Atlas 3D do corpo inteiro** — 1.814 estruturas: ossos, músculos, ligamentos, cápsulas, nervos, artérias, veias, órgãos, encéfalo, linfonodos e pele. Gire, aproxime, toque para selecionar, oculte camada por camada.
- **Sistemas do corpo** — esquelético, articular, muscular, nervoso, cardiovascular, linfático, respiratório, digestório, urinário, genital (só masculino no modelo de base), endócrino e tegumentar: cada um isolado, centralizado e combinável com outros, com funções, relevância para a fisioterapia e lista navegável das partes.
- **Peças no centro da tela** — coração, encéfalo, pulmões, fígado, rins, olho, laringe, medula, crânio, coluna, tórax, pelve, ombro, cotovelo, mão, quadril, joelho, pé e ATM ficam sozinhos e fixos no centro; a rotação gira em volta deles. Qualquer estrutura selecionada também pode ser centralizada (botão de alvo ou “Isolar no centro”).
- **Ficha de cada músculo** (188 fichas): origem, inserção, inervação com raízes, vascularização, ações, função, palpação, prova de função, alongamento, clínica e macetes.
- **Origem e inserção no osso** — as áreas aparecem pintadas (vermelho/azul) direto no esqueleto; e o "mapa de inserções" de cada osso mostra todos os músculos que se fixam nele.
- **Ossos com acidentes ósseos** — mais de 550 acidentes marcados com pontos no 3D, com nome e para que servem.
- **Articulações** — tipo, amplitude de movimento (goniometria), posição de repouso e fechada, padrão capsular, ligamentos.
- **Movimentos** — escolha a articulação e o movimento e veja no 3D os motores primários e auxiliares.
- **Movimento em 3D** — 50 movimentos animados (ombro com ritmo escapuloumeral, escápula, cotovelo, pronação/supinação, punho, dedos, quadril, joelho, tornozelo, subtalar, coluna cervical e toracolombar, respiração e ATM): os ossos se movem, os músculos aparecem como elásticos de origem → inserção mostrando quem encurta e quem alonga, com goniômetro, controle de ângulo e antagonistas.
- **Nervos** — raízes, trajeto, território motor e sensitivo, quadro de lesão; território motor destacado no 3D. Tabelas de dermátomos, miótomos, reflexos e plexos.
- **Clínica** — 100 testes ortopédicos/neurológicos com execução e interpretação, e as 8 fases da marcha com os músculos ativos.
- **Roteiros de estudo** — 38 temas (manguito rotador, plexo braquial, ligamentos do joelho, core…) com texto, pontos-chave e perguntas.
- **Quiz** — identificar estruturas, encontrar no 3D, inervação, origem/inserção e ações.
- **Acerte a estrutura** — o 3D destaca e ela diz o nome (ou toca na estrutura pedida): ossos, acidentes ósseos, músculos, ligamentos, nervos, artérias ou órgãos; 10 perguntas ou contra o relógio, com recordes.
- **Faixa “o que ver”** no topo: liga/desliga ossos, músculos, ligamentos, nervos, vasos, órgãos e encéfalo com um toque, e combinações prontas (só ossos, ossos + nervos…).
- **Casos clínicos** — 16 histórias de paciente para ligar a queixa à anatomia, com a resposta destacada no 3D.
- **Quem sou eu?** — jogo de adivinhar o músculo pelas pistas; e o **desafio do dia** com 5 perguntas.
- **Colorir músculos por inervação**, **plano de corte** (sagital, frontal, transversal), **ouvir a ficha** em voz alta, ver **sinergistas e antagonistas** no 3D e **salvar imagem** da vista.
- **Músculo do dia** e **contagem regressiva para a prova** na tela inicial.
- **Flashcards com repetição espaçada** (músculos por região, ligamentos, nervos, articulações, acidentes ósseos, testes e roteiros), anotações pessoais, favoritos, progresso e sequência de dias.

## Personalizar os recados

Os textos carinhosos (boas-vindas, assinatura e recados de conquistas) ficam em [`src/content/recados.ts`](src/content/recados.ts).

## Rodar e publicar

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # gera a pasta dist/ (site estático)
```

`dist/` é um site estático: funciona em GitHub Pages, Vercel, Netlify ou qualquer hospedagem.
O workflow em `.github/workflows/pages.yml` publica no GitHub Pages (ative em *Settings → Pages → Source: GitHub Actions*).

## Como os modelos 3D são gerados

1. `scripts/blender/export.py` — abre o arquivo do Z-Anatomy no Blender (módulo `bpy`) e exporta um GLB por sistema e um manifesto.
2. `scripts/optimize-models.mjs` — simplifica e comprime (meshopt) para `public/models/`.
3. `scripts/build-manifest.mjs` — gera `public/data/manifest.json` (nomes, lados, inserções, acidentes ósseos).

O conteúdo de estudo fica em `src/content/data/*.json`; o formato está em [`docs/CONTEUDO.md`](docs/CONTEUDO.md).

## Créditos e licença

- Modelos 3D: [Z-Anatomy](https://www.z-anatomy.com/) (Gauthier Kervyn e colaboradores), derivado de BodyParts3D © The Database Center for Life Science — CC BY-SA 4.0 / CC BY-SA 2.1 JP. Os modelos e dados derivados deste repositório seguem a mesma licença (CC BY-SA 4.0).
- Textos de apoio em inglês: Wikipedia (CC BY-SA), via Z-Anatomy.

O conteúdo em português é material de estudo e pode conter imprecisões; não substitui livro-texto, professor ou avaliação profissional.
