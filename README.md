# Estudaê 10.0 — Correções do cronômetro e perguntas surpresa

- Trocar a alternativa na Party não reconstrói a tela nem reinicia o relógio visual.
- O contador mostra imediatamente o tempo restante calculado a partir do prazo fixado pelo servidor.
- A lista de perguntas sorteadas foi substituída por um resumo da quantidade de perguntas.
- O servidor só transmite o enunciado e as alternativas da questão atual, durante a questão e sua revelação. Não envia as perguntas futuras nem ao líder.
- Em salas personalizadas, o líder pode remover a última pergunta adicionada sem visualizar a lista antecipada.
- O envio de respostas, a reconexão, o ranking e o controle de tempo no servidor permanecem preservados.

## Publicação
Copie os arquivos para a pasta do repositório, preservando o endereço correto do Render em `config.js`. Atualize o frontend na Vercel **e** o backend no Render (o `server.js` mudou).

## Teste
Abra uma Party em dois navegadores, sorteie perguntas, confirme que ninguém vê enunciados antes do início, inicie o quiz e troque alternativas várias vezes. O cronômetro deve continuar descendo, sem saltar ao valor inicial.

## Ajustes adicionais
- Sair da sala disponível também durante perguntas e revelação, com confirmação e separado das respostas.
- Modo claro com superfícies e campos menos luminosos; modo escuro inalterado.
