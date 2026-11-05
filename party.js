// Party interface and Socket.IO client. Rooms and answers live on the server.
// ===== CONEXÃO COM O SERVIDOR MULTIPLAYER =====
let socket = typeof io === 'function' ? io() : null;
let party = { code: '', name: '', room: null, feedback: '', draft: [] };
// ===== ENVIO DE EVENTOS AO SERVIDOR =====
function partyEmit(event, data) { if (!socket) {
    party.feedback = 'Inicie o servidor Node.js para usar as salas online.';
    render();
    return;
} socket.emit(event, data); }
// ===== EVENTOS RECEBIDOS DO SERVIDOR =====
if (socket) {
    socket.on('room', room => { party.room = room; party.code = room.code; party.feedback = ''; if (V === 'party')
        render(); });
    socket.on('partyError', message => { party.feedback = message; render(); });
    socket.on('disconnect', () => { party.feedback = 'Conexão perdida. Tentando reconectar…'; if (V === 'party')
        render(); });
}
// ===== INTERFACE DAS SALAS, QUESTÕES E RANKING =====
function partyView() {
    let r = party.room;
    let title = '<div class="eyebrow">APRENDA EM GRUPO</div><h1 class="page-title">Study Partys ✨</h1><p class="subtitle">Crie quizzes, convide amigos e aprendam juntos em tempo real.</p>';
    if (!r)
        return title + (party.feedback ? `<div class="notice">${esc(party.feedback)}</div>` : '') + `<div class="grid2"><div class="card party-card"><div class="stat-icon">🎉</div><h2>Criar uma party</h2><p class="mu">Seja o anfitrião e monte seu quiz.</p><label>Seu nome<input id="partyName" maxlength="28" placeholder="Como podemos te chamar?"></label><button class="pri" data-a="createParty">Criar sala</button></div><div class="card party-card"><div class="stat-icon">🚀</div><h2>Entrar em uma party</h2><p class="mu">Use o código enviado pelo anfitrião.</p><label>Seu nome<input id="joinName" maxlength="28" placeholder="Seu nome"></label><label>Código da sala<input id="joinCode" maxlength="6" placeholder="EX: ABC123"></label><button class="pri" data-a="joinParty">Entrar na sala</button></div></div>`;
    let host = r.hostId === socket?.id, me = r.players.find(p => p.id === socket?.id), q = r.questions[r.index];
    let content = title + `<div class="card"><div class="row"><div><div class="mu">CÓDIGO DA PARTY</div><div class="party-code">${esc(r.code)}</div><div class="mu">${r.players.length} participante(s) · ${r.questions.length} questão(ões)</div></div><button data-a="copyCode">Copiar código</button></div></div>` + (party.feedback ? `<div class="notice">${esc(party.feedback)}</div>` : '');
    if (r.phase === 'lobby') {
        content += `<div class="grid2"><div class="card"><h2>Participantes</h2>${r.players.map(p => `<div class="row" style="padding:9px 0"><span>👤 ${esc(p.name)} ${p.id === r.hostId ? '👑' : ''}</span><b>${p.score} pts</b></div>`).join('')}</div><div class="card"><h2>Questões do quiz</h2>${r.questions.map((q, i) => `<p class="mu">${i + 1}. ${esc(q.text)}</p>`).join('') || '<p class="mu">Nenhuma questão ainda.</p>'}</div></div>`;
        if (host)
            content += `<div class="card"><h2>Adicionar pergunta</h2><label>Enunciado<textarea id="pq" rows="2" maxlength="300" placeholder="Escreva sua pergunta"></textarea></label>${[0, 1, 2, 3].map(i => `<div class="answer-row"><input type="radio" name="pc" value="${i}" ${i === 0 ? 'checked' : ''}><input class="pa" maxlength="150" placeholder="Alternativa ${i + 1}"></div>`).join('')}<p class="mu">Selecione a alternativa correta.</p><button class="pri" data-a="addPartyQuestion">Adicionar questão</button></div><button class="pri" data-a="launchParty" ${!r.questions.length ? 'disabled' : ''}>Começar quiz (${r.questions.length} questões)</button>`;
        else
            content += '<div class="notice">Aguardando o anfitrião começar o quiz…</div>';
    }
    else if (r.phase === 'question' && q) {
        let answered = me?.answered === r.index;
        content += `<div class="card question-box"><div class="mu">Questão ${r.index + 1} de ${r.questions.length}</div><div class="progress"><div style="width:${(r.index + 1) / r.questions.length * 100}%"></div></div><h2>${esc(q.text)}</h2>${q.options.map((opt, i) => `<button class="opt" data-a="partyAnswer" data-i="${i}" ${answered ? 'disabled' : ''}>${String.fromCharCode(65 + i)}. ${esc(opt)}</button>`).join('')}${answered ? '<div class="notice">Resposta enviada! Aguarde os demais participantes.</div>' : ''}</div>`;
        if (host)
            content += '<button class="pri" data-a="partyReveal">Revelar resposta</button>';
    }
    else if (r.phase === 'reveal') {
        content += `<div class="card"><span class="pill">RESPOSTA REVELADA</span><h2>${esc(q?.text || '')}</h2><div class="notice">Resposta correta: ${esc(q?.options[r.correct] || '')}</div><h3>Placar</h3>${r.players.slice().sort((a, b) => b.score - a.score).map((p, i) => `<div class="row"><span>${i + 1}º ${esc(p.name)}</span><b>${p.score} pontos</b></div>`).join('')}</div>`;
        if (host)
            content += '<button class="pri" data-a="partyNext">Próxima etapa</button>';
    }
    else if (r.phase === 'done') {
        content += `<div class="card"><h2>🏆 Quiz finalizado!</h2>${r.players.slice().sort((a, b) => b.score - a.score).map((p, i) => `<div class="row"><span>${i + 1}º ${esc(p.name)}</span><b>${p.score} pontos</b></div>`).join('')}</div>`;
        if (host)
            content += '<button class="pri" data-a="partyRestart">Voltar ao lobby</button>';
    }
    content += '<div class="actions"><button data-a="leaveParty">Sair da party</button></div>';
    return content;
}
// ===== AÇÕES DE CRIAÇÃO, ENTRADA E CONTROLE DAS PARTYS =====
ACT.createParty = () => partyEmit('createRoom', { name: document.getElementById('partyName').value.trim() });
ACT.joinParty = () => partyEmit('joinRoom', { name: document.getElementById('joinName').value.trim(), code: document.getElementById('joinCode').value.trim().toUpperCase() });
ACT.addPartyQuestion = () => { let text = document.getElementById('pq').value.trim(), options = [...document.querySelectorAll('.pa')].map(x => x.value.trim()), correct = Number(document.querySelector('input[name=pc]:checked').value); partyEmit('addQuestion', { text, options, correct }); };
ACT.launchParty = () => partyEmit('startQuiz', {});
ACT.partyAnswer = d => partyEmit('answer', { choice: Number(d.i) });
ACT.partyReveal = () => partyEmit('reveal', {});
ACT.partyNext = () => partyEmit('nextQuestion', {});
ACT.partyRestart = () => partyEmit('restart', {});
ACT.leaveParty = () => { partyEmit('leaveRoom', {}); party.room = null; party.code = ''; party.feedback = ''; };
ACT.copyCode = () => navigator.clipboard?.writeText(party.code);

