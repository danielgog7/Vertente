'use strict';
/* IA comum às apps do Daniel (Garfada, Forja, Mirante, Nascente e Vertente). O mesmo ficheiro em todos os repositórios (aqui com a Vertente acrescentada). Versão 2026-10-18b.
   Vivem todas em danielgog7.github.io, por isso partilham este estado no navegador (localStorage "ia.comum"):
   - Chave do Gemini partilhada: IA.chaveGemini(propria) devolve a chave própria; se não houver, a última que funcionou noutra app
     deste aparelho; se ainda não houver, uma chave "AIza…" guardada por qualquer app. IA.origemChave(propria) diz de que app vem
     ('' se é a própria). IA.temIA(propria) diz se há IA (chave do Gemini, própria ou de outra app, ou chave do Groq).
     O IA.pedir faz isto sozinho quando recebe a chave vazia; a chave que funciona fica registada para as outras apps;
     uma chave emprestada que dê "inválida" é esquecida e passa-se para o Groq.
   - Gemini: se um modelo esgota o limite diário, passa para outro (cada modelo tem a sua quota); nos limites por minuto espera e repete;
     modelos que recusam o pedido ficam de lado. Os limites são por projeto Google: apps com a mesma chave partilham-nos.
   - Groq: reserva gratuita (também lê fotos) quando o Gemini esgota ou falha. A chave guarda-se uma vez e serve todas as apps.
   Uso: await IA.pedir({texto, imagens} ou {parts}, json, chave, modelo, espera, aviso, temperatura}) → texto da resposta. */
const IA = (() => {
  const GEM = 'https://generativelanguage.googleapis.com/v1beta/', GROQ = 'https://api.groq.com/openai/v1/', GROQ_MODELO = 'qwen/qwen3.8-27b', LSK = 'ia.comum';
  const ler = () => { try { return JSON.parse(localStorage.getItem(LSK)) || {}; } catch(e){ return {}; } };
  const gravar = o => { try { localStorage.setItem(LSK, JSON.stringify(o)); } catch(e){} };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const idChave = k => String(k || '').slice(-8);
  const msgDe = j => (j && j.error && j.error.message) || '';
  class ErroLimite extends Error {}
  const VERSAO = '2026-10-18b';

  /* ---------- Chave do Gemini partilhada entre as apps deste aparelho ---------- */
  // Onde cada app guarda a sua chave (o mesmo endereço, por isso o mesmo localStorage).
  const ONDE_CHAVE = [['forja.cfg', 'Forja'], ['nascente.cfg', 'Nascente'], ['cfg', 'Garfada'], ['mirante.cfg', 'Mirante'], ['vertente.cfg', 'Vertente']];
  const pareceGemini = k => /^AIza[0-9A-Za-z_\-]{20,}$/.test(String(k || '').trim());
  // Esta app, pelo endereço (danielgog7.github.io/Forja/, /Nascente/, …).
  const estaApp = () => { const m = (location.pathname || '').match(/\/(garfada|forja|nascente|mirante|vertente)(\/|$)/i); return m ? m[1][0].toUpperCase() + m[1].slice(1).toLowerCase() : ''; };
  const invalida = k => !!(ler().invalidas || {})[idChave(k)];
  function procurarChave(){
    for (const [k, app] of ONDE_CHAVE){
      try { const c = JSON.parse(localStorage.getItem(k) || 'null'); if (c && pareceGemini(c.chave) && !invalida(c.chave)) return {chave: c.chave.trim(), app}; } catch(e){}
    }
    try { // qualquer outra chave "AIza…" guardada neste aparelho
      for (let i = 0; i < localStorage.length; i++){
        const k = localStorage.key(i); if (!k || k === LSK) continue;
        const m = String(localStorage.getItem(k) || '').match(/"(AIza[0-9A-Za-z_\-]{30,})"/); if (m && !invalida(m[1])) return {chave: m[1], app: ''};
      }
    } catch(e){}
    return null;
  }
  // A chave emprestada: a última que funcionou numa app deste aparelho, ou a primeira que se encontrar guardada.
  function emprestada(){ const u = ler().ultimaGemini; return u && pareceGemini(u.chave) && !invalida(u.chave) ? {chave: u.chave, app: u.app || ''} : procurarChave(); }
  function chaveGemini(propria){ const p = String(propria || '').trim(); if (p) return p; const e = emprestada(); return e ? e.chave : ''; }
  function origemChave(propria){ if (String(propria || '').trim()) return ''; const e = emprestada(); return e ? (e.app || 'outra app tua') : ''; }
  function lembrarChave(chave, app){ const o = ler(); o.ultimaGemini = {chave, app: app || '', ts: Date.now()}; if (o.invalidas) delete o.invalidas[idChave(chave)]; gravar(o); }
  function esquecerChave(chave){ const o = ler(); o.invalidas = Object.assign({}, o.invalidas, {[idChave(chave)]: Date.now()}); if (o.ultimaGemini && o.ultimaGemini.chave === chave) delete o.ultimaGemini; gravar(o); }
  let atual = null, cancelado = false, pensarSempre = false;

  const diaPacifico = () => new Date().toLocaleDateString('en-CA', {timeZone: 'America/Los_Angeles'});
  function horaReset(){
    const agora = new Date(), la = new Date(agora.toLocaleString('en-US', {timeZone: 'America/Los_Angeles'})), meia = new Date(la); meia.setHours(24, 0, 0, 0);
    return new Date(+agora + (meia - la)).toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit'});
  }
  function grupo(o, chave){ o.gem = o.gem || {}; return (o.gem[idChave(chave)] = Object.assign({esg: {}, inc: {}, modelos: []}, o.gem[idChave(chave)])); }
  function alterar(chave, f){ const o = ler(); f(grupo(o, chave)); gravar(o); }
  function candidatos(chave, preferido){
    const g = grupo(ler(), chave), hoje = diaPacifico();
    return [...g.modelos, preferido, 'gemini-flash-latest', 'gemini-flash-lite-latest'].map(m => String(m || '').replace(/^models\//, ''))
      .filter((m, i, l) => m && l.indexOf(m) === i && g.esg[m] !== hoje && !g.inc[m]);
  }
  async function http(url, opt, espera, nome){
    const ped = atual = {ctl: new AbortController(), cancelado: false}, t = setTimeout(() => ped.ctl.abort(), espera);
    try { return await fetch(url, Object.assign({signal: ped.ctl.signal}, opt)); }
    catch(e){
      if (ped.cancelado) throw new Error('Cancelado.');
      if (ped.ctl.signal.aborted) throw Object.assign(new Error(nome + ' demorou demasiado a responder. Tenta outra vez.'), {rede: true});
      throw Object.assign(new Error('Sem ligação à internet.'), {rede: true});
    } finally { clearTimeout(t); if (atual === ped) atual = null; }
  }
  function cancelar(){ cancelado = true; if (atual){ atual.cancelado = true; atual.ctl.abort(); } }
  async function esperar(seg, aviso){
    cancelado = false;
    for (let s = Math.ceil(seg); s > 0; s--){ if (cancelado) throw new Error('Cancelado.'); aviso(`Muitos pedidos seguidos. A aguardar ${s} s…`); await new Promise(r => setTimeout(r, 1000)); }
  }
  function limiteInfo(j){
    const det = (j.error && j.error.details) || [], ids = det.filter(d => /QuotaFailure/.test(d['@type'] || '')).flatMap(d => (d.violations || []).map(v => v.quotaId || '')).join(' ');
    const ri = det.find(d => /RetryInfo/.test(d['@type'] || '')), espera = ri ? parseFloat(ri.retryDelay) || 30 : 30;
    return {porDia: /PerDay/i.test(ids) || (!/PerMinute/i.test(ids) && espera > 90), espera: Math.min(Math.max(espera, 5), 65)};
  }
  async function listarModelos(chave){
    let r;
    try { r = await fetch(GEM + 'models?pageSize=1000', {headers: {'x-goog-api-key': chave}}); } catch(e){ throw new Error('Sem ligação à internet.'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error([400, 401, 403].includes(r.status) ? 'Chave inválida.' : 'Erro: ' + (msgDe(j) || r.status));
    const pts = n => (/latest/.test(n) ? 100 : 0) - (/lite/.test(n) ? 10 : 0) - (/preview/.test(n) ? 5 : 0) + (parseFloat((n.match(/\d+(\.\d+)?/) || [])[0]) || 0);
    const nomes = (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent')).map(m => m.name.replace(/^models\//, ''))
      .filter(n => /flash/i.test(n) && !/(image|tts|audio|live|embed|exp)/i.test(n)).sort((a, b) => pts(b) - pts(a));
    alterar(chave, g => { g.modelos = nomes.slice(0, 8); g.inc = {}; });
    return nomes;
  }

  async function gemini(parts, {json, chave, modelo, espera, aviso, temperatura}){
    const gc = json ? {temperature: temperatura ?? .3, responseMimeType: 'application/json'} : {temperature: temperatura ?? .6};
    const pedir = (m, pensar) => http(`${GEM}models/${encodeURIComponent(m)}:generateContent`, {method: 'POST', headers: {'Content-Type': 'application/json', 'x-goog-api-key': chave},
      body: JSON.stringify({contents: [{role: 'user', parts}], generationConfig: pensar ? gc : Object.assign({thinkingConfig: {thinkingBudget: 0}}, gc)})}, espera, 'O Gemini');
    if (!grupo(ler(), chave).modelos.length) try { await listarModelos(chave); } catch(e){}
    const lista = candidatos(chave, modelo);
    let esgotou = false, ultimo = '';
    for (let i = 0, esperou = false; i < lista.length; i++){
      const m = lista[i], semPensar = pensarSempre || !/flash/i.test(m);
      let r = await pedir(m, semPensar), j = await r.json().catch(() => ({}));
      if (r.status === 400 && !semPensar){ // alguns modelos não aceitam desligar o "pensamento"
        const m400 = msgDe(j); r = await pedir(m, true); j = await r.json().catch(() => ({}));
        if (r.ok && /think/i.test(m400)) pensarSempre = true;
      }
      if (r.status === 429){
        const li = limiteInfo(j);
        if (!li.porDia && !esperou){ esperou = true; await esperar(li.espera, aviso); i--; continue; }
        alterar(chave, g => { g.esg[m] = diaPacifico(); }); esgotou = true; esperou = false; aviso('Este modelo esgotou por hoje. A tentar outro…'); continue;
      }
      if (!r.ok){
        const e = msgDe(j) || String(r.status);
        if (r.status === 401 || /api key/i.test(e)) throw new Error('Chave do Gemini inválida.');
        if (r.status >= 500){ ultimo = 'O Gemini está indisponível de momento.'; continue; }
        alterar(chave, g => { g.inc[m] = 1; }); ultimo = e; continue; // modelo que não serve para este pedido
      }
      const t = ((((j.candidates || [])[0] || {}).content || {}).parts || []).filter(p => !p.thought).map(p => p.text || '').join('');
      if (!t){ ultimo = 'O Gemini não devolveu resposta.'; continue; }
      return t;
    }
    if (esgotou) throw new ErroLimite(`O limite diário gratuito do Gemini acabou em todos os modelos (é partilhado pelas apps com a mesma chave). Volta às ${horaReset()}.`);
    throw Object.assign(new Error('Erro do Gemini: ' + (ultimo || 'nenhum modelo disponível')), {rede: /indisponível/.test(ultimo)});
  }

  const groqConfig = () => Object.assign({chave: '', modelo: GROQ_MODELO}, ler().groq);
  async function groq(texto, imagens, {json, espera, aviso}){
    const g = groqConfig(), modelo = g.modelo || GROQ_MODELO;
    const content = imagens.length ? [{type: 'text', text: texto}, ...imagens.slice(-3).map(u => ({type: 'image_url', image_url: {url: u}}))] : texto;
    const pedir = comJSON => http(GROQ + 'chat/completions', {method: 'POST', headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + g.chave},
      body: JSON.stringify(Object.assign({model: modelo, messages: [{role: 'user', content}], temperature: .3}, comJSON ? {response_format: {type: 'json_object'}} : {}))}, espera, 'O Groq');
    let r = await pedir(json), j = await r.json().catch(() => ({}));
    if (r.status === 400 && json && !/model/i.test(msgDe(j))){ r = await pedir(false); j = await r.json().catch(() => ({})); }
    if (r.status === 429){
      const m = msgDe(j).match(/try again in\s*(?:(\d+)m)?\s*([\d.]+)\s*s/i), seg = m ? (+m[1] || 0) * 60 + parseFloat(m[2]) : 0;
      if (seg > 0 && seg <= 65){ await esperar(seg + 1, aviso); r = await pedir(json); j = await r.json().catch(() => ({})); }
    }
    if (!r.ok){
      const e = msgDe(j) || String(r.status);
      if (r.status === 401) throw new Error('Chave do Groq inválida.');
      if (r.status === 429) throw new ErroLimite(`O Gemini e a reserva (Groq) estão sem forças por agora. O Gemini volta às ${horaReset()}.`);
      if (r.status === 404 || /model/i.test(e)) throw new Error(`O modelo ${modelo} não está disponível no Groq. Muda-o nas definições da IA de reserva.`);
      throw Object.assign(new Error('Erro do Groq: ' + e), {rede: r.status >= 500});
    }
    const t = String((((j.choices || [])[0] || {}).message || {}).content || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    if (!t) throw new Error('A IA de reserva não respondeu. Tenta outra vez.');
    return t;
  }

  async function pedir({texto = '', parts = null, imagens = [], json = true, chave = '', modelo = '', espera = 60000, aviso = () => {}, temperatura} = {}){
    if (parts){ // formato Gemini → texto e imagens para o Groq
      texto = parts.filter(p => p.text).map(p => p.text).join('\n\n');
      imagens = parts.map(p => p.inline_data || p.inlineData).filter(Boolean).map(d => `data:${d.mime_type || d.mimeType || 'image/jpeg'};base64,${d.data}`);
    } else parts = [{text: texto}, ...imagens.map(u => ({inline_data: {mime_type: (String(u).match(/^data:([^;]+)/) || [])[1] || 'image/jpeg', data: String(u).split(',')[1]}}))];
    const reserva = !!groqConfig().chave;
    // Sem chave própria: usa a de outra app deste aparelho (a última que funcionou ou a que estiver guardada).
    let emp = null;
    chave = String(chave || '').trim();
    if (!chave){ emp = emprestada(); if (emp) chave = emp.chave; }
    if (!chave){ if (reserva) return groq(texto, imagens, {json, espera, aviso}); throw new Error('Falta a chave da IA.'); }
    if (reserva && !candidatos(chave, modelo).length) return groq(texto, imagens, {json, espera, aviso});
    try { const t = await gemini(parts, {json, chave, modelo, espera, aviso, temperatura}); lembrarChave(chave, emp ? emp.app : estaApp()); return t; }
    catch(e){
      if (emp && /inválida/.test(e.message)){ // a chave emprestada deixou de servir: esquece-a e passa para o Groq
        esquecerChave(chave);
        if (reserva){ aviso('A chave do Gemini de outra app deixou de funcionar. A usar a reserva (Groq)…'); return groq(texto, imagens, {json, espera, aviso}); }
        throw new Error('A chave do Gemini que vinha de outra app deixou de funcionar. Põe uma chave tua ou a do Groq.');
      }
      if (!reserva || e.message === 'Cancelado.' || /Sem ligação/.test(e.message)) throw e;
      aviso('O Gemini não deu. A usar a reserva (Groq)…');
      return groq(texto, imagens, {json, espera, aviso});
    }
  }

  /* ---------- Chave do Groq: guardada uma vez para todas as apps ---------- */
  function definirGroq(chave, modelo){ const o = ler(); o.groq = {chave: String(chave || '').trim(), modelo: String(modelo || '').trim() || GROQ_MODELO}; gravar(o); }
  async function testarGroq(){
    const g = groqConfig(); let r;
    try { r = await fetch(GROQ + 'models', {headers: {'Authorization': 'Bearer ' + g.chave}}); } catch(e){ throw new Error('Sem ligação à internet.'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(r.status === 401 ? 'Chave inválida.' : 'Erro: ' + (msgDe(j) || r.status));
    const ids = (j.data || []).map(m => m.id);
    return ids.includes(g.modelo) ? `Ligado. Modelo: ${g.modelo}` : `Chave válida, mas o modelo ${g.modelo} não existe. Disponíveis: ${ids.filter(i => !/whisper|tts|guard|embed/i.test(i)).slice(0, 6).join(', ')}`;
  }
  // Bloco de definições pronto a inserir em qualquer app (com as classes dessa app).
  function htmlGroq(c = {}){
    const g = groqConfig(), k = Object.assign({sub: 'sub', campo: 'campo', pri: 'bt pri', div: false}, c);
    const campo = (id, rotulo, tipo, valor, ph) => k.div
      ? `<div class="${k.campo}" style="display:block"><label for="${id}" class="${k.sub}">${rotulo}</label><input id="${id}" type="${tipo}" value="${esc(valor)}" placeholder="${ph}" autocomplete="off" spellcheck="false" style="width:100%;margin-top:6px"></div>`
      : `<label class="${k.campo}">${rotulo}<input id="${id}" type="${tipo}" value="${esc(valor)}" placeholder="${ph}" autocomplete="off" spellcheck="false"></label>`;
    return `<p class="${k.sub}">Quando o Gemini esgota o limite do dia ou falha, a IA passa para o Groq, outra IA gratuita que também lê fotos. A chave fica guardada uma vez e serve para todas as tuas apps (Garfada, Forja, Mirante, Nascente e Vertente). Para a criar: abre <a href="https://console.groq.com/keys" target="_blank" rel="noopener">console.groq.com/keys</a>, entra com a conta Google ou GitHub e toca em "Create API Key".</p>
      ${campo('iaGroqChave', 'Chave do Groq', 'password', g.chave, 'gsk_…')}${campo('iaGroqModelo', 'Modelo (tem de aceitar imagens)', 'text', g.modelo, GROQ_MODELO)}
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:8px"><button type="button" class="${k.pri}" data-ia-groq="testar">Guardar e testar</button><span class="${k.sub}" id="iaGroqEstado" style="margin:0">${g.chave ? 'Reserva pronta.' : ''}</span></div>`;
  }
  document.addEventListener('click', async e => {
    if (!e.target.closest('[data-ia-groq="testar"]')) return;
    const ch = document.getElementById('iaGroqChave'), mo = document.getElementById('iaGroqModelo'), st = document.getElementById('iaGroqEstado');
    definirGroq(ch ? ch.value : '', mo ? mo.value : '');
    if (!groqConfig().chave){ if (st) st.textContent = 'Sem chave: a reserva fica desligada.'; return; }
    if (st) st.textContent = 'A testar…';
    try { const t = await testarGroq(); if (st) st.textContent = t; } catch(err){ if (st) st.textContent = err.message; }
  });

  return {pedir, cancelar, ErroLimite, listarModelos, horaReset, groq: groqConfig, definirGroq, testarGroq, temGroq: () => !!groqConfig().chave, htmlGroq, GROQ_MODELO,
    VERSAO, chaveGemini, origemChave, temIA: propria => !!(chaveGemini(propria) || groqConfig().chave)};
})();
