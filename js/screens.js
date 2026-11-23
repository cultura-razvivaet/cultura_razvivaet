/* =================================================================
   Культура развивает — экраны: заставка, знакомство, демо-результат,
   профиль (ник + иконка), цель, личный кабинет, тренировки,
   статистика. Данные — localStorage (см. storage.js).
   ================================================================= */

const $ = id => document.getElementById(id);
const catById = id => CATEGORIES.find(c => c.id === id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

/* ---------- аватар: SVG из assets/ или цветная заглушка ---------- */
function avatarHTML(file, nick, cls){
  const avatar = avatarOption(file);
  const [c1, c2] = avatar.colors;
  const letter = esc((nick || '?').trim().charAt(0).toUpperCase());
  return '<span class="avatar ' + (cls || '') + '" style="--c1:' + c1 + ';--c2:' + c2 + '">' +
    '<span class="avatar-letter" aria-hidden="true">' + letter + '</span>' +
    '<img src="' + esc(assetUrl(avatar.file)) + '" alt="" onerror="this.remove()"></span>';
}

function userHead(){
  const p = loadProfile() || { nick:'Гость', avatar:AVATARS[0].file };
  return '<div class="brand brand--lab">Культура развивает <span>by CULTLAB</span></div>' +
    '<div class="user-tools"><button class="nick-pill" type="button" onclick="openMe()" aria-label="Профиль: ' + esc(p.nick) + '">' + esc(p.nick) + '</button>' +
    '<button class="user-ava" type="button" onclick="openMe()" aria-label="Мой профиль">' + avatarHTML(p.avatar, p.nick, 'sm') + '</button></div>';
}

/* ---------- заставка и первичный маршрут ---------- */
function route(){
  const saved = history.state?.cultureRoute;
  if(saved && (loadProfile() || ['screen-welcome','screen-practice','screen-profile'].includes(saved.id))){
    restoreRoute(history.state);
  } else if(loadProfile()) openCabinet(); else openWelcome();
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
  '<b>Нейропластичность</b>: мозг перестраивает связи между нейронами в течение всей жизни, и этот процесс продолжается во взрослом возрасте.',
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
  go('screen-profile', { edit });
  if(!restoringRoute) $('profile-nick').focus({ preventScroll:true });
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
  if(profileDraft.edit) openMe();
  else {
    const demo = readJSON(safeStore('sessionStorage'), DEMO_KEY, null);
    if(demo?.practice) recordPractice(practiceById(demo.practice));
    saveDemoResult(null);
    openGoal(false);
  }
}

function resetAll(){
  if(!confirm('Удалить профиль и всю статистику на этом устройстве?')) return;
  clearProfile(); clearStats(); clearHistory();
  try{ localStorage.removeItem(SUDOKU_DRAFT_KEY); }catch(e){}
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
  go('screen-goal', { fromSettings:goalFromSettings });
}
function onGoalNext(){
  if(!goalDraft) return;
  const p = loadProfile() || { nick:'Гость', avatar:AVATARS[0].file };
  p.goal = goalDraft; saveProfile(p);
  openCabinet();
}

/* ---------- рекомендации ---------- */
function recoCard(){
  const profile = loadProfile();
  const progress = practiceStats();
  const goal = GOALS.find(g => profile && g.id === profile.goal);
  const preferred = PRACTICE_SKILLS.filter(skill => goal?.categories.includes(skill.id));
  const choices = preferred.length ? preferred : PRACTICE_SKILLS;
  const skill = choices.slice().sort((a, b) => (progress.counts[a.id] || 0) - (progress.counts[b.id] || 0))[0];
  const item = skill.examples.map(practiceById).find(exercise => exercise.id !== progress.last);
  return '<button class="reco-card" type="button" onclick="openPractice(&quot;' + item.id + '&quot;)" style="--cat:var(--lav-accent)">' +
    '<span class="reco-ico">' + icon(skill.icon, 32) + '</span>' +
    '<span class="reco-text"><small>Упражнение для паузы</small><b>' + esc(item.title) +
    '</b><span>' + esc(skill.name) + ' · ' + esc(item.duration) + '</span></span></button>';
}

const REGION_NATIVE = { tatar:'Татарча', yakutia:'Саха тыла', karelia:'Karjalan kieli', kalmykia:'Хальмг келн' };

function cabinetDashHTML(){
  const stats = practiceStats();
  const days = Object.keys(stats.days).length;
  const level = practiceLevel(stats);
  const region = REGION_LEVELS[level - 1];
  const next = REGION_LEVELS[level];
  const pct = next ? Math.round((days - region.days) * 100 / (next.days - region.days)) : 100;
  const art = '<span class="region-art" aria-hidden="true" style="--art:url(&quot;' + new URL(regionArt(region.id), document.baseURI).href + '&quot;);--bg:' + region.bg + '"></span>';
  return '<div class="lvl2-card"><div class="lvl2-left"><b class="lvl2-title">Уровень</b>' +
    '<div class="lvl-row"><b class="lvl2-num">' + level + '</b>' +
    '<div class="progress" role="progressbar" aria-label="Следующий уровень" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><div class="progress-fill" style="width:' + pct + '%"></div></div></div>' +
    '<small>' + (next ? days + ' / ' + next.days + ' ' + ruPlural(next.days, 'день', 'дня', 'дней') + ' практики' : 'Все уровни открыты') + '</small></div>' +
    '<div class="lvl2-region"><b>' + esc(PRACTICE_REGIONS[region.id]) + '</b><span>' + esc(REGION_NATIVE[region.id] || '') + '</span></div>' + art + '</div>' +
    '<div class="today-card"><div class="today-title">Сделано <span>сегодня</span></div><b class="today-num">' + (stats.days[dayKey()] || 0) + '</b><small>Упражнений</small></div>';
}

function openCabinet(){
  $('cabinet-head').innerHTML = userHead();
  $('cabinet-dash').innerHTML = cabinetDashHTML();
  $('cabinet-reco').innerHTML = recoCard();
  $('cabinet-cats').innerHTML = practiceSkillCards(practiceStats());
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

function openTraining(){ openPracticeLibrary(); }

function openPracticeLibrary(filter = 'all'){
  const region = Object.hasOwn(PRACTICE_REGIONS, filter) ? PRACTICE_REGIONS[filter] : null;
  const skill = skillById(filter);
  const title = region || skill?.name || (Object.hasOwn(PRACTICE_BLOCKS, filter) ? PRACTICE_BLOCKS[filter] : 'Упражнения');
  const entries = PRACTICES.filter(item => filter === 'all' || item.block === filter || item.skill === filter || item.region === filter);
  $('train-head').innerHTML = userHead();
  $('train-reco').innerHTML = recoCard();
  $('train-map-art').innerHTML = miniRussia();
  renderCarousel();
  const list = $('train-catalog');
  list.innerHTML = '<h2 class="section-title">' + esc(title) + '</h2>';
  const controls = h('div', 'practice-filters');
  for(const [key, label] of Object.entries({ all:'Все', ...PRACTICE_BLOCKS })){
    const button = practiceButton(label, () => openPracticeLibrary(key), 'practice-choice');
    button.setAttribute('aria-pressed', String(key === filter));
    controls.append(button);
  }
  list.append(controls);
  const groups = new Set(entries.map(item => item.block));
  if(!entries.length) list.append(h('p', 'task-q', 'Для этого региона упражнения пока не добавлены.'));
  for(const group of groups){
    if(groups.size > 1) list.append(h('h3', 'practice-group-title', esc(PRACTICE_BLOCKS[group])));
    const cards = h('div', 'practice-catalog');
    for(const item of entries.filter(entry => entry.block === group)){
      const card = practiceButton('', () => openPractice(item.id, { filter }), 'practice-list-card');
      card.innerHTML = '<small>' + esc(item.region ? PRACTICE_REGIONS[item.region] : skillById(item.skill).name) +
        ' · ' + esc(item.duration) + '</small><b>' + esc(item.title) + '</b>';
      cards.append(card);
    }
    list.append(cards);
  }
  go('screen-train', { filter });
  if(filter !== 'all') list.scrollIntoView({ block:'start' });
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

function practiceSkillCards(stats){
  return PRACTICE_SKILLS.map(skill => '<article class="skill-card"><h2><button type="button" onclick="openPracticeLibrary(&quot;' +
    skill.id + '&quot;)">' + esc(skill.name) + ' <b>' + (stats.counts[skill.id] || 0) + '</b></button></h2>' +
    '<div class="skill-examples">' + skill.examples.map(id => '<button type="button" onclick="openPractice(&quot;' +
    id + '&quot;)">' + esc(practiceById(id).title) + '</button>').join('') + '</div><p>' + esc(skill.desc) + '</p></article>').join('');
}

function radarHTML(stats){
  const labels = [
    [160,29,'middle'], [268,119,'start'], [228,259,'start'],
    [92,259,'end'], [52,119,'end'],
  ];
  const values = PRACTICE_SKILLS.map(skill => stats.counts[skill.id] || 0);
  const point = (i, ratio) => {
    const a = i * Math.PI * 2 / 5 - Math.PI / 2;
    return [160 + Math.cos(a) * 103 * ratio, 146 + Math.sin(a) * 103 * ratio].map(n => n.toFixed(2)).join(',');
  };
  const points = ratios => ratios.map((ratio, i) => point(i, ratio)).join(' ');
  // Общая шкала без верхнего предела: ось растёт только при выполнении её упражнений.
  const progress = values.map(value => value / (value + 4));
  const markers = progress.map((ratio, i) => {
    if(!ratio) return '';
    const [x,y] = point(i, ratio).split(',');
    return '<circle class="radar-marker" cx="' + x + '" cy="' + y + '" r="3.2"><title>' +
      esc(PRACTICE_SKILLS[i].name) + ' · ' + values[i] + '</title></circle>';
  }).join('');
  return '<svg viewBox="-18 0 356 277" role="img" aria-labelledby="radar-title radar-desc">' +
    '<title id="radar-title">Практика по пяти навыкам</title><desc id="radar-desc">' +
    PRACTICE_SKILLS.map((skill, i) => esc(skill.name) + ' ' + values[i]).join(', ') + '</desc>' +
    [.25,.5,.75,1].map(ratio => '<polygon class="radar-grid" points="' + points(values.map(() => ratio)) + '"/>').join('') +
    labels.map((_, i) => { const [x, y] = point(i, 1).split(','); return '<line class="radar-grid" x1="160" y1="146" x2="' + x + '" y2="' + y + '"/>'; }).join('') +
    '<polygon class="radar-data" points="' + points(progress) + '"/>' +
    markers + labels.map(([x, y, anchor], i) => '<text x="' + x + '" y="' + y + '" text-anchor="' + anchor + '">' + esc(PRACTICE_SKILLS[i].name) + '</text>').join('') +
    '</svg>';
}

function renderPracticeStats(stats = practiceStats()){
  const level = practiceLevel(stats);
  const days = Object.keys(stats.days).length;
  const total = Object.values(stats.counts).reduce((sum, count) => sum + count, 0);
  $('stats-levels').innerHTML = REGION_LEVELS.map((region, i) => {
    const opened = i < level;
    const name = PRACTICE_REGIONS[region.id];
    const content = '<img src="' + esc(regionArt(region.id)) + '" alt="">' +
      '<b>' + (i + 1) + ' уровень</b>' + (opened ? '' : '<span class="level-lock">' +
      '<svg viewBox="0 0 32 36" aria-hidden="true"><rect x="5" y="14" width="22" height="18" rx="3"/><path d="M10 14V9a6 6 0 0 1 12 0v5"/><circle cx="16" cy="21" r="2"/><path d="M16 23v4"/></svg></span>');
    const label = (i + 1) + ' уровень, ' + name + (opened ? '' : ', откроется после ' + region.days + ' дней практики');
    return '<button type="button" class="level-tile' + (opened ? '' : ' is-locked') + '" aria-label="' + esc(label) +
      '" title="' + esc(label) + '"' + (opened ? ' onclick="openPracticeLibrary(&quot;' + region.id + '&quot;)"' : ' aria-disabled="true"') + '>' + content + '</button>';
  }).join('');
  $('stats-radar').innerHTML = radarHTML(stats);
  $('practice-totals').innerHTML = '<div><b>' + total + '</b><span>Упражнений выполнено</span></div>' +
    '<div><b>' + days + '</b><span>Дней с практикой</span></div>';
  $('practice-tallies').innerHTML = PRACTICE_SKILLS.map(skill => '<tr><th scope="row">' + esc(skill.name) +
    '</th><td>' + (stats.counts[skill.id] || 0) + '</td></tr>').join('');
  $('stats-skills').innerHTML = practiceSkillCards(stats);
}
function openStats(){
  $('stats-head').innerHTML = userHead();
  renderPracticeStats();
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
  $('me-nick').textContent = p.nick.toUpperCase();
  $('me-lvl').textContent = practiceLevel();
  $('me-goal').textContent = g ? g.name : 'не выбрана';
  $('set-fx').checked = sfx.state.fx;
  go('screen-me');
}

/* ---------- ссылка для друга ---------- */
function openFriendDialog(){
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  const local = url.protocol === 'file:' || ['localhost','127.0.0.1','[::1]','0.0.0.0'].includes(url.hostname);
  $('friend-url').value = url.href;
  $('friend-local').hidden = !local;
  $('friend-status').textContent = '';
  $('friend-dialog').showModal();
}

async function copyFriendUrl(){
  const field = $('friend-url');
  const status = $('friend-status');
  try{
    await navigator.clipboard.writeText(field.value);
    status.textContent = 'Ссылка скопирована.';
  }catch{
    field.focus();
    field.select();
    let copied = false;
    try{ copied = document.execCommand('copy'); }catch{}
    status.textContent = copied ? 'Ссылка скопирована.' : 'Ссылка выделена. Скопируй её через меню браузера.';
  }
}

/* ---------- запуск ---------- */
function initScreens(){
  renderMascot('splash-mascot', 'neutral', 'cap');
  $('friend-btn').addEventListener('click', openFriendDialog);
  $('friend-copy').addEventListener('click', copyFriendUrl);
  window.addEventListener('popstate', () => { if($('friend-dialog').open) $('friend-dialog').close(); });
  window.addEventListener('practice:recorded', event => renderPracticeStats(event.detail));
  window.addEventListener('storage', event => {
    if(event.key === STATS_KEY || event.key === null) renderPracticeStats();
  });
  $('welcome-yes').addEventListener('click', onWelcomeYes);
  $('welcome-try').addEventListener('click', () => openPractice(TRIAL_PRACTICE.id, { demo:true }));
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
