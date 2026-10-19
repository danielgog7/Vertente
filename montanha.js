'use strict';
/* Vertente — a montanha sem cume, desenhada em canvas.
   1 km corrido = 100 m de altitude. Cada corrida é um acampamento no trilho; o topo é o último acampamento.
   Arrastar como numa lista (puxar para cima desce a montanha, para ver as corridas antigas); tocar num acampamento abre a corrida;
   tocar na cabra fala. As personagens são ilustrações em SVG; o cenário é procedimental (árvores, rochas, saliências). */
const Montanha = (() => {
  const PXM = 0.32;              // píxeis por metro de altitude
  const ZONAS = [
    {alt: 0,     nome: 'Floresta',         ceuA: '#13202c', ceuB: '#4d6d66', longe: '#3b5a52', meio: '#29443a', face: '#23392c', sombra: '#16261c', luz: '#35533f', trilho: '#8a7552', borda: '#4e402c', texto: '#e2ecdd', fino: 'névoa', deco: 'pinheiro'},
    {alt: 2000,  nome: 'Rocha',            ceuA: '#1b2230', ceuB: '#79808f', longe: '#626877', meio: '#474c59', face: '#3a3e48', sombra: '#262931', luz: '#565b67', trilho: '#8e877a', borda: '#2b2a29', texto: '#eceef2', fino: 'vento', deco: 'rocha'},
    {alt: 5000,  nome: 'Neve',             ceuA: '#20365a', ceuB: '#b7cee2', longe: '#d3e0ec', meio: '#a9bdd1', face: '#e4ebf3', sombra: '#b6c4d4', luz: '#ffffff', trilho: '#bcc9d8', borda: '#8696aa', texto: '#26313f', fino: 'neve', deco: 'neve'},
    {alt: 8000,  nome: 'Acima das nuvens', ceuA: '#1a2652', ceuB: '#f2c38b', longe: '#dec8b3', meio: '#b9a193', face: '#dfe2ea', sombra: '#adb1c2', luz: '#fff6ea', trilho: '#c4bfc9', borda: '#7f7a8b', texto: '#2b2836', fino: 'nada', deco: 'gelo'},
    {alt: 12000, nome: 'Estratosfera',     ceuA: '#04050d', ceuB: '#1d2652', longe: '#2b3258', meio: '#20274a', face: '#c6cde0', sombra: '#8c93ad', luz: '#eef1ff', trilho: '#a9b0c9', borda: '#5d6484', texto: '#1b2140', fino: 'estrelas', deco: 'gelo'},
    {alt: 20000, nome: 'Órbita',           ceuA: '#000000', ceuB: '#0a1030', longe: '#161b3c', meio: '#10142f', face: '#a9b0c6', sombra: '#6c728c', luz: '#dfe4ff', trilho: '#8e95b0', borda: '#4a5070', texto: '#151a34', fino: 'estrelas', deco: 'gelo'}
  ];
  const BANDA = 700; // transição suave entre zonas (metros para cada lado)

  let cv, ctx, W = 0, H = 0, dpr = 1, ativa = true, raf = 0, t0 = performance.now();
  let corridas = [], topo = 0, estado = {tempestade: false, cansado: false};
  let cam = 0, vel = 0;
  let anim = null, cb = {};
  let particulas = [], estrelas = [], faiscas = [], relampago = 0, proxRelampago = 0;
  let acampamentos = [], cabraPos = {x: 0, y: 0}, ultimaLeitura = '';

  /* ---------- ilustrações (SVG → imagem) ---------- */
  const PELE = '#e3b58e', CASACO = '#e0662f', CASACO2 = '#b9481f', CALCA = '#363c47', CALCA2 = '#2a2f37', BOTA = '#55362a', MOCHILA = '#3d5140', ESTEIRA = '#c9b27a', GORRO = '#2c3e57', CACHECOL = '#e9b949';
  const cabeca = `<path d="M28 25h6v5h-6z" fill="#c99a76"/><circle cx="32" cy="19" r="7" fill="${PELE}"/><path d="M38.6 18.6l2.2 1.9-2.3.7z" fill="#d6a47c"/><circle cx="28.6" cy="20.2" r="1.6" fill="#cf9c76"/><circle cx="35.6" cy="18.4" r=".95" fill="#2a1d14"/><path d="M34.4 16.3q1.3-.8 2.5 0" stroke="#5a3d2a" stroke-width=".7" fill="none"/><path d="M24.5 18q0-9 8-9t8 8q-8-3-16 1z" fill="${GORRO}"/><path d="M24.3 17.8q8-4 16-.8l.2 2.6q-8-3-16.2 1z" fill="#1e2c40"/><path d="M27 12.5q4-2.5 9-1" stroke="#3d5578" stroke-width=".8" fill="none"/><circle cx="32" cy="8.5" r="2.7" fill="#ece5d3"/><circle cx="31.2" cy="7.7" r="1" fill="#fff"/>`;
  const SVG_DE_PE = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="360" viewBox="0 0 60 90">
    <ellipse cx="30" cy="88" rx="17" ry="2.4" fill="#000" opacity=".28"/>
    <path d="M12 21.5h14a3.2 3.2 0 0 1 0 6.4H12a3.2 3.2 0 0 1 0-6.4z" fill="${ESTEIRA}"/><path d="M15 21.6v6.2M21 21.6v6.2" stroke="#a48d58" stroke-width=".8"/>
    <path d="M13 29q0-2.5 3-2.5h9.5v26H17q-4 0-4-4z" fill="${MOCHILA}"/><path d="M13 37h12.5v3.2H13z" fill="#2f4031"/><path d="M14.5 42h6v6q0 1.5-1.5 1.5h-3q-1.5 0-1.5-1.5z" fill="#4b6350"/>
    <path d="M25 52h6l-2 17-1 15h-6l1-15z" fill="${CALCA2}"/><path d="M30 52h7l2 16-1 16h-6v-16z" fill="${CALCA}"/><path d="M33 66l5-.5" stroke="#4a5160" stroke-width=".8"/>
    <path d="M20 83h8.2v5H17.5q0-4 2.5-5z" fill="#4a2f22"/><path d="M32 83h7q4 1 4.2 5H32z" fill="${BOTA}"/><path d="M32 86.6h11.2" stroke="#2e1d15" stroke-width="1"/>
    <path d="M23 30q8-4 16 0l2 24q-10 4-20 0z" fill="${CASACO}"/><path d="M34 28q4 1 5 2l2 24q-3 1.6-7 1.6z" fill="${CASACO2}"/>
    <path d="M21 51q10 3 20 0v3.2q-10 3-20 0z" fill="#9d3d1a"/><path d="M33.2 31v21" stroke="#f3a06f" stroke-width=".8"/><path d="M24 30.5l1 21" stroke="#f08a55" stroke-width=".6" opacity=".6"/>
    <path d="M35 31q6 2 8 14l-4 2q-2-9-6-12z" fill="#c9542a"/><path d="M41 44l5.2 44" stroke="#9aa0aa" stroke-width="1.4" stroke-linecap="round"/><circle cx="41" cy="47" r="2.7" fill="${CALCA2}"/>
    ${cabeca}
    <path d="M27 25.6q5 3 10 0l.7 3.6q-5.7 3.2-11.4 0z" fill="${CACHECOL}"/><path d="M27.4 27.3q5 2.6 10 0" stroke="#c99a2e" stroke-width=".6" fill="none"/>
  </svg>`;
  const SVG_SENTADO = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="360" viewBox="0 0 60 90">
    <ellipse cx="30" cy="88" rx="22" ry="2.4" fill="#000" opacity=".28"/>
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
    <ellipse cx="50" cy="81.5" rx="31" ry="2.4" fill="#000" opacity=".28"/>
    <path d="M36 50h4.5l1 28h-4.5z" fill="#6b5d4c"/><path d="M66 50h4.5l-1 28H65z" fill="#6b5d4c"/>
    <path d="M29 50h6.5l-1 14 1 14h-5.5l-1-14z" fill="#97866f"/><path d="M60 50h6.5l1 14-1 14h-5.5V64z" fill="#97866f"/>
    <path d="M28 77h7.5v3.2H27zM59 77h7.5v3.2H58zM36.5 77h5.5v3.2h-6.5zM64.5 77H70v3.2h-6.5z" fill="#2b241d"/>
    <path d="M22 42q-2-14 14-16h26q14 0 16 12l-1 10q-3 7-12 7H34q-11 0-12-13z" fill="#a39279"/>
    <path d="M30 27h32q12 0 15 8q-20-4-50 2q-1-8 3-10z" fill="#83735f"/>
    <path d="M38 36q4 5 2 12M50 35q3 5 1 13M60 35q3 5 1 12" stroke="#8d7d67" stroke-width="1" fill="none" opacity=".7"/>
    <path d="M30 52q18 6 36 0l-2 4.5H33z" fill="#ddd1bb"/>
    <path d="M23 34q-6-4-4.5-9q4.5 2 6.5 6.5z" fill="#83735f"/>
    <path d="M66 32q4-12 13-16l7 6q-6 8-9 20z" fill="#a39279"/><path d="M68 28q4-10 11-13l-1 4q-6 4-8 12z" fill="#83735f"/>
    <path d="M77 14q9-5 15 2l4 8q1 4-3 4l-7-1q-7-3-9-9z" fill="#95846e"/><path d="M90 20l6 4q1 4-3 4l-4-1z" fill="#76665a"/><circle cx="94.3" cy="24" r=".7" fill="#2b241d"/>
    <path d="M78 17.2q-6.5-1.2-9 2.3q5.5 1.2 9-.2z" fill="#83735f"/>
    <path d="M82.4 15q2.4-2 5 0" stroke="#efe7d6" stroke-width="1.4" fill="none" stroke-linecap="round"/><circle cx="85" cy="17.2" r="1.15" fill="#1d1712"/><circle cx="85.4" cy="16.8" r=".35" fill="#fff"/>
    <path d="M86 27q1.5 9-3.5 15q-1.2-8 .3-15z" fill="#efe7d6"/><path d="M84.5 30q-.5 5-1.5 8" stroke="#cfc4b0" stroke-width=".6"/>
    <path d="M80.5 13q-4.5-12.5-17.5-12.5q-10 1-11.5 10.5q3-6.5 10.5-6.5q10 0 14.5 10.5z" fill="#6a553e"/>
    <path d="M78 12q-4-9-14-9.5q-7 .5-9 6" stroke="#836a4e" stroke-width="1.2" fill="none"/>
    <path d="M63 2.5l1.2 3.4M68 2.4v3.6M72.6 4.2l-1.2 3.2M58 4.5l2 2.6M76.2 7.4l-2.2 2.4" stroke="#3f3224" stroke-width="1.1" stroke-linecap="round"/>
  </svg>`;
  const SVG_TENDA = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 40 30">
    <ellipse cx="20" cy="28" rx="19" ry="2.2" fill="#000" opacity=".3"/>
    <path d="M3 27.5Q6 8 20 5q14 3 17 22.5z" fill="#e0662f"/><path d="M20 5q14 3 17 22.5H25Q25.5 14 20 5z" fill="#b9481f"/>
    <path d="M20 5Q11 14 9.5 27.5M20 5q8 9 10 22.5" stroke="#f6a26a" stroke-width=".8" fill="none"/>
    <path d="M14 27.5q1-10 6-13q4.5 3.5 5.5 13z" fill="#3a1f14"/><path d="M20 14.5q4.5 3.5 5.5 13h-2q-.5-8-3.5-13z" fill="#ffb057" opacity=".35"/>
    <path d="M3 27.5L0 28.5M37 27.5l3 1M20 5L20 3" stroke="#d8cbb0" stroke-width=".6" opacity=".7"/>
  </svg>`;
  const imagem = svg => { const i = new Image(); i.decoding = 'async'; i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); return i; };
  const IMG = {pe: imagem(SVG_DE_PE), sentado: imagem(SVG_SENTADO), cabra: imagem(SVG_CABRA), tenda: imagem(SVG_TENDA)};
  const pronta = i => i.complete && i.naturalWidth > 0;
  Object.values(IMG).forEach(i => i.onload = () => acordar());
  function desenhar(img, x, y, w, h, dir){ // (x, y) = centro dos pés
    if (!pronta(img)) return;
    ctx.save(); ctx.translate(x, y); if (dir < 0) ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, -h, w, h); ctx.restore();
  }

  /* ---------- cores ---------- */
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, k) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * Math.max(0, Math.min(1, k))).toString(16).padStart(2, '0')).join(''); };
  const rgba = (h, a) => { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; };
  function zonaDe(alt){ let i = 0; for (let k = 0; k < ZONAS.length; k++) if (alt >= ZONAS[k].alt) i = k; return i; }
  function cor(alt, prop){
    const i = zonaDe(alt), z = ZONAS[i], prox = ZONAS[i + 1], ant = ZONAS[i - 1];
    if (prox && alt > prox.alt - BANDA) return mix(z[prop], prox[prop], .5 * (alt - (prox.alt - BANDA)) / BANDA);
    if (ant && alt < z.alt + BANDA) return mix(ant[prop], z[prop], .5 + .5 * (alt - z.alt) / BANDA);
    return z[prop];
  }
  const rnd = (k, s) => { const v = Math.sin(k * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };

  /* ---------- geometria da montanha ---------- */
  const ruido = (a, s) => Math.sin(a / 310 + s) * .5 + Math.sin(a / 97 + s * 2.1 + 1.3) * .3 + Math.sin(a / 41 + s * 3.7 + 2) * .2;
  const ancora = () => H * .46;
  const yDe = alt => ancora() - (alt - cam) * PXM;
  const altDe = y => cam + (ancora() - y) / PXM;
  const bordaE = a => W * (.15 + .05 * ruido(a, 0));
  const bordaD = a => W * (.85 + .05 * ruido(a, 5));
  const crista = a => W * (.57 + .06 * ruido(a, 9));
  const tri = x => { const f = x - Math.floor(x); return f < .5 ? f * 4 - 1 : 3 - f * 4; };
  // trilho em ziguezague com curvas suaves
  function trilhoX(a){ const e = bordaE(a), d = bordaD(a), c = (e + d) / 2, t = tri(a / 760 + .25); return c + (d - e) * .3 * Math.sin(t * Math.PI / 2) ** 1 * (1 - .12 * t * t); }

  /* ---------- tamanho ---------- */
  function medir(){
    const r = cv.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    estrelas = Array.from({length: 160}, (_, i) => ({x: rnd(i, 1) * W, y: rnd(i, 2) * H, r: .4 + rnd(i, 3) * 1.1, f: i * .7}));
  }

  /* ---------- céu e cordilheiras ---------- */
  function ceu(t){
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, cor(altDe(0), 'ceuA')); g.addColorStop(1, cor(altDe(H * .7), 'ceuB'));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const a = Math.min(1, Math.max(0, (cam - 9500) / 3500));
    if (a > 0){
      for (const s of estrelas){ ctx.globalAlpha = a * (.55 + .45 * Math.sin(t * 1.3 + s.f)); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, ((s.y + cam * PXM * .04) % H + H) % H, s.r, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    // sol/lua baixo, para dar luz ao cenário
    const sy = H * .2, sx = W * .18, cs = cor(cam, 'ceuB');
    const gl = ctx.createRadialGradient(sx, sy, 0, sx, sy, W * .6);
    gl.addColorStop(0, rgba(mix(cs, '#fff4dc', .6), .35)); gl.addColorStop(1, rgba(cs, 0));
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
  }
  function cristas(fator, prop, esp, amp, semente, nevoa){
    const off = cam * PXM * fator, base = ancora() + H * .25;
    const j0 = Math.ceil((off - (H - base) - esp * 2) / esp), j1 = Math.floor((off + base + esp + amp * 2) / esp);
    for (let j = j1; j >= j0; j--){
      const y = base + off - j * esp, altJ = cam + (ancora() - y) / PXM;
      const c = mix(cor(altJ, prop), cor(altJ, 'ceuB'), nevoa + .07 * ((j % 3 + 3) % 3));
      const neve = altJ > 2600 ? Math.min(1, (altJ - 2600) / 2400) : 0;
      const pts = [];
      for (let x = -10; x <= W + 20; x += 9){
        const p1 = Math.pow(1 - Math.abs(Math.sin(x / 120 + j * 1.7 + semente)), 1.6), p2 = Math.pow(1 - Math.abs(Math.sin(x / 47 + j * 2.9 + semente * 2)), 2.2);
        pts.push([x, y - amp * (.62 * p1 + .38 * p2) - amp * .15 * Math.sin(x / 260 + j)]);
      }
      const g = ctx.createLinearGradient(0, y - amp, 0, y + esp);
      g.addColorStop(0, mix(c, '#ffffff', .1 + neve * .5)); g.addColorStop(.35, c); g.addColorStop(1, mix(c, '#000000', .18));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-10, H + 10);
      for (const p of pts) ctx.lineTo(p[0], p[1]);
      ctx.lineTo(W + 20, H + 10); ctx.closePath(); ctx.fill();
      // aresta iluminada nos picos
      ctx.strokeStyle = rgba(mix(c, '#ffffff', .5), .25 + neve * .3); ctx.lineWidth = 1; ctx.beginPath();
      pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
    }
  }
  function nuvens(frente, t){
    const y = yDe(8000);
    if (y < -180 || y > H + 240) return;
    for (let i = 0; i < 11; i++){
      const x = ((i * 131 + t * (frente ? 9 : 4)) % (W + 300)) - 150, yy = y + (frente ? 46 : 0) + Math.sin(i * 2.3) * 24;
      const g = ctx.createRadialGradient(x, yy, 0, x, yy, 150);
      g.addColorStop(0, `rgba(255,248,240,${frente ? .32 : .8})`); g.addColorStop(1, 'rgba(255,248,240,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 160, yy - 160, 320, 320);
    }
  }

  /* ---------- a face da montanha ---------- */
  function face(){
    const passo = 7, topoV = altDe(-10), fundoV = altDe(H + 10), a0 = Math.max(fundoV, -300), da = passo / PXM;
    const gF = ctx.createLinearGradient(0, 0, 0, H);
    gF.addColorStop(0, cor(topoV, 'face')); gF.addColorStop(1, cor(Math.max(fundoV, 0), 'face'));
    ctx.fillStyle = gF; ctx.beginPath(); ctx.moveTo(bordaE(a0), yDe(a0));
    for (let a = a0; a <= topoV + da; a += da) ctx.lineTo(bordaE(a), yDe(a));
    for (let a = topoV + da; a >= a0; a -= da) ctx.lineTo(bordaD(a), yDe(a));
    ctx.closePath(); ctx.fill();
    // flanco na sombra (luz da esquerda)
    const gS = ctx.createLinearGradient(0, 0, 0, H);
    gS.addColorStop(0, rgba(cor(topoV, 'sombra'), .9)); gS.addColorStop(1, rgba(cor(Math.max(fundoV, 0), 'sombra'), .9));
    ctx.fillStyle = gS; ctx.beginPath(); ctx.moveTo(crista(a0), yDe(a0));
    for (let a = a0; a <= topoV + da; a += da) ctx.lineTo(crista(a), yDe(a));
    for (let a = topoV + da; a >= a0; a -= da) ctx.lineTo(bordaD(a), yDe(a));
    ctx.closePath(); ctx.fill();
    // orla iluminada à esquerda
    ctx.strokeStyle = rgba(cor(topoV, 'luz'), .35); ctx.lineWidth = 2; ctx.beginPath();
    for (let a = a0; a <= topoV + da; a += da) a === a0 ? ctx.moveTo(bordaE(a) + 1, yDe(a)) : ctx.lineTo(bordaE(a) + 1, yDe(a));
    ctx.stroke();
    // saliências de rocha (estratos)
    for (let k = Math.floor(a0 / 95); k * 95 < topoV; k++){
      const a = k * 95 + rnd(k, 1) * 60, e = bordaE(a), d = bordaD(a), x = e + (d - e) * (.06 + .8 * rnd(k, 2)), y = yDe(a), w = 26 + 50 * rnd(k, 3);
      if (Math.abs(x + w / 2 - trilhoX(a)) < w / 2 + 12) continue;
      const sombraLado = x > crista(a);
      ctx.fillStyle = rgba(cor(a, 'sombra'), sombraLado ? .9 : .7);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y - 2); ctx.lineTo(x + w - 5, y + 6); ctx.lineTo(x + w * .55, y + 9 + 4 * rnd(k, 4)); ctx.lineTo(x + w * .2, y + 7); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba(cor(a, 'luz'), sombraLado ? .25 : .55); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y - 2); ctx.stroke();
    }
    // vale da base
    const yb = yDe(0);
    if (yb < H + 80){
      const g = ctx.createLinearGradient(0, yb, 0, H);
      g.addColorStop(0, '#1b2b20'); g.addColorStop(1, '#070c09');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, yb + 30);
      for (let x = 0; x <= W; x += 20) ctx.lineTo(x, yb + 18 + Math.sin(x / 50) * 6);
      ctx.lineTo(W, H + 400); ctx.lineTo(0, H + 400); ctx.fill();
      const t = performance.now() / 1000;
      for (let i = 0; i < 9; i++){
        const x = W * .14 + i * W * .085, y = yb + 46 + (i % 3) * 8;
        ctx.fillStyle = '#0d1510'; ctx.beginPath(); ctx.moveTo(x - 6, y + 4); ctx.lineTo(x - 6, y - 3); ctx.lineTo(x, y - 8); ctx.lineTo(x + 6, y - 3); ctx.lineTo(x + 6, y + 4); ctx.fill();
        ctx.fillStyle = `rgba(255,190,110,${.6 + .3 * Math.sin(t * 2 + i)})`; ctx.fillRect(x - 1.5, y - 2, 3, 3);
      }
      ctx.fillStyle = 'rgba(226,236,221,.6)'; ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('BASE · 0 m', W / 2, yb + 86);
    }
  }

  /* ---------- cenário: pinheiros, rochas, gelo ---------- */
  function pinheiro(x, y, s, alt, neve){
    const lit = mix(cor(alt, 'luz'), '#2f6a45', .55), sh = mix(cor(alt, 'sombra'), '#14301f', .5);
    ctx.fillStyle = '#3b2a1e'; ctx.fillRect(x - 1.2 * s, y - 4 * s, 2.4 * s, 4 * s);
    const niveis = [[0, 11, 9], [-7, 9, 8.5], [-13.5, 6.5, 8]];
    for (const [dy, larg, alto] of niveis){
      const yb = y - 3 * s + dy * s, ya = yb - alto * s * 1.5;
      ctx.fillStyle = lit; ctx.beginPath(); ctx.moveTo(x - larg * s, yb); ctx.lineTo(x, ya); ctx.lineTo(x, yb + 1.5 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = sh; ctx.beginPath(); ctx.moveTo(x + larg * s, yb); ctx.lineTo(x, ya); ctx.lineTo(x, yb + 1.5 * s); ctx.closePath(); ctx.fill();
      if (neve){ ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.beginPath(); ctx.moveTo(x - larg * s * .45, ya + alto * s * .7); ctx.lineTo(x, ya); ctx.lineTo(x + larg * s * .45, ya + alto * s * .7); ctx.quadraticCurveTo(x, ya + alto * s * .5, x - larg * s * .45, ya + alto * s * .7); ctx.fill(); }
    }
  }
  function rocha(x, y, s, alt, k, neve){
    const lit = cor(alt, 'luz'), base = mix(cor(alt, 'face'), '#000', .12), sh = mix(cor(alt, 'sombra'), '#000', .2);
    const w = 14 * s, h = 10 * s * (.7 + .5 * rnd(k, 7)), tx = x + (rnd(k, 8) - .5) * w * .5;
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(x + 2, y, w * .9, 2.2 * s, 0, 0, 7); ctx.fill();
    ctx.fillStyle = base; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x - w * .7, y - h * .6); ctx.lineTo(tx, y - h); ctx.lineTo(x + w * .75, y - h * .55); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = sh; ctx.beginPath(); ctx.moveTo(tx, y - h); ctx.lineTo(x + w * .75, y - h * .55); ctx.lineTo(x + w, y); ctx.lineTo(tx + w * .2, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba(lit, .55); ctx.beginPath(); ctx.moveTo(x - w * .7, y - h * .6); ctx.lineTo(tx, y - h); ctx.lineTo(tx - w * .1, y - h * .55); ctx.closePath(); ctx.fill();
    if (neve){ ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.moveTo(x - w * .78, y - h * .52); ctx.lineTo(tx, y - h - 1); ctx.lineTo(x + w * .78, y - h * .5); ctx.quadraticCurveTo(tx, y - h * .62, x - w * .78, y - h * .52); ctx.fill(); }
  }
  function cristal(x, y, s, alt){
    const lit = cor(alt, 'luz'), sh = cor(alt, 'sombra');
    ctx.fillStyle = rgba(sh, .9); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 4 * s, y - 14 * s); ctx.lineTo(x + 7 * s, y); ctx.fill();
    ctx.fillStyle = rgba(lit, .9); ctx.beginPath(); ctx.moveTo(x - 6 * s, y); ctx.lineTo(x - 2 * s, y - 10 * s); ctx.lineTo(x + 1 * s, y); ctx.fill();
  }
  function cenario(){
    const slot = 48, vb = altDe(H + 30), vt = altDe(-30);
    for (let k = Math.ceil(vt / slot); k >= Math.floor(Math.max(0, vb) / slot); k--){
      if (k < 1) continue;
      const tipo = ZONAS[zonaDe(k * slot)].deco, n = tipo === 'pinheiro' ? 4 : tipo === 'neve' ? 3 : 2;
      for (let j = 0; j < n; j++){
        const a = k * slot + rnd(k, j + 11) * slot, e = bordaE(a), d = bordaD(a), w = d - e, r = rnd(k, j + 3);
        const x = r < .5 ? e + 8 + w * .3 * rnd(k, j + 5) : d - 8 - w * .3 * rnd(k, j + 6);
        if (Math.abs(x - trilhoX(a)) < 30) continue;
        const y = yDe(a), s = .75 + .55 * rnd(k, j + 9), z = ZONAS[zonaDe(a)].deco;
        if (z === 'pinheiro') pinheiro(x, y, s, a, false);
        else if (z === 'rocha') (rnd(k, j + 21) < .25 && a < 3200) ? pinheiro(x, y, s * .8, a, false) : rocha(x, y, s, a, k * 7 + j, false);
        else if (z === 'neve') (rnd(k, j + 21) < .3 && a < 6200) ? pinheiro(x, y, s * .75, a, true) : rocha(x, y, s, a, k * 7 + j, true);
        else rnd(k, j + 21) < .5 ? cristal(x, y, s, a) : rocha(x, y, s * .8, a, k * 7 + j, true);
      }
    }
  }

  /* ---------- zonas e trilho ---------- */
  function limites(){
    ctx.textAlign = 'left'; ctx.font = '700 10px system-ui, sans-serif';
    for (let i = 1; i < ZONAS.length; i++){
      const z = ZONAS[i], y = yDe(z.alt);
      if (y < 150 || y > H + 20) continue;
      const conhecida = topo >= z.alt;
      if (!conhecida && z.alt > topo + 4000) continue;
      const e = bordaE(z.alt) + 10, txt = `${z.alt.toLocaleString('pt-PT')} m · ${conhecida ? z.nome.toUpperCase() : '???'}`;
      const tw = ctx.measureText(txt).width;
      ctx.strokeStyle = rgba(cor(z.alt, 'texto'), .3); ctx.setLineDash([3, 6]); ctx.lineWidth = 1; ctx.beginPath();
      ctx.moveTo(e + tw + 18, y); ctx.lineTo(bordaD(z.alt) - 8, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(8,12,18,.55)'; caixa(e - 2, y - 9, tw + 14, 18, 9); ctx.fill();
      ctx.fillStyle = '#eef2f6'; ctx.fillText(txt, e + 5, y + 3.5);
    }
  }
  function caixa(x, y, w, h, r){ ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function caminho(de, ate){ ctx.beginPath(); for (let a = de, p = true; a <= ate + .01; a += 5 / PXM){ const aa = Math.min(a, ate), x = trilhoX(aa), y = yDe(aa); p ? (ctx.moveTo(x, y), p = false) : ctx.lineTo(x, y); } }
  function trilho(){
    const vb = Math.max(altDe(H + 20), 0), vt = altDe(-20), ate = Math.min(vt, topo);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (ate > vb){
      caminho(vb, ate); ctx.lineWidth = 10; ctx.strokeStyle = rgba(cor(ate, 'borda'), .75); ctx.stroke();
      caminho(vb, ate); ctx.lineWidth = 6.5; ctx.strokeStyle = cor(ate, 'trilho'); ctx.stroke();
      caminho(vb, ate); ctx.lineWidth = 1.4; ctx.setLineDash([2, 9]); ctx.strokeStyle = rgba(cor(ate, 'luz'), .55); ctx.stroke(); ctx.setLineDash([]);
      // pedrinhas na berma
      for (let k = Math.ceil(vb / 22); k * 22 < ate; k++){
        const a = k * 22, x = trilhoX(a) + (rnd(k, 1) < .5 ? -1 : 1) * (6 + 3 * rnd(k, 2)), y = yDe(a);
        ctx.fillStyle = rgba(cor(a, 'borda'), .9); ctx.beginPath(); ctx.ellipse(x, y, 1.6 + rnd(k, 3), 1.1, 0, 0, 7); ctx.fill();
      }
    }
    // o que falta subir: pegadas ténues
    const f0 = Math.max(topo, vb), f1 = Math.min(vt, topo + 1000);
    for (let a = f0 + 20; a < f1; a += 34){
      const x = trilhoX(a), y = yDe(a), al = .5 * (1 - (a - topo) / 1000), dx = trilhoX(a + 10) - x, dy = yDe(a + 10) - y, ang = Math.atan2(dy, dx);
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = rgba(cor(a, 'borda'), al);
      ctx.beginPath(); ctx.ellipse(0, -3, 2.6, 1.3, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(5, 3, 2.6, 1.3, 0, 0, 7); ctx.fill(); ctx.restore();
    }
  }
  const lado = a => trilhoX(a) < (bordaE(a) + bordaD(a)) / 2 ? 1 : -1;

  /* ---------- acampamentos ---------- */
  function fogueira(x, y, t, forca, vivo){
    ctx.fillStyle = '#5b544c'; for (let i = 0; i < 6; i++){ const an = i / 6 * Math.PI * 2; ctx.beginPath(); ctx.ellipse(x + Math.cos(an) * 6, y + Math.sin(an) * 2.2, 2.3, 1.6, 0, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#5a3a22'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 5, y + 1); ctx.lineTo(x + 5, y - 2); ctx.moveTo(x - 5, y - 2); ctx.lineTo(x + 5, y + 1); ctx.stroke();
    if (!vivo){ ctx.fillStyle = 'rgba(255,120,50,.55)'; ctx.beginPath(); ctx.arc(x, y - 1, 1.6, 0, 7); ctx.fill(); return; }
    const k = .7 + forca * .07;
    const g = ctx.createRadialGradient(x, y - 4, 0, x, y - 4, 34 * k);
    g.addColorStop(0, 'rgba(255,160,70,.42)'); g.addColorStop(1, 'rgba(255,160,70,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 40 * k, y - 44 * k, 80 * k, 80 * k);
    const chama = (cor, h, w, f) => { const fl = Math.sin(t * 11 + f) * .18 + Math.sin(t * 7.3 + f * 2) * .12; ctx.fillStyle = cor; ctx.beginPath(); ctx.moveTo(x - w * k, y - 1); ctx.quadraticCurveTo(x - w * k * .9, y - h * k * .5, x + fl * 6, y - h * k * (1 + fl)); ctx.quadraticCurveTo(x + w * k * .9, y - h * k * .5, x + w * k, y - 1); ctx.closePath(); ctx.fill(); };
    chama('#e2452a', 15, 5.5, 0); chama('#ff8a2f', 11.5, 4.2, 1.7); chama('#ffd36b', 7, 2.6, 3.1);
  }
  function acampamento(c, x, y, t, s, vivo){
    const tw = 40, th = 30;
    desenhar(IMG.tenda, x - s * 4, y, tw, th, s);
    fogueira(x + s * 21, y + 1, t, c.esforco || 5, vivo);
  }
  function rotulo(x, y, a, l1, l2, dir){
    ctx.font = '700 11.5px system-ui, sans-serif'; const w1 = ctx.measureText(l1).width;
    ctx.font = '500 10px system-ui, sans-serif'; const w2 = ctx.measureText(l2).width;
    const w = Math.max(w1, w2) + 16, bx = dir > 0 ? x : x - w, by = y - 26;
    ctx.fillStyle = 'rgba(10,14,20,.6)'; caixa(bx, by, w, 32, 9); ctx.fill();
    ctx.textAlign = 'left'; ctx.fillStyle = '#f2f5f8'; ctx.font = '700 11.5px system-ui, sans-serif'; ctx.fillText(l1, bx + 8, by + 13.5);
    ctx.fillStyle = 'rgba(242,245,248,.68)'; ctx.font = '500 10px system-ui, sans-serif'; ctx.fillText(l2, bx + 8, by + 26);
  }
  function marco(x, y, texto){
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x + 1, y, 9, 2, 0, 0, 7); ctx.fill();
    const g = ctx.createLinearGradient(x - 7, 0, x + 7, 0); g.addColorStop(0, '#9b958c'); g.addColorStop(1, '#5d5852');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x - 6, y - 17); ctx.quadraticCurveTo(x, y - 24, x + 6, y - 17); ctx.lineTo(x + 7, y); ctx.fill();
    ctx.fillStyle = '#ffcf7a'; ctx.beginPath(); for (let i = 0; i < 5; i++){ const an = -Math.PI / 2 + i * Math.PI * 2 / 5, an2 = an + Math.PI / 5; ctx.lineTo(x + Math.cos(an) * 4, y - 12 + Math.sin(an) * 4); ctx.lineTo(x + Math.cos(an2) * 1.7, y - 12 + Math.sin(an2) * 1.7); } ctx.fill();
    ctx.font = '800 8.5px system-ui, sans-serif'; ctx.textAlign = 'center'; const tw = ctx.measureText(texto).width;
    ctx.fillStyle = 'rgba(70,40,10,.75)'; caixa(x - tw / 2 - 5, y - 38, tw + 10, 13, 6.5); ctx.fill();
    ctx.fillStyle = '#ffd99a'; ctx.fillText(texto, x, y - 28.5);
  }
  function acampar(t){
    acampamentos = [];
    const vb = altDe(H + 50), vt = altDe(-50), n = corridas.length;
    for (let i = 0; i < n; i++){
      const c = corridas[i];
      if (i > 0 && c.pausa >= 10){
        const am = (corridas[i - 1].alt1 + c.alt1) / 2;
        if (am > vb && am < vt){ const s = lado(am); ctx.textAlign = s > 0 ? 'left' : 'right'; ctx.fillStyle = rgba(cor(am, 'texto'), .55); ctx.font = 'italic 600 10.5px system-ui, sans-serif'; ctx.fillText(`${c.pausa} dias parado`, trilhoX(am) + s * 16, yDe(am) + 4); }
      }
      if (c.alt1 < vb || c.alt1 > vt) continue;
      const x = trilhoX(c.alt1), y = yDe(c.alt1), s = lado(c.alt1);
      if (i < n - 1){
        acampamento(c, x - s * 8, y, t, s, i >= n - 3);
        rotulo(x + s * 30, y, c.alt1, c.rotulo, c.sub, s);
        if (c.recorde) marco(x - s * 40, y, c.recorde);
      }
      acampamentos.push({x, y, c});
    }
  }

  /* ---------- o corredor e a cabra ---------- */
  function cachecol(x, y, dir, t, forte){
    const v = forte ? 1.6 : 1, pts = [];
    for (let i = 0; i <= 8; i++){ const u = i / 8; pts.push([x - dir * u * 18 * v, y + u * 3 + Math.sin(t * 6 - u * 5) * 2.4 * u * v]); }
    ctx.fillStyle = CACHECOL; ctx.beginPath();
    pts.forEach((p, i) => { const w = 2.3 * (1 - i / 8 * .55); i ? ctx.lineTo(p[0], p[1] - w) : ctx.moveTo(p[0], p[1] - w); });
    for (let i = pts.length - 1; i >= 0; i--){ const w = 2.3 * (1 - i / 8 * .55); ctx.lineTo(pts[i][0], pts[i][1] + w); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#c99a2e'; ctx.lineWidth = .8; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
  }
  function corredor(t){
    const a = topo, x = trilhoX(a), y = yDe(a), dir = -lado(a + 40) || 1;
    const ultimo = corridas[corridas.length - 1];
    if (ultimo) acampamento(ultimo, x + dir * 52, y + 3, t, dir, true);
    // a cabra numa rocha, do outro lado, virada para o corredor
    const cx = x - dir * 68, cy = y - 4;
    rocha(cx, cy + 12, 2.5, a, 999, a >= 5000);
    const cw = 80, ch = cw * .84, bob = Math.sin(t * 1.4) * .6;
    desenhar(IMG.cabra, cx, cy - 3 + bob, cw, ch, dir);
    cabraPos = {x: cx + dir * cw * .3, y: cy - ch - 2};
    // o corredor
    const h = 64, w = h * 2 / 3, k = h / 90, resp = Math.sin(t * 2) * .5;
    if (estado.cansado){
      rocha(x - dir * 1, y + 1, 1.6, a, 998, a >= 5000);
      desenhar(IMG.sentado, x, y + 1 + resp * .5, w, h, dir);
      if (pronta(IMG.sentado)) cachecol(x + dir * (28.5 - 30) * k, y - (90 - 44) * k, dir, t, estado.tempestade);
    } else {
      desenhar(IMG.pe, x, y + 1, w, h + resp, dir);
      if (pronta(IMG.pe)) cachecol(x + dir * (27 - 30) * k, y - (90 - 27.6) * k, dir, t, estado.tempestade);
    }
  }

  /* ---------- tempo atmosférico ---------- */
  function tempo(t, dt){
    const tipo = estado.tempestade ? 'chuva' : ZONAS[zonaDe(Math.max(0, cam))].fino;
    const quer = {neve: 80, chuva: 130, vento: 18, névoa: 7, estrelas: 0, nada: 0}[tipo] || 0;
    while (particulas.length < quer) particulas.push({x: Math.random() * W, y: Math.random() * H, v: .5 + Math.random(), r: Math.random()});
    if (particulas.length > quer) particulas.length = quer;
    for (const p of particulas){
      if (tipo === 'neve'){ p.y += (18 + 26 * p.v) * dt; p.x += Math.sin(t + p.r * 9) * 12 * dt; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(p.x, p.y, .8 + p.r * 1.7, 0, 7); ctx.fill(); }
      else if (tipo === 'chuva'){ p.y += (440 + 200 * p.v) * dt; p.x -= 120 * dt; ctx.strokeStyle = 'rgba(190,205,225,.33)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 4, p.y + 13); ctx.stroke(); }
      else if (tipo === 'vento'){ p.x += (260 + 200 * p.v) * dt; ctx.strokeStyle = 'rgba(230,235,245,.12)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(p.x - 25, p.y - 3, p.x - 50 - 50 * p.r, p.y); ctx.stroke(); }
      else if (tipo === 'névoa'){ p.x += (8 + 8 * p.v) * dt; const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 130); g.addColorStop(0, 'rgba(220,235,230,.08)'); g.addColorStop(1, 'rgba(220,235,230,0)'); ctx.fillStyle = g; ctx.fillRect(p.x - 130, p.y - 130, 260, 260); }
      if (p.y > H + 20){ p.y = -20; p.x = Math.random() * (W + 120); }
      if (p.x > W + 140){ p.x = -140; p.y = Math.random() * H; }
      if (p.x < -40){ p.x = W + 30; }
    }
    if (estado.tempestade){
      ctx.fillStyle = 'rgba(8,12,22,.3)'; ctx.fillRect(0, 0, W, H);
      if (t > proxRelampago){ relampago = 1; proxRelampago = t + 5 + Math.random() * 7; }
      if (relampago > 0){ ctx.fillStyle = `rgba(230,236,255,${relampago * .35})`; ctx.fillRect(0, 0, W, H); relampago -= dt * 3.5; }
    }
  }
  function faiscasFogo(t, dt){
    // faúlhas da fogueira do topo
    const a = topo, x = trilhoX(a), y = yDe(a), dir = -lado(a + 40) || 1, fx = x + dir * 52 + dir * 21;
    if (!corridas.length || y < -40 || y > H + 40) return;
    if (faiscas.length < 10 && Math.random() < dt * 8) faiscas.push({x: fx + (Math.random() - .5) * 4, y: y - 6, v: 18 + Math.random() * 20, vida: 1});
    for (const f of faiscas){ f.y -= f.v * dt; f.x += Math.sin(t * 4 + f.v) * 10 * dt; f.vida -= dt * .9; ctx.fillStyle = `rgba(255,200,110,${Math.max(0, f.vida)})`; ctx.fillRect(f.x, f.y, 1.6, 1.6); }
    faiscas = faiscas.filter(f => f.vida > 0);
  }

  /* ---------- ciclo ---------- */
  function passo(){
    raf = 0; if (!ativa || document.hidden) return;
    const agora = performance.now(), dt = Math.min(.05, (agora - t0) / 1000), t = agora / 1000; t0 = agora;
    if (anim){
      const k = Math.max(0, Math.min(1, (agora - anim.ini) / anim.dur)), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      cam = anim.de + (anim.para - anim.de) * e; anim.cada && anim.cada(cam);
      if (k >= 1){ const f = anim.fim; anim = null; f && f(); }
    } else if (!arrasto){
      cam += vel * dt; vel *= Math.pow(.04, dt);
      if (Math.abs(vel) < 2) vel = 0;
      const min = -180, max = topo + 500;
      if (cam < min){ cam += (min - cam) * Math.min(1, dt * 8); vel = 0; }
      if (cam > max){ cam += (max - cam) * Math.min(1, dt * 8); vel = 0; }
    }
    ceu(t);
    cristas(.2, 'longe', 240, 80, 1.1, .3);
    nuvens(false, t);
    cristas(.46, 'meio', 310, 100, 4.3, .12);
    face(); trilho(); cenario(); limites(); acampar(t); corredor(t); faiscasFogo(t, dt);
    nuvens(true, t);
    tempo(t, dt);
    const leitura = Math.round(cam) + '|' + Math.round(topo);
    if (leitura !== ultimaLeitura){ ultimaLeitura = leitura; cb.onVista && cb.onVista({cam, topo, longe: Math.abs(cam - topo) > 260, zona: ZONAS[zonaDe(Math.max(0, cam))].nome}); }
    cb.onCabra && cb.onCabra(cabraPos);
    raf = requestAnimationFrame(passo);
  }
  const acordar = () => { if (!raf && ativa && ctx){ t0 = performance.now(); raf = requestAnimationFrame(passo); } };

  /* ---------- toque: arrasta como uma lista ---------- */
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
      const mov = Math.hypot(e.clientX - a.x0, e.clientY - a.y0);
      if (mov < 9 && performance.now() - a.t < 450){ tocar(e); return; }
      const [p0, p1] = [a.ult[0], a.ult[a.ult.length - 1]], dtm = (p1[0] - p0[0]) / 1000;
      if (dtm > 0) vel = Math.max(-14000, Math.min(14000, (p1[1] - p0[1]) / dtm / PXM));
      acordar();
    };
    cv.addEventListener('pointerup', soltar); cv.addEventListener('pointercancel', soltar);
    cv.addEventListener('wheel', e => { e.preventDefault(); anim = null; cam -= e.deltaY / PXM * .8; acordar(); }, {passive: false});
  }
  function tocar(e){
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (Math.hypot(x - cabraPos.x, y - cabraPos.y - 30) < 42){ cb.onToqueCabra && cb.onToqueCabra(); return; }
    let melhor = null, dm = 40;
    for (const a of acampamentos){ const d = Math.hypot(a.x - x, a.y - 10 - y); if (d < dm){ dm = d; melhor = a; } }
    if (melhor) cb.onAcampamento && cb.onAcampamento(melhor.c);
  }

  /* ---------- API ---------- */
  function iniciar(canvas, callbacks){
    cv = canvas; ctx = cv.getContext('2d'); cb = callbacks || {};
    medir(); ligarToque();
    new ResizeObserver(() => { medir(); acordar(); }).observe(cv);
    document.addEventListener('visibilitychange', acordar);
    acordar();
  }
  function definir(lista, est){
    corridas = lista; estado = Object.assign({tempestade: false, cansado: false}, est);
    topo = lista.length ? lista[lista.length - 1].alt1 : 0;
    acordar();
  }
  function irTopo(suave = true){
    if (!suave){ cam = topo; vel = 0; anim = null; acordar(); return; }
    anim = {de: cam, para: topo, ini: performance.now(), dur: Math.min(1800, 500 + Math.abs(cam - topo) * .15)}; acordar();
  }
  function subir(de, para, cada, fim){ cam = de; vel = 0; anim = {de, para, ini: performance.now() + 250, dur: Math.min(3800, 1400 + (para - de) * 2.2), cada, fim}; acordar(); }
  function ligar(sim){ ativa = sim; if (sim) acordar(); }
  return {iniciar, definir, irTopo, subir, ligar, zonaDe: a => ZONAS[zonaDe(Math.max(0, a))], ZONAS, PXM};
})();
