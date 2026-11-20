/* Решение проблем: «5 почему», критическое мышление, аналитические задачи, реальные задачи. */

registerKind('whys', { render(t, ctx){
  const box = h('div', 'whys'); ctx.stage.appendChild(box);
  const rows = [];
  const add = ()=>{
    const i = rows.length, row = h('div', 'why-row');
    row.innerHTML = '<label class="field-label" for="why' + i + '">' + (i === 0 ? 'Почему возникла проблема?' : 'Почему? (' + (i + 1) + ' из 5)') + '</label>';
    const inp = h('input', 'task-input'); inp.id = 'why' + i; inp.autocomplete = 'off'; inp.placeholder = 'Потому что…';
    inp.addEventListener('input', ()=>{ ctx.enableCheck(rows.every(r => r.value.trim().length > 2)); if(inp.value.trim().length > 2 && rows.length < 5 && rows[rows.length - 1] === inp && !row._next){ row._next = true; add(); } });
    row.appendChild(inp); box.appendChild(row); rows.push(inp); ctx.setProgress((rows.length - 1) / 5);
    if(i) inp.focus();
  };
  add(); ctx.enableCheck(false);
  ctx.setCheck(()=>{
    if(rows.length < 5 || rows.some(r => r.value.trim().length < 3)) return null;
    const vals = rows.map(r => r.value.trim()), short = vals.filter(v => assist.words(v) < 3).length;
    const uniq = new Set(vals.map(v => norm(v))).size;
    const good = ['Построена цепочка из пяти шагов.'], improve = [];
    if(short) improve.push('Ответов короче трёх слов: ' + short + ' — раскройте мысль.');
    if(uniq < 5) improve.push('Некоторые шаги повторяют друг друга — каждый ответ должен объяснять предыдущий.');
    const ok = short <= 1 && uniq === 5;
    return { ok, score: ok ? 85 : 55, correct:5 - short, total:5, good, improve, model:'Допустимая цепочка: ' + esc(t.example) + (t.root ? ' Корень: ' + esc(t.root) : ''), recs:['Проверьте каждое звено вопросом «Это точно причина предыдущего?»', 'Корень — то, на что вы можете повлиять.'] };
  });
}});

registerKind('critical', { render(t, ctx){
  const keys = String(t.answer).split(/;|\.\s+(?=[А-ЯЁ])/).map(s => s.replace(/^(Тип|Исправление):\s*/i, '').trim()).filter(s => s.length > 3);
  textForm(ctx, { fields:[{ label:'Какая здесь ошибка и как это проверить?', rows:5, min:10, placeholder:'Ошибка в том, что…' }],
    review: ([text])=>{
      const m = assist.matchKeys(text, keys.slice(0, 3));
      const checks = /источник|провер|данн|стат|автор|дат|факт|доказ/i.test(text);
      const good = [], improve = [];
      if(m.found.length) good.push('Совпадает с эталоном: ' + m.found.length + ' из ' + Math.min(3, keys.length) + ' пунктов.');
      if(checks) good.push('Названа проверка: источник, данные или факты.'); else improve.push('Предложите способ проверки: источник, дата, автор, статистика.');
      if(!m.found.length) improve.push('Назовите саму логическую ошибку и объясните, почему рассуждение слабое.');
      return { ok: m.found.length >= 1 && checks || m.ratio >= 0.5, score: Math.round(Math.min(100, m.ratio * 70 + (checks ? 30 : 0))), good, improve, model: esc(t.answer), recs:['Ищите слова «все», «всегда», «никогда» — они часто скрывают обобщение.'] };
    } });
}});

registerKind('analytic', { render(t, ctx){
  answerInput(ctx, { placeholder:'Введи ответ', test: v => assist.answerMatches(v, t.answer) || norm(v) === norm(t.answer.split('(')[0]), model:'Ответ: ' + t.answer + '.', miss:'Эталон: ' + t.answer + '.', attempts:2, retryMsg:'Пока неверно — перепроверь ход решения.', recs:['Выпишите условия по пунктам и вычёркивайте невозможные варианты.'] });
}});

registerKind('real', { render(t, ctx){
  const keys = String(t.crit).replace(/^Общий критерий:\s*/, '').split(/;/).map(s => s.trim().replace(/\.$/, '')).filter(Boolean);
  textForm(ctx, { fields:[{ label:'Ваш план действий (что сделаете в первую очередь и почему)', rows:7, min:20, placeholder:'Сначала я…' }],
    review: ([text])=>{
      const steps = assist.lines(text).length, m = assist.matchKeys(text, keys);
      const good = [], improve = [], recs = [];
      if(m.found.length) good.push('Учтены критерии: ' + m.found.join('; ') + '.');
      if(m.missing.length) improve.push('Не затронуто: ' + m.missing.join('; ') + '.');
      if(steps < 3 && assist.words(text) < 40) recs.push('Разбейте план на 3–4 шага.');
      recs.push('Всегда подумайте о запасном варианте.');
      return { ok: m.ratio >= 0.5, score: Math.round(m.ratio * 100), correct:m.found.length, total:keys.length, good, improve, recs };
    } });
}});
