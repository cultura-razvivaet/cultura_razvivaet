/* Образное мышление: орнамент по памяти, отрази узор, зеркало, «А как он выглядит». */

/* рисовалка на canvas (мышь и палец) */
function drawPad(parent){
  const wrap = h('div', 'pad-wrap'), cv = h('canvas', 'draw-cv'); cv.width = 720; cv.height = 440;
  cv.setAttribute('aria-label', 'Поле для рисунка'); cv.tabIndex = 0;
  const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
  g.lineWidth = 4; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#231F20';
  let drawing = false, last = null;
  const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
  cv.addEventListener('pointerdown', e=>{ drawing = true; last = pos(e); cv.setPointerCapture(e.pointerId); g.beginPath(); g.moveTo(last[0], last[1]); g.lineTo(last[0] + 0.1, last[1]); g.stroke(); e.preventDefault(); });
  cv.addEventListener('pointermove', e=>{ if(!drawing) return; const p = pos(e); g.beginPath(); g.moveTo(last[0], last[1]); g.lineTo(p[0], p[1]); g.stroke(); last = p; });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => cv.addEventListener(ev, ()=>{ drawing = false; }));
  const bar = h('div', 'pad-bar');
  [['#231F20', 'Чёрный'], ['#C0392B', 'Красный'], ['#343DD5', 'Синий'], ['#2E7D32', 'Зелёный'], ['#E0A800', 'Жёлтый']].forEach(([c, n])=>{
    const b = h('button', 'swatch'); b.type = 'button'; b.style.background = c; b.setAttribute('aria-label', n); b.onclick = ()=>{ g.strokeStyle = c; g.lineWidth = 4; bar.querySelectorAll('.swatch').forEach(x => x.classList.toggle('on', x === b)); }; bar.appendChild(b);
  });
  const er = h('button', 'btn-ghost'); er.type = 'button'; er.textContent = 'Ластик'; er.onclick = ()=>{ g.strokeStyle = '#fff'; g.lineWidth = 18; };
  const cl = h('button', 'btn-ghost'); cl.type = 'button'; cl.textContent = 'Очистить'; cl.onclick = ()=>{ g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); };
  bar.append(er, cl); wrap.append(cv, bar); parent.appendChild(wrap);
  return { canvas: cv, isEmpty(){ const d = g.getImageData(0, 0, cv.width, cv.height).data; for(let i = 0; i < d.length; i += 16) if(d[i] < 250) return false; return true; } };
}

/* самопроверка по признакам: пользователь отмечает, что есть на рисунке */
function selfCheckList(ctx, keys, intro){
  const box = h('div', 'selfcheck');
  box.innerHTML = '<h3>' + intro + '</h3>';
  const inputs = keys.map((k, i)=>{ const l = h('label', 'check-row'); const c = h('input'); c.type = 'checkbox'; l.append(c, document.createTextNode(' ' + k)); box.appendChild(l); return c; });
  ctx.stage.appendChild(box);
  return { box, count: ()=> inputs.filter(i => i.checked).length, inputs };
}
function artImg(task, name, cls){
  const wrap = h('div', cls || 'art-card');
  const img = h('img', 'art-img'); img.alt = name; img.src = 'assets/ornaments/' + task.id + '.png'; img.onerror = ()=> img.remove();
  const g = itemGlyph(name.replace(/^(.*?)\s*\(.*$/, '$1')) ;
  wrap.append(img, h('div', 'art-name', esc(name)));
  return wrap;
}

registerKind('ornmem', { render(t, ctx){
  const st = ctx.stage; let phase = 'show', pad = null, revealed = false, list = null;
  const card = artImg(t, t.name, 'art-card big');
  const dsc = h('p', 'art-desc', 'Рассмотрите предмет и запомните его: ' + t.keys.map(esc).join('; ') + '.');
  st.append(h('div', 'task-line', 'Запоминайте — предмет исчезнет через 30 секунд.'), card, dsc);
  ctx.hideCheck();
  ctx.timer(t.seconds, ()=>{
    st.innerHTML = ''; phase = 'draw';
    st.appendChild(h('div', 'task-line', 'Нарисуйте предмет «' + esc(t.name) + '» по памяти (мышью, пальцем или на бумаге).'));
    pad = drawPad(st); ctx.showCheck(true); ctx.enableCheck(true);
  });
  ctx.setCheck(()=>{
    if(phase !== 'draw') return null;
    if(!revealed){ revealed = true; list = selfCheckList(ctx, t.keys, 'Сверьтесь с признаками. Отметьте то, что есть на вашем рисунке:'); return { pending:true, msg:'Отметь признаки и нажми «Проверить ответ» ещё раз.' }; }
    const n = list.count(), total = t.keys.length, ratio = n / total;
    const missing = t.keys.filter((k, i)=> !list.inputs[i].checked);
    return { ok: ratio >= 0.6, score: Math.round(ratio * 100), correct:n, total, good: n ? ['Передано признаков: ' + n + ' из ' + total + '.'] : [], improve: missing.length ? ['Не хватило: ' + missing.join('; ') + '.'] : [], recs:['Запоминая, сначала схватывайте общий силуэт, потом цвет и детали.'] };
  });
}});

registerKind('ornmirror', { render(t, ctx){
  const st = ctx.stage; let revealed = false, list = null;
  st.append(h('p', 'art-desc big', esc(t.desc)), h('div', 'task-line', 'Нарисуйте предмет по описанию (мышью, пальцем или на бумаге).'));
  drawPad(st); ctx.enableCheck(true);
  ctx.setCheck(()=>{
    if(!revealed){ revealed = true; list = selfCheckList(ctx, t.keys, 'Сверьтесь с признаками. Отметьте то, что есть на вашем рисунке:'); return { pending:true, msg:'Отметь признаки и нажми «Проверить ответ» ещё раз.' }; }
    const n = list.count(), total = t.keys.length, ratio = n / total, missing = t.keys.filter((k, i)=> !list.inputs[i].checked);
    return { ok: ratio >= 0.6, score: Math.round(ratio * 100), correct:n, total, good: n ? ['Передано признаков: ' + n + ' из ' + total + '.'] : [], improve: missing.length ? ['Не хватило: ' + missing.join('; ') + '.'] : [], recs:['Идите по описанию сверху вниз и отмечайте каждую деталь.'] };
  });
}});

/* ---------- зеркало: кайма ---------- */
registerKind('mirror_seq', { render(t, ctx){
  const cl = s => s.replace(/,\s*$/, '').trim();
  const left = t.left.map(cl), right = t.right.map(cl);
  const pool = [...new Set(right.concat(left).concat(shuffle(MOTIFS).slice(0, 2)))];
  const row = h('div', 'mirror-row');
  left.forEach(x => row.appendChild(h('span', 'mirror-item', esc(x))));
  row.appendChild(h('span', 'mirror-axis', '┆'));
  const sels = right.map((_, i)=>{ const s = h('select', 'task-input mirror-sel'); s.setAttribute('aria-label', 'Элемент ' + (i + 1) + ' правой половины');
    s.innerHTML = '<option value="">…</option>' + shuffle(pool).map(p => '<option>' + esc(p) + '</option>').join('');
    s.onchange = ()=> ctx.enableCheck(sels.every(x => x.value)); row.appendChild(s); return s; });
  ctx.stage.append(h('div', 'task-line', 'Слева от оси — исходная половина. Справа выберите элементы так, как они выглядят в зеркале.'), row);
  ctx.enableCheck(false); let tries = 0;
  ctx.setCheck(()=>{
    const ans = sels.map(s => s.value); const okN = ans.filter((a, i)=> a === right[i]).length;
    sels.forEach((s, i)=> s.classList.toggle('correct', ans[i] === right[i]));
    if(okN === right.length) return { ok:true, correct:okN, total:right.length, good:['Зеркало собрано верно: порядок элементов обратный.'], recs:['В зеркале порядок элементов меняется на обратный, а направления «влево/вправо» — на противоположные.'] };
    tries++;
    if(tries >= 2) return { ok:false, correct:okN, total:right.length, improve:['Верных позиций: ' + okN + ' из ' + right.length + '.'], model:right.join(' — '), recs:['Читайте исходную половину справа налево.'] };
    return { retry:true, msg:'Верных позиций: ' + okN + ' из ' + right.length + '. Подсказка: порядок элементов должен стать обратным.' };
  });
}});

registerKind('mirror_word', { render(t, ctx){
  answerInput(ctx, { before:'<span class="big-word">' + esc(t.word) + '</span>', placeholder:'Буквы в зеркальном порядке', test: v => norm(v) === norm(t.answer),
    model:'Порядок букв: ' + [...t.answer].join(', ') + ' (каждая буква повёрнута зеркально).', miss:'Порядок букв должен быть обратным: ' + [...t.answer].join(', ') + '.', recs:['Пишите слово справа налево.'] });
}});

registerKind('mirror_text', { render(t, ctx){
  const toks = (t.answer.match(/[А-Яа-яё]+/g) || []).map(w => assist.stem(w));
  answerInput(ctx, { test: v => { const s = v.toLowerCase().replace(/ё/g, 'е'); let pos = 0; return toks.every(k => { const i = s.indexOf(k, pos); if(i < 0) return false; pos = i + k.length; return true; }); },
    model:'Эталон: ' + t.answer + '.', miss:'Эталон: ' + t.answer + '.', recs:['Представьте зеркало между левой и правой сторонами.'] });
}});

/* ---------- зеркало: клетки ---------- */
registerKind('mirror_grid', { render(t, ctx){
  const R = t.src_rows.length, C = t.src_rows[0].length; let tries = 0;
  const wrap = h('div', 'mg-wrap');
  const mk = (rows, interactive)=>{ const g = h('div', 'mg'); g.style.setProperty('--c', C);
    const cells = []; for(let r = 0; r < R; r++) for(let c = 0; c < C; c++){ const b = h(interactive ? 'button' : 'div', 'mg-cell' + (rows && rows[r][c] === '#' ? ' on' : '')); if(interactive){ b.type = 'button'; b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', 'Строка ' + (r + 1) + ', колонка ' + (c + 1)); b.onclick = ()=>{ b.classList.toggle('on'); b.setAttribute('aria-pressed', String(b.classList.contains('on'))); ctx.enableCheck(true); }; } cells.push(b); g.appendChild(b); } return { g, cells }; };
  const src = mk(t.src_rows, false), dst = mk(null, true);
  wrap.append(h('div', 'mg-col', '<b>Исходный узор</b>'), h('div', 'mg-axis', '┆'), h('div', 'mg-col', '<b>Ваше отражение</b>'));
  wrap.children[0].appendChild(src.g); wrap.children[2].appendChild(dst.g);
  ctx.stage.append(h('div', 'task-line', 'Закрасьте клетки справа так, чтобы получилось отражение (ось — пунктир).'), wrap);
  ctx.enableCheck(false);
  ctx.addButton('Подсказка', ()=> ctx.hint('читайте каждую строку исходного узора справа налево.'));
  ctx.setCheck(()=>{
    const bad = []; for(let r = 0; r < R; r++){ let ok = true; for(let c = 0; c < C; c++){ const want = t.target[r][c] === '#', has = dst.cells[r * C + c].classList.contains('on'); if(want !== has) ok = false; } if(!ok) bad.push(r + 1); }
    if(!bad.length) return { ok:true, correct:R, total:R, good:['Все ' + R + ' рядов отражены верно.'], recs:['Водите пальцем по оси: слева направо вместо справа налево.'] };
    tries++;
    if(tries >= 3){ dst.cells.forEach((b, i)=>{ b.classList.toggle('on', t.target[Math.floor(i / C)][i % C] === '#'); b.disabled = true; }); return { ok:false, correct:R - bad.length, total:R, improve:['Неверно отражены ряды: ' + bad.join(', ') + '.'], model:'Эталон показан справа.', recs:['Водите пальцем по оси.'] }; }
    return { retry:true, msg:'Неверно отражены ряды: ' + bad.join(', ') + '. Исправьте и проверьте ещё раз.' };
  });
}});

/* ---------- «А как он выглядит» ---------- */
registerKind('describe', { render(t, ctx){
  const name = t.name && t.name.length < 60 ? t.name : null;
  textForm(ctx, { before: name ? '<span class="big-word">' + esc(name) + '</span>' : '', fields:[{ label:'Опишите предмет: форма, цвет, материал, детали', rows:6, placeholder:'Он выглядит так…', min:10 }],
    review: ([text])=>{
      const m = assist.matchKeys(text, t.keys), n = assist.words(text);
      const good = m.found.length ? ['Названо признаков: ' + m.found.length + ' из ' + t.keys.length + ' — ' + m.found.join('; ') + '.'] : [];
      const improve = m.missing.length ? ['Не упомянуто: ' + m.missing.join('; ') + '.'] : [];
      const recs = []; if(n < 20) recs.push('Добавьте детали: форму, цвет, материал и украшения.'); recs.push('Идите по плану: общая форма → цвет → материал → детали.');
      return { ok: m.ratio >= 0.5, score: Math.round(m.ratio * 100), correct:m.found.length, total:t.keys.length, good, improve, recs };
    } });
}});
