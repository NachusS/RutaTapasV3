import { loadRouteStops } from './stops.js';

function makeEl(tag, cls, text){
  const el = document.createElement(tag);
  if(cls) el.className = cls;
  if(typeof text === 'string') el.textContent = text;
  return el;
}

function safeJSONParse(str){
  try { return JSON.parse(str); } catch { return null; }
}

function getProgress(routeId){
  const raw = localStorage.getItem('rt_progress_' + routeId);
  const obj = raw ? safeJSONParse(raw) : null;
  if(obj && typeof obj === 'object') return obj;
  return { startedAt:null, finishedAt:null, completedStopIds:[], stopRatings:{}, routeRating:0 };
}

function getFavorites(routeId){
  const raw = localStorage.getItem('rt_favorites_' + routeId);
  const obj = raw ? safeJSONParse(raw) : null;
  if(obj && typeof obj === 'object') return obj;
  return {};
}

function isValidHttpUrl(url){
  if(!url || typeof url !== 'string') return false;
  try{
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  }catch{ return false; }
}

function headerBlock(title, subtitle){
  const card = makeEl('section','card pad','');
  const row = makeEl('div','row spread','');
  const h = makeEl('h1','h1', title);
  row.appendChild(h);
  const back = makeEl('a','btn btn-ghost','← Volver');
  back.href = '#/mi-perfil';
  row.appendChild(back);
  card.appendChild(row);
  if(subtitle){
    card.appendChild(makeEl('p','p', subtitle));
  }
  return card;
}

function emptyState(text){
  const p = makeEl('p','p', text);
  p.style.marginTop = '1.0rem';
  return p;
}

function makeItem(title, sub, rightText){
  const item = makeEl('div','item','');
  item.tabIndex = 0;

  const meta = makeEl('div','meta','');
  meta.appendChild(makeEl('div','title', title));
  if(sub) meta.appendChild(makeEl('div','sub', sub));

  const right = makeEl('div','right','');
  if(rightText) right.appendChild(makeEl('div','badge', rightText));

  item.appendChild(meta);
  item.appendChild(right);
  return item;
}

function renderLoading(root, title){
  root.replaceChildren();
  const wrap = makeEl('div','container','');
  wrap.appendChild(headerBlock(title, 'Cargando…'));
  root.appendChild(wrap);
}

export async function renderProfileRoutesCompleted(root, routesIndex){
  renderLoading(root, 'Rutas completadas');

  const wrap = makeEl('div','container','');
  wrap.appendChild(headerBlock('Rutas completadas', 'Listado de rutas finalizadas en este dispositivo.'));

  const routes = (routesIndex && routesIndex.routes) ? routesIndex.routes : [];
  const done = [];
  routes.forEach(r => {
    const prog = getProgress(r.id);
    if(prog && prog.finishedAt) done.push({ route: r, prog });
  });

  const card = makeEl('section','card pad','');
  const list = makeEl('div','list','');

  if(done.length === 0){
    card.appendChild(emptyState('Aún no has completado ninguna ruta.'));
  }else{
    done.sort((a,b)=>{
      const da = Number(new Date(a.prog.finishedAt || 0));
      const db = Number(new Date(b.prog.finishedAt || 0));
      return db - da;
    });

    done.forEach(({ route, prog })=>{
      const when = prog.finishedAt ? new Date(prog.finishedAt).toLocaleString('es-ES') : '';
      const rating = Number(prog.routeRating || 0);
      const right = rating > 0 ? (rating + '★') : '';
      const item = makeItem(route.title || route.id, when ? ('Finalizada: ' + when) : '', right);
      item.addEventListener('click', (e)=>{ e.preventDefault(); window.location.hash = '#/ruta?r=' + encodeURIComponent(route.id); });
      item.addEventListener('keydown', (e)=>{ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); window.location.hash = '#/ruta?r=' + encodeURIComponent(route.id); } });
      list.appendChild(item);
    });
    card.appendChild(list);
  }

  wrap.appendChild(card);
  root.replaceChildren(wrap);
}

export async function renderProfileStopsCompleted(root, routesIndex){
  renderLoading(root, 'Paradas completadas');

  const wrap = makeEl('div','container','');
  wrap.appendChild(headerBlock('Paradas completadas', 'Tus paradas marcadas como hechas, agrupadas por ruta.'));

  const routes = (routesIndex && routesIndex.routes) ? routesIndex.routes : [];
  const routesWithDone = routes
    .map(r => ({ r, prog: getProgress(r.id) }))
    .filter(x => (x.prog.completedStopIds || []).length > 0);

  if(routesWithDone.length === 0){
    const card = makeEl('section','card pad','');
    card.appendChild(emptyState('Aún no has marcado ninguna parada como hecha.'));
    wrap.appendChild(card);
    root.replaceChildren(wrap);
    return;
  }

  for(const { r, prog } of routesWithDone){
    const card = makeEl('section','card pad','');
    const head = makeEl('div','row spread','');
    head.appendChild(makeEl('h2','h2', r.title || r.id));
    head.appendChild(makeEl('div','badge', (prog.completedStopIds || []).length + ' hechas'));
    card.appendChild(head);

    let data = null;
    try{ data = await loadRouteStops(r); }catch{ data = null; }
    const stops = (data && Array.isArray(data.stops)) ? data.stops : [];
    const byId = new Map(stops.map(s => [s.id, s]));
    const ids = (prog.completedStopIds || []).slice();
    const items = ids
      .map(id => byId.get(id))
      .filter(Boolean)
      .sort((a,b)=> (a.order||0) - (b.order||0));

    if(items.length === 0){
      card.appendChild(emptyState('No se pudo cargar el detalle de estas paradas.'));
    }else{
      const list = makeEl('div','list','');
      items.forEach(s => {
        const t = (s.order ? (s.order + '. ') : '') + (s.name || 'Parada');
        const sub = s.tapa ? ('Tapa: ' + s.tapa) : (s.address || '');
        const item = makeItem(t, sub, '✓');
        item.classList.add('is-done');
        item.addEventListener('click', (e)=>{ e.preventDefault(); window.location.hash = '#/parada?r=' + encodeURIComponent(r.id) + '&s=' + encodeURIComponent(s.id); });
        item.addEventListener('keydown', (e)=>{ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); window.location.hash = '#/parada?r=' + encodeURIComponent(r.id) + '&s=' + encodeURIComponent(s.id); } });
        list.appendChild(item);
      });
      card.appendChild(list);
    }

    wrap.appendChild(card);
  }

  root.replaceChildren(wrap);
}

export async function renderProfileFavoritesAll(root, routesIndex){
  renderLoading(root, 'Bares favoritos');

  const wrap = makeEl('div','container','');
  wrap.appendChild(headerBlock('Bares favoritos', 'Tus paradas favoritas, sin importar la ruta.'));

  const routes = (routesIndex && routesIndex.routes) ? routesIndex.routes : [];
  const withFavs = routes
    .map(r => ({ r, favs: getFavorites(r.id) }))
    .map(x => ({ r: x.r, favIds: Object.keys(x.favs || {}).filter(k => x.favs[k]) }))
    .filter(x => x.favIds.length > 0);

  if(withFavs.length === 0){
    const card = makeEl('section','card pad','');
    card.appendChild(emptyState('Aún no has marcado bares como favoritos.'));
    wrap.appendChild(card);
    root.replaceChildren(wrap);
    return;
  }

  for(const { r, favIds } of withFavs){
    const card = makeEl('section','card pad','');
    const head = makeEl('div','row spread','');
    head.appendChild(makeEl('h2','h2', r.title || r.id));
    head.appendChild(makeEl('div','badge', favIds.length + ' ♥'));
    card.appendChild(head);

    let data = null;
    try{ data = await loadRouteStops(r); }catch{ data = null; }
    const stops = (data && Array.isArray(data.stops)) ? data.stops : [];
    const byId = new Map(stops.map(s => [s.id, s]));
    const favStops = favIds
      .map(id => byId.get(id))
      .filter(Boolean)
      .sort((a,b)=> (a.order||0) - (b.order||0));

    if(favStops.length === 0){
      card.appendChild(emptyState('No se pudo cargar el detalle de estos favoritos.'));
    }else{
      const list = makeEl('div','list','');
      favStops.forEach(s => {
        const t = (s.order ? (s.order + '. ') : '') + (s.name || 'Parada');
        const sub = s.tapa ? ('Tapa: ' + s.tapa) : (s.address || '');
        const item = makeItem(t, sub, '♥');
        item.addEventListener('click', (e)=>{ e.preventDefault(); window.location.hash = '#/parada?r=' + encodeURIComponent(r.id) + '&s=' + encodeURIComponent(s.id); });
        item.addEventListener('keydown', (e)=>{ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); window.location.hash = '#/parada?r=' + encodeURIComponent(r.id) + '&s=' + encodeURIComponent(s.id); } });
        list.appendChild(item);
      });
      card.appendChild(list);
    }
    wrap.appendChild(card);
  }

  root.replaceChildren(wrap);
}

export async function renderProfileTopRatedStops(root, routesIndex){
  renderLoading(root, 'Paradas mejor valoradas');

  const wrap = makeEl('div','container','');
  wrap.appendChild(headerBlock('Paradas mejor valoradas', 'Tus paradas con mejores estrellas (en cualquier ruta).'));

  const routes = (routesIndex && routesIndex.routes) ? routesIndex.routes : [];
  const candidates = [];

  // Recolectar ratings por ruta
  for(const r of routes){
    const prog = getProgress(r.id);
    const ratings = prog && prog.stopRatings ? prog.stopRatings : {};
    const entries = Object.entries(ratings).map(([id, n]) => ({ id, rating: Number(n || 0) })).filter(x => x.rating > 0);
    if(entries.length === 0) continue;

    let data = null;
    try{ data = await loadRouteStops(r); }catch{ data = null; }
    const stops = (data && Array.isArray(data.stops)) ? data.stops : [];
    const byId = new Map(stops.map(s => [s.id, s]));
    entries.forEach(e => {
      const s = byId.get(e.id);
      if(!s) return;
      candidates.push({ route: r, stop: s, rating: e.rating });
    });
  }

  const card = makeEl('section','card pad','');
  if(candidates.length === 0){
    card.appendChild(emptyState('Aún no has valorado paradas. Marca una parada como hecha y deja estrellas para verla aquí.'));
    wrap.appendChild(card);
    root.replaceChildren(wrap);
    return;
  }

  candidates.sort((a,b)=>{
    if(b.rating !== a.rating) return b.rating - a.rating;
    return (a.stop.order||0) - (b.stop.order||0);
  });

  const list = makeEl('div','list','');
  candidates.forEach(({ route, stop, rating })=>{
    const t = (stop.name || 'Parada') + ' · ' + (route.title || route.id);
    const sub = stop.tapa ? ('Tapa: ' + stop.tapa) : (stop.address || '');
    const item = makeItem(t, sub, rating + '★');
    item.addEventListener('click', (e)=>{ e.preventDefault(); window.location.hash = '#/parada?r=' + encodeURIComponent(route.id) + '&s=' + encodeURIComponent(stop.id); });
    item.addEventListener('keydown', (e)=>{ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); window.location.hash = '#/parada?r=' + encodeURIComponent(route.id) + '&s=' + encodeURIComponent(stop.id); } });
    list.appendChild(item);
  });
  card.appendChild(list);
  wrap.appendChild(card);
  root.replaceChildren(wrap);
}
