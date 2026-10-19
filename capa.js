'use strict';
/* Vertente — capa de entrada: a Cabra Velha num rochedo, diante de um penedo.
   Três toques = três marradas. O penedo racha a cada marrada e à terceira parte-se; a Cabra salta e entra-se na montanha. */
const Capa = (() => {
  let aberta = false, marradas = 0, escondidoEm = 0, ocupado = false;
  const URL_C = () => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(Montanha.SVG_CABRA);
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
      <g class="cCabra"><image href="${URL_C()}" x="80" y="452" width="180" height="151"/></g>
      <g class="cPo"></g>
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
    balaoAte = 0;
    return true;
  }
  function po(svg, n){
    const g = svg.querySelector('.cPo'), NS = 'http://www.w3.org/2000/svg';
    for (let i = 0; i < n; i++){
      const p = document.createElementNS(NS, 'circle'), a = -Math.PI / 2 + (Math.random() - .5) * 2.6, v = 30 + Math.random() * 60;
      p.setAttribute('cx', 268); p.setAttribute('cy', 560 + Math.random() * 30); p.setAttribute('r', 1.5 + Math.random() * 3);
      p.setAttribute('fill', Math.random() < .5 ? '#c9c2b4' : '#8a8f99'); g.appendChild(p);
      p.animate([{transform: 'translate(0,0)', opacity: 1}, {transform: `translate(${Math.cos(a) * v + 10}px,${Math.sin(a) * v}px)`, opacity: 0}], {duration: 600 + Math.random() * 400, easing: 'cubic-bezier(.2,.8,.3,1)'}).onfinish = () => p.remove();
    }
  }
  function marrada(){
    if (!aberta || ocupado || marradas >= 3) return;
    ocupado = true; marradas++;
    const c = $('#capa'), svg = c.querySelector('.cCena'), cabra = svg.querySelector('.cCabra');
    cabra.animate([{transform: 'translate(0,0) rotate(0)'}, {transform: 'translate(-16px,3px) rotate(-7deg)', offset: .38}, {transform: 'translate(26px,1px) rotate(6deg)', offset: .62}, {transform: 'translate(0,0) rotate(0)'}], {duration: 460, easing: 'ease-in-out'});
    setTimeout(() => {
      c.querySelectorAll('.capaPontos i')[marradas - 1].classList.add('on');
      svg.querySelector('.r' + marradas).classList.add('on');
      svg.querySelector('.cPenedo').animate([{transform: 'translate(0,0)'}, {transform: 'translate(5px,-2px) rotate(1.5deg)'}, {transform: 'translate(-2px,0)'}, {transform: 'translate(0,0)'}], {duration: 260});
      c.animate([{transform: 'translate(0,0)'}, {transform: 'translate(-6px,4px)'}, {transform: 'translate(5px,-3px)'}, {transform: 'translate(-2px,1px)'}, {transform: 'translate(0,0)'}], {duration: 230});
      po(svg, 10 + marradas * 6);
      vibrar(marradas < 3 ? 25 : [40, 30, 90]);
      Som.marrada && Som.marrada(marradas);
      const dica = $('#capaDica'); if (dica) dica.textContent = marradas === 1 ? 'Mais duas' : marradas === 2 ? 'Só mais uma' : 'Lá vamos nós';
      if (marradas < 3){ ocupado = false; return; }
      // o penedo parte-se e a cabra salta
      svg.querySelector('.cPenedo').style.opacity = 0;
      [['l1', 140, -120, 50], ['l2', 60, -60, -40], ['l3', 120, 40, 80]].forEach(([k, x, y, r]) => { const el = svg.querySelector('.' + k); el.style.opacity = 1; el.animate([{transform: 'translate(0,0) rotate(0)', opacity: 1}, {transform: `translate(${x}px,${y}px) rotate(${r}deg)`, opacity: 0}], {duration: 900, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards'}); });
      po(svg, 30);
      cabra.animate([{transform: 'translate(0,0)'}, {transform: 'translate(40px,-110px) rotate(-8deg)', offset: .5}, {transform: 'translate(130px,-60px) rotate(4deg)'}], {duration: 750, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards'});
      setTimeout(fechar, 560);
    }, 280);
  }
  function fechar(){
    const c = $('#capa'); c.classList.add('sair');
    setTimeout(() => { c.hidden = true; c.innerHTML = ''; aberta = false; Montanha.irTopo(false); }, 650);
  }
  document.addEventListener('pointerdown', e => { if (aberta && e.target.closest('#capa')) marrada(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) escondidoEm = Date.now();
    else if (escondidoEm && Date.now() - escondidoEm > 30 * 60e3 && $('#folha').hidden) abrir();
  });
  return {abrir, aberta: () => aberta};
})();
