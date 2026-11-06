<div align="center">

# ✦ Estudaê

### Aprenda no seu ritmo. Revise com inteligência. Estude com amigos.

**Plataforma web de estudos, gerenciamento de questões e quizzes multiplayer em tempo real.**

![Projeto](https://img.shields.io/badge/projeto-Estuda%C3%AA-557c65?style=flat-square)
![Node.js](https://img.shields.io/badge/Node.js-backend-43853d?style=flat-square)
![Socket.IO](https://img.shields.io/badge/Socket.IO-tempo%20real-222222?style=flat-square)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-6b7f8c?style=flat-square)

</div>

## 📖 Sobre o projeto

O **Estudaê** é uma plataforma educacional criada para facilitar a organização dos estudos e tornar a revisão de conteúdos mais prática, interativa e acessível. O projeto reúne **revisão individual**, **gerenciamento de questões** e **Partys**, salas de quiz multiplayer nas quais estudantes podem aprender e competir em tempo real.

A proposta é oferecer uma experiência simples para quem deseja praticar conhecimentos, acompanhar a própria evolução e estudar de maneira colaborativa, em uma interface adaptável aos temas claro e escuro.

## ✨ Funcionalidades

### 📚 Revisão individual

- Seleção de uma ou mais matérias e da quantidade de questões.
- Banco de perguntas compartilhado com o modo multiplayer.
- Priorização de questões não respondidas recentemente, reduzindo repetições.
- Seleção de alternativa com confirmação em **Enviar resposta**.
- Resultados ao final da revisão e acompanhamento do aproveitamento.

### 📝 Biblioteca de questões

- Gerenciamento de questões próprias para estudo.
- Reutilização de perguntas cadastradas nas revisões e em salas personalizadas.
- Organização de conteúdos por matéria.

### 🎮 Partys — quiz multiplayer

- Criação de salas **públicas** ou **privadas**, com entrada por código.
- Participação de vários estudantes em uma mesma partida.
- Configuração de matérias, quantidade de perguntas e tempo por questão.
- Modos com questões sorteadas ou perguntas personalizadas.
- Respostas sincronizadas em tempo real, pontuação e classificação.
- Controle da partida pelo líder da sala.
- Reconexão após interrupções temporárias e opção de sair da sala com confirmação.
- Perguntas sorteadas reveladas apenas no momento adequado, sem prévia das próximas questões.
- Cronômetro baseado no prazo da rodada, sem reinício ao trocar a alternativa selecionada.

### 🎨 Experiência de uso

- Interface responsiva, com navegação lateral e áreas de estudo dedicadas.
- Alternância entre **modo claro** e **modo escuro**.
- Modo claro com cores suaves para maior conforto de leitura.
- Indicadores de desempenho e progresso na página inicial.

## 🛠️ Tecnologias utilizadas

| Área | Tecnologias |
| --- | --- |
| Frontend | HTML5, CSS3 e JavaScript |
| Backend | Node.js e Express |
| Comunicação em tempo real | Socket.IO |
| Banco de dados opcional | PostgreSQL (`pg`) |
| Dados de revisão no navegador | `localStorage` |
| Hospedagem | Vercel (frontend) e Render (backend) |

## 📁 Estrutura do projeto

```text
EstudaE/
├── index.html          # Página e estrutura principal
├── style.css           # Layout, componentes e temas
├── script.js           # Estudos, revisões e navegação
├── party.js            # Interface e eventos das Partys
├── server.js           # Servidor HTTP e lógica multiplayer
├── question-bank.json  # Banco compartilhado de questões
├── config.js           # URL do servidor de multiplayer
├── package.json        # Dependências e scripts do Node.js
├── .gitignore          # Arquivos ignorados pelo Git
└── README.md           # Documentação do projeto
```

## 🚀 Como executar localmente

### Pré-requisitos

- [Node.js](https://nodejs.org/) instalado, com npm disponível.
- Um terminal na pasta do projeto.

### Instalação

1. Clone o repositório e entre na pasta:

   ```bash
   git clone https://github.com/JoojS2/EstudaE.git
   cd EstudaE
   ```

2. Instale as dependências:

   ```bash
   npm install
   ```

3. Para usar o backend localmente, ajuste `config.js`:

   ```js
   window.SERVER_URL = "http://localhost:3000";
   ```

4. Inicie o servidor:

   ```bash
   npm start
   ```

5. Acesse **http://localhost:3000** no navegador.

> O Express também disponibiliza os arquivos estáticos do projeto. Para utilizar as Partys, mantenha o servidor Node.js em execução.

### Scripts disponíveis

| Comando | Finalidade |
| --- | --- |
| `npm start` | Inicia `server.js` |
| `npm run dev` | Inicia `server.js` para desenvolvimento |

## ⚙️ Configuração do servidor

O servidor utiliza as seguintes variáveis de ambiente:

| Variável | Uso |
| --- | --- |
| `PORT` | Porta HTTP; padrão `3000` |
| `FRONTEND_URL` | Origens autorizadas para conexão Socket.IO, separadas por vírgula |
| `DATABASE_URL` | Conexão PostgreSQL para persistência no servidor |
| `DATABASE_SSL` | Defina como `false` apenas quando a conexão não exigir SSL |

Sem `DATABASE_URL`, o servidor usa persistência em arquivo local. **Em hospedagens sem disco persistente, dados locais podem ser perdidos após reinícios ou novas implantações.** Para produção, recomenda-se configurar PostgreSQL.

A rota `GET /api/health` permite verificar se o backend está respondendo.

## ☁️ Implantação

### Frontend — Vercel

Publique os arquivos estáticos do projeto e configure `config.js` com a URL pública do backend, por exemplo:

```js
window.SERVER_URL = "https://seu-servico.onrender.com";
```

### Backend — Render

Crie um serviço web Node.js a partir do repositório, utilizando:

- **Build command:** `npm install`
- **Start command:** `npm start`

Configure `FRONTEND_URL` com o domínio publicado do frontend e `DATABASE_URL` se utilizar PostgreSQL. Verifique se a URL em `config.js` aponta para esse serviço.

> A publicação depende das configurações da conta e do serviço de hospedagem. Alterações em `server.js` exigem a atualização do backend; alterações na interface exigem a atualização do frontend.

## 🧪 Testes recomendados

Antes de publicar uma atualização, confira:

- A abertura das páginas e o carregamento do banco de questões.
- O início e a conclusão de uma revisão individual.
- A criação e entrada em salas públicas e privadas.
- O funcionamento de uma Party em dois navegadores diferentes.
- A continuidade do cronômetro ao trocar alternativas.
- A ausência de perguntas futuras na interface dos participantes e do líder.
- A confirmação ao sair da sala, inclusive durante uma partida.
- A legibilidade dos temas claro e escuro em computador e celular.

## 🗺️ Evolução do projeto

O Estudaê está em desenvolvimento contínuo. Entre as melhorias incorporadas ao longo de suas versões estão o aperfeiçoamento do design, a ampliação do banco de questões, as cinco alternativas por pergunta, a confirmação de respostas, a reconexão em Partys, o controle de tempo e a apresentação surpresa das questões sorteadas.

## 🤝 Contribuições

Sugestões, relatos de bugs e propostas de melhoria podem ser registrados nas *Issues* do repositório. Para contribuir com código, crie uma branch, descreva a alteração e abra um *Pull Request*.

## 📄 Licença

Este repositório não inclui atualmente um arquivo de licença. As condições de uso e redistribuição devem ser definidas pelos responsáveis pelo projeto.

---

<div align="center">

**Estudaê — um passo por dia, no seu ritmo.**

</div>


### Contagem antes das Partys

Ao clicar em **Começar quiz**, o servidor inicia uma preparação sincronizada de **5 segundos** para todos os jogadores. A primeira questão e seu tempo de resposta só começam após essa preparação. O navegador tenta reproduzir um alerta sonoro curto (pode depender de interação prévia do usuário e das políticas de áudio do dispositivo). A fase é recuperada corretamente em reconexões. Para publicar esta mudança, atualize **frontend (Vercel)** e **backend (Render)**.
