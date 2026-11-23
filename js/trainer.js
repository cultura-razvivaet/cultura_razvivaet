/* =================================================================
   Культура развивает — движок упражнений (ТЗ, экран 5).

   Последовательность: категория → случайное задание из банка
   (js/content/bank.js) с учётом доступного уровня → карточка с
   названием, описанием и инструкцией → «Начать» → условие и
   интерактивная область → «Проверить ответ» / «Завершить» →
   экран результата (статус, ошибки, время, комментарий помощника,
   рекомендации) → «Следующее задание» / «Вернуться к упражнениям».

   Тип упражнения — файл в js/tasks/: registerKind(kind, { render }).
   render(task, ctx), где ctx:
     ctx.stage            контейнер интерактивной области
     ctx.setCheck(fn)     обработчик «Проверить ответ»; fn() возвращает
                          результат (см. ниже), { retry:true, msg } — ещё раз
                          или null — ответ не введён
     ctx.enableCheck(b)   включить/выключить кнопку
     ctx.hideCheck()      упражнение завершает себя само: ctx.finish(res)
     ctx.addButton(txt, fn, cls)  дополнительная кнопка (Подсказка, Заново…)
     ctx.hint(text)       показать подсказку (считается в результате)
     ctx.mistake(n)       засчитать ошибку
     ctx.setProgress(0..1)
     ctx.timer(sec, cb)   обратный отсчёт в шапке (cb по окончании)
   Результат: { ok, score?, correct?, total?, errors?, good:[], improve:[],
                recs:[], model? }
   ================================================================= */

const KINDS = {};
function registerKind(kind, def){ KINDS[kind] = def; }

function h(tag, cls, html){
  const el = document.createElement(tag);
  if(cls) el.className = cls;
  if(html !== undefined) el.innerHTML = html;
  return el;
}
function pad2(n){ return String(n).padStart(2, '0'); }
function fmtTime(sec){ sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + pad2(sec % 60); }
function norm(s){
  return String(s).toLowerCase().replace(/ё/g, 'е').replace(/[\s.,!?;:«»"'()\-—–]/g, '');
}
function shakeEl(el){
  el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
  setTimeout(()=> el.classList.remove('shake'), 350);
}
const FAST = /[?&]fast=1/.test(location.search);       // ?fast=1 — ускоренные таймеры (для проверки)
const TK = FAST ? 0.05 : 1;                              // коэффициент времени

const LEVELS = ['Базовый', 'Средний', 'Продвинутый'];
const trainer = {
  mode: 'train', cat: null, task: null, ctx: null, checkFn: null,
  done: false, started: false, mistakes: 0, hints: 0,
  startedAt: 0, timerId: null, cdId: null, pausedAt: 0,
  demo: { list: [], index: 0, results: [] },
  lastId: null, lastResult: null,
};
const taskEl = id => document.getElementById(id);

/* ---------- доступные уровни и выбор задания ---------- */
function maxLevel(){
  const L = levelInfo(loadStats().xp).level;
  return L >= 4 ? 2 : L >= 2 ? 1 : 0;
}

function pickTask(catId){
  const all = BANK.tasks.filter(t => t.cat === catId && (KINDS[t.ex] || KINDS[t.ex.split('_')[0]]));
  if(!all.length) return null;
  const seen = loadStats().seen[catId] || [];
  const ml = maxLevel();
  let pool = all.filter(t => t.lvl <= ml);
  if(!pool.length) pool = all;
  let fresh = pool.filter(t => !seen.includes(t.id));
  if(!fresh.length){ fresh = pool; const s = loadStats(); s.seen[catId] = []; saveStats(s); }
  if(fresh.length > 1) fresh = fresh.filter(t => t.id !== trainer.lastId);
  // чаще — задания самого высокого доступного уровня, но разнообразие типов сохраняется
  const w = fresh.map(t => 1 + (t.lvl === ml ? 1 : 0));
  let r = Math.random() * w.reduce((a, b)=> a + b, 0), i = 0;
  while((r -= w[i]) > 0) i++;
  return fresh[Math.min(i, fresh.length - 1)];
}
function kindOf(t){ return KINDS[t.ex] || KINDS[t.ex.split('_')[0]]; }

function startCategory(catId){
  trainer.mode = 'train'; trainer.cat = catId;
  const t = pickTask(catId);
  if(!t){ alert('В этой категории пока нет упражнений.'); return; }
  openTaskIntro(t);
}

/* ---------- демо «Попробуй прямо сейчас» ---------- */
/* демо-задания по макету дизайнера: контекст России + иллюстрации (assets/demo-*.png, пока эмодзи-заглушки) */
const DEMO_TASKS = [
  { id:'DEMO-1', ex:'demo_assoc', cat:'verbal', lvl:0, q:'Матрёшка + берёза + Кремль — ?', sub:'Подсказка: это страна',
    pics:[{ src:'demo-matryoshka.png', emoji:'🪆', alt:'Матрёшка' }, { src:'demo-birch.png', emoji:'🌳', alt:'Берёза' }, { src:'demo-kremlin.png', emoji:'🏰', alt:'Кремль' }],
    accept:['Россия', 'РФ', 'Российская Федерация'],
    okText:'Россия — страна, где проживает более 190 народов и этнических групп.' },
  { id:'DEMO-2', ex:'demo_assoc', cat:'verbal', lvl:0, q:'Загадка: Стоит толстячок, подбоченившись бочок, шипит и кипит, всем чай пить велит.',
    pics:[{ src:'demo-samovar.png', emoji:'🫖', alt:'Чаепитие у самовара', wide:true }],
    accept:['Самовар'],
    okText:'Испокон веков он собирал за столом самых дорогих гостей. Рады видеть вас в «Культура развивает» — добро пожаловать к нашему самовару!' },
];
function startDemo(){
  trainer.mode = 'demo';
  trainer.demo = { list: DEMO_TASKS.slice(), index: 0, results: [] };
  showDemoTask();
}
function showDemoTask(){
  const t = trainer.demo.list[trainer.demo.index];
  trainer.cat = t.cat;
  runTask(t, true);
}

/* ---------- карточка перед началом ---------- */
function exName(ex){ const e = BANK.EX.find(x => x[0] === ex || x[0].replace('2', '') === ex.split('_')[0]); return e ? e[2] : ex; }
function exBase(t){ return t.ex.split('_')[0]; }
function exKey(t){ return (t.cat === 'memory' && exBase(t) === 'wordsearch') ? 'wordsearch2' : exBase(t); }
function exDescription(t){
  const k = exKey(t);
  return BANK.secintro[k] || ((BANK.exmeta[k] || {}).how) || '';
}

function openTaskIntro(task){
  if(trainer.mode === 'demo'){ runTask(task, true); return; }
  trainer.task = task;
  const cat = CATEGORIES.find(c => c.id === task.cat), k = exKey(task), meta = BANK.exmeta[k] || {};
  fillHeader(task);
  taskEl('task-progress').hidden = true;
  taskEl('task-feedback').textContent = '';
  const stage = taskEl('task-stage'); stage.innerHTML = ''; stage.className = 'task-stage';
  taskEl('task-q').textContent = '';
  const box = h('div', 'task-intro');
  box.innerHTML =
    '<h2>' + esc(exName(task.ex)) + '</h2>' +
    (exDescription(task) ? '<p>' + esc(exDescription(task)) + '</p>' : '') +
    (meta.levels ? '<p class="intro-note"><b>Уровни.</b> ' + esc(meta.levels) + '</p>' : '') +
    (meta.helper ? '<p class="intro-note"><b>Что проверит помощник.</b> ' + esc(meta.helper) + '</p>' : '');
  stage.appendChild(box);
  setActions({ start: true });
  clearInterval(trainer.timerId); taskEl('task-timer').innerHTML = '';
  trainer.started = false; trainer.done = false;
  go('screen-task');
}

function fillHeader(task){
  const cat = CATEGORIES.find(c => c.id === task.cat);
  const demo = trainer.mode === 'demo';
  taskEl('task-kicker').textContent = demo ? 'Задание ' + (trainer.demo.index + 1) + ' из ' + trainer.demo.list.length : (cat ? cat.name : '');
  taskEl('task-title').textContent = demo ? 'Попробуй прямо сейчас' : exName(task.ex);
  renderPracticeGuide('task-guide', practiceGuideFor({ id:task.ex, skill:task.cat }));
  const lv = taskEl('task-level');
  lv.hidden = demo; lv.textContent = LEVELS[task.lvl] || ''; lv.className = 'level-badge lvl' + task.lvl;
  taskEl('task-back').innerHTML = icon('arrowLeft', 18) + '<span>' + (demo ? 'Назад' : 'К упражнениям') + '</span>';
}

function setActions(o){
  const show = (id, on)=> taskEl(id).classList.toggle('hidden', !on);
  show('task-start', !!o.start); show('task-check', !!o.check); show('task-skip', !!o.skip);
  show('task-next', !!o.next); show('task-close', !!o.close);
  if(!o.hint) taskEl('task-hint').hidden = true;
  taskEl('task-extra').innerHTML = '';
}
function onTaskStart(){ runTask(trainer.task, trainer.mode === 'demo'); }

/* ---------- запуск задания ---------- */
function runTask(task, demo){
  trainer.task = task; trainer.checkFn = null; trainer.done = false; trainer.started = true;
  trainer.mistakes = 0; trainer.hints = 0; trainer.lastId = task.id;
  fillHeader(task);
  const bar = taskEl('task-progress'); bar.hidden = true;
  if(demo){
    const total = trainer.demo.list.length, idx = trainer.demo.index;
    bar.hidden = false;
    const pct = Math.round(idx / total * 100);
    taskEl('task-progress-fill').style.width = pct + '%'; bar.setAttribute('aria-valuenow', String(pct));
    requestAnimationFrame(()=> { taskEl('task-progress-fill').style.width = Math.round((idx + 0.5) / total * 100) + '%'; });
  }
  taskEl('task-q').textContent = task.q || '';
  taskEl('task-q').classList.toggle('demo-q', !!demo);
  const stage = taskEl('task-stage'); stage.innerHTML = ''; stage.className = 'task-stage';
  const fb = taskEl('task-feedback'); fb.textContent = ''; fb.className = 'task-feedback';
  setActions({ check: true, skip: true });
  taskEl('task-check').disabled = false;
  startElapsed();
  go('screen-task');

  const def = kindOf(task);
  if(!def){ fb.textContent = 'Тип упражнения не подключён: ' + task.ex; fb.className = 'task-feedback bad'; return; }
  const ctx = {
    stage, task,
    setCheck(fn){ trainer.checkFn = fn; },
    enableCheck(on){ taskEl('task-check').disabled = !on; },
    hideCheck(){ taskEl('task-check').classList.add('hidden'); },
    showCheck(on){ taskEl('task-check').classList.toggle('hidden', !on); },
    addButton(txt, fn, cls){
      const b = h('button', cls || 'btn-ghost'); b.type = 'button'; b.textContent = txt;
      b.addEventListener('click', fn); taskEl('task-extra').appendChild(b); return b;
    },
    hint(text){ trainer.hints++; const f = taskEl('task-feedback'); f.textContent = 'Подсказка: ' + text; f.className = 'task-feedback info'; },
    say(text, cls){ const f = taskEl('task-feedback'); f.textContent = text; f.className = 'task-feedback ' + (cls || 'info'); },
    mistake(n){ trainer.mistakes += (n === undefined ? 1 : n); },
    get mistakes(){ return trainer.mistakes; },
    setProgress(p){ const b = taskEl('task-progress'); if(p === null){ b.hidden = true; return; } b.hidden = false; taskEl('task-progress-fill').style.width = Math.round(p * 100) + '%'; },
    timer(sec, cb){ startCountdown(sec, cb); },
    finish(res){ completeTask(res); },
    elapsed(){ return (Date.now() - trainer.startedAt) / 1000; },
  };
  trainer.ctx = ctx;
  try{ def.render(task, ctx); }
  catch(e){ console.error(e); fb.textContent = 'Ошибка в упражнении: ' + e.message; fb.className = 'task-feedback bad'; }
}

function startElapsed(){
  clearInterval(trainer.timerId); clearInterval(trainer.cdId);
  trainer.startedAt = Date.now();
  const el = taskEl('task-timer');
  const render = ()=> { el.innerHTML = icon('clock', 16) + ' ' + fmtTime((Date.now() - trainer.startedAt) / 1000); };
  render(); trainer.timerId = setInterval(render, 1000);
}
function startCountdown(sec, cb){
  clearInterval(trainer.timerId); clearInterval(trainer.cdId);
  const el = taskEl('task-timer'); let left = Math.ceil(sec * TK);
  const render = ()=> { el.innerHTML = icon('clock', 16) + ' ' + fmtTime(left); };
  render();
  trainer.cdId = setInterval(()=>{
    if(trainer.done){ clearInterval(trainer.cdId); return; }
    left--; render();
    if(left <= 0){ clearInterval(trainer.cdId); startElapsedAfter(); cb && cb(); }
  }, 1000);
}
function startElapsedAfter(){ const t0 = Date.now(); trainer.startedAt = t0; trainer.timerId = setInterval(()=>{ taskEl('task-timer').innerHTML = icon('clock', 16) + ' ' + fmtTime((Date.now() - trainer.startedAt) / 1000); }, 1000); }

/* ---------- кнопки ---------- */
function onTaskCheck(){
  if(trainer.done || !trainer.checkFn) return;
  const res = trainer.checkFn();
  const fb = taskEl('task-feedback');
  if(!res){ fb.textContent = 'Сначала выполни задание.'; fb.className = 'task-feedback info'; return; }
  if(res.pending){ fb.textContent = res.msg || ''; fb.className = 'task-feedback info'; return; }
  if(res.retry){
    trainer.mistakes++;
    fb.textContent = res.msg || 'Пока неверно — исправь и проверь ещё раз.';
    fb.className = 'task-feedback bad'; shakeEl(taskEl('task-stage')); sfx.bad(); return;
  }
  completeTask(res);
}

function completeTask(res){
  if(trainer.done) return;
  trainer.done = true;
  clearInterval(trainer.timerId); clearInterval(trainer.cdId);
  const seconds = Math.round((Date.now() - trainer.startedAt) / 1000);
  res = Object.assign({ good: [], improve: [], recs: [] }, res);
  res.errors = (res.errors || 0) + trainer.mistakes;
  res.hints = trainer.hints;
  if(res.score === undefined) res.score = res.ok ? Math.max(40, 100 - res.errors * 10 - res.hints * 5) : Math.max(0, 40 - res.errors * 5);
  res.score = Math.max(0, Math.min(100, Math.round(res.score)));
  res.seconds = seconds;
  res.ok = !!res.ok;
  trainer.lastResult = res;
  res.ok ? sfx.ok() : sfx.bad();
  taskEl('task-stage').classList.add(res.ok ? 'is-correct' : 'is-wrong');
  if(trainer.mode === 'demo'){
    trainer.demo.results.push({ id: trainer.task.id, cat: trainer.cat, ok: res.ok });
    const fb = taskEl('task-feedback');
    const ot = trainer.task.okText;
    fb.textContent = ot ? (res.ok ? 'Верно! ' : 'Правильный ответ: ' + trainer.task.accept[0] + '. ') + ot
      : (res.ok ? 'Верно! ' : 'Не совсем. ') + (res.model ? res.model : (res.improve[0] || ''));
    fb.className = 'task-feedback ' + (res.ok ? 'good' : 'bad');
    setActions({ next: true });
    const last = trainer.demo.index >= trainer.demo.list.length - 1;
    taskEl('task-next').textContent = last ? 'Результат' : 'Далее';
    taskEl('task-next').focus();
    return;
  }
  recordTask(trainer.cat, trainer.task.id, res.ok);
  trainer.resultTimeout = setTimeout(showTaskResult, 700);
}

function onTaskSkip(){
  if(trainer.done) return;
  clearInterval(trainer.timerId); clearInterval(trainer.cdId);
  if(trainer.mode === 'demo'){
    trainer.demo.results.push({ id: trainer.task.id, cat: trainer.cat, ok: false, skipped: true });
    advanceDemo();
  } else {
    const t = pickTask(trainer.cat); if(t) openTaskIntro(t);
  }
}
function onTaskNext(){ if(trainer.mode === 'demo') advanceDemo(); }
function advanceDemo(){
  if(trainer.demo.index < trainer.demo.list.length - 1){ trainer.demo.index++; showDemoTask(); }
  else finishDemo();
}
function stopLegacyTask(){
  clearInterval(trainer.timerId); clearInterval(trainer.cdId); clearTimeout(trainer.resultTimeout);
}
function closeTask(){
  stopLegacyTask();
  if(trainer.mode === 'demo') go('screen-welcome'); else openTraining();
}

/* ---------- экран результата ---------- */
function showTaskResult(){
  const r = trainer.lastResult, t = trainer.task;
  const list = (title, arr, cls)=> arr && arr.length ? '<div class="res-block ' + cls + '"><h3>' + title + '</h3><ul>' + arr.map(x => '<li>' + x + '</li>').join('') + '</ul></div>' : '';
  const stats = [
    ['Время', fmtTime(r.seconds)],
    ['Ошибки', String(r.errors)],
    ['Подсказки', String(r.hints)],
  ];
  if(r.total !== undefined && r.correct !== undefined) stats.unshift(['Верно', r.correct + ' из ' + r.total]);
  $('result-status').textContent = r.ok ? 'Задание выполнено' : 'Есть над чем поработать';
  $('result-status').className = 'res-status ' + (r.ok ? 'good' : 'bad');
  $('result-score').textContent = r.score + '%';
  $('result-name').textContent = exName(t.ex) + ' · ' + (LEVELS[t.lvl] || '').toLowerCase();
  $('result-stats').innerHTML = stats.map(s => '<div class="dash-card"><small>' + s[0] + '</small><b class="dash-num">' + esc(s[1]) + '</b></div>').join('');
  $('result-body').innerHTML =
    list('Что получилось', r.good, 'good') + list('Что улучшить', r.improve, 'bad') +
    (r.model ? '<div class="res-block"><h3>Эталон</h3><p>' + r.model + '</p></div>' : '') +
    list('Рекомендации помощника', r.recs, 'info');
  go('screen-taskresult');
}
function nextTask(){ startCategory(trainer.cat); }
