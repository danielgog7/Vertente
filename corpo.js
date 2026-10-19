'use strict';
/* Vertente — mapa de dores (frente e costas, da cintura para baixo). Formas adaptadas do mapa muscular da Forja.
   O lado esquerdo do desenho é desenhado uma vez e espelhado. Na frente, a metade da esquerda é o lado direito da pessoa. */
const Corpo = (() => {
  const rr = (x, y, w, h, r) => `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
  const SIL = 'M100 8C86 8 83 20 84 32C85 42 89 47 92 49L90 54C82 58 70 60 60 64C48 68 41 78 40 92C38 104 34 114 34 126C34 138 37 146 38 152C34 162 32 176 35 190C37 198 39 204 40 208C38 218 40 228 46 230C52 231 55 224 53 214L52 206C55 194 58 178 58 164C59 156 60 152 61 148C64 136 65 122 66 112C67 110 68 109 69 110C67 124 68 140 74 156C77 164 78 172 76 180C70 188 64 204 64 222C64 248 68 276 74 298C74 306 72 312 71 320C68 334 68 350 72 364C75 378 78 388 78 394C74 402 70 410 76 414C82 416 90 416 92 410L90 394C92 380 94 360 92 340C91 326 92 314 93 306C95 296 96 284 96 272C98 248 99 226 99 214L100 212Z';
  const FRENTE = [
    ['quad', 'M67 218C64 238 66 262 70 280C72 290 76 296 79 298C80 280 80 258 78 236C76 224 72 214 67 218Z'],
    ['quad', 'M79 200C76 212 78 236 81 258C82 272 84 284 86 292C90 280 92 262 92 244C92 226 89 210 85 200C83 196 81 196 79 200Z'],
    ['quad', 'M91 258C95 266 97 278 95 290C92 297 88 298 87 295C90 286 92 272 91 258Z'],
    ['joelho', rr(73, 299, 19, 20, 8)],
    ['canela', 'M73 322C70 338 70 356 74 372C76 382 79 388 81 386C82 368 83 350 82 334C80 324 76 318 73 322Z'],
    ['canela', 'M85 324C90 334 92 350 90 366C89 374 88 380 86 384C86 362 86 342 85 324Z'],
    ['pe', 'M72 393C70 401 71 409 77 412C83 414 89 413 91 409L90 394C85 391 77 390 72 393Z']
  ];
  const COSTAS = [
    ['gluteo', 'M72 182C68 188 67 196 69 204C74 198 80 194 88 192C84 186 78 182 72 182Z'],
    ['gluteo', 'M69 206C70 220 76 230 86 234C92 236 97 234 99 232V196C94 192 86 192 80 196C74 198 70 202 69 206Z'],
    ['post', 'M68 238C65 258 67 278 72 294C75 300 79 302 82 300C82 282 82 262 80 244C77 241 72 239 68 238Z'],
    ['post', 'M82 241C86 239 92 239 95 241C97 256 96 274 93 290C90 298 86 300 84 298C85 280 85 260 82 241Z'],
    ['gemeo', 'M72 314C67 328 67 344 70 356C73 364 77 366 80 362C81 348 81 332 79 318C77 312 74 311 72 314Z'],
    ['gemeo', 'M81 316C86 312 91 316 92 326C93 340 91 354 87 364C85 368 82 366 82 362C83 348 83 332 81 316Z'],
    ['aquiles', 'M78 368C77 377 77 386 78 393H89C89 385 89 376 88 368C85 366 81 366 78 368Z']
  ];
  const LOMBAR = 'M92 140C95 152 96 166 95 180C95 186 97 189 99 190V134C96 135 93 137 92 140Z';
  const NOMES = {quad: 'Quadríceps', joelho: 'Joelho', canela: 'Canela', pe: 'Pé/tornozelo', gluteo: 'Glúteo', post: 'Posterior da coxa', gemeo: 'Gémeo', aquiles: 'Tendão de Aquiles', lombar: 'Lombar'};
  const ANTIGOS = {coxaE: 'Coxa esq.', coxaD: 'Coxa dir.', joelhoE: 'Joelho esq.', joelhoD: 'Joelho dir.', gemeoE: 'Gémeo esq.', gemeoD: 'Gémeo dir.', peE: 'Pé/tornozelo esq.', peD: 'Pé/tornozelo dir.', anca: 'Anca'};
  function nome(id){
    if (ANTIGOS[id]) return ANTIGOS[id];
    if (id === 'lombar') return NOMES.lombar;
    const m = id.match(/^(.*)([ED])$/); if (!m || !NOMES[m[1]]) return id;
    return `${NOMES[m[1]]} ${m[2] === 'E' ? 'esq.' : 'dir.'}`;
  }
  function svg(sel = [], {mini = false} = {}){
    const z = (id, d) => `<path class="z${sel.includes(id) ? ' on' : ''}" data-dor="${id}" d="${d}"><title>${nome(id)}</title></path>`;
    const vista = (lista, dx, ladoEsq, titulo, extra) => `<g transform="translate(${dx} 0)">
      <path class="silh" d="${SIL}"/><path class="silh" d="${SIL}" transform="translate(200 0) scale(-1 1)"/>
      ${extra || ''}
      ${lista.map(([id, d]) => z(id + ladoEsq, d)).join('')}
      <g transform="translate(200 0) scale(-1 1)">${lista.map(([id, d]) => z(id + (ladoEsq === 'E' ? 'D' : 'E'), d)).join('')}</g>
      <text x="100" y="432" text-anchor="middle">${titulo}</text></g>`;
    const lombar = `${z('lombar', LOMBAR)}<g transform="translate(200 0) scale(-1 1)">${z('lombar', LOMBAR)}</g>`;
    return `<svg class="corpo${mini ? ' mini' : ''}" viewBox="30 118 380 322" role="img" aria-label="Mapa de dores, frente e costas">
      ${vista(FRENTE, 0, 'D', 'FRENTE')}${vista(COSTAS, 220, 'E', 'COSTAS', lombar)}</svg>`;
  }
  return {svg, nome};
})();
