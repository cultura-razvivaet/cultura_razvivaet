/* Общие помощники для упражнений: поле ответа, форма с несколькими полями,
   таймеры, символы узоров. Подключается перед остальными js/tasks/*. */

/* поле ответа с проверкой по списку допустимых; две попытки */
function answerInput(ctx, o){
  const st = ctx.stage;
  if(o.before) st.appendChild(h('div', 'task-before', o.before));
  const inp = h('input', 'task-input');
  inp.type = 'text'; inp.autocomplete = 'off'; inp.autocapitalize = 'off'; inp.spellcheck = false;
  inp.setAttribute('aria-label', 'Твой ответ'); inp.placeholder = o.placeholder || 'Введи ответ';
  if(o.inputmode) inp.inputMode = o.inputmode;
  st.appendChild(inp);
  ctx.enableCheck(false);
  let tries = 0;
  inp.addEventListener('input', ()=> ctx.enableCheck(inp.value.trim().length > 0));
  inp.addEventListener('keydown', e=>{ if(e.key === 'Enter') onTaskCheck(); });
  setTimeout(()=> inp.focus(), 50);
  ctx.setCheck(()=>{
    const v = inp.value.trim(); if(!v) return null;
    const ok = o.test(v);
    if(ok){ inp.classList.add('correct'); inp.readOnly = true; return { ok:true, correct:1, total:1, good: o.good || ['Ответ верный.'], model: o.model }; }
    tries++; inp.classList.add('wrong'); setTimeout(()=> inp.classList.remove('wrong'), 600);
    if(tries >= (o.attempts || 2)){
      inp.readOnly = true;
      return { ok:false, correct:0, total:1, improve:[o.miss || 'Ответ не совпал с эталоном.'], model:o.model, recs:o.recs || [] };
    }
    return { retry:true, msg: o.retryMsg || 'Пока неверно — есть ещё одна попытка.' };
  });
  return inp;
}

/* список полей-текстов; review(values) -> результат */
function textForm(ctx, o){
  const st = ctx.stage;
  if(o.before) st.appendChild(h('div', 'task-before', o.before));
  const wrap = h('div', 'free');
  const inputs = (o.fields || [{ label:'', rows:5 }]).map((f, i)=>{
    const lab = f.label ? h('label', 'field-label') : null;
    if(lab){ lab.textContent = f.label; lab.htmlFor = 'tf' + i; wrap.appendChild(lab); }
    const el = f.rows === 1 ? h('input', 'task-input') : h('textarea', 'task-input task-area');
    if(f.rows && f.rows > 1) el.rows = f.rows;
    el.id = 'tf' + i; el.placeholder = f.placeholder || 'Введи ответ'; el.autocomplete = 'off';
    el.addEventListener('input', ()=> ctx.enableCheck(ready()));
    wrap.appendChild(el); return el;
  });
  const ready = ()=> inputs.every((el, i)=> el.value.trim().length >= ((o.fields && o.fields[i] && o.fields[i].min) || 1));
  st.appendChild(wrap);
  ctx.enableCheck(false);
  ctx.setCheck(()=>{
    if(!ready()) return null;
    const res = o.review(inputs.map(i => i.value.trim()));
    if(res && !res.retry) inputs.forEach(i => i.readOnly = true);
    return res;
  });
  return inputs;
}
function listItems(text){ return String(text).split(/\n|;|•|(?:^|\s)\d+[.)]\s/).map(s => s.trim().replace(/^[-–—]\s*/, '')).filter(s => s.length > 1); }

/* символы народных узоров для судоку */
const SYMBOL_SETS = {
  'Цифры':   ['1', '2', '3', '4', '5', '6'],
  'Базовый': ['◆', '〰', '●', '✚', '⌁', '✿'],
  'Северный': ['◆', 'Ψ', '↟', '⌁', '⋁', '●'],
  'Волжский': ['❁', '❦', '◆', '〰', '⚘', '●'],
};
const MOTIFS = ['ромб', 'волна', 'круг', 'крест', 'зигзаг', 'цветок', 'ёлочка', 'звезда', 'треугольник', 'лист', 'ягода', 'рога'];

/* эмодзи для предметов коллажа и показа (запасной вариант, пока нет картинок) */
const ITEM_EMOJI = {
  'церковь с куполами':'⛪','папаха':'🧢','звезда':'⭐','изба с наличниками':'🏡','самовар':'🫖','чашка':'☕','лапти':'👞','лодка':'⛵','гора':'⛰️','узорный платок':'🧣','рушник':'🧵','олень':'🦌','туесок':'🪣','велосипед':'🚲','курай':'🎶','матрёшка':'🪆','сарафан':'👗','книга':'📖','хохломская ложка':'🥄','ключ':'🔑','юрта':'⛺','лошадь':'🐴','окно':'🪟','прялка':'🧶','воздушный шар':'🎈','чум':'🏕️','чак-чак':'🍯','блины':'🥞','тюбетейка':'🎓','гжельская чашка':'🍵','облако':'☁️','маяк':'🗼','коромысло':'⚖️','зонт':'☂️','поезд':'🚂','мост':'🌉','дерево':'🌳','Жар-птица':'🦚','цветок':'🌸','нарты':'🛷','гармонь':'🪗','каравай':'🍞','часы':'🕰️','кокошник':'👑','бурка':'🧥','хомус':'🪕','пряник':'🍪','балалайка':'🪕','пельмени':'🥟','солнце':'☀️','луна':'🌙','река':'🌊','птица':'🕊️','чайка':'🕊️','колокольчик':'🔔','бубен':'🥁','сапоги':'🥾','шаль':'🧣','ромашка':'🌼','ягода':'🍓','печь':'🔥','корзина':'🧺','телега':'🛒','мельница':'🌾','костёр':'🔥','ковёр':'🟥','рыба':'🐟','медведь':'🐻','конь':'🐴','месяц':'🌙','снег':'❄️','ёлка':'🎄','хлеб':'🍞','кувшин':'🏺','кумган':'🏺','валенки':'🧦','пояс':'🎀','нож':'🔪','колесо':'☸️','ворота':'⛩️','петух':'🐓','кот':'🐈','сова':'🦉'
};
function itemGlyph(name){
  const k = Object.keys(ITEM_EMOJI).find(x => x.toLowerCase() === name.toLowerCase());
  return k ? ITEM_EMOJI[k] : null;
}

/* демо-задание: ассоциация/загадка с иллюстрациями (картинка assets/demo-*.png, иначе эмодзи) */
registerKind('demo_assoc', { render(t, ctx){
  const pics = (t.pics || []).map(p => '<span class="demo-pic' + (p.wide ? ' wide' : '') + '"><img src="' + esc(assetUrl(p.src)) + '" alt="' + esc(p.alt) + '" data-emoji="' + p.emoji + '"></span>').join('');
  const before = '<div class="demo-top">' + (t.sub ? '<p class="demo-sub">' + esc(t.sub) + '</p>' : '') + '<div class="demo-pics">' + pics + '</div></div>';
  answerInput(ctx, { before, test: v => assist.inList(v, t.accept), model:t.okText, miss:'Правильный ответ: ' + t.accept[0] + '.' });
  ctx.stage.querySelectorAll('.demo-pic img').forEach(im => { im.onerror = ()=>{ const e = document.createElement('span'); e.className = 'demo-emoji'; e.textContent = im.dataset.emoji; im.replaceWith(e); }; });
}});
