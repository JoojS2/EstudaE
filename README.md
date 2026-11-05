# Estudaê 5.0 — Partys públicas, privadas e banco de questões

## Funcionalidades
- Salas públicas visíveis na lista de Partys e privadas acessíveis por código.
- Escolha entre perguntas próprias ou prontas na criação da Party.
- **250 questões**: 50 de Matemática, 50 de Física, 50 de Geografia, 50 de Biologia e 50 de História.
- Biblioteca de perguntas próprias salva no navegador e sincronizada no servidor.
- Quiz multiplayer, ranking e revisão inteligente original.

## Executar localmente
```bash
npm install
npm start
```
Abra http://localhost:3000. Para testes locais, altere `config.js` para `window.SERVER_URL = "http://localhost:3000";`.

## Publicar na Vercel + Render
1. Faça upload dos arquivos para o repositório GitHub.
2. **Render:** crie/atualize um Web Service Node com `npm install` e `npm start`.
3. **Vercel:** publique os arquivos estáticos com Framework Preset **Other**.
4. No arquivo `config.js`, substitua `https://SEU-SERVIDOR.onrender.com` pelo URL **real** do Render e faça commit/push. A Vercel republicará.
5. Configure no Render `FRONTEND_URL=https://SEU-SITE.vercel.app` (sem barra final), substituindo pelo domínio real. Mais de um domínio: separe por vírgula.
6. Para **persistência real no Render**, crie um PostgreSQL gerenciado e configure a variável `DATABASE_URL` com a URL de conexão. O servidor cria a tabela automaticamente. `DATABASE_SSL=false` desativa TLS apenas se seu provedor exigir; normalmente deixe ausente.

### Avisos importantes
- **Sem DATABASE_URL**, as perguntas são gravadas em `saved-quizzes.json` no servidor e no `localStorage` do criador. No Render, o arquivo é **efêmero** e pode desaparecer em reinicializações. A cópia do navegador continua no mesmo navegador, mas não substitui backups ou banco de dados.
- A biblioteca é vinculada a um token aleatório guardado no navegador; não há login. Trocar de navegador, limpar dados ou perder o token pode impedir o acesso à biblioteca do servidor. Use **Exportar cópia JSON** como backup manual. O arquivo exportado não é importável automaticamente nesta versão.
- Salas e placares ativos ainda são temporários. Quando o último jogador sai, a sala fecha; **as perguntas salvas permanecem na biblioteca**. Se o líder sai e outros jogadores ficam, a liderança passa a outro jogador.
- Salas privadas não aparecem na listagem, mas **quem possui o código consegue entrar**. Não há senha adicional.
- O banco de perguntas é uma primeira coleção didática; revise o conteúdo para seu público antes de usar em avaliações formais.
- Para produção em escala, acrescente autenticação, limites de requisição, moderação e armazenamento durável de salas.



## Atualização 5.0 — sorteio por temas e tamanho da Party
- O líder escolhe 10, 20, 30, 45 ou 60 questões na criação da sala.
- No modo de perguntas prontas, escolhe uma ou várias matérias, **não** perguntas individuais.
- O servidor sorteia as perguntas e divide a quantidade tão igualmente quanto possível entre as matérias escolhidas.
- Se houver resto, as questões extras são distribuídas aleatoriamente entre as matérias.
- O líder pode sortear novamente antes de iniciar.
- Para 60 perguntas com somente uma matéria, 10 perguntas se repetem, pois cada matéria possui 50 questões. Com duas ou mais matérias, não há necessidade de repetições.
- No modo personalizado, o líder precisa adicionar ou recuperar exatamente a quantidade escolhida.
- O banco continua com 30 fáceis, 15 médias e 5 difíceis por matéria. O sorteio é aleatório, sem cotas de dificuldade.
