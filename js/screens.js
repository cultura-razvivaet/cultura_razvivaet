/* =================================================================
   Культура развивает — экраны: заставка, знакомство, демо-результат,
   профиль (ник + иконка), цель, личный кабинет, тренировки,
   статистика. Данные — localStorage (см. storage.js).
   ================================================================= */

const $ = id => document.getElementById(id);
const catById = id => CATEGORIES.find(c => c.id === id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

/* ---------- аватар: PNG из assets/ или цветная заглушка ---------- */
function avatarHTML(file, nick, cls){
  const i = Math.max(0, AVATARS.findIndex(a => a.file === file));
  const [c1, c2] = AVATAR_FALLBACK_COLORS[i % AVATAR_FALLBACK_COLORS.length];
  const letter = esc((nick || '?').trim().charAt(0).toUpperCase());
  return '<span class="avatar ' + (cls || '') + '" style="--c1:' + c1 + ';--c2:' + c2 + '">' +
    '<span class="avatar-letter" aria-hidden="true">' + letter + '</span>' +
    '<img src="' + esc(assetUrl(file)) + '" alt="" onerror="this.remove()"></span>';
}

function userHead(){
  const p = loadProfile() || { nick:'Гость', avatar:AVATARS[0].file };
  return '<div class="brand brand--lab">Культура развивает <span>by CULTLAB</span></div>' +
    '<div class="user-tools"><button class="user-chip" type="button" onclick="openProfileEdit()" aria-label="Изменить аватар и имя: ' + esc(p.nick) + '">' +
    avatarHTML(p.avatar, p.nick, 'sm') + '<span class="user-name">' + esc(p.nick) + '</span></button>' +
    '<button class="icon-btn" type="button" onclick="openMe()" aria-label="Настройки и профиль">' + icon('sliders', 20) + '</button></div>';
}

/* ---------- заставка и первичный маршрут ---------- */
function route(){
  if(loadProfile()) openCabinet(); else openWelcome();
}

/* ---------- знакомство с постепенным появлением ---------- */
let revealObserver = null;
function setupReveal(root){
  const els = root.querySelectorAll('.reveal:not(.in)');
  if(!('IntersectionObserver' in window)){ els.forEach(e => e.classList.add('in')); return; }
  if(revealObserver) revealObserver.disconnect();
  revealObserver = new IntersectionObserver(es => es.forEach(e=>{
    if(e.isIntersecting){ e.target.classList.add('in'); revealObserver.unobserve(e.target); }
  }), { threshold: 0.2 });
  els.forEach((e, i)=>{ e.style.transitionDelay = Math.min(i, 3) * 90 + 'ms'; revealObserver.observe(e); });
}

const WELCOME_FACTS = [
  'Мозг взрослого человека весит около <b>1,4 кг</b> — это примерно <b>2%</b> массы тела, но он потребляет около <b>20%</b> энергии организма.',
  '<b>Нейропластичность</b>: мозг перестраивает связи между нейронами в течение всей жизни, поэтому тренироваться полезно в любом возрасте.',
  'Во время сна мозг закрепляет <b>воспоминания</b>. Недосып ухудшает запоминание нового.',
];
function openWelcome(){
  renderMascot('welcome-mascot', 'neutral', 'cap');
  // на смартфоне между блоками показываются иллюстрации (на широких экранах скрыты)
  $('welcome-facts').innerHTML = WELCOME_FACTS.map((f, i) => '<div class="fact-tile">' + f + '</div>' +
    (i < WELCOME_FACTS.length - 1 ? '<div class="fact-gap" id="fact-gap-' + (i + 1) + '" aria-hidden="true"></div>' : '')).join('');
  renderMascot('fact-gap-1', 'neutral', 'cap');
  renderMascot('fact-gap-2', 'neutral', 'flex');
  $('welcome-after').classList.add('hidden');
  $('welcome-gate').classList.remove('done');
  go('screen-welcome');
  setupReveal($('screen-welcome'));
}

function onWelcomeYes(){
  $('welcome-gate').classList.add('done');
  renderMascot('welcome-mascot2', 'neutral', 'flex');
  $('welcome-after').classList.remove('hidden');
  setupReveal($('welcome-after'));
  $('welcome-after').scrollIntoView({ behavior:'smooth', block:'start' });
}

/* ---------- демо: итог ---------- */
function finishDemo(){
  const res = trainer.demo.results, total = trainer.demo.list.length;
  const good = res.filter(r => r.ok).length;
  saveDemoResult({ good, total, at: Date.now() });
  const pct = Math.round(good / total * 100);
  const [head, text] = pct === 100 ? ['Отличное начало!', 'Мозг уже разогрелся — дальше будет интереснее!']
    : pct > 0 ? ['Хорошее начало!', 'Мозг уже разогревается — дальше будет интереснее!']
    : ['Непростое начало!', 'Мозгу предстоит разогреться — дальше будет интереснее!'];
  $('demo-num').textContent = pct + '%';
  $('demo-head').textContent = head; $('demo-text').textContent = text;
  go('screen-demo-result');
}
function afterDemo(){ loadProfile() ? openCabinet() : openProfileCreate(); }

/* ---------- профиль: создание / правка ---------- */
let profileDraft = { avatar: null };
function openProfileCreate(){ buildProfile(false); }
function openProfileEdit(){ buildProfile(true); }

function buildProfile(edit){
  const p = loadProfile();
  profileDraft.avatar = (edit && p) ? p.avatar : null;
  profileDraft.edit = edit;
  $('profile-nick').value = (edit && p) ? p.nick : '';
  $('profile-error').textContent = '';
  $('profile-title').textContent = edit ? 'Профиль' : 'Как тебя зовут?';
  $('profile-sub').classList.toggle('hidden', edit);
  $('profile-back').classList.toggle('hidden', !edit);
  $('profile-reset').classList.toggle('hidden', !edit);
  $('profile-save').textContent = edit ? 'Сохранить' : 'Продолжить';
  const grid = $('avatar-grid'); grid.innerHTML = '';
  AVATARS.forEach(a=>{
    const b = h('button', 'avatar-opt', avatarHTML(a.file, '', 'lg'));
    b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-label', a.label);
    b.setAttribute('aria-checked', String(a.file === profileDraft.avatar));
    b.classList.toggle('selected', a.file === profileDraft.avatar);
    b.addEventListener('click', ()=>{
      profileDraft.avatar = a.file;
      grid.querySelectorAll('.avatar-opt').forEach(x=>{ x.classList.toggle('selected', x === b); x.setAttribute('aria-checked', String(x === b)); });
      validateProfile();
    });
    grid.appendChild(b);
  });
  validateProfile();
  go('screen-profile');
  setTimeout(()=> $('profile-nick').focus(), 50);
}

function validateProfile(){
  const n = $('profile-nick').value.trim();
  $('profile-save').disabled = !(n.length >= 2 && profileDraft.avatar);
}

function onProfileSubmit(e){
  e.preventDefault();
  const nick = $('profile-nick').value.trim();
  if(nick.length < 2){ $('profile-error').textContent = 'Ник — минимум 2 символа.'; return; }
  if(!profileDraft.avatar) return;
  const old = loadProfile();
  saveProfile({ nick, avatar: profileDraft.avatar, goal: old ? old.goal : null });
  if(profileDraft.edit) openMe(); else openGoal(false);
}

function resetAll(){
  if(!confirm('Удалить профиль и всю статистику на этом устройстве?')) return;
  clearProfile(); clearStats(); clearHistory();
  try{ sessionStorage.clear(); }catch(e){}
  openWelcome();
}

/* ---------- цель ---------- */
let goalDraft = null, goalFromSettings = false;
function openGoal(fromSettings){
  goalFromSettings = !!fromSettings;
  const p = loadProfile();
  goalDraft = p && p.goal ? p.goal : null;
  const grid = $('goal-grid'); grid.innerHTML = '';
  GOALS.forEach(g=>{
    const b = h('button', 'goal-card', '<span class="goal-ico"><img src="' + esc(assetUrl('goal-' + g.id + '.png')) + '" alt=""></span><b>' + esc(g.name) + '</b><small>' + esc(g.desc) + '</small>');
    const gi = b.querySelector('img'); gi.onerror = ()=>{ gi.parentNode.innerHTML = icon(g.icon, 40); };
    b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(g.id === goalDraft));
    b.classList.toggle('selected', g.id === goalDraft);
    b.addEventListener('click', ()=>{
      goalDraft = g.id;
      grid.querySelectorAll('.goal-card').forEach(x=>{ x.classList.toggle('selected', x === b); x.setAttribute('aria-checked', String(x === b)); });
      $('goal-next').disabled = false;
    });
    grid.appendChild(b);
  });
  $('goal-next').disabled = !goalDraft;
  go('screen-goal');
}
function onGoalNext(){
  if(!goalDraft) return;
  const p = loadProfile() || { nick:'Гость', avatar:AVATARS[0].file };
  p.goal = goalDraft; saveProfile(p);
  openCabinet();
}

/* ---------- рекомендации ---------- */
function recommendCategory(){
  const p = loadProfile(), s = loadStats();
  const goal = GOALS.find(g => p && g.id === p.goal);
  const pool = goal ? goal.categories : CATEGORIES.map(c => c.id);
  const done = id => (s.cats[id] ? s.cats[id].done : 0);
  return catById(pool.slice().sort((a, b)=> done(a) - done(b))[0]);
}
function recoCard(){
  const c = recommendCategory(); if(!c) return '';
  return '<button class="reco-card" type="button" onclick="startCategory(\'' + c.id + '\')" style="--cat:' + c.color + '">' +
    '<span class="reco-ico">' + icon(c.icon, 32) + '</span>' +
    '<span class="reco-text"><small>Продолжить тренировку</small><b>' + esc(c.name) + '</b><span>' + esc(c.desc) + '</span></span>' +
    '<span class="reco-go" aria-hidden="true">→</span></button>';
}

/* Картинки категорий: assets/cat-<id>.png (модуль не завершён) и assets/cat-<id>-done.png (завершён).
   Нет файла — показывается градиент с иконкой. Модуль считается завершённым при CAT_DONE_AT выполненных заданиях. */
const CAT_DONE_AT = 10;
function catArtError(img, id, doneTried){
  if(doneTried){ img.onerror = ()=> img.remove(); img.src = assetUrl('cat-' + id + '.png'); } else img.remove();
}
function catCard(c){
  const st = loadStats().cats[c.id] || { done:0, correct:0 };
  const done = st.done >= CAT_DONE_AT;
  const src = assetUrl('cat-' + c.id + (done ? '-done' : '') + '.png');
  return '<button class="cat-card' + (done ? ' is-done' : '') + '" type="button" onclick="startCategory(\'' + c.id + '\')" style="--cat:' + c.color + '">' +
    '<span class="cat-art"><span class="cat-art-ico">' + icon(c.icon, 30) + '</span>' +
    '<img src="' + esc(src) + '" alt="" onerror="catArtError(this,\'' + c.id + '\',' + done + ')"></span>' +
    '<span class="cat-body"><b>' + esc(c.name) + '</b>' +
    '<small>' + (st.done ? 'Выполнено: ' + st.done : 'Ещё не пробовал') + '</small></span></button>';
}

/* серия дней: цвет огонька и «открытый регион» (по макету дизайнера) */
const STREAK_TIERS = [
  { min:0,   color:'#8d909b', region:null },
  { min:1,   color:'#2f80ed', region:'Татарстан', img:'streak-tatar.png',    bg:'#bfe4f5' },
  { min:11,  color:'#4caf2e', region:'Якутия',    img:'streak-yakutia.png',  bg:'#cfe9c0' },
  { min:31,  color:'#f2c200', region:'Карелия',   img:'streak-karelia.png',  bg:'#f6e3a8' },
  { min:71,  color:'#f28a1b', region:'Калмыкия',  img:'streak-kalmykia.png', bg:'#fbd0a0' },
  { min:101, color:'#e23b2e', region:'Бурятия',   img:'streak-buryatia.png', bg:'#f5a9a0' },
  { min:201, color:'#e0399c', region:'Чукотка',   img:'streak-chukotka.png', bg:'#f6b7dc' },
];
function streakTier(n){ let t = STREAK_TIERS[0]; STREAK_TIERS.forEach(x => { if(n >= x.min) t = x; }); return t; }

function dashHTML(){
  const s = loadStats(), L = levelInfo(s.xp), total = Object.values(s.cats).reduce((a, c)=> a + c.done, 0);
  const ok = Object.values(s.cats).reduce((a, c)=> a + c.correct, 0);
  const pct = Math.round(L.into / L.need * 100);
  const streak = currentStreak(s), tier = streakTier(streak);
  const art = tier.region ? '<span class="streak-art" aria-hidden="true" style="--art:url(\'' + esc(assetUrl(tier.img)) + '\');--bg:' + tier.bg + '"></span>' : '';
  return '<div class="dash-card"><small>Уровень</small><div class="lvl-row"><b class="dash-num">' + L.level + '</b>' +
      '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><div class="progress-fill" style="width:' + pct + '%"></div></div></div>' +
      '<small>' + L.into + ' / ' + L.need + ' XP</small></div>' +
    '<div class="dash-card"><small>Задания</small><b class="dash-num">' + total + '</b><small>Верных: ' + ok + '</small></div>' +
    '<div class="dash-card streak" style="--tier:' + tier.color + '">' + art +
      '<small>Серия дней</small><b class="dash-num">' + icon('flame', 24) + ' ' + streak + '</b><small>Подряд</small>' +
      '<span class="streak-region">' + (tier.region ? esc(tier.region) : 'Регион не открыт') + '</span></div>';
}

/* ---------- экраны главного меню ---------- */
function openCabinet(){
  $('cabinet-head').innerHTML = userHead();
  $('cabinet-dash').innerHTML = dashHTML();
  $('cabinet-reco').innerHTML = recoCard();
  $('cabinet-cats').innerHTML = CATEGORIES.map(catCard).join('');
  go('screen-cabinet');
}

/* Контур России для карточки «Интерактивная карта»: нижний слой — обводка всех регионов,
   верхний — заливка фоном: остаётся только внешний контур (внутренние границы скрыты). */
let _miniRu = '';
function miniRussia(){
  if(_miniRu) return _miniRu;
  if(typeof RUSSIA_REGIONS === 'undefined') return '';
  const paths = RUSSIA_REGIONS.regions.map(r => '<path d="' + r.d + '"/>').join('');
  _miniRu = '<svg viewBox="' + RUSSIA_REGIONS.viewBox + '" focusable="false"><defs><g id="mini-ru">' + paths + '</g></defs>' +
    '<use href="#mini-ru" class="ru-under"/><use href="#mini-ru" class="ru-over"/></svg>';
  return _miniRu;
}

function openTraining(){
  $('train-head').innerHTML = userHead();
  $('train-pills').innerHTML = CATEGORIES.map(c =>
    '<button class="cat-pill" type="button" onclick="startCategory(\'' + c.id + '\')">' + icon(c.icon, 20) + ' ' + esc(c.name) + '</button>').join('');
  $('train-reco').innerHTML = recoCard();
  $('train-map-art').innerHTML = miniRussia();
  renderCarousel();
  go('screen-train');
}

const HISTORY_DAYS = {
  '01-25': 'Татьянин день — День российского студенчества. Хороший повод вспомнить, как учились раньше.',
  '02-21': 'Международный день родного языка, который отмечают по решению ЮНЕСКО. Назови сегодня вслух слово на языке своих предков.',
  '03-27': 'Международный день театра. Народные театры и обряды — тоже часть культуры: от кукольных представлений до народных игр.',
  '04-12': '12 апреля 1961 года Юрий Гагарин совершил первый в мире полёт человека в космос.',
  '05-21': 'Всемирный день культурного разнообразия во имя диалога и развития (учреждён ООН).',
  '05-24': 'День славянской письменности и культуры.',
  '06-06': 'Пушкинский день России и День русского языка: 6 июня 1799 года родился Александр Пушкин.',
  '06-12': 'День России.',
  '08-09': 'Международный день коренных народов мира (учреждён ООН).',
  '09-01': 'День знаний — начало учебного года.',
  '11-04': 'День народного единства.',
  '12-12': 'День Конституции Российской Федерации.',
};
function dayOfYear(){ const d = new Date(), s = new Date(d.getFullYear(), 0, 0); return Math.floor((d - s) / 86400000); }

function carouselCards(){
  const facts = FACTS.filter(f => f.text), myths = FACTS.filter(f => f.myth);
  const fact = facts[dayOfYear() % facts.length], myth = myths[dayOfYear() % myths.length];
  const d = new Date(), key = pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  const hist = HISTORY_DAYS[key];
  return [
    { id:'fact', title:'Факт дня', body:'<p>' + esc(fact.text) + '</p>' },
    { id:'myth', title:'Правда или миф?', body:'<p>' + esc(myth.myth) + '</p><div class="fc-actions"><button class="fc-btn" data-a="1" type="button">Правда</button><button class="fc-btn" data-a="0" type="button">Миф</button></div>', myth },
    { id:'hist', title:'Этот день в истории', body:'<p>' + esc(hist || 'На сегодня в календаре нет отметки. Загляните в «Культуры России» — там много интересного о традициях народов.') + '</p>' + (hist ? '' : ''), },
  ];
}
function renderCarousel(){
  const box = $('train-carousel'); box.innerHTML = '';
  carouselCards().forEach(c=>{
    const el = h('article', 'fact-card slide', '<h3 class="fc-title">' + esc(c.title) + '</h3>' + c.body);
    if(c.myth) el.querySelectorAll('button').forEach(b => b.addEventListener('click', ()=>{
      const ok = (b.dataset.a === '1') === c.myth.answer; ok ? sfx.ok() : sfx.bad();
      el.innerHTML = '<h3 class="fc-title">' + esc(c.title) + ' — ' + (ok ? 'верно!' : 'не совсем.') + '</h3><p>' + esc(c.myth.explain) + '</p>';
    }));
    box.appendChild(el);
  });
}

function openStats(){
  const s = loadStats();
  $('stats-head').innerHTML = userHead();
  $('stats-dash').innerHTML = dashHTML();
  $('stats-cats').innerHTML = CATEGORIES.map(c=>{
    const x = s.cats[c.id] || { done:0, correct:0 }, pct = x.done ? Math.round(x.correct / x.done * 100) : 0;
    return '<div class="stat-row" style="--cat:' + c.color + '"><span class="stat-name">' + icon(c.icon, 18) + ' ' + esc(c.name) + '</span>' +
      '<div class="progress" role="progressbar" aria-label="' + esc(c.name) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
      '<span class="stat-val">' + (x.done ? x.correct + '/' + x.done : '—') + '</span></div>';
  }).join('');
  $('stats-log').innerHTML = s.log.length ? s.log.slice(0, 10).map(l=>{
    const c = catById(l.c), name = c ? c.name : 'Культуры России' + (l.score !== undefined ? ' · ' + l.score + '%' : '');
    return '<li class="' + (l.ok ? 'good' : 'bad') + '">' + icon(l.ok ? 'check' : 'x', 16) + ' ' + esc(name) + ' <small>' + formatHistoryDate(l.at) + '</small></li>';
  }).join('') : '<li>Пока пусто — выполни первое задание.</li>';
  go('screen-stats');
}

function openAbout(){
  $('about-head').innerHTML = userHead();
  if(!document.querySelector('#map-box svg')) renderRussiaMap();
  go('screen-about');
}

function openMe(){
  const p = loadProfile(); if(!p) return openProfileCreate();
  const g = GOALS.find(x => x.id === p.goal);
  $('me-head').innerHTML = userHead();
  $('me-avatar').innerHTML = avatarHTML(p.avatar, p.nick, 'xl');
  $('me-nick').textContent = p.nick;
  $('me-goal').textContent = g ? 'Цель: ' + g.name : 'Цель не выбрана';
  $('set-fx').checked = sfx.state.fx;
  go('screen-me');
}

/* ---------- запуск ---------- */
function initScreens(){
  renderMascot('splash-mascot', 'neutral', 'cap');
  $('welcome-yes').addEventListener('click', onWelcomeYes);
  $('welcome-try').addEventListener('click', startDemo);
  $('demo-go').addEventListener('click', afterDemo);
  $('profile-form').addEventListener('submit', onProfileSubmit);
  $('profile-nick').addEventListener('input', ()=>{ $('profile-error').textContent = ''; validateProfile(); });
  $('profile-reset').addEventListener('click', resetAll);
  $('goal-next').addEventListener('click', onGoalNext);
  $('set-fx').addEventListener('change', e => sfx.setFx(e.target.checked));
  const nav = { 'screen-cabinet':openCabinet, 'screen-train':openTraining, 'screen-stats':openStats, 'screen-me':openMe };
  $('mainnav').querySelectorAll('button').forEach(b => b.addEventListener('click', ()=> nav[b.dataset.nav]()));
  // ссылки <a onclick> доступны с клавиатуры
  document.querySelectorAll('a[onclick]').forEach(a=>{
    a.setAttribute('role', 'button'); a.tabIndex = 0;
    a.addEventListener('keydown', e=>{ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); a.click(); } });
  });
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  setTimeout(route, reduce ? 300 : 1800);
}
