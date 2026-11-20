/* Гибкость ума: альтернативные использования, мозговой штурм наоборот,
   сценарии «Что, если?», изменение перспективы, шесть шляп. */

registerKind('altuse', { render(t, ctx){
  textForm(ctx, { fields:[{ label:'Ваши идеи (каждая с новой строки)', rows:8, min:5, placeholder:'1. …\n2. …' }],
    review: ([text])=>{
      const ideas = [...new Set(String(text).split(/\n|;/).map(s => s.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(s => s.length > 2).map(s => s.toLowerCase()))];
      const n = ideas.length, need = t.need, ok = n >= need;
      return { ok, score: Math.min(100, Math.round(n / need * 100)), correct:n, total:need,
        good: n ? ['Придумано разных идей: ' + n + '.'] : [], improve: ok ? [] : ['Нужно не меньше ' + need + ' идей — не хватает ' + (need - n) + '.'],
        model: 'Примеры идей: ' + esc(t.examples), recs:['Меняйте категорию: быт, игра, украшение, учёба, спорт.', 'Задайте себе вопрос: «Что, если уменьшить, увеличить или соединить с чем-то?»'] };
    } });
}});

registerKind('reverse', { render(t, ctx){
  const box = h('div', 'pairs-form'); const rows = [];
  for(let i = 0; i < 3; i++){
    const r = h('div', 'pair-row'); const a = h('input', 'task-input'), b = h('input', 'task-input');
    a.placeholder = 'Как усугубить ' + (i + 1); b.placeholder = 'Идея решения ' + (i + 1); a.setAttribute('aria-label', a.placeholder); b.setAttribute('aria-label', b.placeholder);
    [a, b].forEach(x => x.addEventListener('input', ()=> ctx.enableCheck(rows.every(p => p[0].value.trim() && p[1].value.trim()))));
    r.append(a, h('span', 'arrow', '→'), b); box.appendChild(r); rows.push([a, b]);
  }
  ctx.stage.appendChild(box); ctx.enableCheck(false);
  ctx.setCheck(()=>{
    if(rows.some(p => !p[0].value.trim() || !p[1].value.trim())) return null;
    const same = rows.filter(p => norm(p[0].value) === norm(p[1].value)).length, short = rows.filter(p => assist.words(p[1].value) < 2).length;
    const ok = !same && short === 0;
    return { ok, score: ok ? 85 : 55, correct:3 - same - short, total:3, good:['Составлено пар «усугубить → решить»: 3.'], improve:[same ? 'Некоторые решения повторяют проблему.' : '', short ? 'Решения слишком короткие — раскройте их.' : ''].filter(Boolean), model:esc(t.example), recs:['Переворачивайте идею «наоборот»: что мешает — то и убирайте.'] };
  });
}});

function stepsForm(ctx, fields, example, recs){
  const inputs = textForm(ctx, { fields: fields.map(f => ({ label:f, rows:3, min:6 })), review: vals => {
    const short = vals.filter(v => assist.words(v) < 3).length, ok = short === 0;
    return { ok, score: ok ? 85 : 55, correct: vals.length - short, total: vals.length, good:['Заполнены все части: ' + vals.length + '.'], improve: short ? ['Развёрнутых ответов мало: ' + short + ' — добавьте причины и примеры.'] : [], model: esc(example), recs };
  } });
}
registerKind('whatif', { render(t, ctx){ stepsForm(ctx, ['Плюсы', 'Минусы', 'Что неожиданного?', 'Первый шаг'], t.example, ['Рассмотрите последствия через неделю и через год.', 'Задайте вопрос «А что ещё изменится?»']); }});
registerKind('perspective', { render(t, ctx){ stepsForm(ctx, ['Взгляд первого участника', 'Взгляд второго участника', 'Общее решение'], t.example, ['Представьте, что вы говорите от лица каждого участника: что он хочет и чего боится?']); }});
registerKind('hats', { render(t, ctx){
  stepsForm(ctx, ['Белая шляпа — факты и цифры', 'Красная шляпа — чувства', 'Чёрная шляпа — риски', 'Жёлтая шляпа — выгоды', 'Зелёная шляпа — новые идеи', 'Синяя шляпа — организация процесса'], t.example, ['Не смешивайте шляпы: на каждую — своя мысль.', 'Закончите синей шляпой: решение и первый шаг.']);
}});
