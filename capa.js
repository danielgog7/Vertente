'use strict';
/* Vertente — capa de entrada: a Cabra Velha num rochedo, diante de um penedo.
   Três toques = três marradas. O penedo racha a cada marrada e à terceira parte-se; a Cabra salta e entra-se na montanha. */
const Capa = (() => {
  let aberta = false, marradas = 0, escondidoEm = 0, ocupado = false;
  function cena(noite){
    const ceu = noite ? ['#040812', '#0e1a36', '#24365c'] : ['#2c4f6e', '#7ea3b8', '#e9d9c0'];
    const estrelas = noite ? Array.from({length: 60}, (_, i) => `<circle cx="${(Math.sin(i * 12.9) * 43758 % 1 + 1) % 1 * 400}" cy="${(Math.sin(i * 78.2) * 12543 % 1 + 1) % 1 * 330}" r="${.5 + (i % 4) * .35}" fill="#fff" opacity="${.4 + (i % 5) * .12}"><animate attributeName="opacity" values=".2;.9;.2" dur="${2 + i % 5}s" begin="${i % 7 * .3}s" repeatCount="indefinite"/></circle>`).join('') : '';
    return `<svg class="cCena" viewBox="0 0 400 760" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="kCeu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ceu[0]}"/><stop offset=".55" stop-color="${ceu[1]}"/><stop offset="1" stop-color="${ceu[2]}"/></linearGradient>
        <linearGradient id="kPico" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${noite ? '#43506a' : '#8e9aab'}"/><stop offset=".55" stop-color="${noite ? '#2a3448' : '#5f6a7c'}"/><stop offset="1" stop-color="${noite ? '#1a2131' : '#3f4757'}"/></linearGradient>
        <linearGradient id="kNevoa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ceu[2]}" stop-opacity="0"/><stop offset="1" stop-color="${ceu[2]}" stop-opacity="${noite ? .35 : .7}"/></linearGradient>
        <linearGradient id="kPedra" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${noite ? '#4a4f5c' : '#8a8f99'}"/><stop offset="1" stop-color="${noite ? '#23262e' : '#4a4e58'}"/></linearGradient>
        <radialGradient id="kSol" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${noite ? '#eef2ff' : '#fff4d6'}" stop-opacity=".9"/><stop offset=".25" stop-color="${noite ? '#c8d7ff' : '#ffd9a0'}" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="400" height="760" fill="url(#kCeu)"/>${estrelas}
      <circle cx="300" cy="190" r="150" fill="url(#kSol)"/><circle cx="300" cy="190" r="${noite ? 18 : 24}" fill="${noite ? '#eef2ff' : '#fff6e0'}"/>
      ${noite ? '<circle cx="308" cy="184" r="16" fill="#0e1a36"/>' : ''}
      <path class="cLonge" d="M0 470L50 400 90 430 150 330 205 410 250 360 300 420 350 350 400 400V760H0Z" fill="${noite ? '#1c2a44' : '#9fb3bd'}" opacity=".85"/>
      <path d="M150 330l-22 31 14-4 8 9 10-16 10 6zM350 350l-16 22 10-3 8 7 7-12z" fill="#fff" opacity="${noite ? .35 : .85}"/>
      <path class="cPico" d="M-20 760L95 470 130 490 185 330 214 372 236 296 262 340 300 300 360 470 420 760Z" fill="url(#kPico)"/>
      <path d="M236 296l-12 24 10-4 8 10 12-10 8 14 8-20zM185 330l-14 22 11-3 6 8 7-10z" fill="#f4f7fb" opacity="${noite ? .55 : .95}"/>
      <rect y="470" width="400" height="190" fill="url(#kNevoa)"/>
      <g class="cPenedo"><path d="M262 600L278 548 312 530 348 544 362 600Z" fill="url(#kPedra)"/><path d="M312 530l36 14 14 56h-40z" fill="#000" opacity=".22"/><path d="M278 548l34-18-4 26z" fill="#fff" opacity=".18"/>
        <g class="cRachas" fill="none" stroke="#14161c" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path class="r1" d="M296 540l6 14-5 10 7 12"/><path class="r2" d="M304 576l14 4 8-8 10 6M318 580l2 16"/><path class="r3" d="M282 560l10 4 4 14-6 10M330 548l-4 16 12 10"/></g></g>
      <g class="cLasca l1"><path d="M312 530l36 14 2 30-24-8z" fill="url(#kPedra)"/></g>
      <g class="cLasca l2"><path d="M262 600l16-52 18 20-10 32z" fill="url(#kPedra)"/></g>
      <g class="cLasca l3"><path d="M296 568l30 6 12 26h-46z" fill="url(#kPedra)"/></g>
      <path d="M-10 760V610Q40 590 110 596L220 600Q262 602 290 622L360 640Q400 650 410 700V760Z" fill="${noite ? '#121722' : '#2c3340'}"/>
      <path d="M-10 610Q40 590 110 596L220 600Q262 602 290 622" stroke="${noite ? '#2c3650' : '#6b7486'}" stroke-width="2" fill="none"/>
      <g class="cCabra">${cabraSVG()}</g>
      <g class="cFaisca" opacity="0"><path d="M268 548l4-14 4 14 14 4-14 4-4 14-4-14-14-4z" fill="#fff6d0"/></g>
      <g class="cPo"></g>
    </svg>`;
  }
  /* A Cabra em peças, para a animar: pernas, corpo, cauda, cabeça (orelha, olho, mandíbula, barbicha, cornos). */
  function cabraSVG(){
    const perna = (cl, ox, d, casco, cor) => `<g class="gp ${cl}" style="transform-origin:${ox}px 51px"><path d="${d}" fill="${cor}"/><path d="${casco}" fill="#2b241d"/></g>`;
    return `<svg class="gCabra" x="80" y="452" width="180" height="151" viewBox="0 0 100 84" overflow="visible">
      <defs><linearGradient id="gPl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b4a387"/><stop offset="1" stop-color="#8f7f68"/></linearGradient>
      <linearGradient id="gCo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a7152"/><stop offset="1" stop-color="#4e3d2b"/></linearGradient></defs>
      <ellipse class="gp gSombra" style="transform-origin:50px 81.5px" cx="50" cy="81.5" rx="31" ry="2.4" fill="#000" opacity=".3"/>
      ${perna('pTE', 38, 'M36 50h4.5l1 28h-4.5z', 'M36.5 77H42v3.2h-6.5z', '#6b5d4c')}${perna('pFE', 68, 'M66 50h4.5l-1 28H65z', 'M64.5 77H70v3.2h-6.5z', '#6b5d4c')}
      ${perna('pTD', 32, 'M29 50h6.5l-1 14 1 14h-5.5l-1-14z', 'M28 77h7.5v3.2H27z', '#97866f')}${perna('pFD', 63, 'M60 50h6.5l1 14-1 14h-5.5V64z', 'M59 77h7.5v3.2H58z', '#97866f')}
      <g class="gp gCorpo" style="transform-origin:50px 56px">
        <g class="gp gCauda" style="transform-origin:24px 33px"><path d="M23 34q-6-4-4.5-9q4.5 2 6.5 6.5z" fill="#83735f"/></g>
        <path d="M22 42q-2-14 14-16h26q14 0 16 12l-1 10q-3 7-12 7H34q-11 0-12-13z" fill="url(#gPl)"/>
        <path d="M30 27h32q12 0 15 8q-20-4-50 2q-1-8 3-10z" fill="#83735f"/>
        <path d="M38 36q4 5 2 12M50 35q3 5 1 13M60 35q3 5 1 12" stroke="#8d7d67" stroke-width="1" fill="none" opacity=".7"/>
        <path d="M30 52q18 6 36 0l-2 4.5H33z" fill="#e6dcc8"/>
        <g class="gp gCabeca" style="transform-origin:70px 38px">
          <path d="M66 32q4-12 13-16l7 6q-6 8-9 20z" fill="#a39279"/><path d="M68 28q4-10 11-13l-1 4q-6 4-8 12z" fill="#83735f"/>
          <g class="gp gOrelha" style="transform-origin:78px 18px"><path d="M78 17.2q-6.5-1.2-9 2.3q5.5 1.2 9-.2z" fill="#83735f"/></g>
          <path d="M77 14q9-5 15 2l4 8q1 4-3 4l-7-1q-7-3-9-9z" fill="#95846e"/>
          <g class="gp gBoca" style="transform-origin:90px 22px"><path d="M90 20l6 4q1 4-3 4l-4-1z" fill="#76665a"/><circle cx="94.3" cy="24" r=".7" fill="#2b241d"/></g>
          <path d="M82.4 15q2.4-2 5 0" stroke="#f4eee2" stroke-width="1.5" fill="none" stroke-linecap="round"/>
          <circle cx="85" cy="17.2" r="1.15" fill="#1d1712"/><circle cx="85.4" cy="16.8" r=".35" fill="#fff"/>
          <path class="gp gPalpebra" style="transform-origin:85px 15.9px" d="M83.6 15.9h2.9v2.6h-2.9z" fill="#95846e" transform="scale(1 0)"/>
          <g class="gp gBarba" style="transform-origin:86px 27px"><path d="M86 27q1.5 9-3.5 15q-1.2-8 .3-15z" fill="#f4eee2"/><path d="M84.5 30q-.5 5-1.5 8" stroke="#cfc4b0" stroke-width=".6"/></g>
          <path d="M80.5 13q-4.5-12.5-17.5-12.5q-10 1-11.5 10.5q3-6.5 10.5-6.5q10 0 14.5 10.5z" fill="url(#gCo)"/>
          <path d="M78 12q-4-9-14-9.5q-7 .5-9 6" stroke="#a08460" stroke-width="1.2" fill="none"/>
          <path d="M63 2.5l1.2 3.4M68 2.4v3.6M72.6 4.2l-1.2 3.2M58 4.5l2 2.6M76.2 7.4l-2.2 2.4" stroke="#3f3224" stroke-width="1.1" stroke-linecap="round"/>
        </g>
      </g>
      <g class="gp gTonta" style="transform-origin:76px 2px" opacity="0">${[0, 1, 2].map(i => `<path transform="translate(${66 + i * 9} ${-4 + (i % 2) * 4})" d="M0-3l.9 2.1L3-.6 1.3.7l.5 2.3L0 1.8-1.8 3l.5-2.3L-3-.6l2.1-.3z" fill="#ffd56b"/>`).join('')}</g>
      <g class="gBafo"></g>
    </svg>`;
  }
  function saudacao(){ const h = new Date().getHours(); return h >= 6 && h < 12 ? 'Bom dia' : h >= 12 && h < 20 ? 'Boa tarde' : 'Boa noite'; }
  function abrir(forcar){
    if (aberta || (!forcar && (cfg.capa === false || !cfg.nome))) return false;
    aberta = true; marradas = 0; ocupado = false;
    const l = lista, topo = l.length ? l[l.length - 1].alt1 : 0, u = l[l.length - 1], d = Metas.estado(l);
    const dias = u ? diasEntre(u.data, hojeISO()) : null;
    const novaBandeira = dados.desafioVisto !== d.semana && l.length;
    if (novaBandeira){ dados.desafioVisto = d.semana; guardarDados(); }
    const fala = novaBandeira ? 'Nova bandeira na encosta. ' + d.texto : falaDoMomento(l);
    const c = $('#capa'); c.className = ''; c.hidden = false;
    c.innerHTML = `${cena(Montanha.noite() > .5)}
      <div class="capaTopo"><div class="capaMarca">VERTENTE</div><h1>${saudacao()}${cfg.nome ? ', ' + esc(cfg.nome) : ''}</h1></div>
      <div class="capaFala"><b>Cabra Velha</b><span>${esc(fala)}</span></div>
      <div class="capaBase">
        <div class="capaInfo"><div><b class="n">${metros(topo)}<small>M</small></b><span>${esc(Montanha.zonaDe(topo).nome)}</span></div>
          <div class="${d.feito ? 'ouro' : ''}"><b class="n">${d.feito ? 'CUMPRIDO' : Math.round(d.frac * 100) + '%'}</b><span>${esc(d.curto.toLowerCase())}</span></div>
          <div><b class="n">${dias === null ? '–' : dias === 0 ? 'HOJE' : dias === 1 ? 'ONTEM' : dias + ' DIAS'}</b><span>${dias === null ? 'sem corridas' : 'última corrida'}</span></div></div>
        <p class="capaDica" id="capaDica">Dá três marradas para entrar</p>
        <div class="capaPontos"><i></i><i></i><i></i></div>
      </div>`;
    balaoAte = 0; pendentes = 0;
    requestAnimationFrame(entrar);
    return true;
  }
  const q = sel => $('#capa .cCena') && $('#capa .cCena').querySelector(sel);
  const anim = (sel, kf, op) => { const el = typeof sel === 'string' ? q(sel) : sel; return el ? el.animate(kf, op) : null; };
  const rot = (...g) => g.map(v => ({transform: `rotate(${v}deg)`}));
  function po(svg, n, x = 268, y = 560){
    const g = svg.querySelector('.cPo'), NS = 'http://www.w3.org/2000/svg';
    for (let i = 0; i < n; i++){
      const p = document.createElementNS(NS, 'circle'), a = -Math.PI / 2 + (Math.random() - .5) * 2.6, v = 30 + Math.random() * 60;
      p.setAttribute('cx', x); p.setAttribute('cy', y + Math.random() * 30); p.setAttribute('r', 1.5 + Math.random() * 3);
      p.setAttribute('fill', Math.random() < .5 ? '#c9c2b4' : '#8a8f99'); g.appendChild(p);
      p.animate([{transform: 'translate(0,0)', opacity: 1}, {transform: `translate(${Math.cos(a) * v + 10}px,${Math.sin(a) * v}px)`, opacity: 0}], {duration: 600 + Math.random() * 400, easing: 'cubic-bezier(.2,.8,.3,1)'}).onfinish = () => p.remove();
    }
  }
  function bafo(){
    const g = q('.gBafo'); if (!g) return;
    const NS = 'http://www.w3.org/2000/svg';
    for (let i = 0; i < 3; i++){
      const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', 96); c.setAttribute('cy', 24); c.setAttribute('r', 1.5); c.setAttribute('fill', '#eef3f8'); g.appendChild(c);
      c.animate([{transform: 'translate(0,0) scale(1)', opacity: .7}, {transform: `translate(${10 + i * 5}px,${-6 - i * 3}px) scale(${3 + i})`, opacity: 0}], {duration: 1400 + i * 200, delay: i * 120, easing: 'ease-out'}).onfinish = () => c.remove();
    }
  }
  // passo de trote: pernas em diagonal alternada
  function trotar(ms){
    const o = {duration: 300, iterations: Math.ceil(ms / 300), easing: 'ease-in-out', direction: 'alternate'};
    anim('.pFD', rot(-20, 20), o); anim('.pTE', rot(-20, 20), o); anim('.pFE', rot(20, -20), o); anim('.pTD', rot(20, -20), o);
    anim('.gCabeca', rot(-2, 3), Object.assign({}, o, {duration: 150, iterations: Math.ceil(ms / 150)}));
  }
  function entrar(){
    const cabra = q('.cCabra'); if (!cabra) return;
    cabra.animate([{transform: 'translate(-300px,0)'}, {transform: 'translate(0,0)'}], {duration: 1500, easing: 'cubic-bezier(.25,.8,.35,1)'});
    trotar(1400);
    setTimeout(() => { if (!aberta || marradas) return; anim('.gCabeca', rot(0, -10, 6, -4, 0), {duration: 700, easing: 'ease-in-out'}); anim('.gBarba', rot(0, 14, -10, 6, 0), {duration: 800}); }, 1550);
    vida();
  }
  // a cabra à espera: respira, pisca, mastiga, abana a cauda, olha à volta e raspa o chão
  let timerVida = 0, desde = 0;
  function vida(){
    clearTimeout(timerVida); desde = performance.now();
    const passo = () => {
      if (!aberta) return;
      if (!ocupado){
        const espera = performance.now() - desde, r = Math.random();
        anim('.gPalpebra', [{transform: 'scale(1,0)'}, {transform: 'scale(1,1)', offset: .45}, {transform: 'scale(1,1)', offset: .55}, {transform: 'scale(1,0)'}], {duration: 220});
        if (espera > 5000 && r < .35){ // impaciente: raspa o chão com a pata
          anim('.pFD', rot(0, -32, 6, -32, 6, 0), {duration: 1000, easing: 'ease-in-out'});
          [250, 650].forEach(t => setTimeout(() => { const s = q('.cCena') && $('#capa .cCena'); if (s && aberta) po(s, 5, 196, 595); }, t));
          anim('.gCabeca', rot(0, 8, 8, 0), {duration: 1000});
        } else if (r < .5) anim('.gBoca', rot(0, 9, 0, 9, 0, 9, 0), {duration: 900});
        else if (r < .65) anim('.gCauda', rot(0, -24, 18, -18, 0), {duration: 600});
        else if (r < .8) anim('.gOrelha', rot(0, -28, 0), {duration: 320});
        else anim('.gCabeca', rot(0, -12, -12, 0), {duration: 1800, easing: 'ease-in-out'}); // olha para o cume
        const amb = Montanha.ambiente(); if (amb.noite > .5 || amb.estacao === 'inverno') bafo();
      }
      timerVida = setTimeout(passo, 1300 + Math.random() * 1700);
    };
    timerVida = setTimeout(passo, 2200);
  }
  let pendentes = 0;
  function marrada(){
    if (!aberta || marradas >= 3) return;
    if (ocupado){ if (marradas + pendentes < 3) pendentes++; return; }
    ocupado = true; marradas++; desde = performance.now();
    const c = $('#capa'), svg = c.querySelector('.cCena'), cabra = svg.querySelector('.cCabra'), ult = marradas === 3;
    const D = ult ? 820 : 720, op = {duration: D, easing: 'ease-in-out'};
    // preparação (baixa a cabeça, recua), investida, impacto e ricochete
    cabra.animate([{transform: 'translate(0,0)'}, {transform: `translate(${ult ? -22 : -14}px,3px)`, offset: .3}, {transform: 'translate(30px,0) scale(1.03,.97)', offset: .42}, {transform: 'translate(25px,1px) scale(.96,1.04)', offset: .5}, {transform: 'translate(-5px,0)', offset: .76}, {transform: 'translate(0,0)'}], op);
    anim('.gCabeca', rot(0, 22, 26, -9, 5, 0).map((k, i) => Object.assign(k, {offset: [0, .3, .5, .7, .86, 1][i]})), op);
    anim('.pFD', rot(0, 14, -24, 6, 0), op); anim('.pFE', rot(0, 10, -18, 4, 0), op);
    anim('.pTD', rot(0, -12, 26, -4, 0), op); anim('.pTE', rot(0, -10, 20, -3, 0), op);
    anim('.gCauda', rot(0, 30, -20, 10, 0), op); anim('.gBarba', rot(0, -10, 22, -12, 0), op);
    setTimeout(() => {
      c.querySelectorAll('.capaPontos i')[marradas - 1].classList.add('on');
      svg.querySelector('.r' + marradas).classList.add('on');
      anim('.cFaisca', [{opacity: 1, transform: 'scale(.3)'}, {opacity: 0, transform: 'scale(1.6)'}], {duration: 380, easing: 'ease-out'});
      svg.querySelector('.cPenedo').animate([{transform: 'translate(0,0)'}, {transform: 'translate(6px,-2px) rotate(2deg)'}, {transform: 'translate(-2px,0)'}, {transform: 'translate(0,0)'}], {duration: 280});
      c.animate([{transform: 'translate(0,0)'}, {transform: 'translate(-7px,5px)'}, {transform: 'translate(6px,-3px)'}, {transform: 'translate(-2px,1px)'}, {transform: 'translate(0,0)'}], {duration: 240});
      po(svg, 10 + marradas * 6);
      vibrar(ult ? [40, 30, 90] : 28);
      Som.marrada && Som.marrada(marradas);
      if (marradas === 2) anim('.gTonta', [{opacity: 0, transform: 'rotate(0)'}, {opacity: 1, offset: .2}, {opacity: 1, offset: .8}, {opacity: 0, transform: 'rotate(360deg)'}], {duration: 1100});
      const dica = $('#capaDica'); if (dica) dica.textContent = marradas === 1 ? 'Mais duas' : marradas === 2 ? 'Só mais uma' : 'Lá vamos nós';
      if (!ult){
        setTimeout(() => { ocupado = false; if (pendentes){ pendentes--; marrada(); } }, D * .5);
        return;
      }
      // o penedo parte-se e a cabra salta por cima, de pernas encolhidas
      svg.querySelector('.cPenedo').style.opacity = 0;
      [['l1', 140, -120, 50], ['l2', 60, -60, -40], ['l3', 120, 40, 80]].forEach(([k, x, y, r]) => { const el = svg.querySelector('.' + k); el.style.opacity = 1; el.animate([{transform: 'translate(0,0) rotate(0)', opacity: 1}, {transform: `translate(${x}px,${y}px) rotate(${r}deg)`, opacity: 0}], {duration: 900, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards'}); });
      po(svg, 34);
      setTimeout(() => {
        const S = {duration: 260, fill: 'forwards', easing: 'ease-out'};
        anim('.pFD', rot(0, -55), S); anim('.pFE', rot(0, -45), S); anim('.pTD', rot(0, 55), S); anim('.pTE', rot(0, 45), S);
        anim('.gCabeca', rot(0, -14), S);
        cabra.animate([{transform: 'translate(0,0)'}, {transform: 'translate(50px,-130px) rotate(-12deg)', offset: .5}, {transform: 'translate(240px,-70px) rotate(8deg)'}], {duration: 820, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards'});
        setTimeout(fechar, 520);
      }, 120);
    }, D * .44);
  }
  function fechar(){
    const c = $('#capa'); c.classList.add('sair');
    clearTimeout(timerVida);
    setTimeout(() => { c.hidden = true; c.innerHTML = ''; aberta = false; Montanha.irTopo(false); }, 650);
  }
  document.addEventListener('pointerdown', e => { if (aberta && e.target.closest('#capa')) marrada(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) escondidoEm = Date.now();
    else if (escondidoEm && Date.now() - escondidoEm > 30 * 60e3 && $('#folha').hidden) abrir();
  });
  return {abrir, aberta: () => aberta};
})();
