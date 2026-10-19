'use strict';
/* Vertente — a montanha sem cume, desenhada em canvas (estilo cartaz em camadas, com luz e textura).
   1 km corrido = 100 m de altitude. Cada corrida é um acampamento no trilho; o topo é o último acampamento.
   Arrastar como numa lista: puxar para cima desce a montanha (corridas antigas). Tocar num acampamento abre a corrida.
   A luz segue a hora real: madrugada, dia, pôr do sol e noite (com estrelas, lua e fogueiras acesas). */
const Montanha = (() => {
  const PXM = 0.32; // píxeis por metro de altitude
  const ZONAS = [
    {alt: 0,     nome: 'Floresta',         ceuA: '#2c4f6e', ceuM: '#6f97a8', ceuB: '#cfe0d2', longe: '#7d9f9a', meio: '#4f7568', face: '#3c5a45', luz: '#7fa77a', sombra: '#1d3024', trilho: '#b39a6c', borda: '#5d4a31', deco: 'pinheiro', fino: 'névoa'},
    {alt: 2000,  nome: 'Rocha',            ceuA: '#2f4a6a', ceuM: '#8296ab', ceuB: '#dcd6cc', longe: '#8a93a3', meio: '#626b7b', face: '#5d6270', luz: '#a9adb8', sombra: '#2c303a', trilho: '#b5ad9c', borda: '#3d3a36', deco: 'rocha', fino: 'vento'},
    {alt: 5000,  nome: 'Neve',             ceuA: '#2d5b8c', ceuM: '#86b4d8', ceuB: '#e6f0f7', longe: '#c9dbea', meio: '#9fb9d1', face: '#e8eff6', luz: '#ffffff', sombra: '#93a9c2', trilho: '#cdd9e6', borda: '#8396ad', deco: 'neve', fino: 'neve'},
    {alt: 8000,  nome: 'Acima das nuvens', ceuA: '#24346b', ceuM: '#a27fa6', ceuB: '#f7c493', longe: '#e3c4b2', meio: '#bf9f98', face: '#ece6ea', luz: '#fff4e6', sombra: '#a69bb3', trilho: '#d8cfd6', borda: '#8a7f95', deco: 'gelo', fino: 'nada'},
    {alt: 12000, nome: 'Estratosfera',     ceuA: '#05061a', ceuM: '#1b2458', ceuB: '#4a4f8f', longe: '#3a417a', meio: '#2b3163', face: '#cdd2e8', luz: '#f2f4ff', sombra: '#7d84a8', trilho: '#b2b8d4', borda: '#5c6390', deco: 'gelo', fino: 'estrelas'},
    {alt: 20000, nome: 'Órbita',           ceuA: '#000000', ceuM: '#060a1c', ceuB: '#1a2050', longe: '#1d2350', meio: '#141a40', face: '#b4bbd2', luz: '#e6eaff', sombra: '#646b8c', trilho: '#959cba', borda: '#474e74', deco: 'gelo', fino: 'estrelas'}
  ];
  const BANDA = 700; // transição entre zonas

  let cv, ctx, W = 0, H = 0, dpr = 1, ativa = true, raf = 0, t0 = performance.now();
  let corridas = [], topo = 0, estado = {tempestade: false, cansado: false};
  let cam = 0, vel = 0, anim = null, cb = {};
  let particulas = [], estrelas = [], faiscas = [], aves = [], relampago = 0, proxRelampago = 0;
  let acampamentos = [], luzes = [], cabraPos = {x: 0, y: 0}, ultimaLeitura = '', textura = null, horaFixa = null;

  /* ---------- ilustrações ---------- */
  const PELE = '#e3b58e', CASACO = '#e0662f', CASACO2 = '#b9481f', CALCA = '#363c47', CALCA2 = '#2a2f37', BOTA = '#55362a', MOCHILA = '#3d5140', ESTEIRA = '#c9b27a', GORRO = '#2c3e57', CACHECOL = '#e9b949';
  const cabeca = `<path d="M28 25h6v5h-6z" fill="#c99a76"/><circle cx="32" cy="19" r="7" fill="${PELE}"/><path d="M38.6 18.6l2.2 1.9-2.3.7z" fill="#d6a47c"/><circle cx="28.6" cy="20.2" r="1.6" fill="#cf9c76"/><circle cx="35.6" cy="18.4" r=".95" fill="#2a1d14"/><path d="M34.4 16.3q1.3-.8 2.5 0" stroke="#5a3d2a" stroke-width=".7" fill="none"/><path d="M24.5 18q0-9 8-9t8 8q-8-3-16 1z" fill="${GORRO}"/><path d="M24.3 17.8q8-4 16-.8l.2 2.6q-8-3-16.2 1z" fill="#1e2c40"/><path d="M27 12.5q4-2.5 9-1" stroke="#3d5578" stroke-width=".8" fill="none"/><circle cx="32" cy="8.5" r="2.7" fill="#ece5d3"/><circle cx="31.2" cy="7.7" r="1" fill="#fff"/><rect x="34.5" y="13.4" width="4" height="2.6" rx="1.2" fill="#1b1f27"/><circle cx="37.6" cy="14.7" r="1" fill="#fff6c8"/>`;
  const SVG_DE_PE = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="360" viewBox="0 0 60 90">
    <defs><linearGradient id="cs" x1="0" x2="1"><stop offset="0" stop-color="#f2834a"/><stop offset=".6" stop-color="${CASACO}"/><stop offset="1" stop-color="${CASACO2}"/></linearGradient></defs>
    <ellipse cx="30" cy="88" rx="17" ry="2.4" fill="#000" opacity=".3"/>
    <path d="M12 21.5h14a3.2 3.2 0 0 1 0 6.4H12a3.2 3.2 0 0 1 0-6.4z" fill="${ESTEIRA}"/><path d="M15 21.6v6.2M21 21.6v6.2" stroke="#a48d58" stroke-width=".8"/>
    <path d="M13 29q0-2.5 3-2.5h9.5v26H17q-4 0-4-4z" fill="${MOCHILA}"/><path d="M13 37h12.5v3.2H13z" fill="#2f4031"/><path d="M14.5 42h6v6q0 1.5-1.5 1.5h-3q-1.5 0-1.5-1.5z" fill="#4b6350"/><path d="M14 30q0-2 2.5-2" stroke="#6a8a6f" stroke-width=".8" fill="none"/>
    <path d="M25 52h6l-2 17-1 15h-6l1-15z" fill="${CALCA2}"/><path d="M30 52h7l2 16-1 16h-6v-16z" fill="${CALCA}"/><path d="M33 66l5-.5" stroke="#4a5160" stroke-width=".8"/>
    <path d="M20 83h8.2v5H17.5q0-4 2.5-5z" fill="#4a2f22"/><path d="M32 83h7q4 1 4.2 5H32z" fill="${BOTA}"/><path d="M32 86.6h11.2" stroke="#2e1d15" stroke-width="1"/>
    <path d="M23 30q8-4 16 0l2 24q-10 4-20 0z" fill="url(#cs)"/>
    <path d="M21 51q10 3 20 0v3.2q-10 3-20 0z" fill="#9d3d1a"/><path d="M33.2 31v21" stroke="#f3a06f" stroke-width=".8"/><path d="M24 30.5l1 21" stroke="#ffb27f" stroke-width=".7" opacity=".7"/>
    <path d="M35 31q6 2 8 14l-4 2q-2-9-6-12z" fill="#c9542a"/><path d="M41 44l5.2 44" stroke="#9aa0aa" stroke-width="1.4" stroke-linecap="round"/><circle cx="41" cy="47" r="2.7" fill="${CALCA2}"/>
    ${cabeca}
    <path d="M27 25.6q5 3 10 0l.7 3.6q-5.7 3.2-11.4 0z" fill="${CACHECOL}"/><path d="M27.4 27.3q5 2.6 10 0" stroke="#c99a2e" stroke-width=".6" fill="none"/>
  </svg>`;
  const SVG_SENTADO = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="360" viewBox="0 0 60 90">
    <ellipse cx="30" cy="88" rx="22" ry="2.4" fill="#000" opacity=".3"/>
    <path d="M14 40l-4.5 48" stroke="#9aa0aa" stroke-width="1.4" stroke-linecap="round"/>
    <rect x="2" y="66" width="14" height="21" rx="4" fill="${MOCHILA}"/><rect x="1" y="61.5" width="16" height="6.5" rx="3.2" fill="${ESTEIRA}"/><path d="M2 73h14" stroke="#2f4031" stroke-width="2.4"/>
    <path d="M40 60h7l.4 23h-6.8z" fill="${CALCA2}"/><path d="M40 83h8q4.2 1 4.2 5H40z" fill="${BOTA}"/>
    <path d="M25 59l19-2.5 2.6 8.5L28 68z" fill="${CALCA}"/>
    <path d="M24 44q7-4.5 15 0l1 22q-8.5 3.2-17 0z" fill="${CASACO}"/><path d="M35 41.5q3 1 4 2.5l1 22q-2.5 1.2-5.5 1.2z" fill="${CASACO2}"/><path d="M22.5 63q9 3 18 0v3.2q-9 3-18 0z" fill="#9d3d1a"/>
    <path d="M36 46q7 4 8.5 12l-4 2.4q-2-6.4-6.5-9.4z" fill="#c9542a"/><circle cx="43.5" cy="59.5" r="2.7" fill="${CALCA2}"/>
    <g transform="translate(2 17) rotate(14 32 22)">${cabeca}</g>
    <path d="M28.5 42.2q5 2.6 10 0l.6 3.4q-5.6 3-11.2 0z" fill="${CACHECOL}"/>
  </svg>`;
  const SVG_CABRA = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="252" viewBox="0 0 100 84">
    <defs><linearGradient id="pl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b4a387"/><stop offset="1" stop-color="#8f7f68"/></linearGradient>
    <linearGradient id="co" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a7152"/><stop offset="1" stop-color="#4e3d2b"/></linearGradient></defs>
    <ellipse cx="50" cy="81.5" rx="31" ry="2.4" fill="#000" opacity=".3"/>
    <path d="M36 50h4.5l1 28h-4.5z" fill="#6b5d4c"/><path d="M66 50h4.5l-1 28H65z" fill="#6b5d4c"/>
    <path d="M29 50h6.5l-1 14 1 14h-5.5l-1-14z" fill="#97866f"/><path d="M60 50h6.5l1 14-1 14h-5.5V64z" fill="#97866f"/>
    <path d="M28 77h7.5v3.2H27zM59 77h7.5v3.2H58zM36.5 77h5.5v3.2h-6.5zM64.5 77H70v3.2h-6.5z" fill="#2b241d"/>
    <path d="M22 42q-2-14 14-16h26q14 0 16 12l-1 10q-3 7-12 7H34q-11 0-12-13z" fill="url(#pl)"/>
    <path d="M30 27h32q12 0 15 8q-20-4-50 2q-1-8 3-10z" fill="#83735f"/>
    <path d="M38 36q4 5 2 12M50 35q3 5 1 13M60 35q3 5 1 12" stroke="#8d7d67" stroke-width="1" fill="none" opacity=".7"/>
    <path d="M30 52q18 6 36 0l-2 4.5H33z" fill="#e6dcc8"/>
    <path d="M23 34q-6-4-4.5-9q4.5 2 6.5 6.5z" fill="#83735f"/>
    <path d="M66 32q4-12 13-16l7 6q-6 8-9 20z" fill="#a39279"/><path d="M68 28q4-10 11-13l-1 4q-6 4-8 12z" fill="#83735f"/>
    <path d="M77 14q9-5 15 2l4 8q1 4-3 4l-7-1q-7-3-9-9z" fill="#95846e"/><path d="M90 20l6 4q1 4-3 4l-4-1z" fill="#76665a"/><circle cx="94.3" cy="24" r=".7" fill="#2b241d"/>
    <path d="M78 17.2q-6.5-1.2-9 2.3q5.5 1.2 9-.2z" fill="#83735f"/>
    <path d="M82.4 15q2.4-2 5 0" stroke="#f4eee2" stroke-width="1.5" fill="none" stroke-linecap="round"/><circle cx="85" cy="17.2" r="1.15" fill="#1d1712"/><circle cx="85.4" cy="16.8" r=".35" fill="#fff"/>
    <path d="M86 27q1.5 9-3.5 15q-1.2-8 .3-15z" fill="#f4eee2"/><path d="M84.5 30q-.5 5-1.5 8" stroke="#cfc4b0" stroke-width=".6"/>
    <path d="M80.5 13q-4.5-12.5-17.5-12.5q-10 1-11.5 10.5q3-6.5 10.5-6.5q10 0 14.5 10.5z" fill="url(#co)"/>
    <path d="M78 12q-4-9-14-9.5q-7 .5-9 6" stroke="#a08460" stroke-width="1.2" fill="none"/>
    <path d="M63 2.5l1.2 3.4M68 2.4v3.6M72.6 4.2l-1.2 3.2M58 4.5l2 2.6M76.2 7.4l-2.2 2.4" stroke="#3f3224" stroke-width="1.1" stroke-linecap="round"/>
  </svg>`;
  const SVG_TENDA = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 40 30">
    <defs><linearGradient id="tl" x1="0" x2="1"><stop offset="0" stop-color="#ff9a55"/><stop offset=".5" stop-color="#e86a2c"/><stop offset=".5" stop-color="#c14f1d"/><stop offset="1" stop-color="#9c3c14"/></linearGradient></defs>
    <ellipse cx="20" cy="28" rx="19.5" ry="2.2" fill="#000" opacity=".32"/>
    <path d="M3 27.5Q6 8 20 5q14 3 17 22.5z" fill="url(#tl)"/>
    <path d="M20 5Q11 14 9.5 27.5M20 5q8 9 10 22.5M5 19q15-5 30 0" stroke="#ffc08f" stroke-width=".7" fill="none" opacity=".8"/>
    <path d="M14 27.5q1-10 6-13q4.5 3.5 5.5 13z" fill="#2c160d"/><path d="M20 14.5q4.5 3.5 5.5 13h-2q-.5-8-3.5-13z" fill="#ffb057" opacity=".45"/>
    <path d="M3 27.5L.3 28.6M37 27.5l2.7 1.1M20 5l0-2.2" stroke="#e8dcc2" stroke-width=".6" opacity=".8"/><circle cx="20" cy="2.6" r=".9" fill="#ffd36b"/>
  </svg>`;
  const imagem = svg => { const i = new Image(); i.decoding = 'async'; i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); return i; };
  const IMG = {pe: imagem(SVG_DE_PE), sentado: imagem(SVG_SENTADO), cabra: imagem(SVG_CABRA), tenda: imagem(SVG_TENDA)};
  const pronta = i => i.complete && i.naturalWidth > 0;
  Object.values(IMG).forEach(i => i.onload = () => acordar());
  function desenhar(img, x, y, w, h, dir){
    if (!pronta(img)) return;
    ctx.save(); ctx.translate(x, y); if (dir < 0) ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, -h, w, h); ctx.restore();
  }

  /* ---------- cores e utilitários ---------- */
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, k) => { const A = hex(a), B = hex(b); k = Math.max(0, Math.min(1, k)); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
  const rgba = (h, a) => { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; };
  function zonaDe(alt){ let i = 0; for (let k = 0; k < ZONAS.length; k++) if (alt >= ZONAS[k].alt) i = k; return i; }
  function corZ(alt, prop){
    const i = zonaDe(alt), z = ZONAS[i], prox = ZONAS[i + 1], ant = ZONAS[i - 1];
    if (prox && alt > prox.alt - BANDA) return mix(z[prop], prox[prop], .5 * (alt - (prox.alt - BANDA)) / BANDA);
    if (ant && alt < z.alt + BANDA) return mix(ant[prop], z[prop], .5 + .5 * (alt - z.alt) / BANDA);
    return z[prop];
  }
  // luz do dia: a cor da zona, tingida pela hora (dourado ao nascer/pôr do sol, azul-noite de noite)
  let NOITE = 0, DOURADO = 0;
  const NOITE_COR = {ceuA: '#040812', ceuM: '#0b1430', ceuB: '#1b2a4c', longe: '#1c2a44', meio: '#16223a'};
  function cor(alt, prop){
    let c = corZ(alt, prop);
    if (DOURADO && (prop === 'ceuB' || prop === 'ceuM' || prop === 'longe')) c = mix(c, prop === 'longe' ? '#c98a78' : '#ffb27a', DOURADO * (prop === 'ceuB' ? .55 : .3));
    if (NOITE && NOITE_COR[prop]) c = mix(c, NOITE_COR[prop], NOITE * .85);
    return c;
  }
  function calcularLuz(){
    const d = new Date(), h = horaFixa ?? d.getHours() + d.getMinutes() / 60;
    const rampa = (x, a, b) => Math.max(0, Math.min(1, (x - a) / (b - a)));
    NOITE = h >= 12 ? rampa(h, 19.2, 21.2) : 1 - rampa(h, 5.8, 7.6);
    DOURADO = Math.max(0, 1 - Math.abs(h - 19.3) / 1.6, 1 - Math.abs(h - 7.2) / 1.4) * (1 - NOITE * .6);
  }
  const rnd = (k, s) => { const v = Math.sin(k * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
  function caixa(x, y, w, h, r){ ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  const FN = '"Barlow Condensed", "Arial Narrow", system-ui, sans-serif', FT = 'Inter, system-ui, sans-serif';

  /* ---------- geometria ---------- */
  const ruido = (a, s) => Math.sin(a / 310 + s) * .5 + Math.sin(a / 97 + s * 2.1 + 1.3) * .3 + Math.sin(a / 41 + s * 3.7 + 2) * .2;
  const ancora = () => H * .5;
  const yDe = alt => ancora() - (alt - cam) * PXM;
  const altDe = y => cam + (ancora() - y) / PXM;
  // perspetiva: a encosta estreita para cima (o céu e as cordilheiras aparecem dos lados)
  const meiaLarg = a => W * (.09 + .46 * Math.max(-.1, Math.min(1.25, yDe(a) / H)));
  const centro = a => W * (.5 + .035 * ruido(a, 9));
  const baseE = a => centro(a) - meiaLarg(a) * (1 + .1 * ruido(a, 0));
  const baseD = a => centro(a) + meiaLarg(a) * (1 + .1 * ruido(a, 5));
  const recorte = (a, s) => { const k = Math.floor(a / 34), f = a / 34 - k; return ((rnd(k, s) * (1 - f) + rnd(k + 1, s) * f) - .5) * 12; };
  const bordaE = a => baseE(a) + recorte(a, 1);
  const bordaD = a => baseD(a) + recorte(a, 2);
  const tri = x => { const f = x - Math.floor(x); return f < .5 ? f * 4 - 1 : 3 - f * 4; };
  const PERIODO = 760;
  function trilhoX(a){ const e = baseE(a), d = baseD(a), c = (e + d) / 2, t = tri(a / PERIODO + .25); return c + (d - e) * .31 * Math.sin(t * Math.PI / 2); }
  const lado = a => trilhoX(a) < (baseE(a) + baseD(a)) / 2 ? 1 : -1;

  /* ---------- tamanho e textura ---------- */
  function criarTextura(){
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++){ const v = 95 + Math.random() * 70 | 0; g.fillStyle = `rgba(${v},${v},${v},.55)`; g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2.2, 1 + Math.random() * 2.2); }
    for (let i = 0; i < 90; i++){ // fissuras verticais com aresta clara
      const x = Math.random() * 256, y = Math.random() * 256, l = 8 + Math.random() * 26, d = (Math.random() - .5) * 6;
      g.strokeStyle = 'rgba(40,40,40,.55)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + d, y + l); g.stroke();
      g.strokeStyle = 'rgba(220,220,220,.35)'; g.beginPath(); g.moveTo(x - 1.2, y); g.lineTo(x + d - 1.2, y + l); g.stroke();
    }
    for (let i = 0; i < 24; i++){ const y = Math.random() * 256; g.strokeStyle = 'rgba(60,60,60,.25)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 256; x += 16) g.lineTo(x, y + Math.sin(x / 30 + i) * 3); g.stroke(); }
    return ctx.createPattern(c, 'repeat');
  }
  function medir(){
    const r = cv.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    estrelas = Array.from({length: 220}, (_, i) => ({x: rnd(i, 1) * W, y: rnd(i, 2) * H * .8, r: .35 + rnd(i, 3) ** 3 * 1.6, f: i * .7}));
    aves = Array.from({length: 4}, (_, i) => ({x: rnd(i, 7) * W, y: H * (.18 + rnd(i, 8) * .25), v: 14 + rnd(i, 9) * 10, f: i}));
    if (!textura) textura = criarTextura();
  }

  /* ---------- céu ---------- */
  function ceu(t){
    const aTopo = altDe(0), aBaixo = altDe(H * .75);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, cor(aTopo, 'ceuA')); g.addColorStop(.5, cor((aTopo + aBaixo) / 2, 'ceuM')); g.addColorStop(1, cor(aBaixo, 'ceuB'));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const est = Math.max(NOITE, Math.min(1, Math.max(0, (cam - 9500) / 3500)));
    if (est > 0){
      for (const s of estrelas){ ctx.globalAlpha = est * (.5 + .5 * Math.sin(t * 1.4 + s.f)); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    // sol ou lua
    const sx = W * .24, sy = H * .2;
    if (NOITE < .6){
      const k = 1 - NOITE / .6, cs = mix('#fff4d6', '#ffb070', DOURADO);
      const gl = ctx.createRadialGradient(sx, sy, 0, sx, sy, W * .75);
      gl.addColorStop(0, rgba(cs, .55 * k)); gl.addColorStop(.12, rgba(cs, .22 * k)); gl.addColorStop(1, rgba(cs, 0));
      ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
      // raios de luz
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++){
        const an = .35 + i * .19 + Math.sin(t * .05 + i) * .03, l = H * 1.3;
        ctx.fillStyle = rgba(cs, .028 * k); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(an - .035) * l, sy + Math.sin(an - .035) * l); ctx.lineTo(sx + Math.cos(an + .035) * l, sy + Math.sin(an + .035) * l); ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = rgba(mix(cs, '#ffffff', .5), k); ctx.beginPath(); ctx.arc(sx, sy, 20, 0, 7); ctx.fill();
    }
    if (NOITE > .3){
      const k = (NOITE - .3) / .7;
      const gl = ctx.createRadialGradient(sx, sy, 0, sx, sy, 120); gl.addColorStop(0, `rgba(200,215,255,${.25 * k})`); gl.addColorStop(1, 'rgba(200,215,255,0)');
      ctx.fillStyle = gl; ctx.fillRect(sx - 120, sy - 120, 240, 240);
      ctx.fillStyle = `rgba(238,242,255,${k})`; ctx.beginPath(); ctx.arc(sx, sy, 15, 0, 7); ctx.fill();
      ctx.fillStyle = cor(aTopo, 'ceuA'); ctx.globalAlpha = k; ctx.beginPath(); ctx.arc(sx + 7, sy - 4, 13, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    }
  }
  function nuvemFofa(x, y, s, base, luzC, alfa){
    const bolas = [[-34, 2, 15], [-16, -9, 21], [6, -15, 25], [28, -6, 19], [44, 3, 12], [-2, 2, 17]];
    ctx.save(); ctx.beginPath(); ctx.rect(x - 80 * s, y - 60 * s, 160 * s, 60 * s + 5 * s); ctx.clip();
    ctx.globalAlpha = alfa; ctx.fillStyle = base;
    for (const [bx, by, r] of bolas){ ctx.beginPath(); ctx.arc(x + bx * s, y + by * s, r * s, 0, 7); ctx.fill(); }
    ctx.fillStyle = luzC;
    for (const [bx, by, r] of bolas){ ctx.beginPath(); ctx.arc(x + bx * s - r * s * .25, y + by * s - r * s * .3, r * s * .72, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  function nuvensCeu(t){
    const c = cor(cam, 'ceuB'), base = mix(c, '#ffffff', .55 - NOITE * .35), luzC = mix(base, '#ffffff', .6 - NOITE * .4);
    for (let i = 0; i < 6; i++){
      const s = .55 + rnd(i, 3) * .7, x = ((rnd(i, 1) * (W + 300) + t * (3 + 4 * s)) % (W + 300)) - 150, y = ((H * (.12 + .5 * rnd(i, 2)) + cam * PXM * .08) % (H * .8) + H * .8) % (H * .8);
      nuvemFofa(x, y, s, base, luzC, .55 + .25 * s - NOITE * .25);
    }
  }
  function marDeNuvens(frente, t){
    const y = yDe(8000);
    if (y < -200 || y > H + 260) return;
    const base = mix('#ffffff', cor(8000, 'ceuB'), .15 + NOITE * .6), luzC = mix(base, '#ffffff', .7 - NOITE * .5);
    for (let i = 0; i < 9; i++){
      const s = .9 + rnd(i, 4) * .8, x = ((rnd(i, 5) * (W + 400) + t * (frente ? 10 : 5)) % (W + 400)) - 200;
      nuvemFofa(x, y + (frente ? 60 : 10) + rnd(i, 6) * 30, s, base, luzC, frente ? .75 : .95);
    }
  }
  function avesVoo(t, dt){
    if (NOITE > .5 || cam > 4500) return;
    ctx.strokeStyle = `rgba(30,40,50,${.55 * (1 - NOITE)})`; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    for (const a of aves){
      a.x += a.v * dt; if (a.x > W + 30) a.x = -30;
      const b = Math.sin(t * 6 + a.f * 2) * 3, x = a.x, y = a.y + Math.sin(t * .7 + a.f) * 6;
      ctx.beginPath(); ctx.moveTo(x - 6, y - b); ctx.quadraticCurveTo(x - 3, y - 2, x, y); ctx.quadraticCurveTo(x + 3, y - 2, x + 6, y - b); ctx.stroke();
    }
  }

  /* ---------- cordilheiras ao fundo ---------- */
  function cordilheira(fator, prop, esp, amp, semente, nevoa, arvores){
    const off = cam * PXM * fator, base = ancora() + H * .2;
    const j0 = Math.ceil((off - (H - base) - esp * 2) / esp), j1 = Math.floor((off + base + esp + amp * 2) / esp);
    for (let j = j1; j >= j0; j--){
      const y = base + off - j * esp, altJ = cam + (ancora() - y) / PXM;
      const c = mix(cor(altJ, prop), cor(altJ, 'ceuB'), nevoa + .06 * ((j % 3 + 3) % 3));
      const neve = altJ > 2400 ? Math.min(1, (altJ - 2400) / 2600) : 0;
      const some = Math.max(0, Math.min(1, 1 - (altJ - 11000) / 5000)); // lá em cima já não há montanhas à volta
      if (some <= 0) continue; ctx.globalAlpha = some;
      const pts = [];
      for (let x = -10; x <= W + 20; x += 8){
        const p1 = Math.pow(1 - Math.abs(Math.sin(x / 125 + j * 1.7 + semente)), 1.7), p2 = Math.pow(1 - Math.abs(Math.sin(x / 46 + j * 2.9 + semente * 2)), 2.3);
        pts.push([x, y - amp * (.64 * p1 + .36 * p2) - amp * .14 * Math.sin(x / 260 + j), p1]);
      }
      const g = ctx.createLinearGradient(0, y - amp, 0, y + esp * .7);
      g.addColorStop(0, mix(c, '#ffffff', .06)); g.addColorStop(.45, c); g.addColorStop(1, mix(c, cor(altJ, 'ceuB'), .6)); // névoa no vale
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-10, H + 10);
      for (const p of pts) ctx.lineTo(p[0], p[1]);
      ctx.lineTo(W + 20, H + 10); ctx.closePath(); ctx.fill();
      // encosta na sombra: lado direito de cada pico
      ctx.fillStyle = rgba(mix(c, '#0a1020', .5), .22);
      for (let i = 1; i < pts.length - 1; i++){
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        if (y1 > y0){ ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x1, y1 + amp * .5); ctx.lineTo(x0, y0 + amp * .5); ctx.fill(); }
      }
      if (neve > 0){ // calotas de neve nos picos mais altos
        ctx.fillStyle = rgba(mix('#ffffff', c, .12 + NOITE * .4), .9 * neve); ctx.beginPath();
        pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
        for (let i = pts.length - 1; i >= 0; i--){ const p = pts[i], d = Math.max(0, p[2] - .55) / .45 * amp * .42; ctx.lineTo(p[0], p[1] + d * (.8 + .4 * Math.sin(i * 1.9))); }
        ctx.closePath(); ctx.fill();
      }
      if (arvores && altJ < 3800){ // pinheiros recortados na crista
        const k = 1 - altJ / 3800; ctx.fillStyle = mix(c, '#000000', .06);
        for (let i = 0; i < pts.length; i++){
          if (rnd(i + j * 97, 4) < .35) continue;
          const [x, yy] = pts[i], h = (6 + 10 * rnd(i + j * 31, 5)) * k * (fator > .4 ? 1.3 : .9);
          ctx.beginPath(); ctx.moveTo(x - h * .32, yy + 2); ctx.lineTo(x, yy - h); ctx.lineTo(x + h * .32, yy + 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- a montanha ---------- */
  let banda = null;
  function face(t){
    const topoV = altDe(-20), fundoV = altDe(H + 20), a0 = Math.max(fundoV, -300), da = 5 / PXM;
    banda = new Path2D(); banda.moveTo(bordaE(a0), yDe(a0));
    for (let a = a0; a <= topoV + da; a += da) banda.lineTo(bordaE(a), yDe(a));
    for (let a = topoV + da; a >= a0; a -= da) banda.lineTo(bordaD(a), yDe(a));
    banda.closePath();
    // sombra projetada da montanha sobre o vale (dá volume)
    ctx.save(); ctx.translate(14, 6); ctx.fillStyle = 'rgba(5,10,20,.18)'; ctx.fill(banda); ctx.restore();
    const gF = ctx.createLinearGradient(0, 0, 0, H);
    gF.addColorStop(0, cor(topoV, 'face')); gF.addColorStop(1, cor(Math.max(fundoV, 0), 'face'));
    ctx.fillStyle = gF; ctx.fill(banda);
    ctx.save(); ctx.clip(banda);
    // textura de rocha
    if (textura){
      textura.setTransform(new DOMMatrix().translate(0, (cam * PXM) % 256));
      ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = .55; ctx.fillStyle = textura; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    // volume: luz da esquerda, sombra à direita
    const gV = ctx.createLinearGradient(W * .1, 0, W * .9, 0);
    gV.addColorStop(0, 'rgba(255,255,255,.22)'); gV.addColorStop(.22, 'rgba(255,255,255,.06)'); gV.addColorStop(.5, 'rgba(0,0,0,0)'); gV.addColorStop(.78, 'rgba(10,15,30,.26)'); gV.addColorStop(1, 'rgba(10,15,30,.45)');
    ctx.fillStyle = gV; ctx.fillRect(0, 0, W, H);
    // saliências (estratos) com aresta iluminada
    for (let k = Math.floor(a0 / 85); k * 85 < topoV; k++){
      const a = k * 85 + rnd(k, 1) * 50, e = baseE(a), d = baseD(a), x = e + (d - e) * (.03 + .82 * rnd(k, 2)), y = yDe(a), w = 30 + 60 * rnd(k, 3);
      if (Math.abs(x + w / 2 - trilhoX(a)) < w / 2 + 14) continue;
      const fim = x > (e + d) * .55;
      ctx.fillStyle = rgba(cor(a, 'sombra'), fim ? .55 : .4);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y - 3); ctx.lineTo(x + w - 6, y + 7); ctx.lineTo(x + w * .55, y + 10 + 5 * rnd(k, 4)); ctx.lineTo(x + w * .18, y + 8); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba(cor(a, 'luz'), fim ? .3 : .65); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y - 3); ctx.stroke();
    }
    ctx.restore();
    // orlas: luz à esquerda, sombra à direita
    ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(cor(topoV, 'luz'), .5); ctx.beginPath();
    for (let a = a0; a <= topoV + da; a += da) a === a0 ? ctx.moveTo(bordaE(a) + 1.2, yDe(a)) : ctx.lineTo(bordaE(a) + 1.2, yDe(a)); ctx.stroke();
    ctx.strokeStyle = rgba('#0a0f1a', .35); ctx.beginPath();
    for (let a = a0; a <= topoV + da; a += da) a === a0 ? ctx.moveTo(bordaD(a) - 1.2, yDe(a)) : ctx.lineTo(bordaD(a) - 1.2, yDe(a)); ctx.stroke();
    // a base, com aldeia
    const yb = yDe(0);
    if (yb < H + 90){
      const g = ctx.createLinearGradient(0, yb, 0, H);
      g.addColorStop(0, mix('#2a4232', '#0b1410', NOITE * .7)); g.addColorStop(1, '#070c09');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, yb + 30);
      for (let x = 0; x <= W; x += 16) ctx.lineTo(x, yb + 18 + Math.sin(x / 50) * 6);
      ctx.lineTo(W, H + 400); ctx.lineTo(0, H + 400); ctx.fill();
      for (let i = 0; i < 9; i++){
        const x = W * .14 + i * W * .085, y = yb + 48 + (i % 3) * 9;
        ctx.fillStyle = '#121a14'; ctx.beginPath(); ctx.moveTo(x - 7, y + 5); ctx.lineTo(x - 7, y - 3); ctx.lineTo(x, y - 10); ctx.lineTo(x + 7, y - 3); ctx.lineTo(x + 7, y + 5); ctx.fill();
        luzes.push({x, y: y - 1, r: 18, cor: '255,190,110', k: .5, janela: true});
      }
      ctx.fillStyle = 'rgba(236,242,236,.7)'; ctx.font = `700 13px ${FN}`; ctx.textAlign = 'center';
      ctx.fillText('BASE · 0 M', W / 2, yb + 92);
    }
  }

  /* ---------- cenário ---------- */
  function sombraChao(x, y, w){ ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(x + w * .15, y, w, w * .2, 0, 0, 7); ctx.fill(); }
  function pinheiro(x, y, s, alt, neve){
    const lit = mix(mix(cor(alt, 'luz'), '#3f7f52', .55), '#0a1424', NOITE * .5), sh = mix(mix(cor(alt, 'sombra'), '#16321f', .5), '#050a14', NOITE * .5);
    sombraChao(x, y, 10 * s);
    ctx.fillStyle = '#3b2a1e'; ctx.fillRect(x - 1.4 * s, y - 5 * s, 2.8 * s, 5 * s);
    const niveis = [[0, 12, 10], [-8, 10, 9.5], [-15.5, 7.5, 9], [-22, 4.5, 7]];
    for (const [dy, larg, alto] of niveis){
      const yb = y - 4 * s + dy * s, ya = yb - alto * s * 1.45;
      ctx.fillStyle = lit; ctx.beginPath(); ctx.moveTo(x - larg * s, yb); ctx.quadraticCurveTo(x - larg * s * .4, yb - alto * s * .4, x, ya); ctx.lineTo(x, yb + 2 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = sh; ctx.beginPath(); ctx.moveTo(x + larg * s, yb); ctx.quadraticCurveTo(x + larg * s * .4, yb - alto * s * .4, x, ya); ctx.lineTo(x, yb + 2 * s); ctx.closePath(); ctx.fill();
      if (neve){ ctx.fillStyle = 'rgba(250,252,255,.95)'; ctx.beginPath(); ctx.moveTo(x - larg * s * .5, ya + alto * s * .75); ctx.lineTo(x, ya); ctx.lineTo(x + larg * s * .5, ya + alto * s * .75); ctx.quadraticCurveTo(x, ya + alto * s * .45, x - larg * s * .5, ya + alto * s * .75); ctx.fill(); }
    }
  }
  function rocha(x, y, s, alt, k, neve){
    const base = mix(mix(cor(alt, 'face'), '#5b5f6a', .35), '#000', .1), lit = cor(alt, 'luz'), sh = mix(cor(alt, 'sombra'), '#000', .22);
    const w = 11 * s, h = 12 * s * (.8 + .5 * rnd(k, 7)), tx = x + (rnd(k, 8) - .5) * w * .5;
    sombraChao(x, y, w * .9);
    ctx.fillStyle = base; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x - w * .72, y - h * .6); ctx.lineTo(tx, y - h); ctx.lineTo(x + w * .75, y - h * .55); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = sh; ctx.beginPath(); ctx.moveTo(tx, y - h); ctx.lineTo(x + w * .75, y - h * .55); ctx.lineTo(x + w, y); ctx.lineTo(tx + w * .2, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba(lit, .6); ctx.beginPath(); ctx.moveTo(x - w * .72, y - h * .6); ctx.lineTo(tx, y - h); ctx.lineTo(tx - w * .12, y - h * .5); ctx.closePath(); ctx.fill();
    if (neve){ ctx.fillStyle = 'rgba(252,253,255,.97)'; ctx.beginPath(); ctx.moveTo(x - w * .8, y - h * .5); ctx.lineTo(tx, y - h - 1.2); ctx.lineTo(x + w * .8, y - h * .48); ctx.quadraticCurveTo(tx, y - h * .66, x - w * .8, y - h * .5); ctx.fill(); }
    else if (alt < 3000 && rnd(k, 12) < .5){ ctx.fillStyle = 'rgba(110,150,80,.55)'; ctx.beginPath(); ctx.ellipse(x - w * .45, y - h * .35, w * .28, h * .12, -.4, 0, 7); ctx.fill(); }
  }
  function cristal(x, y, s, alt){
    const lit = cor(alt, 'luz'), sh = cor(alt, 'sombra');
    sombraChao(x, y, 7 * s);
    ctx.fillStyle = rgba(sh, .95); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 4 * s, y - 16 * s); ctx.lineTo(x + 8 * s, y); ctx.fill();
    ctx.fillStyle = rgba(lit, .95); ctx.beginPath(); ctx.moveTo(x - 7 * s, y); ctx.lineTo(x - 2 * s, y - 12 * s); ctx.lineTo(x + 1 * s, y); ctx.fill();
    ctx.fillStyle = 'rgba(190,225,255,.7)'; ctx.beginPath(); ctx.moveTo(x + 1 * s, y); ctx.lineTo(x + 4 * s, y - 16 * s); ctx.lineTo(x + 3 * s, y); ctx.fill();
  }
  function arbusto(x, y, s, alt){
    const c = mix(mix(cor(alt, 'luz'), '#4f7d45', .5), '#0a1424', NOITE * .5);
    sombraChao(x, y, 7 * s);
    ctx.fillStyle = mix(c, '#000', .25); ctx.beginPath(); ctx.arc(x + 3 * s, y - 3 * s, 5 * s, 0, 7); ctx.fill();
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x - 2 * s, y - 4 * s, 5.5 * s, 0, 7); ctx.arc(x + 2 * s, y - 6 * s, 4 * s, 0, 7); ctx.fill();
  }
  function cenario(){
    const slot = 60, vb = altDe(H + 40), vt = altDe(-40);
    for (let k = Math.ceil(vt / slot); k >= Math.floor(Math.max(0, vb) / slot); k--){
      if (k < 1) continue;
      const tipo = ZONAS[zonaDe(k * slot)].deco;
      // aglomerado junto a uma das orlas
      const lado1 = rnd(k, 1) < .5 ? -1 : 1, n = tipo === 'pinheiro' ? 2 + (rnd(k, 2) * 3 | 0) : (rnd(k, 2) < .45 ? 2 : 1);
      const aC = k * slot + rnd(k, 3) * slot;
      const itens = [];
      for (let j = 0; j < n; j++){
        const a = aC + (rnd(k, j + 20) - .5) * 40, e = baseE(a), d = baseD(a), w = d - e;
        const x = lado1 < 0 ? e + 6 + w * (.04 + .2 * rnd(k, j + 30)) : d - 6 - w * (.04 + .2 * rnd(k, j + 30));
        if (Math.abs(x - trilhoX(a)) < 34) continue;
        itens.push([a, x, .9 + .9 * rnd(k, j + 40), j]);
      }
      // um ou outro no meio, para não ficar vazio
      if (rnd(k, 50) < .18){ const a = aC + 20, e = baseE(a), d = baseD(a), x = e + (d - e) * (.3 + .4 * rnd(k, 51)); if (Math.abs(x - trilhoX(a)) > 40) itens.push([a, x, .7 + .5 * rnd(k, 52), 9]); }
      itens.sort((p, q) => q[0] - p[0]);
      for (const [a, x, s, j] of itens){
        const y = yDe(a), z = ZONAS[zonaDe(a)].deco;
        if (z === 'pinheiro') (j === 9 || rnd(k, j + 60) < .18) ? arbusto(x, y, s, a) : pinheiro(x, y, s, a, false);
        else if (z === 'rocha') (rnd(k, j + 61) < .22 && a < 3300) ? pinheiro(x, y, s * .85, a, false) : rocha(x, y, s * 1.2, a, k * 7 + j, false);
        else if (z === 'neve') (rnd(k, j + 62) < .3 && a < 6400) ? pinheiro(x, y, s * .8, a, true) : rocha(x, y, s * 1.2, a, k * 7 + j, true);
        else rnd(k, j + 63) < .55 ? cristal(x, y, s, a) : rocha(x, y, s, a, k * 7 + j, true);
      }
    }
  }

  /* ---------- trilho, mariolas, placas e bandeiras ---------- */
  function caminho(de, ate, dy = 0){ ctx.beginPath(); let p = true; for (let a = de; a <= ate + .01; a += 4 / PXM){ const aa = Math.min(a, ate); p ? (ctx.moveTo(trilhoX(aa), yDe(aa) + dy), p = false) : ctx.lineTo(trilhoX(aa), yDe(aa) + dy); } }
  function trilho(){
    const vb = Math.max(altDe(H + 20), 0), vt = altDe(-20), ate = Math.min(vt, topo);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (ate > vb){
      caminho(vb, ate, 5); ctx.lineWidth = 11; ctx.strokeStyle = rgba(mix(cor(ate, 'sombra'), '#000', .35), .55); ctx.stroke();   // degrau/sombra
      caminho(vb, ate); ctx.lineWidth = 11; ctx.strokeStyle = cor(ate, 'borda'); ctx.stroke();
      caminho(vb, ate, -.5); ctx.lineWidth = 8; ctx.strokeStyle = cor(ate, 'trilho'); ctx.stroke();
      caminho(vb, ate, -1.5); ctx.lineWidth = 2.4; ctx.strokeStyle = rgba(cor(ate, 'luz'), .45); ctx.stroke();
      for (let k = Math.ceil(vb / 18); k * 18 < ate; k++){ // pedras na berma
        const a = k * 18, s = rnd(k, 1) < .5 ? -1 : 1, x = trilhoX(a) + s * (7 + 3 * rnd(k, 2)), y = yDe(a) + 1;
        ctx.fillStyle = cor(a, 'borda'); ctx.beginPath(); ctx.ellipse(x, y, 2 + rnd(k, 3) * 1.4, 1.4, 0, 0, 7); ctx.fill();
        ctx.fillStyle = rgba(cor(a, 'luz'), .5); ctx.beginPath(); ctx.ellipse(x - .5, y - .6, 1, .6, 0, 0, 7); ctx.fill();
      }
    }
    // o que falta subir: pegadas
    const f0 = Math.max(topo, vb), f1 = Math.min(vt, topo + 1100);
    for (let a = f0 + 24; a < f1; a += 30){
      const x = trilhoX(a), y = yDe(a), al = .55 * (1 - (a - topo) / 1100), ang = Math.atan2(yDe(a + 10) - y, trilhoX(a + 10) - x);
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = rgba(mix(cor(a, 'sombra'), '#000', .3), al);
      ctx.beginPath(); ctx.ellipse(0, -2.6, 2.8, 1.4, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(6, 2.6, 2.8, 1.4, 0, 0, 7); ctx.fill(); ctx.restore();
    }
  }
  function mariola(x, y, s){
    const pedras = [[0, 0, 7, 3.4], [.5, -5.4, 5.6, 2.8], [-.4, -9.8, 4.2, 2.3], [.3, -13.4, 2.8, 1.8]];
    sombraChao(x, y + 1, 7 * s);
    for (const [dx, dy, rx, ry] of pedras){
      ctx.fillStyle = '#6f6a63'; ctx.beginPath(); ctx.ellipse(x + dx * s, y + dy * s, rx * s, ry * s, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(x + dx * s - rx * s * .3, y + dy * s - ry * s * .35, rx * s * .5, ry * s * .4, 0, 0, 7); ctx.fill();
    }
  }
  function placa(x, y, linhas){
    const tam = linhas.length > 1;
    ctx.font = `700 ${tam ? 12 : 11.5}px ${FN}`; const w = Math.max(...linhas.map(l => ctx.measureText(l).width)) + 14, h = tam ? 30 : 17;
    sombraChao(x, y, 6);
    ctx.fillStyle = '#4a3220'; ctx.fillRect(x - 1.6, y - 30 - h + 6, 3.2, 30 + h - 6);
    const bx = x - w / 2, by = y - 30 - h;
    ctx.fillStyle = '#2d1d12'; caixa(bx, by + 1.5, w, h, 3); ctx.fill();
    const g = ctx.createLinearGradient(0, by, 0, by + h); g.addColorStop(0, '#a87449'); g.addColorStop(1, '#7f5434');
    ctx.fillStyle = g; caixa(bx, by, w, h, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(60,35,18,.5)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(bx + 3, by + h * .5); ctx.lineTo(bx + w - 3, by + h * .5 + 1); ctx.stroke();
    ctx.fillStyle = '#fff1dc'; ctx.textAlign = 'center';
    linhas.forEach((l, i) => { ctx.font = `${i ? 600 : 700} ${i ? 10.5 : (tam ? 12.5 : 11.5)}px ${FN}`; ctx.fillText(l, x, by + (tam ? 13 + i * 12 : 12.5)); });
  }
  function bandeirolas(a, t){
    const x = trilhoX(a), y = yDe(a), x0 = x - 46, x1 = x + 46, y0 = y - 34, y1 = y - 26;
    ctx.strokeStyle = '#5a4634'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0, y0); ctx.moveTo(x1, y); ctx.lineTo(x1, y1); ctx.stroke();
    const cores = ['#2d6fd0', '#f4f1e8', '#d6322d', '#2f9c58', '#f2c230'];
    ctx.strokeStyle = 'rgba(60,50,40,.7)'; ctx.lineWidth = .8; ctx.beginPath();
    const pt = u => [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * 10];
    for (let u = 0; u <= 1.001; u += .05){ const [px, py] = pt(u); u ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke();
    for (let i = 0; i < 10; i++){
      const u = (i + .5) / 10.5, [px, py] = pt(u), f = Math.sin(t * 5 + i) * 1.6;
      ctx.fillStyle = cores[i % 5]; ctx.beginPath(); ctx.moveTo(px - 3.4, py); ctx.lineTo(px + 3.4, py); ctx.lineTo(px + f, py + 9); ctx.closePath(); ctx.fill();
    }
  }
  function marcosDoTrilho(t){
    const vb = Math.max(altDe(H + 60), 0), vt = altDe(-60);
    // mariolas nas curvas do ziguezague
    for (let k = Math.ceil((vb + PERIODO / 4) / (PERIODO / 2)); ; k++){
      const a = k * PERIODO / 2 - PERIODO / 4; if (a > vt || a > topo + 1100) break; if (a < 40) continue;
      const s = trilhoX(a) < (baseE(a) + baseD(a)) / 2 ? -1 : 1;
      mariola(trilhoX(a) + s * 18, yDe(a) + 3, 1);
    }
    // placas de 1000 em 1000 m; nas fronteiras de zona dizem o nome
    for (let k = Math.max(1, Math.ceil(vb / 1000)); k * 1000 <= vt; k++){
      const a = k * 1000; if (a > topo + 4000) break;
      const z = ZONAS.find(z => z.alt === a), conhecida = topo >= a;
      const s = lado(a) * -1, x = trilhoX(a) + s * 30;
      placa(x, yDe(a), z ? [`${a.toLocaleString('pt-PT')} M`, conhecida ? z.nome.toUpperCase() : '? ? ?'] : [`${a.toLocaleString('pt-PT')} M`]);
    }
    // bandeirolas de oração lá em cima
    for (let k = Math.max(4, Math.ceil((vb - 600) / 1300)); k * 1300 + 600 <= vt; k++){ const a = k * 1300 + 600; if (a < 5200 || a > topo) continue; bandeirolas(a, t); }
  }

  /* ---------- acampamentos ---------- */
  function fogueira(x, y, t, forca, vivo){
    ctx.fillStyle = '#5b544c'; for (let i = 0; i < 7; i++){ const an = i / 7 * Math.PI * 2; ctx.beginPath(); ctx.ellipse(x + Math.cos(an) * 6.5, y + Math.sin(an) * 2.4, 2.4, 1.7, 0, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#5a3a22'; ctx.lineWidth = 2.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 5.5, y + 1); ctx.lineTo(x + 5.5, y - 2); ctx.moveTo(x - 5.5, y - 2); ctx.lineTo(x + 5.5, y + 1); ctx.stroke();
    if (!vivo){ ctx.fillStyle = 'rgba(255,120,50,.6)'; ctx.beginPath(); ctx.arc(x, y - 1, 1.7, 0, 7); ctx.fill(); luzes.push({x, y: y - 2, r: 10, cor: '255,110,40', k: .25}); return; }
    const k = .75 + forca * .065;
    luzes.push({x, y: y - 6, r: 46 * k, cor: '255,150,60', k: .5});
    const chama = (c, h, w, f) => { const fl = Math.sin(t * 11 + f) * .18 + Math.sin(t * 7.3 + f * 2) * .12; ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - w * k, y - 1); ctx.quadraticCurveTo(x - w * k * .9, y - h * k * .5, x + fl * 6, y - h * k * (1 + fl)); ctx.quadraticCurveTo(x + w * k * .9, y - h * k * .5, x + w * k, y - 1); ctx.closePath(); ctx.fill(); };
    chama('#e2452a', 16, 6, 0); chama('#ff8a2f', 12, 4.6, 1.7); chama('#ffd36b', 7.5, 2.8, 3.1);
  }
  function acampamento(c, x, y, t, s, vivo){
    desenhar(IMG.tenda, x - s * 5, y, 44, 33, s);
    fogueira(x + s * 24, y + 1, t, c.esforco || 5, vivo);
  }
  function etiqueta(x, y, l1, l2, dir){
    ctx.font = `700 14px ${FN}`; const w1 = ctx.measureText(l1).width;
    ctx.font = `500 10.5px ${FT}`; const w2 = ctx.measureText(l2).width;
    const w = Math.max(w1, w2) + 20, bx = Math.max(8, Math.min(W - w - 8, dir > 0 ? x : x - w)), by = y - 30;
    ctx.fillStyle = 'rgba(0,0,0,.18)'; caixa(bx + 1, by + 2, w, 36, 10); ctx.fill();
    ctx.fillStyle = 'rgba(12,17,26,.78)'; caixa(bx, by, w, 36, 10); ctx.fill();
    ctx.fillStyle = '#ff8a3d'; caixa(bx + 6, by + 8, 3, 20, 1.5); ctx.fill();
    ctx.textAlign = 'left'; ctx.fillStyle = '#f5f7fa'; ctx.font = `700 14px ${FN}`; ctx.fillText(l1, bx + 14, by + 16);
    ctx.fillStyle = 'rgba(235,240,246,.7)'; ctx.font = `500 10.5px ${FT}`; ctx.fillText(l2, bx + 14, by + 29);
  }
  function trofeu(x, y, texto, t){
    x = Math.max(34, Math.min(W - 34, x));
    ctx.strokeStyle = '#3d3226'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 34); ctx.stroke();
    const f = Math.sin(t * 4 + x) * 2;
    const g = ctx.createLinearGradient(x, 0, x + 20, 0); g.addColorStop(0, '#ffd56b'); g.addColorStop(1, '#f0a020');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x + 1, y - 34); ctx.quadraticCurveTo(x + 10, y - 33 + f, x + 20, y - 30 + f); ctx.lineTo(x + 1, y - 22); ctx.fill();
    ctx.fillStyle = '#7a4b06'; ctx.font = `800 7px ${FT}`; ctx.textAlign = 'left'; ctx.fillText('★', x + 5, y - 26.5);
    ctx.font = `700 10px ${FN}`; const tw = ctx.measureText(texto).width;
    ctx.fillStyle = 'rgba(80,50,8,.85)'; caixa(x - tw / 2 - 6, y - 52, tw + 12, 14, 7); ctx.fill();
    ctx.fillStyle = '#ffe2a3'; ctx.textAlign = 'center'; ctx.fillText(texto, x, y - 41.5);
  }
  function acampar(t){
    acampamentos = [];
    const vb = altDe(H + 60), vt = altDe(-60), n = corridas.length;
    for (let i = 0; i < n; i++){
      const c = corridas[i];
      if (i > 0 && c.pausa >= 10){
        const am = (corridas[i - 1].alt1 + c.alt1) / 2;
        if (am > vb && am < vt){
          const s = lado(am), x = trilhoX(am) + s * 18, y = yDe(am) + 4, txt = `${c.pausa} dias sem subir`;
          ctx.font = `italic 600 12px ${FN}`; const tw = ctx.measureText(txt).width;
          ctx.fillStyle = 'rgba(12,17,26,.45)'; caixa(s > 0 ? x : x - tw - 14, y - 11, tw + 14, 17, 8.5); ctx.fill();
          ctx.textAlign = s > 0 ? 'left' : 'right'; ctx.fillStyle = 'rgba(240,244,248,.75)'; ctx.fillText(txt, x + s * 7, y + 1.5);
        }
      }
      if (c.alt1 < vb || c.alt1 > vt) continue;
      const x = trilhoX(c.alt1), y = yDe(c.alt1), s = lado(c.alt1);
      if (i < n - 1){
        acampamento(c, x - s * 10, y, t, s, i >= n - 3);
        etiqueta(x + s * 34, y, c.rotulo, c.sub, s);
        if (c.recorde) trofeu(x - s * 50, y, c.recorde, t);
      }
      acampamentos.push({x, y, c});
    }
  }

  /* ---------- o corredor e a cabra ---------- */
  function cachecol(x, y, dir, t, forte){
    const v = forte ? 1.6 : 1, pts = [];
    for (let i = 0; i <= 8; i++){ const u = i / 8; pts.push([x - dir * u * 22 * v, y + u * 3 + Math.sin(t * 6 - u * 5) * 2.8 * u * v]); }
    ctx.fillStyle = CACHECOL; ctx.beginPath();
    pts.forEach((p, i) => { const w = 2.8 * (1 - i / 8 * .55); i ? ctx.lineTo(p[0], p[1] - w) : ctx.moveTo(p[0], p[1] - w); });
    for (let i = pts.length - 1; i >= 0; i--){ const w = 2.8 * (1 - i / 8 * .55); ctx.lineTo(pts[i][0], pts[i][1] + w); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#c99a2e'; ctx.lineWidth = .8; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
  }
  function corredor(t){
    const a = topo, x = trilhoX(a), y = yDe(a), dir = -lado(a + 40) || 1;
    const ultimo = corridas[corridas.length - 1];
    if (ultimo) acampamento(ultimo, x + dir * 56, y + 3, t, dir, true);
    const cx = x - dir * 72, cy = y - 4;
    rocha(cx, cy + 12, 2.6, a, 999, a >= 5000);
    const cw = 84, ch = cw * .84, bob = Math.sin(t * 1.4) * .6;
    desenhar(IMG.cabra, cx, cy - 3 + bob, cw, ch, dir);
    cabraPos = {x: cx + dir * cw * .3, y: cy - ch - 2};
    const h = 66, w = h * 2 / 3, k = h / 90, resp = Math.sin(t * 2) * .5;
    if (estado.cansado){
      rocha(x - dir, y + 1, 1.7, a, 998, a >= 5000);
      desenhar(IMG.sentado, x, y + 1 + resp * .5, w, h, dir);
      if (pronta(IMG.sentado)) cachecol(x + dir * (28.5 - 30) * k, y - (90 - 44) * k, dir, t, estado.tempestade);
    } else {
      desenhar(IMG.pe, x, y + 1, w, h + resp, dir);
      if (pronta(IMG.pe)) cachecol(x + dir * (27 - 30) * k, y - (90 - 27.6) * k, dir, t, estado.tempestade);
      if (NOITE > .3){ // frontal acesa
        const hx = x + dir * (37.6 - 30) * k, hy = y - (90 - 14.7) * k;
        luzes.push({x: hx, y: hy, r: 8, cor: '255,246,200', k: .9, cone: dir});
      }
    }
  }

  /* ---------- tempo e luz ---------- */
  function tempo(t, dt){
    const tipo = estado.tempestade ? 'chuva' : ZONAS[zonaDe(Math.max(0, cam))].fino;
    const quer = {neve: 90, chuva: 140, vento: 18, névoa: 7, estrelas: 0, nada: 0}[tipo] || 0;
    while (particulas.length < quer) particulas.push({x: Math.random() * W, y: Math.random() * H, v: .5 + Math.random(), r: Math.random()});
    if (particulas.length > quer) particulas.length = quer;
    for (const p of particulas){
      if (tipo === 'neve'){ p.y += (18 + 26 * p.v) * dt; p.x += Math.sin(t + p.r * 9) * 12 * dt; ctx.fillStyle = `rgba(255,255,255,${.5 + .45 * p.r})`; ctx.beginPath(); ctx.arc(p.x, p.y, .7 + p.r * 2, 0, 7); ctx.fill(); }
      else if (tipo === 'chuva'){ p.y += (460 + 200 * p.v) * dt; p.x -= 130 * dt; ctx.strokeStyle = 'rgba(190,205,225,.32)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 4, p.y + 14); ctx.stroke(); }
      else if (tipo === 'vento'){ p.x += (260 + 200 * p.v) * dt; ctx.strokeStyle = 'rgba(240,244,250,.16)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(p.x - 25, p.y - 3, p.x - 50 - 50 * p.r, p.y); ctx.stroke(); }
      else if (tipo === 'névoa'){ p.x += (8 + 8 * p.v) * dt; const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 150); g.addColorStop(0, 'rgba(230,240,235,.1)'); g.addColorStop(1, 'rgba(230,240,235,0)'); ctx.fillStyle = g; ctx.fillRect(p.x - 150, p.y - 150, 300, 300); }
      if (p.y > H + 20){ p.y = -20; p.x = Math.random() * (W + 120); }
      if (p.x > W + 160){ p.x = -160; p.y = Math.random() * H; }
      if (p.x < -40){ p.x = W + 30; }
    }
  }
  function aplicarLuz(t, dt){
    // dourado ao nascer e pôr do sol
    if (DOURADO > .02){ ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = `rgba(255,150,70,${.45 * DOURADO})`; ctx.fillRect(0, 0, W, H); }
    // noite: tudo arrefece e escurece
    if (NOITE > .02){ ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgba(52,66,120,${.78 * NOITE})`; ctx.fillRect(0, 0, W, H); }
    if (estado.tempestade){ ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(70,80,100,.55)'; ctx.fillRect(0, 0, W, H); }
    ctx.globalCompositeOperation = 'source-over';
    // luzes por cima de tudo (brilham mais de noite)
    ctx.globalCompositeOperation = 'lighter';
    for (const l of luzes){
      const a = l.k * (.45 + .9 * NOITE + (estado.tempestade ? .4 : 0)) * (l.janela ? (.5 + .5 * Math.sin(t * 2 + l.x)) : 1) * (1 + .08 * Math.sin(t * 13 + l.x));
      if (l.cone){
        const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, 110); g.addColorStop(0, `rgba(${l.cor},${.35 * NOITE})`); g.addColorStop(1, `rgba(${l.cor},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.arc(l.x, l.y, 110, l.cone > 0 ? -.75 : Math.PI - .25, l.cone > 0 ? .25 : Math.PI + .75); ctx.fill();
      }
      const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r); g.addColorStop(0, `rgba(${l.cor},${Math.min(1, a)})`); g.addColorStop(1, `rgba(${l.cor},0)`);
      ctx.fillStyle = g; ctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    if (estado.tempestade){
      if (t > proxRelampago){ relampago = 1; proxRelampago = t + 5 + Math.random() * 7; }
      if (relampago > 0){ ctx.fillStyle = `rgba(230,236,255,${relampago * .4})`; ctx.fillRect(0, 0, W, H); relampago -= dt * 3.5; }
    }
    // vinheta
    const v = ctx.createRadialGradient(W / 2, H * .45, Math.min(W, H) * .35, W / 2, H * .45, Math.max(W, H) * .78);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(3,6,14,${.42 + NOITE * .2})`);
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }
  function faiscasFogo(t, dt){
    const a = topo, x = trilhoX(a), y = yDe(a), dir = -lado(a + 40) || 1, fx = x + dir * 56 + dir * 24;
    if (!corridas.length || y < -40 || y > H + 40) return;
    if (faiscas.length < 14 && Math.random() < dt * 10) faiscas.push({x: fx + (Math.random() - .5) * 5, y: y - 8, v: 18 + Math.random() * 24, vida: 1});
    for (const f of faiscas){ f.y -= f.v * dt; f.x += Math.sin(t * 4 + f.v) * 12 * dt; f.vida -= dt * .85; ctx.fillStyle = `rgba(255,205,120,${Math.max(0, f.vida)})`; ctx.fillRect(f.x, f.y, 1.7, 1.7); }
    faiscas = faiscas.filter(f => f.vida > 0);
  }

  /* ---------- ciclo ---------- */
  let ultimaLuz = 0;
  function passo(){
    raf = 0; if (!ativa || document.hidden) return;
    const agora = performance.now(), dt = Math.min(.05, (agora - t0) / 1000), t = agora / 1000; t0 = agora;
    if (agora - ultimaLuz > 30000){ calcularLuz(); ultimaLuz = agora; }
    if (anim){
      const k = Math.max(0, Math.min(1, (agora - anim.ini) / anim.dur)), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      cam = anim.de + (anim.para - anim.de) * e; anim.cada && anim.cada(cam);
      if (k >= 1){ const f = anim.fim; anim = null; f && f(); }
    } else if (!arrasto){
      cam += vel * dt; vel *= Math.pow(.04, dt);
      if (Math.abs(vel) < 2) vel = 0;
      const min = -200, max = topo + 500;
      if (cam < min){ cam += (min - cam) * Math.min(1, dt * 8); vel = 0; }
      if (cam > max){ cam += (max - cam) * Math.min(1, dt * 8); vel = 0; }
    }
    luzes = [];
    ceu(t); nuvensCeu(t);
    cordilheira(.14, 'longe', 230, 90, 1.1, .42, false);
    marDeNuvens(false, t);
    cordilheira(.3, 'longe', 270, 110, 2.7, .22, true);
    cordilheira(.55, 'meio', 330, 120, 4.3, .08, true);
    avesVoo(t, dt);
    face(t); trilho(); marcosDoTrilho(t); cenario(); acampar(t); corredor(t); faiscasFogo(t, dt);
    marDeNuvens(true, t);
    tempo(t, dt);
    aplicarLuz(t, dt);
    const leitura = Math.round(cam) + '|' + Math.round(topo);
    if (leitura !== ultimaLeitura){ ultimaLeitura = leitura; cb.onVista && cb.onVista({cam, topo, longe: Math.abs(cam - topo) > 260, zona: ZONAS[zonaDe(Math.max(0, cam))].nome}); }
    cb.onCabra && cb.onCabra(cabraPos);
    raf = requestAnimationFrame(passo);
  }
  const acordar = () => { if (!raf && ativa && ctx){ t0 = performance.now(); raf = requestAnimationFrame(passo); } };

  /* ---------- toque ---------- */
  let arrasto = null;
  function ligarToque(){
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); anim = null; vel = 0; arrasto = {y: e.clientY, y0: e.clientY, x0: e.clientX, t: performance.now(), ult: [[performance.now(), e.clientY]]}; });
    cv.addEventListener('pointermove', e => {
      if (!arrasto) return;
      cam += (e.clientY - arrasto.y) / PXM; arrasto.y = e.clientY;
      arrasto.ult.push([performance.now(), e.clientY]); if (arrasto.ult.length > 6) arrasto.ult.shift();
      acordar();
    });
    const soltar = e => {
      if (!arrasto) return;
      const a = arrasto; arrasto = null;
      if (Math.hypot(e.clientX - a.x0, e.clientY - a.y0) < 9 && performance.now() - a.t < 450){ tocar(e); return; }
      const p0 = a.ult[0], p1 = a.ult[a.ult.length - 1], dtm = (p1[0] - p0[0]) / 1000;
      if (dtm > 0) vel = Math.max(-14000, Math.min(14000, (p1[1] - p0[1]) / dtm / PXM));
      acordar();
    };
    cv.addEventListener('pointerup', soltar); cv.addEventListener('pointercancel', soltar);
    cv.addEventListener('wheel', e => { e.preventDefault(); anim = null; cam -= e.deltaY / PXM * .8; acordar(); }, {passive: false});
  }
  function tocar(e){
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (Math.hypot(x - cabraPos.x, y - cabraPos.y - 32) < 44){ cb.onToqueCabra && cb.onToqueCabra(); return; }
    let melhor = null, dm = 44;
    for (const a of acampamentos){ const d = Math.hypot(a.x - x, a.y - 12 - y); if (d < dm){ dm = d; melhor = a; } }
    if (melhor) cb.onAcampamento && cb.onAcampamento(melhor.c);
  }

  /* ---------- API ---------- */
  function iniciar(canvas, callbacks){
    cv = canvas; ctx = cv.getContext('2d'); cb = callbacks || {};
    calcularLuz(); medir(); ligarToque();
    new ResizeObserver(() => { medir(); acordar(); }).observe(cv);
    document.addEventListener('visibilitychange', acordar);
    if (document.fonts) document.fonts.ready.then(acordar);
    acordar();
  }
  function definir(lista, est){
    corridas = lista; estado = Object.assign({tempestade: false, cansado: false}, est);
    topo = lista.length ? lista[lista.length - 1].alt1 : 0;
    acordar();
  }
  function irTopo(suave = true){ irPara(topo, suave); }
  function irPara(alt, suave = true){
    alt = Math.max(-200, Math.min(topo + 500, alt));
    if (!suave){ cam = alt; vel = 0; anim = null; acordar(); return; }
    anim = {de: cam, para: alt, ini: performance.now(), dur: Math.min(1800, 450 + Math.abs(cam - alt) * .12)}; acordar();
  }
  function subir(de, para, cada, fim){ cam = de; vel = 0; anim = {de, para, ini: performance.now() + 250, dur: Math.min(3800, 1400 + (para - de) * 2.2), cada, fim}; acordar(); }
  function ligar(sim){ ativa = sim; if (sim) acordar(); }
  function fixarHora(h){ horaFixa = h; calcularLuz(); acordar(); }
  return {iniciar, definir, irTopo, irPara, subir, ligar, fixarHora, zonaDe: a => ZONAS[zonaDe(Math.max(0, a))], ZONAS, PXM, SVG_CABRA, noite: () => NOITE};
})();
