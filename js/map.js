/* =================================================================
   Культура развивает — интерактивная карта России.

   Рисует регионы из RUSSIA_MAP (js/map-data.js) в SVG. Регионы,
   у которых есть тест (MAP_REGIONS), закрашены цветом фона теста и
   кликабельны — клик открывает тест. Остальные — серые.

   Чтобы подключить новый регион: добавьте его в CULTURES (data.js)
   и в MAP_REGIONS — список слов, по которым его название ищется
   в свойствах GeoJSON.
   ================================================================= */

const MAP_REGIONS = {
  tatar:    ['татарстан', 'tatarstan'],
  karelia:  ['карел', 'karel'],
  kalmykia: ['калмык', 'kalmyk'],
  yakutia:  ['якут', 'саха', 'sakha', 'yakut'],
};
const MAP_GREY = '#CDD1DB', MAP_GREY_STROKE = '#F7F8FB';

/* Проекция Альберса (коническая) под Россию; долготы < 0 переносим на +360 (Чукотка). */
function makeProjection(){
  const rad = Math.PI / 180, p1 = 52 * rad, p2 = 64 * rad, p0 = 56 * rad, l0 = 100 * rad;
  const n = (Math.sin(p1) + Math.sin(p2)) / 2;
  const C = Math.cos(p1) ** 2 + 2 * n * Math.sin(p1);
  const rho = p => Math.sqrt(C - 2 * n * Math.sin(p)) / n;
  const rho0 = rho(p0);
  return (lon, lat)=>{
    if(lon < 0) lon += 360;
    const th = n * (lon * rad - l0), r = rho(lat * rad);
    return [r * Math.sin(th), -(rho0 - r * Math.cos(th))];   // y вниз
  };
}

function mapRegionId(props){
  const text = Object.values(props || {}).filter(v => typeof v === 'string').join(' ').toLowerCase();
  return Object.keys(MAP_REGIONS).find(id => MAP_REGIONS[id].some(w => text.includes(w))) || null;
}

function themeColors(id){
  const probe = document.createElement('div');
  probe.className = 'theme-' + id; probe.style.display = 'none';
  document.getElementById('app').appendChild(probe);
  const cs = getComputedStyle(probe);
  const out = { fill: cs.getPropertyValue('--region-bg').trim(), stroke: cs.getPropertyValue('--region-card-border').trim() };
  probe.remove();
  return out;
}

function renderRussiaMap(){
  const box = document.getElementById('map-box');
  if(typeof RUSSIA_MAP === 'undefined'){ box.textContent = 'Нет данных карты (js/map-data.js).'; return; }
  const proj = makeProjection();
  const rings = [];                              // [{ id, name, d, pts }]
  RUSSIA_MAP.features.forEach(f=>{
    const g = f.geometry, polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    const id = mapRegionId(f.properties);
    const name = (f.properties && (f.properties.name_ru || f.properties.name || f.properties.NAME_1)) || '';
    const pts = [];
    const d = polys.map(poly => poly.map(ring => {
      return 'M' + ring.map(c => { const p = proj(c[0], c[1]); pts.push(p); return p[0] + ',' + p[1]; }).join('L') + 'Z';
    }).join('')).join('');
    rings.push({ id, name, d, pts });
  });
  // рамка и масштаб
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  rings.forEach(r => r.pts.forEach(p => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }));
  const k = 1000 / (x1 - x0), W = 1000, H = Math.round((y1 - y0) * k);
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.setAttribute('role', 'group'); svg.setAttribute('aria-label', 'Карта России по регионам');
  svg.classList.add('map-svg');
  const tip = document.getElementById('map-tip');
  const colors = {}; Object.keys(MAP_REGIONS).forEach(id => colors[id] = themeColors(id));

  // сначала серые, потом цветные — чтобы цветные были поверх
  rings.sort((a, b)=> (a.id ? 1 : 0) - (b.id ? 1 : 0)).forEach(r=>{
    const path = document.createElementNS(svgNS, 'path');
    // перевод координат в viewBox (масштабируем строку пути)
    path.setAttribute('d', r.d.replace(/(-?[\d.eE+-]+),(-?[\d.eE+-]+)/g, (m, x, y)=> ((x - x0) * k).toFixed(1) + ',' + ((y - y0) * k).toFixed(1)));
    path.setAttribute('class', 'map-region' + (r.id ? ' map-region--active' : ''));
    if(r.id){
      const c = colors[r.id], c0 = CULTURES[r.id];
      path.style.fill = c.fill; path.style.stroke = c.stroke;
      path.setAttribute('tabindex', '0'); path.setAttribute('role', 'button');
      path.setAttribute('aria-label', c0.name + ' — открыть тест');
      const open = ()=> openCulture(r.id);
      path.addEventListener('click', open);
      path.addEventListener('keydown', e=>{ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); open(); } });
    } else {
      path.style.fill = MAP_GREY; path.style.stroke = MAP_GREY_STROKE;
    }
    const label = r.id ? CULTURES[r.id].name : r.name;
    const show = ev => { if(!label){ return; } tip.textContent = label + (r.id ? ' — нажми, чтобы начать тест' : ' — теста пока нет'); tip.classList.add('on'); };
    const hide = ()=> tip.classList.remove('on');
    path.addEventListener('mouseenter', show); path.addEventListener('mouseleave', hide);
    path.addEventListener('focus', show); path.addEventListener('blur', hide);
    svg.appendChild(path);
  });
  box.innerHTML = ''; box.appendChild(svg);

  // легенда: четыре региона-кнопки (дублируют карту — полезно на телефоне, где мелкие регионы трудно нажать)
  const leg = document.getElementById('map-legend'); leg.innerHTML = '';
  Object.keys(MAP_REGIONS).forEach(id=>{
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'map-chip';
    b.innerHTML = '<span class="map-dot" style="background:' + colors[id].fill + ';border-color:' + colors[id].stroke + '"></span>' + CULTURES[id].name;
    b.onclick = ()=> openCulture(id);
    leg.appendChild(b);
  });
}

function openMap(){
  if(!document.querySelector('#map-box svg')) renderRussiaMap();
  go('screen-map');
}
