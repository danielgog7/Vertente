'use strict';
/* Vertente — app de corrida do Daniel. Cada utilizador guarda os seus dados no próprio telemóvel (localStorage).
   Registo: print do Strava lido pela IA, GPX ou à mão; depois perguntas rápidas; a Cabra Velha comenta. */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const LS_CFG = 'vertente.cfg', LS_DADOS = 'vertente.dados';
const ler = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch(e){ return d; } };
const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch(e){ avisar('Não foi possível guardar: memória do navegador cheia.'); return false; } };

let cfg = Object.assign({nome: '', tom: 'picante', chave: '', modelo: '', som: false, volume: .6, poupanca: 'auto'}, ler(LS_CFG, {}));
let dados = Object.assign({corridas: []}, ler(LS_DADOS, {}));
dados.corridas = dados.corridas || [];
const guardarCfg = () => gravar(LS_CFG, cfg);
const guardarDados = () => gravar(LS_DADOS, dados);

/* ---------- formatos ---------- */
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const hojeISO = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const isoDe = d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const dataObj = iso => new Date(iso + 'T12:00:00');
const fmtData = iso => { const d = dataObj(iso); return `${d.getDate()} ${MESES[d.getMonth()]}`; };
const fmtDataLonga = iso => { const d = dataObj(iso); return `${DIAS[d.getDay()][0].toUpperCase() + DIAS[d.getDay()].slice(1)}, ${d.getDate()} ${MESES[d.getMonth()]}`; };
const segunda = iso => { const d = dataObj(iso), k = (d.getDay() + 6) % 7; d.setDate(d.getDate() - k); return isoDe(d); };
const diasEntre = (a, b) => Math.round((dataObj(b) - dataObj(a)) / 864e5);
const km = (v, c = 1) => (+v || 0).toLocaleString('pt-PT', {minimumFractionDigits: c, maximumFractionDigits: c});
const metros = v => Math.round(v || 0).toLocaleString('pt-PT', {useGrouping: 'always'}).replace(/\./g, ' ');
function fmtTempo(s){ s = Math.round(s || 0); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`; }
const ritmo = c => c && c.dist > 0 && c.tempo > 0 ? c.tempo / c.dist : 0;
const fmtRitmo = s => { if (!s) return '–'; s = Math.round(s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
function lerTempo(t){
  t = String(t || '').trim().replace(',', '.'); if (!t) return 0;
  if (!t.includes(':')) return Math.round(parseFloat(t) * 60) || 0;
  const p = t.split(':').map(x => parseFloat(x) || 0);
  return Math.round(p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]);
}
const corEsforco = e => ['#5fd39a', '#6fd38f', '#9bd36f', '#c9d35d', '#ecc75a', '#f6a94d', '#fa8a43', '#f9673b', '#f04a3a', '#d6304a'][Math.max(1, Math.min(10, e || 1)) - 1];
const NOME_ESFORCO = e => e <= 2 ? 'Passeio' : e <= 4 ? 'Leve' : e <= 6 ? 'Moderado' : e <= 8 ? 'Duro' : e === 9 ? 'Muito duro' : 'Máximo';
const ALT_POR_KM = 100;
const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const COR_ZONA = {Floresta: '#5fae74', 'Prado alpino': '#b6d36a', Rocha: '#9aa1b0', Glaciar: '#bfe3ff', 'Acima das nuvens': '#f4b98a', Estratosfera: '#8a8ff0', 'Órbita': '#5560c8'};
const URL_CABRA = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(Montanha.SVG_CABRA);
const avatar = (grande) => `<div class="av${grande ? ' grande' : ''}"><img src="${URL_CABRA}" alt=""></div>`;
let timerAviso = 0;
function avisar(t, ms = 3200, tipo = ''){ const a = $('#aviso'); a.className = 'aviso ' + tipo; a.innerHTML = t; a.hidden = false; clearTimeout(timerAviso); timerAviso = setTimeout(() => { a.hidden = true; proximoAviso(); }, ms); }
const filaAvisos = [];
function avisarFila(t, ms, tipo){ filaAvisos.push([t, ms, tipo]); if ($('#aviso').hidden) proximoAviso(); }
function proximoAviso(){ const p = filaAvisos.shift(); if (p) setTimeout(() => avisar(...p), 250); }
const vibrar = p => { try { navigator.vibrate && navigator.vibrate(p); } catch(e){} };

/* ---------- ícones ---------- */
const svgI = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"${extra}>${d}</svg>`;
const IC = {
  dist: svgI('<path d="M4 19c3-1 3-6 6-7s4 3 7 1 3-7 3-9"/><circle cx="4" cy="19" r="1.6"/><circle cx="20" cy="4" r="1.6"/>'),
  tempo: svgI('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M10 2h4"/>'),
  ritmo: svgI('<path d="M4 15a8 8 0 1 1 16 0"/><path d="M12 15l4-5"/><path d="M4 19h16"/>'),
  desnivel: svgI('<path d="M3 19l6-9 4 5 3-4 5 8z"/>'),
  fc: svgI('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M5 12h3l2-3 3 6 2-3h4"/>'),
  cal: svgI('<path d="M12 21c4 0 7-2.7 7-7 0-4-3-6-4-9-1 2-2 3-3 3 0-2-1-4-3-5 0 4-4 6-4 11 0 4.3 3 7 7 7z"/>'),
  alt: svgI('<path d="M2 20l7.5-13 4.5 7 2.5-3.5L22 20z"/>'),
  corridas: svgI('<path d="M13 4a1.8 1.8 0 1 0 0 .1"/><path d="M8 21l3-6 3 2v5M6 12l3-3 4 1 3 4h3"/><path d="M11 15l-2-4"/>'),
  semana: svgI('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  trofeu: svgI('<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M10 17h4"/>'),
  raio: svgI('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
  sobe: svgI('<path d="M7 17L17 7M9 7h8v8"/>'),
  desce: svgI('<path d="M7 7l10 10M17 9v8H9"/>'),
  foto: svgI('<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M9 7h6M9 11h6M9 15h3"/>'),
  gpx: svgI('<path d="M4 19c3-1 3-6 6-7s4 3 7 1 3-7 3-9"/><circle cx="4" cy="19" r="1.6"/><circle cx="20" cy="4" r="1.6"/>'),
  mao: svgI('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>'),
  seta: svgI('<path d="M9 6l6 6-6 6"/>'),
  pesado: svgI('<path d="M12 4v4"/><rect x="5" y="8" width="14" height="12" rx="3"/><path d="M9 14h6"/>'),
  normal: svgI('<circle cx="12" cy="12" r="8"/><path d="M8.5 14.5h7M9 10h.01M15 10h.01"/>'),
  leve: svgI('<path d="M20 4c-8 0-15 5-15 13l-1 3"/><path d="M5 17c5 0 10-3 12-9"/>'),
  sonoMau: svgI('<path d="M20 14a8 8 0 0 1-10-10 8 8 0 1 0 10 10z"/><path d="M15 3l3 3M18 3l-3 3"/>'),
  sonoOk: svgI('<path d="M20 14a8 8 0 0 1-10-10 8 8 0 1 0 10 10z"/>'),
  sonoBom: svgI('<path d="M20 14a8 8 0 0 1-10-10 8 8 0 1 0 10 10z"/><path d="M15 4h4l-4 4h4"/>'),
  bat1: svgI('<rect x="3" y="7" width="16" height="10" rx="2.5"/><path d="M21 10v4M6 10v4"/>'),
  bat2: svgI('<rect x="3" y="7" width="16" height="10" rx="2.5"/><path d="M21 10v4M6 10v4M9.5 10v4"/>'),
  bandeira: svgI('<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>'),
  check: svgI('<path d="M5 12l5 5 9-10"/>'),
  som: svgI('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>'),
  mudo: svgI('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>'),
  bateria: svgI('<rect x="3" y="7" width="16" height="10" rx="2.5"/><path d="M21 10v4"/><path d="M10 9l-2 3h4l-2 3"/>'),
  bat3: svgI('<rect x="3" y="7" width="16" height="10" rx="2.5"/><path d="M21 10v4M6 10v4M9.5 10v4M13 10v4M16 10v4"/>')
};

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
      rotulo: `${fmtData(c.data).toUpperCase()} · ${km(c.dist)} KM`, sub: `${fmtRitmo(r)} /km · ${fmtTempo(c.tempo)}`});
  });
}
function estadoAtual(lista){
  const u = lista[lista.length - 1];
  if (!u) return {dias: null, tempestade: false, cansado: false};
  const dias = diasEntre(u.data, hojeISO());
  return {dias, tempestade: dias >= 7, cansado: dias <= 1 && u.esforco >= 8};
}

/* ---------- a Cabra Velha ---------- */
const TONS = {suave: ['Suave', 'Provoca com carinho e humor leve.', 'Cada quilómetro são cem metros. Faz as contas e mexe-te.'],
  picante: ['Picante', 'Insultos sarcásticos, sem palavrões.', 'Isso que fizeste chama-se corrida? Eu chamo-lhe passear o cão.'],
  semfiltro: ['Sem filtro', 'Com palavrões. Avisado estás.', 'Isto não sobe sozinho, porra.']};
/* contexto para a Cabra: estatísticas, dia, hora, estação, tempo e zona */
function semanasSeguidas(l){
  const semanas = new Set(l.map(c => segunda(c.data))); let seq = 0; const s0 = dataObj(segunda(hojeISO()));
  if (!semanas.has(isoDe(s0))) s0.setDate(s0.getDate() - 7);
  while (semanas.has(isoDe(s0))){ seq++; s0.setDate(s0.getDate() - 7); }
  return seq;
}
function tendenciaRitmo(l){
  const rs = l.slice(-16).filter(c => ritmo(c)).map(ritmo), n = rs.length; if (n < 4) return 0;
  const mx = (n - 1) / 2, my = rs.reduce((a, b) => a + b, 0) / n;
  const b = rs.reduce((s, r, i) => s + (i - mx) * (r - my), 0) / rs.reduce((s, r, i) => s + (i - mx) ** 2, 0);
  return Math.round(b * (n - 1));
}
function contexto(){
  const l = lista, n = l.length, u = l[n - 1], hoje = hojeISO(), agora = new Date(), amb = Montanha.ambiente();
  const ant = l.slice(-11, -1), comR = ant.filter(c => ritmo(c));
  const sem0 = segunda(hoje), da = dataObj(sem0); da.setDate(da.getDate() - 7); const semAnt = isoDe(da);
  const kmDe = s => l.filter(c => segunda(c.data) === s).reduce((a, c) => a + c.dist, 0);
  const semanas = {}; l.forEach(c => { const s = segunda(c.data); if (s !== sem0) semanas[s] = (semanas[s] || 0) + c.dist; });
  const ultSem = Object.keys(semanas).sort().slice(-12).map(k => semanas[k]);
  const d30 = new Date(); d30.setDate(d30.getDate() - 30);
  const topo = u ? u.alt1 : 0, prox = Montanha.ZONAS.find(z => z.alt > topo);
  const rapidas = l.filter(c => c.dist >= 3 && ritmo(c));
  return {
    nome: cfg.nome || 'corredor', n, hoje, ultId: u ? u.id : '', ult: u ? Object.assign({}, u, {ritmo: ritmo(u)}) : null, ultData: u ? fmtData(u.data) : '',
    dias: u ? diasEntre(u.data, hoje) : null, dor: u && u.dores && u.dores.length ? u.dores.map(Corpo.nome).join(', ').toLowerCase() : '',
    ritmoMedio: comR.length ? comR.reduce((s, c) => s + ritmo(c), 0) / comR.length : 0,
    ritmoMelhor: rapidas.length ? Math.min(...rapidas.map(ritmo)) : 0,
    distMedia: ant.length ? ant.reduce((s, c) => s + c.dist, 0) / ant.length : 0, distMaisLonga: n ? Math.max(...l.map(c => c.dist)) : 0,
    kmSem: kmDe(sem0), kmSemAnt: kmDe(semAnt), mediaSem: ultSem.length ? ultSem.reduce((a, b) => a + b, 0) / ultSem.length : 0,
    seq: semanasSeguidas(l), c30: l.filter(c => c.data > isoDe(d30)).length, tendencia: tendenciaRitmo(l),
    kmTotal: l.reduce((s, c) => s + c.dist, 0), alt: topo, zona: Montanha.zonaDe(topo).nome,
    proxZona: prox ? {nome: prox.nome, falta: prox.alt - topo} : null, proxPlaca: 1000 - topo % 1000,
    hora: agora.getHours(), diaSem: agora.getDay(), diaNome: ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'][agora.getDay()],
    estacao: amb.estacao, tempo: amb.tempo, noite: amb.noite,
    desafio: (() => { const d = Metas.estado(l); return {texto: d.texto, curto: d.curto, feito: d.feito, frac: d.frac, txt: d.txt, dias: d.diasRestantes}; })(),
    previsao: Metas.previsao(l)
  };
}
function falaDoMomento(lista, aleatoria){
  const e = estadoAtual(lista), u = lista[lista.length - 1];
  if (!aleatoria && u && u.cabra && e.dias !== null && e.dias <= 1 && !sessionStorage.getItem('vertente.disse.' + u.id)){ sessionStorage.setItem('vertente.disse.' + u.id, '1'); return u.cabra; }
  return Cabra.proxima(contexto(), cfg.tom) || 'A montanha continua lá em cima.';
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
  const ant = lista.slice(Math.max(0, i - 6), i), total = lista[lista.length - 1].alt1 / ALT_POR_KM, z = Montanha.zonaDe(c.alt1).nome;
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
Corrida de hoje: ${resumoCorrida(c)}${c.dores && c.dores.length ? `, dores: ${c.dores.map(Corpo.nome).join(', ')}` : ', sem dores'}, sono ${c.sono || '?'}, energia ${c.energia || '?'}${c.nota ? `, nota dele: "${c.nota}"` : ''}.
Altitude: subiu de ${metros(c.alt0)} m para ${metros(c.alt1)} m (zona ${z})${c.recorde ? `. Bateu um recorde: ${c.recorde.toLowerCase()}` : ''}. Dias desde a corrida anterior: ${i ? c.pausa : 'é a primeira'}.
Corridas anteriores (mais antigas primeiro): ${ant.length ? ant.map(resumoCorrida).join(' | ') : 'nenhuma'}.
Total acumulado: ${km(total)} km em ${lista.length} corridas.
Responde só em JSON: {"comentario": "..."}`;
  const r = await IA.pedir({texto, json: true, chave: cfg.chave, modelo: cfg.modelo, temperatura: .9, espera: 45000});
  let t = '';
  try { t = JSON.parse(r.replace(/^```json|```$/g, '').trim()).comentario || ''; } catch(e){ t = r; }
  return String(t).trim().replace(/^"|"$/g, '');
}

/* ---------- montanha, HUD e altímetro ---------- */
let lista = preparar(), balaoAte = 0, vistaAtual = 'vMontanha', subindo = false, longe = false, escrita = 0;
function atualizarMontanha(){
  lista = preparar();
  const d = Metas.estado(lista);
  Montanha.definir(lista, estadoAtual(lista), {desafio: {alvoAlt: d.altEsperada, alt0: d.alt0, curto: d.curto, feito: d.feito}});
  mostrarDesafio(d);
  const topo = lista.length ? lista[lista.length - 1].alt1 : 0;
  if (!subindo) $('#altNum').textContent = metros(topo);
  $('#altKm').textContent = `${km(lista.reduce((s, c) => s + (c.dist || 0), 0))} km`;
  desenharAltimetro(topo);
}
function mostrarDesafio(d){
  const b = $('#desafioChip'); if (!b) return;
  b.classList.toggle('feito', d.feito);
  b.innerHTML = `${d.feito ? IC.check : IC.bandeira}<span><b>${d.feito ? 'Desafio cumprido' : 'Desafio'}</b>${esc(d.txt)}</span><i style="--p:${(d.frac * 100).toFixed(0)}%"></i>`;
}
function mostrarZona(nome){ $('#altZona').textContent = nome; $('#zonaCor').style.cssText = `background:${COR_ZONA[nome] || '#fff'};color:${COR_ZONA[nome] || '#fff'}`; }
let altMax = 2500, altTopo = 0;
function desenharAltimetro(topo){
  altTopo = topo; altMax = Math.max(2500, topo * 1.12 + 400);
  const segs = Montanha.ZONAS.map((z, i) => [z, Montanha.ZONAS[i + 1] ? Montanha.ZONAS[i + 1].alt : Infinity]).filter(([z]) => z.alt < altMax);
  $('#altEixo').innerHTML = segs.map(([z, fim]) => `<div class="seg" style="bottom:${z.alt / altMax * 100}%;height:${(Math.min(fim, altMax) - z.alt) / altMax * 100}%;background:${COR_ZONA[z.nome]};opacity:.28"></div>`).join('') + `<div class="feito" style="height:${topo / altMax * 100}%"></div>`;
  $('#altRiscas').innerHTML = segs.slice(1).map(([z]) => `<div class="risca" style="bottom:${z.alt / altMax * 100}%"><span>${z.alt / 1000}K</span></div>`).join('');
  $('#altTopo').style.bottom = (topo / altMax * 100) + '%';
}
function moverVista(cam){ $('#altVista').style.bottom = Math.max(0, Math.min(100, cam / altMax * 100)) + '%'; }
function ligarAltimetro(){
  const el = $('#altimetro'); let ativo = false;
  const alt = e => { const r = $('#altEixo').getBoundingClientRect(); return (1 - (e.clientY - r.top) / r.height) * altMax; };
  el.addEventListener('pointerdown', e => { ativo = true; el.setPointerCapture(e.pointerId); Montanha.irPara(alt(e), true); });
  el.addEventListener('pointermove', e => { if (ativo) Montanha.irPara(alt(e), false); });
  el.addEventListener('pointerup', () => ativo = false); el.addEventListener('pointercancel', () => ativo = false);
}
function mostrarBalao(texto, {ms = 12000, extra = '', carregar = false} = {}){
  const el = $('#balaoTxt'); clearInterval(escrita); balaoAte = performance.now() + ms;
  if (carregar){ el.innerHTML = '<span class="pontos"><i></i><i></i><i></i></span>'; return; }
  el.innerHTML = ''; const s = document.createElement('span'), cur = document.createElement('i'); cur.className = 'cursor'; el.append(s, cur);
  let i = 0;
  escrita = setInterval(() => { i += 2; s.textContent = texto.slice(0, i); if (i >= texto.length){ clearInterval(escrita); cur.remove(); if (extra) el.insertAdjacentHTML('beforeend', `<small>${extra}</small>`); } }, 24);
}
function colocarBalao(p){
  const b = $('#balao'), visivel = vistaAtual === 'vMontanha' && performance.now() < balaoAte && !longe && $('#folha').hidden;
  if (!visivel){ if (!b.hidden) b.hidden = true; return; }
  b.hidden = false;
  const W = innerWidth, w = b.offsetWidth, x = Math.max(w / 2 + 10, Math.min(W - w / 2 - 10, p.x));
  b.style.left = x + 'px'; b.style.top = (p.y - 6) + 'px';
  b.style.setProperty('--seta', Math.max(18, Math.min(w - 18, w / 2 + (p.x - x))) + 'px');
}
function iniciarMontanha(){
  $('#balaoAv').innerHTML = `<img src="${URL_CABRA}" alt="">`;
  Montanha.iniciar($('#montanha'), {
    onVista: v => {
      longe = v.longe; $('#btTopo').hidden = !v.longe || subindo;
      if (!subindo) mostrarZona(Montanha.zonaDe(v.topo).nome);
      moverVista(v.cam);
      if (Math.abs(v.cam - v.topo) > 120) $('#dica').style.opacity = 0;
    },
    onCabra: colocarBalao,
    onToqueCabra: () => mostrarBalao(falaDoMomento(lista, true)),
    onAcampamento: c => abrirDetalhe(c.id),
    onBandeira: () => abrirDesafio(),
    onRelampago: () => Som.trovao(),
    onPoupanca: () => { if (vistaAtual === 'vPerfil') renderPerfil(); }
  });
  Montanha.poupanca(cfg.poupanca);
  if (cfg.som) Som.ligar(true); Som.definirVolume(cfg.volume); mostrarSom();
  setInterval(() => { Som.atualizar(Montanha.ambiente()); Som.focar(vistaAtual === 'vMontanha' && $('#folha').hidden ? 1 : .35); }, 700);
  ligarAltimetro();
  atualizarMontanha(); Montanha.irTopo(false);
  const dz = Metas.estado(lista);
  if (dados.desafioVisto !== dz.semana && lista.length){ dados.desafioVisto = dz.semana; guardarDados(); setTimeout(() => mostrarBalao('Nova bandeira na encosta. ' + dz.texto, {ms: 16000}), 900); }
  else setTimeout(() => mostrarBalao(falaDoMomento(lista)), 900);
  if (!lista.length) $('#dica').textContent = 'Toca no + depois da primeira corrida';
  else if (lista.length > 2) setTimeout(() => $('#dica').style.opacity = 0, 6000);
}

function mostrarSom(){ const b = $('#somBt'); if (b){ b.innerHTML = cfg.som ? IC.som : IC.mudo; b.classList.toggle('on', cfg.som); b.setAttribute('aria-label', cfg.som ? 'Desligar sons' : 'Ligar sons'); } }

/* ---------- desafio da semana ---------- */
function htmlPrevisao(l){
  const p = Metas.previsao(l); if (!p) return '';
  return `<div class="previsao">${IC.desnivel}<div>A este ritmo chegas a <b>${esc(p.zona)}</b> ${p.dias <= 1 ? 'amanhã' : p.dias < 60 ? `a ${fmtData(p.data)}` : `daqui a ${Math.round(p.dias / 30)} meses`}<span>Faltam ${km(p.faltaKm)} km · média de ${km(p.kmSemana)} km por semana</span></div></div>`;
}
function abrirDesafio(){
  const d = Metas.estado(lista), hist = (dados.desafios || []).filter(x => x.semana !== d.semana).slice(-8).reverse();
  abrirFolha(`<h2>Desafio da semana</h2><p class="sub">${d.feito ? 'Cumprido. A bandeira já é tua.' : d.diasRestantes > 0 ? `Faltam ${d.diasRestantes} ${d.diasRestantes === 1 ? 'dia' : 'dias'}, até domingo.` : 'Último dia. É hoje ou nunca.'}</p>
    <div class="citacao">${avatar()}<div class="txt"><b>Cabra Velha</b>${esc(d.texto)}</div></div>
    <div class="cartao" style="margin-top:12px"><div class="cTit"><b>${esc(d.curto)}</b><span>${d.feito ? 'CUMPRIDO' : Math.round(d.frac * 100) + '%'}</span></div>
      <div class="barraProg${d.feito ? ' feito' : ''}"><i style="width:${(d.frac * 100).toFixed(1)}%"></i></div><p class="nota">${esc(d.txt)}</p></div>
    ${htmlPrevisao(lista)}
    ${hist.length ? `<div class="rotulo">Semanas anteriores · ${Metas.cumpridos()} cumpridos</div><div class="hist">${hist.map(h => `<div class="${h.feito ? 'sim' : 'nao'}">${h.feito ? IC.check : IC.bandeira}<span>${fmtData(h.semana)}</span><b>${esc(Metas.TIPOS[h.tipo].curto(h.alvo))}</b></div>`).join('')}</div>` : ''}
    <div class="linhaBts"><button class="btn larg" data-acao="fechar">Fechar</button></div>`);
}
function celebrar(){ // depois de guardar ou apagar: desafio cumprido e marcos novos
  const feito = Metas.verificar(lista);
  if (feito){ avisarFila(`<small>DESAFIO DA SEMANA</small>Bandeira conquistada`, 4200, 'zona'); vibrar([60, 60, 120]); }
  for (const m of Metas.novosMarcos(lista)) avisarFila(`<small>NOVO MARCO</small>${esc(m.nome)}`, 3600, 'zona marcoAv');
  atualizarMontanha();
  return feito;
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
function abrirFolha(html){ $('#folhaCaixa').innerHTML = html; $('#folha').hidden = false; $('#folhaCaixa').scrollTop = 0; }
function fecharFolha(){ $('#folha').hidden = true; $('#folhaCaixa').innerHTML = ''; novo = null; }
const passos = n => `<div class="passos">${[1, 2, 3].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</div>`;

/* ---------- registar corrida ---------- */
let novo = null;
function abrirRegisto(){
  novo = {data: hojeISO(), dist: '', tempo: 0, desnivel: '', fc: '', cal: '', parciais: [], pontos: null, origem: 'manual', esforco: 0, sensacao: 'normal', dores: [], sono: 'ok', energia: 'média', nota: ''};
  abrirFolha(`${passos(1)}<h2>Nova subida</h2><p class="sub">Como queres registar a corrida?</p>
    <div class="escolhas">
      <button class="escolha prim" data-acao="escFoto"><div class="ic">${IC.foto}</div><div><b>Print do Strava</b><span>A Cabra lê o resumo e preenche os números por ti.</span></div><span class="tag">MAIS RÁPIDO</span></button>
      <button class="escolha" data-acao="escGpx" style="--c:rgba(159,208,255,.12);--k:var(--gelo)"><div class="ic">${IC.gpx}</div><div><b>Ficheiro GPX</b><span>Exportado do Strava no site. Traz o mapa do percurso.</span></div><span class="seta">${IC.seta}</span></button>
      <button class="escolha" data-acao="escMao" style="--c:rgba(127,214,160,.12);--k:var(--musgo)"><div class="ic">${IC.mao}</div><div><b>À mão</b><span>Distância e tempo, sem complicações.</span></div><span class="seta">${IC.seta}</span></button>
    </div>
    <p class="nota">Dica: com a Vertente instalada, no Strava toca em partilhar o print e escolhe a Vertente.</p>`);
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
    abrirFolha(`${passos(1)}<h2>Sem IA configurada</h2><p class="sub">Para a Cabra ler o print, põe a chave do Gemini (ou a do Groq) no Perfil. Entretanto, podes preencher à mão.</p><img class="previa" src="${img}" alt=""><div class="linhaBts"><button class="btn" data-acao="irPerfil">Perfil</button><button class="btn pri" data-acao="escMao">À mão</button></div>`);
    return;
  }
  abrirFolha(`${passos(1)}<h2>A ler o print</h2><div class="leitura"><img class="previa" src="${img}" alt="Print da corrida"></div><div class="carrega"><span class="roda"></span><span id="estadoIA">A Cabra está a pôr os óculos…</span></div><button class="btn larg" data-acao="cancelarIA">Cancelar</button>`);
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
    if (!novo || e.message === 'Cancelado.') return;
    abrirFolha(`${passos(1)}<h2>A Cabra não conseguiu ler</h2><p class="erro">${esc(e.message || e)}</p><img class="previa" src="${img}" alt=""><div class="linhaBts"><button class="btn" data-acao="escFoto">Outro print</button><button class="btn pri" data-acao="escMao">À mão</button></div>`);
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
    if (isFinite(dt) && dt > 0 && dt < 60 && s / dt > .6) mov += dt;
    if (isFinite(b.ele) && refEle !== null){ if (b.ele - refEle > 3){ sobe += b.ele - refEle; refEle = b.ele; } else if (b.ele < refEle) refEle = b.ele; }
    if (d >= proxKm && isFinite(b.t) && isFinite(tKm)){ parciais.push(Math.round((b.t - tKm) / 1000)); tKm = b.t; proxKm += 1000; }
  }
  const total = isFinite(pts[0].t) && isFinite(pts[pts.length - 1].t) ? (pts[pts.length - 1].t - pts[0].t) / 1000 : 0;
  const passo = Math.max(1, Math.ceil(pts.length / 300));
  const pontos = pts.filter((_, i) => i % passo === 0 || i === pts.length - 1).map(p => [+p.lat.toFixed(5), +p.lon.toFixed(5)]);
  const d0 = isFinite(pts[0].t) ? new Date(pts[0].t) : new Date();
  return {dist: +(d / 1000).toFixed(2), tempo: Math.round(mov > total * .5 ? mov : total), desnivel: Math.round(sobe) || '', parciais: parciais.filter(x => x > 60 && x < 1800), pontos, data: isoDe(d0), hora: d0.toTimeString().slice(0, 5)};
}
async function tratarGpx(ficheiro){
  if (!novo) abrirRegisto();
  try { Object.assign(novo, lerGpx(await ficheiro.text()), {origem: 'gpx'}); passoDados(); }
  catch(e){ avisar('GPX inválido: ' + esc(e.message || e), 4500); }
}
function passoDados(img){
  const n = novo, ed = !!n.editId;
  abrirFolha(`${ed ? '' : passos(2)}<h2>${ed ? 'Editar corrida' : 'Os números'}</h2>
    <p class="sub">${n.origem === 'foto' ? 'Confirma o que a Cabra leu. Ela é velha e já vê mal.' : n.origem === 'gpx' ? 'Calculado a partir do GPX. Confirma.' : 'O essencial: distância e tempo.'}</p>
    ${img ? `<img class="previa" src="${img}" alt="">` : ''}
    <div class="duas">
      <label class="campo"><span>Distância · km</span><input class="grande" type="number" id="cDist" inputmode="decimal" step="0.01" min="0" value="${esc(n.dist)}" placeholder="5,20"></label>
      <label class="campo"><span>Tempo</span><input class="grande" type="text" id="cTempo" inputmode="numeric" value="${n.tempo ? fmtTempo(n.tempo) : ''}" placeholder="28:47"></label>
    </div>
    <div class="ritmoVivo" id="ritmoVivo"></div>
    <label class="campo"><span>Data</span><input type="date" id="cData" value="${esc(n.data)}" max="${hojeISO()}"></label>
    <div class="tres">
      <label class="campo"><span>Desnível · m</span><input type="number" id="cDesn" inputmode="numeric" value="${esc(n.desnivel)}" placeholder="–"></label>
      <label class="campo"><span>FC média</span><input type="number" id="cFc" inputmode="numeric" value="${esc(n.fc)}" placeholder="–"></label>
      <label class="campo"><span>Calorias</span><input type="number" id="cCal" inputmode="numeric" value="${esc(n.cal)}" placeholder="–"></label>
    </div>
    ${n.parciais.length ? `<p class="nota">${n.parciais.length} parciais por km guardados.</p>` : ''}
    <p class="erro" id="erroDados" hidden></p>
    <div class="linhaBts">${ed ? '<button class="btn" data-acao="fechar">Cancelar</button>' : '<button class="btn" data-acao="registar">Voltar</button>'}<button class="btn pri" data-acao="dadosOk">Seguinte</button></div>`);
  const vivo = () => {
    const d = parseFloat(String($('#cDist').value).replace(',', '.')), t = lerTempo($('#cTempo').value);
    $('#ritmoVivo').innerHTML = d > 0 && t > 0 ? `<div>${fmtRitmo(t / d)}<small>/km</small></div><div>+${metros(d * ALT_POR_KM)}<small>m de altitude</small></div>` : '<span class="vazio">O ritmo e a altitude ganha aparecem aqui.</span>';
  };
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
function passoPerguntas(){
  const n = novo, seg = (grupo, vals) => `<div class="seg3">${vals.map(([v, r, ic]) => `<button class="chip${n[grupo] === v ? ' on' : ''}" data-acao="perg" data-g="${grupo}" data-v="${v}">${IC[ic]}${r}</button>`).join('')}</div>`;
  abrirFolha(`${n.editId ? '' : passos(3)}<h2>Como foi?</h2><p class="sub">Só o esforço é obrigatório. O resto já vem preenchido.</p>
    <div class="rotulo">Esforço</div>
    <div class="esforco">${Array.from({length: 10}, (_, i) => `<button data-acao="esforco" data-v="${i + 1}" style="--i:${i};--c:${corEsforco(i + 1)}" class="${n.esforco === i + 1 ? 'on' : n.esforco > i + 1 ? 'antes' : ''}"><span>${i + 1}</span></button>`).join('')}</div>
    <div class="esforcoInfo" id="esforcoInfo">${n.esforco ? `<b style="color:${corEsforco(n.esforco)}">${n.esforco}</b><span>${NOME_ESFORCO(n.esforco)}</span>` : '<span>Toca na barra</span>'}</div>
    <div class="rotulo">Como te sentiste</div>${seg('sensacao', [['pesado', 'Pesado', 'pesado'], ['normal', 'Normal', 'normal'], ['leve', 'Leve', 'leve']])}
    <div class="rotulo">Dores</div>
    ${Corpo.svg(n.dores)}
    <div class="doresLista" id="listaDores">${listaDores()}</div>
    <div class="rotulo">Sono antes</div>${seg('sono', [['mau', 'Mau', 'sonoMau'], ['ok', 'Ok', 'sonoOk'], ['bom', 'Bom', 'sonoBom']])}
    <div class="rotulo">Energia antes</div>${seg('energia', [['baixa', 'Baixa', 'bat1'], ['média', 'Média', 'bat2'], ['alta', 'Alta', 'bat3']])}
    <div class="rotulo">Nota</div><textarea id="cNota" placeholder="Opcional. Podes ditar com o microfone do teclado.">${esc(n.nota)}</textarea>
    <p class="erro" id="erroPerg" hidden>Diz-me o esforço, de 1 a 10.</p>
    <div class="linhaBts"><button class="btn" data-acao="voltarDados">Voltar</button><button class="btn pri" data-acao="guardar">${n.editId ? 'Guardar' : 'Subir'}</button></div>`);
}
const listaDores = () => novo.dores.length ? novo.dores.map(d => `<span class="d">${esc(Corpo.nome(d))}</span>`).join('') + '<button class="chip" data-acao="semDores" style="padding:7px 10px;font-size:13px">Limpar</button>' : '<span class="nota" style="margin:0">Toca onde dói. Sem toques, fica "sem dores".</span>';
async function guardarCorrida(){
  novo.nota = ($('#cNota').value || '').trim();
  if (!novo.esforco){ $('#erroPerg').hidden = false; $('#erroPerg').scrollIntoView({behavior: 'smooth', block: 'center'}); return; }
  const campos = ['data', 'hora', 'dist', 'tempo', 'desnivel', 'fc', 'cal', 'parciais', 'pontos', 'origem', 'esforco', 'sensacao', 'dores', 'sono', 'energia', 'nota'];
  const reg = {}; campos.forEach(k => reg[k] = novo[k] === undefined ? '' : novo[k]);
  const antes = lista.length ? lista[lista.length - 1].alt1 : 0;
  if (novo.editId){
    const c = dados.corridas.find(x => x.id === novo.editId);
    Object.assign(c, reg); guardarDados(); fecharFolha(); atualizarMontanha(); celebrar(); if (vistaAtual === 'vProgresso') renderProgresso(); avisar('Corrida atualizada.');
    return;
  }
  const c = Object.assign({id: novoId(), criada: Date.now(), cabra: ''}, reg);
  Cabra.esquecerLote();
  dados.corridas.push(c);
  if (!guardarDados()){ dados.corridas.pop(); return; }
  fecharFolha(); irVista('vMontanha');
  atualizarMontanha();
  const depois = lista[lista.length - 1].alt1, ultimaMinha = lista[lista.length - 1].id === c.id, zAntes = Montanha.zonaDe(antes).nome;
  subindo = true; $('#btTopo').hidden = true; balaoAte = 0;
  const de = ultimaMinha ? antes : depois;
  $('#altNum').textContent = metros(de);
  Montanha.subir(de, depois, cam => { $('#altNum').textContent = metros(cam); mostrarZona(Montanha.zonaDe(cam).nome); }, async () => {
    subindo = false; $('#altNum').textContent = metros(depois); mostrarZona(Montanha.zonaDe(depois).nome);
    const zDepois = Montanha.zonaDe(depois).nome;
    if (ultimaMinha && zDepois !== zAntes) avisarFila(`<small>NOVA ZONA DESBLOQUEADA</small>${esc(zDepois)}`, 5200, 'zona');
    else avisarFila(`+${metros(depois - antes)} m · ${km(c.dist)} km`, 2600);
    const desafioFeito = celebrar();
    if (!IA.temIA(cfg.chave)){ mostrarBalao(falaDoMomento(lista, true), {extra: 'Põe a chave da IA no Perfil para eu comentar a sério.'}); return; }
    mostrarBalao('', {carregar: true, ms: 60000});
    try {
      const t = await pedirComentario(c.id);
      const x = dados.corridas.find(k => k.id === c.id); if (x && t){ x.cabra = t; guardarDados(); lista = preparar(); }
      mostrarBalao((t || falaDoMomento(lista, true)) + (desafioFeito ? ' E a bandeira da semana é tua.' : ''), {ms: 18000});
    } catch(e){ mostrarBalao(falaDoMomento(lista, true), {extra: esc(e.message || 'A IA não respondeu.')}); }
  });
}

/* ---------- detalhe de uma corrida ---------- */
function htmlParciais(p){
  const min = Math.min(...p), max = Math.max(...p);
  return `<div class="parciais">${p.map((s, i) => `<div class="parcial${s === min ? ' melhor' : ''}"><span class="k">${i + 1}</span><div class="b"><i style="width:${(40 + 60 * (max === min ? 1 : (max - s) / (max - min))).toFixed(1)}%"></i></div><span class="t">${fmtRitmo(s)}</span></div>`).join('')}</div>`;
}
function svgPercurso(pts){
  const la = pts.map(p => p[0]), lo = pts.map(p => p[1]), k = Math.cos(la[0] * Math.PI / 180);
  const minX = Math.min(...lo) * k, maxX = Math.max(...lo) * k, minY = Math.min(...la), maxY = Math.max(...la);
  const W = 340, H = 210, s = Math.min((W - 40) / Math.max(1e-9, maxX - minX), (H - 40) / Math.max(1e-9, maxY - minY));
  const ox = (W - (maxX - minX) * s) / 2, oy = (H - (maxY - minY) * s) / 2;
  const xy = pts.map(p => [ox + (p[1] * k - minX) * s, H - oy - (p[0] - minY) * s]), d = xy.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ');
  const grelha = Array.from({length: 9}, (_, i) => `<path d="M${i * 42.5} 0V${H}M0 ${i * 26.25}H${W}" stroke="rgba(255,255,255,.04)"/>`).join('');
  return `<div class="mapa"><svg class="grafico" viewBox="0 0 ${W} ${H}"><defs><filter id="brilho"><feGaussianBlur stdDeviation="4"/></filter></defs>${grelha}
    <polyline points="${d}" fill="none" stroke="#ff7a2f" stroke-width="7" opacity=".55" filter="url(#brilho)"/>
    <polyline points="${d}" fill="none" stroke="#ffb15c" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" class="anima-linha" style="--l:2000"/>
    <circle cx="${xy[0][0]}" cy="${xy[0][1]}" r="6" fill="#5fd39a" stroke="#0b121d" stroke-width="2.5"/><circle cx="${xy[xy.length - 1][0]}" cy="${xy[xy.length - 1][1]}" r="6" fill="#fff" stroke="#ff7a2f" stroke-width="3"/></svg></div>`;
}
function abrirDetalhe(id){
  const c = preparar().find(x => x.id === id); if (!c) return;
  const est = (v, u, r, ic) => v ? `<div class="estat"><div class="v n">${v}<small>${u}</small></div><div class="r">${IC[ic]}${r}</div></div>` : '';
  const SENS = {pesado: 'Pesado', normal: 'Normal', leve: 'Leve'};
  abrirFolha(`<h2>${fmtDataLonga(c.data)}</h2>
    <div class="detCab"><span class="tag fogo">+${metros(c.alt1 - c.alt0)} m</span><span class="tag"><i style="width:8px;height:8px;border-radius:50%;background:${COR_ZONA[Montanha.zonaDe(c.alt1).nome]}"></i>${Montanha.zonaDe(c.alt1).nome} · ${metros(c.alt1)} m</span>${c.recorde ? `<span class="tag ouro">${c.recorde.toLowerCase()}</span>` : ''}</div>
    <div class="estats">
      <div class="estat dest"><div><div class="v n">${km(c.dist, 2)}<small>KM</small></div><div class="r">${IC.dist}Distância</div></div><div style="text-align:right"><div class="v n" style="font-size:30px">${fmtRitmo(ritmo(c))}<small>/KM</small></div><div class="r" style="justify-content:flex-end">${IC.ritmo}Ritmo</div></div></div>
      ${est(fmtTempo(c.tempo), '', 'Tempo', 'tempo')}${est(c.desnivel ? metros(c.desnivel) : '', 'm', 'Desnível', 'desnivel')}${est(c.fc ? Math.round(c.fc) : '', 'bpm', 'FC média', 'fc')}${est(c.cal ? Math.round(c.cal) : '', 'kcal', 'Calorias', 'cal')}
      <div class="estat"><div class="v n" style="color:${corEsforco(c.esforco)}">${c.esforco || '–'}<small>/10</small></div><div class="r">${IC.raio}${c.esforco ? NOME_ESFORCO(c.esforco) : 'Esforço'}</div></div>
    </div>
    <div class="rotulo">A Cabra</div>
    <div class="citacao">${avatar()}<div class="txt"><b>Cabra Velha</b><span id="txtCabra">${c.cabra ? esc(c.cabra) : '<i style="color:#7b6f60">Ainda não comentou esta.</i>'}</span><br><button class="btnC" data-acao="outraCabra" data-id="${c.id}">${c.cabra ? 'Outro comentário' : 'Pedir comentário'}</button></div></div>
    ${c.parciais && c.parciais.length ? `<div class="rotulo">Parciais por km</div>${htmlParciais(c.parciais)}` : ''}
    ${c.pontos && c.pontos.length > 1 ? `<div class="rotulo">Percurso</div>${svgPercurso(c.pontos)}` : ''}
    <div class="rotulo">Como foi</div>
    <div class="chips"><span class="chip">${IC[c.sensacao] || IC.normal}${SENS[c.sensacao] || '–'}</span><span class="chip">${IC[{mau: 'sonoMau', ok: 'sonoOk', bom: 'sonoBom'}[c.sono] || 'sonoOk']}Sono ${c.sono || '–'}</span><span class="chip">${IC[{baixa: 'bat1', 'média': 'bat2', alta: 'bat3'}[c.energia] || 'bat2']}Energia ${c.energia || '–'}</span></div>
    ${c.dores && c.dores.length ? `<div style="margin-top:12px">${Corpo.svg(c.dores, {mini: true})}</div><div class="doresLista">${c.dores.map(d => `<span class="d">${esc(Corpo.nome(d))}</span>`).join('')}</div>` : '<p class="nota">Sem dores.</p>'}
    ${c.nota ? `<p style="margin:14px 0 0;color:var(--txt2);font-style:italic">“${esc(c.nota)}”</p>` : ''}
    <div class="linhaBts"><button class="btn perigo" data-acao="apagar" data-id="${c.id}">Apagar</button><button class="btn" data-acao="editar" data-id="${c.id}">Editar</button></div>`);
}

/* ---------- progresso ---------- */
function curva(pts){ // Catmull-Rom → Bézier
  if (pts.length < 3) return pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++){
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}
function svgPerfil(l){
  const W = 360, H = 200, pl = 6, pr = 44, pt = 20, pb = 24, hoje = dataObj(hojeISO());
  const t0 = dataObj(l[0].data) - 864e5 * 2, t1 = Math.max(+hoje, dataObj(l[l.length - 1].data)) + 864e5;
  const topo = l[l.length - 1].alt1, maxY = Math.max(2000, topo * 1.18);
  const X = t => pl + (t - t0) / (t1 - t0) * (W - pl - pr), Y = a => H - pb - a / maxY * (H - pt - pb);
  const pts = [[X(t0), Y(0)], ...l.map(c => [X(+dataObj(c.data)), Y(c.alt1)])];
  if (+hoje > +dataObj(l[l.length - 1].data)) pts.push([X(+hoje), Y(topo)]);
  // degraus suaves: a altitude só sobe
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++){ const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = x0 + (x1 - x0) * .55; d += `C${mx.toFixed(1)} ${y0.toFixed(1)} ${mx.toFixed(1)} ${y1.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`; }
  const zonas = Montanha.ZONAS.filter(z => z.alt > 0 && z.alt < maxY).map(z => `<path d="M${pl} ${Y(z.alt).toFixed(1)}H${W - pr + 4}" stroke="${COR_ZONA[z.nome]}" stroke-opacity=".35" stroke-dasharray="2 5"/><text x="${W - pr + 8}" y="${(Y(z.alt) + 3.5).toFixed(1)}" style="fill:${COR_ZONA[z.nome]};opacity:.85">${z.alt / 1000}K</text>`).join('');
  const meses = []; const dm = new Date(t0); dm.setDate(1); dm.setMonth(dm.getMonth() + 1);
  for (; +dm < t1; dm.setMonth(dm.getMonth() + 1)) meses.push(`<text x="${X(+dm).toFixed(1)}" y="${H - 6}" text-anchor="middle">${MESES[dm.getMonth()].toUpperCase()}</text><path d="M${X(+dm).toFixed(1)} ${H - pb}v4" stroke="rgba(255,255,255,.2)"/>`);
  const [ux, uy] = [X(+dataObj(l[l.length - 1].data)), Y(topo)];
  return `<svg class="grafico" viewBox="0 0 ${W} ${H}"><defs>
    <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a3d" stop-opacity=".5"/><stop offset=".6" stop-color="#ff8a3d" stop-opacity=".08"/><stop offset="1" stop-color="#ff8a3d" stop-opacity="0"/></linearGradient>
    <linearGradient id="gL" x1="0" x2="1"><stop offset="0" stop-color="#ffd27a"/><stop offset="1" stop-color="#ff7a2f"/></linearGradient>
    <filter id="gB"><feGaussianBlur stdDeviation="5"/></filter></defs>
    ${zonas}
    <path d="${d}L${pts[pts.length - 1][0].toFixed(1)} ${H - pb}L${pts[0][0].toFixed(1)} ${H - pb}Z" fill="url(#gA)"/>
    <path d="${d}" fill="none" stroke="#ff7a2f" stroke-width="6" opacity=".45" filter="url(#gB)"/>
    <path d="${d}" fill="none" stroke="url(#gL)" stroke-width="2.6" stroke-linecap="round" class="anima-linha" style="--l:1400"/>
    ${l.map(c => `<circle cx="${X(+dataObj(c.data)).toFixed(1)}" cy="${Y(c.alt1).toFixed(1)}" r="2.6" fill="#0e1624" stroke="#ffd27a" stroke-width="1.4"/>`).join('')}
    <circle cx="${ux.toFixed(1)}" cy="${uy.toFixed(1)}" r="11" fill="#ff7a2f" opacity=".2"><animate attributeName="r" values="7;13;7" dur="2.4s" repeatCount="indefinite"/></circle>
    <circle cx="${ux.toFixed(1)}" cy="${uy.toFixed(1)}" r="5.5" fill="#ff7a2f" stroke="#fff3e6" stroke-width="2"/>
    <path d="M${pl} ${H - pb}H${W - pr + 4}" stroke="rgba(255,255,255,.12)"/>${meses}</svg>`;
}
function htmlCalendario(l){
  const SEM = 18, porDia = {}; l.forEach(c => porDia[c.data] = (porDia[c.data] || 0) + c.dist);
  const ini = dataObj(segunda(hojeISO())); ini.setDate(ini.getDate() - 7 * (SEM - 1));
  const cs = 15, g = 3.5, W = 22 + SEM * (cs + g), H = 18 + 7 * (cs + g), hoje = hojeISO();
  const cor = k => !k ? 'rgba(255,255,255,.06)' : k < 3 ? '#6e3a1e' : k < 6 ? '#b4531f' : k < 10 ? '#ff7a2f' : '#ffc070';
  let cel = '', mesAnt = -1, meses = '';
  for (let s = 0; s < SEM; s++){
    for (let d = 0; d < 7; d++){
      const dt = new Date(ini); dt.setDate(dt.getDate() + s * 7 + d); const iso = isoDe(dt);
      if (iso > hoje) continue;
      const x = 22 + s * (cs + g), y = 18 + d * (cs + g), k = porDia[iso] || 0;
      cel += `<rect x="${x}" y="${y}" width="${cs}" height="${cs}" rx="4" fill="${cor(k)}"${iso === hoje ? ' stroke="#fff" stroke-width="1.5"' : ''}><title>${fmtData(iso)}${k ? ` · ${km(k)} km` : ''}</title></rect>`;
      if (d === 0 && dt.getMonth() !== mesAnt){ mesAnt = dt.getMonth(); meses += `<text x="${x}" y="11">${MESES[mesAnt].toUpperCase()}</text>`; }
    }
  }
  const dias = ['S', '', 'Q', '', 'S', '', 'D'].map((t, i) => t ? `<text x="4" y="${18 + i * (cs + g) + 11.5}">${t}</text>` : '').join('');
  // semanas seguidas com pelo menos uma corrida
  const seq = semanasSeguidas(l);
  const d30 = new Date(); d30.setDate(d30.getDate() - 30); const ult30 = l.filter(c => c.data > isoDe(d30)).length;
  return {svg: `<svg class="grafico" viewBox="0 0 ${W} ${H}">${meses}${dias}${cel}</svg>`, seq, ult30};
}
function svgSemanas(l){
  const sem0 = segunda(hojeISO()), sems = [];
  for (let i = 11; i >= 0; i--){ const d = dataObj(sem0); d.setDate(d.getDate() - 7 * i); sems.push(isoDe(d)); }
  const v = sems.map(s => l.filter(c => segunda(c.data) === s).reduce((a, c) => a + c.dist, 0));
  const ativas = v.filter(x => x > 0), media = ativas.length ? ativas.reduce((a, b) => a + b, 0) / ativas.length : 0;
  const W = 360, H = 170, pb = 22, pt = 18, mx = Math.max(5, ...v) * 1.1, bw = (W - 8) / 12 - 7;
  const Y = k => H - pb - k / mx * (H - pb - pt);
  const barras = v.map((k, i) => { const x = 4 + i * (bw + 7), y = Y(k), h = H - pb - y, cur = i === 11, d = dataObj(sems[i]);
    return `${k ? `<rect class="anima-barra" style="animation-delay:${i * 35}ms;transform-box:fill-box" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(3, h).toFixed(1)}" rx="6" fill="${cur ? 'url(#bC)' : 'url(#bN)'}"/>` : `<rect x="${x.toFixed(1)}" y="${H - pb - 3}" width="${bw.toFixed(1)}" height="3" rx="1.5" fill="rgba(255,255,255,.1)"/>`}
      ${k ? `<text x="${(x + bw / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle" style="fill:${cur ? '#ffb15c' : 'var(--txt2)'}">${km(k, k < 10 ? 1 : 0)}</text>` : ''}
      ${i % 3 === 2 || cur ? `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 5}" text-anchor="middle">${cur ? 'ESTA' : d.getDate() + ' ' + MESES[d.getMonth()].toUpperCase()}</text>` : ''}`; }).join('');
  const linhaMedia = media ? `<path d="M0 ${Y(media).toFixed(1)}H${W}" stroke="rgba(255,255,255,.35)" stroke-dasharray="4 5"/><text x="${W}" y="${(Y(media) - 5).toFixed(1)}" text-anchor="end" style="fill:var(--txt2)">MÉDIA ${km(media)}</text>` : '';
  return `<svg class="grafico" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="bC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc070"/><stop offset="1" stop-color="#ff7a2f"/></linearGradient><linearGradient id="bN" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fd0ff" stop-opacity=".75"/><stop offset="1" stop-color="#9fd0ff" stop-opacity=".22"/></linearGradient></defs>${linhaMedia}${barras}</svg>`;
}
function svgRitmo(l){
  const ul = l.slice(-16).filter(c => ritmo(c)); if (ul.length < 2) return {svg: '<p class="nota">Precisas de pelo menos duas corridas.</p>', delta: 0};
  const rs = ul.map(ritmo), rMin = Math.min(...rs), rMax = Math.max(...rs), pad = Math.max(8, (rMax - rMin) * .15);
  const W = 360, H = 170, pl = 38, pr = 10, pt = 14, pb = 16;
  const X = i => pl + i * (W - pl - pr) / (ul.length - 1), Y = r => pt + (r - (rMin - pad)) / ((rMax + pad) - (rMin - pad)) * (H - pt - pb);
  const pts = ul.map((c, i) => [X(i), Y(rs[i])]), d = curva(pts);
  // tendência (regressão linear)
  const n = rs.length, mxI = (n - 1) / 2, my = rs.reduce((a, b) => a + b, 0) / n;
  const b = rs.reduce((s, r, i) => s + (i - mxI) * (r - my), 0) / rs.reduce((s, r, i) => s + (i - mxI) ** 2, 0), a0 = my - b * mxI;
  const delta = Math.round(b * (n - 1)); // segundos/km entre a primeira e a última
  const grelha = [rMin, (rMin + rMax) / 2, rMax].map(r => `<path d="M${pl} ${Y(r).toFixed(1)}H${W - pr}" stroke="rgba(255,255,255,.06)"/><text x="0" y="${(Y(r) + 3.5).toFixed(1)}">${fmtRitmo(r)}</text>`).join('');
  return {delta, svg: `<svg class="grafico" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="rA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fd0ff" stop-opacity=".32"/><stop offset="1" stop-color="#9fd0ff" stop-opacity="0"/></linearGradient></defs>
    ${grelha}<path d="${d}L${pts[pts.length - 1][0].toFixed(1)} ${H - pb}L${pl} ${H - pb}Z" fill="url(#rA)"/>
    <path d="M${X(0).toFixed(1)} ${Y(a0).toFixed(1)}L${X(n - 1).toFixed(1)} ${Y(a0 + b * (n - 1)).toFixed(1)}" stroke="${delta <= 0 ? '#7fd6a0' : '#ffb15c'}" stroke-width="1.6" stroke-dasharray="5 5" opacity=".9"/>
    <path d="${d}" fill="none" stroke="#9fd0ff" stroke-width="2.4" stroke-linecap="round" class="anima-linha" style="--l:1200"/>
    ${pts.map((p, i) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4.6" fill="${corEsforco(ul[i].esforco)}" stroke="#0e1624" stroke-width="2"/>`).join('')}</svg>`};
}
function renderProgresso(){
  const l = preparar(), v = $('#vProgresso');
  if (!l.length){ v.innerHTML = `<div class="cab"><div><h1>Progresso</h1><p>Ainda não há corridas.</p></div></div><div class="cartao vazio">${avatar(true)}<p style="margin:14px 0 0">A Cabra está à espera da primeira subida.<br>Toca no + depois da próxima corrida.</p></div>`; v.querySelector('.av').style.margin = '0 auto'; return; }
  const tot = l.reduce((s, c) => s + c.dist, 0), topo = l[l.length - 1].alt1, sem0 = segunda(hojeISO());
  const estaSem = l.filter(c => segunda(c.data) === sem0).reduce((s, c) => s + c.dist, 0);
  const cal = htmlCalendario(l), rit = svgRitmo(l);
  const maior = (f, filtro = () => true) => l.filter(filtro).reduce((m, c) => !m || f(c) > f(m) ? c : m, null);
  const menor = (f, filtro = () => true) => l.filter(filtro).reduce((m, c) => !m || f(c) < f(m) ? c : m, null);
  const longa = maior(c => c.dist), rapida = menor(ritmo, c => c.dist >= 3 && ritmo(c)), cinco = menor(ritmo, c => c.dist >= 5 && ritmo(c)), dez = menor(ritmo, c => c.dist >= 10 && ritmo(c)), subida = maior(c => +c.desnivel || 0, c => +c.desnivel > 0);
  const rec = (t, val, u, c, ic) => c ? `<button class="rec" data-acao="detalhe" data-id="${c.id}"><div class="ic">${IC[ic]}</div><div class="v n">${val}<small>${u}</small></div><div class="r">${t}</div><div class="d">${fmtData(c.data)}</div></button>` : '';
  const kpi = (val, u, r, ic, c, k) => `<div class="cartao kpi"><div class="ic" style="--c:${c};--k:${k}">${IC[ic]}</div><div class="v n">${val}<small>${u}</small></div><div class="r">${r}</div></div>`;
  v.innerHTML = `<div class="cab"><div><h1>Progresso</h1><p>Desde ${fmtData(l[0].data)} · ${l.length} corridas</p></div></div>
    <div class="cartao heroi"><div class="cTit"><b>Perfil da escalada</b><span>${Montanha.zonaDe(topo).nome.toUpperCase()}</span></div>${svgPerfil(l)}<div style="padding:0 10px">${htmlPrevisao(l)}</div></div>
    ${(() => { const d = Metas.estado(l); return `<button class="cartao desafioCard${d.feito ? ' feito' : ''}" data-acao="desafio"><div class="cTit"><b>${IC.bandeira}Desafio da semana</b><span>${d.feito ? 'CUMPRIDO' : d.diasRestantes + ' DIAS'}</span></div><div class="dTxt">${esc(d.curto)}</div><div class="barraProg${d.feito ? ' feito' : ''}"><i style="width:${(d.frac * 100).toFixed(1)}%"></i></div><p class="nota">${esc(d.txt)} · ${Metas.cumpridos()} ${Metas.cumpridos() === 1 ? 'desafio cumprido' : 'desafios cumpridos'} no total</p></button>`; })()}
    <div class="kpis">${kpi(metros(topo), 'M', 'Altitude', 'alt', 'rgba(255,122,47,.15)', '#ffb15c')}${kpi(km(tot), 'KM', 'Total', 'dist', 'rgba(159,208,255,.13)', '#9fd0ff')}${kpi(l.length, '', 'Corridas', 'corridas', 'rgba(127,214,160,.13)', '#7fd6a0')}${kpi(km(estaSem), 'KM', 'Esta semana', 'semana', 'rgba(255,210,122,.13)', '#ffd27a')}</div>
    <div class="cartao"><div class="cTit"><b>Consistência</b><span>${cal.ult30} CORRIDAS EM 30 DIAS</span></div>${cal.svg}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px"><span class="insight${cal.seq ? '' : ' mau'}">${cal.seq ? `${cal.seq} ${cal.seq === 1 ? 'semana seguida' : 'semanas seguidas'} a correr` : 'Sem corridas esta semana nem na anterior'}</span>
      <span class="legenda">MENOS <i style="background:rgba(255,255,255,.06)"></i><i style="background:#6e3a1e"></i><i style="background:#b4531f"></i><i style="background:#ff7a2f"></i><i style="background:#ffc070"></i> MAIS</span></div></div>
    <div class="cartao" style="margin-top:10px"><div class="cTit"><b>Quilómetros por semana</b><span>12 SEMANAS</span></div>${svgSemanas(l)}</div>
    <div class="cartao" style="margin-top:10px"><div class="cTit"><b>Ritmo</b><span>ÚLTIMAS ${Math.min(16, l.length)}</span></div>${rit.svg}
      ${rit.delta ? `<span class="insight${rit.delta > 0 ? ' mau' : ''}">${rit.delta < 0 ? IC.sobe : IC.desce}${Math.abs(rit.delta)} s/km ${rit.delta < 0 ? 'mais rápido' : 'mais lento'} na tendência</span>` : ''}
      <p class="nota">Mais acima é mais rápido. A cor de cada ponto é o esforço que sentiste.</p></div>
    ${(() => { const ms = Metas.marcos(l), tem = ms.filter(m => m.tem).length; return `<div class="rotulo">Marcos · ${tem} de ${ms.length}</div><div class="marcos">${ms.map(m => `<div class="marco${m.tem ? ' tem' : ''}"${m.zona ? ` style="--z:${COR_ZONA[m.zona]}"` : ''} title="${esc(m.dica)}"><div class="med">${IC[m.ic] || IC.trofeu}</div><b>${esc(m.nome)}</b><span>${m.tem ? fmtData(m.data) : esc(m.dica)}</span></div>`).join('')}</div>`; })()}
    <div class="rotulo">Recordes</div>
    <div class="recs">${rec('Mais longa', km(longa.dist, 2), 'KM', longa, 'trofeu')}${rec('Melhor ritmo', fmtRitmo(ritmo(rapida)), '/KM', rapida, 'raio')}${rec('Melhor 5 km', cinco ? fmtTempo(ritmo(cinco) * 5) : '', '', cinco, 'tempo')}${rec('Melhor 10 km', dez ? fmtTempo(ritmo(dez) * 10) : '', '', dez, 'tempo')}${rec('Mais desnível', subida ? metros(subida.desnivel) : '', 'M', subida, 'desnivel')}</div>
    <p class="nota">Os tempos de 5 e 10 km são estimados a partir do ritmo de corridas com essa distância ou mais.</p>
    <div class="rotulo">Todas as corridas</div>
    <div class="lstCorr">${l.slice().reverse().map(c => { const d = dataObj(c.data); return `<button class="itemCorr" data-acao="detalhe" data-id="${c.id}"><div class="d"><b>${d.getDate()}</b><span>${MESES[d.getMonth()]}</span></div><div class="m"><b class="n">${km(c.dist, 2)}<small>KM</small></b><span>${fmtTempo(c.tempo)} · ${fmtRitmo(ritmo(c))} /km${c.recorde ? ' · ' + c.recorde.toLowerCase() : ''}</span></div><span class="e" style="background:${corEsforco(c.esforco)}">${c.esforco || '–'}</span></button>`; }).join('')}</div>`;
}

/* ---------- perfil ---------- */
function renderPerfil(){
  const orig = !cfg.chave && IA.origemChave(cfg.chave);
  $('#vPerfil').innerHTML = `<div class="cab"><div><h1>Perfil</h1><p>${esc(cfg.nome || 'Sem nome')} · os dados ficam só neste telemóvel</p></div></div>
    <div class="cartao">
      <label class="campo" style="margin-top:0"><span>O teu nome</span><input type="text" id="pNome" value="${esc(cfg.nome)}" placeholder="Como a Cabra te chama"></label>
      <div class="rotulo" style="margin-top:18px">Tom da Cabra Velha</div>
      <div class="tons">${Object.entries(TONS).map(([k, [r, d, ex]]) => `<button class="tom${cfg.tom === k ? ' on' : ''}" data-acao="tom" data-v="${k}"><b>${r}</b><span>${d} “${ex}”</span></button>`).join('')}</div>
    </div>
    <div class="rotulo">Som e bateria</div>
    <div class="cartao">
      <div class="linhaOp"><div><b>Sons de ambiente</b><span>Vento, chuva, fogueira, pássaros e trovões, conforme a montanha.</span></div><button class="interruptor${cfg.som ? ' on' : ''}" data-acao="somAlt" aria-label="Sons de ambiente"><i></i></button></div>
      <label class="campo"${cfg.som ? '' : ' hidden'}><span>Volume</span><input type="range" min="0" max="1" step=".05" value="${cfg.volume}" id="pVolume"></label>
      <div class="linhaOp" style="margin-top:16px;border:0"><div><b>Poupança de bateria</b><span>Menos efeitos e menos imagens por segundo. Em automático liga com bateria abaixo de 20% ou se o telemóvel não aguentar.</span></div></div>
      <div class="seg3" style="margin-top:10px">${[['auto', 'Automático'], ['sempre', 'Sempre'], ['nunca', 'Nunca']].map(([k, r]) => `<button class="chip${cfg.poupanca === k ? ' on' : ''}" data-acao="poupanca" data-v="${k}">${r}</button>`).join('')}</div>
      <p class="nota">${(() => { const e = Montanha.estadoPoupanca(); return e.ativo ? `Ativa agora${e.motivo === 'bateria' ? ' (bateria fraca)' : e.motivo === 'lento' ? ' (o telemóvel estava a ter dificuldade)' : ''}.` : 'Desligada agora: efeitos completos.'; })()}</p>
    </div>
    <div class="rotulo">IA (Gemini)</div>
    <div class="cartao">
      <label class="campo" style="margin-top:0"><span>Chave do Gemini (opcional)</span><input type="password" id="pChave" value="${esc(cfg.chave)}" placeholder="AIza…" autocomplete="off"></label>
      <p class="nota">${orig ? `Sem chave própria: a usar a chave ${orig === 'outra app tua' ? 'de outra app tua' : 'da ' + esc(orig)}, neste aparelho.` : cfg.chave ? 'A usar a tua chave.' : IA.temGroq() ? 'Sem chave do Gemini: a IA usa o Groq de reserva.' : 'Cria uma chave gratuita em aistudio.google.com (Get API key). Se já tiveres a Garfada, a Forja ou a Nascente neste telemóvel, a Vertente usa a mesma chave sozinha.'}</p>
      <button class="btn peq" style="margin-top:12px" data-acao="guardarPerfil">Guardar</button>
    </div>
    <div class="rotulo">IA de reserva (Groq)</div>
    <div class="cartao">${IA.htmlGroq({sub: 'nota', campo: 'campo', pri: 'btn peq', div: true})}</div>
    <div class="rotulo">Cópia de segurança</div>
    <div class="cartao"><p class="nota" style="margin:0 0 12px">Os dados vivem só neste telemóvel. Guarda uma cópia de vez em quando.</p>
      <div class="linhaBts" style="margin:0"><button class="btn peq" data-acao="exportar">Exportar</button><button class="btn peq" data-acao="importar">Importar</button></div></div>
    <div class="rotulo">Sobre</div>
    <div class="cartao">
      <p class="nota" style="margin:0 0 8px">Cada quilómetro que corres são ${ALT_POR_KM} metros de altitude. A montanha não tem cume.</p>
      <p class="nota" style="margin:0 0 14px">Instala a Vertente no ecrã principal (menu do Chrome, Adicionar ao ecrã principal) para partilhares os prints do Strava diretamente para ela.</p>
      <button class="btn peq perigo" data-acao="apagarTudo">Apagar todos os dados</button>
    </div>`;
}

/* ---------- boas-vindas ---------- */
function boasVindas(){
  abrirFolha(`<div style="display:flex;justify-content:center;margin:4px 0 10px">${avatar(true)}</div>
    <h2 style="text-align:center">Quem vem lá?</h2><p class="sub" style="text-align:center">A Cabra Velha guarda esta montanha há cem anos. Antes de subires, quer saber com quem está a falar.</p>
    <label class="campo"><span>O teu nome</span><input type="text" id="bNome" placeholder="Nome" autocomplete="given-name"></label>
    <div class="rotulo">Como queres que ela te trate?</div>
    <div class="tons">${Object.entries(TONS).map(([k, [r, d, ex]]) => `<button class="tom${cfg.tom === k ? ' on' : ''}" data-acao="tomBV" data-v="${k}"><b>${r}</b><span>${d} “${ex}”</span></button>`).join('')}</div>
    <div class="linhaBts"><button class="btn pri larg" data-acao="comecar">Começar a subir</button></div>`);
}

/* ---------- cliques ---------- */
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-acao],[data-vista],[data-dor]'); if (!b) return;
  if (b.dataset.vista){ irVista(b.dataset.vista); return; }
  if (b.dataset.dor){
    if (!novo || b.closest('.mini')) return;
    const d = b.dataset.dor, i = novo.dores.indexOf(d); i < 0 ? novo.dores.push(d) : novo.dores.splice(i, 1);
    document.querySelectorAll(`.corpo [data-dor="${d}"]`).forEach(x => x.classList.toggle('on', i < 0));
    $('#listaDores').innerHTML = listaDores(); return;
  }
  const a = b.dataset.acao, id = b.dataset.id;
  switch (a){
    case 'fechar': fecharFolha(); break;
    case 'topo': Montanha.irTopo(); break;
    case 'registar': abrirRegisto(); break;
    case 'desafio': abrirDesafio(); break;
    case 'som': cfg.som = !cfg.som; guardarCfg(); Som.ligar(cfg.som); Som.definirVolume(cfg.volume); mostrarSom(); avisar(cfg.som ? 'Sons de ambiente ligados.' : 'Sons desligados.', 1800); if (vistaAtual === 'vPerfil') renderPerfil(); break;
    case 'somAlt': cfg.som = !cfg.som; guardarCfg(); Som.ligar(cfg.som); Som.definirVolume(cfg.volume); mostrarSom(); renderPerfil(); break;
    case 'poupanca': cfg.poupanca = b.dataset.v; guardarCfg(); Montanha.poupanca(cfg.poupanca); renderPerfil(); break;
    case 'cabra': irVista('vMontanha'); Montanha.irTopo(); setTimeout(() => mostrarBalao(falaDoMomento(lista, true)), 350); break;
    case 'escFoto': $('#fFoto').value = ''; $('#fFoto').click(); break;
    case 'escGpx': $('#fGpx').value = ''; $('#fGpx').click(); break;
    case 'escMao': if (!novo) abrirRegisto(); passoDados(); break;
    case 'cancelarIA': IA.cancelar(); abrirRegisto(); break;
    case 'dadosOk': if (lerDados()) passoPerguntas(); break;
    case 'voltarDados': novo.nota = ($('#cNota').value || '').trim(); passoDados(); break;
    case 'esforco':
      novo.esforco = +b.dataset.v;
      document.querySelectorAll('.esforco button').forEach(x => { const v = +x.dataset.v; x.classList.toggle('on', v === novo.esforco); x.classList.toggle('antes', v < novo.esforco); });
      $('#esforcoInfo').innerHTML = `<b style="color:${corEsforco(novo.esforco)}">${novo.esforco}</b><span>${NOME_ESFORCO(novo.esforco)}</span>`; $('#erroPerg').hidden = true;
      if (navigator.vibrate) navigator.vibrate(8);
      break;
    case 'perg': novo[b.dataset.g] = b.dataset.v; b.parentElement.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === b)); break;
    case 'semDores': novo.dores = []; document.querySelectorAll('.corpo .z').forEach(x => x.classList.remove('on')); $('#listaDores').innerHTML = listaDores(); break;
    case 'guardar': guardarCorrida(); break;
    case 'detalhe': abrirDetalhe(id); break;
    case 'editar': {
      const c = dados.corridas.find(x => x.id === id); if (!c) break;
      novo = Object.assign({hora: '', parciais: [], pontos: null, dores: [], nota: ''}, JSON.parse(JSON.stringify(c)), {editId: id}); passoDados(); break;
    }
    case 'apagar':
      if (!confirm('Apagar esta corrida? A altitude desce os metros correspondentes.')) break;
      dados.corridas = dados.corridas.filter(x => x.id !== id); guardarDados(); fecharFolha(); atualizarMontanha(); Metas.verificar(lista); atualizarMontanha(); Montanha.irTopo(); if (vistaAtual === 'vProgresso') renderProgresso(); avisar('Corrida apagada.'); break;
    case 'outraCabra': {
      if (!IA.temIA(cfg.chave)){ avisar('Põe a chave da IA no Perfil.'); break; }
      const t = $('#txtCabra'); t.innerHTML = '<span class="pontos"><i></i><i></i><i></i></span>'; b.disabled = true;
      try { const txt = await pedirComentario(id); const c = dados.corridas.find(x => x.id === id); if (c && txt){ c.cabra = txt; guardarDados(); lista = preparar(); } t.textContent = txt || 'A Cabra ficou calada.'; }
      catch(err){ t.textContent = err.message || 'A IA não respondeu.'; }
      b.disabled = false; break;
    }
    case 'tom': cfg.tom = b.dataset.v; guardarCfg(); Cabra.esquecerLote(); document.querySelectorAll('.tom').forEach(x => x.classList.toggle('on', x === b)); break;
    case 'guardarPerfil': cfg.nome = $('#pNome').value.trim(); cfg.chave = $('#pChave').value.trim(); guardarCfg(); renderPerfil(); avisar('Guardado.'); break;
    case 'irPerfil': fecharFolha(); irVista('vPerfil'); break;
    case 'tomBV': cfg.tom = b.dataset.v; document.querySelectorAll('.tom').forEach(x => x.classList.toggle('on', x === b)); break;
    case 'comecar': {
      const n = $('#bNome').value.trim(); if (!n){ $('#bNome').focus(); break; }
      cfg.nome = n; guardarCfg(); fecharFolha(); mostrarBalao(falaDoMomento(lista, true)); break;
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
document.addEventListener('input', e => { if (e.target.id === 'pVolume'){ cfg.volume = +e.target.value; guardarCfg(); Som.definirVolume(cfg.volume); } });
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
  } catch(err){ avisar(esc(err.message || 'Ficheiro inválido.')); }
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
Metas.inicializarMarcos(preparar());
iniciarMontanha();
if (!cfg.nome) setTimeout(boasVindas, 600);
verPartilha();
if (/[?&]acao=registar/.test(location.search)){ history.replaceState(null, '', location.pathname); abrirRegisto(); }
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
