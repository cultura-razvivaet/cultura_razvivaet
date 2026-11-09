/* =================================================================
   Культура развивает — сохранение истории прохождения.

   Никакой регистрации и сервера: прогресс хранится в localStorage
   прямо в браузере пользователя (на этом устройстве). Поэтому сайт
   остаётся полностью статическим и его можно разместить на GitHub
   Pages без какого-либо бэкенда.

   Если localStorage недоступен (приватный режим, запрет cookies,
   квота исчерпана) — все функции просто молча ничего не делают,
   сайт при этом продолжает работать как обычно.
   ================================================================= */

const HISTORY_KEY = 'culture-develops-history-v1';

function loadHistory(){
  try{
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : {};
  }catch(e){
    return {};
  }
}

function saveHistoryEntry(cultureId, result){
  try{
    const hist = loadHistory();
    const prev = hist[cultureId] || { timesCompleted: 0, best: 0 };
    hist[cultureId] = {
      timesCompleted: prev.timesCompleted + 1,
      lastCompletedAt: new Date().toISOString(),
      lastScore: result,
      best: Math.max(prev.best || 0, result.overall)
    };
    localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
  }catch(e){
    /* localStorage недоступен — прогресс просто не сохранится в этот раз */
  }
}

function clearHistory(){
  try{ localStorage.removeItem(HISTORY_KEY); }catch(e){}
}

function formatHistoryDate(iso){
  try{
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric' });
  }catch(e){
    return '';
  }
}
