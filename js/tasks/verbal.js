/* Вербальное мышление: синонимы/антонимы, аналогии и классификации,
   составление предложений, говорение и пересказ. */

registerKind('synant', { render(t, ctx){
  const inputs = [];
  for(let i = 0; i < t.need; i++){ const inp = h('input', 'task-input'); inp.type = 'text'; inp.autocomplete = 'off'; inp.placeholder = t.need > 1 ? 'Слово ' + (i + 1) : 'Введи слово'; inp.setAttribute('aria-label', inp.placeholder); inp.addEventListener('input', ()=> ctx.enableCheck(inputs.every(x => x.value.trim()))); inp.addEventListener('keydown', e=>{ if(e.key === 'Enter') onTaskCheck(); }); inputs.push(inp); ctx.stage.appendChild(inp); }
  ctx.enableCheck(false); let tries = 0; setTimeout(()=> inputs[0].focus(), 50);
  ctx.setCheck(()=>{
    const vals = inputs.map(i => i.value.trim()); if(vals.some(v => !v)) return null;
    const okc = vals.filter((v, i)=> assist.inList(v, t.accept) && vals.findIndex(x => norm(x) === norm(v)) === i).length;
    inputs.forEach((inp, i)=> inp.classList.toggle('correct', assist.inList(vals[i], t.accept)));
    if(okc >= t.need) return { ok:true, correct:okc, total:t.need, good:['Подходящие слова: ' + vals.join(', ') + '.'], model:'Допустимо: ' + t.accept.join(', ') + '.', recs:['Подбирайте слова, которые можно подставить в то же предложение.'] };
    tries++;
    if(tries >= 2) return { ok:false, correct:okc, total:t.need, improve:['Подошло слов: ' + okc + ' из ' + t.need + '.'], model:'Допустимо: ' + t.accept.join(', ') + '.', recs:['Подбирайте слова, которые можно подставить в то же предложение.'] };
    return { retry:true, msg:'Пока подходит слов: ' + okc + ' из ' + t.need + '. Попробуй другие.' };
  });
}});

registerKind('analogy_fill', { render(t, ctx){
  answerInput(ctx, { test: v => assist.inList(v, t.accept), model:'Допустимо: ' + t.accept.join(', ') + '. ' + (t.explain || ''), miss:'Допустимо: ' + t.accept.join(', ') + '.', recs:['Сформулируйте связь между первой парой словами и перенесите её на вторую.'] });
}});

registerKind('analogy_odd', { render(t, ctx){
  let picked = null; const list = h('div', 'opts opts-wrap'), btns = [];
  shuffle(t.options).forEach(o => { const b = h('button', 'opt'); b.type = 'button'; b.textContent = o; b.setAttribute('aria-pressed', 'false');
    b.onclick = ()=>{ if(trainer.done) return; picked = o; btns.forEach(x => { x.classList.toggle('selected', x === b); x.setAttribute('aria-pressed', String(x === b)); }); ctx.enableCheck(true); }; btns.push(b); list.appendChild(b); });
  ctx.stage.appendChild(list); ctx.enableCheck(false);
  ctx.setCheck(()=>{
    if(!picked) return null; const ok = norm(picked) === norm(t.answer);
    btns.forEach(b => { b.disabled = true; b.classList.remove('selected'); if(norm(b.textContent) === norm(t.answer)) b.classList.add('correct'); else if(b.textContent === picked) b.classList.add('wrong'); });
    return { ok, correct: ok ? 1 : 0, total:1, good: ok ? ['Лишнее слово найдено.'] : [], improve: ok ? [] : ['Лишнее слово — «' + t.answer + '».'], model:t.explain, recs:['Назовите общий признак остальных слов — тогда лишнее видно сразу.'] };
  });
}});

registerKind('analogy_sort', { render(t, ctx){
  if(!t.groups || t.groups.length < 2){ textForm(ctx, { fields:[{ label:'Ваши группы и признак', rows:4 }], review: ()=> ({ ok:true, score:70, model:t.explain }) }); return; }
  const words = shuffle(t.words.slice()); let i = 0, errors = 0;
  const card = h('div', 'sort-card'), bks = h('div', 'sort-buckets'), info = h('div', 'task-line');
  ctx.stage.append(info, card, bks); ctx.hideCheck();
  const show = ()=>{ card.textContent = words[i]; info.textContent = 'Слово ' + (i + 1) + ' из ' + words.length; ctx.setProgress(i / words.length); };
  const groupOf = w => t.groups.findIndex(g => g[1].some(x => norm(x) === norm(w) || norm(w).startsWith(norm(x)) || norm(x).startsWith(norm(w))));
  t.groups.forEach((g, gi)=>{ const b = h('button', 'opt'); b.type = 'button'; b.textContent = g[0];
    b.onclick = ()=>{ if(trainer.done) return; if(groupOf(words[i]) === gi){ b.classList.add('correct'); setTimeout(()=> b.classList.remove('correct'), 250); i++; if(i >= words.length) return ctx.finish({ ok: errors <= 1, correct:words.length - errors, total:words.length, errors, good:['Слова разложены по группам.'], model:t.explain, recs:['Сначала найдите общий признак, потом раскладывайте.'] }); show(); } else { errors++; b.classList.add('wrong'); setTimeout(()=> b.classList.remove('wrong'), 350); } };
    bks.appendChild(b); });
  show();
}});

registerKind('sentences', { render(t, ctx){
  const refined = t.src === 'refined', need = refined ? 3 : 1;
  textForm(ctx, { before: t.words.length ? '<span class="big-word">' + t.words.map(esc).join(' · ') + '</span>' : '', fields:[{ label:'Ваши предложения (каждое с новой строки)', rows:6, min:10 }],
    review: ([text])=>{
      const sents = assist.sentences(text.replace(/\n/g, '. '));
      const stems = t.words.map(w => assist.stem(w));
      const full = sents.filter(s => stems.every(k => s.toLowerCase().replace(/ё/g, 'е').includes(k)));
      const used = stems.filter(k => text.toLowerCase().replace(/ё/g, 'е').includes(k)).length;
      const good = [], improve = [];
      if(full.length) good.push('Предложений со всеми тремя словами: ' + full.length + '.');
      if(full.length < need) improve.push('Нужно предложений, где есть все три слова: не меньше ' + need + (used < stems.length ? ' (не использовано слов: ' + (stems.length - used) + ')' : '') + '.');
      const ok = full.length >= need;
      return { ok, score: Math.min(100, Math.round(full.length / need * 80 + (sents.length > need ? 20 : 0))), correct:full.length, total:need, good, improve, model: t.example ? 'Пример: ' + esc(t.example) : '', recs:['Свяжите слова одной картинкой: где, кто и что делает.', 'Не бойтесь образных предложений.'] };
    } });
}});

registerKind('retell', { render(t, ctx){
  const st = ctx.stage;
  const readM = t.q.match(/«([\s\S]+)»/);
  const m = /Достаточно (\d+) из/.exec(t.crit || ''), need = m ? +m[1] : Math.max(2, Math.ceil(t.keys.length * 0.6));
  const build = ()=>{
    st.innerHTML = ''; document.getElementById('task-extra').innerHTML = '';
    textForm(ctx, { fields:[{ label: readM ? 'Перескажите своими словами' : 'Ваш рассказ (запишите текстом)', rows:7, min:20, placeholder:'Начните рассказ…' }],
      review: ([text])=>{
        const mk = assist.matchKeys(text, t.keys), n = assist.words(text);
        const good = mk.found.length ? ['Названы ключевые мысли (' + mk.found.length + ' из ' + t.keys.length + '): ' + mk.found.join('; ') + '.'] : [];
        const improve = []; if(mk.missing.length) improve.push('Не хватило: ' + mk.missing.join('; ') + '.');
        const recs = ['Идите по плану: что это → когда и где → что делают → что особенного.']; if(n < 30) recs.unshift('Расскажите подробнее — сейчас ответ слишком короткий.');
        return { ok: mk.found.length >= need, score: Math.round(Math.min(1, mk.found.length / need) * 100), correct:mk.found.length, total:t.keys.length, good, improve, model: t.keys.length ? 'Ключевые пункты: ' + t.keys.join('; ') + '.' : '', recs };
      } });
    ctx.showCheck(true);
  };
  if(readM){
    st.append(h('div', 'task-line', 'Прочитайте текст. Через 40 секунд он скроется.'), h('div', 'read-text', esc(readM[1])));
    ctx.hideCheck(); ctx.timer(40, build);
    ctx.addButton('Готов пересказывать', ()=>{ clearInterval(trainer.cdId); build(); startElapsedAfter(); });
  } else build();
  document.getElementById('task-q').textContent = readM ? t.q.split('«')[0].trim() : t.q;
}});
