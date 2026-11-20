/* =================================================================
   Культура развивает — звуки (ТЗ, экран 3).
   Всё синтезируется в браузере (Web Audio), файлов не нужно:
     1 — обычный отклик кнопки;  2 — правильный ответ;  3 — неверный ответ.
   Настройки хранятся в localStorage (culture-develops-sound-v1).
   ================================================================= */
const SOUND_KEY = 'culture-develops-sound-v1';
const sfx = (function(){
  let ctx = null;
  const st = Object.assign({ fx:true }, readJSON(safeStore('localStorage'), SOUND_KEY, {}));
  const save = ()=> writeJSON(safeStore('localStorage'), SOUND_KEY, st);
  function ac(){
    if(!ctx){ try{ ctx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ ctx = null; } }
    if(ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, t0, dur, vol, type){
    const c = ac(); if(!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    const t = c.currentTime + t0;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  return {
    state: st,
    click(){ if(st.fx) tone(520, 0, 0.06, 0.05, 'triangle'); },
    ok(){ if(st.fx){ tone(660, 0, 0.14, 0.07); tone(880, 0.12, 0.2, 0.07); } },
    bad(){ if(st.fx){ tone(220, 0, 0.18, 0.07, 'sawtooth'); tone(165, 0.14, 0.25, 0.07, 'sawtooth'); } },
    setFx(on){ st.fx = !!on; save(); },
  };
})();
// звук нажатия для любых кнопок
document.addEventListener('click', e=>{ if(e.target.closest && e.target.closest('button, .opt, .cell')) sfx.click(); }, true);
