/* Творчество: создание картин (коллаж). Предметы из архива и простые фигуры
   перетаскиваются на холст; можно менять размер, поворот, отражение и цвет. */

const COLOR_HEX = {
  'красный':'#D7263D', 'оранжевый':'#F58220', 'жёлтый':'#F2C500', 'коричневый':'#7B4B2A', 'розовый':'#F29CC0', 'фиолетовый':'#7B3FA0',
  'чёрный':'#1C1C1C', 'золотой':'#D4A017', 'золотистый':'#D4A017', 'золотисто-жёлтый':'#E2B100', 'белый':'#FFFFFF', 'голубой':'#7CC3F0', 'серый':'#9A9A9A',
  'светло-серый':'#CFCFCF', 'серебристый':'#B8BEC6', 'синий':'#2751B3', 'зелёный':'#2E8B3D', 'охристый':'#C9922B', 'бирюзовый':'#2FB5B0', 'бордовый':'#7A1F2B', 'лиловый':'#B58BD6',
};
const DEFAULT_PALETTE = ['красный', 'оранжевый', 'жёлтый', 'зелёный', 'голубой', 'синий', 'фиолетовый', 'чёрный', 'белый'];

registerKind('collage', { render(t, ctx){
  const colors = (t.gamma ? t.gamma.colors : DEFAULT_PALETTE).filter(c => COLOR_HEX[c]);
  let cur = colors[0] || 'красный', bg = '#FFFFFF', sel = null, z = 1;
  const used = new Set(), usedColors = new Set(), items = [];
  const wrap = h('div', 'collage');
  const side = h('div', 'col-side'), board = h('div', 'col-board'), tools = h('div', 'col-tools');
  side.innerHTML = '<h3>Предметы</h3>';
  const addEl = (name, glyph, shape)=>{
    const el = h('div', 'col-item' + (shape ? ' shape ' + shape : ''), shape ? '' : '<span class="g">' + (glyph || '') + '</span><span class="n">' + esc(name) + '</span>');
    el.tabIndex = 0; el.setAttribute('role', 'button'); el.setAttribute('aria-label', name);
    el.style.left = (15 + Math.random() * 55) + '%'; el.style.top = (10 + Math.random() * 55) + '%'; el.style.zIndex = ++z;
    el._s = 1; el._r = 0; el._f = 1; el._name = name; el._shape = shape || null;
    if(shape){ el.style.background = COLOR_HEX[cur]; usedColors.add(cur); if(shape === 'line') el.style.background = COLOR_HEX[cur]; }
    if(!shape) used.add(name);
    apply(el); board.appendChild(el); items.push(el); select(el);
    let drag = null;
    el.addEventListener('pointerdown', e=>{ select(el); const r = board.getBoundingClientRect(); drag = { dx: e.clientX - (el.offsetLeft), dy: e.clientY - (el.offsetTop) }; el.setPointerCapture(e.pointerId); el.style.zIndex = ++z; e.preventDefault(); });
    el.addEventListener('pointermove', e=>{ if(!drag) return; const r = board.getBoundingClientRect(); const x = Math.min(r.width - 20, Math.max(-20, e.clientX - drag.dx)), y = Math.min(r.height - 20, Math.max(-20, e.clientY - drag.dy)); el.style.left = (x / r.width * 100) + '%'; el.style.top = (y / r.height * 100) + '%'; });
    ['pointerup', 'pointercancel'].forEach(ev => el.addEventListener(ev, ()=>{ drag = null; }));
    el.addEventListener('keydown', e=>{ const st = 2; if(e.key === 'Delete' || e.key === 'Backspace') del(); const m = { ArrowLeft:[-st, 0], ArrowRight:[st, 0], ArrowUp:[0, -st], ArrowDown:[0, st] }[e.key]; if(m){ el.style.left = (parseFloat(el.style.left) + m[0]) + '%'; el.style.top = (parseFloat(el.style.top) + m[1]) + '%'; e.preventDefault(); } });
    ctx.enableCheck(true);
  };
  const apply = el => { el.style.transform = 'rotate(' + el._r + 'deg) scale(' + (el._s * el._f) + ', ' + el._s + ')'; };
  function select(el){ if(sel) sel.classList.remove('sel'); sel = el; if(el) el.classList.add('sel'); }
  function del(){ if(!sel) return; sel.remove(); items.splice(items.indexOf(sel), 1); if(!sel._shape && !items.some(i => i._name === sel._name)) used.delete(sel._name); sel = null; }
  t.items.forEach(n => { const b = h('button', 'btn-ghost col-add'); b.type = 'button'; b.innerHTML = (itemGlyph(n) || '▣') + ' ' + esc(n); b.onclick = ()=> addEl(n, itemGlyph(n) || '▣'); side.appendChild(b); });
  side.appendChild(h('h3', null, 'Фигуры'));
  [['circle', 'Круг'], ['tri', 'Треугольник'], ['square', 'Квадрат'], ['diamond', 'Ромб'], ['oval', 'Овал'], ['line', 'Линия']].forEach(([k, n])=>{ const b = h('button', 'btn-ghost col-add'); b.type = 'button'; b.textContent = n; b.onclick = ()=> addEl(n, '', k); side.appendChild(b); });
  const sw = h('div', 'pad-bar'); sw.setAttribute('aria-label', 'Цвет');
  colors.forEach(c => { const b = h('button', 'swatch' + (c === cur ? ' on' : '')); b.type = 'button'; b.style.background = COLOR_HEX[c]; b.title = c; b.setAttribute('aria-label', c);
    b.onclick = ()=>{ cur = c; sw.querySelectorAll('.swatch').forEach(x => x.classList.toggle('on', x === b)); if(sel && sel._shape){ sel.style.background = COLOR_HEX[c]; usedColors.add(c); } }; sw.appendChild(b); });
  const bgb = h('button', 'btn-ghost'); bgb.type = 'button'; bgb.textContent = 'Залить фон цветом'; bgb.onclick = ()=>{ bg = COLOR_HEX[cur]; board.style.background = bg; usedColors.add(cur); };
  const mk = (txt, fn)=>{ const b = h('button', 'btn-ghost'); b.type = 'button'; b.textContent = txt; b.onclick = ()=>{ if(sel){ fn(sel); apply(sel); } }; return b; };
  tools.append(sw, bgb, mk('Больше', e => e._s = Math.min(3, e._s * 1.2)), mk('Меньше', e => e._s = Math.max(0.3, e._s / 1.2)), mk('Повернуть', e => e._r = (e._r + 15) % 360), mk('Отразить', e => e._f *= -1));
  const dl = h('button', 'btn-ghost'); dl.type = 'button'; dl.textContent = 'Удалить'; dl.onclick = del; tools.appendChild(dl);
  const title = h('input', 'task-input'); title.placeholder = 'Название картины' + (t.title ? ' (тема: «' + t.title + '»)' : ''); title.setAttribute('aria-label', 'Название картины');
  const info = [];
  if(t.gamma) info.push('Гамма «' + t.gamma.name + '»: ' + t.gamma.colors.join(', ') + '.');
  if(t.shape) info.push('Форма: ' + t.shape + '.');
  wrap.append(side, h('div', 'col-main')); wrap.lastChild.append(h('div', 'task-line', esc(info.join(' ')) || 'Соберите картину по теме.'), board, tools, title);
  ctx.stage.appendChild(wrap); ctx.enableCheck(false);
  ctx.setCheck(()=>{
    if(!items.length) return null;
    const need = Math.min(5, t.items.length), nUsed = t.items.filter(n => used.has(n)).length;
    const gm = t.gamma ? t.gamma.colors.filter(c => usedColors.has(c)).length : 0, gNeed = t.gamma ? Math.max(1, Math.ceil(t.gamma.colors.length / 2)) : 0;
    const good = [], improve = [], hasTitle = title.value.trim().length > 2;
    (nUsed >= need ? good : improve).push('Использовано предметов из набора: ' + nUsed + ' из ' + t.items.length + (nUsed >= need ? '.' : ' — нужно не меньше ' + need + '.'));
    if(t.gamma) (gm >= gNeed ? good : improve).push('Цветов гаммы использовано: ' + gm + ' из ' + t.gamma.colors.length + '.');
    (hasTitle ? good : improve).push(hasTitle ? 'У картины есть название.' : 'Дайте картине название, связанное с темой.');
    if(t.shape) improve.push('Форма «' + t.shape + '» не проверяется автоматически — сверьтесь сами: все предметы упрощены до неё?');
    const ok = nUsed >= need && (!t.gamma || gm >= gNeed) && hasTitle;
    const score = Math.round((Math.min(1, nUsed / need) * 50) + (t.gamma ? Math.min(1, gm / gNeed) * 30 : 30) + (hasTitle ? 20 : 0));
    return { ok, score, correct:nUsed, total:t.items.length, good, improve, model: t.crit ? 'Критерии: ' + esc(t.crit) : '', recs:['Выберите композиционный центр — самый крупный предмет.', 'Свяжите предметы одной историей: кто, где и зачем.'] };
  });
}});
