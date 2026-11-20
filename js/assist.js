/* =================================================================
   Культура развивает — «ИИ-помощник» (проверка по критериям).

   В этой версии помощник — правила без нейросети: он сверяет ответ
   с эталоном и критериями из банка задач (ключевые признаки, допустимые
   ответы), объясняет, что получилось и что улучшить. Весь доступ
   к проверке — через функции ниже, поэтому позже их можно заменить
   запросом к настоящей нейросети (fetch) без правки упражнений.
   ================================================================= */
const assist = {
  /* Основа слова: первые 5 букв (для русских окончаний). */
  stem(w){ w = w.toLowerCase().replace(/ё/g, 'е'); return w.length > 5 ? w.slice(0, 5) : (w.length === 5 ? w.slice(0, 4) : w); },
  tokens(s){ return (String(s).toLowerCase().replace(/ё/g, 'е').match(/[a-zа-я0-9әөүҗңһҡҙӨҮ]+/gi) || []); },
  /* Найден ли ключевой признак в тексте ответа: хотя бы половина значимых слов признака. */
  hasKey(text, key){
    const t = String(text).toLowerCase().replace(/ё/g, 'е');
    const words = this.tokens(key.replace(/\([^)]*\)/g, ' ')).filter(w => w.length >= 4 || /\d/.test(w));
    if(!words.length) return t.includes(key.toLowerCase());
    const hit = words.filter(w => t.includes(this.stem(w))).length;
    return hit >= Math.max(1, Math.ceil(words.length / 2));
  },
  /* keys: массив строк. Возвращает {found:[], missing:[], ratio} */
  matchKeys(text, keys){
    const found = [], missing = [];
    keys.forEach(k => (this.hasKey(text, k) ? found : missing).push(k));
    return { found, missing, ratio: keys.length ? found.length / keys.length : 0 };
  },
  /* Совпадение ответа с эталонным списком допустимых (без учёта регистра, ё, пробелов). */
  inList(answer, list){
    const a = norm(answer);
    return list.some(x => norm(x) === a || (a.length >= 4 && norm(x).length >= 4 && (norm(x).startsWith(a.slice(0, Math.max(4, a.length - 2))) && Math.abs(norm(x).length - a.length) <= 2)));
  },
  sentences(text){ return String(text).split(/[.!?…]+/).map(s => s.trim()).filter(s => s.split(/\s+/).length >= 3); },
  lines(text){ return String(text).split(/\n|;|•|(?:^|\s)\d+[.)]\s/).map(s => s.trim()).filter(s => s.length > 1); },
  words(text){ return this.tokens(text).length; },
};

/* Совпадение свободного ответа с эталонной фразой: все числа обязательны,
   слова — не менее 60% (если слов в эталоне больше трёх) по основам слов. */
assist.answerMatches = function(user, expected){
  const exp = String(expected).split(/[;(]/)[0].replace(/^(Ответ|Допустимо):?/i, '');
  const et = this.tokens(exp).filter(w => w.length >= 3 || /\d/.test(w));
  if(!et.length) return norm(user) === norm(expected);
  const u = String(user).toLowerCase().replace(/ё/g, 'е'), ut = this.tokens(user);
  const nums = et.filter(w => /^\d+$/.test(w)), words = et.filter(w => !/^\d+$/.test(w));
  if(!nums.every(n => ut.includes(n))) return false;
  if(!words.length) return true;
  const hit = words.filter(w => u.includes(this.stem(w))).length;
  return hit >= (words.length <= 3 ? words.length : Math.ceil(words.length * 0.6));
};
/* порядок слов-основ в тексте (для «слева птица, справа цветок») */
assist.inOrder = function(text, expected){
  const toks = (String(expected).match(/[А-Яа-яё]+/g) || []).map(w => this.stem(w));
  const s = String(text).toLowerCase().replace(/ё/g, 'е'); let pos = 0;
  return toks.every(k => { const i = s.indexOf(k, pos); if(i < 0) return false; pos = i + k.length; return true; });
};
