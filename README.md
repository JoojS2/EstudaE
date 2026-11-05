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


## Estudaê 8.0 — tema escuro e cinco alternativas
- O botão **Modo escuro / Modo claro** aparece no cabeçalho e salva a preferência no navegador. Na primeira visita, respeita o tema do sistema.
- As **328 questões prontas** de Matemática, Física, Geografia, Biologia e História agora têm **cinco alternativas (A–E)**, tanto na revisão quanto nas Partys.
- Os formulários de novas perguntas pessoais também aceitam cinco alternativas.
- **Compatibilidade:** questões pessoais antigas com quatro alternativas continuam funcionando e não são alteradas automaticamente, para evitar inventar respostas incorretas. Você pode recriá-las com cinco opções.
- **Revisão editorial recomendada:** a quinta alternativa das questões prontas foi adicionada automaticamente, com verificação de duplicatas e preservação do índice correto. Revise a qualidade pedagógica dos distratores antes de uso em provas.
- **Importante:** ao atualizar seu projeto, mantenha a URL real do Render em `config.js`. O ZIP traz o endereço de exemplo.
