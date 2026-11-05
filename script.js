// ===== CONFIGURAÇÕES, CONSTANTES E UTILITÁRIOS =====
const K = 'estudae:v1', PESO = { alta: 3, media: 2, baixa: 1 }, RANK = { alta: 0, media: 1, baixa: 2 }, NOME = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
const uid = () => Math.random().toString(36).slice(2, 9);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// ===== DADOS INICIAIS DE DEMONSTRAÇÃO =====
function seed() {
    const m = uid(), h = uid(), g = uid(), Q = (a, t, alts, c) => ({ id: uid(), a, t, alts, c, l: 0 });
    return { cfg: { meta: 70, tol: 5, jan: 5, min: 5, n: 10 }, assuntos: [{ id: m, nome: 'Matemática' }, { id: h, nome: 'História' }, { id: g, nome: 'Geografia' }],
        q: [Q(m, 'Quanto é 7 × 8?', ['54', '56', '58', '64', '48'], 1), Q(m, 'Qual é a raiz quadrada de 144?', ['10', '11', '12', '14', '13'], 2), Q(m, 'Quanto é 15% de 200?', ['20', '25', '30', '35', '40'], 2),
            Q(h, 'Em que ano o Brasil declarou a independência?', ['1808', '1822', '1889', '1500', '1831'], 1), Q(h, 'Quem foi o primeiro imperador do Brasil?', ['Dom Pedro I', 'Dom Pedro II', 'Dom João VI', 'Deodoro da Fonseca', 'Floriano Peixoto'], 0), Q(h, 'A Proclamação da República ocorreu em:', ['1822', '1888', '1889', '1930', '1824'], 2),
            Q(g, 'Qual é a capital do Brasil?', ['Rio de Janeiro', 'Brasília', 'São Paulo', 'Salvador', 'Belo Horizonte'], 1), Q(g, 'Qual é o maior oceano do planeta?', ['Atlântico', 'Índico', 'Pacífico', 'Ártico', 'Antártico'], 2), Q(g, 'Qual rio tem o maior volume de água do mundo?', ['Nilo', 'Amazonas', 'São Francisco', 'Paraná', 'Mississippi'], 1)],
        res: [], des: {}, hist: [] };
}
// ===== PERSISTÊNCIA NO NAVEGADOR (LOCALSTORAGE) =====
function load() { try {
    const r = localStorage.getItem(K);
    if (r)
        return JSON.parse(r);
}
catch (e) { } return seed(); }
function save() { try {
    localStorage.setItem(K, JSON.stringify(S));
}
catch (e) { } }
let S = load(), V = 'home', R = null, RS = false;
let sharedBank = {}, revisionTopics = [], revisionCount = 20, recentReviewIds = [];
try { recentReviewIds = JSON.parse(localStorage.getItem('estudae:recent-revision-ids') || '[]'); } catch (_) {}
fetch('question-bank.json').then(r => { if (!r.ok) throw Error('Banco indisponível'); return r.json(); }).then(data => {
    sharedBank = data; if (!revisionTopics.length) revisionTopics = Object.keys(data);
    render();
}).catch(() => { console.warn('Banco de questões indisponível para revisão.'); });
const shuffle = arr => { const a = [...arr]; for (let i=a.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
function reviewPool() {
    const ready = Object.entries(sharedBank).filter(([topic]) => revisionTopics.includes(topic)).flatMap(([topic,qs]) => qs.map(q => ({ id:'bank:'+q.id, a:'bank:'+topic, t:q.text, alts:q.options, c:q.correct, l:0 })));
    const custom = S.q.filter(q => revisionTopics.includes('Minhas questões') || revisionTopics.includes(nomeA(q.a)));
    const unique = new Map();
    for (const q of [...ready,...custom]) unique.set(q.t.trim().toLocaleLowerCase('pt-BR'),q);
    const pool=[...unique.values()];
    return [...shuffle(pool.filter(q=>!recentReviewIds.includes(q.id))),...shuffle(pool.filter(q=>recentReviewIds.includes(q.id)))].slice(0,revisionCount);
}
function revisionSetup() {
    const topics = [...Object.keys(sharedBank),...(S.q.length ? ['Minhas questões'] : [])];
    return `<div class="eyebrow">REVISÃO PERSONALIZADA</div><h1 class="page-title">O que vamos estudar hoje?</h1><p class="subtitle">As questões da revisão também fazem parte das Partys. Escolha uma ou várias matérias e pratique no seu ritmo.</p>
      <div class="card review-setup"><div class="section-head"><h2>Escolha seus temas</h2><span class="mu">${revisionTopics.length} selecionados</span></div><div class="topic-grid">${topics.map(t=>`<label class="topic-choice"><input type="checkbox" data-revision-topic="${esc(t)}" ${revisionTopics.includes(t)?'checked':''}><span><strong>${esc(t)}</strong><small>${t==='Minhas questões'?S.q.length:sharedBank[t].length} questões</small></span></label>`).join('')}</div>
      <div class="review-controls"><label>Quantidade de questões<select id="revisionAmount">${[10,20,30,45,60].map(n=>`<option value="${n}" ${revisionCount===n?'selected':''}>${n} questões</option>`).join('')}</select></label><button class="pri" data-a="startReview" ${!topics.length?'disabled':''}>Iniciar revisão →</button></div><p class="mu">O sistema prioriza perguntas não vistas recentemente e evita repetições na mesma revisão.</p></div>`;
}

const prio = a => (S.des[a] && S.des[a].p) || 'media';
const nomeA = id => (S.assuntos.find(a => a.id === id) || { nome: '?' }).nome;
/* Algoritmo: média ponderada das últimas N sessões (pesos N..1) + faixa configurável */
// ===== REVISÃO INTELIGENTE: CÁLCULO DE PRIORIDADES =====
function atual(aid) {
    const r = S.res.filter(x => x.a === aid).slice(-S.cfg.jan).reverse();
    if (r.reduce((s, x) => s + x.tot, 0) < S.cfg.min)
        return null;
    const w = r.map((_, i) => r.length - i), aj = r.reduce((s, x, i) => s + x.pct * w[i], 0) / w.reduce((a, b) => a + b, 0);
    const m = S.cfg.meta, t = S.cfg.tol, p = aj < m - t ? 'alta' : aj <= m + t ? 'media' : 'baixa', ant = prio(aid);
    S.des[aid] = { aj, p, t: Date.now() };
    if (p !== ant) {
        S.hist.push({ a: aid, de: ant, para: p, aj, t: Date.now() });
        return [ant, p];
    }
    return null;
}
/* Seleção: cota proporcional ao peso da prioridade; alta primeiro */
// ===== MONTAGEM DAS QUESTÕES DE REVISÃO =====
function montar() {
    const at = S.assuntos.filter(a => S.q.some(q => q.a === a.id)).sort((a, b) => RANK[prio(a.id)] - RANK[prio(b.id)]);
    if (!at.length)
        return [];
    const tot = at.reduce((s, a) => s + PESO[prio(a.id)], 0), n = Math.min(S.cfg.n, S.q.length), pool = {};
    let out = [];
    at.forEach(a => pool[a.id] = S.q.filter(q => q.a === a.id).map(q => ({ q, s: q.l + Math.random() })).sort((x, y) => x.s - y.s).map(x => x.q));
    at.forEach(a => out.push(...pool[a.id].splice(0, Math.max(1, Math.round(n * PESO[prio(a.id)] / tot)))));
    out = out.slice(0, n);
    if (out.length < n)
        out.push(...at.flatMap(a => pool[a.id]).slice(0, n - out.length));
    out.sort(() => Math.random() - .5);
    return out.sort((a, b) => RANK[prio(a.a)] - RANK[prio(b.a)]);
}
// ===== FINALIZAÇÃO E RESULTADOS DA REVISÃO =====
function fin() {
    const g = {};
    R.resp.forEach(r => { g[r.a] = g[r.a] || { tot: 0, ac: 0 }; g[r.a].tot++; if (r.ok)
        g[r.a].ac++; });
    let h = '<h2>Resultado da revisão</h2>';
    Object.keys(g).forEach(a => {
        const x = g[a], pct = x.ac / x.tot * 100;
        if (!a.startsWith('bank:')) S.res.push({ a, tot: x.tot, ac: x.ac, pct, t: Date.now() });
        const ch = a.startsWith('bank:') ? null : atual(a), d = a.startsWith('bank:') ? null : S.des[a];
        h += `<div class="card row"><div><b>${esc(a.startsWith('bank:')?a.slice(5):nomeA(a))}</b><div class="mu">${x.ac}/${x.tot} acertos (${pct.toFixed(0)}%)${d ? ' · ajustado ' + d.aj.toFixed(0) + '%' : (a.startsWith('bank:')?'':' · poucos dados para reclassificar')}</div></div><span class="b ${prio(a)}">${ch ? NOME[ch[0]] + ' → ' : ''}${a.startsWith('bank:')?'Praticado':NOME[prio(a)]}</span></div>`;
    });
    save();
    R.fim = h + '<button class="pri" data-a="newReview">Nova revisão</button>';
    recentReviewIds = [...new Set([...R.qs.map(q=>q.id),...recentReviewIds])].slice(0,120); localStorage.setItem('estudae:recent-revision-ids',JSON.stringify(recentReviewIds));
}
// ===== TELAS E COMPONENTES DA INTERFACE =====
function home() {
    const done = S.res.length, correct = S.res.reduce((n, r) => n + r.ac, 0), total = S.res.reduce((n, r) => n + r.tot, 0);
    const icons = ['📐', '📜', '🌎', '📖', '🧪'];
    return `<div class="eyebrow">BEM-VINDO AO SEU ESPAÇO</div><h1 class="page-title">Seu aprendizado começa aqui 👋</h1><p class="subtitle">Organize seus estudos, acompanhe sua evolução e aprenda com amigos.</p><div class="hero"><div><div style="font-size:11px;letter-spacing:2px;font-weight:800">✦ EVOLUA A CADA DIA</div><h2>Pronto para aprender algo novo?</h2><p>Um pouco de dedicação hoje faz toda a diferença amanhã. Vamos começar?</p><button data-a="go" data-v="rev">Escolher temas →</button></div><div class="hero-art">📚</div></div><div class="stats"><div class="stat"><div class="stat-icon">📚</div><div class="num">${Object.keys(sharedBank).length}</div><div class="mu">Matérias para estudar</div></div><div class="stat"><div class="stat-icon">✍️</div><div class="num">${Object.values(sharedBank).reduce((sum,qs)=>sum+qs.length,0)+S.q.length}</div><div class="mu">Questões disponíveis</div></div><div class="stat"><div class="stat-icon">🎯</div><div class="num">${total ? Math.round(correct / total * 100) : 0}%</div><div class="mu">Taxa geral de acertos</div></div></div><div class="section-head"><h2>📖 Temas para revisar</h2><button class="lk" data-a="go" data-v="man">Gerenciar questões →</button></div>${Object.keys(sharedBank).map((name,i)=>({id:'bank:'+name,nome:name})).map((a, i) => { let d = S.des[a.id], p = prio(a.id), n = sharedBank[a.nome]?.length || 0; return `<div class="card row"><div class="subject-row"><span class="subject-icon">${icons[i % icons.length]}</span><div><b>${esc(a.nome)}</b><div class="mu">${n} questões · ${d ? d.aj.toFixed(0) + '% de aproveitamento' : 'Disponível para revisão'}</div></div></div><span class="b baixa">Praticar</span></div>`; }).join('')}<div class="section-head"><h2>🤝 Estude com amigos</h2></div><div class="card row"><div><b>Partys de estudo</b><div class="mu">Crie um quiz e desafie seus colegas em tempo real.</div></div><button class="pri" data-a="go" data-v="party">Explorar partys</button></div>`;
}
function rev() {
    if (!R) return revisionSetup();
    if (!R.qs.length) return revisionSetup();
    if (R.fim)
        return R.fim;
    const q = R.qs[R.i];
    return `<div class="review-question card"><div class="mu">Questão ${R.i + 1} de ${R.qs.length} · ${esc(q.a.startsWith('bank:')?q.a.slice(5):nomeA(q.a))}</div><h2>${esc(q.t)}</h2>` + q.alts.map((t, i) => { let c = 'opt'; if (R.fb === null && R.selected === i) c += ' selected'; if (R.fb !== null) {
        if (i === q.c)
            c += ' ok';
        else if (i === R.fb)
            c += ' no';
    } return `<button class="${c}" data-a="ans" data-i="${i}" ${R.fb !== null ? 'disabled' : ''} aria-pressed="${R.fb===null && R.selected===i}">${'ABCDE'[i]}. ${esc(t)}</button>`; }).join('') + (R.fb !== null ? `<button class="pri" data-a="next">${R.i + 1 < R.qs.length ? 'Próxima' : 'Finalizar'}</button>` : `<button class="pri" data-a="submitReview" ${R.selected===null?'disabled':''}>Enviar resposta</button><p class="mu">Você pode mudar sua escolha antes de enviar.</p>`) + '</div>';
}
function man() {
    const o = S.assuntos.map(a => `<option value="${a.id}">${esc(a.nome)}</option>`).join('');
    return '<h2>Assuntos</h2><div class="card"><div class="f"><input id="na" placeholder="Novo assunto"><button data-a="addA">Adicionar</button></div>' + S.assuntos.map(a => `<div class="row"><span>${esc(a.nome)}</span><button class="lk" data-a="delA" data-id="${a.id}">remover</button></div>`).join('') + `</div><h2>Nova questão</h2><div class="card"><select id="qa">${o}</select><textarea id="qt" rows="2" placeholder="Enunciado"></textarea>` + [0, 1, 2, 3, 4].map(i => `<div class="f"><input type="radio" name="qc" value="${i}" ${i ? '' : 'checked'}><input class="al" placeholder="Alternativa ${i + 1}"></div>`).join('') + `<div class="mu" style="margin-bottom:8px">Marque a alternativa correta.</div><button data-a="addQ">Salvar questão</button></div><h2>Questões (${S.q.length})</h2>` + S.q.map(q => `<div class="card row"><div>${esc(q.t)}<div class="mu">${esc(nomeA(q.a))}</div></div><button class="lk" data-a="delQ" data-id="${q.id}">excluir</button></div>`).join('');
}
function cfg() {
    const c = S.cfg, f = (k, l, a, b) => `<label>${l}<input type="number" id="c_${k}" value="${c[k]}" min="${a}" max="${b}"></label>`;
    return `<h2>Configurações</h2><div class="card">${f('meta', 'Meta de acertos (%)', 0, 100)}${f('tol', 'Tolerância da faixa média (± pontos)', 0, 50)}${f('jan', 'Revisões consideradas na média', 1, 20)}${f('min', 'Mínimo de respostas para reclassificar', 1, 50)}${f('n', 'Questões por revisão', 1, 50)}<button data-a="saveC">Salvar</button></div><h2>Histórico de prioridades</h2>` + (S.hist.slice(-20).reverse().map(h => `<div class="card row"><span>${esc(nomeA(h.a))}: ${NOME[h.de]} → ${NOME[h.para]}</span><span class="mu">${h.aj.toFixed(0)}% · ${new Date(h.t).toLocaleDateString('pt-BR')}</span></div>`).join('') || '<p class="mu">Nenhuma mudança ainda.</p>') + `<button class="lk" data-a="reset">${RS ? 'Clique de novo para confirmar' : 'Apagar todos os dados'}</button>`;
}
// ===== NAVEGAÇÃO E ATUALIZAÇÃO DA TELA =====
const TABS = [['home', 'Início'], ['rev', 'Revisão'], ['man', 'Questões'], ['cfg', 'Ajustes'], ['party', 'Partys']], VIEWS = { home, rev, man, cfg, party: () => partyView() };
function render() {
    document.getElementById('nav').innerHTML = TABS.map((t, i) => `<button class="${V === t[0] ? 'on' : ''}" data-a="go" data-v="${t[0]}"><span class="navicon">${['⌂', '◷', '▤', '⚙', '♧'][i]}</span><span class="navtext">${t[1]}</span></button>`).join('');
    document.getElementById('current-page').textContent = TABS.find(t => t[0] === V)?.[1] || 'Início';
    document.getElementById('app').innerHTML = VIEWS[V]();
}
// ===== AÇÕES DO USUÁRIO =====
const ACT = {
    go: d => { V = d.v; if(V==='rev') R=null; RS = false; },
    start: () => { V='rev'; R=null; },
    newReview: () => { R=null; V='rev'; },
    startReview: () => { const selected=[...document.querySelectorAll('[data-revision-topic]:checked')].map(el=>el.dataset.revisionTopic); if(!selected.length) { alert('Selecione ao menos uma matéria.'); return; } revisionTopics=selected; revisionCount=Number(document.getElementById('revisionAmount').value); const qs=reviewPool(); if(!qs.length) { alert('Nenhuma questão disponível para os temas escolhidos.'); return; } R={qs,i:0,fb:null,selected:null,resp:[]}; V='rev'; },
    ans: d => { if (R.fb===null) R.selected=Number(d.i); },
    submitReview: () => { if (!R || R.fb!==null || R.selected===null) return; const q = R.qs[R.i], i = R.selected, ok = i === q.c; R.fb = i; R.resp.push({ a: q.a, ok }); q.l = ok ? 2 : 1; save(); },
    next: () => { if (R.i + 1 < R.qs.length) {
        R.i++;
        R.fb = null; R.selected = null;
    }
    else
        fin(); },
    addA: () => { const v = document.getElementById('na').value.trim(); if (v) {
        S.assuntos.push({ id: uid(), nome: v });
        save();
    } },
    delA: d => { S.assuntos = S.assuntos.filter(a => a.id !== d.id); S.q = S.q.filter(q => q.a !== d.id); delete S.des[d.id]; save(); },
    addQ: () => {
        const a = document.getElementById('qa').value, t = document.getElementById('qt').value.trim(), alts = [...document.querySelectorAll('.al')].map(x => x.value.trim()), c = +document.querySelector('input[name=qc]:checked').value;
        if (!a || !t || alts.filter(Boolean).length < 2 || !alts[c])
            return;
        const idx = alts.map((x, i) => x ? i : -1).filter(i => i >= 0);
        S.q.push({ id: uid(), a, t, alts: idx.map(i => alts[i]), c: idx.indexOf(c), l: 0 });
        save();
    },
    delQ: d => { S.q = S.q.filter(q => q.id !== d.id); save(); },
    saveC: () => { ['meta', 'tol', 'jan', 'min', 'n'].forEach(k => { const v = parseFloat(document.getElementById('c_' + k).value); if (!isNaN(v))
        S.cfg[k] = v; }); save(); },
    reset: () => { if (!RS) {
        RS = true;
        return;
    } S = seed(); R = null; RS = false; V = 'home'; save(); }
};
// ===== EVENTOS DE CLIQUE =====
document.addEventListener('change', e => { if (e.target.matches('[data-revision-topic]')) { const t=e.target.dataset.revisionTopic; revisionTopics=e.target.checked?[...new Set([...revisionTopics,t])]:revisionTopics.filter(x=>x!==t); } });
document.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b)
    return; if (ACT[b.dataset.a])
    ACT[b.dataset.a](b.dataset); if (b.dataset.a !== 'selectPartyAnswer') render(); });
render();

