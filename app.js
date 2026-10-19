'use strict';
/* Vertente — app de corrida do Daniel. Cada utilizador guarda os seus dados no próprio telemóvel (localStorage).
   Registo: print do Strava lido pela IA, GPX ou à mão; depois perguntas rápidas; a Cabra Velha comenta. */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const LS_CFG = 'vertente.cfg', LS_DADOS = 'vertente.dados';
const ler = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch(e){ return d; } };
const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch(e){ avisar('Não foi possível guardar: memória do navegador cheia.'); return false; } };

let cfg = Object.assign({nome: '', tom: 'picante', chave: '', modelo: ''}, ler(LS_CFG, {}));
let dados = Object.assign({corridas: []}, ler(LS_DADOS, {}));
const guardarCfg = () => gravar(LS_CFG, cfg);
const guardarDados = () => gravar(LS_DADOS, dados);

/* ---------- formatos ---------- */
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const hojeISO = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const dataObj = iso => new Date(iso + 'T12:00:00');
const fmtData = iso => { const d = dataObj(iso); return `${d.getDate()} ${MESES[d.getMonth()]}`; };
const fmtDataLonga = iso => { const d = dataObj(iso); return `${DIAS[d.getDay()][0].toUpperCase() + DIAS[d.getDay()].slice(1)}, ${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`; };
const diasEntre = (a, b) => Math.round((dataObj(b) - dataObj(a)) / 864e5);
const km = (v, c = 1) => (+v || 0).toLocaleString('pt-PT', {minimumFractionDigits: c, maximumFractionDigits: c});
const metros = v => Math.round(v || 0).toLocaleString('pt-PT');
function fmtTempo(s){ s = Math.round(s || 0); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`; }
const ritmo = c => c.dist > 0 && c.tempo > 0 ? c.tempo / c.dist : 0;
const fmtRitmo = s => s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`.replace(/:60$/, ':59') : '–';
function lerTempo(t){
  t = String(t || '').trim().replace(',', '.'); if (!t) return 0;
  if (!t.includes(':')) return Math.round(parseFloat(t) * 60) || 0; // só minutos
  const p = t.split(':').map(x => parseFloat(x) || 0);
  return Math.round(p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]);
}
const corEsforco = e => e >= 9 ? '#ff6b6b' : e >= 7 ? '#ff8a3d' : e >= 4 ? '#f2c66d' : '#7fd6a0';
const ALT_POR_KM = 100;
const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
let timerAviso = 0;
function avisar(t, ms = 3200){ const a = $('#aviso'); a.textContent = t; a.hidden = false; clearTimeout(timerAviso); timerAviso = setTimeout(() => a.hidden = true, ms); }

/* ---------- corridas preparadas para a montanha ---------- */
function preparar(){
  const l = dados.corridas.slice().sort((a, b) => (a.data + (a.hora || '')).localeCompare(b.data + (b.hora || '')) || a.criada - b.criada);
  let alt = 0, maxDist = 0, melhorR = 0;
  return l.map((c, i) => {
    const r = ritmo(c), alt0 = alt; alt += (c.dist || 0) * ALT_POR_KM;
    let rec = '';
    if (i > 0){
      const longa = c.dist > maxDist, rapida = c.dist >= 3 && r && (!melhorR || r < melhorR);
      rec = longa && rapida ? 'RECORDE' : longa ? 'MAIS LONGA' : rapida ? 'MAIS RÁPIDA' : '';
    }
    maxDist = Math.max(maxDist, c.dist || 0); if (c.dist >= 3 && r && (!melhorR || r < melhorR)) melhorR = r;
    return Object.assign({}, c, {alt0, alt1: alt, pausa: i ? diasEntre(l[i - 1].data, c.data) : 0, recorde: rec,
      rotulo: `${fmtData(c.data)} · ${km(c.dist)} km`, sub: `${fmtRitmo(r)} /km · ${fmtTempo(c.tempo)}`});
  });
}
function estadoAtual(lista){
  const u = lista[lista.length - 1];
  if (!u) return {dias: null, tempestade: false, cansado: false};
  const dias = diasEntre(u.data, hojeISO());
  return {dias, tempestade: dias >= 7, cansado: dias <= 1 && u.esforco >= 8};
}

/* ---------- a Cabra Velha ---------- */
const FALAS = {
  suave: {
    zero: ['Então, {nome}? A montanha não se sobe a olhar para ela. Toca no + quando fizeres a primeira corrida.', 'Tenho cem anos e subo isto mais depressa do que tu. Vamos lá começar.'],
    parado: ['{dias} dias sem subir. As pernas estão a ganhar teias de aranha, {nome}.', 'Olha a tempestade que se meteu. É o que dá ficar {dias} dias parado. Uma corridinha resolve.'],
    cansado: ['Senta-te, descansa. Mas não te habitues.', 'Bom esforço. Hoje recupera; amanhã quero-te de pé.'],
    normal: ['A montanha continua lá em cima. E tu continuas cá em baixo.', 'Cada quilómetro são cem metros. Faz as contas e mexe-te.', 'Não há cume. Há só o teu próximo acampamento.']
  },
  picante: {
    zero: ['Zero metros. Zero. Até a minha avó cabra tem mais altitude que tu, {nome}.', 'Instalaste uma app de corrida para quê? Para decorar o telemóvel?'],
    parado: ['{dias} dias parado. Já te confundi com uma pedra, {nome}.', 'Esta tempestade és tu, a apodrecer no sofá há {dias} dias. Sai daí.'],
    cansado: ['Estás sentado como um saco de batatas. Merecido, vá. Mas só hoje.', 'Esforço a sério, finalmente. Descansa, que amanhã há mais.'],
    normal: ['Isso que fizeste chama-se corrida? Eu chamo-lhe passear o cão.', 'Lá em cima ninguém quer saber das tuas desculpas.', 'Sobe. Daqui de cima a vista é melhor do que a tua preguiça.']
  },
  semfiltro: {
    zero: ['Zero metros, caralho. Vais correr ou vais ficar a olhar para a montanha como um bacalhau?', 'Porra, {nome}. Nem um quilómetro. Calça os ténis.'],
    parado: ['{dias} dias sem correr. Que merda é essa, {nome}? Mexe esse rabo.', 'Há {dias} dias que não sobes um metro. Até as pedras se mexem mais do que tu, porra.'],
    cansado: ['Rebentaste-te a sério. Respeito, caralho. Hoje descansa.', 'Estás de rastos, e bem. Amanhã quero-te outra vez a subir.'],
    normal: ['Isto não sobe sozinho, porra.', 'Achas que já fizeste muito? Ainda estás a ver as nuvens por baixo, caramba.', 'Cada desculpa tua é um metro que não sobes. Despacha-te.']
  }
};
const TONS = {suave: 'Suave', picante: 'Picante', semfiltro: 'Sem filtro'};
function falaDoMomento(lista, aleatoria){
  const e = estadoAtual(lista), f = FALAS[cfg.tom] || FALAS.picante;
  const u = lista[lista.length - 1];
  if (!aleatoria && u && u.cabra && e.dias !== null && e.dias <= 1) return u.cabra;
  const g = !lista.length ? f.zero : e.tempestade ? f.parado : e.cansado ? f.cansado : f.normal;
  return g[Math.floor(Math.random() * g.length)].replace(/\{nome\}/g, cfg.nome || 'corredor').replace(/\{dias\}/g, e.dias);
}
const TOM_IA = {
  suave: 'Suave: provocas com carinho e humor leve, sem insultos pesados.',
  picante: 'Picante: insultos sarcásticos e duros, à portuguesa, mas sem palavrões.',
  semfiltro: 'Sem filtro: linguagem de caserna; podes usar palavrões portugueses (porra, merda, caralho) com moderação.'
};
function resumoCorrida(c){
  const p = [`${c.data}: ${km(c.dist, 2)} km em ${fmtTempo(c.tempo)} (ritmo ${fmtRitmo(ritmo(c))}/km)`];
  if (c.desnivel) p.push(`desnível ${Math.round(c.desnivel)} m`);
  if (c.fc) p.push(`FC média ${Math.round(c.fc)}`);
  if (c.esforco) p.push(`esforço ${c.esforco}/10`);
  if (c.sensacao) p.push(`sentiu-se ${c.sensacao}`);
  return p.join(', ');
}
async function pedirComentario(id){
  const lista = preparar(), i = lista.findIndex(c => c.id === id), c = lista[i];
  if (!c) return '';
  const ant = lista.slice(Math.max(0, i - 6), i);
  const total = lista[lista.length - 1].alt1 / ALT_POR_KM;
  const z = Montanha.zonaDe(c.alt1).nome;
  const texto = `És a Cabra Velha: uma cabra montesa velha e rabugenta, guia de montanha na app de corrida Vertente. Cada km corrido dá ${ALT_POR_KM} m de altitude numa montanha sem cume.
O corredor chama-se ${cfg.nome || 'corredor'} e acabou de registar uma corrida.
Tom pedido: ${TOM_IA[cfg.tom] || TOM_IA.picante}
Regras:
- Português de Portugal (nunca do Brasil). Sem emojis.
- 2 ou 3 frases curtas, no máximo 45 palavras.
- Usa números concretos: compara o ritmo e a distância com as corridas anteriores, e o esforço sentido com o ritmo real.
- Rebaixa-o verbalmente para o puxar para cima. O alvo é a preguiça, as desculpas e o ritmo; nunca o corpo, o peso, a aparência ou quem ele é.
- Acaba sempre a empurrá-lo para a próxima subida.
- Se ele indicou dores, sono mau ou energia baixa, baixa o tom e manda-o cuidar-se (descansar, não forçar), sem deixares de ser a cabra.
Corrida de hoje: ${resumoCorrida(c)}${c.dores && c.dores.length ? `, dores: ${c.dores.map(d => ZONAS_DOR[d] || d).join(', ')}` : ', sem dores'}, sono ${c.sono || '?'}, energia ${c.energia || '?'}${c.nota ? `, nota dele: "${c.nota}"` : ''}.
Altitude: subiu de ${metros(c.alt0)} m para ${metros(c.alt1)} m (zona ${z})${c.recorde ? `. Bateu um recorde: ${c.recorde.toLowerCase()}` : ''}. Dias desde a corrida anterior: ${i ? c.pausa : 'é a primeira'}.
Corridas anteriores (mais antigas primeiro): ${ant.length ? ant.map(resumoCorrida).join(' | ') : 'nenhuma'}.
Total acumulado: ${km(total)} km em ${lista.length} corridas.
Responde só em JSON: {"comentario": "..."}`;
  const r = await IA.pedir({texto, json: true, chave: cfg.chave, modelo: cfg.modelo, temperatura: .9, espera: 45000});
  let t = '';
  try { t = JSON.parse(r.replace(/^```json|```$/g, '').trim()).comentario || ''; } catch(e){ t = r; }
  return String(t).trim().replace(/^"|"$/g, '');
}

/* ---------- montanha e HUD ---------- */
let lista = preparar(), balaoAte = 0, balaoTexto = '', vistaAtual = 'vMontanha', subindo = false;
function atualizarMontanha(){
  lista = preparar();
  Montanha.definir(lista, estadoAtual(lista));
  if (!subindo) $('#altNum').textContent = metros(lista.length ? lista[lista.length - 1].alt1 : 0);
  $('#altKm').textContent = `${km(lista.reduce((s, c) => s + (c.dist || 0), 0))} km`;
}
function mostrarBalao(texto, ms = 11000){ balaoTexto = texto; $('#balaoTxt').innerHTML = texto; balaoAte = performance.now() + ms; }
function colocarBalao(p){
  const b = $('#balao'), visivel = vistaAtual === 'vMontanha' && performance.now() < balaoAte && !longe && $('#folha').hidden;
  if (!visivel){ if (!b.hidden) b.hidden = true; return; }
  b.hidden = false;
  const r = $('#montanha').getBoundingClientRect(), w = b.offsetWidth, x = Math.max(w / 2 + 10, Math.min(r.width - w / 2 - 10, p.x));
  b.style.left = x + 'px'; b.style.top = (p.y - 8) + 'px';
  b.style.setProperty('--seta', Math.max(14, Math.min(w - 14, w / 2 + (p.x - x))) + 'px');
}
let longe = false;
function iniciarMontanha(){
  Montanha.iniciar($('#montanha'), {
    onVista: v => {
      longe = v.longe; $('#btTopo').hidden = !v.longe || subindo;
      if (!subindo) $('#altZona').textContent = Montanha.zonaDe(subindo ? v.cam : v.topo).nome;
      if (Math.abs(v.cam - v.topo) > 120) $('#dica').style.opacity = 0;
    },
    onCabra: colocarBalao,
    onToqueCabra: () => mostrarBalao(esc(falaDoMomento(lista, true))),
    onAcampamento: c => abrirDetalhe(c.id)
  });
  atualizarMontanha(); Montanha.irTopo(false);
  setTimeout(() => mostrarBalao(esc(falaDoMomento(lista))), 900);
  if (lista.length > 2) setTimeout(() => $('#dica').style.opacity = 0, 6000); else $('#dica').textContent = lista.length ? 'Arrasta para baixo para descer a montanha' : 'Toca no + para registar a primeira corrida';
}

/* ---------- navegação ---------- */
function irVista(id){
  vistaAtual = id;
  document.querySelectorAll('.vista').forEach(v => v.hidden = v.id !== id);
  document.querySelectorAll('#nav [data-vista]').forEach(b => b.classList.toggle('on', b.dataset.vista === id));
  Montanha.ligar(id === 'vMontanha');
  if (id === 'vProgresso') renderProgresso();
  if (id === 'vPerfil') renderPerfil();
}

/* ---------- folha ---------- */
function abrirFolha(html){ $('#folhaCaixa').innerHTML = html; $('#folha').hidden = false; $('#folhaCaixa').scrollTop = 0; }
function fecharFolha(){ $('#folha').hidden = true; $('#folhaCaixa').innerHTML = ''; novo = null; }

/* ---------- registar corrida ---------- */
let novo = null;
const ICONES = {
  foto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M9 7h6M9 11h6M9 15h3"/></svg>',
  gpx: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19c3-1 3-6 6-7s4 3 7 1 3-7 3-9"/><circle cx="4" cy="19" r="1.6"/><circle cx="20" cy="4" r="1.6"/></svg>',
  mao: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/></svg>'
};
function abrirRegisto(){
  novo = {data: hojeISO(), dist: '', tempo: 0, desnivel: '', fc: '', cal: '', parciais: [], pontos: null, origem: 'manual', esforco: 0, sensacao: 'normal', dores: [], sono: 'ok', energia: 'média', nota: ''};
  abrirFolha(`<h2>Nova subida</h2><p class="suave peq" style="margin:0 0 16px">Como queres registar a corrida?</p>
    <div class="escolhas">
      <button class="escolha" data-acao="escFoto">${ICONES.foto}<div><b>Print do Strava</b><span>A Cabra lê o resumo e preenche os números. Também podes partilhar o print diretamente para a Vertente.</span></div></button>
      <button class="escolha" data-acao="escGpx">${ICONES.gpx}<div><b>Ficheiro GPX</b><span>Exportado do Strava (no site: atividade → ⋯ → Exportar GPX). Traz o mapa do percurso.</span></div></button>
      <button class="escolha" data-acao="escMao">${ICONES.mao}<div><b>À mão</b><span>Distância e tempo, sem complicações.</span></div></button>
    </div>`);
}
async function imagemReduzida(ficheiro){
  const url = URL.createObjectURL(ficheiro);
  try {
    const img = await new Promise((ok, falha) => { const i = new Image(); i.onload = () => ok(i); i.onerror = falha; i.src = url; });
    const k = Math.min(1, 1100 / img.width, 2400 / img.height), c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', .85);
  } finally { URL.revokeObjectURL(url); }
}
async function tratarFoto(ficheiro){
  if (!novo) abrirRegisto();
  let img;
  try { img = await imagemReduzida(ficheiro); } catch(e){ avisar('Não consegui abrir essa imagem.'); return; }
  novo.origem = 'foto';
  if (!IA.temIA(cfg.chave)){
    abrirFolha(`<h2>Sem IA configurada</h2><p class="suave">Para a Cabra ler o print, põe a chave do Gemini (ou a do Groq) no Perfil. Entretanto, podes preencher à mão.</p><img class="previa" src="${img}" alt=""><div class="linhaBts"><button class="btn" data-acao="irPerfil">Ir ao Perfil</button><button class="btn pri" data-acao="escMao">Preencher à mão</button></div>`);
    return;
  }
  abrirFolha(`<h2>A ler o print</h2><img class="previa" src="${img}" alt="Print da corrida"><div class="carrega"><span class="roda"></span><span id="estadoIA">A Cabra está a pôr os óculos…</span></div><button class="btn larg" data-acao="cancelarIA">Cancelar</button>`);
  const texto = `Lê este print de um resumo de atividade (Strava, Garmin, Google Fit ou outro relógio). Hoje é ${hojeISO()} (${DIAS[new Date().getDay()]}).
Devolve só JSON com: {"e_corrida": true/false, "tipo": "corrida"|"caminhada"|"bicicleta"|"outro", "data": "AAAA-MM-DD" ou null, "hora": "HH:MM" ou null, "distancia_km": número, "tempo_s": número (tempo em movimento; se só houver o total, usa esse), "desnivel_m": número ou null, "fc_media": número ou null, "calorias": número ou null, "parciais_s": [segundos de cada km completo, por ordem] ou []}.
Datas podem vir em português ou inglês ("Hoje", "Ontem", "19 de out. de 2026", "Yesterday"). Converte milhas para km se for o caso. Se não vires um valor, usa null. Não inventes números.`;
  try {
    const r = await IA.pedir({texto, imagens: [img], json: true, chave: cfg.chave, modelo: cfg.modelo, espera: 60000, aviso: t => { const e = $('#estadoIA'); if (e) e.textContent = t; }});
    if (!novo) return;
    const j = JSON.parse(r.replace(/^```json|```$/g, '').trim());
    if (j.e_corrida === false && j.tipo && j.tipo !== 'corrida') avisar(`Isto parece ${j.tipo}, não corrida. Confirma os dados.`, 4500);
    const n = v => v === null || v === undefined || v === '' || isNaN(+v) ? '' : +v;
    Object.assign(novo, {
      data: /^\d{4}-\d{2}-\d{2}$/.test(j.data || '') && j.data <= hojeISO() ? j.data : hojeISO(), hora: /^\d{1,2}:\d{2}$/.test(j.hora || '') ? j.hora : '',
      dist: n(j.distancia_km), tempo: Math.round(+j.tempo_s || 0), desnivel: n(j.desnivel_m), fc: n(j.fc_media), cal: n(j.calorias),
      parciais: Array.isArray(j.parciais_s) ? j.parciais_s.map(Number).filter(x => x > 60 && x < 1800) : []
    });
    passoDados(img);
  } catch(e){
    if (!novo) return;
    if (e.message === 'Cancelado.') return;
    abrirFolha(`<h2>A Cabra não conseguiu ler</h2><p class="erro">${esc(e.message || e)}</p><img class="previa" src="${img}" alt=""><div class="linhaBts"><button class="btn" data-acao="escFoto">Outro print</button><button class="btn pri" data-acao="escMao">Preencher à mão</button></div>`);
  }
}
function lerGpx(texto){
  const xml = new DOMParser().parseFromString(texto, 'application/xml');
  const pts = [...xml.getElementsByTagName('trkpt'), ...xml.getElementsByTagName('rtept')].map(p => ({
    lat: +p.getAttribute('lat'), lon: +p.getAttribute('lon'),
    ele: +((p.getElementsByTagName('ele')[0] || {}).textContent || NaN),
    t: Date.parse((p.getElementsByTagName('time')[0] || {}).textContent || '')
  })).filter(p => isFinite(p.lat) && isFinite(p.lon));
  if (pts.length < 2) throw new Error('O ficheiro não tem pontos de percurso.');
  const R = 6371e3, rad = x => x * Math.PI / 180;
  const dist = (a, b) => { const dLa = rad(b.lat - a.lat), dLo = rad(b.lon - a.lon), h = Math.sin(dLa / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
  let d = 0, mov = 0, sobe = 0, refEle = isFinite(pts[0].ele) ? pts[0].ele : null, proxKm = 1000, tKm = pts[0].t;
  const parciais = [];
  for (let i = 1; i < pts.length; i++){
    const a = pts[i - 1], b = pts[i], s = dist(a, b), dt = (b.t - a.t) / 1000;
    d += s;
    if (isFinite(dt) && dt > 0 && dt < 60 && s / dt > .6) mov += dt; // conta só em movimento
    if (isFinite(b.ele) && refEle !== null){ if (b.ele - refEle > 3){ sobe += b.ele - refEle; refEle = b.ele; } else if (b.ele < refEle) refEle = b.ele; }
    if (d >= proxKm && isFinite(b.t) && isFinite(tKm)){ parciais.push(Math.round((b.t - tKm) / 1000)); tKm = b.t; proxKm += 1000; }
  }
  const total = isFinite(pts[0].t) && isFinite(pts[pts.length - 1].t) ? (pts[pts.length - 1].t - pts[0].t) / 1000 : 0;
  const passo = Math.max(1, Math.ceil(pts.length / 300));
  const pontos = pts.filter((_, i) => i % passo === 0 || i === pts.length - 1).map(p => [+p.lat.toFixed(5), +p.lon.toFixed(5)]);
  const d0 = isFinite(pts[0].t) ? new Date(pts[0].t) : new Date();
  return {dist: +(d / 1000).toFixed(2), tempo: Math.round(mov > total * .5 ? mov : total), desnivel: Math.round(sobe) || '', parciais: parciais.filter(x => x > 60 && x < 1800), pontos,
    data: new Date(d0 - d0.getTimezoneOffset() * 6e4).toISOString().slice(0, 10), hora: d0.toTimeString().slice(0, 5)};
}
async function tratarGpx(ficheiro){
  if (!novo) abrirRegisto();
  try { Object.assign(novo, lerGpx(await ficheiro.text()), {origem: 'gpx'}); passoDados(); }
  catch(e){ avisar('GPX inválido: ' + (e.message || e), 4500); }
}
function passoDados(img){
  const n = novo, ed = !!n.editId;
  abrirFolha(`<h2>${ed ? 'Editar corrida' : 'Os números'}</h2>
    ${img ? `<img class="previa" src="${img}" alt="">` : ''}
    ${n.origem === 'foto' ? '<p class="suave peq" style="margin:4px 0">Confirma o que a Cabra leu. Ela é velha e já vê mal.</p>' : ''}
    <label class="campo"><span>Data</span><input type="date" id="cData" value="${esc(n.data)}" max="${hojeISO()}"></label>
    <div class="duas">
      <label class="campo"><span>Distância (km)</span><input type="number" id="cDist" inputmode="decimal" step="0.01" min="0" value="${esc(n.dist)}" placeholder="5,20"></label>
      <label class="campo"><span>Tempo</span><input type="text" id="cTempo" inputmode="numeric" value="${n.tempo ? fmtTempo(n.tempo) : ''}" placeholder="28:47"></label>
    </div>
    <div class="ritmoVivo" id="ritmoVivo"></div>
    <div class="duas">
      <label class="campo"><span>Desnível (m)</span><input type="number" id="cDesn" inputmode="numeric" value="${esc(n.desnivel)}" placeholder="opcional"></label>
      <label class="campo"><span>FC média</span><input type="number" id="cFc" inputmode="numeric" value="${esc(n.fc)}" placeholder="opcional"></label>
    </div>
    <label class="campo"><span>Calorias</span><input type="number" id="cCal" inputmode="numeric" value="${esc(n.cal)}" placeholder="opcional"></label>
    ${n.parciais.length ? `<p class="suave mini">${n.parciais.length} parciais por km guardados.</p>` : ''}
    <p class="erro" id="erroDados" hidden></p>
    <div class="linhaBts">${ed ? '<button class="btn" data-acao="fechar">Cancelar</button>' : '<button class="btn" data-acao="registar">Voltar</button>'}<button class="btn pri" data-acao="dadosOk">Seguinte</button></div>`);
  const vivo = () => { const d = parseFloat(String($('#cDist').value).replace(',', '.')), t = lerTempo($('#cTempo').value); $('#ritmoVivo').textContent = d > 0 && t > 0 ? `Ritmo ${fmtRitmo(t / d)} /km · +${metros(d * ALT_POR_KM)} m de altitude` : ''; };
  $('#cDist').addEventListener('input', vivo); $('#cTempo').addEventListener('input', vivo); vivo();
}
function lerDados(){
  const num = id => { const v = parseFloat(String($(id).value).replace(',', '.')); return isFinite(v) ? v : ''; };
  const d = num('#cDist'), t = lerTempo($('#cTempo').value), data = $('#cData').value || hojeISO();
  const erro = !(d > 0) ? 'Falta a distância.' : !(t > 0) ? 'Falta o tempo (por exemplo 28:47).' : d > 120 ? 'Mais de 120 km numa corrida? Nem eu acredito.' : t / d < 120 ? 'Esse ritmo é mais rápido do que o recorde do mundo. Confirma.' : data > hojeISO() ? 'A data não pode ser no futuro.' : '';
  if (erro){ const e = $('#erroDados'); e.textContent = erro; e.hidden = false; return false; }
  Object.assign(novo, {dist: +d, tempo: t, data, desnivel: num('#cDesn'), fc: num('#cFc'), cal: num('#cCal')});
  return true;
}
const ZONAS_DOR = {lombar: 'Lombar', anca: 'Anca', coxaE: 'Coxa esq.', coxaD: 'Coxa dir.', joelhoE: 'Joelho esq.', joelhoD: 'Joelho dir.', gemeoE: 'Gémeo esq.', gemeoD: 'Gémeo dir.', peE: 'Pé/tornozelo esq.', peD: 'Pé/tornozelo dir.'};
function svgCorpo(sel){
  const z = (id, el) => el.replace('<e ', `<ellipse class="zona${sel.includes(id) ? ' on' : ''}" data-dor="${id}" `).replace('/>', '><title>' + ZONAS_DOR[id] + '</title></ellipse>');
  return `<svg viewBox="0 0 120 232" aria-label="Corpo, vista de costas">
    <path class="silh" d="M60 6a12 12 0 1 1 0 24a12 12 0 1 1 0-24zM44 34h32c6 0 10 4 11 10l6 44c.5 4-4 5-5 1l-6-36-2 46c0 4 0 7 1 11l2 40 1 30c0 4 3 8 3 13 0 4-9 4-11 0l-3-13-3-34-2-36h-2l-2 36-3 34-3 13c-2 4-11 4-11 0 0-5 3-9 3-13l1-30 2-40c1-4 1-7 1-11l-2-46-6 36c-1 4-5.5 3-5-1l6-44c1-6 5-10 11-10z"/>
    ${z('lombar', '<e cx="60" cy="86" rx="13" ry="7"/>')}${z('anca', '<e cx="60" cy="106" rx="18" ry="8"/>')}
    ${z('coxaE', '<e cx="49" cy="134" rx="8" ry="15"/>')}${z('coxaD', '<e cx="71" cy="134" rx="8" ry="15"/>')}
    ${z('joelhoE', '<e cx="49" cy="160" rx="6.5" ry="6.5"/>')}${z('joelhoD', '<e cx="71" cy="160" rx="6.5" ry="6.5"/>')}
    ${z('gemeoE', '<e cx="48" cy="184" rx="6" ry="11"/>')}${z('gemeoD', '<e cx="72" cy="184" rx="6" ry="11"/>')}
    ${z('peE', '<e cx="47" cy="214" rx="7" ry="7"/>')}${z('peD', '<e cx="73" cy="214" rx="7" ry="7"/>')}
  </svg>`;
}
function passoPerguntas(){
  const n = novo, ch = (grupo, vals) => vals.map(([v, r]) => `<button class="chip${n[grupo] === v ? ' on' : ''}" data-acao="perg" data-g="${grupo}" data-v="${v}">${r}</button>`).join('');
  abrirFolha(`<h2>Perguntas rápidas</h2><p class="suave peq" style="margin:0">Só o esforço é obrigatório. O resto já vem preenchido.</p>
    <h3>Esforço</h3>
    <div class="escala">${Array.from({length: 10}, (_, i) => `<button data-acao="esforco" data-v="${i + 1}" class="${n.esforco === i + 1 ? 'on' : ''}" style="${n.esforco === i + 1 ? `background:${corEsforco(i + 1)}` : ''}">${i + 1}</button>`).join('')}</div>
    <div class="escalaLeg"><span>Passeio</span><span>Morri</span></div>
    <h3>Como te sentiste</h3><div class="chips">${ch('sensacao', [['pesado', 'Pesado'], ['normal', 'Normal'], ['leve', 'Leve']])}</div>
    <h3>Dores (vista de costas)</h3>
    <div class="corpo">${svgCorpo(n.dores)}<div class="lista"><p style="margin:0 0 10px">Toca onde dói.</p><div id="listaDores">${listaDores()}</div><button class="chip${n.dores.length ? '' : ' on'}" data-acao="semDores" style="margin-top:10px">Sem dores</button></div></div>
    <h3>Sono antes</h3><div class="chips">${ch('sono', [['mau', 'Mau'], ['ok', 'Ok'], ['bom', 'Bom']])}</div>
    <h3>Energia antes</h3><div class="chips">${ch('energia', [['baixa', 'Baixa'], ['média', 'Média'], ['alta', 'Alta']])}</div>
    <h3>Nota</h3><textarea id="cNota" placeholder="Opcional. Podes ditar com o microfone do teclado.">${esc(n.nota)}</textarea>
    <p class="erro" id="erroPerg" hidden>Diz-me o esforço, de 1 a 10.</p>
    <div class="linhaBts"><button class="btn" data-acao="voltarDados">Voltar</button><button class="btn pri" data-acao="guardar">${n.editId ? 'Guardar' : 'Subir'}</button></div>`);
}
const listaDores = () => novo.dores.length ? novo.dores.map(d => `<div style="color:#ff9b9b">• ${ZONAS_DOR[d]}</div>`).join('') : '<div>Nenhuma.</div>';
async function guardarCorrida(){
  novo.nota = ($('#cNota').value || '').trim();
  if (!novo.esforco){ $('#erroPerg').hidden = false; return; }
  const campos = ['data', 'hora', 'dist', 'tempo', 'desnivel', 'fc', 'cal', 'parciais', 'pontos', 'origem', 'esforco', 'sensacao', 'dores', 'sono', 'energia', 'nota'];
  const reg = {}; campos.forEach(k => reg[k] = novo[k] === undefined ? '' : novo[k]);
  const antes = lista.length ? lista[lista.length - 1].alt1 : 0;
  if (novo.editId){
    const c = dados.corridas.find(x => x.id === novo.editId);
    Object.assign(c, reg); guardarDados(); fecharFolha(); atualizarMontanha(); avisar('Corrida atualizada.');
    return;
  }
  const c = Object.assign({id: novoId(), criada: Date.now(), cabra: ''}, reg);
  dados.corridas.push(c);
  if (!guardarDados()){ dados.corridas.pop(); return; }
  fecharFolha(); irVista('vMontanha');
  atualizarMontanha();
  const depois = lista[lista.length - 1].alt1, ultimaMinha = lista[lista.length - 1].id === c.id;
  const zAntes = Montanha.zonaDe(antes).nome;
  subindo = true; $('#btTopo').hidden = true; balaoAte = 0;
  const de = ultimaMinha ? antes : depois;
  $('#altNum').textContent = metros(de);
  Montanha.subir(de, depois, cam => { $('#altNum').textContent = metros(cam); $('#altZona').textContent = Montanha.zonaDe(cam).nome; }, async () => {
    subindo = false; $('#altNum').textContent = metros(depois); $('#altZona').textContent = Montanha.zonaDe(depois).nome;
    const zDepois = Montanha.zonaDe(depois).nome;
    if (ultimaMinha && zDepois !== zAntes) avisar(`Nova zona desbloqueada: ${zDepois}`, 5000);
    if (!IA.temIA(cfg.chave)){ mostrarBalao(esc(falaDoMomento(lista, true)) + '<br><small style="opacity:.7">Põe a chave da IA no Perfil para eu comentar a sério.</small>'); return; }
    mostrarBalao('<span class="pontos"><i></i><i></i><i></i></span>', 60000);
    try {
      const t = await pedirComentario(c.id);
      const x = dados.corridas.find(k => k.id === c.id); if (x && t){ x.cabra = t; guardarDados(); lista = preparar(); }
      mostrarBalao(esc(t || falaDoMomento(lista, true)), 16000);
    } catch(e){ mostrarBalao(esc(falaDoMomento(lista, true)) + `<br><small style="opacity:.7">${esc(e.message || 'A IA não respondeu.')}</small>`); }
  });
}

/* ---------- detalhe de uma corrida ---------- */
function svgParciais(p){
  const max = Math.max(...p), min = Math.min(...p), W = 320, H = 110, bw = Math.min(28, (W - 10) / p.length - 4);
  return `<svg class="grafico" viewBox="0 0 ${W} ${H + 16}">${p.map((s, i) => {
    const h = 20 + (H - 26) * (1 - (s - min) / Math.max(1, max - min)) , x = 5 + i * (bw + 4);
    return `<rect x="${x}" y="${H - h}" width="${bw}" height="${h}" rx="4" fill="${s === min ? '#ff8a3d' : '#9cc3e6'}" opacity="${s === min ? 1 : .55}"/><text x="${x + bw / 2}" y="${H + 12}" text-anchor="middle">${i + 1}</text>${bw > 22 ? `<text x="${x + bw / 2}" y="${H - h + 12}" text-anchor="middle" style="fill:#0b1016;font-weight:700;font-size:9px">${fmtRitmo(s)}</text>` : ''}`;
  }).join('')}</svg>`;
}
function svgPercurso(pts){
  const la = pts.map(p => p[0]), lo = pts.map(p => p[1]), k = Math.cos(la[0] * Math.PI / 180);
  const minX = Math.min(...lo) * k, maxX = Math.max(...lo) * k, minY = Math.min(...la), maxY = Math.max(...la);
  const W = 320, H = 200, s = Math.min((W - 20) / Math.max(1e-9, maxX - minX), (H - 20) / Math.max(1e-9, maxY - minY));
  const ox = (W - (maxX - minX) * s) / 2, oy = (H - (maxY - minY) * s) / 2;
  const xy = pts.map(p => [ox + (p[1] * k - minX) * s, H - oy - (p[0] - minY) * s]);
  return `<svg class="grafico" viewBox="0 0 ${W} ${H}" style="background:#0d141c;border-radius:14px"><polyline points="${xy.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="#ff8a3d" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${xy[0][0]}" cy="${xy[0][1]}" r="5" fill="#7fd6a0"/><circle cx="${xy[xy.length - 1][0]}" cy="${xy[xy.length - 1][1]}" r="5" fill="#ff6b6b"/></svg>`;
}
function abrirDetalhe(id){
  const c = preparar().find(x => x.id === id); if (!c) return;
  const est = (v, u, r) => v ? `<div class="cartao"><div class="num">${v}<small>${u}</small></div><div class="rot">${r}</div></div>` : '';
  const sim = {pesado: 'Pesado', normal: 'Normal', leve: 'Leve'};
  abrirFolha(`<h2>${fmtDataLonga(c.data)}</h2>
    <p class="suave peq" style="margin:2px 0 14px">+${metros(c.alt1 - c.alt0)} m · de ${metros(c.alt0)} a ${metros(c.alt1)} m · ${Montanha.zonaDe(c.alt1).nome}${c.recorde ? ` · <b style="color:#ffb057">${c.recorde.toLowerCase()}</b>` : ''}</p>
    <div class="estats">${est(km(c.dist, 2), 'km', 'Distância')}${est(fmtTempo(c.tempo), '', 'Tempo')}${est(fmtRitmo(ritmo(c)), '/km', 'Ritmo')}${est(c.desnivel ? metros(c.desnivel) : '', 'm', 'Desnível')}${est(c.fc ? Math.round(c.fc) : '', 'bpm', 'FC média')}${est(c.cal ? Math.round(c.cal) : '', 'kcal', 'Calorias')}</div>
    ${c.cabra ? `<h3>A Cabra disse</h3><div class="citacao"><small>Cabra Velha</small><span id="txtCabra">${esc(c.cabra)}</span></div>` : '<h3>A Cabra</h3><div class="citacao"><small>Cabra Velha</small><span id="txtCabra" class="suave">Ainda não comentou esta.</span></div>'}
    <button class="btn" style="margin-top:8px" data-acao="outraCabra" data-id="${c.id}">${c.cabra ? 'Pedir outro comentário' : 'Pedir comentário'}</button>
    ${c.parciais && c.parciais.length ? `<h3>Parciais por km</h3>${svgParciais(c.parciais)}` : ''}
    ${c.pontos && c.pontos.length > 1 ? `<h3>Percurso</h3>${svgPercurso(c.pontos)}` : ''}
    <h3>Como foi</h3>
    <div class="chips"><span class="chip on" style="background:${corEsforco(c.esforco)};color:#140b05;border:0">Esforço ${c.esforco}/10</span><span class="chip">${sim[c.sensacao] || '–'}</span><span class="chip">Sono ${c.sono || '–'}</span><span class="chip">Energia ${c.energia || '–'}</span></div>
    ${c.dores && c.dores.length ? `<p style="color:#ff9b9b;margin:10px 0 0">Dores: ${c.dores.map(d => ZONAS_DOR[d]).join(', ')}</p>` : ''}
    ${c.nota ? `<p class="suave" style="margin:10px 0 0">“${esc(c.nota)}”</p>` : ''}
    <div class="linhaBts"><button class="btn perigo" data-acao="apagar" data-id="${c.id}">Apagar</button><button class="btn" data-acao="editar" data-id="${c.id}">Editar</button></div>`);
}

/* ---------- progresso ---------- */
function semanaDe(iso){ const d = dataObj(iso), k = (d.getDay() + 6) % 7; d.setDate(d.getDate() - k); return d.toISOString().slice(0, 10); }
function renderProgresso(){
  const l = preparar(), v = $('#vProgresso');
  if (!l.length){ v.innerHTML = `<h1 class="tit">Progresso</h1><div class="vazio"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M2 20l7-12 4 6 3-4 6 10z"/></svg><p>Ainda não há corridas.<br>Toca no + depois da próxima.</p></div>`; return; }
  const tot = l.reduce((s, c) => s + c.dist, 0), sem0 = semanaDe(hojeISO());
  const semanas = []; for (let i = 11; i >= 0; i--){ const d = dataObj(sem0); d.setDate(d.getDate() - 7 * i); semanas.push(d.toISOString().slice(0, 10)); }
  const porSem = semanas.map(s => l.filter(c => semanaDe(c.data) === s).reduce((a, c) => a + c.dist, 0));
  const estaSem = porSem[11];
  // gráfico semanal
  const W = 340, H = 140, mx = Math.max(5, ...porSem), bw = (W - 20) / 12 - 6;
  const barras = porSem.map((k, i) => { const h = k ? Math.max(3, (H - 30) * k / mx) : 0, x = 10 + i * (bw + 6); const d = dataObj(semanas[i]);
    return `<rect x="${x}" y="${H - 18 - h}" width="${bw}" height="${h}" rx="4" fill="${i === 11 ? '#ff8a3d' : '#9cc3e6'}" opacity="${i === 11 ? 1 : .6}"/>${k ? `<text x="${x + bw / 2}" y="${H - 22 - h}" text-anchor="middle">${km(k, k < 10 ? 1 : 0)}</text>` : ''}${i % 2 ? '' : `<text x="${x + bw / 2}" y="${H - 4}" text-anchor="middle">${d.getDate()}/${d.getMonth() + 1}</text>`}`; }).join('');
  // ritmo das últimas corridas (para cima = mais rápido)
  const ul = l.slice(-15).filter(c => ritmo(c)), rs = ul.map(ritmo), rMin = Math.min(...rs), rMax = Math.max(...rs), PH = 150;
  const px = i => 24 + i * (W - 40) / Math.max(1, ul.length - 1), py = r => 16 + (PH - 40) * (rMax === rMin ? .5 : (r - rMin) / (rMax - rMin));
  const linha = ul.length > 1 ? `<polyline points="${ul.map((c, i) => `${px(i).toFixed(1)},${py(rs[i]).toFixed(1)}`).join(' ')}" fill="none" stroke="#9cc3e6" stroke-width="2" stroke-linejoin="round"/>` : '';
  const pontos = ul.map((c, i) => `<circle cx="${px(i).toFixed(1)}" cy="${py(rs[i]).toFixed(1)}" r="4.5" fill="${corEsforco(c.esforco)}"/>`).join('');
  // recordes
  const maior = (f, filtro = () => true) => l.filter(filtro).reduce((m, c) => !m || f(c) > f(m) ? c : m, null);
  const menor = (f, filtro = () => true) => l.filter(filtro).reduce((m, c) => !m || f(c) < f(m) ? c : m, null);
  const longa = maior(c => c.dist), rapida = menor(ritmo, c => c.dist >= 3 && ritmo(c)), cinco = menor(ritmo, c => c.dist >= 5 && ritmo(c)), dez = menor(ritmo, c => c.dist >= 10 && ritmo(c)), subida = maior(c => +c.desnivel || 0, c => +c.desnivel > 0);
  const rec = (t, val, c) => c ? `<button class="recorde" data-acao="detalhe" data-id="${c.id}" style="width:100%;color:inherit;text-align:left"><span>${t}<br><span class="suave mini">${fmtData(c.data)}</span></span><b>${val}</b></button>` : '';
  v.innerHTML = `<h1 class="tit">Progresso</h1>
    <div class="grelha">
      <div class="cartao"><div class="num">${metros(l[l.length - 1].alt1)}<small>m</small></div><div class="rot">Altitude</div></div>
      <div class="cartao"><div class="num">${km(tot)}<small>km</small></div><div class="rot">Total</div></div>
      <div class="cartao"><div class="num">${l.length}</div><div class="rot">Corridas</div></div>
      <div class="cartao"><div class="num">${km(estaSem)}<small>km</small></div><div class="rot">Esta semana</div></div>
    </div>
    <h2 class="sec">Quilómetros por semana</h2>
    <div class="cartao"><svg class="grafico" viewBox="0 0 ${W} ${H}">${barras}</svg></div>
    <h2 class="sec">Ritmo das últimas corridas</h2>
    <div class="cartao"><svg class="grafico" viewBox="0 0 ${W} ${PH}"><text x="2" y="20">${fmtRitmo(rMin)}</text><text x="2" y="${PH - 22}">${fmtRitmo(rMax)}</text>${linha}${pontos}</svg>
      <p class="suave mini" style="margin:6px 0 0">Mais acima é mais rápido. A cor de cada ponto é o esforço que sentiste.</p></div>
    <h2 class="sec">Recordes</h2>
    <div class="recordes">${rec('Corrida mais longa', km(longa.dist, 2) + ' km', longa)}${rec('Melhor ritmo (3 km ou mais)', fmtRitmo(ritmo(rapida || {})) + ' /km', rapida)}${rec('Melhor 5 km (estimado)', cinco ? fmtTempo(ritmo(cinco) * 5) : '', cinco)}${rec('Melhor 10 km (estimado)', dez ? fmtTempo(ritmo(dez) * 10) : '', dez)}${rec('Mais desnível', subida ? metros(subida.desnivel) + ' m' : '', subida)}</div>
    <h2 class="sec">Todas as corridas</h2>
    <div class="lstCorr">${l.slice().reverse().map(c => { const d = dataObj(c.data); return `<button class="itemCorr" data-acao="detalhe" data-id="${c.id}"><div class="d"><b>${d.getDate()}</b><span>${MESES[d.getMonth()]}</span></div><div class="m"><b>${km(c.dist, 2)} km</b><span>${fmtTempo(c.tempo)} · ${fmtRitmo(ritmo(c))} /km${c.recorde ? ' · ' + c.recorde.toLowerCase() : ''}</span></div><span class="e" style="background:${corEsforco(c.esforco)}">${c.esforco}</span></button>`; }).join('')}</div>`;
}

/* ---------- perfil ---------- */
function renderPerfil(){
  const orig = !cfg.chave && IA.origemChave(cfg.chave);
  $('#vPerfil').innerHTML = `<h1 class="tit">Perfil</h1>
    <div class="cartao">
      <label class="campo" style="margin-top:0"><span>O teu nome</span><input type="text" id="pNome" value="${esc(cfg.nome)}" placeholder="Como a Cabra te chama"></label>
      <span class="suave mini">Tom da Cabra Velha</span>
      <div class="chips" style="margin-top:6px">${Object.entries(TONS).map(([k, r]) => `<button class="chip${cfg.tom === k ? ' on' : ''}" data-acao="tom" data-v="${k}">${r}</button>`).join('')}</div>
      <p class="suave mini" style="margin:8px 0 0">${{suave: 'Provoca com carinho.', picante: 'Insultos sarcásticos, sem palavrões.', semfiltro: 'Com palavrões. Avisado estás.'}[cfg.tom]}</p>
    </div>
    <h2 class="sec">IA (Gemini)</h2>
    <div class="cartao">
      <label class="campo" style="margin-top:0"><span>Chave do Gemini (opcional)</span><input type="password" id="pChave" value="${esc(cfg.chave)}" placeholder="AIza…" autocomplete="off"></label>
      <p class="suave mini" style="margin:0">${orig ? `Sem chave própria: a usar a chave ${orig === 'outra app tua' ? 'de outra app tua' : 'da ' + esc(orig)}, neste aparelho.` : cfg.chave ? 'A usar a tua chave.' : IA.temGroq() ? 'Sem chave do Gemini: a IA usa o Groq de reserva.' : 'Cria uma chave gratuita em aistudio.google.com (Get API key). Se já tiveres a Garfada, a Forja ou a Nascente neste telemóvel, a Vertente usa a mesma chave sozinha.'}</p>
      <button class="btn" style="margin-top:10px" data-acao="guardarPerfil">Guardar</button>
    </div>
    <h2 class="sec">IA de reserva (Groq)</h2>
    <div class="cartao">${IA.htmlGroq({sub: 'suave mini', campo: 'campo', pri: 'btn', div: true})}</div>
    <h2 class="sec">Cópia de segurança</h2>
    <div class="cartao"><p class="suave mini" style="margin:0 0 10px">Os dados vivem só neste telemóvel. Guarda uma cópia de vez em quando.</p>
      <div class="linhaBts" style="margin:0"><button class="btn" data-acao="exportar">Exportar</button><button class="btn" data-acao="importar">Importar</button></div></div>
    <h2 class="sec">Sobre</h2>
    <div class="cartao peq suave">
      <p style="margin:0 0 8px">Cada quilómetro que corres são ${ALT_POR_KM} metros de altitude. A montanha não tem cume.</p>
      <p style="margin:0 0 8px">Instala a Vertente no ecrã principal (menu do Chrome → Adicionar ao ecrã principal) para poderes partilhar os prints do Strava diretamente para ela.</p>
      <button class="btn perigo" data-acao="apagarTudo">Apagar todos os dados</button>
    </div>`;
}

/* ---------- boas-vindas ---------- */
function boasVindas(){
  abrirFolha(`<h2>Quem vem lá?</h2><p class="suave" style="margin:2px 0 14px">A Cabra Velha guarda esta montanha há cem anos. Antes de subires, quer saber com quem está a falar.</p>
    <label class="campo"><span>O teu nome</span><input type="text" id="bNome" placeholder="Nome" autocomplete="given-name"></label>
    <span class="suave mini">Como queres que ela te trate?</span>
    <div class="chips" style="margin:6px 0 4px">${Object.entries(TONS).map(([k, r]) => `<button class="chip${cfg.tom === k ? ' on' : ''}" data-acao="tomBV" data-v="${k}">${r}</button>`).join('')}</div>
    <p class="suave mini" id="bTomTxt" style="margin:4px 0 0">${{suave: 'Provoca com carinho.', picante: 'Insultos sarcásticos, sem palavrões.', semfiltro: 'Com palavrões.'}[cfg.tom]}</p>
    <div class="linhaBts"><button class="btn pri larg" data-acao="comecar">Começar a subir</button></div>`);
}

/* ---------- cliques ---------- */
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-acao],[data-vista],[data-dor]'); if (!b) return;
  if (b.dataset.vista){ irVista(b.dataset.vista); return; }
  if (b.dataset.dor){ const d = b.dataset.dor, i = novo.dores.indexOf(d); i < 0 ? novo.dores.push(d) : novo.dores.splice(i, 1); b.classList.toggle('on', i < 0); $('#listaDores').innerHTML = listaDores(); document.querySelector('[data-acao="semDores"]').classList.toggle('on', !novo.dores.length); return; }
  const a = b.dataset.acao, id = b.dataset.id;
  switch (a){
    case 'fechar': fecharFolha(); break;
    case 'topo': Montanha.irTopo(); break;
    case 'registar': abrirRegisto(); break;
    case 'escFoto': $('#fFoto').value = ''; $('#fFoto').click(); break;
    case 'escGpx': $('#fGpx').value = ''; $('#fGpx').click(); break;
    case 'escMao': if (!novo) abrirRegisto(); novo.origem = novo.origem === 'foto' ? 'foto' : 'manual'; passoDados(); break;
    case 'cancelarIA': IA.cancelar(); abrirRegisto(); break;
    case 'dadosOk': if (lerDados()) passoPerguntas(); break;
    case 'voltarDados': novo.nota = ($('#cNota').value || '').trim(); passoDados(); break;
    case 'esforco': novo.esforco = +b.dataset.v; document.querySelectorAll('.escala button').forEach(x => { const on = +x.dataset.v === novo.esforco; x.classList.toggle('on', on); x.style.background = on ? corEsforco(novo.esforco) : ''; }); $('#erroPerg').hidden = true; break;
    case 'perg': novo[b.dataset.g] = b.dataset.v; b.parentElement.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === b)); break;
    case 'semDores': novo.dores = []; document.querySelectorAll('.corpo .zona').forEach(x => x.classList.remove('on')); $('#listaDores').innerHTML = listaDores(); b.classList.add('on'); break;
    case 'guardar': guardarCorrida(); break;
    case 'detalhe': abrirDetalhe(id); break;
    case 'editar': {
      const c = dados.corridas.find(x => x.id === id); if (!c) break;
      novo = Object.assign({hora: '', parciais: [], pontos: null, dores: [], nota: ''}, JSON.parse(JSON.stringify(c)), {editId: id}); passoDados(); break;
    }
    case 'apagar':
      if (!confirm('Apagar esta corrida? A altitude desce os metros correspondentes.')) break;
      dados.corridas = dados.corridas.filter(x => x.id !== id); guardarDados(); fecharFolha(); atualizarMontanha(); Montanha.irTopo(); if (vistaAtual === 'vProgresso') renderProgresso(); avisar('Corrida apagada.'); break;
    case 'outraCabra': {
      if (!IA.temIA(cfg.chave)){ avisar('Põe a chave da IA no Perfil.'); break; }
      const t = $('#txtCabra'); t.className = ''; t.innerHTML = '<span class="pontos" style="display:inline-flex;gap:4px"><i style="width:6px;height:6px;border-radius:50%;background:#a0561f;animation:pulso 1s infinite"></i></span> a resmungar…'; b.disabled = true;
      try { const txt = await pedirComentario(id); const c = dados.corridas.find(x => x.id === id); if (c && txt){ c.cabra = txt; guardarDados(); lista = preparar(); } t.textContent = txt || 'A Cabra ficou calada.'; }
      catch(err){ t.textContent = err.message || 'A IA não respondeu.'; }
      b.disabled = false; break;
    }
    case 'tom': cfg.tom = b.dataset.v; guardarCfg(); renderPerfil(); break;
    case 'guardarPerfil': cfg.nome = $('#pNome').value.trim(); cfg.chave = $('#pChave').value.trim(); guardarCfg(); renderPerfil(); avisar('Guardado.'); break;
    case 'irPerfil': fecharFolha(); irVista('vPerfil'); break;
    case 'tomBV': cfg.tom = b.dataset.v; b.parentElement.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === b)); $('#bTomTxt').textContent = {suave: 'Provoca com carinho.', picante: 'Insultos sarcásticos, sem palavrões.', semfiltro: 'Com palavrões.'}[cfg.tom]; break;
    case 'comecar': {
      const n = $('#bNome').value.trim(); if (!n){ $('#bNome').focus(); break; }
      cfg.nome = n; guardarCfg(); fecharFolha(); mostrarBalao(esc(falaDoMomento(lista, true))); break;
    }
    case 'exportar': {
      const blob = new Blob([JSON.stringify({app: 'vertente', versao: 1, exportado: new Date().toISOString(), cfg: {nome: cfg.nome, tom: cfg.tom}, corridas: dados.corridas}, null, 1)], {type: 'application/json'});
      const u = URL.createObjectURL(blob), l = document.createElement('a'); l.href = u; l.download = `vertente-${hojeISO()}.json`; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000); break;
    }
    case 'importar': $('#fBackup').value = ''; $('#fBackup').click(); break;
    case 'apagarTudo':
      if (!confirm('Apagar todas as corridas deste telemóvel? Não há volta atrás.')) break;
      dados = {corridas: []}; guardarDados(); atualizarMontanha(); Montanha.irTopo(false); avisar('Montanha limpa. De volta à base.'); break;
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#folha').hidden) fecharFolha(); });
$('#fFoto').addEventListener('change', e => { const f = e.target.files[0]; if (f) tratarFoto(f); });
$('#fGpx').addEventListener('change', e => { const f = e.target.files[0]; if (f) tratarGpx(f); });
$('#fBackup').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const j = JSON.parse(await f.text());
    if (!Array.isArray(j.corridas)) throw new Error('Este ficheiro não é uma cópia da Vertente.');
    const validas = j.corridas.filter(c => c && c.id && c.data && c.dist > 0);
    if (!confirm(`Importar ${validas.length} corridas? As que já existem são substituídas.`)) return;
    const mapa = new Map(dados.corridas.map(c => [c.id, c])); validas.forEach(c => mapa.set(c.id, c));
    dados.corridas = [...mapa.values()]; guardarDados(); atualizarMontanha(); Montanha.irTopo(false); avisar(`${validas.length} corridas importadas.`);
  } catch(err){ avisar(err.message || 'Ficheiro inválido.'); }
});

/* ---------- partilha (Strava → Vertente) ---------- */
async function verPartilha(){
  if (!/[?&]partilha=1/.test(location.search)) return;
  history.replaceState(null, '', location.pathname);
  try {
    const c = await caches.open('vertente-partilha'), r = await c.match('ficheiro'); if (!r) return;
    const blob = await r.blob(), nome = decodeURIComponent(r.headers.get('X-Nome') || ''); await c.delete('ficheiro');
    const f = new File([blob], nome || 'partilha', {type: blob.type});
    if (/gpx|xml/i.test(blob.type) || /\.gpx$/i.test(nome)) tratarGpx(f); else tratarFoto(f);
  } catch(e){ avisar('Não consegui abrir o ficheiro partilhado.'); }
}

/* ---------- arranque ---------- */
iniciarMontanha();
if (!cfg.nome) setTimeout(boasVindas, 600);
verPartilha();
if (/[?&]acao=registar/.test(location.search)){ history.replaceState(null, '', location.pathname); abrirRegisto(); }
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
