'use strict';
/* Vertente — sons de ambiente, sintetizados no próprio navegador (sem ficheiros):
   vento (mais forte em altitude, desaparece no vácuo da órbita), chuva, fogueira a crepitar perto do topo,
   pássaros de dia nas zonas baixas, grilos nas noites quentes e trovões nas tempestades. Desligado por omissão. */
const Som = (() => {
  let ac = null, mestre = null, ligado = false, volume = .6, foco = 1, timers = [], niveis = {vento: 0, chuva: 0, fogo: 0, aves: 0, grilos: 0};
  const G = {};
  function ruido(){
    const b = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = b.getChannelData(0);
    let ult = 0; for (let i = 0; i < d.length; i++){ const w = Math.random() * 2 - 1; ult = (ult + .02 * w) / 1.02; d[i] = w * .6 + ult * 3; }
    const s = ac.createBufferSource(); s.buffer = b; s.loop = true; s.start(); return s;
  }
  function ganho(v = 0){ const g = ac.createGain(); g.gain.value = v; return g; }
  function criar(){
    ac = new (window.AudioContext || window.webkitAudioContext)();
    mestre = ganho(volume * foco); mestre.connect(ac.destination);
    // vento: ruído num passa-banda que oscila
    const v = ruido(), bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 450; bp.Q.value = .8;
    G.vento = ganho(); v.connect(bp).connect(G.vento).connect(mestre); G.ventoFiltro = bp;
    // chuva: ruído claro
    const c = ruido(), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1600; const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 350;
    G.chuva = ganho(); c.connect(lp).connect(hp).connect(G.chuva).connect(mestre);
    // fogueira: base grave + estalidos
    const f = ruido(), lf = ac.createBiquadFilter(); lf.type = 'lowpass'; lf.frequency.value = 280;
    G.fogo = ganho(); f.connect(lf).connect(G.fogo).connect(mestre);
    const e = ruido(), he = ac.createBiquadFilter(); he.type = 'highpass'; he.frequency.value = 1800;
    G.estalo = ganho(); e.connect(he).connect(G.estalo).connect(mestre);
    // grilos: oscilador agudo, ligado e desligado em rajadas
    const o = ac.createOscillator(); o.type = 'square'; o.frequency.value = 4300; const og = ganho(); const ob = ac.createBiquadFilter(); ob.type = 'bandpass'; ob.frequency.value = 4300; ob.Q.value = 6;
    o.connect(ob).connect(og); G.grilos = ganho(); og.connect(G.grilos).connect(mestre); G.griloPulso = og; o.start();
    timers.push(setInterval(estalos, 90), setInterval(cantoAve, 1300), setInterval(rajadaGrilo, 700), setInterval(oscilarVento, 2000));
  }
  const alvo = (g, v, tc = .9) => { if (g) g.gain.setTargetAtTime(v, ac.currentTime, tc); };
  function estalos(){
    if (!ac || niveis.fogo < .02 || Math.random() > .55) return;
    const t = ac.currentTime + Math.random() * .08, a = niveis.fogo * (.2 + Math.random() * .5);
    G.estalo.gain.cancelScheduledValues(t); G.estalo.gain.setValueAtTime(a, t); G.estalo.gain.exponentialRampToValueAtTime(.0001, t + .03 + Math.random() * .05);
  }
  function cantoAve(){
    if (!ac || niveis.aves < .02 || Math.random() > .45) return;
    const t0 = ac.currentTime + Math.random() * .4, notas = 2 + (Math.random() * 4 | 0), base = 2300 + Math.random() * 1600;
    for (let i = 0; i < notas; i++){
      const o = ac.createOscillator(), g = ganho(0), t = t0 + i * (.09 + Math.random() * .05);
      o.type = 'sine'; o.frequency.setValueAtTime(base * (1 + Math.random() * .2), t); o.frequency.exponentialRampToValueAtTime(base * (1.25 + Math.random() * .4), t + .07);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05 * niveis.aves, t + .015); g.gain.exponentialRampToValueAtTime(.0001, t + .09);
      o.connect(g).connect(mestre); o.start(t); o.stop(t + .12);
    }
  }
  function rajadaGrilo(){
    if (!ac || niveis.grilos < .02) return;
    const t = ac.currentTime;
    for (let i = 0; i < 3; i++){ const a = t + i * .06; G.griloPulso.gain.setValueAtTime(.5, a); G.griloPulso.gain.setValueAtTime(0, a + .03); }
  }
  function oscilarVento(){ if (ac && G.ventoFiltro) G.ventoFiltro.frequency.setTargetAtTime(320 + Math.random() * 500, ac.currentTime, 1.4); }
  function trovao(){
    if (!ac || !ligado) return;
    const t = ac.currentTime + .4 + Math.random() * 1.4, s = ruido(), lp = ac.createBiquadFilter(), g = ganho(0);
    lp.type = 'lowpass'; lp.frequency.value = 160;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.9, t + .08); g.gain.exponentialRampToValueAtTime(.001, t + 3.2);
    s.connect(lp).connect(g).connect(mestre); setTimeout(() => { try { s.stop(); } catch(e){} }, 4500 + (t - ac.currentTime) * 1000);
  }
  // amb = {cam, topo, zona, tempo, estacao, noite, tempestade}
  function atualizar(amb){
    if (!ligado || !ac) return;
    const alt = Math.max(0, amb.cam), espaco = Math.max(0, Math.min(1, (alt - 12000) / 5000));
    const chove = amb.tempestade || (amb.tempo === 'chuva' && alt < 5000);
    niveis.vento = (.05 + .3 * Math.min(1, alt / 7000) + (amb.zona === 'Rocha' || amb.zona === 'Glaciar' ? .15 : 0) + (amb.tempestade ? .25 : 0)) * (1 - espaco);
    niveis.chuva = chove ? (amb.tempestade ? .5 : .32) : 0;
    niveis.fogo = Math.abs(amb.cam - amb.topo) < 450 && amb.topo > 0 ? (.25 + .3 * amb.noite) : 0;
    niveis.aves = amb.noite < .4 && alt < 3200 && !chove ? .7 : 0;
    niveis.grilos = amb.noite > .55 && alt < 3000 && !chove && (amb.estacao === 'verao' || amb.estacao === 'primavera' || amb.estacao === 'outono') ? .05 : 0;
    alvo(G.vento, niveis.vento * .5); alvo(G.chuva, niveis.chuva * .55); alvo(G.fogo, niveis.fogo * .5); alvo(G.grilos, niveis.grilos);
  }
  function ligar(sim){
    ligado = sim;
    if (sim){ if (!ac) criar(); ac.resume && ac.resume(); }
    else if (ac){ Object.keys(niveis).forEach(k => niveis[k] = 0); ['vento', 'chuva', 'fogo', 'grilos'].forEach(k => alvo(G[k], 0, .3)); setTimeout(() => !ligado && ac && ac.suspend(), 900); }
  }
  function definirVolume(v){ volume = v; if (mestre) mestre.gain.setTargetAtTime(volume * foco, ac.currentTime, .2); }
  function focar(f){ foco = f; if (mestre) mestre.gain.setTargetAtTime(volume * foco, ac.currentTime, .4); }
  document.addEventListener('visibilitychange', () => { if (!ac) return; document.hidden ? ac.suspend() : (ligado && ac.resume()); });
  document.addEventListener('pointerdown', () => { if (ligado && ac && ac.state === 'suspended' && !document.hidden) ac.resume(); }, {passive: true});
  return {ligar, atualizar, trovao, definirVolume, focar, ligado: () => ligado};
})();
