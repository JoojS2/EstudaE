/** Estudaê 6.0 — interface das Partys, salas públicas e biblioteca de questões. */
const socket = typeof io === 'function' ? io(window.SERVER_URL || location.origin, { reconnection: true }) : null;
const OWNER_KEY = 'estudae:owner-token';
const LIBRARY_KEY = 'estudae:my-questions';
const SESSION_KEY = 'estudae:party-session';
const PLAYER_KEY = 'estudae:player-session-key';
function playerSessionKey() {
  let key = localStorage.getItem(PLAYER_KEY);
  if (!key || !/^[a-f0-9]{48}$/.test(key)) {
    const bytes = new Uint8Array(24); crypto.getRandomValues(bytes);
    key = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(PLAYER_KEY, key);
  }
  return key;
}
const sessionKey = playerSessionKey();
function storedParty() { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; } }
function savePartySession(code) { localStorage.setItem(SESSION_KEY, JSON.stringify({ code, sessionKey })); }
function clearPartySession() { localStorage.removeItem(SESSION_KEY); }
function tryResumeParty() { const previous = storedParty(); if (previous?.code && socket?.connected) socket.emit('resumeRoom', previous); }

function ownerToken() {
  let token = localStorage.getItem(OWNER_KEY);
  if (!token || !/^[a-f0-9]{48}$/.test(token)) {
    const bytes = new Uint8Array(24); crypto.getRandomValues(bytes);
    token = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(OWNER_KEY, token);
  }
  return token;
}
const owner = ownerToken();
let savedQuestions = [];
try { savedQuestions = JSON.parse(localStorage.getItem(LIBRARY_KEY) || '[]'); } catch (_) {}
if (!Array.isArray(savedQuestions)) savedQuestions = [];
let catalog = {};

let partyChoice = { key: '', choice: null };
let party = { room: null, feedback: '', publicRooms: [], name: localStorage.getItem('estudae:player-name') || '', categories: ['Matemática', 'Física', 'Geografia', 'Biologia', 'História'] };
// O áudio só é acionado por uma mudança real para a fase de preparação.
// Navegadores podem bloquear som automático: o contador visual sempre funciona.
let countdownAudio = null;
let audioUnlocked = false;
let serverClockOffset = 0;
let lastCountdownSoundKey = '';
function unlockCountdownAudio() {
  if (audioUnlocked) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    countdownAudio = countdownAudio || new AudioContextClass();
    if (countdownAudio.state === 'suspended') countdownAudio.resume().catch(() => {});
    audioUnlocked = true;
  } catch (_) { /* Som opcional */ }
}
document.addEventListener('pointerdown', unlockCountdownAudio, { passive: true });
document.addEventListener('keydown', unlockCountdownAudio);
function playCountdownAlert() {
  try {
    if (!audioUnlocked || !countdownAudio || countdownAudio.state !== 'running') return;
    const now = countdownAudio.currentTime;
    [0, 0.18].forEach((delay, i) => {
      const osc = countdownAudio.createOscillator();
      const gain = countdownAudio.createGain();
      osc.type = 'sine';
      osc.frequency.value = i ? 740 : 590;
      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.085, now + delay + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.13);
      osc.connect(gain); gain.connect(countdownAudio.destination);
      osc.start(now + delay); osc.stop(now + delay + 0.14);
    });
  } catch (_) { /* Não interromper o quiz se o som falhar */ }
}

function partyEmit(event, data = {}) {
  if (!socket?.connected) { party.feedback = 'Sem conexão com o servidor. Confira config.js e o Render.'; render(); return; }
  socket.emit(event, data);
}
function refreshParty() { if (V === 'party') render(); }
if (socket) {
  socket.on('connect', () => { party.feedback = ''; partyEmit('listPublicRooms'); partyEmit('getCatalog'); partyEmit('loadSavedQuestions', { owner }); tryResumeParty(); refreshParty(); });
  socket.on('catalog', data => { catalog = data; refreshParty(); });
  socket.on('room', room => {
    if (Number.isFinite(room.serverNow)) serverClockOffset = room.serverNow - Date.now();
    const key = room.code + ':' + room.countdownDeadline;
    if (room.phase === 'countdown' && room.countdownDeadline && key !== lastCountdownSoundKey) {
      lastCountdownSoundKey = key;
      // Um participante que reconecta durante a contagem também vê o tempo correto.
      if (!party.room || party.room.phase !== 'countdown') playCountdownAlert();
    }
    party.room = room; savePartySession(room.code); party.feedback = ''; refreshParty();
  });
  socket.on('resumeFailed', message => { clearPartySession(); party.room = null; party.feedback = message; refreshParty(); });
  socket.on('sessionReplaced', () => { party.room = null; party.feedback = 'Esta Party foi aberta em outra aba. Você pode voltar por lá.'; refreshParty(); });
  socket.on('publicRooms', rooms => { party.publicRooms = rooms; refreshParty(); });
  socket.on('savedQuestions', questions => {
    // Restaura o backup local quando um servidor sem banco reinicia vazio.
    if (questions.length === 0 && savedQuestions.length > 0) {
      partyEmit('saveSavedQuestions', { owner, questions: savedQuestions });
      return;
    }
    savedQuestions = questions;
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(questions));
    refreshParty();
  });
  socket.on('partyNotice', message => { party.feedback = message; refreshParty(); });
  socket.on('partyError', message => { party.feedback = message; refreshParty(); });
  socket.on('disconnect', () => { party.feedback = 'Conexão perdida. Reconectando à sua Party sem apagar seu progresso...'; refreshParty(); });
}
const h = value => esc(value ?? '');
const input = (id, label, placeholder, max = 60) => `<label>${label}<input id="${id}" maxlength="${max}" placeholder="${placeholder}"></label>`;
function partyView() {
  const room = party.room;
  let html = '<div class="eyebrow">ESTUDE EM GRUPO</div><h1 class="page-title">Study Partys ✨</h1><p class="subtitle">Crie uma sala pública ou privada e jogue quizzes com seus amigos.</p>';
  if (party.feedback) html += `<div class="notice">${h(party.feedback)}</div>`;
  if (!room) {
    if (storedParty()) html += '<div class="card reconnect-card"><h2>↻ Voltar à sua Party</h2><p class="mu">Sua sessão foi preservada. Você pode tentar reconectar à mesma sala.</p><button class="pri" data-a="reconnectParty">Reconectar à Party</button></div>';
    html += `<div class="grid2"><div class="card party-card"><h2>🎉 Criar uma Party</h2>
      ${input('partyTitle','Nome da sala','Ex.: Revisão para a prova',60)}
      <label>Privacidade<select id="partyVisibility"><option value="public">🌍 Pública — aparece na lista</option><option value="private">🔒 Privada — entra com código</option></select></label>
      <label>Tipo de questões<select id="partyMode"><option value="ready">📚 Perguntas prontas</option><option value="custom">✏️ Criar minhas perguntas</option></select></label>
      <label>Tempo por pergunta<select id="partySeconds">${[10,15,20,25,30].map(n=>`<option value="${n}" ${n===20?'selected':''}>${n} segundos</option>`).join('')}</select></label>
      <label>Quantidade de perguntas<select id="partyAmount"><option value="10">10 questões</option><option value="20" selected>20 questões</option><option value="30">30 questões</option><option value="45">45 questões</option><option value="60">60 questões</option></select></label>
      <p class="mu">Nas perguntas prontas, escolha apenas as matérias. O sistema sorteia as questões e divide a quantidade igualmente entre os temas selecionados.</p>
      <button class="pri" data-a="createParty">Criar sala</button></div>
      <div class="card party-card"><h2>🚀 Entrar por código</h2>${input('joinCode','Código da Party','Ex.: A1B2C3D4',8)}<button class="pri" data-a="joinParty">Entrar na sala</button>
      <h3>🌍 Salas públicas</h3>${party.publicRooms.map(r=>`<div class="row" style="margin:12px 0"><div><b>${h(r.title)}</b><div class="mu">${h(r.category)} · ${r.players} participantes · ${r.questions} questões</div></div><button data-a="joinPublic" data-code="${h(r.code)}">Entrar</button></div>`).join('') || '<p class="mu">Nenhuma sala pública aguardando jogadores.</p>'}</div></div>`;
    html += `<div class="card"><h2>💾 Minha biblioteca de perguntas</h2><p class="mu">${savedQuestions.length} questões salvas. Você pode reutilizá-las em novas Partys personalizadas.</p>${savedQuestions.slice(0, 15).map((q,i)=>`<div class="row" style="padding:6px 0"><span>${i+1}. ${h(q.text)}</span><button class="lk" data-a="removeSaved" data-i="${i}">Excluir</button></div>`).join('')}<button data-a="exportQuestions">Exportar cópia JSON</button></div>`;
    return html;
  }
  const host = room.hostId === socket?.id;
  const me = room.players.find(p => p.id === socket?.id);
  const q = room.questions[room.index];
  html += `<div class="card"><div class="row"><div><div class="mu">${room.visibility === 'public' ? '🌍 SALA PÚBLICA' : '🔒 SALA PRIVADA'}</div><h2>${h(room.title)}</h2><div class="party-code">${h(room.code)}</div><div class="mu">${room.players.length} participantes · ${room.questions.length}/${room.amount} questões · ${room.secondsPerQuestion}s por pergunta · ${h(room.category)}</div></div><button data-a="copyCode">Copiar código</button></div></div>`;
  if (room.phase === 'lobby') {
    html += `<div class="grid2"><div class="card"><h2>Participantes</h2>${room.players.map(p=>`<div class="row" style="padding:8px 0"><span>👤 ${h(p.name)} ${p.id===room.hostId?'👑':''} ${p.online===false?'(reconectando…)':''}</span><b>${p.score} pts</b></div>`).join('')}</div><div class="card"><h2>🎁 Perguntas surpresa</h2><p class="mu">${room.questions.length} de ${room.amount} questões preparadas.</p><p class="mu">As perguntas serão reveladas uma por vez, durante o quiz, para todos os jogadores — inclusive o líder.</p>${host && room.mode === 'custom' && room.questions.length ? `<button class="lk" data-a="removeLastPartyQuestion">Remover última pergunta adicionada</button>` : ''}</div></div>`;
    if (host) {
      if (room.mode === 'ready') html += readySelector();
      if (room.mode === 'custom') html += `<div class="card"><h2>✏️ Adicionar pergunta própria</h2><p class="mu">Ao adicionar, a pergunta também será salva na sua biblioteca para futuras salas.</p><label>Enunciado<textarea id="pq" rows="2" maxlength="300" placeholder="Digite a pergunta"></textarea></label>${[0,1,2,3,4].map(i=>`<div class="answer-row"><input type="radio" name="pc" value="${i}" ${i===0?'checked':''}><input class="pa" maxlength="150" placeholder="Alternativa ${i+1}"></div>`).join('')}<p class="mu">Marque a alternativa correta.</p><button class="pri" data-a="addPartyQuestion">Adicionar e salvar</button><button data-a="useSaved">Usar minha biblioteca (${Math.min(savedQuestions.length,room.amount)} questões)</button></div>`;
      html += `<div class="party-lobby-actions"><button class="pri" data-a="launchParty" ${room.questions.length!==room.amount?'disabled':''}>Começar quiz (${room.questions.length}/${room.amount} questões)</button><button class="party-exit-button" data-a="leaveParty">Sair da sala…</button></div>`;
    } else html += '<div class="notice">Aguardando o anfitrião iniciar o quiz...</div><div class="party-exit"><button class="party-exit-button" data-a="leaveParty">Sair da sala…</button></div>';
  } else if (room.phase === 'countdown') {
    const seconds = Math.max(0, Math.ceil((Number(room.countdownDeadline) - Date.now() - serverClockOffset) / 1000));
    html += `<div class="card party-countdown-card" role="status" aria-live="polite"><div class="eyebrow">PREPARE-SE!</div><h2>O quiz vai começar</h2><div class="party-countdown-number" id="partyCountdown" data-deadline="${Number(room.countdownDeadline)||0}" aria-label="${seconds} segundos restantes">${seconds || '…'}</div><p class="mu">A primeira pergunta aparecerá automaticamente para todos os jogadores.</p></div>`;
  } else if (room.phase === 'question' && q) {
    const answered = me?.answered === room.index;
    const answeredCount = room.players.filter(p => p.answered === room.index).length;
    const choiceKey = room.code + ':' + room.index;
    if (partyChoice.key !== choiceKey) partyChoice = { key: choiceKey, choice: null };
    html += `<div class="card question-box"><div class="row"><div class="mu">Questão ${room.index+1} de ${room.questions.length}</div><div class="party-timer" id="partyTimer" data-deadline="${Number(room.deadline)||0}">⏱ ${Math.max(0, Math.ceil((Number(room.deadline) - Date.now()) / 1000))}s</div></div><div class="progress"><div style="width:${(room.index+1)/room.questions.length*100}%"></div></div><h2>${h(q.text)}</h2>${q.options.map((option,i)=>`<button class="opt ${!answered && partyChoice.choice===i?'selected':''}" data-a="selectPartyAnswer" data-i="${i}" aria-pressed="${!answered && partyChoice.choice===i}" ${answered?'disabled':''}>${'ABCDE'[i]}. ${h(option)}</button>`).join('')}${answered?'':`<button class="pri" data-a="partyAnswer" ${partyChoice.choice===null?'disabled':''}>Enviar resposta</button><p class="mu">Você pode trocar a alternativa antes de enviar. O tempo continua correndo.</p>`}<div class="notice">${answered?'✅ Resposta enviada!':'Selecione e confirme sua resposta antes do tempo acabar.'} ${answeredCount}/${room.players.length} responderam. A resposta será revelada quando todos responderem ou o tempo terminar.</div></div>`;
  } else if (room.phase === 'reveal' && q) {
    const myResult = (room.results || []).find(r => r.id === socket?.id);
    html += `<div class="card question-box"><div class="mu">Resultado da questão ${room.index+1} de ${room.questions.length}</div><h2>${h(q.text)}</h2>${q.options.map((option,i)=>`<div class="opt party-result-opt ${i===room.correct?'party-correct':myResult?.choice===i?'party-wrong':''}">${'ABCDE'[i]}. ${h(option)} ${i===room.correct?'✓ Correta':myResult?.choice===i?'✕ Sua escolha':''}</div>`).join('')}<h3>Resultado dos participantes</h3>${(room.results||[]).map(r=>`<div class="row party-player-result"><span>${r.isCorrect?'✅':r.choice===null?'⏳':'❌'} ${h(r.name)}</span><b>${r.isCorrect?'Acertou (+100 pontos)':r.choice===null?'Não respondeu':'Errou'}</b></div>`).join('')}${ranking(room)}</div>`;
    if (host) html += '<button class="pri" data-a="partyNext">Próxima etapa</button>';
    else html += '<div class="notice">Aguardando o líder avançar para a próxima questão...</div>';
  } else if (room.phase === 'done') {
    html += `<div class="card"><h2>🏆 Quiz finalizado!</h2>${ranking(room)}</div>`;
    if (host) html += '<button class="pri" data-a="partyRestart">Voltar ao lobby</button>';
  }
  // Ação de saída disponível durante toda a partida, longe das alternativas.
  if (['countdown', 'question', 'reveal', 'done'].includes(room.phase)) html += '<div class="party-exit party-exit-during-quiz"><button class="party-exit-button" data-a="leaveParty">Sair da sala…</button></div>';
  return html;
}
function ranking(room) { return '<h3>Placar</h3>' + room.players.slice().sort((a,b)=>b.score-a.score).map((p,i)=>`<div class="row"><span>${i+1}º ${h(p.name)}</span><b>${p.score} pontos</b></div>`).join(''); }
function rememberName(name) { party.name = name; localStorage.setItem('estudae:player-name',name); }
function join(code, name) { if (!name) { party.feedback='Informe seu nome para entrar.'; return; } rememberName(name); partyEmit('joinRoom',{code,name,sessionKey}); }
// O nome é solicitado em uma janela interna, sem prompt() e sem campo no lobby.
let pendingPartyAction = null;
const nameModal = document.getElementById('nameModal');
const nameModalInput = document.getElementById('nameModalInput');
const nameModalError = document.getElementById('nameModalError');
let modalPreviousFocus = null;
function openNameModal(action) {
  pendingPartyAction = action;
  modalPreviousFocus = document.activeElement;
  nameModalInput.value = party.name || '';
  nameModalError.textContent = '';
  nameModal.hidden = false;
  document.body.classList.add('name-modal-open');
  nameModalInput.focus();
  nameModalInput.select();
}
function closeNameModal() {
  nameModal.hidden = true;
  document.body.classList.remove('name-modal-open');
  pendingPartyAction = null;
  if (modalPreviousFocus?.isConnected) modalPreviousFocus.focus();
}
document.getElementById('nameModalCancel').addEventListener('click', closeNameModal);
nameModal.addEventListener('click', e => { if (e.target === nameModal) closeNameModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !nameModal.hidden) { e.preventDefault(); closeNameModal(); }
  if (e.key === 'Tab' && !nameModal.hidden) {
    const controls = [...nameModal.querySelectorAll('input,button')];
    const first = controls[0], last = controls[controls.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
document.getElementById('nameModalForm').addEventListener('submit', e => {
  e.preventDefault();
  const name = nameModalInput.value.trim();
  if (!name) { nameModalError.textContent = 'Informe seu nome para continuar.'; nameModalInput.focus(); return; }
  const action = pendingPartyAction;
  closeNameModal();
  rememberName(name);
  if (action?.type === 'create') partyEmit('createRoom', { ...action.data, name, owner, sessionKey });
  if (action?.type === 'join') join(action.code, name);
});
ACT.createParty = () => {
  const title = document.getElementById('partyTitle').value.trim();
  if (!title) { party.feedback = 'Informe o nome da sala.'; return; }
  const data = { title, visibility: document.getElementById('partyVisibility').value,
    mode: document.getElementById('partyMode').value, category: 'Múltiplas matérias',
    amount: Number(document.getElementById('partyAmount').value),
    secondsPerQuestion: Number(document.getElementById('partySeconds').value) };
  openNameModal({ type: 'create', data });
};
ACT.joinParty = () => {
  const code = document.getElementById('joinCode').value.trim().toUpperCase();
  if (!code) { party.feedback = 'Informe o código da Party.'; return; }
  openNameModal({ type: 'join', code });
};
ACT.joinPublic = d => openNameModal({ type: 'join', code: d.code });
ACT.addPartyQuestion = () => {
  const q = { text: document.getElementById('pq').value.trim(), options: [...document.querySelectorAll('.pa')].map(x=>x.value.trim()), correct: Number(document.querySelector('input[name=pc]:checked').value) };
  if (!q.text || q.options.some(x=>!x) || savedQuestions.length>=200) { party.feedback='Preencha todas as alternativas (limite de 200 perguntas salvas).'; return; }
  if (party.room.questions.length >= party.room.amount) { party.feedback=`Máximo de ${party.room.amount} perguntas por partida.`; return; }
  // Cópia local imediata + gravação no banco de dados do servidor.
  savedQuestions.push(q); localStorage.setItem(LIBRARY_KEY,JSON.stringify(savedQuestions));
  partyEmit('saveSavedQuestions',{owner,questions:savedQuestions}); partyEmit('addQuestion',q);
};
ACT.useSaved = () => partyEmit('useSavedQuestions',{owner});
ACT.removePartyQuestion = d => partyEmit('removeQuestion', {index:Number(d.i)});
ACT.removeLastPartyQuestion = () => { if (party.room?.questions.length) partyEmit('removeQuestion', {index: party.room.questions.length - 1}); };
ACT.removeSaved = d => { savedQuestions.splice(Number(d.i),1); localStorage.setItem(LIBRARY_KEY,JSON.stringify(savedQuestions)); partyEmit('saveSavedQuestions',{owner,questions:savedQuestions}); };
ACT.exportQuestions = () => { const blob = new Blob([JSON.stringify(savedQuestions,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='estudae-minhas-perguntas.json';a.click();URL.revokeObjectURL(url); };
ACT.launchParty = () => partyEmit('startQuiz');
ACT.selectPartyAnswer = d => {
  if (party.room?.phase !== 'question') return;
  const me = party.room.players.find(p => p.id === socket?.id);
  if (me?.answered === party.room.index) return;
  partyChoice.choice = Number(d.i);
  // Atualizar apenas os botões, sem reconstruir o cronômetro.
  document.querySelectorAll('[data-a="selectPartyAnswer"]').forEach(button => {
    const selected = Number(button.dataset.i) === partyChoice.choice;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  const submit = document.querySelector('[data-a="partyAnswer"]');
  if (submit) submit.disabled = false;
};
ACT.partyAnswer = () => { if (party.room?.phase==='question' && partyChoice.choice!==null) partyEmit('answer',{choice:partyChoice.choice}); };
ACT.partyNext = () => partyEmit('nextQuestion');
ACT.partyRestart = () => partyEmit('restart');
ACT.reconnectParty = () => { if (!socket?.connected) { party.feedback = 'Aguardando conexão com o servidor…'; return; } tryResumeParty(); };
ACT.leaveParty = () => {
  if (!confirm('Deseja realmente sair da Party? Seu lugar será liberado e você não poderá recuperar essa sessão.')) return;
  partyEmit('leaveRoom'); clearPartySession(); party.room = null; party.feedback = ''; partyEmit('listPublicRooms');
};
ACT.copyCode = () => navigator.clipboard?.writeText(party.room?.code || '');

// O líder escolhe somente os temas; o servidor sorteia e equilibra as perguntas.
function readySelector() {
  const topics = Object.keys(catalog);
  const selected = party.room?.topics || [];
  return `<div class="card"><h2>📚 Escolha as matérias da Party</h2>
    <p class="mu">O sistema sorteará ${party.room.amount} perguntas e dividirá igualmente entre as matérias escolhidas. Se não houver divisão exata, uma ou mais matérias terão uma questão extra, também por sorteio.</p>
    ${topics.map(t => `<label class="catalog-option"><input type="checkbox" data-topic="${h(t)}" ${selected.includes(t)?'checked':''}> <span><b>${h(t)}</b><span class="mu">${catalog[t].length} questões disponíveis</span></span></label>`).join('')}
    <p class="mu">Para evitar repetições, selecione matérias suficientes para a quantidade desejada.</p>
    <button class="pri" data-a="generateReadyQuestions">🎲 Sortear questões</button>
    ${party.room.questions.length ? `<p class="mu">${party.room.questions.length} perguntas sorteadas. Clique novamente para sortear outra seleção.</p>` : ''}
  </div>`;
}
ACT.generateReadyQuestions = () => {
  const topics = [...document.querySelectorAll('[data-topic]:checked')].map(el => el.dataset.topic);
  if (!topics.length) { party.feedback = 'Selecione pelo menos uma matéria.'; render(); return; }
  partyEmit('generateReadyQuestions', { topics });
};

// Atualiza somente o relógio visível; a contagem oficial e o encerramento ficam no servidor.
setInterval(() => {
  const el = document.getElementById('partyTimer');
  if (!el) return;
  const seconds = Math.max(0, Math.ceil((Number(el.dataset.deadline) - Date.now()) / 1000));
  el.textContent = `⏱ ${seconds}s`;
  el.classList.toggle('party-timer-low', seconds <= 5);
}, 200);

// Renderiza somente o número, sem reconstruir a tela ou reiniciar a contagem.
setInterval(() => {
  const el = document.getElementById('partyCountdown');
  if (!el) return;
  const remaining = Math.max(0, Math.ceil((Number(el.dataset.deadline) - Date.now() - serverClockOffset) / 1000));
  el.textContent = remaining || '…';
  el.setAttribute('aria-label', `${remaining} segundos restantes`);
}, 100);
