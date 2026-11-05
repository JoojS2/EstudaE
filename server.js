/** Estudaê 6.0 — servidor de salas e biblioteca persistente. */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bank = require('./question-bank.json');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const allowedOrigins = (process.env.FRONTEND_URL || '').split(',').map(s => s.trim()).filter(Boolean);
const io = new Server(server, { cors: { origin: allowedOrigins.length ? allowedOrigins : true, methods: ['GET', 'POST'] } });
app.use(express.static(__dirname));
app.get('/api/health', (_, res) => res.json({ ok: true, persistence: process.env.DATABASE_URL ? 'postgres' : 'local-file' }));
app.get('/api/categories', (_, res) => res.json(Object.fromEntries(Object.entries(bank).map(([k,v]) => [k,v.length]))));

// O Render sem disco persistente perde arquivos em reinícios. Em produção, use DATABASE_URL.
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false } }) : null;
const localFile = path.join(__dirname, 'saved-quizzes.json');
let localSaved = {};
try { localSaved = JSON.parse(fs.readFileSync(localFile, 'utf8')); } catch (_) { /* primeira execução */ }
async function initStorage() {
  if (pool) await pool.query('CREATE TABLE IF NOT EXISTS estudae_quizzes (owner TEXT PRIMARY KEY, questions JSONB NOT NULL)');
}
async function loadQuiz(owner) {
  if (!pool) return localSaved[owner] || [];
  const result = await pool.query('SELECT questions FROM estudae_quizzes WHERE owner=$1', [owner]);
  return result.rows[0]?.questions || [];
}
async function saveQuiz(owner, questions) {
  if (pool) {
    await pool.query('INSERT INTO estudae_quizzes(owner, questions) VALUES($1,$2::jsonb) ON CONFLICT(owner) DO UPDATE SET questions=EXCLUDED.questions', [owner, JSON.stringify(questions)]);
  } else {
    localSaved[owner] = questions;
    fs.writeFileSync(localFile, JSON.stringify(localSaved, null, 2));
  }
}

// Salas ativas são temporárias; a biblioteca pessoal de perguntas é persistida separadamente.
const rooms = new Map();
const VALID_AMOUNTS = [10, 20, 30, 45, 60];
const MIN_SECONDS = 10;
const MAX_SECONDS = 30;
function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function drawReadyQuestions(topics, amount) {
  const base = Math.floor(amount / topics.length);
  const remainder = amount % topics.length;
  const extraOrder = shuffle(topics);
  const allocations = Object.fromEntries(topics.map(t => [t, base + (extraOrder.indexOf(t) < remainder ? 1 : 0)]));
  const selected = [];
  for (const topic of topics) {
    const pool = shuffle(bank[topic]);
    const count = allocations[topic];
    // Para 60 questões com uma única matéria, repete somente as 10 excedentes.
    const chosen = pool.slice(0, Math.min(count, pool.length));
    while (chosen.length < count) chosen.push(...shuffle(pool).slice(0, Math.min(count - chosen.length, pool.length)));
    selected.push(...chosen);
  }
  return shuffle(selected);
}
const clean = (v, max = 300) => String(v ?? '').trim().slice(0, max);
const roomCode = () => crypto.randomBytes(4).toString('hex').toUpperCase();
const error = (socket, message) => socket.emit('partyError', message);
const safeQuestions = questions => questions.map(q => ({ text: q.text, options: q.options, difficulty: q.difficulty || 'custom' }));
function publicRoom(room) {
  return {
    code: room.code, title: room.title, visibility: room.visibility, mode: room.mode,
    category: room.category, amount: room.amount, topics: room.topics, hostId: room.hostId, phase: room.phase, index: room.index,
    players: room.players.map(p => ({ ...p })), questions: safeQuestions(room.questions),
    correct: room.phase === 'reveal' ? room.questions[room.index]?.correct : null,
    secondsPerQuestion: room.secondsPerQuestion, deadline: room.phase === 'question' ? room.deadline : null,
    results: room.phase === 'reveal' ? room.results : []
  };
}
function broadcast(room) { io.to(room.code).emit('room', publicRoom(room)); publishRooms(); }
function publishRooms() {
  io.emit('publicRooms', [...rooms.values()].filter(r => r.visibility === 'public' && r.phase === 'lobby').map(r => ({ code: r.code, title: r.title, category: r.category, players: r.players.length, questions: r.amount })));
}
function current(socket) {
  const room = rooms.get(socket.data.roomCode);
  if (!room) error(socket, 'Sala não encontrada.');
  return room;
}
function cancelTimer(room) {
  if (room.timer) clearTimeout(room.timer);
  room.timer = null;
  room.deadline = null;
}
function revealQuestion(room) {
  if (room.phase !== 'question') return;
  cancelTimer(room);
  const correct = room.questions[room.index].correct;
  room.results = room.players.map(player => {
    const choice = room.answers.has(player.id) ? room.answers.get(player.id) : null;
    const isCorrect = choice === correct;
    if (isCorrect) player.score += 100;
    return { id: player.id, name: player.name, choice, isCorrect };
  });
  room.phase = 'reveal';
  broadcast(room);
}
function beginQuestion(room) {
  room.phase = 'question';
  room.answers.clear();
  room.results = [];
  room.deadline = Date.now() + room.secondsPerQuestion * 1000;
  room.timer = setTimeout(() => revealQuestion(room), room.secondsPerQuestion * 1000);
  broadcast(room);
}
function leave(socket) {
  const room = rooms.get(socket.data.roomCode);
  if (!room) return;
  socket.leave(room.code);
  room.players = room.players.filter(p => p.id !== socket.id);
  socket.data.roomCode = null;
  if (!room.players.length) { cancelTimer(room); rooms.delete(room.code); }
  else {
    if (room.hostId === socket.id) room.hostId = room.players[0].id;
    if (room.phase === 'question' && room.players.every(p => room.answers.has(p.id))) revealQuestion(room);
    else broadcast(room);
  }
  publishRooms();
}
function validQuestion(q) {
  return q && typeof q.text === 'string' && clean(q.text) && q.text.length <= 300 &&
    Array.isArray(q.options) && (q.options.length === 4 || q.options.length === 5) && q.options.every(x => typeof x === 'string' && clean(x) && x.length <= 150) &&
    Number.isInteger(q.correct) && q.correct >= 0 && q.correct < q.options.length;
}
function sanitized(q) { return { text: clean(q.text), options: q.options.map(x => clean(x, 150)), correct: q.correct }; }
function validOwner(token) { return typeof token === 'string' && /^[a-f0-9]{48}$/.test(token); }

io.on('connection', socket => {
  socket.on('listPublicRooms', publishRooms);
  // Catálogo de matérias disponíveis, sem enviar as respostas corretas.
  socket.on('getCatalog', () => socket.emit('catalog', Object.fromEntries(Object.entries(bank).map(([topic, questions]) => [topic, questions.map(({ id, text, difficulty }) => ({ id, text, difficulty }))]))));

  // Cada navegador guarda um token privado de proprietário para recuperar suas perguntas.
  socket.on('loadSavedQuestions', async ({ owner } = {}) => {
    if (!validOwner(owner)) return error(socket, 'Identificador da biblioteca inválido.');
    try { socket.emit('savedQuestions', await loadQuiz(owner)); }
    catch (e) { console.error(e); error(socket, 'Não foi possível carregar suas perguntas.'); }
  });
  socket.on('saveSavedQuestions', async ({ owner, questions } = {}) => {
    if (!validOwner(owner) || !Array.isArray(questions) || questions.length > 200 || !questions.every(validQuestion)) return error(socket, 'Biblioteca inválida (máximo 200 perguntas).');
    try { await saveQuiz(owner, questions.map(sanitized)); socket.emit('savedQuestions', await loadQuiz(owner)); socket.emit('partyNotice', 'Perguntas salvas na sua biblioteca.'); }
    catch (e) { console.error(e); error(socket, 'Não foi possível salvar as perguntas.'); }
  });

  socket.on('createRoom', ({ name, title, visibility, mode, category, amount, secondsPerQuestion, owner } = {}) => {
    name = clean(name, 28); title = clean(title, 60) || 'Party de estudos';
    if (!name) return error(socket, 'Informe seu nome.');
    if (!['public', 'private'].includes(visibility)) return error(socket, 'Escolha sala pública ou privada.');
    if (!['ready', 'custom'].includes(mode)) return error(socket, 'Escolha perguntas prontas ou próprias.');
    amount = Number(amount);
    if (!VALID_AMOUNTS.includes(amount)) return error(socket, 'Escolha 10, 20, 30, 45 ou 60 questões.');
    secondsPerQuestion = Number(secondsPerQuestion);
    if (!Number.isInteger(secondsPerQuestion) || secondsPerQuestion < MIN_SECONDS || secondsPerQuestion > MAX_SECONDS) return error(socket, 'Escolha um tempo entre 10 e 30 segundos.');
    leave(socket);
    let code; do { code = roomCode(); } while (rooms.has(code));
    const questions = [];
    const room = { code, title, visibility, mode, amount, secondsPerQuestion, deadline: null, timer: null, results: [], topics: [], category: mode === 'ready' ? 'Aguardando temas' : 'Personalizado', hostId: socket.id, owner: validOwner(owner) ? owner : null, phase: 'lobby', index: 0, questions, players: [{ id: socket.id, name, score: 0, answered: -1 }], answers: new Map() };
    rooms.set(code, room); socket.data.roomCode = code; socket.join(code); broadcast(room);
  });
  socket.on('joinRoom', ({ name, code } = {}) => {
    name = clean(name, 28); code = clean(code, 8).toUpperCase();
    const room = rooms.get(code);
    if (!name) return error(socket, 'Informe seu nome.');
    if (!room) return error(socket, 'Sala não encontrada.');
    if (room.phase !== 'lobby') return error(socket, 'Esta Party já começou.');
    if (room.players.length >= 30) return error(socket, 'Sala cheia.');
    leave(socket); socket.data.roomCode = code; socket.join(code);
    room.players.push({ id: socket.id, name, score: 0, answered: -1 }); broadcast(room);
  });
  socket.on('generateReadyQuestions', ({ topics } = {}) => {
    const room = current(socket);
    if (!room || room.hostId !== socket.id || room.phase !== 'lobby' || room.mode !== 'ready') return;
    if (!Array.isArray(topics) || topics.length < 1 || topics.length > Object.keys(bank).length ||
        new Set(topics).size !== topics.length || !topics.every(t => typeof t === 'string' && Object.hasOwn(bank, t))) {
      return error(socket, 'Escolha pelo menos uma matéria válida.');
    }
    room.topics = topics;
    room.category = topics.join(', ');
    room.questions = drawReadyQuestions(topics, room.amount);
    broadcast(room);
  });
  socket.on('removeQuestion', ({ index } = {}) => {
    const room = current(socket);
    if (!room || room.hostId !== socket.id || room.phase !== 'lobby' || room.mode !== 'custom') return;
    if (!Number.isInteger(index) || index < 0 || index >= room.questions.length) return;
    room.questions.splice(index, 1); broadcast(room);
  });
  socket.on('addQuestion', q => {
    const room = current(socket);
    if (!room || room.hostId !== socket.id || room.phase !== 'lobby' || room.mode !== 'custom') return;
    if (!validQuestion(q)) return error(socket, 'Preencha a pergunta e cinco alternativas.');
    if (room.questions.length >= room.amount) return error(socket, `Limite de ${room.amount} questões por Party.`);
    room.questions.push(sanitized(q)); broadcast(room);
  });
  socket.on('useSavedQuestions', ({ owner } = {}) => {
    const room = current(socket);
    if (!room || room.hostId !== socket.id || room.phase !== 'lobby' || room.mode !== 'custom' || room.owner !== owner) return;
    loadQuiz(owner).then(questions => { room.questions = questions.slice(0, room.amount); broadcast(room); }).catch(() => error(socket, 'Erro ao recuperar perguntas.'));
  });
  socket.on('startQuiz', () => {
    const room = current(socket);
    if (!room || room.hostId !== socket.id || room.phase !== 'lobby' || room.questions.length !== room.amount) return error(socket, `A Party precisa ter exatamente ${room.amount} questões para começar.`);
    room.index = 0; room.players.forEach(p => { p.score = 0; p.answered = -1; }); beginQuestion(room);
  });
  socket.on('answer', ({ choice } = {}) => {
    const room = current(socket);
    if (!room || room.phase !== 'question' || !Number.isInteger(choice) || choice < 0 || choice >= room.questions[room.index].options.length) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.answered === room.index) return;
    player.answered = room.index; room.answers.set(socket.id, choice);
    if (room.players.every(p => room.answers.has(p.id))) revealQuestion(room);
    else broadcast(room);
  });
  socket.on('nextQuestion', () => {
    const room = current(socket);
    if (!room || room.hostId !== socket.id || room.phase !== 'reveal') return;
    room.index++;
    if (room.index >= room.questions.length) { room.phase = 'done'; room.results = []; broadcast(room); }
    else beginQuestion(room);
  });
  socket.on('restart', () => {
    const room = current(socket);
    if (!room || room.hostId !== socket.id || room.phase !== 'done') return;
    room.phase = 'lobby'; room.index = 0; room.players.forEach(p => { p.score = 0; p.answered = -1; }); broadcast(room);
  });
  socket.on('leaveRoom', () => leave(socket));
  socket.on('disconnect', () => leave(socket));
});
initStorage().then(() => server.listen(process.env.PORT || 3000, '0.0.0.0', () => console.log('Estudaê online'))).catch(err => { console.error('Erro no banco de dados:', err); process.exit(1); });
