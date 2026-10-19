'use strict';
/* Vertente — o que a Cabra Velha diz.
   1) Banco local de falas reativas: cada fala tem uma condição sobre o contexto (estatísticas, dia, hora, estação, tempo, zona)
      e versões por tom. As mais específicas pesam mais. Não se repetem enquanto houver alternativas.
   2) Com IA disponível, a Cabra pede lotes de falas novas escritas para o contexto atual (1 pedido dá ~14 falas),
      com a lista do que já disse para não se repetir. O lote renova-se quando o contexto muda (nova corrida, novo dia). */
const Cabra = (() => {
  const LS = 'vertente.cabra';
  const ler = () => { try { return Object.assign({vistas: [], chaves: [], lote: [], loteChave: ''}, JSON.parse(localStorage.getItem(LS))); } catch(e){ return {vistas: [], chaves: [], lote: [], loteChave: ''}; } };
  const gravar = o => { try { localStorage.setItem(LS, JSON.stringify(o)); } catch(e){} };
  const DIA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const k1 = v => km(v, 1), k0 = v => km(v, 0), r = v => fmtRitmo(v), m = v => metros(v);
  const dif = (a, b) => Math.abs(Math.round(a - b));

  /* Cada entrada: q (quando), p (peso), e as falas por tom: s (suave), p (picante), f (sem filtro). Sem 'f', usa a picante. */
  const B = [
    // ---- parado ----
    {q: c => c.dias === 0 && c.n, p: 2, s: c => `Já correste hoje. Bom trabalho. Agora descansa, que a montanha espera por ti.`, pi: c => `Já correste hoje. Não fiques aí a olhar para a montanha à espera de um aplauso.`, f: c => `Já correste hoje, pronto. Queres uma medalha? Vai beber água e deixa-me em paz.`},
    {q: c => c.dias === 1, p: 1, s: c => `Ontem correste. Hoje descansas ou continuas? Eu voto em continuar, mas tu é que sabes.`, pi: c => `Ontem correste e hoje já te achas atleta. Eu tenho cem anos e subo isto todos os dias.`},
    {q: c => c.dias === 2, p: 2, s: c => `Dois dias sem subir. Ainda é descanso. Ao terceiro começa a ser costume.`, pi: c => `Dois dias sem subir. Ainda é descanso. Ao terceiro passa a ser hábito, e eu conheço os teus hábitos.`},
    {q: c => c.dias >= 3 && c.dias < 7, p: 3, s: c => `${c.dias} dias parado. Os ténis estão com saudades tuas, ${c.nome}.`, pi: c => `${c.dias} dias sem correr. Os teus ténis já estão a pedir asilo político.`, f: c => `${c.dias} dias sem correr, porra. Os ténis já pediram o divórcio.`},
    {q: c => c.dias >= 3 && c.dias < 7, p: 3, pi: c => `Há ${c.dias} dias que a única coisa que sobe aqui é a minha tensão arterial.`, f: c => `Há ${c.dias} dias que a única coisa que sobe aqui é a minha vontade de te dar uma marrada.`},
    {q: c => c.dias >= 4, p: 3, s: c => `${c.dias} dias. Se a preguiça desse altitude, já estavas no topo. Vamos lá trocar isso?`, pi: c => `${c.dias} dias parado. Se a preguiça desse altitude, já estavas na Lua, ${c.nome}.`},
    {q: c => c.dias >= 7, p: 4, s: c => `Uma semana sem correr. Não faz mal, recomeça-se. Mas recomeça-se hoje.`, pi: c => `Uma semana inteira. O musgo desta pedra cresceu mais do que a tua quilometragem.`, f: c => `Uma semana inteira, caralho. Até o musgo cresce mais depressa do que tu corres.`},
    {q: c => c.dias >= 7, p: 4, pi: c => `A tempestade não está no céu, ${c.nome}. Está nesses ${c.dias} dias de sofá.`, f: c => `Esta tempestade de merda é tua. ${c.dias} dias de sofá dão nisto.`},
    {q: c => c.dias >= 10, p: 5, s: c => `${c.dias} dias. Tenho saudades das tuas subidas. A última foi a ${c.ultData}.`, pi: c => `${c.dias} dias. Vou pôr um cartaz: "Procura-se corredor. Visto pela última vez a ${c.ultData}. Responde por ${c.nome}."`},
    {q: c => c.dias >= 14, p: 6, pi: c => `Duas semanas. Os outros acampamentos já te começaram a cobrar renda.`, f: c => `Duas semanas, porra. Já aluguei a tua tenda a um esquilo. Paga melhor e corre mais.`},
    {q: c => c.dias >= 21, p: 6, s: c => `Três semanas é muito tempo, ${c.nome}. Uma corrida curta chega para voltar ao trilho.`, pi: c => `Três semanas. A montanha não se esqueceu de ti. Eu é que já estava a tentar.`},
    // ---- a última corrida ----
    {q: c => c.ult && c.ritmoMedio && c.ult.ritmo < c.ritmoMedio - 10, p: 4, s: c => `${r(c.ult.ritmo)}/km na última, ${dif(c.ritmoMedio, c.ult.ritmo)} s abaixo da tua média. Isso sim, foi bonito.`, pi: c => `${r(c.ult.ritmo)}/km na última, ${dif(c.ritmoMedio, c.ult.ritmo)} s abaixo da tua média. Alguém te perseguia ou foi mesmo vontade?`, f: c => `${r(c.ult.ritmo)}/km, ${dif(c.ritmoMedio, c.ult.ritmo)} s abaixo da média. Caramba. Quem és tu e o que fizeste ao ${c.nome}?`},
    {q: c => c.ult && c.ritmoMedio && c.ult.ritmo > c.ritmoMedio + 15, p: 4, s: c => `A última foi ${dif(c.ult.ritmo, c.ritmoMedio)} s/km mais lenta do que a média. Dias assim acontecem.`, pi: c => `${r(c.ult.ritmo)}/km na última. Mais ${dif(c.ult.ritmo, c.ritmoMedio)} segundos por km do que a tua média. Estavas a correr ou a fazer turismo?`, f: c => `${r(c.ult.ritmo)}/km. Mais ${dif(c.ult.ritmo, c.ritmoMedio)} segundos do que a média. Foste a passear o cão e esqueceste-te do cão?`},
    {q: c => c.ult && c.distMedia && c.ult.dist < c.distMedia * .6, p: 3, s: c => `${k1(c.ult.dist)} km na última. Curtinha, mas conta. A próxima pode ser maior.`, pi: c => `${k1(c.ult.dist)} km na última. Isso não é uma corrida, é ir ao café e voltar.`, f: c => `${k1(c.ult.dist)} km? Isso nem dá para aquecer, porra. Até a ida à casa de banho tem mais distância.`},
    {q: c => c.ult && c.ult.dist >= c.distMaisLonga - .01 && c.n > 2, p: 5, s: c => `${k1(c.ult.dist)} km: a tua corrida mais longa. Estou orgulhosa, mas não contes a ninguém.`, pi: c => `${k1(c.ult.dist)} km, a mais longa de sempre. Não te subas à cabeça: a montanha não tem cume.`},
    {q: c => c.ult && c.ult.esforco >= 9 && c.ritmoMedio && c.ult.ritmo > c.ritmoMedio, p: 5, s: c => `Esforço ${c.ult.esforco} e um ritmo abaixo do habitual. O corpo estava cansado. Ouve-o.`, pi: c => `Esforço ${c.ult.esforco} para ${r(c.ult.ritmo)}/km. Sofreste muito para ires devagar. Isso tem nome: falta de treino.`, f: c => `Esforço ${c.ult.esforco} para ${r(c.ult.ritmo)}/km. Morreste para ir devagar. Isso é falta de treino, caralho.`},
    {q: c => c.ult && c.ult.esforco && c.ult.esforco <= 4 && c.ritmoMedio && c.ult.ritmo < c.ritmoMedio, p: 5, s: c => `Esforço ${c.ult.esforco} e mais rápido do que a média. Estás em forma, ${c.nome}.`, pi: c => `Esforço ${c.ult.esforco} e mesmo assim abaixo da tua média. Ou estás em forma ou mentiste no questionário.`},
    {q: c => c.ult && c.ult.sensacao === 'pesado' && !(c.ult.dores || []).length, p: 3, s: c => `Sentiste-te pesado na última. Acontece. Dorme bem e a próxima sai mais leve.`, pi: c => `Disseste que te sentiste pesado. Eu também, quando vejo os teus números.`},
    {q: c => c.ult && c.ult.sensacao === 'leve', p: 2, s: c => `Sentiste-te leve na última. Guarda essa sensação. É ela que te traz de volta.`, pi: c => `Sentiste-te leve. Aproveita, que essa sensação dura menos do que as tuas promessas de ir correr.`},
    {q: c => c.ult && (c.ult.dores || []).length && c.dias <= 4, p: 8, s: c => `Doía-te ${c.dor}. Descansa, gelo e calma. Não quero heróis, quero-te inteiro.`, pi: c => `Doía-te ${c.dor}. Hoje descansa a sério. Quero-te a subir para a semana, não na fisioterapia.`, f: c => `Doía-te ${c.dor}. Descansa, porra. Herói com tendinite não sobe montanha nenhuma.`},
    {q: c => c.ult && c.ult.sono === 'mau' && c.dias <= 3, p: 3, s: c => `Correste depois de dormir mal. Hoje deita-te mais cedo, que o sono também é treino.`, pi: c => `Correste com sono mau. Valente ou parvo, ainda não decidi. Hoje dorme.`},
    {q: c => c.ult && c.ult.recorde && c.dias <= 5, p: 6, s: c => `Recorde na última (${c.ult.recorde.toLowerCase()}). Merecido. Agora vem o próximo.`, pi: c => `Recorde na última. Goza enquanto dura, que daqui a uma semana vais ter de o bater outra vez.`, f: c => `Recorde, caralho. Pronto, admito. Mas amanhã já não vale nada.`},
    {q: c => c.ult && c.ult.desnivel > 150, p: 3, pi: c => `${m(c.ult.desnivel)} m de desnível na última. Finalmente percebeste que as montanhas são inclinadas.`},
    // ---- semanas e consistência ----
    {q: c => c.kmSemAnt > 0 && c.kmSem > c.kmSemAnt, p: 4, s: c => `${k1(c.kmSem)} km esta semana, mais do que os ${k1(c.kmSemAnt)} da anterior. Está a correr bem.`, pi: c => `${k1(c.kmSem)} km esta semana, mais do que os ${k1(c.kmSemAnt)} da anterior. Não te habitues aos elogios. Isto não foi um.`},
    {q: c => c.kmSemAnt > 0 && c.kmSem < c.kmSemAnt * .5 && c.diaSem >= 4, p: 4, s: c => `Levas ${k1(c.kmSem)} km esta semana e na passada fizeste ${k1(c.kmSemAnt)}. Ainda vais a tempo.`, pi: c => `Levas ${k1(c.kmSem)} km esta semana. Na passada fizeste ${k1(c.kmSemAnt)}. Estás a descer a montanha a pé?`, f: c => `${k1(c.kmSem)} km esta semana contra ${k1(c.kmSemAnt)} na passada. Estás a correr ao contrário, porra?`},
    {q: c => c.n && c.kmSem === 0 && c.diaSem >= 3, p: 4, s: c => `É ${c.diaNome} e ainda não correste esta semana. Uma corridinha resolve.`, pi: c => `É ${c.diaNome} e zero quilómetros esta semana. O calendário não espera por ti.`, f: c => `${c.diaNome[0].toUpperCase() + c.diaNome.slice(1)} e zero quilómetros esta semana. Zero, caralho.`},
    {q: c => c.mediaSem > 0 && c.kmSem > c.mediaSem * 1.4, p: 4, s: c => `${k1(c.kmSem)} km esta semana, bem acima da tua média de ${k1(c.mediaSem)}. Cuidado com o excesso.`, pi: c => `${k1(c.kmSem)} km esta semana, muito acima da média de ${k1(c.mediaSem)}. Calma, ninguém sobe a montanha toda numa semana. Nem eu.`},
    {q: c => c.seq >= 3 && c.seq < 8, p: 4, s: c => `${c.seq} semanas seguidas a correr. Isso é constância. Continua.`, pi: c => `${c.seq} semanas seguidas a correr. Quase pareces um corredor. Quase.`, f: c => `${c.seq} semanas seguidas. Pronto, já não és um bacalhau. És um bacalhau que corre.`},
    {q: c => c.seq >= 8, p: 5, s: c => `${c.seq} semanas seguidas! Já és parte da montanha, ${c.nome}.`, pi: c => `${c.seq} semanas seguidas. Vou ter de arranjar insultos novos, os velhos já não te servem.`},
    {q: c => c.n > 5 && c.c30 <= 2, p: 4, s: c => `${c.c30} ${c.c30 === 1 ? 'corrida' : 'corridas'} em 30 dias. Vamos tentar uma por semana?`, pi: c => `${c.c30} ${c.c30 === 1 ? 'corrida' : 'corridas'} em 30 dias. Eu chamo a isso férias, não treino.`},
    {q: c => c.c30 >= 12, p: 4, pi: c => `${c.c30} corridas em 30 dias. Ou estás obcecado ou fugiste de casa. Em qualquer dos casos, continua.`},
    {q: c => c.tendencia < -5, p: 4, s: c => `A tendência diz que estás ${Math.abs(c.tendencia)} s/km mais rápido. Isto é trabalho teu.`, pi: c => `Na tendência estás ${Math.abs(c.tendencia)} s/km mais rápido. Não é magia, é teimosia. Continua.`},
    {q: c => c.tendencia > 5, p: 4, s: c => `A tendência está ${c.tendencia} s/km mais lenta. Talvez precises de mais descanso, ou de mais regularidade.`, pi: c => `A tendência diz que estás ${c.tendencia} s/km mais lento. Os números não mentem. Tu é que te enganas.`, f: c => `${c.tendencia} s/km mais lento na tendência. Estás a correr com uma mochila de desculpas, porra.`},
    // ---- altitude e zonas ----
    {q: c => c.proxZona && c.proxZona.falta <= 700, p: 6, s: c => `Faltam ${m(c.proxZona.falta)} m para chegares a ${c.proxZona.nome}. Uns ${k1(c.proxZona.falta / 100)} km. Estás quase.`, pi: c => `Faltam ${m(c.proxZona.falta)} m para ${c.proxZona.nome}. ${k1(c.proxZona.falta / 100)} km. Até tu consegues isso numa tarde.`, f: c => `Estás a ${k1(c.proxZona.falta / 100)} km de ${c.proxZona.nome}. Mexe-te, porra, que eu quero ver a vista.`},
    {q: c => c.proxPlaca <= 250 && c.n, p: 4, pi: c => `A próxima placa está a ${m(c.proxPlaca)} m. São ${k1(c.proxPlaca / 100)} km. Vai lá buscá-la.`},
    {q: c => c.zona === 'Floresta', p: 1, s: c => `Ainda estamos na floresta. Bom sítio para começar, mas há tanto lá em cima.`, pi: c => `Ainda estás na floresta. Os esquilos já te reconhecem, e não é pelos bons motivos.`},
    {q: c => c.zona === 'Prado alpino', p: 1, s: c => `Prado alpino. Flores, ar puro e tu a subir. Gosto disto.`, pi: c => `Prado alpino. Flores, vacas e tu a arfar. O cenário é bonito. O desempenho nem tanto.`},
    {q: c => c.zona === 'Rocha', p: 1, pi: c => `Na rocha não há sombra nem desculpas. Só há pedra e tu, que és mais mole.`, f: c => `Rocha. Aqui não há sombra nem desculpas de merda. Só pedra e pernas.`},
    {q: c => c.zona === 'Glaciar', p: 1, pi: c => `Glaciar. Aqui escorrega-se. Tu já escorregas há meses no ritmo, estás em casa.`},
    {q: c => c.zona === 'Acima das nuvens', p: 1, s: c => `Acima das nuvens, ${c.nome}. Olha para baixo e vê quanto já subiste.`, pi: c => `Acima das nuvens. Daqui vês tudo, menos uma razão para parares.`},
    {q: c => c.zona === 'Estratosfera', p: 1, pi: c => `Estratosfera. Falta o ar e mesmo assim tu falas mais do que corres.`},
    {q: c => c.zona === 'Órbita', p: 1, pi: c => `Estás em órbita. A agência espacial pediu-me o teu contacto. Disse-lhes que não atendes durante as corridas, porque não corres.`},
    {q: c => c.kmTotal >= 100, p: 2, s: c => `${k0(c.kmTotal)} km no total. Isso é muito chão, ${c.nome}.`, pi: c => `${k0(c.kmTotal)} km no total. Parece muito até te lembrares de que a montanha não acaba.`},
    {q: c => c.n > 0 && c.n < 3, p: 4, s: c => `${c.n} ${c.n === 1 ? 'corrida' : 'corridas'} até agora. Todas as montanhas começam assim.`, pi: c => `${c.n} ${c.n === 1 ? 'corrida' : 'corridas'}. Isto ainda não é uma montanha, é um monte de terra.`},
    {q: c => !c.n, p: 9, s: c => `Olá, ${c.nome}. A montanha está à tua espera. Toca no + depois da primeira corrida.`, pi: c => `Zero metros. Zero. Até a minha avó cabra tem mais altitude do que tu, ${c.nome}.`, f: c => `Zero metros, caralho. Calça os ténis e vai, que eu não tenho o dia todo.`},
    {q: c => !c.n, p: 9, pi: c => `Instalaste uma app de corrida para quê? Para decorar o telemóvel?`},
    // ---- hora e dia ----
    {q: c => c.hora >= 23 || c.hora < 5, p: 4, s: c => `É tarde, ${c.nome}. Vai dormir. O sono também te leva montanha acima.`, pi: c => `${c.hora === 0 ? 'É meia-noite' : 'São ' + c.hora + 'h'} e estás a olhar para uma montanha no telemóvel. Dorme, que amanhã quero-te a subir.`, f: c => `${c.hora === 0 ? 'Meia-noite' : 'São ' + c.hora + 'h'}, porra. Larga o telemóvel e vai dormir.`},
    {q: c => c.hora >= 5 && c.hora < 9, p: 3, s: c => `Bom dia. Correr de manhã cedo é um bom plano.`, pi: c => `Manhã cedo, a hora perfeita para correr. Não sei porque é que estás a olhar para mim em vez disso.`},
    {q: c => c.hora >= 12 && c.hora < 14, p: 2, pi: c => `Hora de almoço. Uma corrida curta antes de comer e o teu estômago agradece. As tuas pernas não, mas elas nunca agradecem.`},
    {q: c => c.diaSem === 1, p: 3, s: c => `Segunda-feira. Boa altura para começar bem a semana.`, pi: c => `Segunda-feira. O dia em que toda a gente promete começar. Prova que não és toda a gente.`},
    {q: c => c.diaSem === 5, p: 3, pi: c => `Sexta-feira. Corre antes que o fim de semana te convença de que és uma pessoa muito ocupada.`},
    {q: c => c.diaSem === 0 || c.diaSem === 6, p: 3, s: c => `Fim de semana. Bom dia para uma corrida mais longa, sem pressa.`, pi: c => `Fim de semana. Tens tempo, tens pernas. Só te falta a vergonha.`, f: c => `Fim de semana e estás aqui deitado. Tens pernas, tens tempo, só te falta vergonha na cara.`},
    // ---- estação e tempo ----
    {q: c => c.estacao === 'outono', p: 2, s: c => `Outono na montanha. As folhas a cair e tu a subir. Bonito contraste.`, pi: c => `Outono. As folhas caem sozinhas. Tu precisas de mim para te levantares do sofá.`},
    {q: c => c.estacao === 'inverno', p: 2, s: c => `Está frio. Aquece bem antes de sair e vais ver que passa.`, pi: c => `Está frio? Ótimo. Corre mais depressa e aquece.`, f: c => `Está um frio do caraças. Corre mais depressa e cala-te.`},
    {q: c => c.estacao === 'primavera', p: 2, pi: c => `Primavera. Tudo floresce, menos o teu ritmo.`},
    {q: c => c.estacao === 'verao', p: 2, s: c => `Verão. Corre cedo ou ao fim do dia, e leva água.`, pi: c => `Verão. Corre cedo ou tarde, mas corre. O calor não é desculpa, é tempero.`},
    {q: c => c.tempo === 'chuva', p: 3, s: c => `Chove na montanha. Um bom casaco e a chuva até sabe bem.`, pi: c => `Está a chover na montanha. A água não te derrete, ${c.nome}. Não és de açúcar.`},
    {q: c => c.tempo === 'nevoeiro', p: 3, pi: c => `Nevoeiro cerrado. Ninguém te vê a correr devagar. Aproveita.`},
    {q: c => c.tempo === 'neve', p: 3, pi: c => `Neve fresca. As pegadas ficam marcadas. Faz com que valha a pena vê-las.`},
    {q: c => c.noite > .5, p: 1, pi: c => `É de noite na montanha. As fogueiras estão acesas. Pena que a tua vontade não.`},
    // ---- desafio da semana e previsão ----
    {q: c => c.desafio && !c.desafio.feito && c.desafio.dias <= 2 && c.n, p: 7, s: c => `Faltam ${c.desafio.dias + 1} dias para o desafio: ${c.desafio.txt}. Ainda dá.`, pi: c => `${c.desafio.dias ? `Faltam ${c.desafio.dias + 1} dias` : 'É o último dia'} e o desafio está assim: ${c.desafio.txt}. A bandeira não sobe sozinha.`, f: c => `${c.desafio.dias ? `${c.desafio.dias + 1} dias` : 'Último dia'} e o desafio vai em ${c.desafio.txt}. Mexe-te, porra.`},
    {q: c => c.desafio && !c.desafio.feito && c.desafio.frac >= .6, p: 5, s: c => `Estás quase a cumprir o desafio da semana (${c.desafio.txt}). Só mais um empurrão.`, pi: c => `Estás a ${Math.round((1 - c.desafio.frac) * 100)}% da bandeira. Seria uma pena falhar agora, não seria?`},
    {q: c => c.desafio && c.desafio.feito, p: 4, s: c => `Desafio da semana cumprido. A bandeira é tua.`, pi: c => `Cumpriste o desafio da semana. Não esperes que eu faça uma festa. Já fiz uma, por dentro.`, f: c => `Desafio cumprido, caralho. Pronto, estou orgulhosa. Não contes a ninguém.`},
    {q: c => c.desafio && !c.desafio.feito && c.desafio.frac === 0 && c.desafio.dias <= 4, p: 5, pi: c => `A bandeira da semana ainda nem sabe que existes. Desafio: ${c.desafio.curto.toLowerCase()}.`},
    {q: c => c.previsao && c.previsao.dias < 90, p: 3, s: c => `A este ritmo chegas a ${c.previsao.zona} a ${fmtData(c.previsao.data)}. Bonito objetivo.`, pi: c => `A este ritmo chegas a ${c.previsao.zona} a ${fmtData(c.previsao.data)}. Se corresses mais, chegavas antes. Pensa nisso.`},
    {q: c => c.previsao && c.previsao.dias >= 90, p: 3, pi: c => `A este ritmo chegas a ${c.previsao.zona} daqui a ${Math.round(c.previsao.dias / 30)} meses. Eu já vou ter cento e um anos.`},
    // ---- sabedoria de cabra (sempre) ----
    {q: () => true, p: .6, s: c => `Não há cume. Há só a próxima subida. E essa é tua.`, pi: c => `Não há cume. Há só a próxima subida e a tua desculpa seguinte.`},
    {q: () => true, p: .6, s: c => `Tenho cem anos e ainda subo. Tu também consegues.`, pi: c => `Tenho cem anos, uma barbicha e mais fôlego do que tu.`, f: c => `Tenho cem anos, uma barbicha e mais fôlego do que tu, caralho.`},
    {q: () => true, p: .6, pi: c => `Já vi pedras a rolar com mais vontade de chegar a algum lado.`},
    {q: () => true, p: .6, pi: c => `Os humanos inventaram o sofá e depois inventaram apps para se sentirem culpados. E aqui estou eu.`},
    {q: () => true, p: .6, s: c => `Eu como erva e subo montanhas. Tu tens tudo para subir mais do que eu.`, pi: c => `Eu como erva e subo montanhas. Tu comes melhor e sobes menos. Pensa nisso.`},
    {q: () => true, p: .6, s: c => `A montanha não quer saber do teu dia. Só quer que voltes.`, pi: c => `A montanha não quer saber do teu dia. Quer saber dos teus quilómetros.`},
    {q: () => true, p: .6, pi: c => `Provérbio de cabra: quem não corre à chuva, corre ao sol a pedir desculpa.`},
    {q: () => true, p: .6, s: c => `Correr não tem de ser fácil. Tem de ser teu.`, pi: c => `Se correr fosse fácil, chamava-se passear e eu não estava aqui.`},
    {q: () => true, p: .6, pi: c => `A dor passa. A preguiça também, mas demora mais e não dá altitude.`, f: c => `A dor passa. A preguiça também, mas essa merda não dá altitude.`},
    {q: () => true, p: .6, pi: c => `Tu corres, eu insulto. É uma parceria. Só uma das partes está a cumprir.`},
    {q: () => true, p: .6, s: c => `Um quilómetro de cada vez, ${c.nome}. É assim que se sobe tudo.`, pi: c => `Cada quilómetro são cem metros. A matemática é simples. Tu é que complicas.`},
    {q: () => true, p: .6, pi: c => `Não preciso que gostes de mim. Preciso que corras. O resto é contigo e com o teu terapeuta.`},
    {q: () => true, p: .6, f: c => `Corre, porra. É só isso. Não há segredo nenhum.`, pi: c => `O segredo para subir a montanha? Correr. Pronto, já sabes. Não há mais desculpas.`}
  ];

  const tomDe = (e, tom) => tom === 'suave' ? e.s : tom === 'semfiltro' ? (e.f || e.pi) : e.pi;
  function local(c, tom){
    const o = ler();
    const cand = B.map((e, i) => ({e, i})).filter(({e}) => { try { return tomDe(e, tom) && e.q(c); } catch(_){ return false; } });
    if (!cand.length) return '';
    let pool = cand.filter(({i}) => !o.chaves.includes(tom + i));
    if (!pool.length){ o.chaves = o.chaves.filter(k => !cand.some(({i}) => k === tom + i)); pool = cand; }
    const tot = pool.reduce((s, x) => s + x.e.p, 0); let alvo = Math.random() * tot, esc = pool[0];
    for (const x of pool){ alvo -= x.e.p; if (alvo <= 0){ esc = x; break; } }
    o.chaves = [...o.chaves, tom + esc.i].slice(-Math.max(8, Math.floor(cand.length * .7)));
    gravar(o);
    return tomDe(esc.e, tom)(c);
  }

  /* ---------- lotes da IA ---------- */
  let aPedir = null;
  function chaveContexto(c, tom){ return [tom, c.hoje, c.ultId || '-', c.estacao, c.tempo, c.zona, c.desafio && c.desafio.feito ? 'f' : ''].join('|'); }
  function resumo(c){
    const L = [];
    L.push(`Nome: ${c.nome}. Corridas registadas: ${c.n}. Total: ${km(c.kmTotal, 1)} km. Altitude: ${metros(c.alt)} m (zona ${c.zona}).`);
    if (c.proxZona) L.push(`Próxima zona: ${c.proxZona.nome}, a ${metros(c.proxZona.falta)} m (${km(c.proxZona.falta / 100, 1)} km).`);
    if (c.ult) L.push(`Última corrida: ${c.ultData}, ${km(c.ult.dist, 2)} km a ${fmtRitmo(c.ult.ritmo)}/km, esforço ${c.ult.esforco || '?'}/10, sentiu-se ${c.ult.sensacao || '?'}, sono ${c.ult.sono || '?'}, energia ${c.ult.energia || '?'}${c.dor ? `, dores: ${c.dor}` : ''}${c.ult.recorde ? `, recorde: ${c.ult.recorde.toLowerCase()}` : ''}.`);
    if (c.dias !== null) L.push(`Dias desde a última corrida: ${c.dias}.`);
    if (c.ritmoMedio) L.push(`Ritmo médio (últimas 10): ${fmtRitmo(c.ritmoMedio)}/km. Melhor ritmo: ${fmtRitmo(c.ritmoMelhor)}/km. Distância média: ${km(c.distMedia, 1)} km. Mais longa: ${km(c.distMaisLonga, 1)} km.`);
    L.push(`Esta semana: ${km(c.kmSem, 1)} km. Semana passada: ${km(c.kmSemAnt, 1)} km. Média semanal: ${km(c.mediaSem, 1)} km. Semanas seguidas a correr: ${c.seq}. Corridas nos últimos 30 dias: ${c.c30}.`);
    if (c.tendencia) L.push(`Tendência de ritmo: ${Math.abs(c.tendencia)} s/km mais ${c.tendencia < 0 ? 'rápido' : 'lento'}.`);
    if (c.desafio) L.push(`Desafio da semana: ${c.desafio.curto.toLowerCase()}; progresso: ${c.desafio.txt}${c.desafio.feito ? ' (CUMPRIDO)' : `; faltam ${c.desafio.dias + 1} dias`}.`);
    if (c.previsao) L.push(`Previsão: a este ritmo chega a ${c.previsao.zona} a ${c.previsao.data} (faltam ${km(c.previsao.faltaKm, 1)} km).`);
    L.push(`Agora: ${c.diaNome}, ${c.hora}h, ${c.estacao === 'verao' ? 'verão' : c.estacao}, tempo na montanha: ${c.tempo}${c.noite > .5 ? ', de noite' : ''}.`);
    return L.join('\n');
  }
  async function encher(c, tom){
    if (aPedir || typeof IA === 'undefined' || !IA.temIA(cfg.chave) || !navigator.onLine) return;
    const o = ler(), chave = chaveContexto(c, tom);
    if (o.loteChave === chave && o.lote.length >= 4) return;
    const tomTxt = {suave: 'suave: provocas com carinho e humor leve, sem insultos pesados', picante: 'picante: insultos sarcásticos, inteligentes e duros, à portuguesa, sem palavrões', semfiltro: 'sem filtro: linguagem de caserna, com palavrões portugueses (porra, merda, caralho) usados com graça e moderação'}[tom];
    const texto = `És a Cabra Velha: uma cabra montesa com cem anos, rabugenta e com piada, guia de montanha na app de corrida Vertente (cada km corrido = 100 m de altitude numa montanha sem cume).
Escreve 14 falas curtas e diferentes entre si para dizeres ao corredor quando ele abre a app ou te toca. Tom: ${tomTxt}.
Contexto atual:
${resumo(c)}
Regras:
- Português de Portugal (nunca do Brasil). Sem emojis. Cada fala com 8 a 28 palavras.
- Pelo menos 9 das 14 falas reagem a números concretos do contexto (dias parado, ritmo vs média, km da semana vs anterior, semanas seguidas, quanto falta para a próxima zona, hora, dia da semana, estação, tempo). Varia os temas; não faças duas falas sobre o mesmo número.
- As restantes são sabedoria absurda de cabra velha, provérbios inventados de montanha ou comparações inesperadas.
- Insultos inteligentes: ironia, comparações criativas, exagero. O alvo é a preguiça, as desculpas e o ritmo; nunca o corpo, o peso, a aparência ou quem ele é.
- Se houver dores ou sono mau recentes, nessas falas baixa o tom e manda-o cuidar-se.
- Não repitas nem parafraseies estas falas que já disseste: ${JSON.stringify(o.vistas.slice(-30))}
Responde só em JSON: {"falas": ["...", "..."]}`;
    aPedir = IA.pedir({texto, json: true, chave: cfg.chave, modelo: cfg.modelo, temperatura: 1, espera: 45000})
      .then(rsp => {
        let f = [];
        try { f = JSON.parse(rsp.replace(/^```json|```$/g, '').trim()).falas || []; } catch(e){}
        const o2 = ler(), vistas = new Set(o2.vistas.map(s => s.toLowerCase()));
        const novas = f.map(s => String(s).trim().replace(/^"|"$/g, '')).filter(s => s.length > 12 && s.length < 260 && !vistas.has(s.toLowerCase()));
        if (novas.length){ o2.lote = novas; o2.loteChave = chave; gravar(o2); }
      })
      .catch(() => {})
      .finally(() => { aPedir = null; });
  }
  /* A próxima fala: do lote da IA (se for deste contexto), senão do banco local. Renova o lote em segundo plano. */
  function proxima(c, tom){
    const o = ler(), chave = chaveContexto(c, tom);
    let t = '';
    if (o.loteChave === chave && o.lote.length) t = o.lote.shift();
    else t = local(c, tom);
    if (t){ o.vistas = [...o.vistas.filter(v => v !== t), t].slice(-150); }
    // o local() pode ter gravado; voltar a ler para juntar as alterações
    const o2 = ler(); o2.vistas = o.vistas; o2.lote = o.loteChave === chave ? o.lote : o2.lote; gravar(o2);
    if (o2.loteChave !== chave || o2.lote.length < 4) encher(c, tom);
    return t;
  }
  function esquecerLote(){ const o = ler(); o.lote = []; o.loteChave = ''; gravar(o); }
  return {proxima, encher, esquecerLote, resumo, local, total: () => B.length};
})();
