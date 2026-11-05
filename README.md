# Estudaê 7.0 — revisão e Partys no mesmo banco

- Layout mais leve, paleta verde-sálvia, cartões e navegação responsivos.
- Revisão principal: seleção de uma ou várias matérias, 10/20/30/45/60 perguntas.
- Revisão e Party utilizam o mesmo arquivo `question-bank.json` para perguntas prontas.
- Banco ampliado com questões de conceitos variados, especialmente em matemática.
- Questões vistas recentemente são priorizadas por último nas próximas revisões no mesmo navegador.
- Questões personalizadas continuam no gerenciador e podem ser incluídas na revisão.
- As Partys mantêm suas funções de salas, cronômetro e revelação sincronizada.

## Publicação
Copie os arquivos para seu clone do GitHub e preserve o endereço do Render em `config.js`.
Envie com `git add .`, `git commit -m "Estudae 7.0"` e `git push origin main`.
Verifique o deploy da Vercel e faça deploy do Render se necessário.

## Atenção
A revisão depende de o navegador carregar `question-bank.json` via HTTP/HTTPS. Abra pelo site publicado ou servidor local, não por `file://`.
Questões devem ser revisadas pedagogicamente antes de avaliações oficiais.

## Banco atual
- Matemática: 68 questões
- Física: 65 questões
- Geografia: 65 questões
- Biologia: 65 questões
- História: 65 questões
