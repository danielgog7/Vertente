'use strict';
/* Vertente — metas: desafio da semana (a bandeira na encosta), marcos permanentes e previsão de chegada às zonas.
   Tudo é calculado a partir das corridas; só fica guardado o desafio de cada semana e a data em que cada marco foi ganho. */
const Metas = (() => {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const daSemana = (l, sem) => l.filter(c => segunda(c.data) === sem);
  const r05 = v => Math.round(v * 2) / 2;

  /* ---------- desafio da semana ---------- */
  const TIPOS = {
    corridas: {
      alvo: h => clamp(Math.round(h.porSemana) + (h.porSemana >= 2 ? 1 : 0), 2, 5),
      prog: (rs, a) => ({v: rs.length, frac: rs.length / a, feito: rs.length >= a, txt: `${Math.min(rs.length, a)}/${a} corridas`}),
      curto: a => `${a} CORRIDAS`,
      texto: {suave: a => `${a} corridas esta semana. Uma de cada vez, sem pressa.`, picante: a => `${a} corridas até domingo. Contei os dias: tens sete. Não há desculpa.`, semfiltro: a => `${a} corridas até domingo, porra. Sete dias chegam e sobram.`}
    },
    km: {
      alvo: h => clamp(r05(Math.max(6, h.mediaSem * 1.1)), 6, h.mediaSem ? h.mediaSem + 10 : 15),
      prog: (rs, a) => { const k = rs.reduce((s, c) => s + c.dist, 0); return {v: k, frac: k / a, feito: k >= a, txt: `${km(Math.min(k, a))} / ${km(a)} km`}; },
      curto: a => `${km(a)} KM`,
      texto: {suave: a => `${km(a)} km esta semana. Um pouco mais do que o costume, nada de loucuras.`, picante: a => `Esta semana quero ${km(a)} km. Nem mais um pedido, nem menos um metro.`, semfiltro: a => `${km(a)} km esta semana. É isso ou vais ouvir-me, caralho.`}
    },
    longa: {
      alvo: h => clamp(Math.round(Math.max(5, h.longa28 + 1)), 5, Math.max(6, Math.round(h.longaMax * 1.15))),
      prog: (rs, a) => { const k = Math.max(0, ...rs.map(c => c.dist)); return {v: k, frac: k / a, feito: k >= a, txt: k ? `Melhor: ${km(k)} / ${km(a, 0)} km` : `0 / ${km(a, 0)} km`}; },
      curto: a => `UMA DE ${km(a, 0)} KM`,
      texto: {suave: a => `Uma corrida de ${km(a, 0)} km ou mais, ao teu ritmo.`, picante: a => `Uma corrida de ${km(a, 0)} km esta semana. As curtas já não me impressionam.`, semfiltro: a => `Uma de ${km(a, 0)} km. Chega de voltinhas ao quarteirão, porra.`}
    },
    ritmo: {
      alvo: h => Math.round(h.ritmoMedio - 5),
      prog: (rs, a) => { const ok = rs.filter(c => c.dist >= 3 && ritmo(c)); const b = ok.length ? Math.min(...ok.map(ritmo)) : 0; return {v: b, frac: !b ? 0 : b <= a ? 1 : clamp(1 - (b - a) / 40, .1, .9), feito: !!b && b <= a, txt: b ? `Melhor: ${fmtRitmo(b)} / alvo ${fmtRitmo(a)}` : `Alvo ${fmtRitmo(a)}/km`}; },
      curto: a => `ABAIXO DE ${fmtRitmo(a)}`,
      texto: {suave: a => `Uma corrida de 3 km ou mais abaixo de ${fmtRitmo(a)}/km. Só um bocadinho mais rápido.`, picante: a => `Uma corrida de 3 km ou mais abaixo de ${fmtRitmo(a)}/km. Quero ver se essas pernas sabem acelerar.`, semfiltro: a => `3 km ou mais abaixo de ${fmtRitmo(a)}/km. Acelera, caralho, que eu não sou nenhuma lesma.`}
    },
    regresso: {
      alvo: () => 3,
      prog: (rs, a) => { const k = Math.max(0, ...rs.map(c => c.dist)); return {v: k, frac: k / a, feito: k >= a, txt: `${km(Math.min(k, a))} / ${a} km`}; },
      curto: () => 'VOLTA A SUBIR',
      texto: {suave: () => `Só uma corrida de 3 km. Para voltares ao trilho.`, picante: () => `Uma corrida de 3 km. Só isso. Até eu tenho pena de ti.`, semfiltro: () => `3 km. Uma corrida de merda de 3 km. Consegues isso, não consegues?`}
    }
  };
  function historico(l, sem){
    const antes = l.filter(c => c.data < sem), d28 = dataObj(sem); d28.setDate(d28.getDate() - 28);
    const ult4 = antes.filter(c => c.data >= isoDe(d28));
    const semanas = {}; antes.forEach(c => { const s = segunda(c.data); semanas[s] = (semanas[s] || 0) + c.dist; });
    const vs = Object.keys(semanas).sort().slice(-8).map(k => semanas[k]);
    const comR = antes.slice(-10).filter(c => ritmo(c));
    const ultima = antes[antes.length - 1];
    return {n: antes.length, porSemana: ult4.length / 4, mediaSem: vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : 0,
      longa28: Math.max(0, ...ult4.map(c => c.dist)), longaMax: Math.max(0, ...antes.map(c => c.dist)),
      ritmoMedio: comR.length ? comR.reduce((s, c) => s + ritmo(c), 0) / comR.length : 0, parado: ultima ? diasEntre(ultima.data, sem) : 0,
      alt0: antes.reduce((s, c) => s + c.dist, 0) * ALT_POR_KM};
  }
  function garantir(l){
    dados.desafios = dados.desafios || [];
    const sem = segunda(hojeISO());
    let d = dados.desafios.find(x => x.semana === sem);
    if (d) return d;
    const h = historico(l, sem), ant = dados.desafios[dados.desafios.length - 1];
    let tipos;
    if (h.n < 3) tipos = ['corridas'];
    else if (h.parado >= 10) tipos = ['regresso'];
    else { tipos = ['corridas', 'km', 'longa']; if (h.ritmoMedio && h.n >= 5) tipos.push('ritmo'); }
    if (tipos.length > 1 && ant) tipos = tipos.filter(t => t !== ant.tipo);
    const semN = Math.floor(dataObj(sem) / 6048e5), tipo = tipos[semN % tipos.length];
    d = {semana: sem, tipo, alvo: TIPOS[tipo].alvo(h), alt0: h.alt0, altEsperada: h.alt0 + Math.max(6, h.mediaSem || 8) * ALT_POR_KM, feito: false, feitoEm: ''};
    if (tipo === 'km') d.altEsperada = h.alt0 + d.alvo * ALT_POR_KM;
    dados.desafios.push(d); dados.desafios = dados.desafios.slice(-60); guardarDados();
    return d;
  }
  function estado(l){
    const d = garantir(l), T = TIPOS[d.tipo], rs = daSemana(l, d.semana), p = T.prog(rs, d.alvo);
    const fim = dataObj(d.semana); fim.setDate(fim.getDate() + 6);
    return Object.assign({}, d, p, {frac: clamp(p.frac, 0, 1), curto: T.curto(d.alvo), texto: T.texto[cfg.tom] ? T.texto[cfg.tom](d.alvo) : T.texto.picante(d.alvo), diasRestantes: diasEntre(hojeISO(), isoDe(fim))});
  }
  // Depois de guardar ou apagar corridas: devolve true se o desafio acabou de ser cumprido.
  function verificar(l){
    const e = estado(l), d = dados.desafios.find(x => x.semana === e.semana);
    if (e.feito && !d.feito){ d.feito = true; d.feitoEm = hojeISO(); guardarDados(); return e; }
    if (!e.feito && d.feito){ d.feito = false; d.feitoEm = ''; guardarDados(); }
    return null;
  }
  const cumpridos = () => (dados.desafios || []).filter(d => d.feito).length;

  /* ---------- marcos permanentes ---------- */
  const noiteDe = c => c.hora && (+c.hora.slice(0, 2) >= 21 || +c.hora.slice(0, 2) < 5);
  const cedoDe = c => c.hora && +c.hora.slice(0, 2) >= 5 && +c.hora.slice(0, 2) < 7;
  const estDe = iso => { const d = dataObj(iso), v = (d.getMonth() + 1) * 100 + d.getDate(); return v >= 320 && v < 621 ? 'primavera' : v >= 621 && v < 923 ? 'verao' : v >= 923 && v < 1221 ? 'outono' : 'inverno'; };
  const primeiro = (l, f) => { const c = l.find(f); return c ? c.data : ''; };
  const acumulado = (l, k) => { let s = 0; for (const c of l){ s += c.dist; if (s >= k) return c.data; } return ''; };
  const MARCOS = [
    {id: 'primeira', nome: 'Primeiro passo', dica: 'Regista a primeira corrida', ic: 'corridas', quando: l => l[0] ? l[0].data : ''},
    {id: 'dez', nome: 'Dois dígitos', dica: 'Uma corrida de 10 km', ic: 'dist', quando: l => primeiro(l, c => c.dist >= 10)},
    {id: 'meia', nome: 'Meia maratona', dica: 'Uma corrida de 21,1 km', ic: 'trofeu', quando: l => primeiro(l, c => c.dist >= 21.09)},
    {id: 'sub5', nome: 'Abaixo dos 5', dica: '3 km ou mais abaixo de 5:00/km', ic: 'raio', quando: l => primeiro(l, c => c.dist >= 3 && ritmo(c) && ritmo(c) < 300)},
    {id: 'tot50', nome: '50 km', dica: '50 km acumulados', ic: 'alt', quando: l => acumulado(l, 50)},
    {id: 'tot100', nome: '100 km', dica: '100 km acumulados', ic: 'alt', quando: l => acumulado(l, 100)},
    {id: 'tot250', nome: '250 km', dica: '250 km acumulados', ic: 'alt', quando: l => acumulado(l, 250)},
    {id: 'tot500', nome: '500 km', dica: '500 km acumulados', ic: 'alt', quando: l => acumulado(l, 500)},
    {id: 'tot1000', nome: '1000 km', dica: '1000 km acumulados', ic: 'alt', quando: l => acumulado(l, 1000)},
    ...['Prado alpino', 'Rocha', 'Glaciar', 'Acima das nuvens', 'Estratosfera', 'Órbita'].map(n => ({id: 'z_' + n, nome: n, dica: `Chega a ${n}`, ic: 'desnivel', zona: n,
      quando: l => { const z = Montanha.ZONAS.find(z => z.nome === n); const c = l.find(c => c.alt1 >= z.alt); return c ? c.data : ''; }})),
    {id: 'chuva', nome: 'Não sou de açúcar', dica: 'Corre num dia de chuva na montanha', ic: 'cal', quando: l => primeiro(l, c => Montanha.tempoDia(c.data) === 'chuva')},
    {id: 'neve', nome: 'Pegadas na neve', dica: 'Corre num dia de neve na montanha', ic: 'cal', quando: l => primeiro(l, c => Montanha.tempoDia(c.data) === 'neve')},
    {id: 'coruja', nome: 'Coruja', dica: 'Uma corrida depois das 21h', ic: 'sonoOk', quando: l => primeiro(l, noiteDe)},
    {id: 'galo', nome: 'Madrugador', dica: 'Uma corrida antes das 7h', ic: 'sonoBom', quando: l => primeiro(l, cedoDe)},
    {id: 'estacoes', nome: 'Quatro estações', dica: 'Corre na primavera, no verão, no outono e no inverno', ic: 'semana', quando: l => { const vistas = new Set(); for (const c of l){ vistas.add(estDe(c.data)); if (vistas.size === 4) return c.data; } return ''; }},
    {id: 'seq4', nome: 'Um mês sem falhar', dica: '4 semanas seguidas com corridas', ic: 'semana', quando: l => semanasMax(l) >= 4 ? semanasMaxData : ''},
    {id: 'seq12', nome: 'Teimosia', dica: '12 semanas seguidas com corridas', ic: 'semana', quando: l => semanasMax(l) >= 12 ? semanasMaxData : ''},
    {id: 'dupla', nome: 'Dia sim, dia sim', dica: 'Corre dois dias seguidos', ic: 'ritmo', quando: l => { for (let i = 1; i < l.length; i++) if (diasEntre(l[i - 1].data, l[i].data) === 1) return l[i].data; return ''; }},
    {id: 'regresso', nome: 'O regresso', dica: 'Volta a correr depois de 14 dias parado', ic: 'sobe', quando: l => primeiro(l, c => c.pausa >= 14)},
    {id: 'desafio1', nome: 'Palavra de cabra', dica: 'Cumpre um desafio da semana', ic: 'trofeu', quando: () => { const d = (dados.desafios || []).find(d => d.feito); return d ? d.feitoEm : ''; }},
    {id: 'desafio10', nome: 'Dez bandeiras', dica: 'Cumpre 10 desafios da semana', ic: 'trofeu', quando: () => { const f = (dados.desafios || []).filter(d => d.feito); return f.length >= 10 ? f[9].feitoEm : ''; }}
  ];
  let semanasMaxData = '';
  function semanasMax(l){ // maior sequência de semanas seguidas com corridas e a data em que chegou ao 4.º/12.º... (fica a da última corrida da sequência)
    const sems = [...new Set(l.map(c => segunda(c.data)))].sort(); let best = 0, run = 0, prev = null;
    for (const s of sems){ run = prev && diasEntre(prev, s) === 7 ? run + 1 : 1; prev = s; if (run > best){ best = run; const ult = l.filter(c => segunda(c.data) === s).pop(); semanasMaxData = ult ? ult.data : s; } }
    return best;
  }
  function marcos(l){
    dados.marcos = dados.marcos || {};
    return MARCOS.map(m => { const q = m.quando(l); return Object.assign({}, m, {data: q || '', tem: !!q}); });
  }
  // Marcos que ficaram desbloqueados desde a última vez que se viu (para celebrar)
  function novosMarcos(l){
    dados.marcos = dados.marcos || {};
    const novos = marcos(l).filter(m => m.tem && !dados.marcos[m.id]);
    novos.forEach(m => dados.marcos[m.id] = m.data);
    if (novos.length) guardarDados();
    return novos;
  }
  function inicializarMarcos(l){ // primeira vez: marca os já ganhos sem festa
    if (dados.marcos) return; dados.marcos = {}; marcos(l).filter(m => m.tem).forEach(m => dados.marcos[m.id] = m.data); guardarDados();
  }

  /* ---------- previsão ---------- */
  function previsao(l){
    if (l.length < 2) return null;
    const topo = l[l.length - 1].alt1, prox = Montanha.ZONAS.find(z => z.alt > topo); if (!prox) return null;
    const d28 = new Date(); d28.setDate(d28.getDate() - 28);
    let kmDia = l.filter(c => c.data > isoDe(d28)).reduce((s, c) => s + c.dist, 0) / 28;
    if (kmDia < .05){ const dias = Math.max(14, diasEntre(l[0].data, hojeISO())); kmDia = l.reduce((s, c) => s + c.dist, 0) / dias; }
    if (kmDia <= 0) return null;
    const faltaKm = (prox.alt - topo) / ALT_POR_KM, dias = Math.ceil(faltaKm / kmDia), dt = new Date(); dt.setDate(dt.getDate() + dias);
    return {zona: prox.nome, faltaKm, dias, data: isoDe(dt), kmSemana: kmDia * 7};
  }
  return {estado, verificar, cumpridos, marcos, novosMarcos, inicializarMarcos, previsao, TIPOS};
})();
