/* Умение учиться: изучи материал → составь вопросы → ответь на тест. */
registerKind('learn', { render(t, ctx){
  const st = ctx.stage, q = document.getElementById('task-q');
  let questions = [];
  const stepRead = ()=>{
    st.innerHTML = ''; q.textContent = 'Шаг 1. Изучите материал максимально подробно.';
    st.append(h('div', 'read-text', esc(t.text)));
    ctx.hideCheck(); document.getElementById('task-extra').innerHTML = '';
    ctx.addButton('Я изучил — дальше', stepAsk, 'btn-primary');
  };
  const stepAsk = ()=>{
    clearInterval(trainer.cdId); st.innerHTML = ''; document.getElementById('task-extra').innerHTML = '';
    q.textContent = 'Шаг 2. Составьте 5 вопросов по материалу (разных типов: факт, объяснение, применение).';
    const rows = [];
    for(let i = 0; i < 5; i++){ const inp = h('input', 'task-input'); inp.placeholder = 'Вопрос ' + (i + 1); inp.setAttribute('aria-label', inp.placeholder); inp.addEventListener('input', ()=> ctx.enableCheck(rows.filter(r => r.value.trim().length > 5).length >= 3)); rows.push(inp); st.appendChild(inp); }
    st.appendChild(h('p', 'intro-note', 'Хороший вопрос: ответ есть в тексте; один правильный ответ; не «да/нет».'));
    ctx.showCheck(true); ctx.enableCheck(false);
    ctx.setCheck(()=>{
      const qs = rows.map(r => r.value.trim()).filter(x => x.length > 5); if(qs.length < 3) return null;
      questions = qs; const yn = qs.filter(x => /^(это|является|можно|правда ли)\b/i.test(x)).length, noq = qs.filter(x => !/\?$/.test(x)).length;
      const kinds = new Set(qs.map(x => /^почему|^зачем|^как\b|^объясни/i.test(x) ? 'объяснение' : /^что,? если|^как бы|^где можно|^какую пользу/i.test(x) ? 'применение' : 'факт'));
      t._askNote = { good:['Составлено вопросов: ' + qs.length + '.'].concat(kinds.size >= 2 ? ['Использовано типов вопросов: ' + kinds.size + '.'] : []), improve:(noq ? ['Не у всех вопросов есть знак «?».'] : []).concat(kinds.size < 2 ? ['Попробуйте добавить вопрос-объяснение («Почему…?») или вопрос-применение.'] : []).concat(yn ? ['Вопросы вида «да/нет» слабые — переформулируйте.'] : []) };
      stepTest(); return { pending:true, msg:'Вопросы приняты. Теперь тест по материалу.' };
    });
  };
  const stepTest = ()=>{
    st.innerHTML = ''; q.textContent = 'Шаг 3. Ответьте на тест по материалу (вопросы подготовили разработчики).';
    const rows = t.pairs.map(([qq], i)=>{ const w = h('div', 'why-row'); w.innerHTML = '<label class="field-label" for="lq' + i + '">' + (i + 1) + ') ' + esc(qq) + '</label>'; const inp = h('input', 'task-input'); inp.id = 'lq' + i; inp.autocomplete = 'off'; inp.addEventListener('input', ()=> ctx.enableCheck(rows.every(x => x.value.trim()))); w.appendChild(inp); st.appendChild(w); return inp; });
    ctx.enableCheck(false);
    ctx.setCheck(()=>{
      if(rows.some(r => !r.value.trim())) return null; let ok = 0; const bad = [];
      rows.forEach((r, i)=>{ const g = assist.answerMatches(r.value, t.pairs[i][1]); r.classList.add(g ? 'correct' : 'wrong'); r.readOnly = true; g ? ok++ : bad.push((i + 1) + ') ' + t.pairs[i][1]); });
      const note = t._askNote || { good:[], improve:[] };
      return { ok: ok >= Math.ceil(rows.length * 0.6), score: Math.round(ok / rows.length * 100), correct:ok, total:rows.length, good: note.good.concat(ok ? ['Верных ответов в тесте: ' + ok + ' из ' + rows.length + '.'] : []), improve: note.improve.concat(bad.length ? ['Верные ответы: ' + bad.join('; ') + '.'] : []), recs:['Перед тестом перескажите материал своими словами.', 'Через день вернитесь и проверьте себя ещё раз — так знания закрепляются.'] };
    });
  };
  stepRead();
}});
