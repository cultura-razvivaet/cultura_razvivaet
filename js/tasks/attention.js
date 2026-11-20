/* Концентрация внимания: судоку, филворды, секундная стрелка, обратный отсчёт,
   квадрат, подсчёт, отличия, таблица Шульте, вычёркивание, корректура. */

/* ---------- судоку 6×6 ---------- */
registerKind('sudoku', { render(t, ctx){
  const N = 6, g = t.grid.map(r => r.slice());
  const notes = Array.from({ length: N }, ()=> Array.from({ length: N }, ()=> new Set()));
  let sel = null, noteMode = false, setName = 'Цифры';
  const wrap = h('div', 'sud-wrap'), grid = h('div', 'sudoku6'), pad = h('div', 'sud-pad'), tools = h('div', 'sud-tools');
  const cells = [];
  const sym = v => v ? SYMBOL_SETS[setName][v - 1] : '';
  for(let r = 0; r < N; r++) for(let c = 0; c < N; c++){
    const b = h('button', 'cell sud6 ' + (t.grid[r][c] ? 'fixed ' : '') + (c === 2 ? 'bR ' : '') + (r === 1 || r === 3 ? 'bB' : ''));
    b.type = 'button';
    b.addEventListener('click', ()=>{ sel = [r, c]; paint(); });
    cells.push(b); grid.appendChild(b);
  }
  const nameCell = (r, c)=> 'Строка ' + (r + 1) + ', столбец ' + (c + 1);
  function paint(){
    cells.forEach((b, i)=>{
      const r = Math.floor(i / N), c = i % N, v = g[r][c];
      b.classList.toggle('sel', !!sel && sel[0] === r && sel[1] === c);
      b.classList.toggle('peer', !!sel && !(sel[0] === r && sel[1] === c) && (sel[0] === r || sel[1] === c));
      const sv = sel ? g[sel[0]][sel[1]] : 0;
      b.classList.toggle('same', !!sv && v === sv && !(sel[0] === r && sel[1] === c));
      if(v) b.textContent = sym(v);
      else if(notes[r][c].size) b.innerHTML = '<span class="notes">' + [...notes[r][c]].sort().map(sym).join(' ') + '</span>';
      else b.textContent = '';
      b.setAttribute('aria-label', nameCell(r, c) + (v ? ', ' + v : ', пусто'));
    });
  }
  function put(v){
    if(!sel) return; const [r, c] = sel; if(t.grid[r][c]) return;
    if(noteMode && v){ notes[r][c].has(v) ? notes[r][c].delete(v) : notes[r][c].add(v); g[r][c] = 0; }
    else { g[r][c] = v; notes[r][c].clear(); }
    cells.forEach(b => b.classList.remove('wrong')); paint();
    ctx.enableCheck(g.every(row => row.every(x => x > 0)));
  }
  for(let v = 1; v <= N; v++){ const b = h('button', 'opt pad-btn'); b.type = 'button'; b.dataset.v = v; b.addEventListener('click', ()=> put(v)); pad.appendChild(b); }
  const del = h('button', 'btn-ghost'); del.type = 'button'; del.textContent = 'Стереть'; del.onclick = ()=> put(0);
  const nb = h('button', 'btn-ghost'); nb.type = 'button'; nb.textContent = 'Заметки: выкл';
  nb.onclick = ()=>{ noteMode = !noteMode; nb.textContent = 'Заметки: ' + (noteMode ? 'вкл' : 'выкл'); nb.classList.toggle('on', noteMode); };
  if(t.lvl === 2){ nb.disabled = true; nb.textContent = 'Заметки недоступны'; }
  const selSym = h('select', 'task-input sym-select'); selSym.setAttribute('aria-label', 'Набор символов');
  Object.keys(SYMBOL_SETS).forEach(k => { const o = h('option'); o.textContent = k === 'Цифры' ? 'Цифры' : 'Узоры: ' + k; o.value = k; selSym.appendChild(o); });
  selSym.onchange = ()=>{ setName = selSym.value; padLabels(); paint(); };
  function padLabels(){ pad.querySelectorAll('.pad-btn').forEach(b => b.textContent = sym(+b.dataset.v)); }
  tools.append(del, nb, selSym);
  wrap.append(grid, pad, tools); ctx.stage.appendChild(wrap);
  padLabels(); paint(); ctx.enableCheck(false);
  ctx.addButton('Подсказка', ()=>{
    // показываем логику, а не ответ: строка/столбец/блок с единственной пустой клеткой или клетка с одним кандидатом
    const cand = (r, c)=> { const used = new Set(); for(let i = 0; i < N; i++){ used.add(g[r][i]); used.add(g[i][c]); } const br = r - r % 2, bc = c - c % 3; for(let i = 0; i < 2; i++) for(let j = 0; j < 3; j++) used.add(g[br + i][bc + j]); return [1,2,3,4,5,6].filter(v => !used.has(v)); };
    for(let r = 0; r < N; r++){ const e = g[r].filter(v => !v).length; if(e === 1){ const miss = [1,2,3,4,5,6].find(v => !g[r].includes(v)); return ctx.hint('в строке ' + (r + 1) + ' не хватает ' + sym(miss) + '.'); } }
    for(let r = 0; r < N; r++) for(let c = 0; c < N; c++) if(!g[r][c]){ const k = cand(r, c); if(k.length === 1) return ctx.hint('в клетке (строка ' + (r + 1) + ', столбец ' + (c + 1) + ') остаётся единственный кандидат: ' + sym(k[0]) + '.'); }
    ctx.hint('ищите клетку, где строка, столбец и блок уже содержат почти все цифры.');
  });
  ctx.addButton('Начать заново', ()=>{ for(let r = 0; r < N; r++) for(let c = 0; c < N; c++){ g[r][c] = t.grid[r][c]; notes[r][c].clear(); } cells.forEach(b => b.classList.remove('wrong')); paint(); ctx.enableCheck(false); ctx.say('Сетка сброшена.'); });
  ctx.setCheck(()=>{
    if(!g.every(row => row.every(x => x > 0))) return null;
    const bad = new Set(), msgs = [];
    for(let i = 0; i < N; i++){
      const row = g[i], col = g.map(r => r[i]);
      if(new Set(row).size < N){ msgs.push('в строке ' + (i + 1) + ' есть повтор'); row.forEach((_, c)=> bad.add(i * N + c)); }
      if(new Set(col).size < N){ msgs.push('в столбце ' + (i + 1) + ' есть повтор'); col.forEach((_, r)=> bad.add(r * N + i)); }
    }
    for(let br = 0; br < N; br += 2) for(let bc = 0; bc < N; bc += 3){
      const vals = []; for(let i = 0; i < 2; i++) for(let j = 0; j < 3; j++) vals.push(g[br + i][bc + j]);
      if(new Set(vals).size < N){ msgs.push('в блоке 2×3 (строки ' + (br + 1) + '–' + (br + 2) + ', столбцы ' + (bc + 1) + '–' + (bc + 3) + ') есть повтор'); for(let i = 0; i < 2; i++) for(let j = 0; j < 3; j++) bad.add((br + i) * N + bc + j); }
    }
    if(bad.size){
      cells.forEach((b, i)=> { if(bad.has(i) && !t.grid[Math.floor(i / N)][i % N]) b.classList.add('wrong'); });
      return { retry:true, msg:'Нарушены правила: ' + msgs.slice(0, 3).join('; ') + '. Исправь значения.' };
    }
    cells.forEach(b => b.classList.add('done'));
    return { ok:true, good:['Судоку решено: повторов нет в строках, столбцах и блоках.', 'Заполнено клеток: ' + t.grid.flat().filter(v => !v).length + '.'],
      recs:['Ищите клетку с единственным кандидатом — так решаются почти все сетки.'].concat(ctx.mistakes ? ['Перед проверкой пройдитесь по строкам и столбцам: так видны повторы.'] : []) };
  });
}});

/* ---------- филворд (змейкой) ---------- */
registerKind('wordsearch', { render(t, ctx){
  const R = t.grid.length, C = t.grid[0].length, found = new Set();
  let path = [];
  const cols = 'АБВГДЕЖЗИК'.split('');
  const wrap = h('div', 'ws-wrap'), grid = h('div', 'ws-grid'), words = h('div', 'ws-words'), cur = h('div', 'ws-cur', '&nbsp;');
  grid.style.setProperty('--cols', C);
  const cells = [];
  for(let r = 0; r < R; r++) for(let c = 0; c < C; c++){
    const b = h('button', 'cell ws-cell', esc(t.grid[r][c])); b.type = 'button';
    b.setAttribute('aria-label', cols[c] + (r + 1) + ' ' + t.grid[r][c]);
    b.addEventListener('click', ()=> tap(r, c)); cells.push(b); grid.appendChild(b);
  }
  const idx = (r, c)=> r * C + c;
  function tap(r, c){
    const i = idx(r, c);
    if(cells[i].classList.contains('found')) return;
    const at = path.findIndex(p => p[0] === r && p[1] === c);
    if(at >= 0){ path = path.slice(0, at); }                       // нажатие на выбранную клетку отменяет хвост
    else {
      const last = path[path.length - 1];
      if(last && Math.abs(last[0] - r) + Math.abs(last[1] - c) !== 1){ path = []; }     // не сосед — начинаем заново
      path.push([r, c]);
    }
    paint();
  }
  function paint(){
    cells.forEach(b => b.classList.remove('sel'));
    path.forEach(p => cells[idx(p[0], p[1])].classList.add('sel'));
    cur.textContent = path.length ? path.map(p => t.grid[p[0]][p[1]]).join('') : ' ';
  }
  function list(){
    words.innerHTML = '';
    t.words.forEach(w => { const s = h('span', 'ws-word' + (found.has(w) ? ' found' : '')); s.textContent = w + (found.has(w) && t.gloss[w] ? ' — ' + t.gloss[w] : ''); words.appendChild(s); });
  }
  const take = h('button', 'btn-primary'); take.type = 'button'; take.textContent = 'Принять слово';
  take.onclick = ()=>{
    if(!path.length) return;
    const w = path.map(p => t.grid[p[0]][p[1]]).join('');
    if(t.words.includes(w) && !found.has(w)){
      found.add(w); path.forEach(p => cells[idx(p[0], p[1])].classList.add('found')); path = []; paint(); list(); sfx.ok();
      ctx.setProgress(found.size / t.words.length);
      if(found.size === t.words.length){
        ctx.finish({ ok:true, correct:found.size, total:t.words.length, good:['Найдены все слова: ' + t.words.join(', ') + '.'], recs:['Сначала ищите редкие буквы — они задают начало слова.'] });
      }
    } else { ctx.mistake(); path = []; paint(); ctx.say('Такого слова в списке нет — попробуй другой путь.', 'bad'); sfx.bad(); }
  };
  const reset = h('button', 'btn-ghost'); reset.type = 'button'; reset.textContent = 'Сбросить выбор'; reset.onclick = ()=>{ path = []; paint(); };
  wrap.append(words, grid, cur, h('div', 'task-actions center')); wrap.lastChild.append(reset, take);
  ctx.stage.appendChild(wrap); list(); ctx.setProgress(0); ctx.hideCheck();
  ctx.addButton('Подсказка', ()=>{
    const w = t.words.find(x => !found.has(x)); if(!w) return;
    for(let r = 0; r < R; r++) for(let c = 0; c < C; c++) if(t.grid[r][c] === w[0]){ cells[idx(r, c)].classList.add('hintcell'); setTimeout(()=> cells[idx(r, c)].classList.remove('hintcell'), 2500); }
    ctx.hint('слово «' + w + '» начинается с буквы «' + w[0] + '» — подсвечены такие клетки.');
  });
  ctx.addButton('Закончить', ()=>{
    ctx.finish({ ok:false, correct:found.size, total:t.words.length, improve:['Найдено слов: ' + found.size + ' из ' + t.words.length + '.'], model:'Слова: ' + t.words.join(', ') + '.', recs:['Следите за соседями по вертикали и горизонтали: по диагонали путь не идёт.'] });
  });
}});

/* ---------- секундная стрелка ---------- */
registerKind('secondhand', { render(t, ctx){
  const total = t.minutes * 60, tk = TK;
  let restarts = 0, over = false, flashT = [], flashes = 0;
  const box = h('div', 'clock-box');
  box.innerHTML = '<svg class="clock" viewBox="-110 -110 220 220" aria-label="Часы с секундной стрелкой" role="img"><circle r="100" class="clock-face"/><g class="ticks"></g><line id="hand" x1="0" y1="8" x2="0" y2="-88" class="hand"/><circle r="5" class="hub"/></svg>' +
    '<div class="clock-info"><span id="clk-left"></span><span id="clk-rs"></span></div>';
  ctx.stage.appendChild(box);
  const ticks = box.querySelector('.ticks');
  for(let i = 0; i < 60; i++){ const a = i * 6 * Math.PI / 180, l = i % 5 ? 4 : 9; ticks.insertAdjacentHTML('beforeend', '<line x1="' + (Math.sin(a) * (98 - l)).toFixed(1) + '" y1="' + (-Math.cos(a) * (98 - l)).toFixed(1) + '" x2="' + (Math.sin(a) * 98).toFixed(1) + '" y2="' + (-Math.cos(a) * 98).toFixed(1) + '"/>'); }
  const hand = box.querySelector('#hand'), left = box.querySelector('#clk-left'), rs = box.querySelector('#clk-rs');
  if(t.flashes){ for(let i = 0; i < t.flashes; i++) flashT.push((0.15 + Math.random() * 0.7) * total); flashT.sort((a, b)=> a - b); }
  let start = performance.now(), raf;
  function frame(now){
    if(over || trainer.done) return;
    const el = (now - start) / 1000 / tk;
    hand.setAttribute('transform', 'rotate(' + ((el % 60) * 6) + ')');
    const fl = flashT.some(f => el >= f && el < f + 1);
    if(fl && !hand._on){ hand._on = true; flashes++; } if(!fl) hand._on = false;
    hand.classList.toggle('flash', fl);
    left.textContent = 'Осталось ' + fmtTime(Math.max(0, total - el));
    rs.textContent = 'Перезапусков: ' + restarts;
    if(el >= total){ end(); return; }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  ctx.hideCheck(); ctx.timer(total, ()=>{});
  const again = ctx.addButton('Сначала', ()=>{ restarts++; start = performance.now(); flashes = 0; flashT = flashT.map(f => f); ctx.say('Отсчёт начат заново. Это нормально — важно заметить мысль.', 'info'); });
  function end(){
    over = true; cancelAnimationFrame(raf); again.disabled = true;
    ctx.stage.innerHTML = '<p class="task-line">Время вышло.</p>';
    const rate = restarts <= 1 ? 100 : restarts <= 3 ? 75 : 45;
    const base = { total: 1 };
    const finish = (extra)=>{
      const good = [], improve = [], recs = [];
      (restarts <= 1 ? good : restarts <= 3 ? good : improve).push('Перезапусков: ' + restarts + (restarts <= 1 ? ' — отлично.' : restarts <= 3 ? ' — хорошо.' : ' — внимание часто уходило.'));
      if(restarts > 3) recs.push('Повторите завтра и сократите время до 2 минут.');
      else recs.push('Пробуйте удлинять сессию на минуту.');
      ctx.finish(Object.assign({ ok: rate >= 60 && (extra ? extra.ok : true), score: Math.max(0, rate - (extra && !extra.ok ? 25 : 0)), good: good.concat(extra && extra.good || []), improve: improve.concat(extra && extra.improve || []), recs }, {}));
    };
    if(t.ask){
      const f = h('div', 'free');
      f.innerHTML = '<label class="field-label" for="ask">' + esc(t.ask.q) + '</label><input class="task-input" id="ask" inputmode="numeric" autocomplete="off">';
      ctx.stage.appendChild(f);
      ctx.showCheck(true); ctx.enableCheck(true);
      ctx.setCheck(()=>{
        const v = f.querySelector('input').value.trim(); if(!v) return null;
        if(t.ask.selfreport){ const diff = Math.abs(parseInt(v, 10) - restarts); return finishRet({ ok: diff <= 1, good: diff <= 1 ? ['Самоотчёт совпал с числом перезапусков (' + restarts + ').'] : [], improve: diff > 1 ? ['Самоотчёт расходится с числом перезапусков (' + restarts + ') — присмотритесь к себе честнее.'] : [] }); }
        const ok = norm(v) === norm(t.ask.answer);
        return finishRet({ ok, good: ok ? ['Верный счёт: ' + t.ask.answer + '.'] : [], improve: ok ? [] : ['Верный ответ: ' + t.ask.answer + '.'] });
      });
      function finishRet(extra){ const good = [], improve = []; const sc = rate - (!extra.ok ? 25 : 0); (restarts <= 3 ? good : improve).push('Перезапусков: ' + restarts + '.'); return { ok: sc >= 60, score: sc, good: good.concat(extra.good), improve: improve.concat(extra.improve), recs:[restarts > 3 ? 'Повторите завтра и сократите время до 2 минут.' : 'Пробуйте удлинять сессию на минуту.'] }; }
    } else finish();
  }
}});

/* ---------- обратный отсчёт / счёт в уме ---------- */
registerKind('countdown', { render(t, ctx){
  const seq = t.seq; let tries = 0;
  const ta = h('textarea', 'task-input task-area'); ta.rows = 5;
  ta.placeholder = 'Числа через пробел или запятую'; ta.setAttribute('aria-label', 'Числа');
  ctx.stage.append(h('div', 'task-line', 'Считайте в уме, затем введите числа через пробел.'), ta);
  ctx.enableCheck(false); ta.addEventListener('input', ()=> ctx.enableCheck(ta.value.trim().length > 0)); setTimeout(()=> ta.focus(), 50);
  ctx.addButton('Подсказка', ()=> ctx.hint('начало ряда: ' + seq.slice(0, 6).join(', ') + ' …'));
  ctx.setCheck(()=>{
    const arr = (ta.value.match(/-?\d+/g) || []).map(Number); if(!arr.length) return null;
    let i = 0; while(i < arr.length && i < seq.length && arr[i] === seq[i]) i++;
    if(i === seq.length && arr.length === seq.length){ ta.readOnly = true; return { ok:true, correct:seq.length, total:seq.length, good:['Весь ряд верный: ' + seq.length + ' чисел.'], recs:['Считайте «блоками»: так проще не сбиться.'] }; }
    tries++;
    const msg = i < seq.length && i < arr.length ? 'Сбой на ' + (i + 1) + '-м числе (вы назвали ' + arr[i] + '). Вернитесь к началу.' : arr.length < seq.length ? 'Ряд не закончен: введено ' + arr.length + ' из ' + seq.length + ' чисел.' : 'Лишние числа в конце ряда.';
    if(tries >= 3){ ta.readOnly = true; return { ok:false, correct:i, total:seq.length, improve:[msg], model:seq.slice(0, 12).join(', ') + ' … ' + seq.slice(-4).join(', ') + ' (всего ' + seq.length + ').', recs:['Считайте медленнее, проговаривая числа про себя.'] }; }
    return { retry:true, msg };
  });
}});

/* ---------- квадрат (дыхание) ---------- */
registerKind('square', { render(t, ctx){
  const total = t.minutes * 60; let slips = 0, over = false;
  const box = h('div', 'sq-box');
  box.innerHTML = '<svg class="sq" viewBox="0 0 220 220" role="img" aria-label="Квадрат дыхания"><rect x="30" y="30" width="160" height="160" class="sq-frame"/><circle id="sq-dot" r="9" cx="30" cy="190" class="sq-dot"/></svg><div class="sq-phase" id="sq-phase">Вдох</div><div class="sq-count" id="sq-count">1</div><div class="clock-info"><span id="sq-left"></span><span id="sq-sl"></span></div>';
  ctx.stage.appendChild(box);
  const dot = box.querySelector('#sq-dot'), ph = box.querySelector('#sq-phase'), cnt = box.querySelector('#sq-count'), left = box.querySelector('#sq-left'), sl = box.querySelector('#sq-sl');
  const PH = ['Вдох', 'Задержка', 'Выдох', 'Пауза'];
  const path = [[30, 190, 30, 30], [30, 30, 190, 30], [190, 30, 190, 190], [190, 190, 30, 190]];
  let start = performance.now(), raf;
  function frame(now){
    if(over || trainer.done) return;
    const el = (now - start) / 1000 / TK, cyc = el % 16, p = Math.floor(cyc / 4), f = (cyc % 4) / 4, s = path[p];
    dot.setAttribute('cx', s[0] + (s[2] - s[0]) * f); dot.setAttribute('cy', s[1] + (s[3] - s[1]) * f);
    ph.textContent = PH[p]; cnt.textContent = String(Math.floor(cyc % 4) + 1);
    left.textContent = 'Цикл ' + Math.min(Math.floor(el / 16) + 1, total / 16) + ' из ' + (total / 16); sl.textContent = 'Сбоев: ' + slips;
    if(el >= total){ over = true; end(); return; }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame); ctx.hideCheck(); ctx.timer(total, ()=>{});
  ctx.addButton('Сбился', ()=>{ slips++; ctx.say('Сбой записан. Продолжайте с ближайшей стороны.', 'info'); });
  function end(){
    cancelAnimationFrame(raf);
    const good = ['Завершены все ' + (total / 16) + ' циклов.'], improve = [];
    (slips <= 2 ? good : improve).push('Сбоев счёта: ' + slips + '.');
    ctx.finish({ ok: true, score: Math.max(50, 100 - slips * 8), good, improve, recs: [slips > 3 ? 'Начните с 2 минут и увеличивайте время постепенно.' : 'Если дышать неудобно, сократите счёт до 3.'] });
  }
}});

/* ---------- подсчёт в тексте ---------- */
registerKind('count', { render(t, ctx){
  answerInput(ctx, { inputmode:'numeric', test: v => norm(v) === norm(t.answer), model:'Верный ответ: ' + t.answer + '.', miss:'Счёт не совпал: верный ответ — ' + t.answer + '.', recs:['Читайте строку один раз, не возвращаясь, и отмечайте нужные буквы пальцем.'] });
}});

/* ---------- найди отличия ---------- */
registerKind('diff', { render(t, ctx){
  const picked = new Set(); let tries = 0;
  const A = h('p', 'task-line'); A.innerHTML = '<b>А:</b> ' + esc(t.A.join(', '));
  const B = h('div', 'chips'); const bl = h('b', null, 'Б (нажимайте слова с отличиями): ');
  ctx.stage.append(A, bl, B);
  t.B.forEach((w, i)=>{ const b = h('button', 'opt chip'); b.type = 'button'; b.textContent = w; b.setAttribute('aria-pressed', 'false');
    b.onclick = ()=>{ if(trainer.done) return; picked.has(i) ? picked.delete(i) : picked.add(i); b.classList.toggle('selected'); b.setAttribute('aria-pressed', String(picked.has(i))); ctx.enableCheck(picked.size > 0); };
    B.appendChild(b); });
  ctx.enableCheck(false);
  ctx.setCheck(()=>{
    if(!picked.size) return null;
    const right = t.diff.filter(i => picked.has(i)).length, extra = [...picked].filter(i => !t.diff.includes(i)).length;
    if(right === t.diff.length && !extra){ [...B.children].forEach((b, i)=> b.classList.add(t.diff.includes(i) ? 'correct' : '')); return { ok:true, correct:right, total:t.diff.length, good:['Найдены все отличия.'], recs:['Сравнивайте слова парами, слева направо.'] }; }
    tries++;
    if(tries >= 2){ [...B.children].forEach((b, i)=>{ b.classList.remove('selected'); if(t.diff.includes(i)) b.classList.add(picked.has(i) ? 'correct' : 'missed'); else if(picked.has(i)) b.classList.add('wrong'); }); return { ok:false, correct:right, total:t.diff.length, improve:['Найдено ' + right + ' из ' + t.diff.length + ', лишних: ' + extra + '.'], model:t.ans, recs:['Сравнивайте слова парами, слева направо.'] }; }
    return { retry:true, msg:'Найдено верно: ' + right + ' из ' + t.diff.length + ', лишних: ' + extra + '. Попробуй ещё раз.' };
  });
}});

/* ---------- таблица Шульте ---------- */
registerKind('schulte', { render(t, ctx){
  const flat = t.grid.flat(), n = flat.length; let next = 1, errors = 0;
  const info = h('div', 'task-line', 'Найди: <b>1</b>'), grid = h('div', 'grid grid-5');
  ctx.stage.append(info, grid); ctx.hideCheck(); ctx.setProgress(0);
  flat.forEach(v => { const b = h('button', 'cell', String(v)); b.type = 'button';
    b.onclick = ()=>{
      if(trainer.done || b.classList.contains('correct')) return;
      if(v === next){ b.classList.add('correct'); next++; ctx.setProgress((next - 1) / n); if(next > n){ const s = ctx.elapsed(); ctx.finish({ ok: s <= 60 * (FAST ? 99 : 1), correct:n, total:n, score: s <= 40 ? 100 : s <= 60 ? 80 : 55, good:['Время: ' + fmtTime(s) + (s <= 40 ? ' — отлично.' : s <= 60 ? ' — хорошо.' : '')], improve: s > 60 ? ['Больше 60 секунд — повторите завтра.'] : [], recs:['Смотрите в центр таблицы и ловите числа боковым зрением.'] }); } else info.innerHTML = 'Найди: <b>' + next + '</b>'; }
      else { errors++; ctx.mistake(); b.classList.add('wrong'); setTimeout(()=> b.classList.remove('wrong'), 300); }
    }; grid.appendChild(b); });
}});

/* ---------- вычеркни лишнее ---------- */
registerKind('strike', { render(t, ctx){
  const struck = new Set(); let tries = 0;
  const line = h('div', 'strike-line'); ctx.stage.appendChild(line);
  [...t.letters].forEach((ch, i)=>{ const b = h('button', 'cell strike-ch', esc(ch)); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
    b.onclick = ()=>{ if(trainer.done) return; struck.has(i) ? struck.delete(i) : struck.add(i); b.classList.toggle('struck'); b.setAttribute('aria-pressed', String(struck.has(i))); ctx.enableCheck(struck.size > 0); }; line.appendChild(b); });
  ctx.enableCheck(false);
  ctx.addButton('Подсказка', ()=> ctx.hint('вычёркивайте только буквы: ' + t.strike.join(', ') + '.'));
  ctx.setCheck(()=>{
    const rest = [...t.letters].filter((_, i)=> !struck.has(i)).join('');
    if(rest === t.answer) return { ok:true, correct:1, total:1, good:['Осталось слово «' + t.answer + '».'], recs:['Идите по строке слева направо и не пропускайте соседние буквы.'] };
    tries++;
    if(tries >= 2) return { ok:false, correct:0, total:1, improve:['Получилось «' + rest + '».'], model:'Верное слово: ' + t.answer + '.', recs:['Идите по строке слева направо и не пропускайте соседние буквы.'] };
    return { retry:true, msg:'Осталось «' + rest + '» — это не слово из народной культуры. Проверьте вычеркнутое.' };
  });
}});

/* ---------- корректура ---------- */
registerKind('proof', { render(t, ctx){
  const picked = new Set(); let tries = 0;
  const box = h('div', 'proof-text'); ctx.stage.appendChild(box);
  const clean = w => w.replace(/[.,;:!?«»"()—–-]+/g, '');
  t.text.split(/(\s+)/).forEach(tok => {
    if(!tok.trim()){ box.append(tok); return; }
    const b = h('button', 'proof-w'); b.type = 'button'; b.textContent = tok; b.setAttribute('aria-pressed', 'false');
    b.onclick = ()=>{ if(trainer.done) return; const k = clean(tok).toLowerCase(); const key = b; picked.has(key) ? picked.delete(key) : picked.add(key); b.classList.toggle('selected'); b.setAttribute('aria-pressed', String(picked.has(key))); ctx.enableCheck(picked.size > 0); };
    box.appendChild(b);
  });
  ctx.enableCheck(false);
  ctx.setCheck(()=>{
    const errs = t.errors.map(e => e.toLowerCase());
    const chosen = [...picked].map(b => clean(b.textContent).toLowerCase());
    const right = chosen.filter(c => errs.includes(c)).length, extra = chosen.length - right;
    if(right === errs.length && !extra) return { ok:true, correct:right, total:errs.length, good:['Найдены все ошибки: ' + t.errors.map((e, i)=> e + ' → ' + t.fixes[i]).join('; ') + '.'], recs:['Читайте текст «с карандашом»: слово за словом.'] };
    tries++;
    if(tries >= 2) return { ok:false, correct:right, total:errs.length, improve:['Найдено ' + right + ' из ' + errs.length + ', лишних: ' + extra + '.'], model:t.errors.map((e, i)=> e + ' → ' + t.fixes[i]).join('; ') + '.', recs:['Читайте текст «с карандашом»: слово за словом.'] };
    return { retry:true, msg:'Верно найдено: ' + right + ' из ' + errs.length + ', лишних: ' + extra + '. Проверь ещё раз.' };
  });
}});
