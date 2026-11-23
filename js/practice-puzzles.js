/* Головоломки: самопроверка и подсказки без таймера и баллов. */
const SUDOKU_DRAFT_KEY = 'culture-develops-sudoku6-v1';
const SUDOKU_PUZZLES = {
  4:{ box:[2,2], given:'0034000000014000', solution:'1234341223414123' },
  6:{ box:[2,3], given:'003000000120200060000004300002000040', solution:'123456456123234561561234345612612345' },
};

function puzzleGrid(api, columns, cls = ''){
  const grid = h('div', 'puzzle-grid ' + cls);
  grid.style.setProperty('--columns', columns);
  api.stage.append(grid);
  return grid;
}
function puzzleCheck(api, solved, reminder){
  if(solved) api.complete();
  else api.say(reminder);
}
function sudokuPractice(item, api){
  const size = item.id === 'sudoku4' ? 4 : 6;
  const { box, given, solution } = SUDOKU_PUZZLES[size];
  const original = [...given].map(Number);
  const saved = size === 6 ? readJSON(safeStore('localStorage'), SUDOKU_DRAFT_KEY, null) : null;
  let values = original.map((value,i) => value || (Number.isInteger(saved?.values?.[i]) && saved.values[i] >= 0 && saved.values[i] <= size ? saved.values[i] : 0));
  let notes = original.map((_,i) => new Set(Array.isArray(saved?.notes?.[i]) ? saved.notes[i].filter(n => n >= 1 && n <= size) : []));
  let selected = original.indexOf(0), pencil = false;
  const undo = [];
  const grid = puzzleGrid(api, size, 'sudoku-grid');
  const keys = h('div', 'practice-inline sudoku-keys');
  const options = h('div', 'practice-inline');
  const noteButton = practiceButton('Заметки', () => {
    pencil = !pencil;
    noteButton.setAttribute('aria-pressed', String(pencil));
  }, 'practice-choice');
  noteButton.setAttribute('aria-pressed', 'false');

  const saveDraft = () => {
    if(size === 6) writeJSON(safeStore('localStorage'), SUDOKU_DRAFT_KEY, { values, notes:notes.map(set => [...set]) });
  };
  const cells = original.map((value,i) => {
    const cell = practiceButton('', () => select(i), 'puzzle-cell');
    cell.addEventListener('focus', () => select(i));
    cell.setAttribute('aria-label', 'Строка ' + (Math.floor(i / size) + 1) + ', столбец ' + (i % size + 1));
    cell.classList.toggle('is-given', Boolean(value));
    if(i % size > 0 && i % size % box[1] === 0) cell.classList.add('box-left');
    if(Math.floor(i / size) > 0 && Math.floor(i / size) % box[0] === 0) cell.classList.add('box-top');
    return cell;
  });
  function select(i){ selected = i; draw(); }
  function draw(){
    cells.forEach((cell,i) => {
      const content = values[i] || [...notes[i]].sort().join(' ');
      cell.textContent = content || '';
      cell.classList.toggle('is-note', !values[i] && notes[i].size > 0);
      cell.classList.toggle('picked', selected === i);
      cell.setAttribute('aria-pressed', String(selected === i));
      cell.setAttribute('aria-label', 'Строка ' + (Math.floor(i / size) + 1) + ', столбец ' + (i % size + 1) + (content ? ', ' + content : ', пусто'));
    });
    undoButton.disabled = !undo.length;
  }
  function change(n, asNote = pencil){
    if(original[selected]) return;
    undo.push({ i:selected, value:values[selected], notes:[...notes[selected]] });
    if(asNote && n && !values[selected]){
      const set = notes[selected];
      if(set.has(n)) set.delete(n); else set.add(n);
    } else {
      values[selected] = n;
      notes[selected].clear();
    }
    api.say('');
    saveDraft();
    draw();
  }
  const undoButton = practiceButton('Отменить ход', () => {
    const previous = undo.pop();
    if(!previous) return;
    selected = previous.i;
    values[selected] = previous.value;
    notes[selected] = new Set(previous.notes);
    api.say('');
    saveDraft();
    draw();
  });
  const hint = practiceButton('Подсказка', () => {
    const i = original[selected] || values[selected] === Number(solution[selected])
      ? values.findIndex((value,j) => value !== Number(solution[j])) : selected;
    if(i < 0) return;
    selected = i;
    change(Number(solution[i]), false);
    api.say('Открылась одна клетка.');
  });
  for(let n=1; n <= size; n++) keys.append(practiceButton(String(n), () => change(n), 'practice-choice'));
  keys.append(practiceButton('Стереть', () => change(0), 'practice-choice'));
  if(size === 6) options.append(noteButton);
  options.append(undoButton, hint);
  grid.append(...cells);
  api.stage.append(keys, options);
  grid.addEventListener('keydown', event => {
    if(/^[1-6]$/.test(event.key) && Number(event.key) <= size){
      event.preventDefault(); change(Number(event.key));
    } else if(['Backspace','Delete'].includes(event.key)){
      event.preventDefault(); change(0);
    }
  });
  api.main('Проверить', () => {
    if(values.join('') !== solution) return api.say('Проверь строки, столбцы и выделенные блоки. Каждая цифра встречается в них один раз.');
    if(size === 6) writeJSON(safeStore('localStorage'), SUDOKU_DRAFT_KEY, null);
    api.complete();
  });
  draw();
}

function wordsearchPractice(item, api){
  const words = ['ЧАЙ','ЧАШКА','ПАР','МЁД','ЛИМОН'];
  const board = [
    'ЧАШКАРБЧ','СТОГВСНА','ПМДЗЖЗИЙ','ЛНЁОРИЦК',
    'КИОДЛАЯБ','УПМОСЦШВ','ФЖАОДМФЕ','ВЕЫРНЭГТ',
  ];
  const n = board.length, grid = puzzleGrid(api, n, 'word-grid');
  api.stage.prepend(h('p', 'practice-note', 'Нажимай соседние буквы по порядку. Можно идти по диагонали и менять направление.'));
  const targets = h('div', 'practice-inline word-list');
  api.stage.append(targets);
  const found = new Set(), marked = new Set();
  let path = [];
  const cells = board.flatMap(row => [...row]).map((letter,i) => {
    return practiceButton(letter, () => {
      const last = path.at(-1);
      if(last === i){ path.pop(); }
      else {
        const neighbor = last === undefined || (Math.abs(last % n - i % n) <= 1 && Math.abs(Math.floor(last / n) - Math.floor(i / n)) <= 1);
        if(!neighbor || path.includes(i)) path = [];
        path.push(i);
      }
      const text = path.map(j => board[Math.floor(j / n)][j % n]).join('');
      if(words.includes(text) && !found.has(text)){
        found.add(text);
        path.forEach(j => marked.add(j));
        path = [];
      }
      draw();
    }, 'puzzle-cell');
  });
  function draw(){
    cells.forEach((cell,i) => {
      cell.classList.toggle('picked', path.includes(i));
      cell.classList.toggle('is-matched', marked.has(i));
      cell.setAttribute('aria-pressed', String(path.includes(i)));
    });
    targets.replaceChildren(...words.map(word => h('span', found.has(word) ? 'found' : '', word)));
    api.main('Готово', api.complete, found.size !== words.length);
  }
  grid.append(...cells);
  api.stage.append(practiceButton('Сбросить выделение', () => { path = []; draw(); }));
  draw();
}

function crosswordPractice(item, api){
  const entries = [
    { x:3, y:0, dx:0, dy:1, word:'ЧАШКА', short:'Посуда', clue:'Посуда, из которой пьют чай' },
    { x:0, y:0, dx:1, dy:0, word:'КЛЮЧ', short:'Замок', clue:'Им открывают замок' },
    { x:0, y:2, dx:1, dy:0, word:'ГРУША', short:'Фрукт', clue:'Фрукт с узкой верхушкой и широким основанием' },
    { x:2, y:4, dx:1, dy:0, word:'ЧАЙ', short:'Листья', clue:'Напиток из заваренных листьев' },
  ];
  const size = 6;
  const grid = puzzleGrid(api, size, 'scan-grid');
  const clues = h('ol', 'scan-clues');
  const positions = new Map();
  let focused = 0;
  const address = ({x,y,dx,dy}, i) => (y + 1 + dy * i) * size + x + 1 + dx * i;
  const cluePositions = new Map(entries.map((entry,i) => [address(entry,-1),i]));
  for(const entry of entries){
    [...entry.word].forEach((letter,i) => {
      const key = address(entry,i);
      if(!positions.has(key)) positions.set(key,{ letter, starts:[] });
      if(!i) positions.get(key).starts.push(entries.indexOf(entry) + 1);
    });
  }
  const selectClue = i => { focused = i; positions.get(address(entries[i],0)).input.focus(); };
  for(let i=0; i<size*size; i++){
    if(cluePositions.has(i)){
      const j = cluePositions.get(i), entry = entries[j];
      const cue = practiceButton(entry.short + (entry.dx ? ' →' : ' ↓'), () => selectClue(j), 'scan-cue');
      cue.setAttribute('aria-label',entry.clue);
      grid.append(cue);
      continue;
    }
    const value = positions.get(i);
    const cell = h('div', value ? 'scan-cell' : 'scan-empty');
    if(value){
      const input = h('input');
      input.maxLength = 1;
      input.autocomplete = 'off';
      input.setAttribute('aria-label', 'Строка ' + Math.floor(i/size) + ', столбец ' + i%size);
      const starts = value.starts.join('/');
      if(starts) cell.append(h('small', '', starts));
      input.addEventListener('focus', () => {
        const current = entries[focused];
        if(![...current.word].some((_,j) => address(current,j) === i)){
          focused = entries.findIndex(entry => [...entry.word].some((_,j) => address(entry,j) === i));
        }
        input.select();
      });
      input.addEventListener('input', () => {
        input.value = input.value.toUpperCase().replace(/[^А-ЯЁ]/g,'').slice(-1);
        if(!input.value) return;
        const entry = entries[focused], cells = [...entry.word].map((_,j) => address(entry,j));
        positions.get(cells[cells.indexOf(i) + 1])?.input.focus();
      });
      value.input = input;
      cell.append(input);
    }
    grid.append(cell);
  }
  entries.forEach((entry,i) => {
    const clue = h('li');
    clue.append(practiceButton((entry.dx ? '→ ' : '↓ ') + entry.clue, () => selectClue(i), 'practice-choice'));
    clues.append(clue);
  });
  api.stage.append(clues, practiceButton('Открыть первую букву', () => {
    const cell = positions.get(address(entries[focused], 0));
    cell.input.value = cell.letter;
    api.say('Первая буква открыта.');
  }));
  api.main('Проверить', () => puzzleCheck(api, [...positions.values()].every(v => v.input.value === v.letter), 'Проверь заполненные слова по подсказкам.'));
}

function pairsPractice(item, api){
  const designs = ['✿','✦','❖','✺','✾','◎'];
  const pairs = shuffle([...designs, ...designs]);
  const board = puzzleGrid(api, 4, 'pairs-grid');
  const matched = new Set();
  let shown = [];
  function draw(){
    cards.forEach((card,i) => {
      const open = shown.includes(i) || matched.has(i);
      card.textContent = open ? pairs[i] : '·';
      card.classList.toggle('picked', open);
      card.classList.toggle('is-matched', matched.has(i));
      card.setAttribute('aria-label', 'Карточка ' + (i + 1) + (open ? ', узор ' + (designs.indexOf(pairs[i]) + 1) : ', закрыта'));
    });
  }
  const cards = pairs.map((_,i) => practiceButton('', () => {
    if(matched.has(i) || shown.includes(i) || shown.length === 2) return;
    shown.push(i);
    if(shown.length === 2){
      const [a,b] = shown;
      if(pairs[a] === pairs[b]){
        matched.add(a); matched.add(b); shown = [];
        if(matched.size === pairs.length) api.main('Готово', api.complete);
      } else api.after(900, () => { shown = []; draw(); });
    }
    draw();
  }, 'puzzle-cell'));
  board.append(...cards);
  api.main('Готово', api.complete, true);
  draw();
}

function nonogramPractice(item, api){
  const pattern = ['0000010','0111010','1111111','1100111','1100110','0111100','1111110'];
  const n = pattern.length;
  const clues = text => text.split('0').filter(Boolean).map(run => run.length).join(' ') || '0';
  const grid = puzzleGrid(api, n + 1, 'nonogram-grid');
  const cells = [];
  let mark = 1;
  grid.append(h('span'));
  for(let c=0; c<n; c++) grid.append(h('span', 'col-clue', clues(pattern.map(row => row[c]).join(''))));
  for(let r=0; r<n; r++){
    grid.append(h('span', 'row-clue', clues(pattern[r])));
    for(let c=0; c<n; c++){
      const cell = practiceButton('', () => {
        cell.dataset.mark = cell.dataset.mark === String(mark) ? '0' : String(mark);
        const suffix = cell.dataset.mark === '1' ? ', закрашено' : cell.dataset.mark === '2' ? ', крестик' : ', пусто';
        cell.setAttribute('aria-label', 'Клетка ' + (r + 1) + ', ' + (c + 1) + suffix);
        cell.textContent = cell.dataset.mark === '2' ? '×' : '';
      }, 'puzzle-cell');
      cell.setAttribute('aria-label', 'Клетка ' + (r + 1) + ', ' + (c + 1) + ', пусто');
      grid.append(cell); cells.push(cell);
    }
  }
  const controls = h('div', 'practice-inline');
  const buttons = ['Закрасить','Поставить крестик'].map((text,i) => practiceButton(text, () => {
    mark = i + 1;
    buttons.forEach((b,j) => b.setAttribute('aria-pressed', String(i === j)));
  }, 'practice-choice'));
  buttons[0].setAttribute('aria-pressed','true');
  buttons[1].setAttribute('aria-pressed','false');
  controls.append(...buttons);
  api.stage.append(controls);
  api.main('Проверить', () => puzzleCheck(
    api, cells.map(cell => cell.dataset.mark === '1' ? '1' : '0').join('') === pattern.join(''),
    'Сверь группы закрашенных клеток с числами слева и сверху.'
  ));
}

function dotsPractice(item, api){
  const points = [[10,80],[20,61],[32,51],[28,30],[42,43],[55,43],[70,24],[74,41],[88,52],[71,59],[60,76],[41,83],[10,80]];
  const frame = h('div', 'dots-frame', '<svg viewBox="0 0 100 100" aria-hidden="true"><polyline fill="none" stroke="#343dd5" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>');
  const line = frame.querySelector('polyline');
  let next = 0;
  const nodes = points.slice(0,-1).map(([x,y],i) => {
    const node = practiceButton(String(i + 1), () => {
      if(i !== next) return api.say('Следующая точка — ' + (next + 1) + '.');
      api.say('');
      node.classList.add('connected');
      next++;
      const count = next === points.length - 1 ? points.length : next;
      line.setAttribute('points', points.slice(0,count).map(p => p.join(',')).join(' '));
      if(count === points.length) api.main('Готово', api.complete);
    }, 'dot-number');
    node.style.left = x + '%'; node.style.top = y + '%';
    return node;
  });
  frame.append(...nodes);
  api.stage.append(frame);
  api.main('Готово', api.complete, true);
}

function paintPractice(item, api){
  const colors = ['#f5bd30','#bd597f','#7559b2','#4b9c92'];
  const shapes = [
    ['M93 40C50 6 34 47 54 67L93 98Q129 65 132 51Q132 16 93 40Z', 93, 56, 2],
    ['M50 100Q55 149 76 151H122Q143 146 145 100Z', 99, 128, 1],
    ['M145 111Q186 97 179 127Q174 142 137 143L143 130Q165 131 167 121Q162 110 145 120Z', 165, 117, 3],
    ['M32 155H164Q154 171 133 173H58Q42 170 32 155Z', 100, 166, 4],
  ];
  const svg = h('div', 'paint-board', '<svg viewBox="0 0 200 185" aria-label="Чашка и сердце для раскраски"></svg>');
  const namespace = 'http://www.w3.org/2000/svg';
  const palette = h('div', 'practice-inline paint-palette');
  let picked = 1, finished = 0;
  const buttons = colors.map((color,i) => {
    const button = practiceButton('Цвет ' + (i + 1), () => {
      picked = i + 1;
      buttons.forEach((b,j) => b.setAttribute('aria-pressed', String(i === j)));
      api.say('');
    }, 'practice-choice');
    button.style.setProperty('--paint', color);
    button.setAttribute('aria-pressed', String(i === 0));
    return button;
  });
  for(const [path,x,y,number] of shapes){
    const group = document.createElementNS(namespace,'g');
    group.setAttribute('tabindex','0');
    group.setAttribute('role','button');
    group.setAttribute('aria-label','Участок ' + number);
    const area = document.createElementNS(namespace,'path');
    area.setAttribute('d',path);
    const label = document.createElementNS(namespace,'text');
    label.setAttribute('x',x); label.setAttribute('y',y);
    label.textContent = number;
    group.append(area,label);
    function fill(){
      if(group.classList.contains('painted')) return;
      if(picked !== number) return api.say('Выбери цвет с номером ' + number + '.');
      group.classList.add('painted');
      area.style.fill = colors[number - 1];
      label.textContent = '';
      api.say('');
      if(++finished === shapes.length) api.main('Готово',api.complete);
    }
    group.addEventListener('click',fill);
    group.addEventListener('keydown',e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); fill(); } });
    svg.querySelector('svg').append(group);
  }
  api.stage.append(svg,palette);
  palette.append(...buttons);
  api.main('Готово', api.complete, true);
}

function differencesPractice(item, api){
  const clues = [
    [77,20,'Солнце'],[23,28,'Облако'],[19,63,'Дерево'],[64,64,'Окно'],[77,49,'Труба'],
  ];
  function scene(changed){
    return '<svg viewBox="0 0 200 125" aria-hidden="true"><rect width="200" height="125" fill="#d8edf5"/>' +
      '<circle cx="154" cy="25" r="' + (changed ? 10 : 7) + '" fill="#eeb753"/>' +
      '<ellipse cx="45" cy="35" rx="' + (changed ? 10 : 19) + '" ry="6" fill="#fff"/>' +
      '<path d="M0 100L43 59 72 89 109 64 200 105V125H0Z" fill="#a1c8bc"/><path d="M0 98Q91 93 200 105V125H0Z" fill="#7eaf85"/>' +
      '<rect x="34" y="82" width="5" height="17" fill="#86634c"/><path d="M37 57L' + (changed ? '21 87H55' : '16 87H58') + 'Z" fill="#487b70"/>' +
      '<rect x="113" y="69" width="55" height="37" rx="1" fill="#f5dc9f"/><rect x="150" y="' + (changed ? '55' : '58') + '" width="7" height="14" fill="#983950"/>' +
      '<path d="M105 75l36-27 34 27z" fill="#7d5459"/><rect x="123" y="75" width="13" height="12" rx="' + (changed?5:0) + '" fill="#719eb0"/>' +
      '<path d="M146 105V85h11v20z" fill="#98654d"/></svg>';
  }
  const frames = h('div', 'diff-frames');
  const surfaces = [false,true].map(state => h('div','diff-scene',scene(state)));
  const found = new Set();
  const hotspots = [[],[]];
  let suggested = -1;
  function draw(){
    hotspots.flat().forEach((button,i) => {
      const index = i % clues.length;
      button.classList.toggle('found-difference', found.has(index));
      button.classList.toggle('hint-difference', index === suggested);
      button.setAttribute('aria-pressed',String(found.has(index)));
    });
  }
  surfaces.forEach((surface,j) => {
    for(const [x,y,label] of clues){
      const i = hotspots[j].length;
      const button = practiceButton('', () => {
        found.add(i); suggested = -1;
        api.say('Найдено ' + found.size + ' из ' + clues.length + '.');
        draw();
        if(found.size === clues.length) api.main('Готово', api.complete);
      },'diff-spot');
      button.style.left = x + '%'; button.style.top = y + '%';
      button.setAttribute('aria-label',label);
      hotspots[j].push(button);
      surface.append(button);
    }
    frames.append(surface);
  });
  api.stage.append(frames, practiceButton('Подсказка', () => {
    suggested = clues.findIndex((_,i) => !found.has(i)); draw();
  }));
  api.main('Готово',api.complete,true);
  draw();
}

function patternPractice(item, api){
  const order = [1,2,3,4,5], layout = shuffle(order);
  const sample = h('div','pattern-row pattern-example');
  const board = h('div','pattern-row');
  const pool = h('div','pattern-row');
  const placement = order.map(() => null);
  let selected = null;
  const picture = (n,decorative = false) => '<img src="assets/ornament-tatar-' + n + '.png" alt="' + (decorative ? '' : 'Фрагмент ' + n) + '">';
  sample.innerHTML = order.map(n => picture(n,true)).join('');
  sample.setAttribute('aria-label','Образец орнамента');
  const pieces = layout.map(n => {
    const button = practiceButton('', () => { selected = n; draw(); },'puzzle-cell');
    button.innerHTML = picture(n);
    return button;
  });
  const slots = order.map((_,i) => practiceButton('', () => {
    if(selected === null) placement[i] = null;
    else {
      const old = placement.indexOf(selected);
      if(old !== -1) placement[old] = null;
      placement[i] = selected;
      selected = null;
    }
    api.say('');
    draw();
  },'puzzle-cell'));
  function draw(){
    slots.forEach((slot,i) => {
      slot.innerHTML = placement[i] ? picture(placement[i]) : String(i+1);
      slot.setAttribute('aria-label','Место ' + (i+1) + (placement[i] ? ', фрагмент ' + placement[i] : ', пусто'));
    });
    pieces.forEach((piece,i) => {
      piece.disabled = placement.includes(layout[i]);
      piece.classList.toggle('picked', selected === layout[i]);
      piece.setAttribute('aria-pressed',String(selected === layout[i]));
    });
  }
  api.stage.append(h('p','practice-note','Татарский орнамент. Выбери фрагмент и нажми на место в ряду.'),sample,board,pool);
  board.append(...slots); pool.append(...pieces);
  api.main('Проверить', () => puzzleCheck(api, placement.join('') === order.join(''), 'Сверь порядок фрагментов с образцом.'));
  draw();
}

function kantelePractice(item, api){
  const pitches = [261.63,293.66,329.63,392,440];
  const board = h('div','kantele');
  const caption = h('p','practice-note','У каждой струны свой учебный тон. Можно повторять последовательность по подсветке.');
  let order = [1,3,0], position = 0, playback = 0, watching = true;
  const strings = pitches.map((pitch,index) => practiceButton(String(index + 1), () => {
    if(watching) return;
    sfx.note(pitch);
    if(index !== order[position]){
      position = 0;
      caption.textContent = 'Попробуй ещё раз с первой струны или посмотри повтор.';
      return;
    }
    if(++position < order.length) caption.textContent = 'Повторено ' + position + ' из ' + order.length;
    else {
      watching = true;
      caption.textContent = 'Последовательность повторена.';
      if(order.length === 5) api.main('Готово', api.complete);
      else api.main('Следующая последовательность', () => {
        const next = shuffle([0,1,2,3,4].filter(i => i !== order.at(-1)))[0];
        order.push(next);
        play();
        api.main('Готово',api.complete,true);
      });
    }
  },'practice-string'));
  function play(){
    const version = ++playback;
    watching = true;
    position = 0;
    caption.textContent = 'Смотри на порядок струн.';
    strings.forEach(string => string.classList.remove('picked'));
    order.forEach((note,i) => api.after(i * 630, () => {
      if(version !== playback) return;
      strings.forEach((string,j) => string.classList.toggle('picked',j === note));
      sfx.note(pitches[note]);
    }));
    api.after(order.length * 630, () => {
      if(version !== playback) return;
      strings.forEach(string => string.classList.remove('picked'));
      watching = false;
      caption.textContent = 'Теперь повтори порядок.';
    });
  }
  board.append(...strings);
  api.stage.append(board,caption,practiceButton('Показать последовательность',play));
  api.main('Готово',api.complete,true);
}

const PUZZLE_RENDERERS = {
  sudoku4:sudokuPractice, sudoku6:sudokuPractice, wordsearch:wordsearchPractice,
  crossword:crosswordPractice, pairs:pairsPractice, nonogram:nonogramPractice,
  dots:dotsPractice, paint:paintPractice, differences:differencesPractice,
  pattern:patternPractice, kantele:kantelePractice,
};
