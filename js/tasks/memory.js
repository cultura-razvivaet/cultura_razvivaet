/* Память: чтение и тест, запоминание последовательностей (филворды — в attention.js). */

registerKind('reading', { render(t, ctx){
  const st = ctx.stage;
  const text = h('div', 'read-text', esc(t.text));
  st.append(h('div', 'task-line', 'Прочитайте текст внимательно. Он скроется, затем будут вопросы.'), text);
  ctx.hideCheck();
  const go2 = ()=>{
    clearInterval(trainer.cdId); st.innerHTML = ''; document.getElementById('task-extra').innerHTML = '';
    document.getElementById('task-q').textContent = 'Ответьте на вопросы по прочитанному тексту.';
    const rows = t.pairs.map(([q], i)=>{ const w = h('div', 'why-row'); w.innerHTML = '<label class="field-label" for="rq' + i + '">' + (i + 1) + ') ' + esc(q) + '</label>'; const inp = h('input', 'task-input'); inp.id = 'rq' + i; inp.autocomplete = 'off'; inp.addEventListener('input', ()=> ctx.enableCheck(rows.every(x => x.value.trim()))); w.appendChild(inp); st.appendChild(w); return inp; });
    ctx.showCheck(true); ctx.enableCheck(false); setTimeout(()=> rows[0].focus(), 50);
    ctx.setCheck(()=>{
      if(rows.some(r => !r.value.trim())) return null;
      let ok = 0; const bad = [];
      rows.forEach((r, i)=>{ const good = assist.answerMatches(r.value, t.pairs[i][1]); r.classList.add(good ? 'correct' : 'wrong'); r.readOnly = true; good ? ok++ : bad.push((i + 1) + ') ' + t.pairs[i][1]); });
      return { ok: ok >= Math.ceil(rows.length * 0.6), score: Math.round(ok / rows.length * 100), correct:ok, total:rows.length, good: ok ? ['Верных ответов: ' + ok + ' из ' + rows.length + '.'] : [], improve: bad.length ? ['Верные ответы: ' + bad.join('; ') + '.'] : [], recs:['Читая, выделяйте мысленно имена, числа и названия — на них задают вопросы.'] };
    });
  };
  ctx.timer(t.seconds, go2);
  ctx.addButton('Готов отвечать', go2);
}});

registerKind('memseq', { render(t, ctx){
  const st = ctx.stage, show = h('div', 'recall-show', esc(t.show));
  st.append(h('div', 'task-line', 'Запоминайте последовательность — она исчезнет через ' + t.seconds + ' секунд.'), show);
  ctx.hideCheck();
  const go2 = ()=>{
    clearInterval(trainer.cdId); st.innerHTML = ''; document.getElementById('task-extra').innerHTML = '';
    document.getElementById('task-q').textContent = 'Введите последовательность в том же порядке.';
    const inp = h('input', 'task-input'); inp.autocomplete = 'off'; inp.placeholder = t.kind === 'numbers' ? 'Числа' : 'Элементы через запятую или пробел'; inp.setAttribute('aria-label', 'Последовательность');
    st.appendChild(inp); ctx.showCheck(true); ctx.enableCheck(false); inp.focus();
    inp.addEventListener('input', ()=> ctx.enableCheck(inp.value.trim().length > 0)); inp.addEventListener('keydown', e=>{ if(e.key === 'Enter') onTaskCheck(); });
    ctx.setCheck(()=>{
      const v = inp.value.trim(); if(!v) return null;
      const wantN = t.items.map(x => norm(x));
      let got;
      if(t.items.every(x => /^\d+$/.test(x)) && !/[,;]/.test(v)){ // числа: допускаем слитно и через дефис/пробел
        const joined = t.items.join(''), vj = v.replace(/\D/g, ''); got = vj === joined ? wantN : vj.split('');
        if(vj !== joined){ const same = [...vj].filter((c, i)=> joined[i] === c).length; return fin(same, joined.length, joined); }
        return fin(t.items.length, t.items.length);
      }
      got = v.split(/[\s,;]+/).filter(Boolean).map(norm);
      let hit = 0; wantN.forEach((w, i)=> { if(got[i] === w) hit++; });
      return fin(hit, wantN.length);
    });
    function fin(hit, total, raw){
      inp.readOnly = true; const ok = hit === total;
      return { ok, score: Math.round(hit / total * 100), correct:hit, total, good: hit ? ['Верных позиций: ' + hit + ' из ' + total + '.'] : [], improve: ok ? [] : ['Порядок должен совпасть полностью.'], model:'Было: ' + esc(t.show) + '.', recs:['Разбивайте ряд на группы по 2–3 элемента и придумывайте связь между группами.'] };
    }
  };
  ctx.timer(t.seconds, go2);
}});
