/* Принятие решений: метод двух списков, матрица критериев, правило 10-10-10. */

registerKind('twolists', { render(t, ctx){
  const side = (title, cls)=>{
    const col = h('div', 'list-col ' + cls), rows = [];
    col.appendChild(h('h3', null, title));
    const add = ()=>{
      const r = h('div', 'list-row'), inp = h('input', 'task-input'); inp.placeholder = 'Аргумент'; inp.setAttribute('aria-label', title + ': аргумент');
      const sel = h('select', 'task-input w-sel'); sel.setAttribute('aria-label', 'Важность от 1 до 5');
      sel.innerHTML = '<option value="">важн.</option>' + [1, 2, 3, 4, 5].map(n => '<option>' + n + '</option>').join('');
      [inp, sel].forEach(x => x.addEventListener('input', upd)); sel.addEventListener('change', upd);
      r.append(inp, sel); col.insertBefore(r, addBtn); rows.push([inp, sel]);
    };
    const addBtn = h('button', 'btn-ghost'); addBtn.type = 'button'; addBtn.textContent = '+ ещё'; addBtn.onclick = add; col.appendChild(addBtn);
    add(); add();
    return { col, rows, items: ()=> rows.filter(r => r[0].value.trim()).map(r => ({ text: r[0].value.trim(), w: +r[1].value || 0 })) };
  };
  const pros = side('За', 'pro'), cons = side('Против', 'con');
  const total = h('div', 'list-total', '');
  const wrap = h('div', 'two-lists'); wrap.append(pros.col, cons.col);
  ctx.stage.append(h('div', 'task-line', 'Впишите аргументы в оба списка и оцените важность каждого: 1 — мало, 5 — очень важно.'), wrap, total);
  ctx.enableCheck(false);
  function upd(){
    const P = pros.items(), C = cons.items(), sp = P.reduce((a, x)=> a + x.w, 0), sc = C.reduce((a, x)=> a + x.w, 0);
    total.textContent = 'Баллы: «За» — ' + sp + ', «Против» — ' + sc;
    ctx.enableCheck(P.length >= 2 && C.length >= 2 && P.concat(C).every(x => x.w));
  }
  ctx.setCheck(()=>{
    const P = pros.items(), C = cons.items(); if(P.length < 2 || C.length < 2 || P.concat(C).some(x => !x.w)) return null;
    const sp = P.reduce((a, x)=> a + x.w, 0), sc = C.reduce((a, x)=> a + x.w, 0);
    const all = P.concat(C).map(x => x.text).join(' ; ');
    const mk = assist.matchKeys(all, (t.pros || []).concat(t.cons || []));
    const verdict = sp > sc ? 'перевешивает «За»' : sp < sc ? 'перевешивает «Против»' : 'силы равны';
    const avg = (sp + sc) / (P.length + C.length);
    const good = ['Вес «За»: ' + sp + ', вес «Против»: ' + sc + ' — ' + verdict + '.', 'Средний вес аргумента: ' + avg.toFixed(1) + '.'];
    const improve = []; if(mk.missing.length) improve.push('Что ещё можно было учесть: ' + mk.missing.slice(0, 4).join('; ') + '.');
    const recs = ['Если суммы близки, сравните не суммы, а самые важные аргументы с каждой стороны.', 'Не забудьте про последствия через год.']; if(t.extra) recs.unshift('Не забыть: ' + esc(t.extra));
    return { ok:true, score: Math.round(60 + mk.ratio * 40), correct:P.length + C.length, total:P.length + C.length, good, improve, model:'«За»: ' + (t.pros || []).join('; ') + '. «Против»: ' + (t.cons || []).join('; ') + '.', recs };
  });
}});

registerKind('matrix', { render(t, ctx){
  const head = t.table[0], body = t.table.slice(1, -1), opts = head.slice(1);
  const tbl = h('table', 'matrix');
  tbl.innerHTML = '<thead><tr>' + head.map(x => '<th>' + esc(x) + '</th>').join('') + '</tr></thead><tbody>' + body.map(r => '<tr>' + r.map((c, i)=> i ? '<td>' + esc(c) + '</td>' : '<th scope="row">' + esc(c) + '</th>').join('') + '</tr>').join('') + '</tbody>';
  const tf = h('tr'); tf.appendChild(h('th', null, 'ИТОГО (вес × оценка)'));
  const inputs = opts.map(()=>{ const td = h('td'), i = h('input', 'task-input'); i.inputMode = 'numeric'; i.setAttribute('aria-label', 'Итог'); i.addEventListener('input', ()=> ctx.enableCheck(inputs.every(x => x.value.trim()))); td.appendChild(i); tf.appendChild(td); return i; });
  tbl.querySelector('tbody').appendChild(tf);
  const w = h('div', 'matrix-wrap'); w.appendChild(tbl); ctx.stage.append(h('div', 'task-line', 'Умножьте каждую оценку на вес критерия (число в скобках), сложите и впишите итог.'), w);
  const weight = s => +((s.match(/\((\d+)\)/) || [0, 1])[1]);
  const want = opts.map((_, j)=> body.reduce((a, r)=> a + weight(r[0]) * (+r[j + 1] || 0), 0));
  ctx.enableCheck(false); let tries = 0;
  ctx.setCheck(()=>{
    const got = inputs.map(i => +i.value); if(inputs.some(i => !i.value.trim())) return null;
    const okc = got.filter((g, j)=> g === want[j]).length;
    inputs.forEach((i, j)=> i.classList.toggle('correct', got[j] === want[j]));
    const winner = opts[want.indexOf(Math.max(...want))];
    if(okc === opts.length) return { ok:true, correct:okc, total:opts.length, good:['Суммы верные. Побеждает вариант: «' + winner + '».'], model:esc(t.answer), recs:['Проверьте, не изменится ли победитель, если поднять вес главного критерия.'] };
    tries++;
    if(tries >= 2) return { ok:false, correct:okc, total:opts.length, improve:['Верных итогов: ' + okc + ' из ' + opts.length + '.'], model:'Итоги: ' + opts.map((o, j)=> o + ' — ' + want[j]).join(', ') + '.', recs:['Считайте по столбцам: вес × оценка, затем сумма.'] };
    return { retry:true, msg:'Верных итогов: ' + okc + ' из ' + opts.length + '. Пересчитайте.' };
  });
}});

registerKind('tenten', { render(t, ctx){
  textForm(ctx, { fields:[{ label:'Через 10 минут', rows:3, min:6 }, { label:'Через 10 месяцев', rows:3, min:6 }, { label:'Через 10 лет', rows:3, min:6 }, { label:'Итог: ваш выбор и план смягчения последствий', rows:3, min:6 }],
    review: vals => { const short = vals.filter(v => assist.words(v) < 3).length;
      return { ok: short === 0, score: short ? 55 : 85, correct:4 - short, total:4, good:['Рассмотрены три горизонта времени и сделан итоговый выбор.'], improve: short ? ['Есть слишком короткие ответы: ' + short + '.'] : [], model:esc(t.crit), recs:['Спросите себя: о чём я пожалею меньше всего?'] }; } });
}});
