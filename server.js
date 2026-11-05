// ===== DEPENDÊNCIAS E INICIALIZAÇÃO DO SERVIDOR =====
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const app = express(), server = http.createServer(app), io = new Server(server);
app.use(express.static(__dirname));
// ===== SALAS TEMPORÁRIAS ARMAZENADAS EM MEMÓRIA =====
const rooms = new Map();
const clean = s => String(s || '').trim().slice(0, 300);
const code = () => Math.random().toString(36).slice(2, 8).toUpperCase();
// ===== ESTADO PÚBLICO ENVIADO AOS PARTICIPANTES =====
function publicRoom(r) { return { code: r.code, hostId: r.hostId, phase: r.phase, index: r.index, players: r.players.map(p => ({ ...p })), questions: r.questions.map(q => ({ text: q.text, options: q.options })), correct: r.phase === 'reveal' ? r.questions[r.index]?.correct : null }; }
function broadcast(r) { io.to(r.code).emit('room', publicRoom(r)); }
function error(s, m) { s.emit('partyError', m); }
function get(s) { let r = rooms.get(s.data.code); if (!r)
    error(s, 'Sala não encontrada.'); return r; }
// ===== SAÍDA DE PARTICIPANTES E TRANSFERÊNCIA DE ANFITRIÃO =====
function leave(s) { const r = rooms.get(s.data.code); if (!r)
    return; s.leave(r.code); r.players = r.players.filter(p => p.id !== s.id); s.data.code = null; if (!r.players.length) {
    rooms.delete(r.code);
    return;
} if (r.hostId === s.id)
    r.hostId = r.players[0].id; broadcast(r); }
// ===== EVENTOS SOCKET.IO: SALAS, PERGUNTAS E PONTUAÇÃO =====
io.on('connection', s => {
    s.on('createRoom', ({ name } = {}) => { name = clean(name).slice(0, 28); if (!name)
        return error(s, 'Informe seu nome.'); leave(s); let c = code(); while (rooms.has(c))
        c = code(); let r = { code: c, hostId: s.id, phase: 'lobby', index: 0, questions: [], players: [{ id: s.id, name, score: 0, answered: -1 }], answers: new Map() }; rooms.set(c, r); s.data.code = c; s.join(c); broadcast(r); });
    s.on('joinRoom', ({ name, code: c } = {}) => { name = clean(name).slice(0, 28); c = clean(c).toUpperCase(); let r = rooms.get(c); if (!name)
        return error(s, 'Informe seu nome.'); if (!r)
        return error(s, 'Código de sala inválido.'); if (r.phase !== 'lobby')
        return error(s, 'Este quiz já começou.'); if (r.players.length >= 30)
        return error(s, 'Sala cheia.'); leave(s); s.data.code = c; s.join(c); r.players.push({ id: s.id, name, score: 0, answered: -1 }); broadcast(r); });
    s.on('addQuestion', ({ text, options, correct } = {}) => { let r = get(s); if (!r || r.hostId !== s.id || r.phase !== 'lobby')
        return; text = clean(text); options = Array.isArray(options) ? options.map(x => clean(x).slice(0, 150)) : []; if (!text || options.length !== 4 || options.some(x => !x) || !Number.isInteger(correct) || correct < 0 || correct > 3)
        return error(s, 'Preencha a pergunta e as quatro alternativas.'); if (r.questions.length >= 40)
        return error(s, 'Limite de 40 perguntas.'); r.questions.push({ text, options, correct }); broadcast(r); });
    s.on('startQuiz', () => { let r = get(s); if (!r || r.hostId !== s.id || r.phase !== 'lobby' || !r.questions.length)
        return; r.index = 0; r.phase = 'question'; r.answers.clear(); r.players.forEach(p => { p.score = 0; p.answered = -1; }); broadcast(r); });
    s.on('answer', ({ choice } = {}) => { let r = get(s); if (!r || r.phase !== 'question')
        return; let p = r.players.find(p => p.id === s.id); if (!p || p.answered === r.index || !Number.isInteger(choice) || choice < 0 || choice > 3)
        return; p.answered = r.index; r.answers.set(s.id, choice); broadcast(r); });
    s.on('reveal', () => { let r = get(s); if (!r || r.hostId !== s.id || r.phase !== 'question')
        return; r.players.forEach(p => { if (r.answers.get(p.id) === r.questions[r.index].correct)
        p.score += 100; }); r.phase = 'reveal'; broadcast(r); });
    s.on('nextQuestion', () => { let r = get(s); if (!r || r.hostId !== s.id || r.phase !== 'reveal')
        return; r.index++; r.answers.clear(); r.phase = r.index >= r.questions.length ? 'done' : 'question'; broadcast(r); });
    s.on('restart', () => { let r = get(s); if (!r || r.hostId !== s.id || r.phase !== 'done')
        return; r.phase = 'lobby'; r.index = 0; r.players.forEach(p => { p.score = 0; p.answered = -1; }); broadcast(r); });
    s.on('leaveRoom', () => leave(s));
    s.on('disconnect', () => leave(s));
});
// ===== INICIALIZAÇÃO DO SERVIDOR HTTP =====
const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Estudaê rodando em http://localhost:${port}`));

