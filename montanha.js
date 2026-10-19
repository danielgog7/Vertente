'use strict';
/* Vertente — a montanha sem cume, desenhada em canvas.
   1 km corrido = 100 m de altitude. Cada corrida é um acampamento no trilho; o topo é o último acampamento.
   Arrastar para baixo desce a montanha (histórico); tocar num acampamento abre a corrida; tocar na cabra fala. */
const Montanha = (() => {
  const PXM = 0.32;              // píxeis por metro de altitude
  const ZONAS = [
    {alt: 0,     nome: 'Floresta',     ceuA: '#162430', ceuB: '#41625e', longe: '#2f4b46', meio: '#21382f', face: '#17271e', sombra: '#0d1812', trilho: '#cdbf95', texto: '#dbe6d8', fino: 'névoa'},
    {alt: 2000,  nome: 'Rocha',        ceuA: '#1d2431', ceuB: '#6f7584', longe: '#5a6070', meio: '#424754', face: '#31353e', sombra: '#1f2229', trilho: '#d6cdb8', texto: '#e3e6ec', fino: 'vento'},
    {alt: 5000,  nome: 'Neve',         ceuA: '#22385a', ceuB: '#b3cbe0', longe: '#cfdcea', meio: '#a7bbcf', face: '#e6edf4', sombra: '#b9c7d6', trilho: '#55606e', texto: '#26313f', fino: 'neve'},
    {alt: 8000,  nome: 'Acima das nuvens', ceuA: '#1b2752', ceuB: '#f0c28b', longe: '#dcc6b2', meio: '#b8a091', face: '#dfe2e9', sombra: '#aeb2c2', trilho: '#5d5566', texto: '#2b2836', fino: 'nada'},
    {alt: 12000, nome: 'Estratosfera', ceuA: '#04050d', ceuB: '#1d2652', longe: '#2b3258', meio: '#20274a', face: '#c8cee0', sombra: '#8d94ad', trilho: '#3a4160', texto: '#1b2140', fino: 'estrelas'},
    {alt: 20000, nome: 'Órbita',       ceuA: '#000000', ceuB: '#0a1030', longe: '#161b3c', meio: '#10142f', face: '#aab1c6', sombra: '#6d738c', trilho: '#2c3150', texto: '#151a34', fino: 'estrelas'}
  ];
  const BANDA = 700; // transição suave entre zonas (metros para cada lado)

  let cv, ctx, W = 0, H = 0, dpr = 1, ativa = true, raf = 0, t0 = performance.now();
  let corridas = [], topo = 0, estado = {tempestade: false, cansado: false};
  let cam = 0, vel = 0, alvo = null; // altitude da câmara (na linha de âncora)
  let anim = null, cb = {};
  let particulas = [], estrelas = [], relampago = 0, proxRelampago = 0;
  let acampamentos = [], cabraPos = {x: 0, y: 0}, ultimaLeitura = '';

  /* ---------- cores ---------- */
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, k) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
  const rgba = (h, a) => { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; };
  function zonaDe(alt){ let i = 0; for (let k = 0; k < ZONAS.length; k++) if (alt >= ZONAS[k].alt) i = k; return i; }
  function cor(alt, prop){
    const i = zonaDe(alt), z = ZONAS[i], prox = ZONAS[i + 1], ant = ZONAS[i - 1];
    if (prox && alt > prox.alt - BANDA) return mix(z[prop], prox[prop], .5 * (alt - (prox.alt - BANDA)) / BANDA);
    if (ant && alt < z.alt + BANDA) return mix(ant[prop], z[prop], .5 + .5 * (alt - z.alt) / BANDA);
    return z[prop];
  }

  /* ---------- geometria da montanha ---------- */
  const ruido = (a, s) => Math.sin(a / 310 + s) * .5 + Math.sin(a / 97 + s * 2.1 + 1.3) * .3 + Math.sin(a / 41 + s * 3.7 + 2) * .2;
  const ancora = () => H * .46;
  const yDe = alt => ancora() - (alt - cam) * PXM;
  const altDe = y => cam + (ancora() - y) / PXM;
  const bordaE = a => W * (.17 + .05 * ruido(a, 0));
  const bordaD = a => W * (.83 + .05 * ruido(a, 5));
  const crista = a => W * (.56 + .07 * ruido(a, 9));
  const tri = x => { const f = x - Math.floor(x); return f < .5 ? f * 4 - 1 : 3 - f * 4; };
  function trilhoX(a){ const e = bordaE(a), d = bordaD(a), c = (e + d) / 2; return c + (d - e) * .3 * tri(a / 760 + .25); }

  /* ---------- tamanho ---------- */
  function medir(){
    const r = cv.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    estrelas = Array.from({length: 140}, (_, i) => ({x: (Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 1 * W, y: (Math.sin(i * 78.233) * 12543.2 % 1 + 1) % 1 * H, r: .4 + (i % 5) * .25, f: i * .7}));
  }

  /* ---------- desenho ---------- */
  function ceu(){
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, cor(altDe(0) , 'ceuA')); g.addColorStop(1, cor(altDe(H * .7), 'ceuB'));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const a = Math.min(1, Math.max(0, (cam - 9500) / 3500));
    if (a > 0){
      const t = performance.now() / 1000;
      for (const s of estrelas){ ctx.globalAlpha = a * (.55 + .45 * Math.sin(t * 1.3 + s.f)); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, (s.y + cam * PXM * .04) % H, s.r, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
  }
  function cristas(fator, prop, esp, amp, semente, nevoa){
    const off = cam * PXM * fator, base = ancora() + H * .25;
    const j0 = Math.ceil((off - (H - base) - esp * 2) / esp), j1 = Math.floor((off + base + esp) / esp);
    for (let j = j1; j >= j0; j--){
      const y = base + off - j * esp, altJ = cam + (ancora() - y) / PXM;
      ctx.fillStyle = mix(cor(altJ, prop), cor(altJ, 'ceuB'), nevoa + .08 * ((j % 3 + 3) % 3));
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W + 16; x += 16){
        const n = Math.sin(x / 90 + j * 1.7 + semente) * .55 + Math.sin(x / 37 + j * 2.9) * .25 + Math.sin(x / 15 + j) * .08;
        ctx.lineTo(x, y - amp * (.5 + .5 * n) - amp * .6 * Math.max(0, Math.sin(x / 160 + j * 4.1 + semente)));
      }
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    }
  }
  function nuvens(frente){
    const y = yDe(8000), t = performance.now() / 1000;
    if (y < -160 || y > H + 220) return;
    for (let i = 0; i < 9; i++){
      const x = ((i * 137 + t * (frente ? 9 : 4)) % (W + 300)) - 150, yy = y + (frente ? 40 : 0) + Math.sin(i * 2.3) * 22;
      const g = ctx.createRadialGradient(x, yy, 0, x, yy, 140);
      g.addColorStop(0, `rgba(255,248,240,${frente ? .32 : .75})`); g.addColorStop(1, 'rgba(255,248,240,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 150, yy - 150, 300, 300);
    }
  }
  function face(){
    const passo = 8, topoV = altDe(-10), fundoV = altDe(H + 10);
    const a0 = Math.max(fundoV, -300);
    const gF = ctx.createLinearGradient(0, 0, 0, H);
    gF.addColorStop(0, cor(topoV, 'face')); gF.addColorStop(1, cor(Math.max(fundoV, 0), 'face'));
    ctx.fillStyle = gF; ctx.beginPath();
    ctx.moveTo(bordaE(a0), yDe(a0));
    for (let a = a0; a <= topoV + passo / PXM; a += passo / PXM) ctx.lineTo(bordaE(a), yDe(a));
    for (let a = topoV + passo / PXM; a >= a0; a -= passo / PXM) ctx.lineTo(bordaD(a), yDe(a));
    ctx.closePath(); ctx.fill();
    // lado na sombra (luz da esquerda)
    const gS = ctx.createLinearGradient(0, 0, 0, H);
    gS.addColorStop(0, rgba(cor(topoV, 'sombra'), .85)); gS.addColorStop(1, rgba(cor(Math.max(fundoV, 0), 'sombra'), .85));
    ctx.fillStyle = gS; ctx.beginPath(); ctx.moveTo(crista(a0), yDe(a0));
    for (let a = a0; a <= topoV + passo / PXM; a += passo / PXM) ctx.lineTo(crista(a), yDe(a));
    for (let a = topoV + passo / PXM; a >= a0; a -= passo / PXM) ctx.lineTo(bordaD(a), yDe(a));
    ctx.closePath(); ctx.fill();
    // estrias
    ctx.lineWidth = 1;
    for (let k = Math.floor(a0 / 140); k * 140 < topoV; k++){
      const a = k * 140, s = Math.sin(k * 91.7) * .5 + .5, e = bordaE(a), d = bordaD(a), x = e + (d - e) * (.1 + .8 * s), y = yDe(a);
      ctx.strokeStyle = rgba(cor(a, 'sombra'), .5); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 18 + 20 * s, y + 9 + 8 * s); ctx.stroke();
    }
    // vale da base
    const yb = yDe(0);
    if (yb < H + 40){
      const g = ctx.createLinearGradient(0, yb, 0, H);
      g.addColorStop(0, '#13201a'); g.addColorStop(1, '#070c09');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, yb + 30);
      for (let x = 0; x <= W; x += 20) ctx.lineTo(x, yb + 18 + Math.sin(x / 50) * 6);
      ctx.lineTo(W, H + 400); ctx.lineTo(0, H + 400); ctx.fill();
      const t = performance.now() / 1000;
      for (let i = 0; i < 7; i++){ ctx.fillStyle = `rgba(255,190,110,${.55 + .35 * Math.sin(t * 2 + i)})`; ctx.fillRect(W * .2 + i * W * .09, yb + 42 + (i % 3) * 7, 2.5, 2.5); }
      ctx.fillStyle = 'rgba(219,230,216,.55)'; ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('BASE · 0 m', W / 2, yb + 78);
    }
  }
  function limites(){
    ctx.textAlign = 'left'; ctx.font = '600 10px system-ui, sans-serif';
    for (let i = 1; i < ZONAS.length; i++){
      const z = ZONAS[i], y = yDe(z.alt);
      if (y < -20 || y > H + 20) continue;
      const conhecida = topo >= z.alt;
      if (!conhecida && z.alt > topo + 4000) continue;
      ctx.strokeStyle = rgba(cor(z.alt, 'texto'), .35); ctx.setLineDash([3, 6]); ctx.beginPath();
      ctx.moveTo(bordaE(z.alt) + 6, y); ctx.lineTo(bordaD(z.alt) - 6, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = rgba(cor(z.alt + 60, 'texto'), .8);
      ctx.fillText(`${z.alt.toLocaleString('pt-PT')} m · ${conhecida ? z.nome.toUpperCase() : '?'}`, bordaE(z.alt) + 12, y - 6);
    }
  }
  function trilho(){
    const vb = Math.max(altDe(H + 20), 0), vt = altDe(-20), ate = Math.min(vt, topo);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (ate > vb){
      ctx.lineWidth = 2.2; ctx.strokeStyle = rgba(cor(ate, 'trilho'), .9); ctx.beginPath();
      for (let a = vb; a <= ate; a += 6 / PXM) { const x = trilhoX(a), y = yDe(a); a === vb ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.lineTo(trilhoX(ate), yDe(ate)); ctx.stroke();
    }
    const f0 = Math.max(topo, vb), f1 = Math.min(vt, topo + 900);
    if (f1 > f0){
      ctx.lineWidth = 1.6; ctx.setLineDash([2, 7]); ctx.strokeStyle = rgba(cor(f0, 'trilho'), .45); ctx.beginPath();
      for (let a = f0; a <= f1; a += 6 / PXM){ const x = trilhoX(a), y = yDe(a); a === f0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke(); ctx.setLineDash([]);
    }
  }
  function lado(a){ const e = bordaE(a), d = bordaD(a); return trilhoX(a) < (e + d) / 2 ? 1 : -1; }
  function tenda(x, y, cs, glow, t, esforco){
    // fogueira
    const r = 2 + (esforco || 5) * .45, fl = 1 + .15 * Math.sin(t * 9 + x);
    if (glow > 0){
      const g = ctx.createRadialGradient(x + 13, y - 2, 0, x + 13, y - 2, r * 7);
      g.addColorStop(0, `rgba(255,150,60,${.45 * glow})`); g.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = g; ctx.fillRect(x + 13 - r * 7, y - 2 - r * 7, r * 14, r * 14);
    }
    ctx.fillStyle = glow > 0 ? '#ffb057' : '#8a5a3c'; ctx.beginPath();
    ctx.moveTo(x + 13 - r * .7, y); ctx.quadraticCurveTo(x + 13, y - r * 2.2 * fl, x + 13 + r * .7, y); ctx.fill();
    // tenda
    ctx.fillStyle = '#e0783c'; ctx.beginPath(); ctx.moveTo(x - 9, y); ctx.lineTo(x, y - 12); ctx.lineTo(x + 9, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x + 9, y); ctx.lineTo(x + 2, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2a1a12'; ctx.beginPath(); ctx.moveTo(x - 2, y); ctx.lineTo(x, y - 5); ctx.lineTo(x + 2, y); ctx.fill();
  }
  function marco(x, y, texto, c){
    ctx.fillStyle = '#6d6a66'; ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x - 5, y - 14); ctx.quadraticCurveTo(x, y - 19, x + 5, y - 14); ctx.lineTo(x + 6, y); ctx.fill();
    ctx.strokeStyle = '#d9d2c4'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 2, y - 11); ctx.lineTo(x + 2, y - 11); ctx.moveTo(x, y - 13); ctx.lineTo(x, y - 6); ctx.stroke();
    ctx.fillStyle = c; ctx.font = '700 9px system-ui, sans-serif'; ctx.fillText(texto, x, y - 22);
  }
  function acampar(t){
    acampamentos = [];
    const vb = altDe(H + 40), vt = altDe(-40), n = corridas.length;
    ctx.font = '600 11px system-ui, sans-serif';
    for (let i = 0; i < n; i++){
      const c = corridas[i];
      // dias parado entre acampamentos
      if (i > 0 && c.pausa >= 10){
        const am = (corridas[i - 1].alt1 + c.alt1) / 2;
        if (am > vb && am < vt){ const lx = trilhoX(am), s = lado(am); ctx.textAlign = s > 0 ? 'left' : 'right'; ctx.fillStyle = rgba(cor(am, 'texto'), .45); ctx.font = 'italic 10px system-ui, sans-serif'; ctx.fillText(`${c.pausa} dias parado`, lx + s * 14, yDe(am) + 3); ctx.font = '600 11px system-ui, sans-serif'; }
      }
      if (c.alt1 < vb || c.alt1 > vt) continue;
      const x = trilhoX(c.alt1), y = yDe(c.alt1), s = lado(c.alt1), ultimo = i === n - 1;
      const glow = i >= n - 3 ? 1 - (n - 1 - i) * .3 : 0;
      if (!ultimo){
        tenda(x, y, null, glow, t, c.esforco);
        const tc = cor(c.alt1, 'texto');
        ctx.textAlign = s > 0 ? 'left' : 'right';
        ctx.fillStyle = rgba(tc, .95); ctx.fillText(c.rotulo, x + s * 24, y - 4);
        ctx.fillStyle = rgba(tc, .6); ctx.font = '500 10px system-ui, sans-serif'; ctx.fillText(c.sub, x + s * 24, y + 9); ctx.font = '600 11px system-ui, sans-serif';
        if (c.recorde){ ctx.textAlign = 'center'; marco(x - s * 26, y, c.recorde, rgba(tc, .85)); ctx.font = '600 11px system-ui, sans-serif'; }
      }
      acampamentos.push({x, y, c});
    }
  }
  function corredor(t){
    const a = topo, x = trilhoX(a), y = yDe(a), s = -lado(a + 40) || 1;
    const ultimo = corridas[corridas.length - 1];
    if (ultimo) tenda(x + s * 26, y + 2, null, 1, t, ultimo.esforco);
    const tinta = mix(cor(a, 'face'), '#000000', .85);
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = tinta; ctx.strokeStyle = tinta; ctx.lineCap = 'round'; ctx.lineWidth = 3.2;
    const vento = Math.sin(t * 3) * 3 + (estado.tempestade ? 6 : 0);
    if (estado.cansado){ // sentado numa pedra, a recuperar
      ctx.fillStyle = mix(cor(a, 'sombra'), '#000', .3); ctx.beginPath(); ctx.ellipse(0, -3, 9, 4, 0, 0, 7); ctx.fill(); ctx.fillStyle = tinta;
      ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(1, -19); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(8 * s, -7); ctx.lineTo(9 * s, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(1, -16); ctx.lineTo(6 * s, -9); ctx.stroke();
      ctx.beginPath(); ctx.arc(2, -23, 4, 0, 7); ctx.fill();
      ctx.strokeStyle = '#e0783c'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(1, -19); ctx.quadraticCurveTo(-6 * s, -18 + vento * .3, -13 * s, -16 + vento * .5); ctx.stroke();
    } else { // de pé, a olhar para cima
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(2 * s, -10); ctx.lineTo(4 * s, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(2 * s, -10); ctx.lineTo(3 * s, -22); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(3 * s, -19); ctx.lineTo(8 * s, -12); ctx.moveTo(3 * s, -19); ctx.lineTo(-2 * s, -12); ctx.stroke();
      ctx.beginPath(); ctx.arc(4 * s, -26.5, 4, 0, 7); ctx.fill();
      ctx.strokeStyle = '#e0783c'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(3 * s, -22);
      ctx.quadraticCurveTo(-6 * s, -22 + vento * .4, -15 * s, -19 + vento); ctx.stroke();
    }
    ctx.restore();
    // a cabra numa rocha, do outro lado
    const cx = x - s * 44, cy = y - 10;
    cabraPos = {x: cx, y: cy - 22};
    const pedra = mix(cor(a, 'sombra'), '#000', .25);
    ctx.fillStyle = pedra; ctx.beginPath(); ctx.moveTo(cx - 16, cy + 12); ctx.lineTo(cx - 12, cy + 1); ctx.lineTo(cx + 4, cy - 2); ctx.lineTo(cx + 15, cy + 4); ctx.lineTo(cx + 17, cy + 12); ctx.fill();
    cabra(cx, cy, s, t, tinta);
  }
  function cabra(x, y, s, t, tinta){
    const d = -s; // olha para o corredor
    ctx.save(); ctx.translate(x, y); ctx.scale(d, 1); ctx.fillStyle = tinta; ctx.strokeStyle = tinta; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(0, -9, 9, 5.5, 0, 0, 7); ctx.fill();               // corpo
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(-7, 0); ctx.moveTo(-3, -6); ctx.lineTo(-2.5, 0); ctx.moveTo(4, -6); ctx.lineTo(4.5, 0); ctx.moveTo(7, -6); ctx.lineTo(7.5, 0); ctx.stroke();
    ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(7, -11); ctx.lineTo(10, -17); ctx.stroke(); // pescoço
    const mexe = Math.sin(t * 1.6) * .6;
    ctx.beginPath(); ctx.ellipse(12, -18 + mexe, 4.2, 2.8, .45, 0, 7); ctx.fill();    // cabeça
    ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(14, -15.5 + mexe); ctx.lineTo(13.5, -11 + mexe); ctx.stroke(); // barbicha
    ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(10.5, -20 + mexe); ctx.quadraticCurveTo(6, -27 + mexe, 3, -21 + mexe); ctx.stroke(); // corno
    ctx.beginPath(); ctx.moveTo(-9, -10); ctx.lineTo(-11, -13); ctx.stroke();            // cauda
    ctx.fillStyle = '#f2e6c8'; ctx.beginPath(); ctx.arc(13.3, -19 + mexe, .9, 0, 7); ctx.fill(); // olho
    ctx.restore();
  }
  function tempo(t, dt){
    const za = ZONAS[zonaDe(cam)].fino;
    const tipo = estado.tempestade ? 'chuva' : za;
    const quer = {neve: 70, chuva: 120, vento: 18, névoa: 6, estrelas: 0, nada: 0}[tipo] || 0;
    while (particulas.length < quer) particulas.push({x: Math.random() * W, y: Math.random() * H, v: .5 + Math.random(), r: Math.random()});
    if (particulas.length > quer) particulas.length = quer;
    for (const p of particulas){
      if (tipo === 'neve'){ p.y += (18 + 26 * p.v) * dt; p.x += Math.sin(t + p.r * 9) * 12 * dt; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(p.x, p.y, .8 + p.r * 1.6, 0, 7); ctx.fill(); }
      else if (tipo === 'chuva'){ p.y += (420 + 200 * p.v) * dt; p.x -= 120 * dt; ctx.strokeStyle = 'rgba(190,205,225,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 4, p.y + 13); ctx.stroke(); }
      else if (tipo === 'vento'){ p.x += (260 + 200 * p.v) * dt; ctx.strokeStyle = 'rgba(230,235,245,.13)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 40 - 50 * p.r, p.y); ctx.stroke(); }
      else if (tipo === 'névoa'){ p.x += (8 + 8 * p.v) * dt; const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 120); g.addColorStop(0, 'rgba(220,235,230,.07)'); g.addColorStop(1, 'rgba(220,235,230,0)'); ctx.fillStyle = g; ctx.fillRect(p.x - 120, p.y - 120, 240, 240); }
      if (p.y > H + 20){ p.y = -20; p.x = Math.random() * (W + 120); }
      if (p.x > W + 140){ p.x = -140; p.y = Math.random() * H; }
      if (p.x < -40){ p.x = W + 30; }
    }
    if (estado.tempestade){
      ctx.fillStyle = 'rgba(8,12,22,.32)'; ctx.fillRect(0, 0, W, H);
      if (t > proxRelampago){ relampago = 1; proxRelampago = t + 5 + Math.random() * 7; }
      if (relampago > 0){ ctx.fillStyle = `rgba(230,236,255,${relampago * .35})`; ctx.fillRect(0, 0, W, H); relampago -= dt * 3.5; }
    }
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
    ceu();
    cristas(.22, 'longe', 230, 70, 1.1, .28);
    nuvens(false);
    cristas(.48, 'meio', 300, 90, 4.3, .12);
    face(); limites(); trilho(); acampar(t); corredor(t);
    nuvens(true);
    tempo(t, dt);
    const leitura = Math.round(cam) + '|' + Math.round(topo);
    if (leitura !== ultimaLeitura){ ultimaLeitura = leitura; cb.onVista && cb.onVista({cam, topo, longe: Math.abs(cam - topo) > 260, zona: ZONAS[zonaDe(Math.max(0, cam))].nome}); }
    cb.onCabra && cb.onCabra(cabraPos);
    raf = requestAnimationFrame(passo);
  }
  const acordar = () => { if (!raf && ativa){ t0 = performance.now(); raf = requestAnimationFrame(passo); } };

  /* ---------- toque ---------- */
  let arrasto = null;
  function ligarToque(){
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); anim = null; vel = 0; arrasto = {y: e.clientY, y0: e.clientY, x0: e.clientX, t: performance.now(), ult: [[performance.now(), e.clientY]]}; });
    cv.addEventListener('pointermove', e => {
      if (!arrasto) return;
      cam -= (e.clientY - arrasto.y) / PXM; arrasto.y = e.clientY;
      arrasto.ult.push([performance.now(), e.clientY]); if (arrasto.ult.length > 6) arrasto.ult.shift();
      acordar();
    });
    const soltar = e => {
      if (!arrasto) return;
      const a = arrasto; arrasto = null;
      const mov = Math.hypot(e.clientX - a.x0, e.clientY - a.y0);
      if (mov < 9 && performance.now() - a.t < 450){ tocar(e); return; }
      const [p0, p1] = [a.ult[0], a.ult[a.ult.length - 1]], dtm = (p1[0] - p0[0]) / 1000;
      if (dtm > 0) vel = -Math.max(-14000, Math.min(14000, (p1[1] - p0[1]) / dtm / PXM));
      acordar();
    };
    cv.addEventListener('pointerup', soltar); cv.addEventListener('pointercancel', soltar);
    cv.addEventListener('wheel', e => { e.preventDefault(); anim = null; cam -= e.deltaY / PXM * .8; acordar(); }, {passive: false});
  }
  function tocar(e){
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (Math.hypot(x - cabraPos.x, y - cabraPos.y - 10) < 30){ cb.onToqueCabra && cb.onToqueCabra(); return; }
    let melhor = null, dm = 34;
    for (const a of acampamentos){ const d = Math.hypot(a.x - x, a.y - 6 - y); if (d < dm){ dm = d; melhor = a; } }
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
