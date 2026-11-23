/* Сеанс упражнения. Таймеры, анимация и звук живут только на экране сеанса. */
let practiceSession = null;

function practiceButton(label, onClick, cls = 'btn-ghost'){
  const button = h('button', cls);
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

function stopPractice(){
  if(!practiceSession) return;
  practiceSession.abort();
  practiceSession = null;
}

function leavePractice(route){
  if(history.state?.depth > 0 && history.state.cultureRoute?.id === 'screen-practice') history.back();
  else if(route.demo) openWelcome();
  else openPracticeLibrary(route.filter);
}

function openPractice(id, options = {}){
  const item = practiceById(id);
  if(!item) return openTraining();
  const route = { practice:id, filter:options.filter || 'all', demo:Boolean(options.demo), complete:Boolean(options.complete) };
  const controller = new AbortController();
  const stage = $('practice-widget'), main = $('practice-action'), feedback = $('practice-feedback');
  stopPractice();
  go('screen-practice', route);
  practiceSession = controller;
  stage.replaceChildren();
  feedback.textContent = '';
  $('practice-meta').textContent = (item.region ? PRACTICE_REGIONS[item.region] : skillById(item.skill).name) + ' · ' + item.duration;
  $('practice-title').textContent = item.title;
  $('practice-instructions').textContent = item.instruction;
  renderPracticeGuide('practice-guide', practiceGuideFor(item));
  $('practice-back').onclick = $('practice-skip').onclick = () => leavePractice(route);
  $('practice-skip').hidden = route.complete;
  main.hidden = false;
  main.disabled = false;
  const api = {
    stage,
    signal:controller.signal,
    main(label, onClick, disabled = false){
      main.textContent = label;
      main.onclick = onClick;
      main.disabled = disabled;
    },
    say(text){ feedback.textContent = text; },
    after(ms, callback){
      if(controller.signal.aborted) return;
      const stop = () => clearTimeout(handle);
      const handle = setTimeout(() => {
        controller.signal.removeEventListener('abort', stop);
        callback();
      }, ms * TK);
      controller.signal.addEventListener('abort', stop, { once:true });
    },
    complete(){
      if(controller.signal.aborted) return;
      if(route.demo && !loadProfile()) saveDemoResult({ practice:item.id });
      else recordPractice(item);
      const state = history.state;
      history.replaceState({ ...state, cultureRoute:{ id:'screen-practice', ...route, complete:true } }, '');
      showPracticeComplete(route);
    },
  };
  if(route.complete){ showPracticeComplete(route); return; }
  api.main('Готово', api.complete);
  const render = PRACTICE_RENDERERS[id] || PUZZLE_RENDERERS[id];
  if(render) render(item, api);
  else renderGuidedPractice(item, api);
  if(item.block !== 'puzzles' && item.id !== 'color'){
    stage.append(h('p','practice-note','Делай упражнение в безопасном месте. Если появилось головокружение или боль, остановись.'));
  }
}

function showPracticeComplete(route){
  stopPractice();
  $('practice-instructions').textContent = 'Практика завершена.';
  renderPracticeGuide('practice-guide', 'done');
  $('practice-widget').replaceChildren();
  $('practice-feedback').textContent = '';
  $('practice-skip').hidden = true;
  const action = $('practice-action');
  action.textContent = route.demo && !loadProfile() ? 'Создать профиль' : 'К упражнениям';
  action.disabled = false;
  action.onclick = () => route.demo && !loadProfile() ? openProfileCreate() : leavePractice(route);
}

/* Практики в комнате. Подсказки можно проходить в своём темпе. */
const PRACTICE_COLORS = [
  ['Красный','#D32F2F'], ['Оранжевый','#F57C00'], ['Жёлтый','#FBC02D'],
  ['Зелёный','#388E3C'], ['Бирюзовый','#00897B'], ['Голубой','#29B6F6'],
  ['Синий','#1565C0'], ['Фиолетовый','#7B1FA2'], ['Розовый','#EC407A'],
  ['Коричневый','#6D4C41'], ['Серый','#9E9E9E'], ['Бежевый','#D7C3A5'],
];
function colorSequence(){
  const conflicts = { Красный:'Зелёный', Зелёный:'Красный', Серый:'Бежевый', Бежевый:'Серый' };
  const order = [];
  const pool = shuffle(PRACTICE_COLORS);
  while(order.length < 4){
    const excluded = conflicts[order.at(-1)?.[0]];
    order.push(pool.splice(pool.findIndex(([name]) => name !== excluded), 1)[0]);
  }
  return order;
}

function prompts(api, items, { doneLabel = 'Далее', look = false, alternate = null, stepLabel = 'Далее' } = {}){
  const progress = h('div', 'practice-step');
  const card = h('div', 'practice-prompt');
  const alternateButton = alternate && practiceButton('Другое число', () => {
    items[index] = alternate(items[index]);
    paint();
  });
  let index = 0;
  const completeStep = () => {
    if(index === items.length - 1) api.complete();
    else { index++; paint(); }
  };
  api.stage.append(progress, card);
  if(alternateButton) api.stage.append(alternateButton);
  function paint(){
    const current = items[index];
    const [label, color, symbol] = Array.isArray(current) ? current : [current];
    progress.textContent = 'Шаг ' + (index + 1) + ' из ' + items.length;
    card.replaceChildren();
    if(color){
      const swatch = h('span', 'practice-swatch');
      swatch.style.background = color;
      swatch.setAttribute('aria-hidden', 'true');
      card.append(swatch);
    }
    if(symbol) card.append(h('span', 'practice-symbol', esc(symbol)));
    card.append(h('b', '', esc(label)));
    if(look){
      const bar = h('span', 'look-timer');
      bar.setAttribute('aria-hidden', 'true');
      card.append(bar);
      api.main(doneLabel, () => {
        api.say('Рассмотри предмет. Вернись к экрану, когда будешь готов.');
        bar.style.setProperty('--look-duration', 12 * TK + 's');
        bar.classList.add('running');
        api.main(index === items.length - 1 ? 'Готово' : stepLabel, () => { api.say(''); completeStep(); });
      });
    } else api.main(index === items.length - 1 ? 'Готово' : doneLabel, completeStep);
  }
  paint();
}

function renderColor(item, api){
  const mode = h('div', 'practice-inline');
  const panel = h('div', 'color-rounds');
  const modes = [
    ['Обычный', 'Ищи цвет рядом. Можно выполнять сидя.', colorSequence],
    ['Дальний взгляд', 'Посмотри на дальнюю стену или в окно. Ищи предмет примерно в пяти метрах или дальше.', colorSequence],
    ['Оттенки', 'Найди предмет указанного цвета светлее или темнее образца.', () => colorSequence().map(([n,c],i) => [n + (i % 2 ? ' · темнее образца' : ' · светлее образца'),c])],
    ['Тихий режим', 'Название цвета и мягкий таймер.', () => colorSequence().map(([name]) => name)],
    ['Хохлома', 'Золотистый фон, красные и чёрные детали характерны для хохломской росписи.', () => [['Золотистый','#CA941F'], ['Красный','#D32F2F'], ['Чёрный','#272020']]],
  ];
  api.stage.append(h('p', 'practice-note', 'Ищи предметы с места. Во время вождения или на опасном участке пропусти упражнение.'), mode, panel);
  function showMode(choice){
    const [,note,colors] = modes[choice];
    mode.querySelectorAll('button').forEach((button,index) => button.setAttribute('aria-pressed', String(index === choice)));
    panel.replaceChildren(h('p', 'practice-note', esc(note)));
    api.say('');
    prompts({ ...api, stage:panel }, colors(), { doneLabel:'Нашёл', look:true, stepLabel:'Следующий цвет' });
  }
  const buttons = modes.map(([title], choice) => practiceButton(title, () => showMode(choice), 'practice-choice'));
  mode.append(...buttons);
  showMode(0);
}

const GUIDED_PLANS = {
  fist:[['Одной рукой: кулак, ребро, ладонь',40],['Двумя руками одновременно',40],['Двумя руками со смещением на одно движение',40]],
  ring:[['Соединяй большой палец с остальными по очереди и обратно',60],['Две руки: одна идёт от указательного, другая от мизинца',60]],
  'ear-nose':[['Левая рука на носу, правая на противоположном ухе. Меняй по сигналу',30],['Повтори чуть быстрее',30],['Ещё немного быстрее, если удобно',30]],
  lezginka:[['Левый кулак с поднятым большим пальцем, правая ладонь к груди',30],['Меняй руки после каждого сигнала',90]],
  'two-shapes':[['Левой рисуй круг, правой — квадрат',60],['Поменяй руки',60],['Выбери удобный темп и повтори',60]],
  mirror:[['Посмотри на половину узора и ось симметрии',30],['Дорисуй её в отражении. Двигай обе руки от оси в разные стороны',150]],
  'finger-count':[['Считай от 1 до 10, меняя руку на каждом числе',40],['Теперь от 10 до 1',40],['Попробуй считать через число',40]],
  paper:[['Сомни лист одной рукой, расправь другой',60],['Поменяй руки',60],['Повтори в удобном темпе',60]],
  bag:[['Найди на ощупь что-нибудь гладкое',60],['Сравни вес предметов',60],['Найди самый холодный предмет и проверь себя',60]],
  'three-planes':[['Назови три предмета рядом',60],['Назови три предмета на среднем расстоянии',60],['Переведи взгляд вдаль и назови ещё три предмета',60]],
  window:[['Назови предмет и цвет на переднем плане',60],['Назови предмет и цвет на среднем плане',60],['Назови предмет и цвет вдали',60]],
  steppe:[['Смотри вдаль, не фиксируя взгляд на одном предмете',65],['Заметь, что находится слева и справа',60],['Мягко верни взгляд к одной точке',25]],
  'ring-road':[['Найди четыре ориентира: окно, дверь, потолок и пол',60],['Обведи комнату взглядом по часовой стрелке',60],['Обведи её в обратную сторону',60]],
  koresh:[['Убедись, что рядом устойчивая опора. Если есть головокружение или неустойчивость, пропусти упражнение',0],['Придерживаясь за опору, подними одну ногу',20],['Опусти ногу, перенеси вес и повтори с другой',20]],
};

function renderGuidedPractice(item, api){
  const plan = GUIDED_PLANS[item.id];
  if(!plan) return;
  const card = h('div', 'practice-prompt');
  const meter = h('progress', 'practice-meter');
  const phase = h('b');
  const pulse = h('div', 'practice-pulse');
  let idx = 0, run = 0, ticks = 0;
  const needsTempo = ['fist','ear-nose','lezginka'].includes(item.id);
  if(item.id === 'mirror') addMirrorSample(api.stage, false);
  if(item.id === 'two-shapes') api.stage.append(h('div', 'practice-shapes', '<span>○</span><span>□</span>'));
  api.stage.append(card);
  card.append(phase, meter);
  if(needsTempo) card.append(pulse);
  function draw(){
    const [label, duration] = plan[idx];
    const version = ++run;
    phase.textContent = label;
    meter.hidden = !duration;
    meter.max = duration || 1;
    meter.value = 0;
    pulse.textContent = '';
    api.main('Начать этап', () => {
      api.main(idx < plan.length - 1 ? 'Следующий этап' : 'Готово', advance);
      if(!duration) { advance(); return; }
      const start = performance.now();
      const pace = item.id === 'ear-nose' ? [1600,1200,950][idx] : item.id === 'lezginka' ? 1800 : 1000;
      function tick(){
        if(version !== run) return;
        const elapsed = (performance.now() - start) / (1000 * TK);
        meter.value = Math.min(duration, elapsed);
        if(elapsed < duration) api.after(125, tick);
        else {
          run++;
          api.say('Этап завершён.');
        }
      }
      function beat(){
        if(version !== run) return;
        const motions = item.id === 'fist' ? ['Кулак','Ребро','Ладонь'] :
          item.id === 'lezginka' ? ['Левая · кулак','Правая · кулак'] : ['Левая · нос','Правая · нос'];
        pulse.textContent = motions[ticks++ % motions.length];
        sfx.click();
        api.after(pace, beat);
      }
      tick();
      if(needsTempo){ ticks = 0; beat(); }
    });
  }
  function advance(){
    api.say('');
    if(idx === plan.length - 1) api.complete();
    else { idx++; draw(); }
  }
  draw();
}

function addMirrorSample(stage, tulip){
  const line = tulip
    ? '<path d="M72 106Q40 100 36 75Q32 55 21 45Q46 46 57 61Q58 35 72 21M72 98Q53 84 33 95Q47 121 72 120M72 106V137" stroke="#864080"/>'
    : '<path d="M72 25Q25 31 30 60Q33 75 56 78Q31 87 26 118Q44 118 72 128" stroke="#343dd5"/>';
  stage.append(h('div', 'practice-mirror', '<svg viewBox="0 0 144 150" role="img" aria-label="Половина узора и ось симметрии"><path d="M72 8v134" stroke="#9ba4c9" stroke-dasharray="4 4"/><g fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">' + line + '</g></svg>'));
}

function breathingPractice(item, api, bridge = false){
  const circle = h('div', 'breathing-circle');
  const caption = h('b');
  const box = h('div', 'breathing-box');
  box.append(circle, caption);
  api.stage.append(box);
  const goal = bridge ? 6 : 18;
  let cycles = 0;
  api.main('Начать', () => {
    api.main('Готово', api.complete);
    function phase(out){
      const duration = out ? 6000 + (bridge ? cycles * 250 : 0) : 4000;
      caption.textContent = bridge ? (out ? 'Сведи ладони · выдох' : 'Разведи ладони · вдох') : (out ? 'Выдох' : 'Вдох');
      circle.style.transitionDuration = duration * TK + 'ms';
      circle.classList.toggle('expanded', !out);
      api.after(duration, () => {
        if(out && ++cycles >= goal){
          caption.textContent = 'Цикл завершён';
        } else phase(!out);
      });
    }
    phase(false);
  });
}

const PRACTICE_AUDIO = {
  khomus:{ file:'practice-khomus.mp3', source:'Klangdemonstration_einer_jakutischen_Maultrommel_-_der_Khomus_aus_Sibirien.wav', author:'DrTrumpet и Roland Bades' },
  osuokhai:{ file:'practice-osuokhai.mp3', source:'Yakut_Ohuokhai_dance.webm', author:'T., Sergej' },
};
function audioPractice(item, api){
  const track = PRACTICE_AUDIO[item.id];
  const audio = h('audio');
  audio.controls = true;
  audio.preload = 'none';
  audio.src = assetUrl(track.file);
  audio.loop = item.id === 'osuokhai';
  api.signal.addEventListener('abort', () => audio.pause(), { once:true });
  const credit = h('p', 'practice-note', esc(track.author) + ' · <a href="https://commons.wikimedia.org/wiki/File:' +
    track.source + '" target="_blank" rel="noopener">Запись</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a>');
  api.stage.append(audio, credit);
  if(item.id === 'osuokhai'){
    const prompt = h('div', 'practice-prompt');
    api.stage.append(prompt);
    const movements = ['Руки влево','Руки вправо'];
    let index = 0, playing = false;
    function swing(){
      prompt.textContent = movements[index % 2];
      const pace = index < 50 ? 1800 - index * 10 : 1300 + Math.min(index - 50, 60) * 10;
      if(++index <= 110) api.after(pace, swing);
      else { playing = false; audio.pause(); prompt.textContent = 'Заверши движение в удобном темпе'; }
    }
    audio.addEventListener('play', () => { if(!playing && !api.signal.aborted){ playing = true; index = 0; swing(); } });
  }
}

function clapPractice(item, api){
  const patterns = [[1,0,1,0],[1,1,0,1],[1,0,1,1,0,1]];
  const board = h('div', 'clap-pattern');
  api.stage.append(board);
  let round = 0, playId = 0;
  function draw(){
    playId++;
    const dots = patterns[round].map((v,i) => h('span', v ? 'beat' : 'rest', v ? '●' : '·'));
    board.replaceChildren(...dots);
    board.setAttribute('aria-label', patterns[round].map(v => v ? 'хлопок' : 'пауза').join(', '));
    api.main(round === 2 ? 'Готово' : 'Следующий ритм', () => {
      if(round === 2) api.complete();
      else { round++; draw(); }
    });
  }
  api.stage.append(practiceButton('Проиграть ритм', () => {
    const version = ++playId;
    patterns[round].forEach((beat,i) => api.after(i * 525, () => {
      if(version !== playId) return;
      [...board.children].forEach((dot,index) => dot.classList.toggle('picked', index === i));
      if(beat) sfx.click();
    }));
  }));
  draw();
}

function runePractice(item, api){
  const text = h('div', 'rune-lines');
  api.stage.append(text);
  prompts({ ...api, stage:text }, [
    'За ле́сом река́, за реко́ю тропа́.',
    'Све́тит над о́зером ме́сяц.',
    'Ти́хо кача́ется ве́тка.',
  ], { doneLabel:'Следующая строка' });
  api.stage.append(h('p', 'practice-note', 'Учебные строки для ритма речи. Хлопай на отмеченных ударениях.'));
}

function renderGoatScissors(item, api){
  const demo = h('figure', 'gesture-figure');
  demo.innerHTML = '<img width="540" height="288" alt=""><figcaption><span>Левая рука</span><span>Правая рука</span></figcaption>';
  const img = demo.querySelector('img');
  const controls = h('div', 'practice-inline gesture-controls');
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Показ жестов');
  const modes = [
    ['Анимация', 'goat-scissors.gif', 'Руки одновременно обмениваются жестами «Коза» и «Ножницы».'],
    ['Первая поза', 'goat-scissors-first.png', 'Левая рука показывает «козу», правая — «ножницы».'],
    ['Вторая поза', 'goat-scissors-second.png', 'Левая рука показывает «ножницы», правая — «козу».'],
  ];
  const buttons = modes.map(([label], index) => practiceButton(label, () => show(index), 'practice-choice'));
  function show(index){
    const [,file,description] = modes[index];
    img.src = assetUrl(file);
    img.alt = description;
    buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
  }
  controls.append(...buttons);
  api.stage.append(demo, controls, h('dl', 'gesture-instructions',
    '<div><dt>Коза</dt><dd>Выпрями указательный и мизинец. Средний и безымянный прижми большим.</dd></div>' +
    '<div><dt>Ножницы</dt><dd>Разведи указательный и средний буквой V. Остальные прижми большим.</dd></div>'));
  show(matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 0);
}

const PRACTICE_RENDERERS = {
  'goat-scissors':renderGoatScissors,
  color:renderColor,
  shape:(item, api) => prompts(api, shuffle([['Круг',null,'○'], ['Квадрат',null,'□'], ['Треугольник',null,'△']]), { doneLabel:'Нашёл' }),
  letter:(item, api) => prompts(api, shuffle([...'АВЕКМНОРСТ']).slice(0,3), { doneLabel:'Нашёл' }),
  number:(item, api) => prompts(api, shuffle(['2','3','5','6','8','10','12']).slice(0,3), { doneLabel:'Нашёл', alternate:n => String(Number(n) % 12 + 1) }),
  'three-sounds':(item, api) => {
    prompts(api, ['Далёкий звук','Близкий звук','Самый тихий звук'], { doneLabel:'Услышал' });
    const select = h('select', 'practice-select', '<option value="">Что было легче услышать?</option><option>Далёкий звук</option><option>Близкий звук</option><option>Самый тихий звук</option>');
    select.setAttribute('aria-label', 'Что было легче услышать?');
    api.stage.append(select);
  },
  touch:(item, api) => prompts(api, shuffle(['Гладкое','Шершавое','Тёплое','Мягкое']).slice(0,3), { doneLabel:'Нашёл', look:true }),
  breathing:breathingPractice,
  category:(item, api) => prompts(api, ['Круглое','Синее','Деревянное','Блестящее'], { doneLabel:'Нашёл три предмета' }),
  clap:clapPractice,
  khomus:audioPractice,
  osuokhai:audioPractice,
  rune:runePractice,
  tulip:(item, api) => { addMirrorSample(api.stage, true); prompts(api, ['Посмотри на половину тюльпана', 'Дострой зеркальную половину двумя руками одновременно']); },
  khokhloma:(item, api) => prompts(api, [['Золотистый','#CA941F'],['Красный','#D32F2F'],['Чёрный','#272020'],'Нарисуй пальцем завиток-кудрину'], { doneLabel:'Далее' }),
  bridge:(item, api) => breathingPractice(item, api, true),
};
