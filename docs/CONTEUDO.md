# Formato do conteúdo de estudo

Todo o conteúdo fica em `src/content/data/*.json`, em **português do Brasil**, seguindo a
Terminologia Anatômica adotada pela Sociedade Brasileira de Anatomia (ex.: *supraespinal*,
*fibular*, *isquiático*, *patela*, *tálus*, *escápula*, *nervo fibular comum*, *músculo redondo maior*).
Quando um termo antigo ainda é muito usado em clínica, ele entra em `sinonimos`
(ex.: "supraespinhoso", "peroneiro", "ciático").

Regras gerais

- `key` é sempre o nome **exato** em inglês usado no modelo 3D (listas de estruturas). Não invente chaves.
- Texto simples, sem Markdown. Parágrafos separados por `\n\n`.
- Conteúdo de nível de graduação em Fisioterapia: preciso, objetivo, clinicamente útil.
  Na dúvida entre fontes, siga Moore (Anatomia Orientada para a Clínica), Netter, Kendall
  (Provas e Funções Musculares), Kapandji, Magee (Avaliação Musculoesquelética) e Neumann (Cinesiologia).
- Nunca invente dados. Se um campo não se aplica, omita-o.

## Músculo (`muscles-*.json` → array)

```json
{
  "key": "Biceps brachii muscle",
  "pt": "Músculo bíceps braquial",
  "latim": "Musculus biceps brachii",
  "sinonimos": ["bíceps"],
  "resumo": "Uma ou duas frases: o que é, onde fica, por que importa.",
  "origem": "…",
  "insercao": "…",
  "inervacao": { "nervo": "Nervo musculocutâneo", "raizes": "C5, C6", "nervoKeys": ["Musculocutaneous nerve"] },
  "vascularizacao": "Artéria braquial",
  "acoes": [
    { "art": "cotovelo", "mov": "flexao", "papel": "primario", "nota": "mais eficiente com o antebraço supinado" },
    { "art": "radioulnar", "mov": "supinacao", "papel": "primario" },
    { "art": "ombro", "mov": "flexao", "papel": "secundario" }
  ],
  "funcao": "Texto corrido: ação concêntrica, papel excêntrico/estabilizador, função em cadeia fechada, importância funcional (marcha, AVDs).",
  "antagonistas": ["Triceps brachii muscle"],
  "sinergistas": ["Brachialis muscle", "Brachioradialis muscle"],
  "palpacao": "Como localizar e palpar.",
  "teste": "Prova de função muscular (posição, estabilização, resistência).",
  "alongamento": "Posição de alongamento.",
  "clinica": "Lesões, síndromes, pontos de atenção para o fisioterapeuta.",
  "dica": "Mnemônico ou macete (opcional).",
  "camada": "superficial",
  "partes": [
    { "key": "Long head of biceps brachii", "pt": "Cabeça longa", "origem": "Tubérculo supraglenoidal da escápula", "nota": "…" },
    { "key": "Short head of biceps brachii", "pt": "Cabeça curta", "origem": "Processo coracoide da escápula" }
  ]
}
```

- Se o músculo aparece na lista como `[GRUPO]` com folhas (cabeças/partes), a entrada usa a `key`
  do grupo e lista **todas** as folhas em `partes` (cada parte pode ter `origem`, `insercao`, `acoes`, `nota`).
- Toda folha muscular da lista precisa estar coberta: como entrada própria ou dentro de `partes`.
- `camada`: `superficial` | `intermediaria` | `profunda`.
- `nervoKeys`, `antagonistas`, `sinergistas`: chaves exatas (músculos/nervos) quando existirem nas listas.

### Vocabulário de `acoes`

`art` (articulação/complexo):
`ombro`, `escapula`, `cotovelo`, `radioulnar`, `punho`, `dedos_mao` (MCF/IF dos dedos 2–5), `polegar`,
`quadril`, `joelho`, `tornozelo`, `subtalar` (inversão/eversão), `dedos_pe`, `halux`,
`cervical` (cabeça e pescoço), `tronco` (coluna toracolombar), `costelas` (respiração), `pelve`, `atm`,
`face`, `hioide_laringe`, `olho`, `assoalho_pelvico`.

`mov`:
`flexao`, `extensao`, `abducao`, `aducao`, `rot_medial`, `rot_lateral`, `abducao_horizontal`, `aducao_horizontal`,
`circunducao`, `elevacao`, `depressao`, `protracao`, `retracao`, `rot_superior`, `rot_inferior`, `inclinacao_anterior`,
`pronacao`, `supinacao`, `desvio_radial`, `desvio_ulnar`, `oposicao`, `reposicao`,
`dorsiflexao`, `flexao_plantar`, `inversao`, `eversao`,
`flexao_lateral`, `rotacao_ipsilateral`, `rotacao_contralateral`,
`inspiracao`, `expiracao_forcada`, `compressao_abdominal`,
`anteversao`, `retroversao`, `elevacao_pelve`,
`protrusao`, `retrusao`, `lateralidade`, `estabilizacao`, `expressao`, `outro`.

`papel`: `primario` (motor primário/agonista) | `secundario` (auxiliar/sinergista).

## Osso (`bones-*.json` → array)

```json
{
  "key": "Humerus", "pt": "Úmero", "latim": "Humerus", "tipo": "longo",
  "resumo": "…", "descricao": "Parágrafos sobre epífises, diáfise, faces, relações.",
  "articulacoes": ["Glenoumeral — com a cavidade glenoidal da escápula", "…"],
  "acidentes": [ { "key": "Greater tubercle", "pt": "Tubérculo maior", "nota": "Inserção de supraespinal, infraespinal e redondo menor." } ],
  "palpacao": "…", "clinica": "…"
}
```

`acidentes` deve trazer **todos** os acidentes (linhas com `·`) listados para aquele osso, com `pt` revisado;
`nota` é obrigatória para os acidentes relevantes (inserções, palpação, clínica) e opcional nos demais.

## Articulação (`joints.json` → `{ "articulacoes": [...], "ligamentos": [...] }`)

```json
{
  "key": "Shoulder joint", "pt": "Articulação do ombro (glenoumeral)", "art": "ombro",
  "tipo": "Sinovial esferoide (triaxial)", "graus": 3,
  "resumo": "…", "superficies": "…",
  "movimentos": [ { "mov": "flexao", "adm": "0–180°", "plano": "sagital", "eixo": "laterolateral", "nota": "…" } ],
  "estabilidade": "…", "posicaoRepouso": "…", "posicaoFechada": "…", "padraoCapsular": "…",
  "sensacaoFinal": "…", "clinica": "…"
}
```
Ligamento/estrutura articular: `{ "key": "…", "pt": "…", "funcao": "o que limita/estabiliza", "clinica": "opcional" }`.

## Nervo (`nerves.json` → array)

`{ "key", "pt", "raizes", "origem", "trajeto", "motor", "sensitivo", "lesao", "resumo" }`

## Mapas de nomes (`names-*.json`)

Objeto simples `{ "English name": "Nome em português" }`.

## Outras estruturas (`structures-*.json` → array)

Para bolsas, fáscias, retináculos, vasos, órgãos e demais estruturas que merecem descrição:

`{ "key": "Subacromial bursa", "pt": "Bolsa subacromial", "latim": "Bursa subacromialis", "resumo": "O que é, onde fica e função.", "clinica": "opcional" }`

## Testes clínicos (`clinical-tests.json` → array)

`{ "id": "neer", "nome": "Teste de Neer", "art": "ombro", "objetivo": "…", "estruturas": ["Supraspinatus muscle", "Subacromial bursa"], "posicao": "…", "execucao": "…", "positivo": "…", "observacao": "…" }`

## Roteiros de estudo (`study-guides.json` → array)

`{ "id": "manguito-rotador", "titulo": "Manguito rotador", "regiao": "ombro", "resumo": "…", "texto": "Parágrafos…", "pontos": ["…"], "estruturas": ["Supraspinatus muscle", "…"], "perguntas": [ { "q": "…", "a": "…" } ] }`
