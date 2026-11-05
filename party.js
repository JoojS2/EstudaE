/** Estudaê 3.0 — interface das Partys, salas públicas e biblioteca de questões. */
const socket = typeof io === 'function' ? io(window.SERVER_URL || location.origin, { reconnection: true }) : null;
const OWNER_KEY = 'estudae:owner-token';
const LIBRARY_KEY = 'estudae:my-questions';
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
let chosenIds = new Set();
let party = { room: null, feedback: '', publicRooms: [], name: localStorage.getItem('estudae:player-name') || '', categories: ['Matemática', 'Física', 'Geografia', 'Biologia', 'História'] };
function partyEmit(event, data = {}) {
  if (!socket?.connected) { party.feedback = 'Sem conexão com o servidor. Confira config.js e o Render.'; render(); return; }
  socket.emit(event, data);
}
function refreshParty() { if (V === 'party') render(); }
if (socket) {
  socket.on('connect', () => { party.feedback = ''; partyEmit('listPublicRooms'); partyEmit('getCatalog'); partyEmit('loadSavedQuestions', { owner }); refreshParty(); });
  socket.on('catalog', data => { catalog = data; refreshParty(); });
  socket.on('room', room => { party.room = room; party.feedback = ''; refreshParty(); });
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
  socket.on('disconnect', () => { party.feedback = 'Conexão perdida. Tentando reconectar...'; party.room = null; refreshParty(); });
}
const h = value => esc(value ?? '');
const input = (id, label, placeholder, max = 60) => `<label>${label}<input id="${id}" maxlength="${max}" placeholder="${placeholder}"></label>`;
function partyView() {
  const room = party.room;
  let html = '<div class="eyebrow">ESTUDE EM GRUPO</div><h1 class="page-title">Study Partys ✨</h1><p class="subtitle">Crie uma sala pública ou privada e jogue quizzes com seus amigos.</p>';
  if (party.feedback) html += `<div class="notice">${h(party.feedback)}</div>`;
  if (!room) {
    html += `<div class="grid2"><div class="card party-card"><h2>🎉 Criar uma Party</h2>
      ${input('partyName','Seu nome','Como devemos chamar você?',28)}
      ${input('partyTitle','Nome da sala','Ex.: Revisão para a prova',60)}
      <label>Privacidade<select id="partyVisibility"><option value="public">🌍 Pública — aparece na lista</option><option value="private">🔒 Privada — entra com código</option></select></label>
      <label>Tipo de questões<select id="partyMode"><option value="ready">📚 Perguntas prontas</option><option value="custom">✏️ Criar minhas perguntas</option></select></label>
      <p class="mu">Cada partida terá exatamente <b>20 questões</b>. O líder seleciona as perguntas e pode combinar matérias.</p>
      <button class="pri" data-a="createParty">Criar sala</button></div>
      <div class="card party-card"><h2>🚀 Entrar por código</h2>${input('joinName','Seu nome','Seu nome',28)}${input('joinCode','Código da Party','Ex.: A1B2C3D4',8)}<button class="pri" data-a="joinParty">Entrar na sala</button>
      <h3>🌍 Salas públicas</h3>${party.publicRooms.map(r=>`<div class="row" style="margin:12px 0"><div><b>${h(r.title)}</b><div class="mu">${h(r.category)} · ${r.players} participantes · ${r.questions} questões</div></div><button data-a="joinPublic" data-code="${h(r.code)}">Entrar</button></div>`).join('') || '<p class="mu">Nenhuma sala pública aguardando jogadores.</p>'}</div></div>`;
    html += `<div class="card"><h2>💾 Minha biblioteca de perguntas</h2><p class="mu">${savedQuestions.length} questões salvas. Você pode reutilizá-las em novas Partys personalizadas.</p>${savedQuestions.slice(0, 15).map((q,i)=>`<div class="row" style="padding:6px 0"><span>${i+1}. ${h(q.text)}</span><button class="lk" data-a="removeSaved" data-i="${i}">Excluir</button></div>`).join('')}<button data-a="exportQuestions">Exportar cópia JSON</button></div>`;
    return html;
  }
  const host = room.hostId === socket?.id;
  const me = room.players.find(p => p.id === socket?.id);
  const q = room.questions[room.index];
  html += `<div class="card"><div class="row"><div><div class="mu">${room.visibility === 'public' ? '🌍 SALA PÚBLICA' : '🔒 SALA PRIVADA'}</div><h2>${h(room.title)}</h2><div class="party-code">${h(room.code)}</div><div class="mu">${room.players.length} participantes · ${room.questions.length}/20 questões · ${h(room.category)}</div></div><button data-a="copyCode">Copiar código</button></div></div>`;
  if (room.phase === 'lobby') {
    html += `<div class="grid2"><div class="card"><h2>Participantes</h2>${room.players.map(p=>`<div class="row" style="padding:8px 0"><span>👤 ${h(p.name)} ${p.id===room.hostId?'👑':''}</span><b>${p.score} pts</b></div>`).join('')}</div><div class="card"><h2>Questões selecionadas</h2>${room.questions.slice(0,20).map((q,i)=>`<p class="mu">${i+1}. ${h(q.text)} ${host && room.mode === 'custom' ? `<button class="lk" data-a="removePartyQuestion" data-i="${i}">Remover</button>` : ''}</p>`).join('') || '<p class="mu">Nenhuma questão ainda.</p>'}${room.questions.length>12?`<p class="mu">... e mais ${room.questions.length-12} perguntas.</p>`:''}</div></div>`;
    if (host) {
      if (room.mode === 'ready') html += readySelector();
      if (room.mode === 'custom') html += `<div class="card"><h2>✏️ Adicionar pergunta própria</h2><p class="mu">Ao adicionar, a pergunta também será salva na sua biblioteca para futuras salas.</p><label>Enunciado<textarea id="pq" rows="2" maxlength="300" placeholder="Digite a pergunta"></textarea></label>${[0,1,2,3].map(i=>`<div class="answer-row"><input type="radio" name="pc" value="${i}" ${i===0?'checked':''}><input class="pa" maxlength="150" placeholder="Alternativa ${i+1}"></div>`).join('')}<p class="mu">Marque a alternativa correta.</p><button class="pri" data-a="addPartyQuestion">Adicionar e salvar</button><button data-a="useSaved">Usar minha biblioteca (${Math.min(savedQuestions.length,50)} questões)</button></div>`;
      html += `<button class="pri" data-a="launchParty" ${room.questions.length!==20?'disabled':''}>Começar quiz (${room.questions.length}/20 questões)</button>`;
    } else html += '<div class="notice">Aguardando o anfitrião iniciar o quiz...</div>';
  } else if (room.phase === 'question' && q) {
    const answered = me?.answered === room.index;
    html += `<div class="card question-box"><div class="mu">Questão ${room.index+1} de ${room.questions.length}</div><div class="progress"><div style="width:${(room.index+1)/room.questions.length*100}%"></div></div><h2>${h(q.text)}</h2>${q.options.map((option,i)=>`<button class="opt" data-a="partyAnswer" data-i="${i}" ${answered?'disabled':''}>${'ABCD'[i]}. ${h(option)}</button>`).join('')}${answered?'<div class="notice">Resposta enviada! Aguarde a revelação.</div>':''}</div>`;
    if (host) html += '<button class="pri" data-a="partyReveal">Revelar resposta</button>';
  } else if (room.phase === 'reveal') {
    html += `<div class="card"><h2>${h(q?.text)}</h2><div class="notice">Resposta correta: ${h(q?.options[room.correct])}</div>${ranking(room)}</div>`;
    if (host) html += '<button class="pri" data-a="partyNext">Próxima etapa</button>';
  } else if (room.phase === 'done') {
    html += `<div class="card"><h2>🏆 Quiz finalizado!</h2>${ranking(room)}</div>`;
    if (host) html += '<button class="pri" data-a="partyRestart">Voltar ao lobby</button>';
  }
  return html + '<div class="actions"><button data-a="leaveParty">Sair da Party</button></div>';
}
function ranking(room) { return '<h3>Placar</h3>' + room.players.slice().sort((a,b)=>b.score-a.score).map((p,i)=>`<div class="row"><span>${i+1}º ${h(p.name)}</span><b>${p.score} pontos</b></div>`).join(''); }
function rememberName(name) { party.name = name; localStorage.setItem('estudae:player-name',name); }
function join(code, name) { if (!name) { party.feedback='Informe seu nome para entrar.'; return; } rememberName(name); partyEmit('joinRoom',{code,name}); }
ACT.createParty = () => {
  const name = document.getElementById('partyName').value.trim();
  rememberName(name);
  partyEmit('createRoom', { name, title: document.getElementById('partyTitle').value.trim(), visibility: document.getElementById('partyVisibility').value, mode: document.getElementById('partyMode').value, category: 'Múltiplas matérias', amount: 20, owner });
};
ACT.joinParty = () => join(document.getElementById('joinCode').value.trim().toUpperCase(),document.getElementById('joinName').value.trim());
ACT.joinPublic = d => join(d.code, party.name || prompt('Qual é seu nome?')?.trim());
ACT.addPartyQuestion = () => {
  const q = { text: document.getElementById('pq').value.trim(), options: [...document.querySelectorAll('.pa')].map(x=>x.value.trim()), correct: Number(document.querySelector('input[name=pc]:checked').value) };
  if (!q.text || q.options.some(x=>!x) || savedQuestions.length>=200) { party.feedback='Preencha todas as alternativas (limite de 200 perguntas salvas).'; return; }
  if (party.room.questions.length >= 20) { party.feedback='Máximo de 20 perguntas por partida.'; return; }
  // Cópia local imediata + gravação no banco de dados do servidor.
  savedQuestions.push(q); localStorage.setItem(LIBRARY_KEY,JSON.stringify(savedQuestions));
  partyEmit('saveSavedQuestions',{owner,questions:savedQuestions}); partyEmit('addQuestion',q);
};
ACT.useSaved = () => partyEmit('useSavedQuestions',{owner});
ACT.removePartyQuestion = d => partyEmit('removeQuestion', {index:Number(d.i)});
ACT.removeSaved = d => { savedQuestions.splice(Number(d.i),1); localStorage.setItem(LIBRARY_KEY,JSON.stringify(savedQuestions)); partyEmit('saveSavedQuestions',{owner,questions:savedQuestions}); };
ACT.exportQuestions = () => { const blob = new Blob([JSON.stringify(savedQuestions,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='estudae-minhas-perguntas.json';a.click();URL.revokeObjectURL(url); };
ACT.launchParty = () => partyEmit('startQuiz');
ACT.partyAnswer = d => partyEmit('answer',{choice:Number(d.i)});
ACT.partyReveal = () => partyEmit('reveal');
ACT.partyNext = () => partyEmit('nextQuestion');
ACT.partyRestart = () => partyEmit('restart');
ACT.leaveParty = () => { partyEmit('leaveRoom');party.room=null;party.feedback='';partyEmit('listPublicRooms'); };
ACT.copyCode = () => navigator.clipboard?.writeText(party.room?.code || '');

// O anfitrião pode filtrar por matéria e dificuldade e selecionar exatamente 20.
function readySelector() {
  const topics = Object.keys(catalog);
  return `<div class="card"><h2>📚 Escolha as 20 questões da partida</h2>
    <p class="mu">Selecione perguntas de uma ou mais matérias. Distribuição do banco por matéria: 30 fáceis, 15 médias e 5 difíceis.</p>
    <label>Matéria<select id="catalogTopic" data-catalog-filter><option value="all">Todas as matérias</option>${topics.map(t=>`<option value="${h(t)}">${h(t)}</option>`).join('')}</select></label>
    <label>Dificuldade<select id="catalogDifficulty" data-catalog-filter><option value="all">Todas</option><option value="easy">Fácil</option><option value="medium">Média</option><option value="hard">Difícil</option></select></label>
    <div class="mu"><b id="selectedCount">${chosenIds.size}</b>/20 selecionadas</div>
    <div id="catalogItems" class="catalog-list"></div>
    <button class="pri" data-a="confirmReadySelection">Confirmar 20 questões</button></div>`;
}
function paintCatalog() {
  const target = document.getElementById('catalogItems');
  if (!target) return;
  const topic = document.getElementById('catalogTopic').value;
  const difficulty = document.getElementById('catalogDifficulty').value;
  const labels = {easy:'Fácil',medium:'Média',hard:'Difícil'};
  const rows = Object.entries(catalog).flatMap(([subject, questions]) => questions.map(q=>({...q,subject})))
    .filter(q=>(topic==='all'||q.subject===topic)&&(difficulty==='all'||q.difficulty===difficulty));
  target.innerHTML = rows.map(q=>`<label class="catalog-option"><input type="checkbox" data-question-id="${h(q.id)}" ${chosenIds.has(q.id)?'checked':''}> <span><b>${h(q.subject)} · ${labels[q.difficulty]}</b><span class="mu">${h(q.text)}</span></span></label>`).join('');
  const count = document.getElementById('selectedCount'); if (count) count.textContent = chosenIds.size;
}
document.addEventListener('change', event => {
  if (event.target.matches('[data-catalog-filter]')) paintCatalog();
  if (event.target.matches('[data-question-id]')) {
    const id=event.target.dataset.questionId;
    if (event.target.checked && chosenIds.size>=20) { event.target.checked=false; alert('Você só pode selecionar 20 questões.'); return; }
    if (event.target.checked) chosenIds.add(id); else chosenIds.delete(id);
    document.getElementById('selectedCount').textContent=chosenIds.size;
  }
});
ACT.confirmReadySelection = () => {
  if (chosenIds.size !== 20) { party.feedback='Selecione exatamente 20 questões.'; return; }
  partyEmit('selectReadyQuestions',{ids:[...chosenIds]});
};
// Integra o catálogo ao renderizador existente sem alterar as telas de revisão.
const previousPartyView = VIEWS.party;
VIEWS.party = () => { const html=previousPartyView(); queueMicrotask(paintCatalog); return html; };
